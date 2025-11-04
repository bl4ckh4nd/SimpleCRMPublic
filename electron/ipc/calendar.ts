import { IPCChannels } from '@shared/ipc/channels';
import { registerIpcHandler } from './register';
import {
  getAllCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../sqlite-service';

interface CalendarHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}

type Disposer = () => void;

export function registerCalendarHandlers(options: CalendarHandlersOptions) {
  const { logger } = options;
  const disposers: Disposer[] = [];

  disposers.push(
    registerIpcHandler(IPCChannels.Calendar.GetCalendarEvents, async (_event, params: any = {}) => {
      try {
        const { startDate, endDate } = params ?? {};
        return getAllCalendarEvents(startDate, endDate);
      } catch (error) {
        logger.error('IPC Error getting calendar events:', error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Calendar.AddCalendarEvent, async (_event, eventData: any) => {
      try {
        return createCalendarEvent(eventData);
      } catch (error) {
        logger.error('IPC Error adding calendar event:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Calendar.UpdateCalendarEvent, async (_event, payload: any) => {
      try {
        if (!payload) {
          throw new Error('No payload provided for calendar update.');
        }

        const { id, eventData, ...rest } = payload;
        const eventIdRaw = id ?? (rest?.id ?? undefined);
        const eventId =
          typeof eventIdRaw === 'number'
            ? eventIdRaw
            : typeof eventIdRaw === 'string'
              ? Number(eventIdRaw)
              : undefined;
        const normalizedEventData = eventData ?? (eventId !== undefined ? rest : undefined);

        if (typeof eventId !== 'number') {
          throw new Error('Missing calendar event ID for update.');
        }

        if (!normalizedEventData || Object.keys(normalizedEventData).length === 0) {
          throw new Error('Missing calendar event data for update.');
        }

        const sanitizedEventData = { ...normalizedEventData } as Record<string, any>;
        if ('id' in sanitizedEventData) {
          delete sanitizedEventData.id;
        }

        return updateCalendarEvent(eventId, sanitizedEventData);
      } catch (error) {
        logger.error('IPC Error updating calendar event:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Calendar.DeleteCalendarEvent, async (_event, eventId: number) => {
      try {
        return deleteCalendarEvent(eventId);
      } catch (error) {
        logger.error('IPC Error deleting calendar event:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
