import { IPCChannels } from '../../shared/ipc/channels';

const handlers = new Map<string, any>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((channel: string, handler: unknown) => {
    handlers.set(channel, handler);
    return () => undefined;
  }),
}));

const sqliteMocks = {
  getAllJtlFirmen: jest.fn(),
  getAllJtlWarenlager: jest.fn(),
  getAllJtlZahlungsarten: jest.fn(),
  getAllJtlVersandarten: jest.fn(),
};

jest.mock('../../electron/sqlite-service', () => sqliteMocks);

const jtlOrderMocks = {
  createJtlOrder: jest.fn(),
};

jest.mock('../../electron/jtl-order-service', () => jtlOrderMocks);

import { registerJtlHandlers } from '../../electron/ipc/jtl';

describe('registerJtlHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    [...Object.values(sqliteMocks), ...Object.values(jtlOrderMocks)].forEach((fn) => fn.mockReset());
    registerJtlHandlers({ logger: console });
  });

  describe('Jtl.GetFirmen', () => {
    test('returns all Firmen', async () => {
      const firmen = [{ id: 1, name: 'Firma GmbH' }];
      sqliteMocks.getAllJtlFirmen.mockReturnValue(firmen);

      const handler = handlers.get(IPCChannels.Jtl.GetFirmen);
      const result = await handler({});
      expect(result).toEqual(firmen);
    });

    test('rethrows when service throws', async () => {
      sqliteMocks.getAllJtlFirmen.mockImplementation(() => { throw new Error('DB locked'); });

      const handler = handlers.get(IPCChannels.Jtl.GetFirmen);
      await expect(handler({})).rejects.toThrow('DB locked');
    });
  });

  describe('Jtl.GetWarenlager', () => {
    test('returns all Warenlager', async () => {
      const warenlager = [{ id: 1, name: 'Hauptlager' }];
      sqliteMocks.getAllJtlWarenlager.mockReturnValue(warenlager);

      const handler = handlers.get(IPCChannels.Jtl.GetWarenlager);
      const result = await handler({});
      expect(result).toEqual(warenlager);
    });

    test('rethrows when service throws', async () => {
      sqliteMocks.getAllJtlWarenlager.mockImplementation(() => { throw new Error('Query failed'); });

      const handler = handlers.get(IPCChannels.Jtl.GetWarenlager);
      await expect(handler({})).rejects.toThrow('Query failed');
    });
  });

  describe('Jtl.GetZahlungsarten', () => {
    test('returns all Zahlungsarten', async () => {
      const zahlungsarten = [{ id: 1, name: 'Überweisung' }];
      sqliteMocks.getAllJtlZahlungsarten.mockReturnValue(zahlungsarten);

      const handler = handlers.get(IPCChannels.Jtl.GetZahlungsarten);
      const result = await handler({});
      expect(result).toEqual(zahlungsarten);
    });

    test('rethrows when service throws', async () => {
      sqliteMocks.getAllJtlZahlungsarten.mockImplementation(() => { throw new Error('Error'); });

      const handler = handlers.get(IPCChannels.Jtl.GetZahlungsarten);
      await expect(handler({})).rejects.toThrow('Error');
    });
  });

  describe('Jtl.GetVersandarten', () => {
    test('returns all Versandarten', async () => {
      const versandarten = [{ id: 1, name: 'DHL' }];
      sqliteMocks.getAllJtlVersandarten.mockReturnValue(versandarten);

      const handler = handlers.get(IPCChannels.Jtl.GetVersandarten);
      const result = await handler({});
      expect(result).toEqual(versandarten);
    });

    test('rethrows when service throws', async () => {
      sqliteMocks.getAllJtlVersandarten.mockImplementation(() => { throw new Error('Error'); });

      const handler = handlers.get(IPCChannels.Jtl.GetVersandarten);
      await expect(handler({})).rejects.toThrow('Error');
    });
  });

  describe('Jtl.CreateOrder', () => {
    test('creates order and returns result', async () => {
      const orderResult = { success: true, orderId: 42 };
      jtlOrderMocks.createJtlOrder.mockResolvedValue(orderResult);

      const handler = handlers.get(IPCChannels.Jtl.CreateOrder);
      const payload = { customerId: 1, items: [{ articleId: 'ART-001', quantity: 2 }] };
      const result = await handler({}, payload);
      expect(result).toEqual(orderResult);
      expect(jtlOrderMocks.createJtlOrder).toHaveBeenCalledWith(payload);
    });

    test('returns error object when createJtlOrder throws', async () => {
      jtlOrderMocks.createJtlOrder.mockRejectedValue(new Error('MSSQL transaction failed'));

      const handler = handlers.get(IPCChannels.Jtl.CreateOrder);
      const result = await handler({}, { customerId: 1 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('MSSQL transaction failed');
    });

    test('returns error for undefined payload', async () => {
      jtlOrderMocks.createJtlOrder.mockRejectedValue(new Error('Invalid payload'));

      const handler = handlers.get(IPCChannels.Jtl.CreateOrder);
      const result = await handler({}, undefined);
      expect(result.success).toBe(false);
    });
  });

  test('registers all five handlers', () => {
    expect(handlers.has(IPCChannels.Jtl.GetFirmen)).toBe(true);
    expect(handlers.has(IPCChannels.Jtl.GetWarenlager)).toBe(true);
    expect(handlers.has(IPCChannels.Jtl.GetZahlungsarten)).toBe(true);
    expect(handlers.has(IPCChannels.Jtl.GetVersandarten)).toBe(true);
    expect(handlers.has(IPCChannels.Jtl.CreateOrder)).toBe(true);
  });
});
