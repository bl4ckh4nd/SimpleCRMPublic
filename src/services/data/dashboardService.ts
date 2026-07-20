import type { Customer, Task } from './types';
import { IPC } from '@shared/ipc/channels';
import { invoke } from '@/lib/ipc';

export interface DashboardStats {
  totalCustomers: number;
  newCustomersLastMonth: number;
  activeDealsCount: number;
  activeDealsValue: number;
  pendingTasksCount: number;
  dueTodayTasksCount: number;
  conversionRate: number; // This might be harder to calculate without deal status history
}

export interface RecentCustomer extends Pick<Customer, 'id' | 'name' | 'email'> {
  dateAdded: string; // Or Date object
}

export interface UpcomingTask extends Pick<Task, 'id' | 'title' | 'priority' | 'customer_id'> {
  dueDate: string; // Or Date object
  customerName?: string; // To be joined from customer data
}

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      return await invoke(IPC.Dashboard.GetStats) as unknown as DashboardStats;
    } catch (error) {
      console.error("Error invoking 'dashboard:get-stats':", error);
      // Return default/empty stats on error
      return {
        totalCustomers: 0,
        newCustomersLastMonth: 0,
        activeDealsCount: 0,
        activeDealsValue: 0,
        pendingTasksCount: 0,
        dueTodayTasksCount: 0,
        conversionRate: 0,
      };
    }
  },

  async getRecentCustomers(limit: number = 5): Promise<RecentCustomer[]> {
    try {
      const rawCustomers = await invoke(IPC.Dashboard.GetRecentCustomers, limit) as unknown as Array<Customer & { jtl_dateCreated?: string }>;
      const customers: RecentCustomer[] = rawCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        dateAdded: c.dateAdded || c.jtl_dateCreated || '',
      }));
      return customers;
    } catch (error) {
      console.error("Error invoking 'dashboard:get-recent-customers':", error);
      return [];
    }
  },

  async getUpcomingTasks(limit: number = 5): Promise<UpcomingTask[]> {
    try {
      const rawTasks = await invoke(IPC.Dashboard.GetUpcomingTasks, limit) as unknown as Task[];
      const tasks: UpcomingTask[] = rawTasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        customer_id: t.customer_id,
        dueDate: t.due_date, // Map from due_date
        customerName: t.customer_name, // Assuming customer_name might be provided
      }));
      return tasks;
    } catch (error) {
      console.error("Error invoking 'dashboard:get-upcoming-tasks':", error);
      return [];
    }
  },
};
