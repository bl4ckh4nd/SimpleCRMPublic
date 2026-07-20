import { IPC } from '../../shared/ipc/channels';
import { createCalendarEvent, getAllCalendarEvents } from '../sqlite-service';
import {
  deleteEventWithTask,
  saveCalendarEntry,
  setTaskSchedule,
  updateEventWithTask,
} from '../task-scheduling';
import { registerIpcHandler } from './register';

interface CalendarHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}

export function registerCalendarHandlers({ logger }: CalendarHandlersOptions) {
  const disposers = [
    registerIpcHandler(IPC.Calendar.GetCalendarEvents, async (_event, params = {}) =>
      getAllCalendarEvents(params.startDate, params.endDate), { logger }),
    registerIpcHandler(IPC.Calendar.AddCalendarEvent, async (_event, eventData) => {
      const taskId = typeof eventData.task_id === 'number' ? eventData.task_id : null;
      if (taskId) {
        return setTaskSchedule(taskId, {
          startDate: String(eventData.start_date),
          endDate: String(eventData.end_date),
          allDay: Boolean(eventData.all_day),
        });
      }
      try {
        const result = createCalendarEvent(eventData);
        return { success: true, id: Number(result.lastInsertRowid) };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    }, { logger }),
    registerIpcHandler(IPC.Calendar.UpdateCalendarEvent, async (_event, { id, eventData }) =>
      updateEventWithTask(id, eventData), { logger }),
    registerIpcHandler(IPC.Calendar.DeleteCalendarEvent, async (_event, eventId) =>
      deleteEventWithTask(eventId), { logger }),
    registerIpcHandler(IPC.Calendar.SaveEntry, async (_event, input) =>
      saveCalendarEntry(input), { logger }),
  ];

  return () => disposers.forEach((dispose) => dispose());
}
