import type { DataService, Customer, Product } from './types'; // Assuming Product type is added to types.ts

// Type mapping might be needed if frontend types differ slightly from SQLite types
const mapDbCustomerToApp = (dbCustomer: any): Customer => ({
    id: dbCustomer.id.toString(), // Convert SQLite int ID to string if needed by frontend
    jtl_kKunde: dbCustomer.jtl_kKunde,
    customerNumber: dbCustomer.customerNumber, // Map JTL customer number
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
    status: dbCustomer.status ?? 'Active', // Use default if null
    notes: dbCustomer.notes,
    affiliateLink: dbCustomer.affiliateLink,
    dateAdded: dbCustomer.jtl_dateCreated ? new Date(dbCustomer.jtl_dateCreated).toLocaleDateString() : '', // Format date
    lastContact: '', // This might need separate tracking if required
});

const mapDbProductToApp = (dbProduct: any): Product => ({
    id: dbProduct.id.toString(),
    jtl_kArtikel: dbProduct.jtl_kArtikel,
    sku: dbProduct.sku,
    name: dbProduct.name,
    description: dbProduct.description,
    price: dbProduct.price,
    barcode: dbProduct.barcode,
    stockLevel: dbProduct.stockLevel,
    isActive: !!dbProduct.isActive,
    jtl_dateCreated: dbProduct.jtl_dateCreated ? new Date(dbProduct.jtl_dateCreated).toLocaleDateString() : '',
     // ... map other fields ...
});

export const localDataService: DataService = {
  async getCustomers(): Promise<Customer[]> {
    try {
      if (!window.electronAPI) {
        throw new Error("Electron API not available for 'db:get-customers'");
      }
      // Use type assertion to avoid TypeScript errors
      const api = window.electronAPI as any;
      const dbCustomers = await api.invoke('db:get-customers', false); // Skip custom fields for performance
      return dbCustomers.map(mapDbCustomerToApp);
    } catch (error) {
        console.error("Error invoking 'db:get-customers':", error);
        // You might want to return an empty array or re-throw depending on desired UI behavior
        return [];
    }
  },
  async getCustomer(id: string): Promise<Customer | null> {
    try {
      if (!window.electronAPI) {
        throw new Error("Electron API not available for 'db:get-customer'");
      }
      
      // Use type assertion to avoid TypeScript errors
      const api = window.electronAPI as any;
      
      // Call the main process to get a specific customer by ID
      const dbCustomer = await api.invoke('db:get-customer', { id });
      
      // If no customer found, return null
      if (!dbCustomer) return null;
      
      // Map the customer data to the Customer type
      return mapDbCustomerToApp(dbCustomer);
    } catch (error) {
      console.error(`Error fetching customer with ID ${id}:`, error);
      return null;
    }
  },
  async createCustomer(data: Omit<Customer, 'id'>): Promise<Customer> {
    try {
      if (!window.electronAPI) {
        throw new Error("Electron API not available for 'db:create-customer'");
      }
      
      const api = window.electronAPI as any;
      const response = await api.invoke('db:create-customer', data);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create customer');
      }
      
      return mapDbCustomerToApp(response.customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },
  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    try {
      if (!window.electronAPI) {
        throw new Error("Electron API not available for 'db:update-customer'");
      }
      
      const api = window.electronAPI as any;
      const response = await api.invoke('db:update-customer', { id: Number(id), customerData: data });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update customer');
      }
      
      return mapDbCustomerToApp(response.customer);
    } catch (error) {
      console.error(`Error updating customer with ID ${id}:`, error);
      throw error;
    }
  },
  async deleteCustomer(id: string): Promise<void> {
    try {
      if (!window.electronAPI) {
        throw new Error("Electron API not available for 'db:delete-customer'");
      }
      
      const api = window.electronAPI as any;
      const response = await api.invoke('db:delete-customer', Number(id));
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete customer');
      }
    } catch (error) {
      console.error(`Error deleting customer with ID ${id}:`, error);
      throw error;
    }
  },

  // --- Products ---
  async getProducts(): Promise<Product[]> {
    try {
       if (!window.electronAPI) {
         throw new Error("Electron API not available for 'db:get-products'");
       }
       // Use type assertion to avoid TypeScript errors
       const api = window.electronAPI as any;
       const dbProducts = await api.invoke('db:get-products');
       return dbProducts.map(mapDbProductToApp);
    } catch (error) {
        console.error("Error invoking 'db:get-products':", error);
        return [];
    }
  },
  // getProduct, createProduct, updateProduct, deleteProduct...
};

export const getLocalCustomers = async (): Promise<Customer[]> => {
    console.log("localDataService: getLocalCustomers called");
    // Check if electronAPI and invoke exist before calling
    if (!window.electronAPI || !(window.electronAPI as any).invoke) {
        console.warn("Electron API not available for getLocalCustomers.");
        return []; // Return empty array or throw error if API is essential
    }
    try {
        // Use type assertion for invoke if TS struggles with the type
        const dbCustomers = await (window.electronAPI as any).invoke('db:get-customers', false); // Skip custom fields for performance
        console.log("localDataService: Received customers from main:", dbCustomers);

        // Basic validation (can be expanded with Zod)
        if (!Array.isArray(dbCustomers)) {
            console.error("localDataService: Received invalid data format for customers.");
            throw new Error("Invalid data format received from local database for customers.");
        }

        // Map to Customer type, ensuring all required fields are present
        return dbCustomers.map((c: any): Customer => ({            id: c.KundeNr?.toString() ?? '', // Ensure ID is string and handle null/undefined
            jtl_kKunde: c.KundeNr, // Map jtl_kKunde from KundeNr (assumption)
            name: c.Name1 || '', // Map name from Name1 (assumption)
            status: c.Status || 'Active', // Map status from Status (assumption)
            firstName: c.Vorname || '', // Adjust field names based on actual source data
            company: c.Firma || '', // Adjust field names
            phone: c.Telefon || '',
            street: c.Strasse || '',
            zip: c.PLZ || '',
            city: c.Ort || '',
            country: c.Land || '',
            notes: c.Notiz || '',
            affiliateLink: c.affiliateLink || '',
            dateAdded: c.Erfassungsdatum ? new Date(c.Erfassungsdatum).toLocaleDateString() : '',
            lastContact: '', // Example default
        }));
    } catch (error) {
        console.error("Error fetching local customers:", error);
        // Consider how to handle errors - rethrow, return empty, etc.
        throw error; // Rethrow the error to be handled by the caller
    }
};

// --- Products ---
export const getLocalProducts = async (): Promise<Product[]> => {
    console.log("localDataService: getLocalProducts called");
    // Check if electronAPI and invoke exist before calling
    if (!window.electronAPI || !(window.electronAPI as any).invoke) {
        console.warn("Electron API not available for getLocalProducts.");
        return []; // Return empty array or throw error if API is essential
    }
    try {
         // Use type assertion for invoke if TS struggles with the type
        const dbProducts = await (window.electronAPI as any).invoke('db:get-products');
        console.log("localDataService: Received products from main:", dbProducts);

        // Basic validation
        if (!Array.isArray(dbProducts)) {
            console.error("localDataService: Received invalid data format for products.");
            throw new Error("Invalid data format received from local database for products.");
        }

        // Map to Product type, ensuring all required fields are present
        return dbProducts.map((p: any): Product => ({
            id: p.ArtikelNr?.toString() ?? '', // Ensure ID is string and handle null/undefined
            jtl_kArtikel: p.ArtikelNr, // Map jtl_kArtikel from ArtikelNr (assumption)
            name: p.Artikel || '', // Map name from Artikel (assumption)
            description: p.Beschreibung || '', // Map description from Beschreibung (assumption)
            sku: p.cArtNr || '', // Adjust field names based on actual source data
            price: p.Preis || 0,
            barcode: p.cBarcode || '',
            stockLevel: p.fLagerbestand || 0,
            isActive: p.cAktiv === 'Y', // Example mapping
            jtl_dateCreated: p.Erfassungsdatum ? new Date(p.Erfassungsdatum).toLocaleDateString() : '',
        }));
    } catch (error) {
        console.error("Error fetching local products:", error);
        throw error; // Rethrow the error
    }
};