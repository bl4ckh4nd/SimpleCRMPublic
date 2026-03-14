import { FollowUpItem, ActivityLogEntry, QueueCounts, SavedView } from './types';
import { IPCChannels } from '@shared/ipc/channels';

export const followUpService = {
  async getItems(
    queue: string,
    filters: { query?: string; priority?: string } = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<FollowUpItem[]> {
    try {
      return await window.electronAPI.invoke(
        IPCChannels.FollowUp.GetItems,
        { queue, filters, limit, offset }
      ) as FollowUpItem[];
    } catch (error) {
      console.error('Failed to fetch follow-up items:', error);
      return [];
    }
  },

  async getQueueCounts(): Promise<QueueCounts> {
    try {
      return await window.electronAPI.invoke(
        IPCChannels.FollowUp.GetQueueCounts
      ) as QueueCounts;
    } catch (error) {
      console.error('Failed to fetch queue counts:', error);
      return { heute: 0, ueberfaellig: 0, dieseWoche: 0, stagnierend: 0, highValueRisk: 0 };
    }
  },

  async snoozeTask(taskId: number, snoozedUntil: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await window.electronAPI.invoke(
        IPCChannels.FollowUp.SnoozeTask,
        { taskId, snoozedUntil }
      ) as { success: boolean; error?: string };
    } catch (error) {
      console.error(`Failed to snooze task ${taskId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async logActivity(data: {
    customer_id?: number;
    deal_id?: number;
    task_id?: number;
    activity_type: string;
    title?: string;
    description?: string;
  }): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      return await window.electronAPI.invoke(
        IPCChannels.FollowUp.LogActivity,
        data
      ) as { success: boolean; id?: number; error?: string };
    } catch (error) {
      console.error('Failed to log activity:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getTimeline(
    customerId: number,
    filter?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ActivityLogEntry[]> {
    try {
      return await window.electronAPI.invoke(
        IPCChannels.FollowUp.GetTimeline,
        { customerId, filter, limit, offset }
      ) as ActivityLogEntry[];
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
      return [];
    }
  },

  async getSavedViews(): Promise<SavedView[]> {
    try {
      return await window.electronAPI.invoke(
        IPCChannels.FollowUp.GetSavedViews
      ) as SavedView[];
    } catch (error) {
      console.error('Failed to fetch saved views:', error);
      return [];
    }
  },

  async createSavedView(data: { name: string; filters: string }): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      return await window.electronAPI.invoke(
        IPCChannels.FollowUp.CreateSavedView,
        data
      ) as { success: boolean; id?: number; error?: string };
    } catch (error) {
      console.error('Failed to create saved view:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async deleteSavedView(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      return await window.electronAPI.invoke(
        IPCChannels.FollowUp.DeleteSavedView,
        id
      ) as { success: boolean; error?: string };
    } catch (error) {
      console.error(`Failed to delete saved view ${id}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};
