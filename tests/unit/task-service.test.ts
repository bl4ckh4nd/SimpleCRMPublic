import { IPCChannels } from '@shared/ipc/channels';
import { taskService } from '@/services/data/taskService';
import { calendarService } from '@/services/data/calendarService';

describe('taskService', () => {
  const invoke = jest.fn();

  beforeEach(() => {
    invoke.mockReset();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { invoke },
    });
    jest.spyOn(calendarService, 'updateTaskEvent').mockResolvedValue(undefined);
    jest.spyOn(calendarService, 'deleteTaskEvent').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('maps all tasks and boolean fields correctly', async () => {
    invoke.mockResolvedValueOnce([
      { id: 1, title: 'A', completed: 1, calendar_event_id: '10' },
      { id: 2, title: 'B', completed: 0, calendar_event_id: null },
    ]);

    const tasks = await taskService.getAllTasks();
    expect(tasks[0].completed).toBe(true);
    expect(tasks[0].calendar_event_id).toBe(10);
    expect(tasks[1].completed).toBe(false);
    expect(tasks[1].calendar_event_id).toBeNull();
  });

  test('updates task and syncs linked calendar event', async () => {
    invoke
      .mockResolvedValueOnce({ success: true }) // tasks:update
      .mockResolvedValueOnce({
        id: 9,
        title: 'Updated title',
        description: 'desc',
        due_date: '2026-03-10',
        completed: 1,
        customer_name: 'ACME',
        calendar_event_id: 11,
      }); // tasks:get-by-id

    const result = await taskService.updateTask(9, { title: 'Updated title' });
    expect(result.success).toBe(true);
    expect(invoke).toHaveBeenNthCalledWith(1, IPCChannels.Tasks.Update, {
      id: 9,
      taskData: { title: 'Updated title' },
    });
    expect(calendarService.updateTaskEvent).toHaveBeenCalledWith(
      11,
      expect.objectContaining({
        title: 'Updated title',
        dueDate: '2026-03-10',
        completed: true,
      })
    );
  });

  test('does not sync calendar when explicitly disabled', async () => {
    invoke.mockResolvedValueOnce({ success: true });
    await taskService.updateTask(7, { title: 'No sync' }, { syncCalendar: false });
    expect(calendarService.updateTaskEvent).not.toHaveBeenCalled();
  });

  test('deletes linked calendar event before deleting task', async () => {
    invoke
      .mockResolvedValueOnce({
        id: 3,
        title: 'x',
        completed: 0,
        calendar_event_id: 99,
      }) // getTaskById
      .mockResolvedValueOnce({ success: true }); // delete

    const result = await taskService.deleteTask(3);
    expect(result.success).toBe(true);
    expect(calendarService.deleteTaskEvent).toHaveBeenCalledWith(99);
    expect(invoke).toHaveBeenLastCalledWith(IPCChannels.Tasks.Delete, 3);
  });
});
