import { IPC } from '../../shared/ipc/channels';

const handlers = new Map<string, (...args: unknown[]) => unknown>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((endpoint: { channel: string }, handler: (...args: unknown[]) => unknown) => {
    handlers.set(endpoint.channel, handler);
    return () => undefined;
  }),
}));

const sqliteMocks = {
  createCalendarEvent: jest.fn(),
  getAllCalendarEvents: jest.fn(),
};
jest.mock('../../electron/sqlite-service', () => sqliteMocks);

const scheduling = {
  deleteEventWithTask: jest.fn(),
  saveCalendarEntry: jest.fn(),
  setTaskSchedule: jest.fn(),
  updateEventWithTask: jest.fn(),
};
jest.mock('../../electron/task-scheduling', () => scheduling);

import { registerCalendarHandlers } from '../../electron/ipc/calendar';

describe('registerCalendarHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(sqliteMocks).forEach((fn) => fn.mockReset());
    Object.values(scheduling).forEach((fn) => fn.mockReset());
    registerCalendarHandlers({ logger: console });
  });

  test('registers the calendar contract', () => {
    Object.values(IPC.Calendar).forEach((endpoint) => expect(handlers.has(endpoint.channel)).toBe(true));
  });

  test('loads calendar events with one range payload', async () => {
    sqliteMocks.getAllCalendarEvents.mockReturnValue([{ id: 1 }]);
    const input = { startDate: '2026-07-01', endDate: '2026-07-31' };
    expect(await handlers.get(IPC.Calendar.GetCalendarEvents.channel)!({}, input)).toEqual([{ id: 1 }]);
    expect(sqliteMocks.getAllCalendarEvents).toHaveBeenCalledWith(input.startDate, input.endDate);
  });

  test('creates standalone events in SQLite', async () => {
    sqliteMocks.createCalendarEvent.mockReturnValue({ lastInsertRowid: 10 });
    const event = { title: 'New event' };
    expect(await handlers.get(IPC.Calendar.AddCalendarEvent.channel)!({}, event)).toEqual({ success: true, id: 10 });
  });

  test('routes task event changes through the scheduling owner', async () => {
    const event = { task_id: 4, start_date: '2026-07-16', end_date: '2026-07-17', all_day: true };
    await handlers.get(IPC.Calendar.AddCalendarEvent.channel)!({}, event);
    expect(scheduling.setTaskSchedule).toHaveBeenCalledWith(4, {
      startDate: event.start_date,
      endDate: event.end_date,
      allDay: true,
    });

    await handlers.get(IPC.Calendar.UpdateCalendarEvent.channel)!({}, { id: 8, eventData: { title: 'Moved' } });
    expect(scheduling.updateEventWithTask).toHaveBeenCalledWith(8, { title: 'Moved' });

    await handlers.get(IPC.Calendar.DeleteCalendarEvent.channel)!({}, 8);
    expect(scheduling.deleteEventWithTask).toHaveBeenCalledWith(8);
  });

  test('routes atomic form saves through the scheduling owner', async () => {
    const input = { event: { title: 'Call' }, task: { customer_id: 2 } };
    await handlers.get(IPC.Calendar.SaveEntry.channel)!({}, input);
    expect(scheduling.saveCalendarEntry).toHaveBeenCalledWith(input);
  });
});
