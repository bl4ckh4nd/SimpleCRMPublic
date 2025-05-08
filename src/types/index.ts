// src/types/index.ts

// Define the Product type for the frontend
// Matches the structure returned by the backend after mapping
export interface Product {
    id: number;                 // Local primary key
    jtl_kArtikel: number | null; // JTL primary key (nullable for local products)
    name: string;
    sku: string | null;         // Stock Keeping Unit (nullable)
    description: string | null; // Product description
    price: number;              // Product price
    isActive: boolean;          // Product status (mapped to boolean)
    dateCreated: string;        // Local creation date (ISO 8601 string)
    lastModified: string;       // Local modification date (ISO 8601 string)
    jtl_dateCreated: string | null; // Original JTL creation date (ISO 8601 string)
    lastSynced: string | null;  // Timestamp of last sync from JTL (ISO 8601 string)
    lastModifiedLocally: string | null; // Timestamp of last local modification
}

// Interface for products linked to a deal, extending the base Product type
export interface DealProductLink extends Product {
  deal_product_id: number; // Specific ID for the link entry in the deal_products table
  quantity: number;
  price_at_time_of_adding: number; // Price of the product when it was added to the deal
  dateAdded: string; // ISO 8601 string for when the product was added to the deal
}

// Define the Customer type for the frontend
export interface Customer {
  id: number; // Local primary key
  jtl_kKunde?: number | null; // JTL customer key
  name: string;
  company_name?: string | null;
  contact_person_name?: string | null;
  is_company?: boolean;
  salutation?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  notes?: string | null;
  // Add other fields as necessary from your database schema
  created_at?: string;
  updated_at?: string;
}

// You can add other shared frontend types here if needed

// Calendar Types
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  weekDays?: number[];
  monthDay?: number;
  endDate?: string;
  occurrences?: number;
  monthWeek?: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  color_code?: string;
  event_type?: string;
  recurrence_rule?: RecurrenceRule | string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarRBCEvent {
  id: number | string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  description?: string;
  color_code?: string;
  event_type?: string;
  recurrence_rule?: RecurrenceRule | string | null;
  created_at?: string;
  updated_at?: string;
}

// Utility types for Calendar
export type DragDropInfo = {
  event: CalendarRBCEvent;
  start: Date;
  end: Date;
};

// Type definition for the arguments of onEventResize
export type OnEventResizeArgs = {
  event: CalendarRBCEvent;
  start: string | Date;
  end: string | Date;
  isAllDay: boolean;
};

// Type definition for the arguments of onEventDrop
export interface OnEventDropArgs {
  event: CalendarRBCEvent;
  start: string | Date;
  end: string | Date;
  isAllDay: boolean;
  // Optional: Add resourceId if using resource views
}