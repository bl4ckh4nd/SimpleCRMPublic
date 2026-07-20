import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app, powerMonitor } from 'electron';
import keytar from 'keytar';
import nodemailer from 'nodemailer';
import { DEALS_TABLE, NOTIFICATION_LOG_TABLE, TASKS_TABLE } from './database-schema';
import { getDb, type NotificationLogEntry } from './sqlite-service';

const KEYTAR_SERVICE = 'SimpleCRM.notifications';
const KEYTAR_ACCOUNT = 'smtp';
const RETRY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;
export const NOTIFICATION_WORKER_ARG = '--notification-worker';
const HEARTBEAT_MS = 15_000;
const STOP_POLL_MS = 500;

export type NotificationSettings = {
  smtp: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password?: string | null;
    from_address: string;
    notify_to: string;
  };
  digest: { hour: number; deals_days_ahead: number };
};

const defaults: NotificationSettings = {
  smtp: { enabled: false, host: '', port: 587, secure: false, user: '', from_address: '', notify_to: '' },
  digest: { hour: 8, deals_days_ahead: 7 },
};

let timer: NodeJS.Timeout | null = null;
let logger: Pick<typeof console, 'info' | 'warn' | 'error'> = console;
let resumeListener: (() => void) | null = null;

const settingsPath = () => path.join(app.getPath('userData'), 'notification-settings.json');
const legacyPath = () => path.join(app.getPath('userData'), 'worker-config.json');
const lockPath = () => path.join(app.getPath('userData'), 'notification-worker.json');
const stopPath = () => path.join(app.getPath('userData'), 'notification-worker.stop');
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function readSettings(): NotificationSettings {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) as Partial<NotificationSettings>;
    return {
      smtp: { ...defaults.smtp, ...raw.smtp, password: undefined },
      digest: { ...defaults.digest, ...raw.digest },
    };
  } catch {
    return structuredClone(defaults);
  }
}

function writeSettings(settings: NotificationSettings) {
  const safe = { ...settings, smtp: { ...settings.smtp, password: undefined } };
  const temporaryPath = `${settingsPath()}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(safe, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporaryPath, settingsPath());
}

async function migrateLegacySettings() {
  if (fs.existsSync(settingsPath()) || !fs.existsSync(legacyPath())) return;
  try {
    const legacy = JSON.parse(fs.readFileSync(legacyPath(), 'utf8')) as {
      smtp?: Partial<NotificationSettings['smtp']>;
      worker?: { digest_hour?: number; deals_days_ahead?: number };
    };
    const settings: NotificationSettings = {
      smtp: { ...defaults.smtp, ...legacy.smtp, password: undefined },
      digest: {
        hour: legacy.worker?.digest_hour ?? defaults.digest.hour,
        deals_days_ahead: legacy.worker?.deals_days_ahead ?? defaults.digest.deals_days_ahead,
      },
    };
    if (legacy.smtp?.password) await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, legacy.smtp.password);
    writeSettings(settings);
    fs.unlinkSync(legacyPath());
    logger.info('[Notifications] Migrated legacy worker settings');
  } catch (error) {
    logger.error('[Notifications] Legacy settings migration failed:', error);
  }
}

export async function getNotificationSettings() {
  await migrateLegacySettings();
  const settings = readSettings();
  return {
    ...settings,
    smtp: {
      ...settings.smtp,
      hasPassword: process.env.SIMPLECRM_E2E === '1'
        ? false
        : Boolean(await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT)),
    },
  };
}

export async function saveNotificationSettings(settings: NotificationSettings) {
  if (settings.smtp.password === null) {
    await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
  } else if (settings.smtp.password?.trim()) {
    await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, settings.smtp.password);
  }
  writeSettings(settings);
  await syncNotificationWorker();
  return { success: true as const };
}

function gatherDigest(settings: NotificationSettings) {
  const today = localDate();
  const through = new Date();
  through.setDate(through.getDate() + settings.digest.deals_days_ahead);
  const tasks = getDb().prepare(`
    SELECT title, due_date, priority FROM ${TASKS_TABLE}
    WHERE completed = 0 AND due_date IS NOT NULL AND date(due_date) <= date(?)
    ORDER BY due_date
  `).all(today) as Array<{ title: string; due_date: string; priority: string }>;
  const deals = getDb().prepare(`
    SELECT name, expected_close_date, value FROM ${DEALS_TABLE}
    WHERE expected_close_date IS NOT NULL
      AND date(expected_close_date) BETWEEN date(?) AND date(?)
    ORDER BY expected_close_date
  `).all(today, localDate(through)) as Array<{ name: string; expected_close_date: string; value: number }>;
  return { tasks, deals };
}

function renderDigest(items: ReturnType<typeof gatherDigest>) {
  const taskLines = items.tasks.map((task) => `• ${task.title} (${task.due_date}, ${task.priority})`);
  const dealLines = items.deals.map((deal) => `• ${deal.name} (${deal.expected_close_date}, ${deal.value})`);
  return [
    'SimpleCRM Tagesübersicht',
    '',
    'Aufgaben',
    ...(taskLines.length ? taskLines : ['Keine fälligen Aufgaben.']),
    '',
    'Deals',
    ...(dealLines.length ? dealLines : ['Keine anstehenden Abschlüsse.']),
  ].join('\n');
}

async function deliver(settings: NotificationSettings, subject: string, text: string) {
  const password = process.env.SIMPLECRM_E2E === '1'
    ? null
    : await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
  if (!settings.smtp.host || !settings.smtp.notify_to || !settings.smtp.from_address || !password) {
    throw new Error('SMTP settings are incomplete');
  }
  const transport = nodemailer.createTransport({
    host: settings.smtp.host,
    port: settings.smtp.port,
    secure: settings.smtp.secure,
    auth: settings.smtp.user ? { user: settings.smtp.user, pass: password } : undefined,
  });
  await transport.sendMail({ from: settings.smtp.from_address, to: settings.smtp.notify_to, subject, text });
}

function recordRun(status: 'sent' | 'skipped' | 'failed', settings: NotificationSettings, taskCount: number, dealCount: number, error?: string) {
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO ${NOTIFICATION_LOG_TABLE}
      (sent_date, recipient, task_count, deal_count, status, attempts, error_message, created_at, updated_at, sent_at)
    VALUES (@date, @recipient, @tasks, @deals, @status, 1, @error, @now, @now, @sentAt)
    ON CONFLICT(sent_date) DO UPDATE SET
      recipient=excluded.recipient, task_count=excluded.task_count, deal_count=excluded.deal_count,
      status=excluded.status, attempts=${NOTIFICATION_LOG_TABLE}.attempts + 1,
      error_message=excluded.error_message, updated_at=excluded.updated_at, sent_at=excluded.sent_at
  `).run({
    date: localDate(),
    recipient: settings.smtp.notify_to,
    tasks: taskCount,
    deals: dealCount,
    status,
    error: error ?? null,
    now,
    sentAt: status === 'sent' ? now : null,
  });
}

export async function runDigestIfDue(now = new Date()) {
  const settings = readSettings();
  if (!settings.smtp.enabled || now.getHours() < settings.digest.hour) return { sent: false, reason: 'not-due' };
  const existing = getDb().prepare(`SELECT status, attempts FROM ${NOTIFICATION_LOG_TABLE} WHERE sent_date = ?`).get(localDate(now)) as {
    status: string;
    attempts: number;
  } | undefined;
  if (existing && (existing.status === 'sent' || existing.status === 'skipped' || existing.attempts >= MAX_ATTEMPTS)) {
    return { sent: false, reason: 'already-processed' };
  }

  const items = gatherDigest(settings);
  if (!items.tasks.length && !items.deals.length) {
    recordRun('skipped', settings, 0, 0);
    armScheduler();
    return { sent: false, reason: 'empty' };
  }
  try {
    await deliver(settings, `SimpleCRM Tagesübersicht ${localDate(now)}`, renderDigest(items));
    recordRun('sent', settings, items.tasks.length, items.deals.length);
    armScheduler();
    return { sent: true, reason: 'sent' };
  } catch (error) {
    recordRun('failed', settings, items.tasks.length, items.deals.length, error instanceof Error ? error.message : String(error));
    timer = setTimeout(() => void runDigestIfDue(), RETRY_MS);
    logger.error('[Notifications] Digest delivery failed:', error);
    return { sent: false, reason: 'failed' };
  }
}

export async function sendTestNotification() {
  try {
    await deliver(readSettings(), 'SimpleCRM Test-E-Mail', 'Der E-Mail-Versand von SimpleCRM funktioniert.');
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : String(error) };
  }
}

export function getNotificationStatus() {
  const settings = readSettings();
  const lastRun = (getDb().prepare(`SELECT * FROM ${NOTIFICATION_LOG_TABLE} ORDER BY created_at DESC LIMIT 1`).get() as NotificationLogEntry | undefined) ?? null;
  const next = new Date();
  next.setHours(settings.digest.hour, 0, 0, 0);
  if (next <= new Date()) next.setDate(next.getDate() + 1);
  const worker = readWorkerLock();
  return {
    enabled: settings.smtp.enabled,
    running: Boolean(worker && processExists(worker.pid)),
    lastHeartbeatAt: worker?.updatedAt ?? null,
    nextRunAt: next.toISOString(),
    lastRun,
  };
}

function armScheduler() {
  if (timer) clearTimeout(timer);
  const settings = readSettings();
  const next = new Date();
  next.setHours(settings.digest.hour, 0, 0, 0);
  if (next <= new Date()) next.setDate(next.getDate() + 1);
  timer = setTimeout(() => void runDigestIfDue(), Math.max(1_000, next.getTime() - Date.now()));
}

export async function startNotificationDigest(nextLogger: typeof logger) {
  logger = nextLogger;
  await migrateLegacySettings();
  resumeListener = () => {
    armScheduler();
    void runDigestIfDue();
  };
  powerMonitor.on('resume', resumeListener);
  armScheduler();
  void runDigestIfDue();
}

export function stopNotificationDigest() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (resumeListener) powerMonitor.removeListener('resume', resumeListener);
  resumeListener = null;
}

type WorkerLock = { pid: number; token: string; updatedAt: string };

function readWorkerLock(): WorkerLock | null {
  try {
    const value = JSON.parse(fs.readFileSync(lockPath(), 'utf8')) as Partial<WorkerLock>;
    return typeof value.pid === 'number' && typeof value.token === 'string' && typeof value.updatedAt === 'string'
      ? value as WorkerLock
      : null;
  } catch {
    return null;
  }
}

function processExists(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function writeWorkerLock(lock: WorkerLock) {
  fs.writeFileSync(lockPath(), JSON.stringify(lock), { encoding: 'utf8', mode: 0o600 });
}

function workerCommand() {
  return app.isPackaged
    ? { executable: process.execPath, args: [NOTIFICATION_WORKER_ARG] }
    : { executable: process.execPath, args: [process.argv[1], NOTIFICATION_WORKER_ARG] };
}

function xmlEscape(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function configureAutostart(enabled: boolean) {
  const command = workerCommand();
  if (process.platform === 'win32') {
    app.setLoginItemSettings({ openAtLogin: enabled, path: command.executable, args: command.args });
    return;
  }

  if (process.platform === 'darwin') {
    const launchAgents = path.join(app.getPath('home'), 'Library', 'LaunchAgents');
    const plist = path.join(launchAgents, 'com.zondiac.simplecrm.notifications.plist');
    if (!enabled) {
      fs.rmSync(plist, { force: true });
      return;
    }
    fs.mkdirSync(launchAgents, { recursive: true });
    const argumentsXml = [command.executable, ...command.args]
      .map((argument) => `    <string>${xmlEscape(argument)}</string>`)
      .join('\n');
    fs.writeFileSync(plist, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.zondiac.simplecrm.notifications</string>
  <key>ProgramArguments</key><array>
${argumentsXml}
  </array>
  <key>RunAtLoad</key><true/>
</dict></plist>\n`, { encoding: 'utf8', mode: 0o600 });
    return;
  }

  const autostartDirectory = path.join(process.env.XDG_CONFIG_HOME ?? path.join(app.getPath('home'), '.config'), 'autostart');
  const desktopFile = path.join(autostartDirectory, 'simplecrm-notifications.desktop');
  if (!enabled) {
    fs.rmSync(desktopFile, { force: true });
    return;
  }
  fs.mkdirSync(autostartDirectory, { recursive: true });
  const executable = process.env.APPIMAGE ?? command.executable;
  const escapedExecutable = executable.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  fs.writeFileSync(desktopFile, `[Desktop Entry]\nType=Application\nName=SimpleCRM Notifications\nExec="${escapedExecutable}" ${NOTIFICATION_WORKER_ARG}\nX-GNOME-Autostart-enabled=true\n`, { encoding: 'utf8', mode: 0o600 });
}

async function ensureNotificationWorker() {
  const existing = readWorkerLock();
  if (existing && processExists(existing.pid)) return;
  fs.rmSync(lockPath(), { force: true });
  const command = workerCommand();
  spawn(command.executable, command.args, { detached: true, stdio: 'ignore' }).unref();
}

export async function stopNotificationWorker(timeoutMs = 5_000) {
  const worker = readWorkerLock();
  if (!worker || !processExists(worker.pid)) {
    fs.rmSync(lockPath(), { force: true });
    return true;
  }
  fs.writeFileSync(stopPath(), worker.token, { encoding: 'utf8', mode: 0o600 });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, STOP_POLL_MS));
    const current = readWorkerLock();
    if (!current || current.token !== worker.token) return true;
  }
  return false;
}

export async function syncNotificationWorker() {
  if (process.env.SIMPLECRM_E2E === '1') return;
  const enabled = readSettings().smtp.enabled;
  configureAutostart(enabled);
  if (enabled) await ensureNotificationWorker();
  else await stopNotificationWorker();
}

export async function runNotificationWorker(nextLogger: typeof logger) {
  logger = nextLogger;
  const existing = readWorkerLock();
  if (existing && processExists(existing.pid)) return false;
  fs.rmSync(lockPath(), { force: true });
  fs.rmSync(stopPath(), { force: true });

  const lock: WorkerLock = { pid: process.pid, token: randomUUID(), updatedAt: new Date().toISOString() };
  try {
    const descriptor = fs.openSync(lockPath(), 'wx', 0o600);
    fs.writeFileSync(descriptor, JSON.stringify(lock));
    fs.closeSync(descriptor);
  } catch (error) {
    logger.warn('[Notifications] Another worker acquired the lock:', error);
    return false;
  }

  const cleanup = () => {
    stopNotificationDigest();
    const current = readWorkerLock();
    if (current?.token === lock.token) fs.rmSync(lockPath(), { force: true });
    try {
      if (fs.readFileSync(stopPath(), 'utf8') === lock.token) fs.rmSync(stopPath(), { force: true });
    } catch {
      // No stop request to clean up.
    }
  };
  const heartbeat = setInterval(() => {
    lock.updatedAt = new Date().toISOString();
    writeWorkerLock(lock);
  }, HEARTBEAT_MS);
  const stopPoll = setInterval(() => {
    try {
      if (fs.readFileSync(stopPath(), 'utf8') !== lock.token) return;
      clearInterval(heartbeat);
      clearInterval(stopPoll);
      cleanup();
      app.quit();
    } catch {
      // No stop request.
    }
  }, STOP_POLL_MS);
  process.once('exit', cleanup);
  await startNotificationDigest(nextLogger);
  logger.info('[Notifications] Background worker started');
  return true;
}
