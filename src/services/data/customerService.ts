import { Customer } from './types';

/**
 * Customer Service - Handles communication with the SQLite database through Electron IPC
 */
export const customerService = {
  /**
   * Fetch all customers
   */
  async getAllCustomers(): Promise<Customer[]> {
    try {
      const customers = await window.electronAPI.invoke('db:get-customers') as any[];
      return customers.map((customer: any) => ({
        ...customer,
        id: customer.id.toString(), // Ensure ID is a string
        zip: customer.zip || '' // Ensure zip is present and defaults to empty string
      }));
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
      const customer = await window.electronAPI.invoke('db:get-customer', Number(customerId));
      console.log('[CS] Raw customer from IPC:', JSON.stringify(customer)); // Log raw data
      if (!customer) return null;
      
      // Use type assertion to tell TypeScript about the expected structure
      const customerData = customer as Partial<Customer>;
      console.log('[CS] Customer data after cast:', JSON.stringify(customerData)); // Log cast data
      
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