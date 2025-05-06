import { Task } from './types';

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
      const tasks = await window.electronAPI.invoke('tasks:get-all', { limit, offset, filter }) as any[];
      return tasks.map((task: any) => ({
        ...task,
        // Convert SQLite INTEGER (0/1) to boolean
        completed: Boolean(task.completed)
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
      const task = await window.electronAPI.invoke('tasks:get-by-id', Number(taskId)) as any;
      if (!task) return null;
      
      return {
        ...task,
        completed: Boolean(task.completed)
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
      return await window.electronAPI.invoke('tasks:create', taskData);
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
    taskData: Partial<Omit<Task, 'id'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await window.electronAPI.invoke('tasks:update', {
        id: Number(taskId),
        taskData
      });
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
      return await window.electronAPI.invoke('tasks:toggle-completion', {
        taskId: Number(taskId),
        completed
      });
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
      return await window.electronAPI.invoke('tasks:delete', Number(taskId));
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
      const tasks = await window.electronAPI.invoke('db:get-tasks-for-customer', Number(customerId)) as any[];
      return tasks.map((task: any) => ({
        ...task,
        completed: Boolean(task.completed)
      }));
    } catch (error) {
      console.error(`Failed to fetch tasks for customer ${customerId}:`, error);
      return [];
    }
  }
}; 