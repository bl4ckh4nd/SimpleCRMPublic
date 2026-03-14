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
  });

  test('creates and deletes custom fields', async () => {
    sqliteMocks.createCustomField.mockReturnValue({ id: 1, name: 'vip' });
    sqliteMocks.deleteCustomField.mockReturnValue(true);
    registerCustomFieldHandlers({ logger: console });

    const create = handlers.get(IPCChannels.CustomFields.Create);
    const del = handlers.get(IPCChannels.CustomFields.Delete);

    await expect(create({}, { name: 'vip' })).resolves.toEqual({ success: true, field: { id: 1, name: 'vip' } });
    await expect(del({}, 1)).resolves.toEqual({ success: true });
  });
});
