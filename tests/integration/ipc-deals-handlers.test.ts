import { IPCChannels } from '../../shared/ipc/channels';

const handlers = new Map<string, any>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((channel: string, handler: unknown) => {
    handlers.set(channel, handler);
    return () => undefined;
  }),
}));

const sqliteMocks = {
  getProductsForDeal: jest.fn(),
  addProductToDeal: jest.fn(),
  removeProductFromDeal: jest.fn(),
  removeProductFromDealById: jest.fn(),
  updateDealProduct: jest.fn(),
  updateProductQuantityInDeal: jest.fn(),
  updateDealValueBasedOnCalculationMethod: jest.fn(),
  getAllDeals: jest.fn(),
  getDealById: jest.fn(),
  createDeal: jest.fn(),
  updateDeal: jest.fn(),
  updateDealStage: jest.fn(),
  getDb: jest.fn(),
};

jest.mock('../../electron/sqlite-service', () => sqliteMocks);

jest.mock('../../electron/database-schema', () => ({
  DEAL_PRODUCTS_TABLE: 'deal_products',
}));

import { registerDealHandlers } from '../../electron/ipc/deals';

describe('registerDealHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(sqliteMocks).forEach((fn) => fn.mockReset());
    sqliteMocks.getDb.mockReturnValue({
      prepare: jest.fn(() => ({
        get: jest.fn(() => ({ deal_id: 1, id: 77 })),
        run: jest.fn(),
      })),
    });
  });

  test('adds product to deal and recalculates value', async () => {
    sqliteMocks.addProductToDeal.mockReturnValue({ lastInsertRowid: 5 });
    sqliteMocks.updateDealValueBasedOnCalculationMethod.mockReturnValue({ success: true });
    registerDealHandlers({ logger: console, isDevelopment: false });

    const add = handlers.get(IPCChannels.Deals.AddProduct);
    const result = await add({}, { dealId: 1, productId: 2, quantity: 3, price: 10 });
    expect(result).toEqual({ success: true, lastInsertRowid: 5 });
    expect(sqliteMocks.updateDealValueBasedOnCalculationMethod).toHaveBeenCalledWith(1);
  });

  test('returns validation error when add payload is invalid', async () => {
    registerDealHandlers({ logger: console, isDevelopment: false });
    const add = handlers.get(IPCChannels.Deals.AddProduct);
    const result = await add({}, { dealId: 1, quantity: 3 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  test('updates deal product and recalculates deal value', async () => {
    sqliteMocks.updateDealProduct.mockReturnValue({ changes: 1 });
    registerDealHandlers({ logger: console, isDevelopment: false });
    const update = handlers.get(IPCChannels.Deals.UpdateProduct);
    const result = await update({}, { dealProductId: 77, quantity: 1, price: 25 });
    expect(result.success).toBe(true);
    expect(sqliteMocks.updateDealProduct).toHaveBeenCalledWith(77, 1, 25);
  });
});
