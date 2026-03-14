import { IPCChannels } from '../../shared/ipc/channels';

const handlers = new Map<string, any>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((channel: string, handler: unknown) => {
    handlers.set(channel, handler);
    return () => undefined;
  }),
}));

const sqliteMocks = {
  getDashboardStats: jest.fn(),
  getRecentCustomers: jest.fn(),
  getUpcomingTasks: jest.fn(),
  getSyncInfo: jest.fn(),
  setSyncInfo: jest.fn(),
  getAllJtlFirmen: jest.fn(),
  getAllJtlWarenlager: jest.fn(),
  getAllJtlZahlungsarten: jest.fn(),
  getAllJtlVersandarten: jest.fn(),
};

jest.mock('../../electron/sqlite-service', () => sqliteMocks);

const mssqlKeytarMocks = {
  saveMssqlSettingsWithKeytar: jest.fn(),
  getMssqlSettingsWithKeytar: jest.fn(),
  testConnectionWithKeytar: jest.fn(),
  clearMssqlPasswordFromKeytar: jest.fn(),
};

jest.mock('../../electron/mssql-keytar-service', () => mssqlKeytarMocks);

const syncMocks = {
  runSync: jest.fn(),
  getLastSyncStatus: jest.fn(),
};

jest.mock('../../electron/sync-service', () => syncMocks);

const jtlServiceMocks = {
  createJtlOrder: jest.fn(),
};

jest.mock('../../electron/jtl-order-service', () => jtlServiceMocks);

import { registerMssqlHandlers } from '../../electron/ipc/mssql';
import { registerSyncHandlers } from '../../electron/ipc/sync';
import { registerDashboardHandlers } from '../../electron/ipc/dashboard';
import { registerJtlHandlers } from '../../electron/ipc/jtl';

describe('misc IPC handlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(sqliteMocks).forEach((fn) => fn.mockReset());
    Object.values(mssqlKeytarMocks).forEach((fn) => fn.mockReset());
    Object.values(syncMocks).forEach((fn) => fn.mockReset());
    Object.values(jtlServiceMocks).forEach((fn) => fn.mockReset());
  });

  test('mssql test-connection returns structured failure details', async () => {
    mssqlKeytarMocks.testConnectionWithKeytar.mockResolvedValue({
      success: false,
      error: { userMessage: 'Fehlgeschlagen' },
    });
    registerMssqlHandlers({ logger: console, isDevelopment: false });
    const testConnection = handlers.get(IPCChannels.Mssql.TestConnection);
    const result = await testConnection({}, { server: 'srv', database: 'db' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Fehlgeschlagen');
  });

  test('sync run and status handlers forward service responses', async () => {
    syncMocks.runSync.mockResolvedValue({ success: true });
    syncMocks.getLastSyncStatus.mockReturnValue({ status: 'Success' });
    registerSyncHandlers({ logger: console, getMainWindow: () => null });

    const run = handlers.get(IPCChannels.Sync.Run);
    const status = handlers.get(IPCChannels.Sync.GetStatus);
    await expect(run({})).resolves.toEqual({ success: true });
    await expect(status({})).resolves.toEqual({ status: 'Success' });
  });

  test('dashboard and jtl channels return sqlite-backed values', async () => {
    sqliteMocks.getDashboardStats.mockReturnValue({ totalCustomers: 3 });
    sqliteMocks.getAllJtlFirmen.mockReturnValue([{ kFirma: 1, cName: 'A' }]);
    jtlServiceMocks.createJtlOrder.mockResolvedValue({ success: true, jtlOrderId: 1 });

    registerDashboardHandlers({ logger: console });
    registerJtlHandlers({ logger: console });

    const stats = handlers.get(IPCChannels.Dashboard.GetStats);
    const firmen = handlers.get(IPCChannels.Jtl.GetFirmen);
    const createOrder = handlers.get(IPCChannels.Jtl.CreateOrder);

    await expect(stats({})).resolves.toEqual({ totalCustomers: 3 });
    await expect(firmen({})).resolves.toEqual([{ kFirma: 1, cName: 'A' }]);
    await expect(createOrder({}, { simpleCrmCustomerId: 1, products: [] })).resolves.toEqual({ success: true, jtlOrderId: 1 });
  });
});
