import { IPC } from '@shared/ipc/channels';
import { invoke } from '@/lib/ipc';
import type { Task } from './types';

interface FilterOptions {
  completed?: boolean;
  priority?: string;
  query?: string;
}

type Schedule = { startDate: string; endDate: string; allDay: boolean };
type TaskMutation = { success: boolean; id?: number; eventId?: number; error?: string };

const normalizeTask = (task: Record<string, unknown>): Task => ({
  ...task,
  completed: Boolean(task.completed),
  calendar_event_id: task.calendar_event_id == null ? null : Number(task.calendar_event_id),
} as Task);

const failed = (error: unknown): TaskMutation => ({
  success: false,
  error: error instanceof Error ? error.message : String(error),
});

export const taskService = {
  async getAllTasks(limit = 100, offset = 0, filter: FilterOptions = {}): Promise<Task[]> {
    try {
      return (await invoke(IPC.Tasks.GetAll, { limit, offset, filter })).map(normalizeTask);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  },

  async getTaskById(taskId: number | string): Promise<Task | null> {
    try {
      const task = await invoke(IPC.Tasks.GetById, Number(taskId));
      return task ? normalizeTask(task) : null;
    } catch (error) {
      console.error(`Failed to fetch task ${taskId}:`, error);
      return null;
    }
  },

  async createTask(task: Omit<Task, 'id'>, schedule?: Schedule): Promise<TaskMutation> {
    try {
      return await invoke(IPC.Tasks.Create, { task, schedule }) as TaskMutation;
    } catch (error) {
      return failed(error);
    }
  },

  async updateTask(taskId: number | string, taskData: Partial<Omit<Task, 'id'>>): Promise<TaskMutation> {
    try {
      return await invoke(IPC.Tasks.Update, { id: Number(taskId), taskData }) as TaskMutation;
    } catch (error) {
      return failed(error);
    }
  },

  async toggleTaskCompletion(taskId: number | string, completed: boolean): Promise<TaskMutation> {
    try {
      return await invoke(IPC.Tasks.ToggleCompletion, { taskId: Number(taskId), completed }) as TaskMutation;
    } catch (error) {
      return failed(error);
    }
  },

  async setSchedule(taskId: number | string, schedule: Schedule): Promise<TaskMutation> {
    try {
      return await invoke(IPC.Tasks.SetSchedule, { taskId: Number(taskId), ...schedule }) as TaskMutation;
    } catch (error) {
      return failed(error);
    }
  },

  async removeSchedule(taskId: number | string): Promise<TaskMutation> {
    try {
      return await invoke(IPC.Tasks.RemoveSchedule, { taskId: Number(taskId) }) as TaskMutation;
    } catch (error) {
      return failed(error);
    }
  },

  async deleteTask(taskId: number | string): Promise<TaskMutation> {
    try {
      return await invoke(IPC.Tasks.Delete, Number(taskId)) as TaskMutation;
    } catch (error) {
      return failed(error);
    }
  },

  async getTasksForCustomer(customerId: number | string): Promise<Task[]> {
    try {
      return (await invoke(IPC.Db.GetTasksForCustomer, Number(customerId))).map(normalizeTask);
    } catch (error) {
      console.error(`Failed to fetch tasks for customer ${customerId}:`, error);
      return [];
    }
  },
};
