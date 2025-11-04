import { Customer } from './types';
import { IPCChannels } from '@shared/ipc/channels';

const isDevelopment = import.meta.env.DEV;

/**
 * Customer Service - Handles communication with the SQLite database through Electron IPC
 */
export const customerService = {
  /**
   * Fetch all customers
   */
  async getAllCustomers(includeCustomFields: boolean = false): Promise<Customer[]> {
    try {
      if (isDevelopment) {
        console.debug(`🔍 [Frontend] customerService.getAllCustomers() called with includeCustomFields=${includeCustomFields}`);
      }
      
      const customers = await window.electronAPI.invoke<typeof IPCChannels.Db.GetCustomers>(
        IPCChannels.Db.GetCustomers,
        includeCustomFields
      ) as any[];
      if (isDevelopment) {
        console.debug(`🔍 [Frontend] customerService received ${customers.length} customers`);
      }
      
      const result = customers.map((customer: any) => ({
        ...customer,
        id: customer.id.toString(), // Ensure ID is a string
        zip: customer.zip || '' // Ensure zip is present and defaults to empty string
      }));
      
      if (isDevelopment) {
        console.debug(`🔍 [Frontend] customerService returning ${result.length} formatted customers`);
      }
      return result;
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      return [];
    }
  },

  /**
   * Get a single customer by ID
   */
  async getCustomerById(customerId: number | string): Promise<Customer | null> {
    try {
      const customer = await window.electronAPI.invoke<typeof IPCChannels.Db.GetCustomer>(
        IPCChannels.Db.GetCustomer,
        Number(customerId)
      );
      if (!customer) return null;
      
      // Use type assertion to tell TypeScript about the expected structure
      const customerData = customer as Partial<Customer>;
      
      return {
        ...customerData,
        id: customerData.id?.toString() || '', // Ensure ID is a string
        jtl_kKunde: customerData.jtl_kKunde || 0, // Provide default value
        name: customerData.name || '', // Provide default value
        status: customerData.status || '', // Provide default value
        zip: customerData.zip || '' // Ensure zip is present and defaults to empty string
      };
    } catch (error) {
      console.error(`Failed to fetch customer with ID ${customerId}:`, error);
      return null;
    }
  }
}; 
