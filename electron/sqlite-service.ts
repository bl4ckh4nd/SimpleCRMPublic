import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import {
    createCustomersTable,
    createProductsTable,
    createSyncInfoTable,
    createDealProductsTable,
    createCalendarEventsTable,
    createDealsTable,
    createTasksTable,
    createCustomerCustomFieldsTable,
    createCustomerCustomFieldValuesTable,
    indexes,
    CUSTOMERS_TABLE,
    PRODUCTS_TABLE,
    DEAL_PRODUCTS_TABLE,
    SYNC_INFO_TABLE,
    CALENDAR_EVENTS_TABLE,
    DEALS_TABLE,
    TASKS_TABLE,
    CUSTOMER_CUSTOM_FIELDS_TABLE,
    CUSTOMER_CUSTOM_FIELD_VALUES_TABLE,
    JTL_FIRMEN_TABLE,
    JTL_WARENLAGER_TABLE,
    JTL_ZAHLUNGSARTEN_TABLE,
    JTL_VERSANDARTEN_TABLE,
    createJtlFirmenTable,
    createJtlWarenlagerTable,
    createJtlZahlungsartenTable,
    createJtlVersandartenTable
} from './database-schema';
import { Product, DealProduct } from './types';
// Optional: import Knex from 'knex';

const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
let db: Database.Database;
// Optional: let knex: Knex.Knex;
const isDevelopment = process.env.NODE_ENV === 'development';

const sqliteVerboseLogger = (...args: unknown[]) => {
    if (isDevelopment) {
        console.debug('[SQLite]', ...args);
    }
};

export function initializeDatabase() {
    const dbExists = fs.existsSync(dbPath);
    db = new Database(dbPath, isDevelopment ? { verbose: sqliteVerboseLogger } : undefined);

    if (!dbExists) {
        if (isDevelopment) {
            console.debug('Initializing new SQLite database...');
        }
        try {
            // Enable Foreign Keys support right away
            db.exec('PRAGMA foreign_keys = ON;');

            db.exec(createCustomersTable);
            db.exec(createProductsTable);
            db.exec(createSyncInfoTable);
            db.exec(createDealsTable);
            db.exec(createTasksTable);
            db.exec(createDealProductsTable);
            db.exec(createCalendarEventsTable);
            db.exec(createCustomerCustomFieldsTable);
            db.exec(createCustomerCustomFieldValuesTable);
            db.exec(createJtlFirmenTable);
            db.exec(createJtlWarenlagerTable);
            db.exec(createJtlZahlungsartenTable);
            db.exec(createJtlVersandartenTable);
            indexes.forEach(index => db.exec(index));
            // Seed initial sync info if needed
            setSyncInfo('lastSyncStatus', 'Never');
            setSyncInfo('lastSyncTimestamp', '');
            if (isDevelopment) {
                console.debug('Database initialized successfully.');
            }
        } catch (error) {
            console.error('Failed to initialize database schema:', error);
            throw error; // Rethrow to prevent app start with bad DB
        }
    } else {
        if (isDevelopment) {
            console.debug('Database already exists.');
        }
        // Ensure Foreign Keys are enabled on existing DBs too
        db.exec('PRAGMA foreign_keys = ON;');
        // Here you could add migration logic if schema changes
        // Example: Check if deal_products table exists and create if not
        const checkTableStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");

        // Helper function to check and create table with its indexes
        const ensureTableExists = (tableName: string, createTableSql: string, tableIndexes: string[]) => {
            if (!checkTableStmt.get(tableName)) {
                console.log(`Table ${tableName} not found, creating...`);
                try {
                    db.exec(createTableSql);
                    tableIndexes.forEach(indexSql => {
                        // Ensure the index creation SQL targets the correct table, e.g., by checking if tableName is in indexSql
                        if (indexSql.includes(tableName)) {
                           db.exec(indexSql);
                        }
                    });
                    console.log(`Table ${tableName} and its specific indexes created.`);
                } catch (error) {
                    console.error(`Failed to create table ${tableName} or its indexes:`, error);
                }
            }
        };

        ensureTableExists(DEAL_PRODUCTS_TABLE, createDealProductsTable, [
            `CREATE INDEX IF NOT EXISTS idx_deal_products_deal_id ON ${DEAL_PRODUCTS_TABLE}(deal_id);`,
            `CREATE INDEX IF NOT EXISTS idx_deal_products_product_id ON ${DEAL_PRODUCTS_TABLE}(product_id);`
        ]);
        ensureTableExists(DEALS_TABLE, createDealsTable, [
            `CREATE INDEX IF NOT EXISTS idx_deals_customer_id ON ${DEALS_TABLE}(customer_id);`,
            `CREATE INDEX IF NOT EXISTS idx_deals_stage ON ${DEALS_TABLE}(stage);`
        ]);
        ensureTableExists(TASKS_TABLE, createTasksTable, [
            `CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON ${TASKS_TABLE}(customer_id);`,
            `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON ${TASKS_TABLE}(due_date);`,
            `CREATE INDEX IF NOT EXISTS idx_tasks_completed ON ${TASKS_TABLE}(completed);`
        ]);
        ensureTableExists(CALENDAR_EVENTS_TABLE, createCalendarEventsTable, [
            `CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON ${CALENDAR_EVENTS_TABLE}(start_date);`,
            `CREATE INDEX IF NOT EXISTS idx_calendar_events_end_date ON ${CALENDAR_EVENTS_TABLE}(end_date);`
        ]);
        ensureTableExists(JTL_FIRMEN_TABLE, createJtlFirmenTable, [
            `CREATE INDEX IF NOT EXISTS idx_jtl_firmen_name ON ${JTL_FIRMEN_TABLE}(cName);`
        ]);
        ensureTableExists(JTL_WARENLAGER_TABLE, createJtlWarenlagerTable, [
            `CREATE INDEX IF NOT EXISTS idx_jtl_warenlager_name ON ${JTL_WARENLAGER_TABLE}(cName);`
        ]);
        ensureTableExists(JTL_ZAHLUNGSARTEN_TABLE, createJtlZahlungsartenTable, [
            `CREATE INDEX IF NOT EXISTS idx_jtl_zahlungsarten_name ON ${JTL_ZAHLUNGSARTEN_TABLE}(cName);`
        ]);
        ensureTableExists(JTL_VERSANDARTEN_TABLE, createJtlVersandartenTable, [
            `CREATE INDEX IF NOT EXISTS idx_jtl_versandarten_name ON ${JTL_VERSANDARTEN_TABLE}(cName);`
        ]);

        // Ensure custom fields tables exist
        ensureTableExists(CUSTOMER_CUSTOM_FIELDS_TABLE, createCustomerCustomFieldsTable, [
            `CREATE INDEX IF NOT EXISTS idx_customer_custom_fields_name ON ${CUSTOMER_CUSTOM_FIELDS_TABLE}(name);`,
            `CREATE INDEX IF NOT EXISTS idx_customer_custom_fields_active ON ${CUSTOMER_CUSTOM_FIELDS_TABLE}(active);`,
            `CREATE INDEX IF NOT EXISTS idx_customer_custom_fields_display_order ON ${CUSTOMER_CUSTOM_FIELDS_TABLE}(display_order);`,
            // Covering index for the batch query
            `CREATE INDEX IF NOT EXISTS idx_cf_active_display ON ${CUSTOMER_CUSTOM_FIELDS_TABLE}(active, display_order, name) WHERE active = 1;`
        ]);

        ensureTableExists(CUSTOMER_CUSTOM_FIELD_VALUES_TABLE, createCustomerCustomFieldValuesTable, [
            `CREATE INDEX IF NOT EXISTS idx_customer_custom_field_values_customer_id ON ${CUSTOMER_CUSTOM_FIELD_VALUES_TABLE}(customer_id);`,
            `CREATE INDEX IF NOT EXISTS idx_customer_custom_field_values_field_id ON ${CUSTOMER_CUSTOM_FIELD_VALUES_TABLE}(field_id);`,
            // Composite index for optimized custom field queries
            `CREATE INDEX IF NOT EXISTS idx_cfv_customer_field_composite ON ${CUSTOMER_CUSTOM_FIELD_VALUES_TABLE}(customer_id, field_id);`
        ]);

        // Run migrations for schema updates
        runMigrations();
    }

    // Optional Knex initialization
    // knex = Knex({
    //   client: 'better-sqlite3',
    //   connection: { filename: dbPath },
    //   useNullAsDefault: true
    // });

    console.log(`Database connection established: ${dbPath}`);
    setupPragmas();
}

function setupPragmas() {
    if (!db) return;
    db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    db.pragma('synchronous = NORMAL'); // Good balance of safety and speed
    // Foreign keys are enabled in initializeDatabase now
}

/**
 * Run database migrations to update schema for existing databases
 */
function runMigrations() {
    if (!db) return;

    try {
        // Migration: Add value_calculation_method column to deals table if it doesn't exist
        const checkColumnStmt = db.prepare(`PRAGMA table_info(${DEALS_TABLE})`);
        const columns = checkColumnStmt.all();

        // Check if value_calculation_method column exists
        const hasValueCalculationMethod = columns.some((col: any) => col.name === 'value_calculation_method');

        if (!hasValueCalculationMethod) {
            console.log('Adding value_calculation_method column to deals table...');
            db.exec(`ALTER TABLE ${DEALS_TABLE} ADD COLUMN value_calculation_method TEXT DEFAULT 'static'`);
            console.log('Migration completed: Added value_calculation_method column to deals table');
        }

        // Migration: Add calendar_event_id column to tasks table if it doesn't exist
        const taskColumnsStmt = db.prepare(`PRAGMA table_info(${TASKS_TABLE})`);
        const taskColumns = taskColumnsStmt.all();
        const hasCalendarEventId = taskColumns.some((col: any) => col.name === 'calendar_event_id');

        if (!hasCalendarEventId) {
            console.log('Adding calendar_event_id column to tasks table...');
            db.exec(`ALTER TABLE ${TASKS_TABLE} ADD COLUMN calendar_event_id INTEGER`);
            console.log('Migration completed: Added calendar_event_id column to tasks table');
        }

        // Migration: Add task_id column to calendar events table if it doesn't exist
        const calendarColumnsStmt = db.prepare(`PRAGMA table_info(${CALENDAR_EVENTS_TABLE})`);
        const calendarColumns = calendarColumnsStmt.all();
        const hasTaskId = calendarColumns.some((col: any) => col.name === 'task_id');

        if (!hasTaskId) {
            console.log('Adding task_id column to calendar events table...');
            db.exec(`ALTER TABLE ${CALENDAR_EVENTS_TABLE} ADD COLUMN task_id INTEGER`);
            console.log('Migration completed: Added task_id column to calendar events table');
        }

        // Migration: Add customerNumber column to customers table if it doesn't exist
        const customerColumns = db.prepare(`PRAGMA table_info(${CUSTOMERS_TABLE})`).all();
        const hasCustomerNumber = customerColumns.some((col: any) => col.name === 'customerNumber');

        if (!hasCustomerNumber) {
            console.log('Adding customerNumber column to customers table...');
            db.exec(`ALTER TABLE ${CUSTOMERS_TABLE} ADD COLUMN customerNumber TEXT`);
            console.log('Migration completed: Added customerNumber column to customers table');
        }

        // Add more migrations here as needed

    } catch (error) {
        console.error('Error running migrations:', error);
    }
}


export function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}

// --- Custom Fields Functions ---

// Get all custom field definitions
export function getAllCustomFields() {
    const stmt = getDb().prepare(`
        SELECT * FROM ${CUSTOMER_CUSTOM_FIELDS_TABLE}
        ORDER BY display_order ASC, name ASC
    `);
    return stmt.all();
}

// Get active custom field definitions
export function getActiveCustomFields() {
    console.log(`🔍 [SQLite] getActiveCustomFields() called`);
    const stmt = getDb().prepare(`
        SELECT * FROM ${CUSTOMER_CUSTOM_FIELDS_TABLE}
        WHERE active = 1
        ORDER BY display_order ASC, name ASC
    `);
    const result = stmt.all();
    console.log(`🔍 [SQLite] Found ${result.length} active custom fields`);
    return result;
}

// Get a single custom field by ID
export function getCustomFieldById(id: number) {
    const stmt = getDb().prepare(`
        SELECT * FROM ${CUSTOMER_CUSTOM_FIELDS_TABLE}
        WHERE id = ?
    `);
    return stmt.get(id);
}

// Create a new custom field
export function createCustomField(fieldData: any) {
    const now = new Date().toISOString();
    const stmt = getDb().prepare(`
        INSERT INTO ${CUSTOMER_CUSTOM_FIELDS_TABLE} (
            name, label, type, required, options, default_value,
            placeholder, description, display_order, active,
            created_at, updated_at
        ) VALUES (
            @name, @label, @type, @required, @options, @default_value,
            @placeholder, @description, @display_order, @active,
            @now, @now
        )
    `);

    // Convert boolean to integer for SQLite
    const required = fieldData.required ? 1 : 0;
    const active = fieldData.active !== undefined ? (fieldData.active ? 1 : 0) : 1;

    // Convert options to JSON string if it's an object/array
    const options = fieldData.options ?
        (typeof fieldData.options === 'string' ? fieldData.options : JSON.stringify(fieldData.options)) :
        null;

    const result = stmt.run({
        ...fieldData,
        required,
        active,
        options,
        now
    });

    if (result.lastInsertRowid) {
        return getCustomFieldById(Number(result.lastInsertRowid));
    }
    return null;
}

// Update an existing custom field
export function updateCustomField(id: number, fieldData: any) {
    const now = new Date().toISOString();
    const existingField = getCustomFieldById(id);

    if (!existingField) {
        throw new Error(`Custom field with ID ${id} not found`);
    }    // Build update assignments dynamically based on provided data
    const updateAssignments: string[] = [];
    const params: any = { id, now };

    // Handle each field that might be updated
    if (fieldData.name !== undefined) {
        updateAssignments.push('name = @name');
        params.name = fieldData.name;
    }

    if (fieldData.label !== undefined) {
        updateAssignments.push('label = @label');
        params.label = fieldData.label;
    }

    if (fieldData.type !== undefined) {
        updateAssignments.push('type = @type');
        params.type = fieldData.type;
    }

    if (fieldData.required !== undefined) {
        updateAssignments.push('required = @required');
        params.required = fieldData.required ? 1 : 0;
    }

    if (fieldData.options !== undefined) {
        updateAssignments.push('options = @options');
        params.options = typeof fieldData.options === 'string' ?
            fieldData.options : JSON.stringify(fieldData.options);
    }

    if (fieldData.default_value !== undefined) {
        updateAssignments.push('default_value = @default_value');
        params.default_value = fieldData.default_value;
    }

    if (fieldData.placeholder !== undefined) {
        updateAssignments.push('placeholder = @placeholder');
        params.placeholder = fieldData.placeholder;
    }

    if (fieldData.description !== undefined) {
        updateAssignments.push('description = @description');
        params.description = fieldData.description;
    }

    if (fieldData.display_order !== undefined) {
        updateAssignments.push('display_order = @display_order');
        params.display_order = fieldData.display_order;
    }

    if (fieldData.active !== undefined) {
        updateAssignments.push('active = @active');
        params.active = fieldData.active ? 1 : 0;
    }

    // Always update the updated_at timestamp
    updateAssignments.push('updated_at = @now');

    if (updateAssignments.length === 0) {
        return existingField; // Nothing to update
    }

    const stmt = getDb().prepare(`
        UPDATE ${CUSTOMER_CUSTOM_FIELDS_TABLE}
        SET ${updateAssignments.join(', ')}
        WHERE id = @id
    `);

    const result = stmt.run(params);

    if (result.changes > 0) {
        return getCustomFieldById(id);
    }
    return existingField;
}

// Delete a custom field
export function deleteCustomField(id: number) {
    // First delete all values associated with this field
    const deleteValuesStmt = getDb().prepare(`
        DELETE FROM ${CUSTOMER_CUSTOM_FIELD_VALUES_TABLE}
        WHERE field_id = ?
    `);
    deleteValuesStmt.run(id);

    // Then delete the field itself
    const deleteFieldStmt = getDb().prepare(`
        DELETE FROM ${CUSTOMER_CUSTOM_FIELDS_TABLE}
        WHERE id = ?
    `);
    const result = deleteFieldStmt.run(id);

    return result.changes > 0;
}

// Get custom field values for a specific customer
export function getCustomFieldValuesForCustomer(customerId: number) {
    const stmt = getDb().prepare(`
        SELECT cfv.id, cfv.customer_id, cfv.field_id, cfv.value,
               cf.name, cf.label, cf.type, cf.required, cf.options,
               cf.default_value, cf.placeholder, cf.description
        FROM ${CUSTOMER_CUSTOM_FIELD_VALUES_TABLE} cfv
        JOIN ${CUSTOMER_CUSTOM_FIELDS_TABLE} cf ON cfv.field_id = cf.id
        WHERE cfv.customer_id = ? AND cf.active = 1
        ORDER BY cf.display_order ASC, cf.name ASC
    `);
    return stmt.all(customerId);
}

// Batch load custom field values for multiple customers (optimized)
export function getCustomFieldValuesForAllCustomers(): Map<number, CustomFieldValueRecord[]> {
    console.log(`🔍 [SQLite] getCustomFieldValuesForAllCustomers() called - This is the EXPENSIVE operation!`);
    const startTime = Date.now();
    
    const stmt = getDb().prepare(`
        SELECT cfv.id, cfv.customer_id, cfv.field_id, cfv.value,
               cf.name, cf.label, cf.type, cf.required, cf.options,
               cf.default_value, cf.placeholder, cf.description
        FROM ${CUSTOMER_CUSTOM_FIELD_VALUES_TABLE} cfv
        JOIN ${CUSTOMER_CUSTOM_FIELDS_TABLE} cf ON cfv.field_id = cf.id
        WHERE cf.active = 1
        ORDER BY cfv.customer_id, cf.display_order ASC, cf.name ASC
    `);
    
    const allValues = stmt.all() as CustomFieldValueRecord[];
    console.log(`🔍 [SQLite] Loaded ${allValues.length} custom field values in ${Date.now() - startTime}ms`);
    
    const valuesByCustomer = new Map<number, CustomFieldValueRecord[]>();
    
    for (const value of allValues) {
        if (!valuesByCustomer.has(value.customer_id)) {
            valuesByCustomer.set(value.customer_id, []);
        }
        valuesByCustomer.get(value.customer_id)!.push(value);
    }
    
    console.log(`🔍 [SQLite] Processed custom fields for ${valuesByCustomer.size} customers`);
    return valuesByCustomer;
}

// Set a custom field value for a customer
export function setCustomFieldValue(customerId: number, fieldId: number, value: any) {
    const now = new Date().toISOString();

    // Check if the field exists
    const field = getCustomFieldById(fieldId);
    if (!field) {
        throw new Error(`Custom field with ID ${fieldId} not found`);
    }

    // Check if the customer exists
    const customer = getCustomerById(customerId);
    if (!customer) {
        throw new Error(`Customer with ID ${customerId} not found`);
    }

    // Convert value to string for storage
    const stringValue = value !== null && value !== undefined ?
        (typeof value === 'object' ? JSON.stringify(value) : String(value)) :
        null;

    // Use upsert pattern (INSERT OR REPLACE)
    const stmt = getDb().prepare(`
        INSERT INTO ${CUSTOMER_CUSTOM_FIELD_VALUES_TABLE} (
            customer_id, field_id, value, created_at, updated_at
        ) VALUES (
            @customer_id, @field_id, @value, @now, @now
        )
        ON CONFLICT(customer_id, field_id) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
    `);

    const result = stmt.run({
        customer_id: customerId,
        field_id: fieldId,
        value: stringValue,
        now
    });

    return result.changes > 0;
}

// Delete a custom field value
export function deleteCustomFieldValue(customerId: number, fieldId: number) {
    const stmt = getDb().prepare(`
        DELETE FROM ${CUSTOMER_CUSTOM_FIELD_VALUES_TABLE}
        WHERE customer_id = ? AND field_id = ?
    `);
    const result = stmt.run(customerId, fieldId);

    return result.changes > 0;
}

// Delete all custom field values for a customer
export function deleteAllCustomFieldValuesForCustomer(customerId: number) {
    const stmt = getDb().prepare(`
        DELETE FROM ${CUSTOMER_CUSTOM_FIELD_VALUES_TABLE}
        WHERE customer_id = ?
    `);
    const result = stmt.run(customerId);

    return result.changes > 0;
}

// --- Sync Info ---
export function getSyncInfo(key: string): string | null {
    const stmt = getDb().prepare(`SELECT value FROM ${SYNC_INFO_TABLE} WHERE key = ?`);
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value ?? null;
}

export function setSyncInfo(key: string, value: string): void {
    const stmt = getDb().prepare(`
        INSERT INTO ${SYNC_INFO_TABLE} (key, value, lastUpdated)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            lastUpdated = excluded.lastUpdated
    `);
    stmt.run(key, value);
}

// Define interfaces for custom field types
interface CustomFieldDefinition {
    id: number;
    name: string;
    label: string;
    type: string;
    required: number;
    options?: string;
    default_value?: string;
    placeholder?: string;
    description?: string;
    display_order: number;
    active: number;
    created_at: string;
    updated_at: string;
}

interface CustomFieldValueRecord {
    id: number;
    customer_id: number;
    field_id: number;
    value: string | null;
    created_at: string;
    updated_at: string;
    name?: string;
    label?: string;
    type?: string;
    required?: number;
    options?: string;
    default_value?: string;
    placeholder?: string;
    description?: string;
}

// --- Customer Operations ---

// Lightweight function for dropdown population - no custom fields
export function getCustomersForDropdown(): any[] {
    const stmt = getDb().prepare(`
        SELECT id, name, firstName, company, customerNumber 
        FROM ${CUSTOMERS_TABLE} 
        ORDER BY name
        LIMIT 100
    `);
    return stmt.all().map((customer: any) => ({
        id: customer.id,
        name: customer.name || customer.firstName || customer.company || 'Unknown',
        customerNumber: customer.customerNumber
    }));
}

// Search customers with limit for autocomplete/combobox
export function searchCustomers(query: string = '', limit: number = 20): any[] {
    console.log(`🔍 [SQLite] searchCustomers() called with query: "${query}", limit: ${limit}`);
    console.log(`🔍 [SQLite] SearchCustomers call stack:`, new Error().stack?.split('\n').slice(1, 6).join('\n'));
    
    const startTime = Date.now();
    let sql = `
        SELECT id, name, firstName, company, customerNumber, email
        FROM ${CUSTOMERS_TABLE}
    `;
    
    const params: any[] = [];
    
    if (query && query.trim() !== '') {
        console.log(`🔍 [SQLite] Building search query with term: "${query}"`);
    } else {
        console.log(`🔍 [SQLite] No search query provided, will return first ${limit} customers`);
    }
    
    if (query && query.trim() !== '') {
        sql += ` WHERE (
            name LIKE ? OR 
            firstName LIKE ? OR 
            company LIKE ? OR 
            customerNumber LIKE ? OR
            email LIKE ?
        )`;
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    sql += ` ORDER BY 
        CASE 
            WHEN name LIKE ? THEN 1
            WHEN firstName LIKE ? THEN 2
            WHEN company LIKE ? THEN 3
            ELSE 4
        END,
        name ASC
        LIMIT ?`;
    
    if (query && query.trim() !== '') {
        const startTerm = `${query}%`;
        params.push(startTerm, startTerm, startTerm);
    } else {
        params.push('', '', '');
    }
    params.push(limit);
    
    if (isDevelopment) {
        console.debug(`🔍 [SQLite] Executing customer search SQL with ${params.length} parameters`);
    }
    const stmt = getDb().prepare(sql);
    const results = stmt.all(...params);
    const loadTime = Date.now() - startTime;
    
    if (isDevelopment) {
        console.debug(`🔍 [SQLite] searchCustomers() found ${results.length} customers in ${loadTime}ms`);
    }
    
    return results.map((customer: any) => ({
        id: customer.id,
        name: customer.name || customer.firstName || customer.company || 'Unknown',
        customerNumber: customer.customerNumber,
        email: customer.email
    }));
}

export function getAllCustomers(includeCustomFields: boolean = false): any[] {
    if (isDevelopment) {
        console.debug(`🔍 [SQLite] getAllCustomers() called with includeCustomFields=${includeCustomFields}`);
    }
    
    const startTime = Date.now();
    const stmt = getDb().prepare(`SELECT * FROM ${CUSTOMERS_TABLE} ORDER BY name`);
    const customers = stmt.all();
    if (isDevelopment) {
        console.debug(`🔍 [SQLite] Loaded ${customers.length} customers in ${Date.now() - startTime}ms`);
    }

    // Skip custom field loading if not needed
    if (!includeCustomFields) {
        if (isDevelopment) {
            console.debug(`🔍 [SQLite] Skipping custom fields, returning ${customers.length} customers`);
        }
        return customers;
    }

    if (isDevelopment) {
        console.debug(`🔍 [SQLite] Loading custom fields for ${customers.length} customers...`);
    }
    // Get all active custom fields
    const activeFields = getActiveCustomFields() as CustomFieldDefinition[];

    if (activeFields.length === 0) {
        return customers; // No custom fields to process
    }

    // Batch load all custom field values in a single query
    const customFieldValuesByCustomer = getCustomFieldValuesForAllCustomers();

    // For each customer, attach custom field values from the batch-loaded data
    return customers.map((customer: any) => {
        if (!customer || typeof customer.id === 'undefined') {
            return customer; // Skip if customer is invalid
        }

        const customFieldValues = customFieldValuesByCustomer.get(customer.id) || [];

        // Create a customFields object with field name as key and value as value
        const customFields: Record<string, any> = {};
        customFieldValues.forEach((field: CustomFieldValueRecord) => {
            // Parse value based on field type
            let parsedValue: any = field.value;
            if (field.type === 'number' && parsedValue !== null) {
                parsedValue = parseFloat(parsedValue);
            } else if (field.type === 'boolean' && parsedValue !== null) {
                parsedValue = parsedValue === 'true' || parsedValue === '1';
            } else if (field.type === 'date' && parsedValue !== null) {
                // Keep as string for date fields
            } else if (field.type === 'select' && parsedValue !== null) {
                // Keep as string for select fields
            }

            if (field.name) {
                customFields[field.name] = parsedValue;
            }
        });

        return {
            ...customer,
            customFields
        };
    });
}

// Add a function to get a single customer by ID
export function getCustomerById(id: number | string): any {
    const stmt = getDb().prepare(`
        SELECT id, jtl_kKunde, customerNumber, name, firstName, company, email, phone, mobile,
               street, city, country, status, notes, affiliateLink,
               jtl_dateCreated, jtl_blocked, dateAdded, lastModifiedLocally, lastSynced,
               COALESCE(zipCode, '') AS zip
        FROM ${CUSTOMERS_TABLE}
        WHERE id = ?
    `);
    const customer = stmt.get(id) as { id: number; [key: string]: any };

    if (!customer) {
        return null;
    }

    // Get custom field values for this customer
    const customFieldValues = getCustomFieldValuesForCustomer(customer.id) as CustomFieldValueRecord[];

    // Create a customFields object with field name as key and value as value
    const customFields: Record<string, any> = {};
    customFieldValues.forEach((field: CustomFieldValueRecord) => {
        // Parse value based on field type
        let parsedValue: any = field.value;
        if (field.type === 'number' && parsedValue !== null) {
            parsedValue = parseFloat(parsedValue);
        } else if (field.type === 'boolean' && parsedValue !== null) {
            parsedValue = parsedValue === 'true' || parsedValue === '1';
        } else if (field.type === 'date' && parsedValue !== null) {
            // Keep as string for date fields
        } else if (field.type === 'select' && parsedValue !== null) {
            // Keep as string for select fields
        }

        if (field.name) {
            customFields[field.name] = parsedValue;
        }
    });

    const customerWithCustomFields = {
        ...customer,
        customFields
    };

    return customerWithCustomFields;
}

// Example: Upsert using raw SQL (adapt based on actual JTL fields)
export function upsertCustomer(customerData: any): void {
    const stmt = getDb().prepare(`
        INSERT INTO ${CUSTOMERS_TABLE} (
            jtl_kKunde, name, firstName, company, email, phone, mobile,
            street, zipCode, city, country, jtl_dateCreated, jtl_blocked,
            lastSynced
        ) VALUES (
            @jtl_kKunde, @name, @firstName, @company, @email, @phone, @mobile,
            @street, @zip, @city, @country, @jtl_dateCreated, @jtl_blocked,
            CURRENT_TIMESTAMP
        ) ON CONFLICT(jtl_kKunde) DO UPDATE SET
            name = excluded.name,
            firstName = excluded.firstName,
            company = excluded.company,
            email = excluded.email,
            phone = excluded.phone,
            mobile = excluded.mobile,
            street = excluded.street,
            zipCode = excluded.zip, -- Use excluded.zip to update zipCode column
            city = excluded.city,
            country = excluded.country,
            jtl_dateCreated = excluded.jtl_dateCreated,
            jtl_blocked = excluded.jtl_blocked,
            lastSynced = CURRENT_TIMESTAMP,
            lastModifiedLocally = CASE WHEN
                name != excluded.name OR
                firstName != excluded.firstName OR
                company != excluded.company OR
                email != excluded.email OR
                phone != excluded.phone OR
                mobile != excluded.mobile OR
                street != excluded.street OR
                zipCode != excluded.zip OR -- Compare zipCode column with incoming excluded.zip
                city != excluded.city OR
                country != excluded.country OR
                jtl_dateCreated != excluded.jtl_dateCreated OR
                jtl_blocked != excluded.jtl_blocked
            THEN CURRENT_TIMESTAMP ELSE lastModifiedLocally END;
    `);
    stmt.run(customerData);
}

// Add a function to create a new customer
export function createCustomer(customerData: any): any {
    const now = new Date().toISOString();

    // Extract custom fields from customer data
    const { customFields, ...standardCustomerData } = customerData;

    // Conditionally include jtl_kKunde in the insert statement
    const columns = [
        'name', 'firstName', 'company', 'email', 'phone', 'mobile',
        'street', 'zipCode', 'city', 'country', 'status', 'notes',
        'affiliateLink', 'lastModifiedLocally'
    ];
    const valuesPlaceholders = [
        '@name', '@firstName', '@company', '@email', '@phone', '@mobile',
        '@street', '@zip', '@city', '@country', '@status', '@notes',
        '@affiliateLink', '@now'
    ];

    const dataToInsert: any = {
        ...standardCustomerData,
        now: now,
        status: standardCustomerData.status || 'Active'
    };

    if (standardCustomerData.jtl_kKunde !== undefined && standardCustomerData.jtl_kKunde !== null) {
        columns.unshift('jtl_kKunde');
        valuesPlaceholders.unshift('@jtl_kKunde');
        dataToInsert.jtl_kKunde = standardCustomerData.jtl_kKunde;
    }

    // Use a transaction to ensure all operations succeed or fail together
    const db = getDb();
    db.prepare('BEGIN TRANSACTION').run();

    try {
        // Insert the customer
        const stmt = db.prepare(`
            INSERT INTO ${CUSTOMERS_TABLE} (
                ${columns.join(', ')}
            ) VALUES (
                ${valuesPlaceholders.join(', ')}
            )
        `);

        const result = stmt.run(dataToInsert);
        const newCustomerId = Number(result.lastInsertRowid);

        // If we have custom fields, save them
        if (customFields && typeof customFields === 'object') {
            const activeFields = getActiveCustomFields() as CustomFieldDefinition[];
            const fieldMap = new Map(activeFields.map((field: CustomFieldDefinition) => [field.name, field.id]));

            // For each custom field, save its value
            Object.entries(customFields).forEach(([fieldName, fieldValue]) => {
                const fieldId = fieldMap.get(fieldName);
                if (fieldId !== undefined) {
                    setCustomFieldValue(newCustomerId, fieldId, fieldValue);
                }
            });
        }

        // Commit the transaction
        db.prepare('COMMIT').run();

        // Return the newly created customer with custom fields
        return getCustomerById(newCustomerId);
    } catch (error) {
        // If anything fails, roll back the transaction
        db.prepare('ROLLBACK').run();
        console.error('Error creating customer:', error);
        throw error;
    }
}

export function updateCustomer(id: number, customerData: any): any {
    const now = new Date().toISOString();

    // Extract custom fields from customer data
    const { customFields, zip, ...otherCustomerData } = customerData;

    const updateFieldKeys = Object.keys(otherCustomerData)
        .filter(key => key !== 'id' && key !== 'jtl_kKunde'); // Don't update primary keys

    const updateAssignments = updateFieldKeys.map(key => `${key} = @${key}`);

    if (zip !== undefined) {
        updateAssignments.push(`zipCode = @zip`);
    }

    // Add lastModifiedLocally timestamp
    updateAssignments.push(`lastModifiedLocally = @now`);

    // Use a transaction to ensure all operations succeed or fail together
    const db = getDb();
    db.prepare('BEGIN TRANSACTION').run();

    try {
        // Update the customer record
        const query = `
            UPDATE ${CUSTOMERS_TABLE}
            SET ${updateAssignments.join(', ')}
            WHERE id = @id
        `;

        const stmt = db.prepare(query);
        const paramsToRun: any = {
            ...otherCustomerData,
            id: id,
            now: now
        };
        if (zip !== undefined) {
            paramsToRun.zip = zip;
        }
        const result = stmt.run(paramsToRun);

        // If we have custom fields, update them
        if (customFields && typeof customFields === 'object') {
            const activeFields = getActiveCustomFields() as CustomFieldDefinition[];
            const fieldMap = new Map(activeFields.map((field: CustomFieldDefinition) => [field.name, field.id]));

            // For each custom field, update its value
            Object.entries(customFields).forEach(([fieldName, fieldValue]) => {
                const fieldId = fieldMap.get(fieldName);
                if (fieldId !== undefined) {
                    setCustomFieldValue(id, fieldId, fieldValue);
                }
            });
        }

        // Commit the transaction
        db.prepare('COMMIT').run();

        if (result.changes > 0) {
            return getCustomerById(id);
        }
        return null;
    } catch (error) {
        // If anything fails, roll back the transaction
        db.prepare('ROLLBACK').run();
        console.error('Error updating customer:', error);
        throw error;
    }
}

export function deleteCustomer(id: number): boolean {
    // Use a transaction to ensure all operations succeed or fail together
    const db = getDb();
    db.prepare('BEGIN TRANSACTION').run();

    try {
        // Delete custom field values first (though the foreign key would handle this)
        deleteAllCustomFieldValuesForCustomer(id);

        // Then delete the customer
        const stmt = db.prepare(`DELETE FROM ${CUSTOMERS_TABLE} WHERE id = ?`);
        const result = stmt.run(id);

        // Commit the transaction
        db.prepare('COMMIT').run();

        return result.changes > 0;
    } catch (error) {
        // If anything fails, roll back the transaction
        db.prepare('ROLLBACK').run();
        console.error('Error deleting customer:', error);
        throw error;
    }
}

// --- Product Operations ---

export function getAllProducts(): Product[] {
    const stmt = getDb().prepare(`SELECT * FROM ${PRODUCTS_TABLE} ORDER BY name`);
    return stmt.all() as Product[];
}

export function getProductById(id: number): Product | null {
    const stmt = getDb().prepare(`SELECT * FROM ${PRODUCTS_TABLE} WHERE id = ?`);
    const result = stmt.get(id);
    return result ? result as Product : null;
}

export function searchProducts(query: string = '', limit: number = 20): Product[] {
    console.log(`🔍 [SQLite] searchProducts() called with query: "${query}", limit: ${limit}`);
    console.log(`🔍 [SQLite] SearchProducts call stack:`, new Error().stack?.split('\n').slice(1, 6).join('\n'));

    const startTime = Date.now();

    const trimmedQuery = query.trim();
    const lowerQuery = trimmedQuery.toLowerCase();
    const likePattern = `%${lowerQuery}%`;
    const prefixPattern = `${lowerQuery}%`;

    let stmt;
    let results;

    if (!trimmedQuery) {
        // If no query, return recent/active products
        stmt = getDb().prepare(`
            SELECT * FROM ${PRODUCTS_TABLE}
            WHERE isActive = 1
            ORDER BY name
            LIMIT @limit
        `);
        results = stmt.all({ limit });
    } else {
        // Search by name, description, or SKU (cArtNr)
        stmt = getDb().prepare(`
            SELECT * FROM ${PRODUCTS_TABLE}
            WHERE (
                LOWER(name) LIKE @likePattern OR
                LOWER(description) LIKE @likePattern OR
                LOWER(sku) LIKE @likePattern OR
                (sku IS NOT NULL AND LOWER(sku) = @lowerQuery)
            )
            AND isActive = 1
            ORDER BY
                CASE
                    WHEN LOWER(name) LIKE @prefixPattern THEN 1
                    WHEN LOWER(sku) LIKE @prefixPattern THEN 2
                    WHEN LOWER(description) LIKE @prefixPattern THEN 3
                    ELSE 4
                END,
                name
            LIMIT @limit
        `);
        results = stmt.all({ likePattern, lowerQuery, prefixPattern, limit });
    }

    console.log(`🔍 [SQLite] searchProducts() returned ${results.length} products in ${Date.now() - startTime}ms`);
    return results as Product[];
}

// For creating products manually within the app
export function createProduct(productData: Omit<Product, 'id' | 'dateCreated' | 'lastModified' | 'lastSynced' | 'jtl_kArtikel' | 'jtl_dateCreated'>): Database.RunResult {
    const now = new Date().toISOString();
    const stmt = getDb().prepare(`
        INSERT INTO ${PRODUCTS_TABLE} (
            name, sku, description, price, isActive, dateCreated, lastModified, lastModifiedLocally
        ) VALUES (
            @name, @sku, @description, @price, @isActive, @now, @now, @now
        )
    `);
    // Ensure isActive is passed as 0 or 1
    const isActiveInt = productData.isActive ? 1 : 0;
    return stmt.run({ ...productData, isActive: isActiveInt, now: now });
}

// For updating products manually within the app
export function updateProduct(id: number, productData: Partial<Omit<Product, 'id' | 'dateCreated' | 'lastModified' | 'lastSynced' | 'jtl_kArtikel' | 'jtl_dateCreated'>>): Database.RunResult {
    const now = new Date().toISOString();
    let updateFields = Object.keys(productData)
                           .map(key => `${key} = @${key}`)
                           .join(', ');
    // Add lastModified and lastModifiedLocally updates
    updateFields += `, lastModified = @now, lastModifiedLocally = @now`;

    const stmt = getDb().prepare(`
        UPDATE ${PRODUCTS_TABLE}
        SET ${updateFields}
        WHERE id = @id
    `);

    // Ensure isActive is converted if present
    const dataToRun: any = { ...productData, id: id, now: now };
    if (productData.isActive !== undefined) {
        dataToRun.isActive = productData.isActive ? 1 : 0;
    }

    return stmt.run(dataToRun);
}

export function deleteProduct(id: number): Database.RunResult {
    // Consider checking if the product is linked in deal_products if ON DELETE RESTRICT is used
    const stmtCheck = getDb().prepare(`SELECT 1 FROM ${DEAL_PRODUCTS_TABLE} WHERE product_id = ? LIMIT 1`);
    const isInDeal = stmtCheck.get(id);

    if (isInDeal) {
        // Consider throwing an error or returning a specific status
        console.error(`Attempted to delete product ${id} which is still linked to deals.`);
        throw new Error(`Product is still linked to one or more deals and cannot be deleted.`);
    }

    const stmt = getDb().prepare(`DELETE FROM ${PRODUCTS_TABLE} WHERE id = ?`);
    return stmt.run(id);
}

// Upsert for SYNCING from JTL (adjust mapping based on sync-service)
export function upsertProduct(productData: any): void {
    const now = new Date().toISOString();
    const stmt = getDb().prepare(`
        INSERT INTO ${PRODUCTS_TABLE} (
            jtl_kArtikel, sku, name, description, price, isActive,
            jtl_dateCreated, dateCreated, lastModified, lastSynced
        ) VALUES (
            @jtl_kArtikel, @sku, @name, @description, @price, @isActive,
            @jtl_dateCreated, @now, @now, @now
        ) ON CONFLICT(jtl_kArtikel) DO UPDATE SET
            sku = excluded.sku,
            name = excluded.name,
            description = excluded.description,
            price = excluded.price,
            isActive = excluded.isActive,
            jtl_dateCreated = excluded.jtl_dateCreated,
            lastModified = @now, -- Update lastModified on sync update
            lastSynced = @now   -- Update lastSynced timestamp
            -- lastModifiedLocally is NOT updated here, only by manual edits
        WHERE jtl_kArtikel = @jtl_kArtikel;
    `);
    // Ensure isActive is 0 or 1 if coming as boolean
    const isActiveInt = typeof productData.isActive === 'boolean' ? (productData.isActive ? 1 : 0) : productData.isActive;
    stmt.run({ ...productData, isActive: isActiveInt, now: now });
}

// --- Deal-Product Link Operations ---

export function addProductToDeal(dealId: number, productId: number, quantity: number, price: number): Database.RunResult {
    const now = new Date().toISOString();
    const stmt = getDb().prepare(`
        INSERT INTO ${DEAL_PRODUCTS_TABLE} (
            deal_id, product_id, quantity, price_at_time_of_adding, dateAdded
        ) VALUES (
            @deal_id, @product_id, @quantity, @price_at_time_of_adding, @dateAdded
        ) ON CONFLICT(deal_id, product_id) DO UPDATE SET
            quantity = quantity + @quantity, -- Or just set to @quantity? Decide policy. Currently adds.
            price_at_time_of_adding = @price_at_time_of_adding -- Update price if re-added or on conflict
    `);
    return stmt.run({
        deal_id: dealId,
        product_id: productId,
        quantity: quantity,
        price_at_time_of_adding: price, // Changed priceAtTime to price
        dateAdded: now
    });
}

export function removeProductFromDeal(dealId: number, productId: number): Database.RunResult {
    const stmt = getDb().prepare(`
        DELETE FROM ${DEAL_PRODUCTS_TABLE}
        WHERE deal_id = ? AND product_id = ?
    `);
    return stmt.run(dealId, productId);
}

// Updated function to handle both quantity and price updates
export function updateDealProduct(dealProductId: number, quantity: number, price: number): Database.RunResult {
    if (quantity <= 0) {
        // If quantity is zero or less, remove the product link entirely
        // This requires deal_id and product_id, not just dealProductId.
        // For now, let's assume quantity > 0 from frontend validation, or handle removal separately.
        // To properly remove, we'd need to fetch the deal_id and product_id using dealProductId first,
        // or change the IPC call to send deal_id and product_id for removal.
        // For simplicity in this update, we'll just update if quantity > 0.
        // A more robust solution would be to call a remove function if quantity <= 0.
        // For now, we'll rely on frontend to send quantity > 0 for updates.
        // If quantity is 0, the frontend should call removeProductFromDealById (new function below)
        throw new Error("Quantity must be greater than 0 to update. Use remove to delete.");
    }
    const stmt = getDb().prepare(`
        UPDATE ${DEAL_PRODUCTS_TABLE}
        SET quantity = @quantity, price_at_time_of_adding = @price
        WHERE id = @deal_product_id
    `);
    return stmt.run({
        quantity: quantity,
        price: price,
        deal_product_id: dealProductId
    });
}

// New function to remove by deal_product_id (primary key of deal_products table)
export function removeProductFromDealById(dealProductId: number): Database.RunResult {
    const stmt = getDb().prepare(`
        DELETE FROM ${DEAL_PRODUCTS_TABLE}
        WHERE id = ?
    `);
    return stmt.run(dealProductId);
}


// Old function, can be deprecated or modified if direct deal_id/product_id manipulation is still needed elsewhere
export function updateProductQuantityInDeal(dealId: number, productId: number, newQuantity: number): Database.RunResult {
    if (newQuantity <= 0) {
        return removeProductFromDeal(dealId, productId);
    } else {
        const stmt = getDb().prepare(`
            UPDATE ${DEAL_PRODUCTS_TABLE}
            SET quantity = ?
            WHERE deal_id = ? AND product_id = ?
        `);
        return stmt.run(newQuantity, dealId, productId);
    }
}

// Gets products associated with a specific deal, joining with the products table
export function getProductsForDeal(dealId: number): (DealProduct & Product)[] {
    const stmt = getDb().prepare(`
        SELECT
            dp.id as deal_product_id, -- Alias to avoid clash with product.id
            dp.deal_id,
            dp.product_id,
            dp.quantity,
            dp.price_at_time_of_adding,
            dp.dateAdded,
            p.*  -- Select all columns from products table
        FROM ${DEAL_PRODUCTS_TABLE} dp
        JOIN ${PRODUCTS_TABLE} p ON dp.product_id = p.id
        WHERE dp.deal_id = ?
        ORDER BY p.name
    `);
    return stmt.all(dealId) as (DealProduct & Product)[];
}

/**
 * Calculate the total value of a deal based on its associated products
 * @param dealId The ID of the deal
 * @returns The total value of the deal
 */
export function calculateDealValue(dealId: number): number {
  try {
    const stmt = getDb().prepare(`
      SELECT SUM(dp.quantity * dp.price_at_time_of_adding) as total_value
      FROM ${DEAL_PRODUCTS_TABLE} dp
      WHERE dp.deal_id = ?
    `);
    const result = stmt.get(dealId) as { total_value?: number };
    return result?.total_value || 0;
  } catch (error) {
    console.error(`Error calculating deal value for deal ${dealId}:`, error);
    return 0;
  }
}

/**
 * Update a deal's value based on its calculation method
 * @param dealId The ID of the deal
 * @returns Success status and error message if applicable
 */
export function updateDealValueBasedOnCalculationMethod(dealId: number): { success: boolean; error?: string } {
  try {
    // Get the deal's calculation method
    const dealStmt = getDb().prepare(`
      SELECT value_calculation_method
      FROM ${DEALS_TABLE}
      WHERE id = ?
    `);
    const deal = dealStmt.get(dealId) as { value_calculation_method?: string };

    if (!deal) {
      return { success: false, error: 'Deal not found' };
    }

    // If the calculation method is dynamic, update the value
    if (deal.value_calculation_method === 'dynamic') {
      const totalValue = calculateDealValue(dealId);

      const updateStmt = getDb().prepare(`
        UPDATE ${DEALS_TABLE}
        SET value = ?, last_modified = ?
        WHERE id = ?
      `);

      const now = new Date().toISOString();
      updateStmt.run(totalValue, now, dealId);
    }

    return { success: true };
  } catch (error) {
    console.error(`Error updating deal value for deal ${dealId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// --- Calendar Event Operations ---

// Define a type for the data coming from the frontend/going to the DB
interface CalendarEventData {
    id?: number; // Optional for creation
    title: string;
    description?: string;
    start_date: string; // ISO String
    end_date: string; // ISO String
    all_day: number; // 0 or 1
    color_code?: string;
    event_type?: string;
    recurrence_rule?: string; // Store as JSON string
}

export function getAllCalendarEvents(startDate?: string, endDate?: string): any[] { // Return type matches structure from DB
    let query = `SELECT * FROM ${CALENDAR_EVENTS_TABLE}`;
    const params: any[] = [];

    if (startDate || endDate) {
        query += ' WHERE';
        if (startDate) {
            query += ' start_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            if (startDate) query += ' AND';
            query += ' end_date <= ?';
            params.push(endDate);
        }
    }

    query += ' ORDER BY start_date';

    const stmt = getDb().prepare(query);
    const events = params.length > 0 ? stmt.all(...params) : stmt.all();

    // Parse recurrence_rule JSON for any events
    return events.map((event: any) => {
        if (event.recurrence_rule && typeof event.recurrence_rule === 'string') {
            try {
                event.recurrence_rule = JSON.parse(event.recurrence_rule);
            } catch (e) {
                console.warn(`Could not parse recurrence_rule for event ${event.id}:`, e);
            }
        }
        return event;
    });
}

export function createCalendarEvent(eventData: any): Database.RunResult {
    console.log('Creating calendar event with data:', eventData);
    try {
        const now = new Date().toISOString();

        // Prepare a clean object with only the required fields
        const cleanData: Record<string, any> = {
            title: String(eventData.title || ''),
            description: String(eventData.description || ''),
            start_date: String(eventData.start_date || now),
            end_date: String(eventData.end_date || now),
            all_day: eventData.all_day ? 1 : 0,  // Convert boolean to integer for SQLite
            color_code: String(eventData.color_code || '#3174ad'),
            event_type: String(eventData.event_type || ''),
            recurrence_rule: null, // Always include recurrence_rule parameter with default null
            task_id: eventData.task_id ?? null,
            now: now
        };

        // Handle recurrence_rule if it exists and isn't null
        if (eventData.recurrence_rule) {
            cleanData.recurrence_rule = typeof eventData.recurrence_rule === 'string'
                ? eventData.recurrence_rule
                : JSON.stringify(eventData.recurrence_rule);
        }

        console.log('Sanitized data for SQLite:', cleanData);

        const stmt = getDb().prepare(`
            INSERT INTO ${CALENDAR_EVENTS_TABLE} (
                title, description, start_date, end_date, all_day,
                color_code, event_type, recurrence_rule, task_id, created_at, updated_at
            ) VALUES (
                @title, @description, @start_date, @end_date, @all_day,
                @color_code, @event_type, @recurrence_rule, @task_id, @now, @now
            )
        `);

        return stmt.run(cleanData);
    } catch (error) {
        console.error('Error creating calendar event:', error);
        throw error;
    }
}

export function updateCalendarEvent(id: number, eventData: Partial<Omit<CalendarEventData, 'id'>>): Database.RunResult {
    console.log('Updating calendar event with data:', id, eventData);
    try {
        const now = new Date().toISOString();
        const cleanData: Record<string, any> = { ...eventData, id, now };

        // Convert boolean to integer for SQLite
        if (typeof eventData.all_day === 'boolean') {
            cleanData.all_day = eventData.all_day ? 1 : 0;
        }

        // Handle recurrence_rule if it exists
        if (eventData.recurrence_rule !== undefined) {
            if (eventData.recurrence_rule === null) {
                cleanData.recurrence_rule = null;
            } else {
                cleanData.recurrence_rule = typeof eventData.recurrence_rule === 'string'
                    ? eventData.recurrence_rule
                    : JSON.stringify(eventData.recurrence_rule);
            }
        }

        if (eventData.task_id !== undefined) {
            cleanData.task_id = eventData.task_id;
        }

        // Convert all strings and numbers explicitly
        Object.keys(cleanData).forEach(key => {
            if (typeof cleanData[key] === 'string' || typeof cleanData[key] === 'number') {
                cleanData[key] = String(cleanData[key]);
            }
        });

        console.log('Sanitized data for SQLite update:', cleanData);

        const keysToUpdate = Object.keys(eventData);
        let updateFields = keysToUpdate
                               .map(key => `${key} = @${key}`)
                               .join(', ');

        // Ensure updated_at is always updated
        updateFields += `, updated_at = @now`;

        const stmt = getDb().prepare(`
            UPDATE ${CALENDAR_EVENTS_TABLE}
            SET ${updateFields}
            WHERE id = @id
        `);

        return stmt.run(cleanData);
    } catch (error) {
        console.error(`Error updating calendar event ${id}:`, error);
        throw error;
    }
}

export function deleteCalendarEvent(id: number): Database.RunResult {
    const stmt = getDb().prepare(`DELETE FROM ${CALENDAR_EVENTS_TABLE} WHERE id = ?`);
    return stmt.run(id);
}

// --- Deal Operations ---
export function getAllDeals(
  limit: number = 100,
  offset: number = 0,
  filter: { stage?: string; query?: string } = {}
): any[] {
  let sql = `
    SELECT d.*, c.name as customer_name
    FROM ${DEALS_TABLE} d
    LEFT JOIN ${CUSTOMERS_TABLE} c ON d.customer_id = c.id
    WHERE 1=1
  `;

  const params: any[] = [];

  // Add stage filter if provided
  if (filter.stage) {
    sql += ` AND d.stage = ?`;
    params.push(filter.stage);
  }

  // Add search query filter if provided
  if (filter.query && filter.query.trim() !== '') {
    sql += ` AND (d.name LIKE ? OR c.name LIKE ?)`;
    const searchTerm = `%${filter.query}%`;
    params.push(searchTerm, searchTerm);
  }

  sql += ` ORDER BY d.created_date DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const stmt = getDb().prepare(sql);
  return stmt.all(...params);
}

export function getDealById(dealId: number): any {
  const stmt = getDb().prepare(`
    SELECT d.*, c.name as customer_name
    FROM ${DEALS_TABLE} d
    LEFT JOIN ${CUSTOMERS_TABLE} c ON d.customer_id = c.id
    WHERE d.id = ?
  `);
  return stmt.get(dealId);
}

export function createDeal(dealData: any): { success: boolean; id?: number; error?: string } {
  try {
    // Prepare timestamp
    const now = new Date().toISOString();

    // Create deal with mandatory fields
    const stmt = getDb().prepare(`
      INSERT INTO ${DEALS_TABLE} (
        customer_id, name, value, value_calculation_method, stage, notes, expected_close_date, created_date, last_modified
      ) VALUES (
        @customer_id, @name, @value, @value_calculation_method, @stage, @notes, @expected_close_date, @created_date, @last_modified
      )
    `);

    const result = stmt.run({
      customer_id: dealData.customer_id,
      name: dealData.name,
      value: dealData.value || 0,
      value_calculation_method: dealData.value_calculation_method || 'static',
      stage: dealData.stage || 'Interessent',
      notes: dealData.notes || '',
      expected_close_date: dealData.expected_close_date || null,
      created_date: now,
      last_modified: now
    });

    return { success: true, id: result.lastInsertRowid as number };
  } catch (error) {
    console.error('Error creating deal:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function updateDeal(dealId: number, dealData: any): { success: boolean; error?: string } {
  try {
    // Update last_modified timestamp
    dealData.last_modified = new Date().toISOString();

    // Filter out invalid columns and customer_name
    const validColumns = ['name', 'value', 'value_calculation_method', 'stage', 'notes', 'expected_close_date', 'last_modified'];
    const fields = Object.keys(dealData)
      .filter(key => validColumns.includes(key) && dealData[key] !== undefined)
      .map(key => `${key} = @${key}`)
      .join(', ');

    if (!fields.length) {
      return { success: false, error: 'No fields to update' };
    }

    const stmt = getDb().prepare(`
      UPDATE ${DEALS_TABLE}
      SET ${fields}
      WHERE id = @id
    `);

    const result = stmt.run({
      id: dealId,
      ...dealData
    });

    return { success: result.changes > 0, error: result.changes === 0 ? 'Deal not found' : undefined };
  } catch (error) {
    console.error(`Error updating deal ${dealId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function updateDealStage(dealId: number, newStage: string): { success: boolean; error?: string } {
  try {
    const now = new Date().toISOString();

    const stmt = getDb().prepare(`
      UPDATE ${DEALS_TABLE}
      SET stage = ?, last_modified = ?
      WHERE id = ?
    `);

    const result = stmt.run(newStage, now, dealId);

    return { success: result.changes > 0, error: result.changes === 0 ? 'Deal not found' : undefined };
  } catch (error) {
    console.error(`Error updating deal stage for ${dealId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// --- Deal Operations for Customer ---
export function getDealsForCustomer(customerId: number): any[] {
    // This assumes a 'deals' table with a customer_id field
    const stmt = getDb().prepare(`
        SELECT * FROM deals
        WHERE customer_id = ?
        ORDER BY created_date DESC
    `);
    return stmt.all(customerId);
}

// --- Task Operations ---
export function getAllTasks(
  limit: number = 100,
  offset: number = 0,
  filter: { completed?: boolean; priority?: string; query?: string } = {}
): any[] {
  let sql = `
    SELECT t.*, c.name as customer_name
    FROM ${TASKS_TABLE} t
    LEFT JOIN ${CUSTOMERS_TABLE} c ON t.customer_id = c.id
    WHERE 1=1
  `;

  const params: any[] = [];

  // Add completed filter if provided
  if (filter.completed !== undefined) {
    sql += ` AND t.completed = ?`;
    params.push(filter.completed ? 1 : 0);
  }

  // Add priority filter if provided
  if (filter.priority) {
    sql += ` AND t.priority = ?`;
    params.push(filter.priority);
  }

  // Add search query filter if provided
  if (filter.query && filter.query.trim() !== '') {
    sql += ` AND (t.title LIKE ? OR c.name LIKE ? OR t.description LIKE ?)`;
    const searchTerm = `%${filter.query}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  sql += ` ORDER BY t.due_date ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const stmt = getDb().prepare(sql);
  return stmt.all(...params);
}

export function getTaskById(taskId: number): any {
  const stmt = getDb().prepare(`
    SELECT t.*, c.name as customer_name
    FROM ${TASKS_TABLE} t
    LEFT JOIN ${CUSTOMERS_TABLE} c ON t.customer_id = c.id
    WHERE t.id = ?
  `);
  return stmt.get(taskId);
}

export function createTask(taskData: any): { success: boolean; id?: number; error?: string } {
  try {
    // Prepare timestamp
    const now = new Date().toISOString();

    // Create task with mandatory fields
    const stmt = getDb().prepare(`
      INSERT INTO ${TASKS_TABLE} (
        customer_id, title, description, due_date, priority, completed,
        calendar_event_id, created_date, last_modified
      ) VALUES (
        @customer_id, @title, @description, @due_date, @priority, @completed,
        @calendar_event_id, @created_date, @last_modified
      )
    `);

    const result = stmt.run({
      customer_id: taskData.customer_id,
      title: taskData.title,
      description: taskData.description || '',
      due_date: taskData.due_date ?? '',
      priority: taskData.priority,
      completed: taskData.completed ? 1 : 0,
      calendar_event_id: taskData.calendar_event_id ?? null,
      created_date: now,
      last_modified: now
    });

    return { success: true, id: result.lastInsertRowid as number };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function updateTask(taskId: number, taskData: any): { success: boolean; error?: string } {
  try {
    // Update last_modified timestamp
    taskData.last_modified = new Date().toISOString();

    // Convert boolean completed to integer if provided
    if (taskData.completed !== undefined) {
      taskData.completed = taskData.completed ? 1 : 0;
    }

    // Build dynamic update query based on provided fields
    const fields = Object.keys(taskData)
      .filter(key => key !== 'id' && taskData[key] !== undefined)
      .map(key => `${key} = @${key}`)
      .join(', ');

    if (!fields.length) {
      return { success: false, error: 'No fields to update' };
    }

    const stmt = getDb().prepare(`
      UPDATE ${TASKS_TABLE}
      SET ${fields}
      WHERE id = @id
    `);

    const result = stmt.run({
      id: taskId,
      ...taskData
    });

    return { success: result.changes > 0, error: result.changes === 0 ? 'Task not found' : undefined };
  } catch (error) {
    console.error(`Error updating task ${taskId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function updateTaskCompletion(taskId: number, completed: boolean): { success: boolean; error?: string } {
  try {
    const now = new Date().toISOString();

    const stmt = getDb().prepare(`
      UPDATE ${TASKS_TABLE}
      SET completed = ?, last_modified = ?
      WHERE id = ?
    `);

    const result = stmt.run(completed ? 1 : 0, now, taskId);

    return { success: result.changes > 0, error: result.changes === 0 ? 'Task not found' : undefined };
  } catch (error) {
    console.error(`Error updating task completion for ${taskId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function deleteTask(taskId: number): { success: boolean; error?: string } {
  try {
    const stmt = getDb().prepare(`DELETE FROM ${TASKS_TABLE} WHERE id = ?`);
    const result = stmt.run(taskId);

    return { success: result.changes > 0, error: result.changes === 0 ? 'Task not found' : undefined };
  } catch (error) {
    console.error(`Error deleting task ${taskId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// --- Task Operations for Customer ---
export function getTasksForCustomer(customerId: number): any[] {
    // This assumes a 'tasks' table with a customer_id field
    const stmt = getDb().prepare(`
        SELECT * FROM tasks
        WHERE customer_id = ?
        ORDER BY due_date ASC
    `);
    return stmt.all(customerId);
}

// --- JTL Specific Entity Operations ---

// JTL Firmen
export function upsertJtlFirma(firma: { kFirma: number; cName: string }): void {
    const stmt = getDb().prepare(
        `INSERT INTO ${JTL_FIRMEN_TABLE} (kFirma, cName)
         VALUES (@kFirma, @cName)
         ON CONFLICT(kFirma) DO UPDATE SET cName = excluded.cName`
    );
    stmt.run(firma);
}

export function getAllJtlFirmen(): { kFirma: number; cName: string }[] {
    const stmt = getDb().prepare(`SELECT kFirma, cName FROM ${JTL_FIRMEN_TABLE} ORDER BY cName`);
    return stmt.all() as { kFirma: number; cName: string }[];
}

// JTL Warenlager
export function upsertJtlWarenlager(lager: { kWarenlager: number; cName: string }): void {
    const stmt = getDb().prepare(
        `INSERT INTO ${JTL_WARENLAGER_TABLE} (kWarenlager, cName)
         VALUES (@kWarenlager, @cName)
         ON CONFLICT(kWarenlager) DO UPDATE SET cName = excluded.cName`
    );
    stmt.run(lager);
}

export function getAllJtlWarenlager(): { kWarenlager: number; cName: string }[] {
    const stmt = getDb().prepare(`SELECT kWarenlager, cName FROM ${JTL_WARENLAGER_TABLE} ORDER BY cName`);
    return stmt.all() as { kWarenlager: number; cName: string }[];
}

// JTL Zahlungsarten
export function upsertJtlZahlungsart(zahlungsart: { kZahlungsart: number; cName: string }): void {
    const stmt = getDb().prepare(
        `INSERT INTO ${JTL_ZAHLUNGSARTEN_TABLE} (kZahlungsart, cName)
         VALUES (@kZahlungsart, @cName)
         ON CONFLICT(kZahlungsart) DO UPDATE SET cName = excluded.cName`
    );
    stmt.run(zahlungsart);
}

export function getAllJtlZahlungsarten(): { kZahlungsart: number; cName: string }[] {
    const stmt = getDb().prepare(`SELECT kZahlungsart, cName FROM ${JTL_ZAHLUNGSARTEN_TABLE} ORDER BY cName`);
    return stmt.all() as { kZahlungsart: number; cName: string }[];
}

// JTL Versandarten
export function upsertJtlVersandart(versandart: { kVersandart: number; cName: string }): void {
    const stmt = getDb().prepare(
        `INSERT INTO ${JTL_VERSANDARTEN_TABLE} (kVersandart, cName)
         VALUES (@kVersandart, @cName)
         ON CONFLICT(kVersandart) DO UPDATE SET cName = excluded.cName`
    );
    stmt.run(versandart);
}

export function getAllJtlVersandarten(): { kVersandart: number; cName: string }[] {
    const stmt = getDb().prepare(`SELECT kVersandart, cName FROM ${JTL_VERSANDARTEN_TABLE} ORDER BY cName`);
    return stmt.all() as { kVersandart: number; cName: string }[];
}

// --- Dashboard Operations ---

/**
 * Get dashboard statistics including customer counts, deal values, and task counts
 */
export function getDashboardStats(): {
    totalCustomers: number;
    newCustomersLastMonth: number;
    activeDealsCount: number;
    activeDealsValue: number;
    pendingTasksCount: number;
    dueTodayTasksCount: number;
    conversionRate: number;
} {
    try {
        const db = getDb();

        // Get total customers count
        const totalCustomersStmt = db.prepare(`SELECT COUNT(*) as count FROM ${CUSTOMERS_TABLE}`);
        const totalCustomersResult = totalCustomersStmt.get() as { count: number };
        const totalCustomers = totalCustomersResult.count;

        // Get new customers in the last month
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const oneMonthAgoStr = oneMonthAgo.toISOString();

        const newCustomersStmt = db.prepare(`
            SELECT COUNT(*) as count FROM ${CUSTOMERS_TABLE}
            WHERE dateAdded >= ?
        `);
        const newCustomersResult = newCustomersStmt.get(oneMonthAgoStr) as { count: number };
        const newCustomersLastMonth = newCustomersResult.count;

        // Get active deals count and value
        // Assuming 'active' deals are those not in 'Closed Won' or 'Closed Lost' stages
        const activeDealsStmt = db.prepare(`
            SELECT COUNT(*) as count, SUM(value) as total_value
            FROM ${DEALS_TABLE}
            WHERE stage NOT IN ('Closed Won', 'Closed Lost')
        `);
        const activeDealsResult = activeDealsStmt.get() as { count: number; total_value: number | null };
        const activeDealsCount = activeDealsResult.count;
        const activeDealsValue = activeDealsResult.total_value || 0;

        // Get pending tasks count
        const pendingTasksStmt = db.prepare(`
            SELECT COUNT(*) as count FROM ${TASKS_TABLE}
            WHERE completed = 0
        `);
        const pendingTasksResult = pendingTasksStmt.get() as { count: number };
        const pendingTasksCount = pendingTasksResult.count;

        // Get tasks due today
        const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD
        const dueTodayTasksStmt = db.prepare(`
            SELECT COUNT(*) as count FROM ${TASKS_TABLE}
            WHERE completed = 0 AND date(due_date) = ?
        `);
        const dueTodayTasksResult = dueTodayTasksStmt.get(today) as { count: number };
        const dueTodayTasksCount = dueTodayTasksResult.count;

        // Calculate conversion rate (closed won deals / total closed deals)
        const conversionRateStmt = db.prepare(`
            SELECT
                COUNT(CASE WHEN stage = 'Closed Won' THEN 1 END) as won,
                COUNT(CASE WHEN stage IN ('Closed Won', 'Closed Lost') THEN 1 END) as total
            FROM ${DEALS_TABLE}
        `);
        const conversionResult = conversionRateStmt.get() as { won: number; total: number };
        const conversionRate = conversionResult.total > 0
            ? (conversionResult.won / conversionResult.total) * 100
            : 0;

        return {
            totalCustomers,
            newCustomersLastMonth,
            activeDealsCount,
            activeDealsValue,
            pendingTasksCount,
            dueTodayTasksCount,
            conversionRate
        };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        // Return default values on error
        return {
            totalCustomers: 0,
            newCustomersLastMonth: 0,
            activeDealsCount: 0,
            activeDealsValue: 0,
            pendingTasksCount: 0,
            dueTodayTasksCount: 0,
            conversionRate: 0
        };
    }
}

/**
 * Get recent customers with basic information
 */
export function getRecentCustomers(limit: number = 5): any[] {
    try {
        const stmt = getDb().prepare(`
            SELECT id, customerNumber, name, email, dateAdded, jtl_dateCreated
            FROM ${CUSTOMERS_TABLE}
            ORDER BY dateAdded DESC
            LIMIT ?
        `);
        return stmt.all(limit);
    } catch (error) {
        console.error('Error getting recent customers:', error);
        return [];
    }
}

/**
 * Get upcoming tasks with customer information
 */
export function getUpcomingTasks(limit: number = 5): any[] {
    try {
        const stmt = getDb().prepare(`
            SELECT t.id, t.title, t.priority, t.customer_id, t.due_date,
                   c.name as customer_name
            FROM ${TASKS_TABLE} t
            LEFT JOIN ${CUSTOMERS_TABLE} c ON t.customer_id = c.id
            WHERE t.completed = 0
            ORDER BY t.due_date ASC
            LIMIT ?
        `);
        return stmt.all(limit);
    } catch (error) {
        console.error('Error getting upcoming tasks:', error);
        return [];
    }
}

// --- Cleanup ---
export function closeDatabase() {
    if (db) {
        db.close();
        console.log('Database connection closed.');
    }
    // Optional Knex cleanup
    // if (knex) {
    //   await knex.destroy();
    //   console.log('Knex connection destroyed.');
    // }
}
