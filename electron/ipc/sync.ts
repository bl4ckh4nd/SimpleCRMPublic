import { IPC } from '../../shared/ipc/channels';
import { BrowserWindow } from 'electron';
import { registerIpcHandler } from './register';
import { runSync, getLastSyncStatus } from '../sync-service';
import { getSyncInfo, setSyncInfo } from '../sqlite-service';

interface SyncHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
  getMainWindow: () => BrowserWindow | null;
}

type Disposer = () => void;

export function registerSyncHandlers(options: SyncHandlersOptions) {
  const { logger, getMainWindow } = options;
  const disposers: Disposer[] = [];

  disposers.push(registerIpcHandler(IPC.Sync.Run, async () => {
    try {
      await runSync(getMainWindow());
      return { success: true };
    } catch (error) {
      logger.error('IPC Error running sync:', error);
      return { success: false, error: (error as Error).message };
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPC.Sync.GetStatus, async () => {
    try {
      return getLastSyncStatus();
    } catch (error) {
      logger.error('IPC Error getting sync status:', error);
      return null;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPC.Sync.GetInfo, async (_event, key: string) => {
    try {
      return getSyncInfo(key);
    } catch (error) {
      logger.error('IPC Error getting sync info:', error);
      return null;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPC.Sync.SetInfo, async (_event, payload) => {
    try {
      const { key, value } = payload ?? {};
      setSyncInfo(key, value);
      return { success: true };
    } catch (error) {
      logger.error('IPC Error setting sync info:', error);
      return { success: false, error: (error as Error).message };
    }
  }, { logger }));

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
