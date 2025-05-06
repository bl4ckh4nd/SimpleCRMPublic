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
    indexes,
    CUSTOMERS_TABLE,
    PRODUCTS_TABLE,
    DEAL_PRODUCTS_TABLE,
    SYNC_INFO_TABLE,
    CALENDAR_EVENTS_TABLE,
    DEALS_TABLE,
    TASKS_TABLE
} from './database-schema';
import { Product, DealProduct } from './types';
// Optional: import Knex from 'knex';

const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
let db: Database.Database;
// Optional: let knex: Knex.Knex;

export function initializeDatabase() {
    const dbExists = fs.existsSync(dbPath);
    db = new Database(dbPath, { verbose: console.log }); // Enable logging for dev

    if (!dbExists) {
        console.log('Initializing new SQLite database...');
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
            indexes.forEach(index => db.exec(index));
            // Seed initial sync info if needed
            setSyncInfo('lastSyncStatus', 'Never');
            setSyncInfo('lastSyncTimestamp', '');
            console.log('Database initialized successfully.');
        } catch (error) {
            console.error('Failed to initialize database schema:', error);
            throw error; // Rethrow to prevent app start with bad DB
        }
    } else {
        console.log('Database already exists.');
        // Ensure Foreign Keys are enabled on existing DBs too
        db.exec('PRAGMA foreign_keys = ON;');
        // Here you could add migration logic if schema changes
        // Example: Check if deal_products table exists and create if not
        const checkTableStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");
        if (!checkTableStmt.get(DEAL_PRODUCTS_TABLE)) {
            console.log(`Table ${DEAL_PRODUCTS_TABLE} not found, creating...`);
            try {
                db.exec(createDealProductsTable);
                // Add indexes for the new table if they don't exist
                const dealIdIndex = `CREATE INDEX IF NOT EXISTS idx_deal_products_deal_id ON ${DEAL_PRODUCTS_TABLE}(deal_id);`;
                const productIdIndex = `CREATE INDEX IF NOT EXISTS idx_deal_products_product_id ON ${DEAL_PRODUCTS_TABLE}(product_id);`;
                db.exec(dealIdIndex);
                db.exec(productIdIndex);
                console.log(`Table ${DEAL_PRODUCTS_TABLE} and indexes created.`);
            } catch (error) {
                console.error(`Failed to create table ${DEAL_PRODUCTS_TABLE} or its indexes:`, error);
            }
        }

        // Check for deals table
        if (!checkTableStmt.get(DEALS_TABLE)) {
            console.log(`Table ${DEALS_TABLE} not found, creating...`);
            try {
                db.exec(createDealsTable);
                const dealCustomerIdIndex = `CREATE INDEX IF NOT EXISTS idx_deals_customer_id ON ${DEALS_TABLE}(customer_id);`;
                const dealStageIndex = `CREATE INDEX IF NOT EXISTS idx_deals_stage ON ${DEALS_TABLE}(stage);`;
                db.exec(dealCustomerIdIndex);
                db.exec(dealStageIndex);
                console.log(`Table ${DEALS_TABLE} and indexes created.`);
            } catch (error) {
                console.error(`Failed to create table ${DEALS_TABLE} or its indexes:`, error);
            }
        }

        // Check for tasks table
        if (!checkTableStmt.get(TASKS_TABLE)) {
            console.log(`Table ${TASKS_TABLE} not found, creating...`);
            try {
                db.exec(createTasksTable);
                const taskCustomerIdIndex = `CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON ${TASKS_TABLE}(customer_id);`;
                const taskDueDateIndex = `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON ${TASKS_TABLE}(due_date);`;
                const taskCompletedIndex = `CREATE INDEX IF NOT EXISTS idx_tasks_completed ON ${TASKS_TABLE}(completed);`;
                db.exec(taskCustomerIdIndex);
                db.exec(taskDueDateIndex);
                db.exec(taskCompletedIndex);
                console.log(`Table ${TASKS_TABLE} and indexes created.`);
            } catch (error) {
                console.error(`Failed to create table ${TASKS_TABLE} or its indexes:`, error);
            }
        }

        // Check and create calendar_events table if needed
        if (!checkTableStmt.get(CALENDAR_EVENTS_TABLE)) {
            console.log(`Table ${CALENDAR_EVENTS_TABLE} not found, creating...`);
            try {
                db.exec(createCalendarEventsTable);
                // Add indexes for the new table
                const startIndex = `CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON ${CALENDAR_EVENTS_TABLE}(start_date);`;
                const endIndex = `CREATE INDEX IF NOT EXISTS idx_calendar_events_end_date ON ${CALENDAR_EVENTS_TABLE}(end_date);`;
                db.exec(startIndex);
                db.exec(endIndex);
                console.log(`Table ${CALENDAR_EVENTS_TABLE} and indexes created.`);
            } catch (error) {
                console.error(`Failed to create table ${CALENDAR_EVENTS_TABLE} or its indexes:`, error);
            }
        }
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


export function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
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


// --- Customer Operations ---
// TODO: Implement CRUD for Customers (using direct SQL or Knex)
// Example:
export function getAllCustomers(): any[] {
    const stmt = getDb().prepare(`SELECT * FROM ${CUSTOMERS_TABLE} ORDER BY name`);
    return stmt.all();
}

// Add a function to get a single customer by ID
export function getCustomerById(id: number | string): any {
    const stmt = getDb().prepare(`SELECT * FROM ${CUSTOMERS_TABLE} WHERE id = ?`);
    return stmt.get(id);
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
            @street, @zipCode, @city, @country, @jtl_dateCreated, @jtl_blocked,
            CURRENT_TIMESTAMP
        ) ON CONFLICT(jtl_kKunde) DO UPDATE SET
            name = excluded.name,
            firstName = excluded.firstName,
            company = excluded.company,
            email = excluded.email,
            phone = excluded.phone,
            mobile = excluded.mobile,
            street = excluded.street,
            zipCode = excluded.zipCode,
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
                zipCode != excluded.zipCode OR
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
    const stmt = getDb().prepare(`
        INSERT INTO ${CUSTOMERS_TABLE} (
            name, firstName, company, email, phone, mobile,
            street, zipCode, city, country, status, notes,
            affiliateLink, lastModifiedLocally
        ) VALUES (
            @name, @firstName, @company, @email, @phone, @mobile,
            @street, @zipCode, @city, @country, @status, @notes,
            @affiliateLink, @now
        )
    `);
    
    const result = stmt.run({
        ...customerData,
        now: now,
        // Ensure status has a default value if not provided
        status: customerData.status || 'Active'
    });
    
    if (result.lastInsertRowid) {
        return getCustomerById(Number(result.lastInsertRowid));
    }
    return null;
}

export function updateCustomer(id: number, customerData: any): any {
    const now = new Date().toISOString();
    
    // Construct the SET part of the query dynamically based on provided fields
    const updateFields = Object.keys(customerData)
        .filter(key => key !== 'id' && key !== 'jtl_kKunde') // Don't update primary keys
        .map(key => `${key} = @${key}`)
        .join(', ');
    
    // Add lastModifiedLocally timestamp
    const query = `
        UPDATE ${CUSTOMERS_TABLE}
        SET ${updateFields}, lastModifiedLocally = @now
        WHERE id = @id
    `;
    
    const stmt = getDb().prepare(query);
    const result = stmt.run({
        ...customerData,
        id: id,
        now: now
    });
    
    if (result.changes > 0) {
        return getCustomerById(id);
    }
    return null;
}

export function deleteCustomer(id: number): boolean {
    const stmt = getDb().prepare(`DELETE FROM ${CUSTOMERS_TABLE} WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
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

export function addProductToDeal(dealId: number, productId: number, quantity: number, priceAtTime: number): Database.RunResult {
    const now = new Date().toISOString();
    const stmt = getDb().prepare(`
        INSERT INTO ${DEAL_PRODUCTS_TABLE} (
            deal_id, product_id, quantity, price_at_time_of_adding, dateAdded
        ) VALUES (
            @deal_id, @product_id, @quantity, @price_at_time_of_adding, @dateAdded
        ) ON CONFLICT(deal_id, product_id) DO UPDATE SET
            quantity = quantity + @quantity -- Or just set to @quantity? Decide policy. Currently adds.
            -- price_at_time_of_adding = @price_at_time_of_adding -- Optionally update price if re-added?
    `);
    return stmt.run({
        deal_id: dealId,
        product_id: productId,
        quantity: quantity,
        price_at_time_of_adding: priceAtTime,
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

export function updateProductQuantityInDeal(dealId: number, productId: number, newQuantity: number): Database.RunResult {
    if (newQuantity <= 0) {
        // If quantity is zero or less, remove the product link entirely
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

export function getAllCalendarEvents(): any[] { // Return type matches structure from DB
    const stmt = getDb().prepare(`SELECT * FROM ${CALENDAR_EVENTS_TABLE} ORDER BY start_date`);
    const events = stmt.all();
    
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
                color_code, event_type, recurrence_rule, created_at, updated_at
            ) VALUES (
                @title, @description, @start_date, @end_date, @all_day,
                @color_code, @event_type, @recurrence_rule, @now, @now
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
        
        // Convert all strings and numbers explicitly
        Object.keys(cleanData).forEach(key => {
            if (typeof cleanData[key] === 'string' || typeof cleanData[key] === 'number') {
                cleanData[key] = String(cleanData[key]);
            }
        });
        
        console.log('Sanitized data for SQLite update:', cleanData);
        
        let updateFields = Object.keys(eventData)
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
        customer_id, name, value, stage, notes, expected_close_date, created_date, last_modified
      ) VALUES (
        @customer_id, @name, @value, @stage, @notes, @expected_close_date, @created_date, @last_modified
      )
    `);
    
    const result = stmt.run({
      customer_id: dealData.customer_id,
      name: dealData.name,
      value: dealData.value || 0,
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
    
    // Build dynamic update query based on provided fields
    const fields = Object.keys(dealData)
      .filter(key => key !== 'id' && dealData[key] !== undefined)
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
        created_date, last_modified
      ) VALUES (
        @customer_id, @title, @description, @due_date, @priority, @completed,
        @created_date, @last_modified
      )
    `);
    
    const result = stmt.run({
      customer_id: taskData.customer_id,
      title: taskData.title,
      description: taskData.description || '',
      due_date: taskData.due_date,
      priority: taskData.priority,
      completed: taskData.completed ? 1 : 0,
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