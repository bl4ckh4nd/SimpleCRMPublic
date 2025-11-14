import { IPCChannels } from '@shared/ipc/channels';
import { registerIpcHandler } from './register';
import {
  checkForUpdates,
  getUpdateStatus,
  quitAndInstall,
} from '../update-service';

interface UpdateHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}

type Disposer = () => void;

export function registerUpdateHandlers(options: UpdateHandlersOptions) {
  const { logger } = options;
  const disposers: Disposer[] = [];

  disposers.push(
    registerIpcHandler(
      IPCChannels.Update.CheckForUpdates,
      async () => {
        logger.info('[IPC Main] app:check-for-updates invoked');
        try {
          const result = await checkForUpdates();
          return { success: true, info: result };
        } catch (error) {
          logger.error('[IPC Main] app:check-for-updates error:', error);
          return {
            success: false,
            error: (error as Error).message || 'Failed to check for updates',
          };
        }
      },
      { logger },
    ),
  );

  disposers.push(
    registerIpcHandler(
      IPCChannels.Update.GetStatus,
      async () => {
        logger.debug('[IPC Main] app:get-update-status invoked');
        return getUpdateStatus();
      },
      { logger },
    ),
  );

  disposers.push(
    registerIpcHandler(
      IPCChannels.Update.InstallUpdate,
      async () => {
        logger.info('[IPC Main] app:install-update invoked');
        try {
          quitAndInstall();
          return { success: true };
        } catch (error) {
          logger.error('[IPC Main] app:install-update error:', error);
          return {
            success: false,
            error: (error as Error).message || 'Failed to install update',
          };
        }
      },
      { logger },
    ),
  );

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}

