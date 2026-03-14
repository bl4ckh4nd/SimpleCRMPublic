import { IPCChannels } from '@shared/ipc/channels';
import { dashboardService } from '@/services/data/dashboardService';

describe('dashboardService', () => {
  const invoke = jest.fn();

  beforeEach(() => {
    invoke.mockReset();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { invoke },
    });
  });

  test('returns dashboard stats payload from IPC', async () => {
    invoke.mockResolvedValueOnce({
      totalCustomers: 10,
      newCustomersLastMonth: 2,
      activeDealsCount: 3,
      activeDealsValue: 2000,
      pendingTasksCount: 4,
      dueTodayTasksCount: 1,
      conversionRate: 50,
    });
    const stats = await dashboardService.getDashboardStats();
    expect(stats.totalCustomers).toBe(10);
    expect(invoke).toHaveBeenCalledWith(IPCChannels.Dashboard.GetStats);
  });

  test('maps recent customers and upcoming tasks', async () => {
    invoke
      .mockResolvedValueOnce([{ id: '1', name: 'Alice', email: 'a@example.com', jtl_dateCreated: '2026-03-01' }])
      .mockResolvedValueOnce([{ id: 1, title: 'Call', priority: 'High', customer_id: 2, due_date: '2026-03-14', customer_name: 'Alice' }]);

    const recent = await dashboardService.getRecentCustomers(5);
    const tasks = await dashboardService.getUpcomingTasks(5);
    expect(recent[0].dateAdded).toBe('2026-03-01');
    expect(tasks[0].dueDate).toBe('2026-03-14');
  });

  test('returns defaults on stats failure', async () => {
    invoke.mockRejectedValueOnce(new Error('boom'));
    const stats = await dashboardService.getDashboardStats();
    expect(stats.totalCustomers).toBe(0);
  });
});
