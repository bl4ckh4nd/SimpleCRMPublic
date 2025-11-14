import { BrowserWindow } from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export type UpdateStatusPayload = {
  status: UpdateStatus;
  info?: unknown;
  error?: string;
};

const STATUS_CHANNEL = 'update:status';
const PROGRESS_CHANNEL = 'update:download-progress';

let getMainWindow: () => BrowserWindow | null = () => null;

let currentStatus: UpdateStatusPayload = {
  status: 'idle',
};

function sendToRenderer(channel: string, payload: unknown) {
  const win = getMainWindow();
  if (!win || win.isDestroyed()) {
    return;
  }

  try {
    win.webContents.send(channel, payload);
  } catch (error) {
    log.error('[AutoUpdate] Failed to send IPC message:', error);
  }
}

function updateStatus(next: UpdateStatusPayload) {
  currentStatus = next;
  sendToRenderer(STATUS_CHANNEL, currentStatus);
}

export function initializeAutoUpdater(options: {
  getMainWindow: () => BrowserWindow | null;
  logger?: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}) {
  const { logger = console } = options;

  getMainWindow = options.getMainWindow;

  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  logger.info('[AutoUpdate] Initializing auto-updater');

  autoUpdater.on('checking-for-update', () => {
    logger.info('[AutoUpdate] Checking for update...');
    updateStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    logger.info('[AutoUpdate] Update available:', info);
    updateStatus({ status: 'available', info });
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info('[AutoUpdate] No update available:', info);
    updateStatus({ status: 'not-available', info });
  });

  autoUpdater.on('error', (error) => {
    logger.error('[AutoUpdate] Error in auto-updater:', error);
    updateStatus({ status: 'error', error: error == null ? 'Unknown error' : String(error) });
  });

  autoUpdater.on('download-progress', (progress) => {
    logger.info(
      `[AutoUpdate] Download progress: ${progress.percent?.toFixed?.(2) ?? '0'}% (${progress.transferred}/${progress.total})`,
    );
    sendToRenderer(PROGRESS_CHANNEL, progress);
    updateStatus({ status: 'downloading', info: progress });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('[AutoUpdate] Update downloaded:', info);
    updateStatus({ status: 'downloaded', info });
  });
}

export function getUpdateStatus(): UpdateStatusPayload {
  return currentStatus;
}

export async function checkForUpdatesAndNotify() {
  return autoUpdater.checkForUpdatesAndNotify();
}

export async function checkForUpdates() {
  return autoUpdater.checkForUpdates();
}

export function quitAndInstall() {
  log.info('[AutoUpdate] Quitting and installing update');
  autoUpdater.quitAndInstall();
}

