import { IPCChannels } from '@shared/ipc/channels';

const mockInvoke = jest.fn();

// Set up window.electronAPI once; tests reset the mock invoke before each run
(global.window as any).electronAPI = { invoke: mockInvoke };

beforeEach(() => {
  mockInvoke.mockReset();
});

import { followUpService } from '@/services/data/followUpService';

describe('followUpService', () => {
  test('getItems invokes correct channel and returns items', async () => {
    const items = [{ id: 1, customer_name: 'Acme' }];
    mockInvoke.mockResolvedValue(items);
    const result = await followUpService.getItems('heute', { query: 'test' }, 50, 0);
    expect(mockInvoke).toHaveBeenCalledWith(
      IPCChannels.FollowUp.GetItems,
      { queue: 'heute', filters: { query: 'test' }, limit: 50, offset: 0 }
    );
    expect(result).toEqual(items);
  });

  test('getItems returns [] on error', async () => {
    mockInvoke.mockRejectedValue(new Error('network fail'));
    const result = await followUpService.getItems('heute');
    expect(result).toEqual([]);
  });

  test('getQueueCounts invokes correct channel and returns counts', async () => {
    const counts = { heute: 2, ueberfaellig: 0, dieseWoche: 3, stagnierend: 1, highValueRisk: 0 };
    mockInvoke.mockResolvedValue(counts);
    const result = await followUpService.getQueueCounts();
    expect(mockInvoke).toHaveBeenCalledWith(IPCChannels.FollowUp.GetQueueCounts);
    expect(result).toEqual(counts);
  });

  test('getQueueCounts returns zero counts on error', async () => {
    mockInvoke.mockRejectedValue(new Error('fail'));
    const result = await followUpService.getQueueCounts();
    expect(result).toEqual({ heute: 0, ueberfaellig: 0, dieseWoche: 0, stagnierend: 0, highValueRisk: 0 });
  });

  test('snoozeTask invokes correct channel with payload', async () => {
    mockInvoke.mockResolvedValue({ success: true });
    const result = await followUpService.snoozeTask(5, '2026-03-20');
    expect(mockInvoke).toHaveBeenCalledWith(
      IPCChannels.FollowUp.SnoozeTask,
      { taskId: 5, snoozedUntil: '2026-03-20' }
    );
    expect(result).toEqual({ success: true });
  });

  test('snoozeTask returns failure on error', async () => {
    mockInvoke.mockRejectedValue(new Error('timeout'));
    const result = await followUpService.snoozeTask(1, '2026-03-20');
    expect(result).toEqual({ success: false, error: 'timeout' });
  });

  test('logActivity invokes correct channel with data', async () => {
    mockInvoke.mockResolvedValue({ success: true, id: 42 });
    const data = { customer_id: 1, activity_type: 'call', title: 'Called' };
    const result = await followUpService.logActivity(data);
    expect(mockInvoke).toHaveBeenCalledWith(IPCChannels.FollowUp.LogActivity, data);
    expect(result).toEqual({ success: true, id: 42 });
  });

  test('logActivity returns failure on error', async () => {
    mockInvoke.mockRejectedValue(new Error('write fail'));
    const result = await followUpService.logActivity({ activity_type: 'note' });
    expect(result).toEqual({ success: false, error: 'write fail' });
  });

  test('getTimeline invokes correct channel and returns entries', async () => {
    const entries = [{ id: 1, activity_type: 'call' }];
    mockInvoke.mockResolvedValue(entries);
    const result = await followUpService.getTimeline(7, 'call', 20, 0);
    expect(mockInvoke).toHaveBeenCalledWith(
      IPCChannels.FollowUp.GetTimeline,
      { customerId: 7, filter: 'call', limit: 20, offset: 0 }
    );
    expect(result).toEqual(entries);
  });

  test('getTimeline returns [] on error', async () => {
    mockInvoke.mockRejectedValue(new Error('fail'));
    const result = await followUpService.getTimeline(1);
    expect(result).toEqual([]);
  });

  test('getSavedViews invokes correct channel and returns views', async () => {
    const views = [{ id: 1, name: 'My View', filters: '{}', display_order: 0 }];
    mockInvoke.mockResolvedValue(views);
    const result = await followUpService.getSavedViews();
    expect(mockInvoke).toHaveBeenCalledWith(IPCChannels.FollowUp.GetSavedViews);
    expect(result).toEqual(views);
  });

  test('getSavedViews returns [] on error', async () => {
    mockInvoke.mockRejectedValue(new Error('fail'));
    const result = await followUpService.getSavedViews();
    expect(result).toEqual([]);
  });

  test('createSavedView invokes correct channel and returns result', async () => {
    mockInvoke.mockResolvedValue({ success: true, id: 3 });
    const result = await followUpService.createSavedView({ name: 'New View', filters: '{}' });
    expect(mockInvoke).toHaveBeenCalledWith(
      IPCChannels.FollowUp.CreateSavedView,
      { name: 'New View', filters: '{}' }
    );
    expect(result).toEqual({ success: true, id: 3 });
  });

  test('createSavedView returns failure on error', async () => {
    mockInvoke.mockRejectedValue(new Error('constraint'));
    const result = await followUpService.createSavedView({ name: 'Bad', filters: '{}' });
    expect(result).toEqual({ success: false, error: 'constraint' });
  });

  test('deleteSavedView invokes correct channel and returns success', async () => {
    mockInvoke.mockResolvedValue({ success: true });
    const result = await followUpService.deleteSavedView(9);
    expect(mockInvoke).toHaveBeenCalledWith(IPCChannels.FollowUp.DeleteSavedView, 9);
    expect(result).toEqual({ success: true });
  });

  test('deleteSavedView returns failure on error', async () => {
    mockInvoke.mockRejectedValue(new Error('not found'));
    const result = await followUpService.deleteSavedView(99);
    expect(result).toEqual({ success: false, error: 'not found' });
  });
});
