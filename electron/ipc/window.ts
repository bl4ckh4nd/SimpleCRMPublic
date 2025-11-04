import { BrowserWindow, dialog, ipcMain, IpcMainEvent, SaveDialogReturnValue } from 'electron';
import fs from 'fs';

interface WindowHandlersOptions {
  getMainWindow: () => BrowserWindow | null;
  logger: Pick<typeof console, 'info' | 'warn' | 'error'>;
}

export function registerWindowHandlers(options: WindowHandlersOptions) {
  const { getMainWindow, logger } = options;
  const disposers: Array<() => void> = [];

  const windowControlListener = (_: IpcMainEvent, command: string) => {
    const window = getMainWindow();
    if (!window) return;
    switch (command) {
      case 'minimize':
        window.minimize();
        break;
      case 'maximize':
        window.isMaximized() ? window.unmaximize() : window.maximize();
        break;
      case 'close':
        window.close();
        break;
      default:
        logger.warn(`[IPC] Unknown window control command: ${command}`);
    }
  };

  ipcMain.on('window-control', windowControlListener);
  disposers.push(() => ipcMain.removeListener('window-control', windowControlListener));

  const windowGetStateHandler = () => {
    const window = getMainWindow();
    return {
      isMaximized: window ? window.isMaximized() : false,
      isFullScreen: window ? window.isFullScreen() : false,
    };
  };

  ipcMain.handle('window:get-state', windowGetStateHandler);
  disposers.push(() => ipcMain.removeHandler('window:get-state'));

  const saveDataListener = async (event: IpcMainEvent, { data, fileName }: { data: unknown; fileName: string }) => {
    try {
      const result = (await dialog.showSaveDialog({
        title: 'Save Data',
        defaultPath: fileName,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })) as unknown as SaveDialogReturnValue;

      if (result.canceled || !result.filePath) {
        event.reply('save-data-reply', { success: false, error: 'Save cancelled' });
        return;
      }

      await fs.promises.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.info(`[IPC] File saved successfully: ${result.filePath}`);
      event.reply('save-data-reply', { success: true });
    } catch (error: any) {
      logger.error('[IPC] Error saving data:', error);
      event.reply('save-data-reply', { success: false, error: error?.message ?? 'Unknown error' });
    }
  };

  ipcMain.on('save-data', saveDataListener);
  disposers.push(() => ipcMain.removeListener('save-data', saveDataListener));

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
