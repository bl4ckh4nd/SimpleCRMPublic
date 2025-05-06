// simplecrmelectron/electron/database-schema.ts
export const CUSTOMERS_TABLE = 'customers';
export const PRODUCTS_TABLE = 'products';
export const DEAL_PRODUCTS_TABLE = 'deal_products';
export const SYNC_INFO_TABLE = 'sync_info'; // To store last sync status/time
export const CALENDAR_EVENTS_TABLE = 'calendar_events'; // Added
export const DEALS_TABLE = 'deals'; // Added deals table constant
export const TASKS_TABLE = 'tasks'; // Added tasks table constant

export const createCustomersTable = `
  CREATE TABLE IF NOT EXISTS ${CUSTOMERS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jtl_kKunde INTEGER UNIQUE NOT NULL, -- JTL primary key
    name TEXT,
    firstName TEXT,
    company TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    street TEXT,
    zipCode TEXT,
    city TEXT,
    country TEXT,
    jtl_dateCreated DATETIME,
    jtl_blocked BOOLEAN,
    status TEXT DEFAULT 'Active', -- App-specific status if needed
    notes TEXT,                  -- App-specific notes
    affiliateLink TEXT,          -- App-specific affiliate link
    lastModifiedLocally DATETIME DEFAULT CURRENT_TIMESTAMP, -- Track local changes (though sync is one-way for now)
    lastSynced DATETIME          -- Timestamp of the last sync for this record
  );
`;

export const createProductsTable = `
  CREATE TABLE IF NOT EXISTS ${PRODUCTS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jtl_kArtikel INTEGER UNIQUE NULL, -- Allow NULL for local products
    name TEXT NOT NULL,               -- Made NOT NULL
    sku TEXT UNIQUE NULL,             -- Allow NULL for local products
    description TEXT,
    price REAL NOT NULL DEFAULT 0.0, -- Added NOT NULL and DEFAULT
    isActive BOOLEAN NOT NULL DEFAULT 1, -- Added NOT NULL and DEFAULT
    dateCreated TEXT DEFAULT CURRENT_TIMESTAMP, -- Added (local creation date)
    lastModified TEXT DEFAULT CURRENT_TIMESTAMP, -- Renamed from lastModifiedLocally
    jtl_dateCreated TEXT NULL,       -- Changed type to TEXT for ISO string, kept from JTL
    lastSynced TEXT NULL,            -- Kept, changed type to TEXT
    lastModifiedLocally TEXT NULL    -- Added for sync conflict (can be same as lastModified initially)
  );
`;

// Added new table for Deal-Product relationship
export const createDealProductsTable = `
CREATE TABLE IF NOT EXISTS ${DEAL_PRODUCTS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_time_of_adding REAL NOT NULL,
    dateAdded TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE, -- Assuming 'deals' table exists with 'id' PK
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT, -- Or CASCADE, based on deletion policy
    UNIQUE(deal_id, product_id) -- Prevent adding the same product multiple times to the same deal
);
`;

// Store metadata about sync operations
export const createSyncInfoTable = `
  CREATE TABLE IF NOT EXISTS ${SYNC_INFO_TABLE} (
    key TEXT PRIMARY KEY,
    value TEXT,
    lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

// Added schema for calendar events
export const createCalendarEventsTable = `
  CREATE TABLE IF NOT EXISTS ${CALENDAR_EVENTS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date TEXT NOT NULL, -- ISO 8601 string
    end_date TEXT NOT NULL,   -- ISO 8601 string
    all_day INTEGER NOT NULL DEFAULT 0, -- Use INTEGER for boolean (0/1)
    color_code TEXT,
    event_type TEXT,
    recurrence_rule TEXT,     -- Storing recurrence as JSON string
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    -- user_id TEXT -- Removed user_id as it's local now
  );
`;

// Added schema for deals table
export const createDealsTable = `
  CREATE TABLE IF NOT EXISTS ${DEALS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    value REAL DEFAULT 0,
    stage TEXT NOT NULL,
    notes TEXT,
    created_date TEXT DEFAULT CURRENT_TIMESTAMP,
    expected_close_date TEXT,
    last_modified TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES ${CUSTOMERS_TABLE}(id) ON DELETE CASCADE
  );
`;

// Added schema for tasks table
export const createTasksTable = `
  CREATE TABLE IF NOT EXISTS ${TASKS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT NOT NULL,
    priority TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_date TEXT DEFAULT CURRENT_TIMESTAMP,
    last_modified TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES ${CUSTOMERS_TABLE}(id) ON DELETE CASCADE
  );
`;

export const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_customers_jtl_kKunde ON ${CUSTOMERS_TABLE}(jtl_kKunde);`,
    `CREATE INDEX IF NOT EXISTS idx_customers_name ON ${CUSTOMERS_TABLE}(name);`,
    `CREATE INDEX IF NOT EXISTS idx_customers_email ON ${CUSTOMERS_TABLE}(email);`,
    `CREATE INDEX IF NOT EXISTS idx_products_jtl_kArtikel ON ${PRODUCTS_TABLE}(jtl_kArtikel);`,
    `CREATE INDEX IF NOT EXISTS idx_products_sku ON ${PRODUCTS_TABLE}(sku);`,
    `CREATE INDEX IF NOT EXISTS idx_products_name ON ${PRODUCTS_TABLE}(name);`,
    // Added indexes for new table
    `CREATE INDEX IF NOT EXISTS idx_deal_products_deal_id ON ${DEAL_PRODUCTS_TABLE}(deal_id);`,
    `CREATE INDEX IF NOT EXISTS idx_deal_products_product_id ON ${DEAL_PRODUCTS_TABLE}(product_id);`,
    // Added indexes for calendar events
    `CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON ${CALENDAR_EVENTS_TABLE}(start_date);`,
    `CREATE INDEX IF NOT EXISTS idx_calendar_events_end_date ON ${CALENDAR_EVENTS_TABLE}(end_date);`,
    // Add indexes for deals and tasks
    `CREATE INDEX IF NOT EXISTS idx_deals_customer_id ON ${DEALS_TABLE}(customer_id);`,
    `CREATE INDEX IF NOT EXISTS idx_deals_stage ON ${DEALS_TABLE}(stage);`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON ${TASKS_TABLE}(customer_id);`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON ${TASKS_TABLE}(due_date);`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_completed ON ${TASKS_TABLE}(completed);`
]; 