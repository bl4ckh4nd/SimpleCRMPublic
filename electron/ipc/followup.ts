import { IPCChannels } from '../../shared/ipc/channels';
import { registerIpcHandler } from './register';
import {
  getFollowUpItems,
  getFollowUpQueueCounts,
  snoozeTask,
  createActivityLog,
  getTimeline,
  getSavedViews,
  createSavedView,
  deleteSavedView,
} from '../sqlite-service';

interface FollowUpHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}

type Disposer = () => void;

export function registerFollowUpHandlers(options: FollowUpHandlersOptions) {
  const { logger } = options;
  const disposers: Disposer[] = [];

  disposers.push(
    registerIpcHandler(IPCChannels.FollowUp.GetItems, async (_event, params: any = {}) => {
      try {
        const { queue, filters, limit, offset } = params ?? {};
        return getFollowUpItems(queue, filters, limit, offset);
      } catch (error) {
        logger.error('IPC Error getting follow-up items:', error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.FollowUp.GetQueueCounts, async () => {
      try {
        return getFollowUpQueueCounts();
      } catch (error) {
        logger.error('IPC Error getting queue counts:', error);
        return { heute: 0, ueberfaellig: 0, dieseWoche: 0, stagnierend: 0, highValueRisk: 0 };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.FollowUp.SnoozeTask, async (_event, payload: any) => {
      try {
        const { taskId, snoozedUntil } = payload ?? {};
        return snoozeTask(taskId, snoozedUntil);
      } catch (error) {
        logger.error('IPC Error snoozing task:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.FollowUp.LogActivity, async (_event, data: any) => {
      try {
        return createActivityLog(data);
      } catch (error) {
        logger.error('IPC Error logging activity:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.FollowUp.GetTimeline, async (_event, params: any = {}) => {
      try {
        const { customerId, filter, limit, offset } = params ?? {};
        return getTimeline(customerId, filter, limit, offset);
      } catch (error) {
        logger.error('IPC Error getting timeline:', error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.FollowUp.GetSavedViews, async () => {
      try {
        return getSavedViews();
      } catch (error) {
        logger.error('IPC Error getting saved views:', error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.FollowUp.CreateSavedView, async (_event, data: any) => {
      try {
        return createSavedView(data);
      } catch (error) {
        logger.error('IPC Error creating saved view:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.FollowUp.DeleteSavedView, async (_event, id: number) => {
      try {
        return deleteSavedView(id);
      } catch (error) {
        logger.error(`IPC Error deleting saved view ${id}:`, error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
