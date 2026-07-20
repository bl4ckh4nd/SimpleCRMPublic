import { IPCChannels } from '@shared/ipc/channels';
import { taskService } from '@/services/data/taskService';

describe('taskService', () => {
  const invoke = jest.fn();

  beforeEach(() => {
    invoke.mockReset();
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke } });
  });

  test('maps database booleans and the derived calendar event id', async () => {
    invoke.mockResolvedValueOnce([
      { id: 1, title: 'A', completed: 1, calendar_event_id: '10' },
      { id: 2, title: 'B', completed: 0, calendar_event_id: null },
    ]);
    const tasks = await taskService.getAllTasks();
    expect(tasks.map(({ completed, calendar_event_id }) => ({ completed, calendar_event_id }))).toEqual([
      { completed: true, calendar_event_id: 10 },
      { completed: false, calendar_event_id: null },
    ]);
  });

  test('creates a task and optional schedule in one invoke', async () => {
    invoke.mockResolvedValueOnce({ success: true, id: 3, eventId: 9 });
    const task = { customer_id: 1, title: 'Call', priority: 'High', completed: false } as unknown;
    const schedule = { startDate: '2026-07-16', endDate: '2026-07-17', allDay: true };
    await taskService.createTask(task, schedule);
    expect(invoke).toHaveBeenCalledWith(IPCChannels.Tasks.Create, { task, schedule });
  });

  test('deletes through the task owner without renderer compensation', async () => {
    invoke.mockResolvedValueOnce({ success: true });
    expect((await taskService.deleteTask(3)).success).toBe(true);
    expect(invoke).toHaveBeenCalledWith(IPCChannels.Tasks.Delete, 3);
  });
});
