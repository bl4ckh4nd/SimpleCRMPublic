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
};

jest.mock('../../electron/sqlite-service', () => sqliteMocks);

import { registerDashboardHandlers } from '../../electron/ipc/dashboard';

describe('registerDashboardHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(sqliteMocks).forEach((fn) => fn.mockReset());
    registerDashboardHandlers({ logger: console });
  });

  describe('Dashboard.GetStats', () => {
    test('returns stats from service', async () => {
      const stats = { totalCustomers: 5, totalDeals: 3, totalRevenue: 1000 };
      sqliteMocks.getDashboardStats.mockReturnValue(stats);

      const handler = handlers.get(IPCChannels.Dashboard.GetStats);
      const result = await handler({});
      expect(result).toEqual(stats);
      expect(sqliteMocks.getDashboardStats).toHaveBeenCalledTimes(1);
    });

    test('rethrows when service throws', async () => {
      sqliteMocks.getDashboardStats.mockImplementation(() => { throw new Error('DB error'); });

      const handler = handlers.get(IPCChannels.Dashboard.GetStats);
      await expect(handler({})).rejects.toThrow('DB error');
    });
  });

  describe('Dashboard.GetRecentCustomers', () => {
    test('returns recent customers from service', async () => {
      const customers = [{ id: 1, name: 'ACME' }, { id: 2, name: 'Globex' }];
      sqliteMocks.getRecentCustomers.mockReturnValue(customers);

      const handler = handlers.get(IPCChannels.Dashboard.GetRecentCustomers);
      const result = await handler({});
      expect(result).toEqual(customers);
      expect(sqliteMocks.getRecentCustomers).toHaveBeenCalledTimes(1);
    });

    test('returns empty array when service returns empty', async () => {
      sqliteMocks.getRecentCustomers.mockReturnValue([]);

      const handler = handlers.get(IPCChannels.Dashboard.GetRecentCustomers);
      const result = await handler({});
      expect(result).toEqual([]);
    });

    test('rethrows when service throws', async () => {
      sqliteMocks.getRecentCustomers.mockImplementation(() => { throw new Error('Query failed'); });

      const handler = handlers.get(IPCChannels.Dashboard.GetRecentCustomers);
      await expect(handler({})).rejects.toThrow('Query failed');
    });
  });

  describe('Dashboard.GetUpcomingTasks', () => {
    test('returns upcoming tasks from service', async () => {
      const tasks = [{ id: 1, title: 'Follow up', due_date: '2026-04-01' }];
      sqliteMocks.getUpcomingTasks.mockReturnValue(tasks);

      const handler = handlers.get(IPCChannels.Dashboard.GetUpcomingTasks);
      const result = await handler({});
      expect(result).toEqual(tasks);
      expect(sqliteMocks.getUpcomingTasks).toHaveBeenCalledTimes(1);
    });

    test('rethrows when service throws', async () => {
      sqliteMocks.getUpcomingTasks.mockImplementation(() => { throw new Error('Timeout'); });

      const handler = handlers.get(IPCChannels.Dashboard.GetUpcomingTasks);
      await expect(handler({})).rejects.toThrow('Timeout');
    });
  });

  test('registers all three handlers', () => {
    expect(handlers.has(IPCChannels.Dashboard.GetStats)).toBe(true);
    expect(handlers.has(IPCChannels.Dashboard.GetRecentCustomers)).toBe(true);
    expect(handlers.has(IPCChannels.Dashboard.GetUpcomingTasks)).toBe(true);
  });
});
