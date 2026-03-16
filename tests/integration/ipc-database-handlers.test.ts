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
  describe('isDevelopment: false', () => {
    beforeEach(() => {
      handlers.clear();
      Object.values(sqliteMocks).forEach((fn) => fn.mockReset());
      registerDatabaseHandlers({ logger: console, isDevelopment: false });
    });

    describe('Db.GetCustomers', () => {
      test('returns customers from service', async () => {
        sqliteMocks.getAllCustomers.mockReturnValue([{ id: 1, name: 'Acme' }]);
        const handler = handlers.get(IPCChannels.Db.GetCustomers);
        const result = await handler({}, false);
        expect(result).toEqual([{ id: 1, name: 'Acme' }]);
        expect(sqliteMocks.getAllCustomers).toHaveBeenCalledWith(false);
      });

      test('re-throws on service error', async () => {
        sqliteMocks.getAllCustomers.mockImplementation(() => { throw new Error('DB error'); });
        const handler = handlers.get(IPCChannels.Db.GetCustomers);
        await expect(handler({}, false)).rejects.toThrow('DB error');
      });
    });

    describe('Db.GetCustomersDropdown', () => {
      test('returns dropdown list', async () => {
        const list = [{ id: 1, name: 'Acme' }];
        sqliteMocks.getCustomersForDropdown.mockReturnValue(list);
        const handler = handlers.get(IPCChannels.Db.GetCustomersDropdown);
        const result = await handler({});
        expect(result).toEqual(list);
      });

      test('re-throws on service error', async () => {
        sqliteMocks.getCustomersForDropdown.mockImplementation(() => { throw new Error('Query failed'); });
        const handler = handlers.get(IPCChannels.Db.GetCustomersDropdown);
        await expect(handler({})).rejects.toThrow('Query failed');
      });
    });

    describe('Db.SearchCustomers', () => {
      test('returns search results', async () => {
        const results = [{ id: 2, name: 'Acme Corp' }];
        sqliteMocks.searchCustomers.mockReturnValue(results);
        const handler = handlers.get(IPCChannels.Db.SearchCustomers);
        const result = await handler({}, 'Acme', 10);
        expect(result).toEqual(results);
        expect(sqliteMocks.searchCustomers).toHaveBeenCalledWith('Acme', 10);
      });

      test('re-throws on service error', async () => {
        sqliteMocks.searchCustomers.mockImplementation(() => { throw new Error('Search failed'); });
        const handler = handlers.get(IPCChannels.Db.SearchCustomers);
        await expect(handler({}, 'bad', 5)).rejects.toThrow('Search failed');
      });
    });

    describe('Db.GetCustomer', () => {
      test('returns customer by id', async () => {
        const customer = { id: 1, name: 'Acme' };
        sqliteMocks.getCustomerById.mockReturnValue(customer);
        const handler = handlers.get(IPCChannels.Db.GetCustomer);
        const result = await handler({}, 1);
        expect(result).toEqual(customer);
      });

      test('returns null on service error', async () => {
        sqliteMocks.getCustomerById.mockImplementation(() => { throw new Error('Not found'); });
        const handler = handlers.get(IPCChannels.Db.GetCustomer);
        const result = await handler({}, 99);
        expect(result).toBeNull();
      });
    });

    describe('Db.CreateCustomer', () => {
      test('creates customer and returns success', async () => {
        const created = { id: 10, name: 'New Corp' };
        sqliteMocks.createCustomer.mockReturnValue(created);
        const handler = handlers.get(IPCChannels.Db.CreateCustomer);
        const result = await handler({}, { name: 'New Corp' });
        expect(result).toEqual({ success: true, customer: created });
      });

      test('returns error object on service throw', async () => {
        sqliteMocks.createCustomer.mockImplementation(() => { throw new Error('Duplicate entry'); });
        const handler = handlers.get(IPCChannels.Db.CreateCustomer);
        const result = await handler({}, { name: 'Bad' });
        expect(result).toEqual({ success: false, error: 'Duplicate entry' });
      });
    });

    describe('Db.UpdateCustomer', () => {
      test('updates customer and returns success', async () => {
        const updated = { id: 1, name: 'Acme Updated' };
        sqliteMocks.updateCustomer.mockReturnValue(updated);
        const handler = handlers.get(IPCChannels.Db.UpdateCustomer);
        const result = await handler({}, { id: 1, customerData: { name: 'Acme Updated' } });
        expect(result).toEqual({ success: true, customer: updated });
      });

      test('returns success: false when update returns null', async () => {
        sqliteMocks.updateCustomer.mockReturnValue(null);
        const handler = handlers.get(IPCChannels.Db.UpdateCustomer);
        const result = await handler({}, { id: 1, customerData: {} });
        expect(result.success).toBe(false);
        expect(result.customer).toBeNull();
      });

      test('returns error object on service throw', async () => {
        sqliteMocks.updateCustomer.mockImplementation(() => { throw new Error('Update failed'); });
        const handler = handlers.get(IPCChannels.Db.UpdateCustomer);
        const result = await handler({}, { id: 99 });
        expect(result).toEqual({ success: false, error: 'Update failed' });
      });
    });

    describe('Db.DeleteCustomer', () => {
      test('deletes customer and returns result', async () => {
        sqliteMocks.deleteCustomer.mockReturnValue(true);
        const handler = handlers.get(IPCChannels.Db.DeleteCustomer);
        const result = await handler({}, 1);
        expect(result).toEqual({ success: true });
      });

      test('returns error object on service throw', async () => {
        sqliteMocks.deleteCustomer.mockImplementation(() => { throw new Error('FK constraint'); });
        const handler = handlers.get(IPCChannels.Db.DeleteCustomer);
        const result = await handler({}, 1);
        expect(result.success).toBe(false);
        expect(result.error).toContain('FK constraint');
      });
    });

    describe('Db.GetDealsForCustomer', () => {
      test('returns deals for customer', async () => {
        const deals = [{ id: 1, name: 'Deal A' }];
        sqliteMocks.getDealsForCustomer.mockReturnValue(deals);
        const handler = handlers.get(IPCChannels.Db.GetDealsForCustomer);
        expect(await handler({}, 5)).toEqual(deals);
      });

      test('returns empty array on error', async () => {
        sqliteMocks.getDealsForCustomer.mockImplementation(() => { throw new Error('Query failed'); });
        const handler = handlers.get(IPCChannels.Db.GetDealsForCustomer);
        expect(await handler({}, 5)).toEqual([]);
      });
    });

    describe('Db.GetTasksForCustomer', () => {
      test('returns tasks for customer', async () => {
        const tasks = [{ id: 1, title: 'Call' }];
        sqliteMocks.getTasksForCustomer.mockReturnValue(tasks);
        const handler = handlers.get(IPCChannels.Db.GetTasksForCustomer);
        expect(await handler({}, 5)).toEqual(tasks);
      });

      test('returns empty array on error', async () => {
        sqliteMocks.getTasksForCustomer.mockImplementation(() => { throw new Error('Query failed'); });
        const handler = handlers.get(IPCChannels.Db.GetTasksForCustomer);
        expect(await handler({}, 5)).toEqual([]);
      });
    });

    describe('Products.GetAll', () => {
      test('returns all products', async () => {
        sqliteMocks.getAllProducts.mockReturnValue([{ id: 1, name: 'Widget' }]);
        const handler = handlers.get(IPCChannels.Products.GetAll);
        expect(await handler({})).toEqual([{ id: 1, name: 'Widget' }]);
      });

      test('returns empty array on error', async () => {
        sqliteMocks.getAllProducts.mockImplementation(() => { throw new Error('Read failed'); });
        const handler = handlers.get(IPCChannels.Products.GetAll);
        expect(await handler({})).toEqual([]);
      });
    });

    describe('Products.Search', () => {
      test('returns search results', async () => {
        sqliteMocks.searchProducts.mockReturnValue([{ id: 1, name: 'Widget Pro' }]);
        const handler = handlers.get(IPCChannels.Products.Search);
        const result = await handler({}, 'Widget', 10);
        expect(result).toEqual([{ id: 1, name: 'Widget Pro' }]);
        expect(sqliteMocks.searchProducts).toHaveBeenCalledWith('Widget', 10);
      });

      test('returns empty array on error', async () => {
        sqliteMocks.searchProducts.mockImplementation(() => { throw new Error('Search failed'); });
        const handler = handlers.get(IPCChannels.Products.Search);
        expect(await handler({}, 'bad')).toEqual([]);
      });
    });

    describe('Products.GetById', () => {
      test('returns product by id', async () => {
        sqliteMocks.getProductById.mockReturnValue({ id: 3, name: 'Widget' });
        const handler = handlers.get(IPCChannels.Products.GetById);
        expect(await handler({}, 3)).toEqual({ id: 3, name: 'Widget' });
      });

      test('returns null on error', async () => {
        sqliteMocks.getProductById.mockImplementation(() => { throw new Error('Not found'); });
        const handler = handlers.get(IPCChannels.Products.GetById);
        expect(await handler({}, 99)).toBeNull();
      });
    });

    describe('Products.Create', () => {
      test('creates product and returns id', async () => {
        sqliteMocks.createProduct.mockReturnValue({ lastInsertRowid: 7 });
        const handler = handlers.get(IPCChannels.Products.Create);
        expect(await handler({}, { name: 'New Widget' })).toEqual({ success: true, productId: 7 });
      });

      test('returns error object on service throw', async () => {
        sqliteMocks.createProduct.mockImplementation(() => { throw new Error('Duplicate SKU'); });
        const handler = handlers.get(IPCChannels.Products.Create);
        const result = await handler({}, { name: 'Bad' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('Duplicate SKU');
      });
    });

    describe('Products.Update', () => {
      test('returns success when changes > 0', async () => {
        sqliteMocks.updateProduct.mockReturnValue({ changes: 1 });
        const handler = handlers.get(IPCChannels.Products.Update);
        expect(await handler({}, { id: 1, productData: { name: 'Updated' } })).toEqual({ success: true, changes: 1 });
      });

      test('returns success: false when no rows changed', async () => {
        sqliteMocks.updateProduct.mockReturnValue({ changes: 0 });
        const handler = handlers.get(IPCChannels.Products.Update);
        expect(await handler({}, { id: 99, productData: {} })).toEqual({ success: false, changes: 0 });
      });

      test('returns error object on service throw', async () => {
        sqliteMocks.updateProduct.mockImplementation(() => { throw new Error('Update error'); });
        const handler = handlers.get(IPCChannels.Products.Update);
        const result = await handler({}, { id: 1, productData: {} });
        expect(result.success).toBe(false);
        expect(result.error).toContain('Update error');
      });

      test('handles null payload gracefully', async () => {
        sqliteMocks.updateProduct.mockReturnValue({ changes: 0 });
        const handler = handlers.get(IPCChannels.Products.Update);
        await handler({}, null);
        expect(sqliteMocks.updateProduct).toHaveBeenCalledWith(undefined, undefined);
      });
    });

    describe('Products.Delete', () => {
      test('returns success when changes > 0', async () => {
        sqliteMocks.deleteProduct.mockReturnValue({ changes: 1 });
        const handler = handlers.get(IPCChannels.Products.Delete);
        expect(await handler({}, 1)).toEqual({ success: true, changes: 1 });
      });

      test('returns linked-deal error for specific message', async () => {
        sqliteMocks.deleteProduct.mockImplementation(() => {
          throw new Error('Product is linked to one or more deals');
        });
        const handler = handlers.get(IPCChannels.Products.Delete);
        const result = await handler({}, 1);
        expect(result.success).toBe(false);
        expect(result.error).toContain('linked to existing deals');
      });

      test('returns generic error for other throws', async () => {
        sqliteMocks.deleteProduct.mockImplementation(() => { throw new Error('Generic error'); });
        const handler = handlers.get(IPCChannels.Products.Delete);
        const result = await handler({}, 99);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Generic error');
      });
    });

    test('registers all 15 handlers', () => {
      expect(handlers.has(IPCChannels.Db.GetCustomers)).toBe(true);
      expect(handlers.has(IPCChannels.Db.GetCustomersDropdown)).toBe(true);
      expect(handlers.has(IPCChannels.Db.SearchCustomers)).toBe(true);
      expect(handlers.has(IPCChannels.Db.GetCustomer)).toBe(true);
      expect(handlers.has(IPCChannels.Db.CreateCustomer)).toBe(true);
      expect(handlers.has(IPCChannels.Db.UpdateCustomer)).toBe(true);
      expect(handlers.has(IPCChannels.Db.DeleteCustomer)).toBe(true);
      expect(handlers.has(IPCChannels.Db.GetDealsForCustomer)).toBe(true);
      expect(handlers.has(IPCChannels.Db.GetTasksForCustomer)).toBe(true);
      expect(handlers.has(IPCChannels.Products.GetAll)).toBe(true);
      expect(handlers.has(IPCChannels.Products.Search)).toBe(true);
      expect(handlers.has(IPCChannels.Products.GetById)).toBe(true);
      expect(handlers.has(IPCChannels.Products.Create)).toBe(true);
      expect(handlers.has(IPCChannels.Products.Update)).toBe(true);
      expect(handlers.has(IPCChannels.Products.Delete)).toBe(true);
    });
  });

  describe('isDevelopment: true — debug logging branches', () => {
    beforeEach(() => {
      handlers.clear();
      Object.values(sqliteMocks).forEach((fn) => fn.mockReset());
      registerDatabaseHandlers({ logger: console, isDevelopment: true });
    });

    test('GetCustomers logs debug in dev mode', async () => {
      sqliteMocks.getAllCustomers.mockReturnValue([]);
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      await handlers.get(IPCChannels.Db.GetCustomers)({}, true);
      expect(debugSpy).toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    test('GetCustomersDropdown logs debug in dev mode', async () => {
      sqliteMocks.getCustomersForDropdown.mockReturnValue([]);
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      await handlers.get(IPCChannels.Db.GetCustomersDropdown)({});
      expect(debugSpy).toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    test('SearchCustomers logs before and after query in dev mode', async () => {
      sqliteMocks.searchCustomers.mockReturnValue([{ id: 1 }]);
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      await handlers.get(IPCChannels.Db.SearchCustomers)({}, 'test', 5);
      expect(debugSpy).toHaveBeenCalledTimes(2);
      debugSpy.mockRestore();
    });
  });
});
