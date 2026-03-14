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
  });

  test('normalizes update payload for calendar event', async () => {
    sqliteMocks.updateCalendarEvent.mockReturnValue({ success: true });
    registerCalendarHandlers({ logger: console });
    const update = handlers.get(IPCChannels.Calendar.UpdateCalendarEvent);
    const result = await update({}, { id: '9', eventData: { title: 'Updated', id: 99 } });
    expect(result).toEqual({ success: true });
    expect(sqliteMocks.updateCalendarEvent).toHaveBeenCalledWith(9, { title: 'Updated' });
  });

  test('returns error response when update payload is missing', async () => {
    registerCalendarHandlers({ logger: console });
    const update = handlers.get(IPCChannels.Calendar.UpdateCalendarEvent);
    const result = await update({}, undefined);
    expect(result.success).toBe(false);
  });
});
