import { Task } from './types';
import { IPCChannels } from '@shared/ipc/channels';
import { calendarService } from './calendarService';

interface FilterOptions {
  completed?: boolean;
  priority?: string;
  query?: string;
}

/**
 * Task Service - Handles communication with the SQLite database through Electron IPC
 */
export const taskService = {
  /**
   * Fetch all tasks with optional pagination and filtering
   */
  async getAllTasks(
    limit: number = 100,
    offset: number = 0,
    filter: FilterOptions = {}
  ): Promise<Task[]> {
    try {
      const tasks = await window.electronAPI.invoke<typeof IPCChannels.Tasks.GetAll>(
        IPCChannels.Tasks.GetAll,
        { limit, offset, filter }
      ) as any[];
      return tasks.map((task: any) => ({
        ...task,
        // Convert SQLite INTEGER (0/1) to boolean
        completed: Boolean(task.completed),
        calendar_event_id: task.calendar_event_id === null || task.calendar_event_id === undefined
          ? null
          : Number(task.calendar_event_id),
      }));
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  },

  /**
   * Get a single task by ID
   */
  async getTaskById(taskId: number | string): Promise<Task | null> {
    try {
      const task = await window.electronAPI.invoke<typeof IPCChannels.Tasks.GetById>(
        IPCChannels.Tasks.GetById,
        Number(taskId)
      ) as any;
      if (!task) return null;
      
      return {
        ...task,
        completed: Boolean(task.completed),
        calendar_event_id: task.calendar_event_id === null || task.calendar_event_id === undefined
          ? null
          : Number(task.calendar_event_id),
      } as Task;
    } catch (error) {
      console.error(`Failed to fetch task with ID ${taskId}:`, error);
      return null;
    }
  },

  /**
   * Create a new task
   */
  async createTask(taskData: Omit<Task, 'id'>): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      return await window.electronAPI.invoke<typeof IPCChannels.Tasks.Create>(
        IPCChannels.Tasks.Create,
        taskData
      );
    } catch (error) {
      console.error('Failed to create task:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Update an existing task
   */
  async updateTask(
    taskId: number | string,
    taskData: Partial<Omit<Task, 'id'>>,
    options: { syncCalendar?: boolean } = {}
  ): Promise<{ success: boolean; error?: string }> {
    const { syncCalendar = true } = options;

    try {
      const result = await window.electronAPI.invoke<typeof IPCChannels.Tasks.Update>(
        IPCChannels.Tasks.Update,
        {
          id: Number(taskId),
          taskData
        }
      );

      if (!result.success || !syncCalendar) {
        return result;
      }

      try {
        const updatedTask = await taskService.getTaskById(taskId);
        if (!updatedTask) {
          return result;
        }

        const eventId = updatedTask.calendar_event_id;

        if (eventId && updatedTask.due_date) {
          try {
            await calendarService.updateTaskEvent(eventId, {
              title: updatedTask.title,
              description: updatedTask.description || undefined,
              dueDate: updatedTask.due_date,
              customerName: updatedTask.customer_name,
              completed: Boolean(updatedTask.completed),
            });
          } catch (error) {
            console.error('Failed to update linked calendar event:', error);
            const message = error instanceof Error ? error.message : String(error);
            if (/not found|no such|existiert nicht/i.test(message)) {
              await taskService.updateTask(taskId, { calendar_event_id: null }, { syncCalendar: false });
            }
          }
        }

        if (eventId && !updatedTask.due_date) {
          try {
            await calendarService.deleteTaskEvent(eventId);
          } catch (error) {
            console.error('Failed to remove calendar event after due-date removal:', error);
          }

          await taskService.updateTask(taskId, { calendar_event_id: null }, { syncCalendar: false });
        }
      } catch (syncError) {
        console.error('Failed to synchronize calendar after task update:', syncError);
      }

      return result;
    } catch (error) {
      console.error(`Failed to update task ${taskId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Toggle a task's completion status
   */
  async toggleTaskCompletion(
    taskId: number | string,
    completed: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await window.electronAPI.invoke<typeof IPCChannels.Tasks.ToggleCompletion>(
        IPCChannels.Tasks.ToggleCompletion,
        {
          taskId: Number(taskId),
          completed
        }
      );
    } catch (error) {
      console.error(`Failed to toggle completion for task ${taskId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Delete a task
   */
  async deleteTask(taskId: number | string): Promise<{ success: boolean; error?: string }> {
    try {
      const existingTask = await taskService.getTaskById(taskId);

      if (existingTask?.calendar_event_id) {
        try {
          await calendarService.deleteTaskEvent(existingTask.calendar_event_id);
        } catch (error) {
          console.error('Failed to delete linked calendar event:', error);
        }
      }

      return await window.electronAPI.invoke<typeof IPCChannels.Tasks.Delete>(
        IPCChannels.Tasks.Delete,
        Number(taskId)
      );
    } catch (error) {
      console.error(`Failed to delete task ${taskId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Get tasks for a specific customer
   */
  async getTasksForCustomer(customerId: number | string): Promise<Task[]> {
    try {
      const tasks = await window.electronAPI.invoke<typeof IPCChannels.Db.GetTasksForCustomer>(
        IPCChannels.Db.GetTasksForCustomer,
        Number(customerId)
      ) as any[];
      return tasks.map((task: any) => ({
        ...task,
        completed: Boolean(task.completed),
        calendar_event_id: task.calendar_event_id === null || task.calendar_event_id === undefined
          ? null
          : Number(task.calendar_event_id),
      }));
    } catch (error) {
      console.error(`Failed to fetch tasks for customer ${customerId}:`, error);
      return [];
    }
  }
}; 
