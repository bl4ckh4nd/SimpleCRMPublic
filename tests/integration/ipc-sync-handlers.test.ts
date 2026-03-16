import { IPCChannels } from '../../shared/ipc/channels';

const handlers = new Map<string, any>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((channel: string, handler: unknown) => {
    handlers.set(channel, handler);
    return () => undefined;
  }),
}));

const syncServiceMocks = {
  runSync: jest.fn(),
  getLastSyncStatus: jest.fn(),
};

jest.mock('../../electron/sync-service', () => syncServiceMocks);

const sqliteMocks = {
  getSyncInfo: jest.fn(),
  setSyncInfo: jest.fn(),
};

jest.mock('../../electron/sqlite-service', () => sqliteMocks);

jest.mock('electron', () => ({
  BrowserWindow: jest.fn(),
}));

import { registerSyncHandlers } from '../../electron/ipc/sync';

const mockWindow = { webContents: { send: jest.fn() } };
const getMainWindow = jest.fn(() => mockWindow as any);

describe('registerSyncHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    [...Object.values(syncServiceMocks), ...Object.values(sqliteMocks)].forEach((fn) => fn.mockReset());
    getMainWindow.mockReturnValue(mockWindow as any);
    registerSyncHandlers({ logger: console, getMainWindow });
  });

  describe('Sync.Run', () => {
    test('runs sync and returns success', async () => {
      syncServiceMocks.runSync.mockResolvedValue(undefined);

      const handler = handlers.get(IPCChannels.Sync.Run);
      const result = await handler({});
      expect(result).toEqual({ success: true });
      expect(syncServiceMocks.runSync).toHaveBeenCalledWith(mockWindow);
    });

    test('returns error when sync throws', async () => {
      syncServiceMocks.runSync.mockRejectedValue(new Error('MSSQL connection lost'));

      const handler = handlers.get(IPCChannels.Sync.Run);
      const result = await handler({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('MSSQL connection lost');
    });

    test('passes null window when getMainWindow returns null', async () => {
      getMainWindow.mockReturnValue(null);
      syncServiceMocks.runSync.mockResolvedValue(undefined);

      const handler = handlers.get(IPCChannels.Sync.Run);
      await handler({});
      expect(syncServiceMocks.runSync).toHaveBeenCalledWith(null);
    });
  });

  describe('Sync.GetStatus', () => {
    test('returns last sync status', async () => {
      const status = { lastSync: '2026-03-01T10:00:00Z', success: true };
      syncServiceMocks.getLastSyncStatus.mockReturnValue(status);

      const handler = handlers.get(IPCChannels.Sync.GetStatus);
      const result = await handler({});
      expect(result).toEqual(status);
    });

    test('returns null when service throws', async () => {
      syncServiceMocks.getLastSyncStatus.mockImplementation(() => { throw new Error('Read error'); });

      const handler = handlers.get(IPCChannels.Sync.GetStatus);
      const result = await handler({});
      expect(result).toBeNull();
    });
  });

  describe('Sync.GetInfo', () => {
    test('returns sync info for given key', async () => {
      sqliteMocks.getSyncInfo.mockReturnValue('2026-03-01');

      const handler = handlers.get(IPCChannels.Sync.GetInfo);
      const result = await handler({}, 'lastCustomerSync');
      expect(result).toBe('2026-03-01');
      expect(sqliteMocks.getSyncInfo).toHaveBeenCalledWith('lastCustomerSync');
    });

    test('returns null when service throws', async () => {
      sqliteMocks.getSyncInfo.mockImplementation(() => { throw new Error('Key missing'); });

      const handler = handlers.get(IPCChannels.Sync.GetInfo);
      const result = await handler({}, 'badKey');
      expect(result).toBeNull();
    });
  });

  describe('Sync.SetInfo', () => {
    test('sets sync info and returns success', async () => {
      sqliteMocks.setSyncInfo.mockReturnValue(undefined);

      const handler = handlers.get(IPCChannels.Sync.SetInfo);
      const result = await handler({}, { key: 'lastCustomerSync', value: '2026-03-16' });
      expect(result).toEqual({ success: true });
      expect(sqliteMocks.setSyncInfo).toHaveBeenCalledWith('lastCustomerSync', '2026-03-16');
    });

    test('returns error when service throws', async () => {
      sqliteMocks.setSyncInfo.mockImplementation(() => { throw new Error('Write failed'); });

      const handler = handlers.get(IPCChannels.Sync.SetInfo);
      const result = await handler({}, { key: 'foo', value: 'bar' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Write failed');
    });

    test('handles missing payload gracefully', async () => {
      sqliteMocks.setSyncInfo.mockReturnValue(undefined);

      const handler = handlers.get(IPCChannels.Sync.SetInfo);
      const result = await handler({}, null);
      expect(result).toEqual({ success: true });
      expect(sqliteMocks.setSyncInfo).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  test('registers all four handlers', () => {
    expect(handlers.has(IPCChannels.Sync.Run)).toBe(true);
    expect(handlers.has(IPCChannels.Sync.GetStatus)).toBe(true);
    expect(handlers.has(IPCChannels.Sync.GetInfo)).toBe(true);
    expect(handlers.has(IPCChannels.Sync.SetInfo)).toBe(true);
  });
});
