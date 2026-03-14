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
  });

  test('routes getAll tasks with filters', async () => {
    sqliteMocks.getAllTasks.mockReturnValue([{ id: 1 }]);
    registerTaskHandlers({ logger: console });
    const getAll = handlers.get(IPCChannels.Tasks.GetAll);
    const result = await getAll({}, { limit: 10, offset: 0, filter: { completed: false } });
    expect(result).toEqual([{ id: 1 }]);
    expect(sqliteMocks.getAllTasks).toHaveBeenCalledWith(10, 0, { completed: false });
  });

  test('handles toggle completion payload', async () => {
    sqliteMocks.updateTaskCompletion.mockReturnValue({ success: true });
    registerTaskHandlers({ logger: console });
    const toggle = handlers.get(IPCChannels.Tasks.ToggleCompletion);
    const result = await toggle({}, { taskId: 5, completed: true });
    expect(result).toEqual({ success: true });
    expect(sqliteMocks.updateTaskCompletion).toHaveBeenCalledWith(5, true);
  });
});
