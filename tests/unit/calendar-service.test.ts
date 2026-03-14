import { IPCChannels } from '@shared/ipc/channels';
import { calendarService, TASK_EVENT_COMPLETED_COLOR, TASK_EVENT_DEFAULT_COLOR } from '@/services/data/calendarService';

describe('calendarService', () => {
  const invoke = jest.fn();

  beforeEach(() => {
    invoke.mockReset();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { invoke },
    });
  });

  test('adds task event with sqlite-compatible payload', async () => {
    invoke.mockResolvedValueOnce({ success: true, id: 42 });
    const result = await calendarService.addTaskEvent({
      title: 'Call customer',
      description: 'Follow-up',
      dueDate: '2026-03-12',
      customerName: 'Muster GmbH',
    });

    expect(result).toEqual({ success: true, id: 42 });
    expect(invoke).toHaveBeenCalledWith(
      IPCChannels.Calendar.AddCalendarEvent,
      expect.objectContaining({
        title: 'Call customer',
        all_day: true,
        color_code: TASK_EVENT_DEFAULT_COLOR,
        event_type: 'task',
      })
    );
  });

  test('throws for invalid due date', async () => {
    await expect(
      calendarService.addTaskEvent({
        title: 'Invalid',
        dueDate: 'invalid',
      })
    ).rejects.toThrow('Ungültiges Fälligkeitsdatum');
  });

  test('updates task event with completed color', async () => {
    invoke.mockResolvedValueOnce({ success: true });
    await calendarService.updateTaskEvent(5, {
      title: 'Done task',
      dueDate: '2026-03-13',
      completed: true,
    });

    expect(invoke).toHaveBeenCalledWith(
      IPCChannels.Calendar.UpdateCalendarEvent,
      expect.objectContaining({
        id: 5,
        eventData: expect.objectContaining({
          color_code: TASK_EVENT_COMPLETED_COLOR,
          all_day: 1,
        }),
      })
    );
  });

  test('no-op when no fields are provided for update', async () => {
    await calendarService.updateTaskEvent(8, {});
    expect(invoke).not.toHaveBeenCalled();
  });

  test('deletes task event', async () => {
    invoke.mockResolvedValueOnce({ success: true });
    await calendarService.deleteTaskEvent(13);
    expect(invoke).toHaveBeenCalledWith(IPCChannels.Calendar.DeleteCalendarEvent, 13);
  });
});
