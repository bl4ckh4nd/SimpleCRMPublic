import { IPCChannels } from '../../shared/ipc/channels';

const handlers = new Map<string, any>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((channel: string, handler: unknown) => {
    handlers.set(channel, handler);
    return () => undefined;
  }),
}));

const sqliteMocks = {
  getAllCustomers: jest.fn(),
  getCustomerById: jest.fn(),
  createCustomer: jest.fn(),
  updateCustomer: jest.fn(),
  deleteCustomer: jest.fn(),
  getDealsForCustomer: jest.fn(),
  getTasksForCustomer: jest.fn(),
  searchCustomers: jest.fn(),
  getCustomersForDropdown: jest.fn(),
  getAllProducts: jest.fn(),
  searchProducts: jest.fn(),
  getProductById: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
};

jest.mock('../../electron/sqlite-service', () => sqliteMocks);

import { registerDatabaseHandlers } from '../../electron/ipc/database';

describe('registerDatabaseHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(sqliteMocks).forEach((fn) => fn.mockReset());
  });

  test('returns customers and handles includeCustomFields', async () => {
    sqliteMocks.getAllCustomers.mockReturnValue([{ id: 1 }]);
    registerDatabaseHandlers({ logger: console, isDevelopment: true });
    const fn = handlers.get(IPCChannels.Db.GetCustomers);
    const result = await fn({}, true);
    expect(result).toEqual([{ id: 1 }]);
    expect(sqliteMocks.getAllCustomers).toHaveBeenCalledWith(true);
  });

  test('creates and updates customer payloads', async () => {
    sqliteMocks.createCustomer.mockReturnValue({ id: 99 });
    sqliteMocks.updateCustomer.mockReturnValue({ id: 99, name: 'Updated' });
    registerDatabaseHandlers({ logger: console, isDevelopment: false });

    const create = handlers.get(IPCChannels.Db.CreateCustomer);
    const update = handlers.get(IPCChannels.Db.UpdateCustomer);

    await expect(create({}, { name: 'New' })).resolves.toEqual({ success: true, customer: { id: 99 } });
    await expect(update({}, { id: 99, customerData: { name: 'Updated' } })).resolves.toEqual({
      success: true,
      customer: { id: 99, name: 'Updated' },
    });
  });

  test('surfaces linked-product delete error', async () => {
    sqliteMocks.deleteProduct.mockImplementation(() => {
      throw new Error('linked to one or more deals');
    });
    registerDatabaseHandlers({ logger: console, isDevelopment: false });
    const del = handlers.get(IPCChannels.Products.Delete);
    const result = await del({}, 1);
    expect(result.success).toBe(false);
    expect(result.error).toContain('linked');
  });
});
