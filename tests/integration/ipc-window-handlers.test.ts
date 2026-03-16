const ipcListeners = new Map<string, any>();
const ipcHandlers = new Map<string, any>();

const mockIpcMain = {
  on: jest.fn((channel: string, listener: any) => {
    ipcListeners.set(channel, listener);
  }),
  handle: jest.fn((channel: string, handler: any) => {
    ipcHandlers.set(channel, handler);
  }),
  removeListener: jest.fn(),
  removeHandler: jest.fn(),
};

const mockDialog = {
  showSaveDialog: jest.fn(),
};

const mockFs = {
  promises: {
    writeFile: jest.fn(),
  },
};

jest.mock('electron', () => ({
  BrowserWindow: jest.fn(),
  dialog: mockDialog,
  ipcMain: mockIpcMain,
}));

jest.mock('fs', () => mockFs);

import { registerWindowHandlers } from '../../electron/ipc/window';

const mockWindow = {
  minimize: jest.fn(),
  maximize: jest.fn(),
  unmaximize: jest.fn(),
  close: jest.fn(),
  isMaximized: jest.fn(),
  isFullScreen: jest.fn(),
};

const getMainWindow = jest.fn(() => mockWindow as any);

describe('registerWindowHandlers', () => {
  beforeEach(() => {
    ipcListeners.clear();
    ipcHandlers.clear();
    [
      mockWindow.minimize, mockWindow.maximize, mockWindow.unmaximize,
      mockWindow.close, mockWindow.isMaximized, mockWindow.isFullScreen,
      mockDialog.showSaveDialog, mockFs.promises.writeFile,
    ].forEach((fn) => fn.mockReset());
    getMainWindow.mockReturnValue(mockWindow as any);
    registerWindowHandlers({ getMainWindow, logger: console });
  });

  describe('window-control listener', () => {
    test('minimizes window on minimize command', () => {
      const listener = ipcListeners.get('window-control');
      listener({}, 'minimize');
      expect(mockWindow.minimize).toHaveBeenCalledTimes(1);
    });

    test('maximizes window when not maximized', () => {
      mockWindow.isMaximized.mockReturnValue(false);
      const listener = ipcListeners.get('window-control');
      listener({}, 'maximize');
      expect(mockWindow.maximize).toHaveBeenCalledTimes(1);
      expect(mockWindow.unmaximize).not.toHaveBeenCalled();
    });

    test('unmaximizes window when already maximized', () => {
      mockWindow.isMaximized.mockReturnValue(true);
      const listener = ipcListeners.get('window-control');
      listener({}, 'maximize');
      expect(mockWindow.unmaximize).toHaveBeenCalledTimes(1);
      expect(mockWindow.maximize).not.toHaveBeenCalled();
    });

    test('closes window on close command', () => {
      const listener = ipcListeners.get('window-control');
      listener({}, 'close');
      expect(mockWindow.close).toHaveBeenCalledTimes(1);
    });

    test('does nothing when window is null', () => {
      getMainWindow.mockReturnValue(null);
      registerWindowHandlers({ getMainWindow, logger: console });
      const listener = ipcListeners.get('window-control');
      listener({}, 'minimize');
      expect(mockWindow.minimize).not.toHaveBeenCalled();
    });
  });

  describe('window:get-state handler', () => {
    test('returns maximized and fullscreen state', () => {
      mockWindow.isMaximized.mockReturnValue(true);
      mockWindow.isFullScreen.mockReturnValue(false);

      const handler = ipcHandlers.get('window:get-state');
      const result = handler();
      expect(result).toEqual({ isMaximized: true, isFullScreen: false });
    });

    test('returns false for both when window is null', () => {
      getMainWindow.mockReturnValue(null);
      registerWindowHandlers({ getMainWindow, logger: console });

      const handler = ipcHandlers.get('window:get-state');
      const result = handler();
      expect(result).toEqual({ isMaximized: false, isFullScreen: false });
    });
  });

  describe('save-data listener', () => {
    test('saves file and replies with success', async () => {
      mockDialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/tmp/data.json' });
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const mockEvent = { reply: jest.fn() };
      const listener = ipcListeners.get('save-data');
      await listener(mockEvent, { data: { key: 'value' }, fileName: 'data.json' });

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        '/tmp/data.json',
        JSON.stringify({ key: 'value' }, null, 2),
        'utf-8'
      );
      expect(mockEvent.reply).toHaveBeenCalledWith('save-data-reply', { success: true });
    });

    test('replies with cancel error when dialog is cancelled', async () => {
      mockDialog.showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined });

      const mockEvent = { reply: jest.fn() };
      const listener = ipcListeners.get('save-data');
      await listener(mockEvent, { data: {}, fileName: 'data.json' });

      expect(mockFs.promises.writeFile).not.toHaveBeenCalled();
      expect(mockEvent.reply).toHaveBeenCalledWith('save-data-reply', {
        success: false,
        error: 'Save cancelled',
      });
    });

    test('replies with error when writeFile throws', async () => {
      mockDialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/tmp/data.json' });
      mockFs.promises.writeFile.mockRejectedValue(new Error('Permission denied'));

      const mockEvent = { reply: jest.fn() };
      const listener = ipcListeners.get('save-data');
      await listener(mockEvent, { data: {}, fileName: 'data.json' });

      expect(mockEvent.reply).toHaveBeenCalledWith('save-data-reply', {
        success: false,
        error: 'Permission denied',
      });
    });
  });

  test('registers window-control listener and window:get-state handler', () => {
    expect(ipcListeners.has('window-control')).toBe(true);
    expect(ipcHandlers.has('window:get-state')).toBe(true);
    expect(ipcListeners.has('save-data')).toBe(true);
  });
});
