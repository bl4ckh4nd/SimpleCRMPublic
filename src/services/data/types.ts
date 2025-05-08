// simplecrmelectron/src/services/data/types.ts

// Define basic App types based on usage and plan
export interface Customer {
    id: string; // Frontend might use string ID
    jtl_kKunde?: number;
    name: string;
    firstName?: string;
    company?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
    status: string;
    notes?: string;
    affiliateLink?: string;
    jtl_dateCreated?: string; // Date created in JTL
    dateAdded?: string; // From jtl_dateCreated or local creation
    lastModifiedLocally?: string; // For tracking when last modified locally
    lastContact?: string; // Not directly synced?
    // Add other fields as needed based on UI requirements
    // referredCustomers?: Customer[];
}

export interface Product {
     id: string; // Frontend might use string ID
     jtl_kArtikel: number;
     sku?: string;
     name?: string;
     description?: string;
     price?: number;
     barcode?: string;
     stockLevel?: number;
     isActive?: boolean;
     jtl_dateCreated?: string;
    // Add other fields as needed
}

// Add interface for Deal
export interface Deal {
    id: string | number;
    customer_id: string | number;
    name: string;
    value: number | string;
    stage: string;
    notes?: string;
    created_date: string;
    expected_close_date?: string;
    last_modified?: string;
}

// Add interface for Task
export interface Task {
    id: string | number;
    customer_id: string | number;
    customer_name?: string; // Added for joins with customer table
    title: string;
    description?: string;
    due_date: string;
    priority: string;
    completed: boolean | number;
    created_date?: string;
    last_modified?: string;
}

// Define the DataService interface based on usage in localDataService
export interface DataService {
    getCustomers(): Promise<Customer[]>;
    getCustomer(id: string): Promise<Customer | null>;
    createCustomer(data: Omit<Customer, 'id'>): Promise<Customer>;
    updateCustomer(id: string, data: Partial<Customer>): Promise<Customer>;
    deleteCustomer(id: string): Promise<void>;

    getProducts(): Promise<Product[]>;
    // Define other product methods if needed:
    // getProduct(id: string): Promise<Product | null>;
    // createProduct(data: Omit<Product, 'id'>): Promise<Product>;
    // updateProduct(id: string, data: Partial<Product>): Promise<Product>;
    // deleteProduct(id: string): Promise<void>;
} 