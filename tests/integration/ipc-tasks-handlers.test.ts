import { IPCChannels } from '../../shared/ipc/channels';

const handlers = new Map<string, any>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((channel: string, handler: unknown) => {
    handlers.set(channel, handler);
    return () => undefined;
  }),
}));

const sqliteMocks = {
  getAllTasks: jest.fn(),
  getTaskById: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  updateTaskCompletion: jest.fn(),
  deleteTask: jest.fn(),
};

jest.mock('../../electron/sqlite-service', () => sqliteMocks);

import { registerTaskHandlers } from '../../electron/ipc/tasks';

describe('registerTaskHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(sqliteMocks).forEach((fn) => fn.mockReset());
    registerTaskHandlers({ logger: console });
  });

  describe('Tasks.GetAll', () => {
    test('returns tasks with filters', async () => {
      sqliteMocks.getAllTasks.mockReturnValue([{ id: 1 }]);
      const handler = handlers.get(IPCChannels.Tasks.GetAll);
      const result = await handler({}, { limit: 10, offset: 0, filter: { completed: false } });
      expect(result).toEqual([{ id: 1 }]);
      expect(sqliteMocks.getAllTasks).toHaveBeenCalledWith(10, 0, { completed: false });
    });

    test('passes undefined when no params provided', async () => {
      sqliteMocks.getAllTasks.mockReturnValue([]);
      const handler = handlers.get(IPCChannels.Tasks.GetAll);
      const result = await handler({}, undefined);
      expect(result).toEqual([]);
      expect(sqliteMocks.getAllTasks).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    test('returns empty array on error', async () => {
      sqliteMocks.getAllTasks.mockImplementation(() => { throw new Error('DB locked'); });
      const handler = handlers.get(IPCChannels.Tasks.GetAll);
      const result = await handler({}, {});
      expect(result).toEqual([]);
    });
  });

  describe('Tasks.GetById', () => {
    test('returns task by id', async () => {
      const task = { id: 5, title: 'Follow up' };
      sqliteMocks.getTaskById.mockReturnValue(task);
      const handler = handlers.get(IPCChannels.Tasks.GetById);
      const result = await handler({}, 5);
      expect(result).toEqual(task);
      expect(sqliteMocks.getTaskById).toHaveBeenCalledWith(5);
    });

    test('returns null on error', async () => {
      sqliteMocks.getTaskById.mockImplementation(() => { throw new Error('Not found'); });
      const handler = handlers.get(IPCChannels.Tasks.GetById);
      const result = await handler({}, 99);
      expect(result).toBeNull();
    });
  });

  describe('Tasks.Create', () => {
    test('creates task and returns result', async () => {
      const created = { id: 3, title: 'New task' };
      sqliteMocks.createTask.mockReturnValue(created);
      const handler = handlers.get(IPCChannels.Tasks.Create);
      const result = await handler({}, { title: 'New task' });
      expect(result).toEqual(created);
      expect(sqliteMocks.createTask).toHaveBeenCalledTimes(1);
    });

    test('returns error object on service throw', async () => {
      sqliteMocks.createTask.mockImplementation(() => { throw new Error('Constraint violation'); });
      const handler = handlers.get(IPCChannels.Tasks.Create);
      const result = await handler({}, { title: 'Bad task' });
      expect(result).toEqual({ success: false, error: 'Constraint violation' });
    });
  });

  describe('Tasks.Update', () => {
    test('updates task and returns result', async () => {
      const updated = { id: 1, title: 'Updated task' };
      sqliteMocks.updateTask.mockReturnValue(updated);
      const handler = handlers.get(IPCChannels.Tasks.Update);
      const result = await handler({}, { id: 1, taskData: { title: 'Updated task' } });
      expect(result).toEqual(updated);
      expect(sqliteMocks.updateTask).toHaveBeenCalledWith(1, { title: 'Updated task' });
    });

    test('returns error object on service throw', async () => {
      sqliteMocks.updateTask.mockImplementation(() => { throw new Error('Row not found'); });
      const handler = handlers.get(IPCChannels.Tasks.Update);
      const result = await handler({}, { id: 99, taskData: {} });
      expect(result).toEqual({ success: false, error: 'Row not found' });
    });

    test('handles null payload gracefully', async () => {
      sqliteMocks.updateTask.mockReturnValue({ success: true });
      const handler = handlers.get(IPCChannels.Tasks.Update);
      await handler({}, null);
      expect(sqliteMocks.updateTask).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('Tasks.ToggleCompletion', () => {
    test('toggles task completion', async () => {
      sqliteMocks.updateTaskCompletion.mockReturnValue({ success: true });
      const handler = handlers.get(IPCChannels.Tasks.ToggleCompletion);
      const result = await handler({}, { taskId: 5, completed: true });
      expect(result).toEqual({ success: true });
      expect(sqliteMocks.updateTaskCompletion).toHaveBeenCalledWith(5, true);
    });

    test('returns error object on service throw', async () => {
      sqliteMocks.updateTaskCompletion.mockImplementation(() => { throw new Error('DB error'); });
      const handler = handlers.get(IPCChannels.Tasks.ToggleCompletion);
      const result = await handler({}, { taskId: 1, completed: false });
      expect(result.success).toBe(false);
      expect(result.error).toContain('DB error');
    });

    test('handles null payload gracefully', async () => {
      sqliteMocks.updateTaskCompletion.mockReturnValue({ success: true });
      const handler = handlers.get(IPCChannels.Tasks.ToggleCompletion);
      await handler({}, null);
      expect(sqliteMocks.updateTaskCompletion).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('Tasks.Delete', () => {
    test('deletes task and returns result', async () => {
      sqliteMocks.deleteTask.mockReturnValue({ success: true });
      const handler = handlers.get(IPCChannels.Tasks.Delete);
      const result = await handler({}, 3);
      expect(result).toEqual({ success: true });
      expect(sqliteMocks.deleteTask).toHaveBeenCalledWith(3);
    });

    test('returns error object on service throw', async () => {
      sqliteMocks.deleteTask.mockImplementation(() => { throw new Error('Cannot delete'); });
      const handler = handlers.get(IPCChannels.Tasks.Delete);
      const result = await handler({}, 99);
      expect(result).toEqual({ success: false, error: 'Cannot delete' });
    });
  });

  test('registers all six handlers', () => {
    expect(handlers.has(IPCChannels.Tasks.GetAll)).toBe(true);
    expect(handlers.has(IPCChannels.Tasks.GetById)).toBe(true);
    expect(handlers.has(IPCChannels.Tasks.Create)).toBe(true);
    expect(handlers.has(IPCChannels.Tasks.Update)).toBe(true);
    expect(handlers.has(IPCChannels.Tasks.ToggleCompletion)).toBe(true);
    expect(handlers.has(IPCChannels.Tasks.Delete)).toBe(true);
  });
});
