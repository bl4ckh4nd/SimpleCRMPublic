import { IPC } from '../../shared/ipc/channels';
import { registerIpcHandler } from './register';
import { getDashboardStats, getRecentCustomers, getUpcomingTasks } from '../sqlite-service';

interface DashboardHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}

type Disposer = () => void;

export function registerDashboardHandlers(options: DashboardHandlersOptions) {
  const { logger } = options;
  const disposers: Disposer[] = [];

  disposers.push(registerIpcHandler(IPC.Dashboard.GetStats, async () => {
    try {
      return getDashboardStats();
    } catch (error) {
      logger.error('IPC Error getting dashboard stats:', error);
      throw error;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPC.Dashboard.GetRecentCustomers, async (_event, limit) => {
    try {
      return getRecentCustomers(limit);
    } catch (error) {
      logger.error('IPC Error getting recent customers:', error);
      throw error;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPC.Dashboard.GetUpcomingTasks, async (_event, limit) => {
    try {
      return getUpcomingTasks(limit);
    } catch (error) {
      logger.error('IPC Error getting upcoming tasks:', error);
      throw error;
    }
  }, { logger }));

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
