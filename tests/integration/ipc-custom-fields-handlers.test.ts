import { IPCChannels } from '../../shared/ipc/channels';

const handlers = new Map<string, any>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((channel: string, handler: unknown) => {
    handlers.set(channel, handler);
    return () => undefined;
  }),
}));

const sqliteMocks = {
  getAllCustomFields: jest.fn(),
  getActiveCustomFields: jest.fn(),
  getCustomFieldById: jest.fn(),
  createCustomField: jest.fn(),
  updateCustomField: jest.fn(),
  deleteCustomField: jest.fn(),
  getCustomFieldValuesForCustomer: jest.fn(),
  setCustomFieldValue: jest.fn(),
  deleteCustomFieldValue: jest.fn(),
};

jest.mock('../../electron/sqlite-service', () => sqliteMocks);

import { registerCustomFieldHandlers } from '../../electron/ipc/custom-fields';

describe('registerCustomFieldHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(sqliteMocks).forEach((fn) => fn.mockReset());
    registerCustomFieldHandlers({ logger: console });
  });

  // GetAll, GetActive, GetById, GetValuesForCustomer → re-throw on error
  // Create, Update, Delete, SetValue, DeleteValue → return { success: false, error }

  describe('CustomFields.GetAll', () => {
    test('returns all custom fields', async () => {
      const fields = [{ id: 1, name: 'vip' }, { id: 2, name: 'priority' }];
      sqliteMocks.getAllCustomFields.mockReturnValue(fields);
      const handler = handlers.get(IPCChannels.CustomFields.GetAll);
      const result = await handler({});
      expect(result).toEqual(fields);
    });

    test('re-throws on service error', async () => {
      sqliteMocks.getAllCustomFields.mockImplementation(() => { throw new Error('DB read failed'); });
      const handler = handlers.get(IPCChannels.CustomFields.GetAll);
      await expect(handler({})).rejects.toThrow('DB read failed');
    });
  });

  describe('CustomFields.GetActive', () => {
    test('returns active custom fields', async () => {
      const fields = [{ id: 1, name: 'vip', active: true }];
      sqliteMocks.getActiveCustomFields.mockReturnValue(fields);
      const handler = handlers.get(IPCChannels.CustomFields.GetActive);
      const result = await handler({});
      expect(result).toEqual(fields);
    });

    test('re-throws on service error', async () => {
      sqliteMocks.getActiveCustomFields.mockImplementation(() => { throw new Error('Query failed'); });
      const handler = handlers.get(IPCChannels.CustomFields.GetActive);
      await expect(handler({})).rejects.toThrow('Query failed');
    });
  });

  describe('CustomFields.GetById', () => {
    test('returns field by id', async () => {
      const field = { id: 3, name: 'region' };
      sqliteMocks.getCustomFieldById.mockReturnValue(field);
      const handler = handlers.get(IPCChannels.CustomFields.GetById);
      const result = await handler({}, 3);
      expect(result).toEqual(field);
      expect(sqliteMocks.getCustomFieldById).toHaveBeenCalledWith(3);
    });

    test('re-throws on service error', async () => {
      sqliteMocks.getCustomFieldById.mockImplementation(() => { throw new Error('Not found'); });
      const handler = handlers.get(IPCChannels.CustomFields.GetById);
      await expect(handler({}, 99)).rejects.toThrow('Not found');
    });
  });

  describe('CustomFields.Create', () => {
    test('creates field and returns success with field', async () => {
      const created = { id: 5, name: 'newfield' };
      sqliteMocks.createCustomField.mockReturnValue(created);
      const handler = handlers.get(IPCChannels.CustomFields.Create);
      const result = await handler({}, { name: 'newfield', type: 'text' });
      expect(result).toEqual({ success: true, field: created });
    });

    test('returns error object on service throw', async () => {
      sqliteMocks.createCustomField.mockImplementation(() => { throw new Error('Constraint error'); });
      const handler = handlers.get(IPCChannels.CustomFields.Create);
      const result = await handler({}, { name: 'bad' });
      expect(result).toEqual({ success: false, error: 'Constraint error' });
    });
  });

  describe('CustomFields.Update', () => {
    test('updates field and returns success with field', async () => {
      const updated = { id: 1, name: 'renamed' };
      sqliteMocks.updateCustomField.mockReturnValue(updated);
      const handler = handlers.get(IPCChannels.CustomFields.Update);
      const result = await handler({}, { id: 1, fieldData: { name: 'renamed' } });
      expect(result).toEqual({ success: true, field: updated });
      expect(sqliteMocks.updateCustomField).toHaveBeenCalledWith(1, { name: 'renamed' });
    });

    test('returns error object on service throw', async () => {
      sqliteMocks.updateCustomField.mockImplementation(() => { throw new Error('Update failed'); });
      const handler = handlers.get(IPCChannels.CustomFields.Update);
      const result = await handler({}, { id: 99, fieldData: {} });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Update failed');
    });

    test('handles null payload gracefully', async () => {
      sqliteMocks.updateCustomField.mockReturnValue({});
      const handler = handlers.get(IPCChannels.CustomFields.Update);
      await handler({}, null);
      expect(sqliteMocks.updateCustomField).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('CustomFields.Delete', () => {
    test('deletes field and returns success status', async () => {
      sqliteMocks.deleteCustomField.mockReturnValue(true);
      const handler = handlers.get(IPCChannels.CustomFields.Delete);
      const result = await handler({}, 2);
      expect(result).toEqual({ success: true });
      expect(sqliteMocks.deleteCustomField).toHaveBeenCalledWith(2);
    });

    test('returns error object on service throw', async () => {
      sqliteMocks.deleteCustomField.mockImplementation(() => { throw new Error('Cannot delete'); });
      const handler = handlers.get(IPCChannels.CustomFields.Delete);
      const result = await handler({}, 1);
      expect(result).toEqual({ success: false, error: 'Cannot delete' });
    });
  });

  describe('CustomFields.GetValuesForCustomer', () => {
    test('returns field values for customer', async () => {
      const values = [{ fieldId: 1, value: 'premium' }];
      sqliteMocks.getCustomFieldValuesForCustomer.mockReturnValue(values);
      const handler = handlers.get(IPCChannels.CustomFields.GetValuesForCustomer);
      const result = await handler({}, 42);
      expect(result).toEqual(values);
      expect(sqliteMocks.getCustomFieldValuesForCustomer).toHaveBeenCalledWith(42);
    });

    test('re-throws on service error', async () => {
      sqliteMocks.getCustomFieldValuesForCustomer.mockImplementation(() => { throw new Error('Join failed'); });
      const handler = handlers.get(IPCChannels.CustomFields.GetValuesForCustomer);
      await expect(handler({}, 1)).rejects.toThrow('Join failed');
    });
  });

  describe('CustomFields.SetValue', () => {
    test('sets field value and returns result', async () => {
      sqliteMocks.setCustomFieldValue.mockReturnValue({ success: true });
      const handler = handlers.get(IPCChannels.CustomFields.SetValue);
      const result = await handler({}, { customerId: 1, fieldId: 2, value: 'gold' });
      expect(result).toEqual({ success: true });
      expect(sqliteMocks.setCustomFieldValue).toHaveBeenCalledWith(1, 2, 'gold');
    });

    test('returns error object on service throw', async () => {
      sqliteMocks.setCustomFieldValue.mockImplementation(() => { throw new Error('FK constraint'); });
      const handler = handlers.get(IPCChannels.CustomFields.SetValue);
      const result = await handler({}, { customerId: 1, fieldId: 99, value: 'x' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('FK constraint');
    });

    test('handles null payload gracefully', async () => {
      sqliteMocks.setCustomFieldValue.mockReturnValue({ success: true });
      const handler = handlers.get(IPCChannels.CustomFields.SetValue);
      await handler({}, null);
      expect(sqliteMocks.setCustomFieldValue).toHaveBeenCalledWith(undefined, undefined, undefined);
    });
  });

  describe('CustomFields.DeleteValue', () => {
    test('deletes field value and returns result', async () => {
      sqliteMocks.deleteCustomFieldValue.mockReturnValue({ success: true });
      const handler = handlers.get(IPCChannels.CustomFields.DeleteValue);
      const result = await handler({}, { customerId: 1, fieldId: 2 });
      expect(result).toEqual({ success: true });
      expect(sqliteMocks.deleteCustomFieldValue).toHaveBeenCalledWith(1, 2);
    });

    test('returns error object on service throw', async () => {
      sqliteMocks.deleteCustomFieldValue.mockImplementation(() => { throw new Error('Delete failed'); });
      const handler = handlers.get(IPCChannels.CustomFields.DeleteValue);
      const result = await handler({}, { customerId: 1, fieldId: 1 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Delete failed');
    });

    test('handles null payload gracefully', async () => {
      sqliteMocks.deleteCustomFieldValue.mockReturnValue({ success: true });
      const handler = handlers.get(IPCChannels.CustomFields.DeleteValue);
      await handler({}, null);
      expect(sqliteMocks.deleteCustomFieldValue).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  test('registers all nine handlers', () => {
    expect(handlers.has(IPCChannels.CustomFields.GetAll)).toBe(true);
    expect(handlers.has(IPCChannels.CustomFields.GetActive)).toBe(true);
    expect(handlers.has(IPCChannels.CustomFields.GetById)).toBe(true);
    expect(handlers.has(IPCChannels.CustomFields.Create)).toBe(true);
    expect(handlers.has(IPCChannels.CustomFields.Update)).toBe(true);
    expect(handlers.has(IPCChannels.CustomFields.Delete)).toBe(true);
    expect(handlers.has(IPCChannels.CustomFields.GetValuesForCustomer)).toBe(true);
    expect(handlers.has(IPCChannels.CustomFields.SetValue)).toBe(true);
    expect(handlers.has(IPCChannels.CustomFields.DeleteValue)).toBe(true);
  });
});
