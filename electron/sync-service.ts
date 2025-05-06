import { BrowserWindow } from 'electron';
import { fetchJtlCustomers, fetchJtlProducts } from './mssql-keytar-service';
import { upsertCustomer, upsertProduct, setSyncInfo, getSyncInfo, getDb } from './sqlite-service';
import { MssqlCustomerData, MssqlProductData } from './types'; // Assuming types for JTL data

let isSyncing = false;

// Function to map JTL Customer data to SQLite schema
function mapJtlCustomerToSqlite(jtlCustomer: any): any {
    console.log(`[Sync] Mapping customer kKunde: ${jtlCustomer?.kKunde}`);
    // Explicitly handle potential null/undefined values from DB

    // Convert Date object to ISO string for SQLite compatibility
    let dateCreated: string | null = null;
    try {
        if (jtlCustomer.CustomerDateCreated instanceof Date) {
            dateCreated = jtlCustomer.CustomerDateCreated.toISOString();
        } else if (jtlCustomer.CustomerDateCreated) {
            // Attempt conversion if it's a string-like date
            dateCreated = new Date(jtlCustomer.CustomerDateCreated).toISOString();
        }
    } catch (e) {
        console.warn(`[Sync] Could not parse CustomerDateCreated for kKunde ${jtlCustomer?.kKunde}:`, jtlCustomer.CustomerDateCreated);
        dateCreated = null; // Default to null if parsing fails
    }
    
    const mappedData = {
        jtl_kKunde: jtlCustomer.kKunde,
        name: jtlCustomer.AddressLastName ?? '',
        firstName: jtlCustomer.AddressFirstName ?? '',
        company: jtlCustomer.AddressCompany ?? '',
        email: jtlCustomer.AddressEmail ?? '',
        phone: jtlCustomer.AddressPhone ?? '',
        mobile: jtlCustomer.AddressMobile ?? '',
        street: jtlCustomer.AddressStreet ?? '',
        zipCode: jtlCustomer.AddressZipCode ?? '',
        city: jtlCustomer.AddressCity ?? '',
        country: jtlCustomer.AddressCountry ?? '',
        jtl_dateCreated: dateCreated, // Use the converted value
        // Assuming jtl_blocked in SQLite is INTEGER
        jtl_blocked: jtlCustomer.CustomerBlocked === 'Y' || jtlCustomer.CustomerBlocked === 1 ? 1 : 0,
    };
    // console.log(`[Sync] Mapped customer data:`, mappedData); // Log mapped data (can be verbose)
    return mappedData;
}

// Function to map JTL Product data to SQLite schema
function mapJtlProductToSqlite(jtlProduct: any): any {
    console.log(`[Sync] Mapping product kArtikel: ${jtlProduct?.kArtikel}`);

    // Convert potential Date object for jtl_dateCreated (assuming input field is ProductDateCreated)
    let jtlDateCreatedISO: string | null = null;
    if (jtlProduct.ProductDateCreated) { // Check if the field exists
        try {
            const date = new Date(jtlProduct.ProductDateCreated);
            if (!isNaN(date.getTime())) { // Check if date is valid
                jtlDateCreatedISO = date.toISOString();
            }
        } catch (e) {
            console.warn(`[Sync] Could not parse ProductDateCreated for kArtikel ${jtlProduct?.kArtikel}:`, jtlProduct.ProductDateCreated);
        }
    }

    const mappedData = {
        jtl_kArtikel: jtlProduct.kArtikel, // Keep as is
        sku: jtlProduct.Sku ?? null,       // Map Sku, allow null
        name: jtlProduct.Name ?? 'Unknown Product', // Map Name, provide default
        description: jtlProduct.Description ?? null, // Map Description, allow null
        // Use PriceNet or PriceGross based on availability/preference
        price: typeof jtlProduct.PriceNet === 'number' ? jtlProduct.PriceNet : (typeof jtlProduct.PriceGross === 'number' ? jtlProduct.PriceGross : 0.0),
        // Map IsActive (e.g., 'Y'/'N' or 1/0) to boolean/integer 1/0 for SQLite
        isActive: jtlProduct.IsActive === 'Y' || jtlProduct.IsActive === 1 || jtlProduct.IsActive === true ? 1 : 0,
        jtl_dateCreated: jtlDateCreatedISO, // Use the converted ISO string or null
        // Fields like id, dateCreated, lastModified, lastSynced, lastModifiedLocally
        // will be handled by the sqlite-service upsertProduct function.
        // Removed mapping for barcode, stockLevel as they are not in the new schema.
    };
     // console.log(`[Sync] Mapped product data for upsert:`, mappedData);
    return mappedData;
}


function sendSyncStatus(mainWindow: BrowserWindow | null, status: string, message: string, progress?: number) {
    const timestamp = new Date().toISOString();
    console.log(`Sync Status: [${status}] ${message}` + (progress !== undefined ? ` (${progress}%)` : ''));

    // Ensure mainWindow and webContents are valid before sending
    if (mainWindow && mainWindow.webContents && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sync:status-update', { status, message, progress, timestamp });
    } else {
        console.warn("Cannot send sync status, main window not available or destroyed.");
    }

    // Update persistent status using the sqlite-service functions
    if (status === 'Running' || status === 'Success' || status === 'Error' || status === 'Skipped') {
         try {
             setSyncInfo('lastSyncStatus', status);
             setSyncInfo('lastSyncMessage', message);
             setSyncInfo('lastSyncTimestamp', timestamp);
         } catch (dbError) {
              console.error("Failed to update persistent sync info:", dbError);
              // Non-fatal, sync continues, but status won't be saved
         }
    }
}

export async function runSync(mainWindow: BrowserWindow | null) {
    if (isSyncing) {
        console.warn('Sync already in progress.');
         sendSyncStatus(mainWindow, 'Skipped', 'Sync already in progress.');
        return { success: false, message: 'Sync already in progress.' };
    }

    isSyncing = true;
    sendSyncStatus(mainWindow, 'Running', 'Starting data synchronization...', 0);
    let customersSynced = 0;
    let productsSynced = 0;
    const startTime = Date.now();

    try {
        // --- Sync Customers ---
        sendSyncStatus(mainWindow, 'Running', 'Fetching customers from JTL...', 5);
        const jtlCustomers = await fetchJtlCustomers();
        sendSyncStatus(mainWindow, 'Running', `Fetched ${jtlCustomers.length} customers. Processing...`, 10);

        const db = getDb(); // Get DB instance
        // Use a prepared statement for efficiency within the transaction
        const customerUpsertStmt = db.prepare(`
            INSERT INTO customers (
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

        const upsertManyCustomers = db.transaction((customers) => {
             console.log(`[Sync] Starting customer upsert transaction for ${customers.length} records.`);
             const transactionStartTime = performance.now();
             for (const jtlCustomer of customers) {
                try {
                    const sqliteCustomer = mapJtlCustomerToSqlite(jtlCustomer);
                     // console.log(`[Sync DB] Upserting customer:`, sqliteCustomer); // Very verbose
                    customerUpsertStmt.run(sqliteCustomer);
                    customersSynced++;
                } catch (mapError) {
                    console.error(`[Sync DB Error] Error mapping/upserting customer kKunde ${jtlCustomer?.kKunde}:`, mapError);
                    // Optionally: add failed ID to a list to report later
                }
            }
            const transactionDuration = ((performance.now() - transactionStartTime) / 1000).toFixed(2);
            console.log(`[Sync] Finished customer upsert transaction in ${transactionDuration}s.`);
        });

        upsertManyCustomers(jtlCustomers);
        sendSyncStatus(mainWindow, 'Running', `Processed ${customersSynced}/${jtlCustomers.length} customers.`, 50);


        // --- Sync Products ---
        sendSyncStatus(mainWindow, 'Running', 'Fetching products from JTL...', 55);
        const jtlProducts = await fetchJtlProducts();
        sendSyncStatus(mainWindow, 'Running', `Fetched ${jtlProducts.length} products. Processing...`, 60);

        // Removed the local prepared statement for products
        // const productUpsertStmt = db.prepare(...);

         const upsertManyProducts = db.transaction((products) => {
            console.log(`[Sync] Starting product upsert transaction for ${products.length} records.`);
            const transactionStartTime = performance.now();
            for (const jtlProduct of products) {
                try {
                    const sqliteProductData = mapJtlProductToSqlite(jtlProduct);
                    // console.log(`[Sync DB] Calling upsertProduct for:`, sqliteProductData); // Very verbose
                    // Call the centralized upsert function from sqlite-service
                    upsertProduct(sqliteProductData);
                    productsSynced++;
                } catch (mapOrUpsertError) {
                    console.error(`[Sync DB Error] Error mapping/upserting product kArtikel ${jtlProduct?.kArtikel}:`, mapOrUpsertError);
                    // Optionally: add failed ID to a list to report later
                }
            }
            const transactionDuration = ((performance.now() - transactionStartTime) / 1000).toFixed(2);
            console.log(`[Sync] Finished product upsert transaction in ${transactionDuration}s.`);
        });

        upsertManyProducts(jtlProducts);
        sendSyncStatus(mainWindow, 'Running', `Processed ${productsSynced}/${jtlProducts.length} products.`, 95);


        // --- Finalize ---
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const successMessage = `Sync completed successfully in ${duration}s. Synced ${customersSynced} customers, ${productsSynced} products.`;
        sendSyncStatus(mainWindow, 'Success', successMessage, 100);
        console.log(successMessage);
        return { success: true, message: successMessage };

    } catch (error) {
        console.error('Synchronization failed:', error);
        const errorMessage = `Sync failed: ${(error as Error).message}`;
        sendSyncStatus(mainWindow, 'Error', errorMessage);
        return { success: false, message: errorMessage };
    } finally {
        isSyncing = false;
    }
}

export async function getLastSyncStatus() {
    try {
        return {
            status: getSyncInfo('lastSyncStatus') || 'Unknown',
            message: getSyncInfo('lastSyncMessage') || '',
            timestamp: getSyncInfo('lastSyncTimestamp') || ''
        };
    } catch (dbError) {
         console.error("Failed to get last sync status from DB:", dbError);
         return {
            status: 'Error',
            message: 'Failed to retrieve sync status from database.',
            timestamp: new Date().toISOString()
         };
    }
}

export function initializeSyncService() {
    console.log("Sync Service Initialized.");
    // Set up any listeners or initial state if needed
    // Maybe set initial status if DB is empty?
    try {
        if (!getSyncInfo('lastSyncStatus')) {
             setSyncInfo('lastSyncStatus', 'Never');
             setSyncInfo('lastSyncMessage', 'Sync has not been run yet.');
             setSyncInfo('lastSyncTimestamp', '');
        }
    } catch (dbError) {
        console.error("Failed to initialize sync info in DB:", dbError);
    }
} 