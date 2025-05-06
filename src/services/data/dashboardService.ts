import type { Customer, Task } from './types';

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
      if (!window.electronAPI) {
        throw new Error("Electron API not available for 'dashboard:get-stats'");
      }
      const stats = await window.electronAPI.invoke('dashboard:get-stats');
      // Add any necessary mapping or default values here
      return stats as DashboardStats;
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
      if (!window.electronAPI) {
        throw new Error("Electron API not available for 'dashboard:get-recent-customers'");
      }
      const rawCustomers = await window.electronAPI.invoke('dashboard:get-recent-customers', limit) as any[];
      // Add any necessary mapping here
      const customers: RecentCustomer[] = rawCustomers.map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        dateAdded: c.dateAdded || c.jtl_dateCreated, // Map from jtl_dateCreated if dateAdded is not present
      }));
      return customers;
    } catch (error) {
      console.error("Error invoking 'dashboard:get-recent-customers':", error);
      return [];
    }
  },

  async getUpcomingTasks(limit: number = 5): Promise<UpcomingTask[]> {
    try {
      if (!window.electronAPI) {
        throw new Error("Electron API not available for 'dashboard:get-upcoming-tasks'");
      }
      const rawTasks = await window.electronAPI.invoke('dashboard:get-upcoming-tasks', limit) as any[];
      // Add any necessary mapping here, e.g., fetching customer names
      const tasks: UpcomingTask[] = rawTasks.map((t: any) => ({
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