import { z } from 'zod';

// Settings schema matches the form schema in settings/page.tsx
export const mssqlSettingsSchema = z.object({
  server: z.string().min(1, "Server is required"),
  database: z.string().min(1, "Database name is required"),
  user: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  port: z.coerce.number().int().min(1).max(65535),
  encrypt: z.boolean(),
  trustServerCertificate: z.boolean(),
});

export type MssqlSettings = z.infer<typeof mssqlSettingsSchema>;

// Error type for SQL-specific errors
export interface MssqlError extends Error {
  code?: string;
  sqlState?: string;
  sqlMessage?: string;
}

// Customer data type matching the database schema
export interface MssqlCustomerData {
  id: number; // kKunde
  customerNumber?: string; // cKundenNr
  dateCreated?: Date; // dErstellt
  newsletter?: boolean; // cNewsletter
  blocked?: boolean; // cSperre
  discount?: number; // fRabatt
  language?: number; // kSprache
  origin?: string; // cHerkunft
  creditLimit?: number; // nKreditlimit
  // Address fields from tAdresse
  company?: string; // cFirma
  title?: string; // cTitel
  firstName?: string; // cVorname
  lastName?: string; // cName
  street?: string; // cStrasse
  zipCode?: string; // cPLZ
  city?: string; // cOrt
  country?: string; // cLand
  phone?: string; // cTel
  mobile?: string; // cMobil
  email?: string; // cMail
  fax?: string; // cFax
  state?: string; // cBundesland
  countryCode?: string; // cISO
  isDefaultAddress?: boolean; // nStandard
  addressType?: number; // nTyp
  vatId?: string; // cUSTID
}

// Define a basic structure for JTL Product data based on common fields
// You will need to adjust this based on your actual dbo.tArtikel schema
export interface MssqlProductData {
  kArtikel: number; // Primary key
  cArtNr?: string; // SKU / Article Number
  cName?: string; // Product Name
  cBeschreibung?: string; // Description
  fVKNetto?: number; // Net Sales Price
  fVKBrutto?: number; // Gross Sales Price
  cBarcode?: string; // EAN Barcode
  fLagerbestand?: number; // Stock Level
  cAktiv?: string; // Active status (e.g., 'Y'/'N')
  dErstellt?: Date; // Creation Date
  // Add other relevant fields from tArtikel here
  // kHersteller?: number;
  // cKurzBeschreibung?: string;
  // fUVP?: number;
}

// --- SQLite Data Types ---

// Matches the columns in the 'products' table in SQLite
export interface Product {
    id: number;                 // Local primary key
    jtl_kArtikel: number | null; // JTL primary key (nullable for local products)
    name: string;
    sku: string | null;         // Stock Keeping Unit (nullable)
    description: string | null; // Product description
    price: number;              // Product price (REAL -> number)
    isActive: boolean;          // Whether the product is active (BOOLEAN -> boolean, map 0/1)
    dateCreated: string;        // Local creation date (ISO 8601 string)
    lastModified: string;       // Local modification date (ISO 8601 string)
    jtl_dateCreated: string | null; // Original JTL creation date (ISO 8601 string)
    lastSynced: string | null;  // Timestamp of last sync from JTL (ISO 8601 string)
    lastModifiedLocally: string | null; // Timestamp of last local modification
}

// Matches the columns in the 'deal_products' junction table
export interface DealProduct {
    id: number;                 // Primary key of the junction table entry
    deal_id: number;            // Foreign key to deals table
    product_id: number;         // Foreign key to products table
    quantity: number;
    price_at_time_of_adding: number; // Price when added (REAL -> number)
    dateAdded: string;          // Timestamp when added (ISO 8601 string)
}
