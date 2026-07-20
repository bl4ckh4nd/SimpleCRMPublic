import type { Customer, Product } from './types';
import { IPC } from '@shared/ipc/channels';
import { invoke } from '@/lib/ipc';

type MutationResponse<T> = {
  success: boolean;
  error?: string;
} & T;

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString() : '';
}

function assertSuccess<T extends object>(
  response: MutationResponse<T>,
  fallbackMessage: string
): MutationResponse<T> {
  if (!response.success) {
    throw new Error(response.error || fallbackMessage);
  }

  return response;
}

type DbCustomer = Omit<Customer, 'id' | 'dateAdded'> & { id: string | number; jtl_dateCreated?: string | null };
type DbProduct = Omit<Product, 'id' | 'jtl_dateCreated'> & { id: string | number; jtl_dateCreated?: string | null };

const mapDbCustomerToApp = (dbCustomer: DbCustomer): Customer => ({
    id: dbCustomer.id.toString(),
    jtl_kKunde: dbCustomer.jtl_kKunde,
    customerNumber: dbCustomer.customerNumber,
    name: dbCustomer.name ?? '',
    firstName: dbCustomer.firstName,
    company: dbCustomer.company,
    email: dbCustomer.email,
    phone: dbCustomer.phone,
    mobile: dbCustomer.mobile,
    street: dbCustomer.street,
    zip: dbCustomer.zip,
    city: dbCustomer.city,
    country: dbCustomer.country,
    status: dbCustomer.status ?? 'Active',
    notes: dbCustomer.notes,
    affiliateLink: dbCustomer.affiliateLink,
    dateAdded: formatDate(dbCustomer.jtl_dateCreated),
    lastContact: '',
    customFields: dbCustomer.customFields,
});

const mapDbProductToApp = (dbProduct: DbProduct): Product => ({
    id: dbProduct.id.toString(),
    jtl_kArtikel: dbProduct.jtl_kArtikel,
    sku: dbProduct.sku,
    name: dbProduct.name,
    description: dbProduct.description,
    price: dbProduct.price,
    barcode: dbProduct.barcode,
    stockLevel: dbProduct.stockLevel,
    isActive: !!dbProduct.isActive,
    jtl_dateCreated: formatDate(dbProduct.jtl_dateCreated),
});

export const localDataService = {
  async getCustomers(): Promise<Customer[]> {
    const dbCustomers = await invoke(IPC.Db.GetCustomers, { includeCustomFields: true });
    return (dbCustomers as unknown as DbCustomer[]).map(mapDbCustomerToApp);
  },
  async getCustomer(id: string): Promise<Customer | null> {
    try {
      const dbCustomer = await invoke(IPC.Db.GetCustomer, Number(id));
      if (!dbCustomer) return null;
      return mapDbCustomerToApp(dbCustomer as unknown as DbCustomer);
    } catch (error) {
      console.error(`Error fetching customer with ID ${id}:`, error);
      return null;
    }
  },
  async createCustomer(data: Omit<Customer, 'id'>): Promise<Customer> {
    try {
      const response = assertSuccess(
        await invoke(IPC.Db.CreateCustomer, data),
        'Failed to create customer'
      );
      return mapDbCustomerToApp(response.customer as unknown as DbCustomer);
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },
  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    try {
      const response = assertSuccess(
        await invoke(IPC.Db.UpdateCustomer, { id: Number(id), customerData: data }),
        'Failed to update customer'
      );
      return mapDbCustomerToApp(response.customer as unknown as DbCustomer);
    } catch (error) {
      console.error(`Error updating customer with ID ${id}:`, error);
      throw error;
    }
  },
  async deleteCustomer(id: string): Promise<void> {
    try {
      assertSuccess(
        await invoke(IPC.Db.DeleteCustomer, Number(id)),
        'Failed to delete customer'
      );
    } catch (error) {
      console.error(`Error deleting customer with ID ${id}:`, error);
      throw error;
    }
  },
  async deleteCustomers(ids: string[]) {
    return invoke(IPC.Db.DeleteCustomers, { customerIds: ids.map(Number) });
  },

  // --- Products ---
  async getProducts(): Promise<Product[]> {
    try {
       const dbProducts = await invoke(IPC.Products.GetAll);
       return (dbProducts as unknown as DbProduct[]).map(mapDbProductToApp);
    } catch (error) {
        console.error("Error invoking 'db:get-products':", error);
        return [];
    }
  },
};
