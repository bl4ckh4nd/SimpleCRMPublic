import { IPCChannels } from '../../shared/ipc/channels';

const handlers = new Map<string, any>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((channel: string, handler: unknown) => {
    handlers.set(channel, handler);
    return () => undefined;
  }),
}));

const sqliteMocks = {
  getAllCalendarEvents: jest.fn(),
  createCalendarEvent: jest.fn(),
  updateCalendarEvent: jest.fn(),
  deleteCalendarEvent: jest.fn(),
};

jest.mock('../../electron/sqlite-service', () => sqliteMocks);

import { registerCalendarHandlers } from '../../electron/ipc/calendar';

describe('registerCalendarHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(sqliteMocks).forEach((fn) => fn.mockReset());
    registerCalendarHandlers({ logger: console });
  });

  describe('Calendar.GetCalendarEvents', () => {
    test('returns events from service', async () => {
      const events = [{ id: 1, title: 'Meeting' }];
      sqliteMocks.getAllCalendarEvents.mockReturnValue(events);
      const handler = handlers.get(IPCChannels.Calendar.GetCalendarEvents);
      const result = await handler({}, { startDate: '2026-01-01', endDate: '2026-03-31' });
      expect(result).toEqual(events);
      expect(sqliteMocks.getAllCalendarEvents).toHaveBeenCalledWith('2026-01-01', '2026-03-31');
    });

    test('passes undefined when no params provided', async () => {
      sqliteMocks.getAllCalendarEvents.mockReturnValue([]);
      const handler = handlers.get(IPCChannels.Calendar.GetCalendarEvents);
      const result = await handler({}, undefined);
      expect(result).toEqual([]);
      expect(sqliteMocks.getAllCalendarEvents).toHaveBeenCalledWith(undefined, undefined);
    });

    test('returns empty array on error', async () => {
      sqliteMocks.getAllCalendarEvents.mockImplementation(() => { throw new Error('DB error'); });
      const handler = handlers.get(IPCChannels.Calendar.GetCalendarEvents);
      const result = await handler({}, {});
      expect(result).toEqual([]);
    });
  });

  describe('Calendar.AddCalendarEvent', () => {
    test('creates event and returns result', async () => {
      const created = { id: 10, title: 'New event' };
      sqliteMocks.createCalendarEvent.mockReturnValue(created);
      const handler = handlers.get(IPCChannels.Calendar.AddCalendarEvent);
      const result = await handler({}, { title: 'New event', start: '2026-04-01' });
      expect(result).toEqual(created);
    });

    test('returns error object on service throw', async () => {
      sqliteMocks.createCalendarEvent.mockImplementation(() => { throw new Error('Insert failed'); });
      const handler = handlers.get(IPCChannels.Calendar.AddCalendarEvent);
      const result = await handler({}, { title: 'Bad' });
      expect(result).toEqual({ success: false, error: 'Insert failed' });
    });
  });

  describe('Calendar.UpdateCalendarEvent', () => {
    test('updates event with string id and eventData key', async () => {
      const updated = { id: 9, title: 'Updated' };
      sqliteMocks.updateCalendarEvent.mockReturnValue(updated);
      const handler = handlers.get(IPCChannels.Calendar.UpdateCalendarEvent);
      const result = await handler({}, { id: '9', eventData: { title: 'Updated' } });
      expect(result).toEqual(updated);
      expect(sqliteMocks.updateCalendarEvent).toHaveBeenCalledWith(9, { title: 'Updated' });
    });

    test('strips id from eventData before calling service', async () => {
      sqliteMocks.updateCalendarEvent.mockReturnValue({ success: true });
      const handler = handlers.get(IPCChannels.Calendar.UpdateCalendarEvent);
      await handler({}, { id: 4, eventData: { id: 4, title: 'Strip me' } });
      const [, passedData] = sqliteMocks.updateCalendarEvent.mock.calls[0];
      expect(passedData).not.toHaveProperty('id');
      expect(passedData).toHaveProperty('title', 'Strip me');
    });

    test('updates event with numeric id', async () => {
      sqliteMocks.updateCalendarEvent.mockReturnValue({ success: true });
      const handler = handlers.get(IPCChannels.Calendar.UpdateCalendarEvent);
      await handler({}, { id: 7, eventData: { title: 'Numeric id' } });
      expect(sqliteMocks.updateCalendarEvent).toHaveBeenCalledWith(7, { title: 'Numeric id' });
    });

    test('updates event with flat payload (no eventData key)', async () => {
      sqliteMocks.updateCalendarEvent.mockReturnValue({ success: true });
      const handler = handlers.get(IPCChannels.Calendar.UpdateCalendarEvent);
      await handler({}, { id: 3, title: 'Flat title', start: '2026-04-01' });
      expect(sqliteMocks.updateCalendarEvent).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ title: 'Flat title', start: '2026-04-01' })
      );
    });

    test('returns error when payload is null', async () => {
      const handler = handlers.get(IPCChannels.Calendar.UpdateCalendarEvent);
      const result = await handler({}, null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No payload');
    });

    test('returns error when id is missing', async () => {
      const handler = handlers.get(IPCChannels.Calendar.UpdateCalendarEvent);
      const result = await handler({}, { title: 'No id' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing calendar event ID');
    });

    test('returns error when eventData is empty', async () => {
      const handler = handlers.get(IPCChannels.Calendar.UpdateCalendarEvent);
      const result = await handler({}, { id: 5, eventData: {} });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing calendar event data');
    });

    test('returns error on service throw', async () => {
      sqliteMocks.updateCalendarEvent.mockImplementation(() => { throw new Error('Update failed'); });
      const handler = handlers.get(IPCChannels.Calendar.UpdateCalendarEvent);
      const result = await handler({}, { id: 1, eventData: { title: 'x' } });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Update failed');
    });
  });

  describe('Calendar.DeleteCalendarEvent', () => {
    test('deletes event and returns result', async () => {
      sqliteMocks.deleteCalendarEvent.mockReturnValue({ success: true });
      const handler = handlers.get(IPCChannels.Calendar.DeleteCalendarEvent);
      const result = await handler({}, 5);
      expect(result).toEqual({ success: true });
      expect(sqliteMocks.deleteCalendarEvent).toHaveBeenCalledWith(5);
    });

    test('returns error object on service throw', async () => {
      sqliteMocks.deleteCalendarEvent.mockImplementation(() => { throw new Error('Delete failed'); });
      const handler = handlers.get(IPCChannels.Calendar.DeleteCalendarEvent);
      const result = await handler({}, 99);
      expect(result).toEqual({ success: false, error: 'Delete failed' });
    });
  });

  test('registers all four handlers', () => {
    expect(handlers.has(IPCChannels.Calendar.GetCalendarEvents)).toBe(true);
    expect(handlers.has(IPCChannels.Calendar.AddCalendarEvent)).toBe(true);
    expect(handlers.has(IPCChannels.Calendar.UpdateCalendarEvent)).toBe(true);
    expect(handlers.has(IPCChannels.Calendar.DeleteCalendarEvent)).toBe(true);
  });
});
