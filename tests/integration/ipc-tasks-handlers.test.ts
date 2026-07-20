import { IPC } from '../../shared/ipc/channels';

const handlers = new Map<string, (...args: unknown[]) => unknown>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((endpoint: { channel: string }, handler: (...args: unknown[]) => unknown) => {
    handlers.set(endpoint.channel, handler);
    return () => undefined;
  }),
}));

const scheduling = {
  listTasks: jest.fn(),
  getScheduledTask: jest.fn(),
  createScheduledTask: jest.fn(),
  updateScheduledTask: jest.fn(),
  setTaskCompletion: jest.fn(),
  setTaskSchedule: jest.fn(),
  removeTaskSchedule: jest.fn(),
  deleteScheduledTask: jest.fn(),
};

jest.mock('../../electron/task-scheduling', () => scheduling);

import { registerTaskHandlers } from '../../electron/ipc/tasks';

describe('registerTaskHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(scheduling).forEach((fn) => fn.mockReset());
    registerTaskHandlers({ logger: console });
  });

  test('registers the complete task scheduling contract', () => {
    Object.values(IPC.Tasks).forEach((endpoint) => expect(handlers.has(endpoint.channel)).toBe(true));
  });

  test('passes task creation and schedule to the atomic owner', async () => {
    scheduling.createScheduledTask.mockReturnValue({ success: true, id: 3, eventId: 8 });
    const payload = {
      task: { customer_id: 1, title: 'Call', priority: 'High' },
      schedule: { startDate: '2026-07-16', endDate: '2026-07-17', allDay: true },
    };
    await handlers.get(IPC.Tasks.Create.channel)!({}, payload);
    expect(scheduling.createScheduledTask).toHaveBeenCalledWith(payload.task, payload.schedule);
  });

  test('routes scheduling changes through the owner', async () => {
    await handlers.get(IPC.Tasks.SetSchedule.channel)!({}, {
      taskId: 4,
      startDate: '2026-07-16',
      endDate: '2026-07-17',
      allDay: true,
    });
    expect(scheduling.setTaskSchedule).toHaveBeenCalledWith(4, {
      startDate: '2026-07-16',
      endDate: '2026-07-17',
      allDay: true,
    });

    await handlers.get(IPC.Tasks.RemoveSchedule.channel)!({}, { taskId: 4 });
    expect(scheduling.removeTaskSchedule).toHaveBeenCalledWith(4);
  });
});
