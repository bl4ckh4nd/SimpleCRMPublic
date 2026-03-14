import { IPCChannels } from '@shared/ipc/channels';
import { localDataService } from '@/services/data/localDataService';

describe('localDataService', () => {
  const invoke = jest.fn();

  beforeEach(() => {
    invoke.mockReset();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { invoke },
    });
  });

  test('maps customer database shape to frontend shape', async () => {
    invoke.mockResolvedValueOnce([
      {
        id: 15,
        customerNumber: 'K-15',
        name: 'Meyer',
        firstName: 'Anna',
        status: null,
        jtl_dateCreated: '2026-03-10T00:00:00.000Z',
      },
    ]);
    const customers = await localDataService.getCustomers();
    expect(customers[0].id).toBe('15');
    expect(customers[0].status).toBe('Active');
    expect(customers[0].customerNumber).toBe('K-15');
  });

  test('returns null when customer fetch fails', async () => {
    invoke.mockRejectedValueOnce(new Error('fail'));
    await expect(localDataService.getCustomer('5')).resolves.toBeNull();
  });

  test('creates customer through IPC and maps result', async () => {
    invoke.mockResolvedValueOnce({
      success: true,
      customer: { id: 21, name: 'New Customer', status: 'Lead' },
    });
    const created = await localDataService.createCustomer({ name: 'New Customer', status: 'Lead' } as any);
    expect(created.id).toBe('21');
    expect(invoke).toHaveBeenCalledWith(IPCChannels.Db.CreateCustomer, { name: 'New Customer', status: 'Lead' });
  });

  test('maps products and normalizes booleans', async () => {
    invoke.mockResolvedValueOnce([
      { id: 7, jtl_kArtikel: 10, name: 'Widget', isActive: 1 },
    ]);
    const products = await localDataService.getProducts();
    expect(products[0].id).toBe('7');
    expect(products[0].isActive).toBe(true);
  });
});
