import { Customer } from './types';

/**
 * Customer Service - Handles communication with the SQLite database through Electron IPC
 */
export const customerService = {
  /**
   * Fetch all customers
   */
  async getAllCustomers(includeCustomFields: boolean = false): Promise<Customer[]> {
    try {
      console.log(`🔍 [Frontend] customerService.getAllCustomers() called with includeCustomFields=${includeCustomFields}`);
      console.log(`🔍 [Frontend] CustomerService call stack:`, new Error().stack?.split('\n').slice(1, 6).join('\n'));
      
      const customers = await window.electronAPI.invoke('db:get-customers', includeCustomFields) as any[];
      console.log(`🔍 [Frontend] customerService received ${customers.length} customers`);
      
      const result = customers.map((customer: any) => ({
        ...customer,
        id: customer.id.toString(), // Ensure ID is a string
        zip: customer.zip || '' // Ensure zip is present and defaults to empty string
      }));
      
      console.log(`🔍 [Frontend] customerService returning ${result.length} formatted customers`);
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