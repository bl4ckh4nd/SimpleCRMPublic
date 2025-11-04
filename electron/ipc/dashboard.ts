import { IPCChannels } from '@shared/ipc/channels';
import { registerIpcHandler } from './register';
import { getDashboardStats, getRecentCustomers, getUpcomingTasks } from '../sqlite-service';

interface DashboardHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}

type Disposer = () => void;

export function registerDashboardHandlers(options: DashboardHandlersOptions) {
  const { logger } = options;
  const disposers: Disposer[] = [];

  disposers.push(registerIpcHandler(IPCChannels.Dashboard.GetStats, async () => {
    try {
      return getDashboardStats();
    } catch (error) {
      logger.error('IPC Error getting dashboard stats:', error);
      throw error;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.Dashboard.GetRecentCustomers, async () => {
    try {
      return getRecentCustomers();
    } catch (error) {
      logger.error('IPC Error getting recent customers:', error);
      throw error;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.Dashboard.GetUpcomingTasks, async () => {
    try {
      return getUpcomingTasks();
    } catch (error) {
      logger.error('IPC Error getting upcoming tasks:', error);
      throw error;
    }
  }, { logger }));

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
