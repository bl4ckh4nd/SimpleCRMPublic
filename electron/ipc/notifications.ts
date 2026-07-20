import { IPC } from '../../shared/ipc/channels';
import {
  getNotificationSettings,
  getNotificationStatus,
  saveNotificationSettings,
  sendTestNotification,
} from '../notification-digest';
import { getNotificationLog } from '../sqlite-service';
import { registerIpcHandler } from './register';

interface NotificationHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}

export function registerNotificationHandlers({ logger }: NotificationHandlersOptions) {
  const disposers = [
    registerIpcHandler(IPC.Notifications.GetSettings, async () => getNotificationSettings(), { logger }),
    registerIpcHandler(IPC.Notifications.SaveSettings, async (_event, settings) => saveNotificationSettings(settings), { logger }),
    registerIpcHandler(IPC.Notifications.GetLog, async (_event, payload = {}) => getNotificationLog(payload.limit ?? 20), { logger }),
    registerIpcHandler(IPC.Notifications.GetStatus, async () => getNotificationStatus(), { logger }),
    registerIpcHandler(IPC.Notifications.SendTest, async () => sendTestNotification(), { logger }),
  ];

  return () => disposers.forEach((dispose) => dispose());
}
