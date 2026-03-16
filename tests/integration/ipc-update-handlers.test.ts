import { IPCChannels } from '../../shared/ipc/channels';

const handlers = new Map<string, any>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((channel: string, handler: unknown) => {
    handlers.set(channel, handler);
    return () => undefined;
  }),
}));

const updateServiceMocks = {
  checkForUpdates: jest.fn(),
  getUpdateStatus: jest.fn(),
  quitAndInstall: jest.fn(),
};

jest.mock('../../electron/update-service', () => updateServiceMocks);

import { registerUpdateHandlers } from '../../electron/ipc/update';

describe('registerUpdateHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(updateServiceMocks).forEach((fn) => fn.mockReset());
    registerUpdateHandlers({ logger: console });
  });

  describe('Update.CheckForUpdates', () => {
    test('returns success with update info', async () => {
      const updateInfo = { version: '2.0.0', releaseDate: '2026-03-01' };
      updateServiceMocks.checkForUpdates.mockResolvedValue(updateInfo);

      const handler = handlers.get(IPCChannels.Update.CheckForUpdates);
      const result = await handler({});
      expect(result).toEqual({ success: true, info: updateInfo });
      expect(updateServiceMocks.checkForUpdates).toHaveBeenCalledTimes(1);
    });

    test('returns error when check fails', async () => {
      updateServiceMocks.checkForUpdates.mockRejectedValue(new Error('No internet'));

      const handler = handlers.get(IPCChannels.Update.CheckForUpdates);
      const result = await handler({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('No internet');
    });

    test('uses fallback message when error has no message', async () => {
      const err = new Error('');
      updateServiceMocks.checkForUpdates.mockRejectedValue(err);

      const handler = handlers.get(IPCChannels.Update.CheckForUpdates);
      const result = await handler({});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check for updates');
    });
  });

  describe('Update.GetStatus', () => {
    test('returns current update status', async () => {
      const status = { state: 'idle', version: null };
      updateServiceMocks.getUpdateStatus.mockReturnValue(status);

      const handler = handlers.get(IPCChannels.Update.GetStatus);
      const result = await handler({});
      expect(result).toEqual(status);
      expect(updateServiceMocks.getUpdateStatus).toHaveBeenCalledTimes(1);
    });

    test('returns downloading status', async () => {
      updateServiceMocks.getUpdateStatus.mockReturnValue({ state: 'downloading', progress: 45 });

      const handler = handlers.get(IPCChannels.Update.GetStatus);
      const result = await handler({});
      expect(result.state).toBe('downloading');
      expect(result.progress).toBe(45);
    });
  });

  describe('Update.InstallUpdate', () => {
    test('calls quitAndInstall and returns success', async () => {
      updateServiceMocks.quitAndInstall.mockReturnValue(undefined);

      const handler = handlers.get(IPCChannels.Update.InstallUpdate);
      const result = await handler({});
      expect(result).toEqual({ success: true });
      expect(updateServiceMocks.quitAndInstall).toHaveBeenCalledTimes(1);
    });

    test('returns error when install throws', async () => {
      updateServiceMocks.quitAndInstall.mockImplementation(() => { throw new Error('No update downloaded'); });

      const handler = handlers.get(IPCChannels.Update.InstallUpdate);
      const result = await handler({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('No update downloaded');
    });

    test('uses fallback message when install error has no message', async () => {
      updateServiceMocks.quitAndInstall.mockImplementation(() => { throw new Error(''); });

      const handler = handlers.get(IPCChannels.Update.InstallUpdate);
      const result = await handler({});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to install update');
    });
  });

  test('registers all three handlers', () => {
    expect(handlers.has(IPCChannels.Update.CheckForUpdates)).toBe(true);
    expect(handlers.has(IPCChannels.Update.GetStatus)).toBe(true);
    expect(handlers.has(IPCChannels.Update.InstallUpdate)).toBe(true);
  });
});
