import { IPCChannels } from '../../shared/ipc/channels';

const handlers = new Map<string, unknown>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((endpoint: { channel: string }, handler: unknown) => {
    handlers.set(endpoint.channel, handler);
    return () => undefined;
  }),
}));

const sqliteMocks = {
  getProductsForDeal: jest.fn(),
  getAllDeals: jest.fn(),
  getDealById: jest.fn(),
  createDeal: jest.fn(),
  updateDeal: jest.fn(),
  updateDealStage: jest.fn(),
  deleteDeal: jest.fn(),
  getTasksForDeal: jest.fn(),
};

jest.mock('../../electron/sqlite-service', () => sqliteMocks);

const dealProductMocks = {
  addDealProduct: jest.fn(),
  removeDealProductLine: jest.fn(),
  updateDealProductLine: jest.fn(),
};

jest.mock('../../electron/deal-products', () => dealProductMocks);

import { registerDealHandlers } from '../../electron/ipc/deals';

describe('registerDealHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(sqliteMocks).forEach((fn) => fn.mockReset());
    Object.values(dealProductMocks).forEach((fn) => fn.mockReset());
  });

  test('adds product to deal and recalculates value', async () => {
    dealProductMocks.addDealProduct.mockReturnValue({ success: true, dealProductId: 5, dealValue: 30 });
    registerDealHandlers({ logger: console, isDevelopment: false });

    const add = handlers.get(IPCChannels.Deals.AddProduct);
    const result = await add({}, { dealId: 1, productId: 2, quantity: 3, unitPrice: 10 });
    expect(result).toEqual({ success: true, dealProductId: 5, dealValue: 30 });
    expect(dealProductMocks.addDealProduct).toHaveBeenCalledWith(1, 2, 3, 10);
  });

  test('returns validation error when add payload is invalid', async () => {
    registerDealHandlers({ logger: console, isDevelopment: false });
    const add = handlers.get(IPCChannels.Deals.AddProduct);
    dealProductMocks.addDealProduct.mockReturnValue({ success: false, error: 'Product not found' });
    const result = await add({}, { dealId: 1, productId: 99, quantity: 3, unitPrice: 10 });
    expect(result).toEqual({ success: false, error: 'Product not found' });
  });

  test('updates deal product and recalculates deal value', async () => {
    dealProductMocks.updateDealProductLine.mockReturnValue({ success: true, dealProductId: 77, dealValue: 25, changes: 1 });
    registerDealHandlers({ logger: console, isDevelopment: false });
    const update = handlers.get(IPCChannels.Deals.UpdateProduct);
    const result = await update({}, { dealProductId: 77, quantity: 1, unitPrice: 25 });
    expect(result.success).toBe(true);
    expect(dealProductMocks.updateDealProductLine).toHaveBeenCalledWith(77, 1, 25);
  });

  test('deletes deal successfully', async () => {
    sqliteMocks.deleteDeal.mockReturnValue({ success: true });
    registerDealHandlers({ logger: console, isDevelopment: false });

    const del = handlers.get(IPCChannels.Deals.Delete);
    const result = await del({}, 42);
    expect(result).toEqual({ success: true });
    expect(sqliteMocks.deleteDeal).toHaveBeenCalledWith(42);
  });

  test('returns not-found error when deal does not exist', async () => {
    sqliteMocks.deleteDeal.mockReturnValue({ success: false, error: 'Deal not found' });
    registerDealHandlers({ logger: console, isDevelopment: false });

    const del = handlers.get(IPCChannels.Deals.Delete);
    const result = await del({}, 999);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Deal not found');
  });

  test('returns error when deleteDeal throws', async () => {
    sqliteMocks.deleteDeal.mockImplementation(() => { throw new Error('DB locked'); });
    registerDealHandlers({ logger: console, isDevelopment: false });

    const del = handlers.get(IPCChannels.Deals.Delete);
    const result = await del({}, 1);
    expect(result.success).toBe(false);
    expect(result.error).toContain('DB locked');
  });

  test('returns tasks for a deal', async () => {
    const mockTasks = [
      { id: 1, title: 'Follow up', customer_id: 5, customer_name: 'ACME', due_date: '2026-04-01', completed: 0 },
      { id: 2, title: 'Send quote', customer_id: 5, customer_name: 'ACME', due_date: '2026-04-05', completed: 1 },
    ];
    sqliteMocks.getTasksForDeal.mockReturnValue(mockTasks);
    registerDealHandlers({ logger: console, isDevelopment: false });

    const getTasks = handlers.get(IPCChannels.Deals.GetTasks);
    const result = await getTasks({}, 10);
    expect(result).toEqual(mockTasks);
    expect(sqliteMocks.getTasksForDeal).toHaveBeenCalledWith(10);
  });

  test('returns empty array when getTasksForDeal throws', async () => {
    sqliteMocks.getTasksForDeal.mockImplementation(() => { throw new Error('Query failed'); });
    registerDealHandlers({ logger: console, isDevelopment: false });

    const getTasks = handlers.get(IPCChannels.Deals.GetTasks);
    const result = await getTasks({}, 5);
    expect(result).toEqual([]);
  });

  test('returns empty array when deal has no associated tasks', async () => {
    sqliteMocks.getTasksForDeal.mockReturnValue([]);
    registerDealHandlers({ logger: console, isDevelopment: false });

    const getTasks = handlers.get(IPCChannels.Deals.GetTasks);
    const result = await getTasks({}, 7);
    expect(result).toEqual([]);
  });
});
