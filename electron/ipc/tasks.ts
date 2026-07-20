import { IPC } from '../../shared/ipc/channels';
import {
  createScheduledTask,
  deleteScheduledTask,
  getScheduledTask,
  listTasks,
  removeTaskSchedule,
  setTaskCompletion,
  setTaskSchedule,
  updateScheduledTask,
} from '../task-scheduling';
import { registerIpcHandler } from './register';

interface TaskHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}

export function registerTaskHandlers({ logger }: TaskHandlersOptions) {
  const disposers = [
    registerIpcHandler(IPC.Tasks.GetAll, async (_event, params = {}) => {
      const { limit, offset, filter } = params;
      return listTasks(limit, offset, filter);
    }, { logger }),
    registerIpcHandler(IPC.Tasks.GetById, async (_event, taskId) => getScheduledTask(taskId), { logger }),
    registerIpcHandler(IPC.Tasks.Create, async (_event, { task, schedule }) => createScheduledTask(task, schedule), { logger }),
    registerIpcHandler(IPC.Tasks.Update, async (_event, { id, taskData }) => updateScheduledTask(id, taskData), { logger }),
    registerIpcHandler(IPC.Tasks.ToggleCompletion, async (_event, { taskId, completed }) => setTaskCompletion(taskId, completed), { logger }),
    registerIpcHandler(IPC.Tasks.SetSchedule, async (_event, { taskId, ...schedule }) => setTaskSchedule(taskId, schedule), { logger }),
    registerIpcHandler(IPC.Tasks.RemoveSchedule, async (_event, { taskId }) => removeTaskSchedule(taskId), { logger }),
    registerIpcHandler(IPC.Tasks.Delete, async (_event, taskId) => deleteScheduledTask(taskId), { logger }),
  ];

  return () => disposers.forEach((dispose) => dispose());
}
