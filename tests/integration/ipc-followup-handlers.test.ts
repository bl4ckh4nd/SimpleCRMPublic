import { IPCChannels } from '../../shared/ipc/channels';

const handlers = new Map<string, any>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((channel: string, handler: unknown) => {
    handlers.set(channel, handler);
    return () => undefined;
  }),
}));

const sqliteMocks = {
  getFollowUpItems: jest.fn(),
  getFollowUpQueueCounts: jest.fn(),
  snoozeTask: jest.fn(),
  createActivityLog: jest.fn(),
  getTimeline: jest.fn(),
  getSavedViews: jest.fn(),
  createSavedView: jest.fn(),
  deleteSavedView: jest.fn(),
};

jest.mock('../../electron/sqlite-service', () => sqliteMocks);

import { registerFollowUpHandlers } from '../../electron/ipc/followup';

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('registerFollowUpHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(sqliteMocks).forEach((fn) => fn.mockReset());
    Object.values(mockLogger).forEach((fn) => fn.mockReset());
    registerFollowUpHandlers({ logger: mockLogger });
  });

  test('returns a disposer function', () => {
    handlers.clear();
    const dispose = registerFollowUpHandlers({ logger: mockLogger });
    expect(typeof dispose).toBe('function');
    dispose();
  });

  // GetItems
  test('GetItems returns items from sqlite', async () => {
    const items = [{ id: 1, customer_name: 'Acme' }];
    sqliteMocks.getFollowUpItems.mockReturnValue(items);
    const handler = handlers.get(IPCChannels.FollowUp.GetItems);
    const result = await handler({}, { queue: 'heute', filters: {}, limit: 50, offset: 0 });
    expect(result).toEqual(items);
    expect(sqliteMocks.getFollowUpItems).toHaveBeenCalledWith('heute', {}, 50, 0);
  });

  test('GetItems returns [] on error', async () => {
    sqliteMocks.getFollowUpItems.mockImplementation(() => { throw new Error('db fail'); });
    const handler = handlers.get(IPCChannels.FollowUp.GetItems);
    const result = await handler({}, {});
    expect(result).toEqual([]);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  test('GetItems handles null params with null-coalescing fallback', async () => {
    sqliteMocks.getFollowUpItems.mockReturnValue([]);
    const handler = handlers.get(IPCChannels.FollowUp.GetItems);
    // null params triggers the `params ?? {}` branch
    const result = await handler({}, null);
    expect(result).toEqual([]);
    expect(sqliteMocks.getFollowUpItems).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
  });

  // GetQueueCounts
  test('GetQueueCounts returns counts from sqlite', async () => {
    const counts = { heute: 3, ueberfaellig: 1, dieseWoche: 5, stagnierend: 2, highValueRisk: 0 };
    sqliteMocks.getFollowUpQueueCounts.mockReturnValue(counts);
    const handler = handlers.get(IPCChannels.FollowUp.GetQueueCounts);
    const result = await handler({});
    expect(result).toEqual(counts);
  });

  test('GetQueueCounts returns zero counts on error', async () => {
    sqliteMocks.getFollowUpQueueCounts.mockImplementation(() => { throw new Error('db fail'); });
    const handler = handlers.get(IPCChannels.FollowUp.GetQueueCounts);
    const result = await handler({});
    expect(result).toEqual({ heute: 0, ueberfaellig: 0, dieseWoche: 0, stagnierend: 0, highValueRisk: 0 });
    expect(mockLogger.error).toHaveBeenCalled();
  });

  // SnoozeTask
  test('SnoozeTask returns success from sqlite', async () => {
    sqliteMocks.snoozeTask.mockReturnValue({ success: true });
    const handler = handlers.get(IPCChannels.FollowUp.SnoozeTask);
    const result = await handler({}, { taskId: 42, snoozedUntil: '2026-03-20' });
    expect(result).toEqual({ success: true });
    expect(sqliteMocks.snoozeTask).toHaveBeenCalledWith(42, '2026-03-20');
  });

  test('SnoozeTask handles null payload with null-coalescing fallback', async () => {
    sqliteMocks.snoozeTask.mockReturnValue({ success: true });
    const handler = handlers.get(IPCChannels.FollowUp.SnoozeTask);
    await handler({}, null);
    expect(sqliteMocks.snoozeTask).toHaveBeenCalledWith(undefined, undefined);
  });

  test('SnoozeTask returns error on failure', async () => {
    sqliteMocks.snoozeTask.mockImplementation(() => { throw new Error('lock fail'); });
    const handler = handlers.get(IPCChannels.FollowUp.SnoozeTask);
    const result = await handler({}, { taskId: 1, snoozedUntil: '2026-03-20' });
    expect(result).toEqual({ success: false, error: 'lock fail' });
    expect(mockLogger.error).toHaveBeenCalled();
  });

  // LogActivity
  test('LogActivity returns success with id from sqlite', async () => {
    sqliteMocks.createActivityLog.mockReturnValue({ success: true, id: 99 });
    const handler = handlers.get(IPCChannels.FollowUp.LogActivity);
    const data = { customer_id: 1, activity_type: 'call', title: 'Called client' };
    const result = await handler({}, data);
    expect(result).toEqual({ success: true, id: 99 });
    expect(sqliteMocks.createActivityLog).toHaveBeenCalledWith(data);
  });

  test('LogActivity returns error on failure', async () => {
    sqliteMocks.createActivityLog.mockImplementation(() => { throw new Error('insert fail'); });
    const handler = handlers.get(IPCChannels.FollowUp.LogActivity);
    const result = await handler({}, { activity_type: 'note' });
    expect(result).toEqual({ success: false, error: 'insert fail' });
    expect(mockLogger.error).toHaveBeenCalled();
  });

  // GetTimeline
  test('GetTimeline returns entries from sqlite', async () => {
    const entries = [{ id: 1, activity_type: 'call' }];
    sqliteMocks.getTimeline.mockReturnValue(entries);
    const handler = handlers.get(IPCChannels.FollowUp.GetTimeline);
    const result = await handler({}, { customerId: 5, filter: 'call', limit: 20, offset: 0 });
    expect(result).toEqual(entries);
    expect(sqliteMocks.getTimeline).toHaveBeenCalledWith(5, 'call', 20, 0);
  });

  test('GetTimeline handles null params with null-coalescing fallback', async () => {
    sqliteMocks.getTimeline.mockReturnValue([]);
    const handler = handlers.get(IPCChannels.FollowUp.GetTimeline);
    await handler({}, null);
    expect(sqliteMocks.getTimeline).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
  });

  test('GetTimeline returns [] on error', async () => {
    sqliteMocks.getTimeline.mockImplementation(() => { throw new Error('db fail'); });
    const handler = handlers.get(IPCChannels.FollowUp.GetTimeline);
    const result = await handler({}, {});
    expect(result).toEqual([]);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  // GetSavedViews
  test('GetSavedViews returns views from sqlite', async () => {
    const views = [{ id: 1, name: 'My View', filters: '{}', display_order: 0 }];
    sqliteMocks.getSavedViews.mockReturnValue(views);
    const handler = handlers.get(IPCChannels.FollowUp.GetSavedViews);
    const result = await handler({});
    expect(result).toEqual(views);
  });

  test('GetSavedViews returns [] on error', async () => {
    sqliteMocks.getSavedViews.mockImplementation(() => { throw new Error('db fail'); });
    const handler = handlers.get(IPCChannels.FollowUp.GetSavedViews);
    const result = await handler({});
    expect(result).toEqual([]);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  // CreateSavedView
  test('CreateSavedView returns success with id from sqlite', async () => {
    sqliteMocks.createSavedView.mockReturnValue({ success: true, id: 7 });
    const handler = handlers.get(IPCChannels.FollowUp.CreateSavedView);
    const data = { name: 'New View', filters: '{"queue":"heute"}' };
    const result = await handler({}, data);
    expect(result).toEqual({ success: true, id: 7 });
    expect(sqliteMocks.createSavedView).toHaveBeenCalledWith(data);
  });

  test('CreateSavedView returns error on failure', async () => {
    sqliteMocks.createSavedView.mockImplementation(() => { throw new Error('constraint fail'); });
    const handler = handlers.get(IPCChannels.FollowUp.CreateSavedView);
    const result = await handler({}, { name: 'Bad', filters: '{}' });
    expect(result).toEqual({ success: false, error: 'constraint fail' });
    expect(mockLogger.error).toHaveBeenCalled();
  });

  // DeleteSavedView
  test('DeleteSavedView returns success from sqlite', async () => {
    sqliteMocks.deleteSavedView.mockReturnValue({ success: true });
    const handler = handlers.get(IPCChannels.FollowUp.DeleteSavedView);
    const result = await handler({}, 3);
    expect(result).toEqual({ success: true });
    expect(sqliteMocks.deleteSavedView).toHaveBeenCalledWith(3);
  });

  test('DeleteSavedView returns error on failure', async () => {
    sqliteMocks.deleteSavedView.mockImplementation(() => { throw new Error('not found'); });
    const handler = handlers.get(IPCChannels.FollowUp.DeleteSavedView);
    const result = await handler({}, 99);
    expect(result).toEqual({ success: false, error: 'not found' });
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
