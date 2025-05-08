import sql from 'mssql';
import Store from 'electron-store';
import keytar from 'keytar';
import { MssqlSettings } from './types'; // Assuming types.ts exists
import { performance } from 'perf_hooks'; // For timing

const STORE_KEY_SETTINGS = 'mssqlSettings_v2'; // Use a new key to avoid conflicts with old storage
const KEYTAR_SERVICE = 'SimpleCRMElectron-MSSQL'; // Unique identifier for keychain service

// Define the schema type explicitly
type MssqlKeytarStoreSchema = {
    [STORE_KEY_SETTINGS]: Omit<MssqlSettings, 'password'> | null;
};

// Use the explicit type when creating the store instance
const store: Store<MssqlKeytarStoreSchema> = new Store<MssqlKeytarStoreSchema>({
    defaults: {
        [STORE_KEY_SETTINGS]: null
    }
});

let pool: sql.ConnectionPool | null = null;

// Function to generate a unique account name for keytar
function getKeytarAccount(settings: Pick<MssqlSettings, 'server' | 'database' | 'user' | 'port'>): string {
    return `${settings.server}:${settings.port || 1433}-${settings.database}-${settings.user}`;
}

export async function saveMssqlSettingsWithKeytar(settings: MssqlSettings): Promise<void> {
    console.log('[MSSQL Keytar] Attempting to save settings. Clearing existing store key first.');
    store.delete(STORE_KEY_SETTINGS); // Clear existing settings first

    // settings is of type MssqlSettings. We want to store Omit<MssqlSettings, 'password'>.
    const { password, ...settingsToStore } = settings;
    const account = getKeytarAccount(settings); // Uses server, database, user, port from settings

    try {
        // settings.password is string | undefined from MssqlSettings type
        if (typeof settings.password === 'string') {
            // Password field was explicitly provided in the input object
            if (settings.password.length > 0) {
                // Non-empty string: save/update password
                await keytar.setPassword(KEYTAR_SERVICE, account, settings.password);
                console.log('[MSSQL Keytar] Password updated in keychain.');
            } else {
                // Empty string: user explicitly wants to clear the password
                await keytar.deletePassword(KEYTAR_SERVICE, account);
                console.log('[MSSQL Keytar] Password deleted from keychain due to empty string input.');
            }
        }
        // If settings.password is undefined (e.g., property was omitted by frontend for "no change"),
        // then do nothing with the keychain password.

        // settingsToStore is Omit<MssqlSettings, 'password'>
        store.set(STORE_KEY_SETTINGS, settingsToStore);
        console.log('[MSSQL Keytar] MSSQL settings (excluding password property) saved to store. Data:', JSON.stringify(settingsToStore));
        // Verify what was just stored
        const verifyStored = store.get(STORE_KEY_SETTINGS);
        console.log('[MSSQL Keytar] Verified data from store immediately after set:', JSON.stringify(verifyStored));
        await closeMssqlPool(); // Reset pool as settings changed
    } catch (error) {
        console.error('Failed to save MSSQL settings or password:', error);
        throw new Error(`Failed to save settings securely: ${(error as Error).message}`);
    }
}

export async function getMssqlSettingsWithKeytar(): Promise<MssqlSettings | null> {
    // Retrieve Omit<MssqlSettings, 'password'> from store
    const storedSettingsWithoutPassword = store.get(STORE_KEY_SETTINGS);
    console.log('[MSSQL Keytar] getMssqlSettingsWithKeytar: Retrieved from store:', JSON.stringify(storedSettingsWithoutPassword));

    if (storedSettingsWithoutPassword && storedSettingsWithoutPassword.server && storedSettingsWithoutPassword.database && storedSettingsWithoutPassword.user) {
        const account = getKeytarAccount(storedSettingsWithoutPassword as Pick<MssqlSettings, 'server' | 'database' | 'user' | 'port'>);
        console.log('[MSSQL Keytar] getMssqlSettingsWithKeytar: Generated keytar account for retrieval:', account);
        try {
            const password = await keytar.getPassword(KEYTAR_SERVICE, account);
            // Combine stored settings with password. All fields from MssqlSettings (optional or not)
            // that were in storedSettingsWithoutPassword are spread, and password is added.
            return {
                ...storedSettingsWithoutPassword,
                password: password || undefined, // Ensure password is at least undefined if not found
            } as MssqlSettings; // Cast to MssqlSettings, assuming storedSettingsWithoutPassword aligns with Omit<MssqlSettings, 'password'>
        } catch (error) {
            console.error('Failed to retrieve password from keychain:', error);
            // Return settings from store without password if keychain access fails
            return {
                ...(storedSettingsWithoutPassword as Omit<MssqlSettings, 'password'>),
                password: undefined,
            } as MssqlSettings;
        }
    }
    return null;
}

export async function testConnectionWithKeytar(settings: MssqlSettings): Promise<boolean> {
    let effectivePassword = settings.password;

    // If password is not provided in the settings input (i.e., undefined),
    // it means the frontend wants to test with the stored password.
    if (settings.password === undefined) {
        // Attempt to retrieve the password from Keytar
        if (settings.server && settings.database && settings.user) {
            const account = getKeytarAccount(settings as Pick<MssqlSettings, 'server' | 'database' | 'user' | 'port'>);
            try {
                const storedPassword = await keytar.getPassword(KEYTAR_SERVICE, account);
                effectivePassword = storedPassword !== null ? storedPassword : undefined;
                console.log('[MSSQL Keytar] For test connection, using password from keychain.');
            } catch (keytarError) {
                console.warn('[MSSQL Keytar] Could not retrieve password from keychain for test connection (may not exist yet). Proceeding with undefined password.');
                effectivePassword = undefined;
            }
        } else {
            console.warn('[MSSQL Keytar] Insufficient details in settings to fetch password from keychain for test. Proceeding with undefined password.');
            effectivePassword = undefined;
        }
    } else {
        // Password was provided directly in settings (could be "" or "actual_password")
        console.log('[MSSQL Keytar] For test connection, using password provided in settings input.');
    }

    let testPool: sql.ConnectionPool | null = null;
    try {
        testPool = new sql.ConnectionPool({
            user: settings.user,
            password: effectivePassword, // Use the determined effective password
            database: settings.database,
            server: settings.server,
            port: settings.port,
            pool: { max: 1, min: 0, idleTimeoutMillis: 5000 }, // Minimal pool for testing
            options: {
                encrypt: settings.encrypt ?? true,
                trustServerCertificate: settings.trustServerCertificate ?? false
            },
            connectionTimeout: 5000, // Shorter timeout for testing
            requestTimeout: 5000
        });
        await testPool.connect();
        console.log('Connection test successful with effective password.');
        return true;
    } catch (error) {
        console.error('Connection test failed with effective password:', (error as Error).message);
        return false;
    } finally {
        if (testPool) {
            await testPool.close();
        }
    }
}


async function getConnectionPool(): Promise<sql.ConnectionPool> {
    if (pool?.connected) {
        return pool;
    }
     // Always try to close existing pool before creating new one
    await closeMssqlPool();

    const settings = await getMssqlSettingsWithKeytar(); // Fetch settings including password from Keytar
    if (!settings) {
        throw new Error('MSSQL settings not configured or password missing.');
    }

    try {
         console.log(`Attempting to connect to ${settings.server}:${settings.port}/${settings.database} as ${settings.user}`);
         pool = new sql.ConnectionPool({
            user: settings.user,
            password: settings.password, // Password retrieved from Keytar
            database: settings.database,
            server: settings.server,
            port: settings.port,
            pool: {
                max: 10, // Adjust pool size as needed
                min: 0,
                idleTimeoutMillis: 30000
            },
            options: {
                encrypt: settings.encrypt ?? true, // Provide default
                trustServerCertificate: settings.trustServerCertificate ?? false // Provide default
            },
             connectionTimeout: 15000, // Standard connection timeout
             requestTimeout: 15000    // Standard request timeout
        });

        await pool.connect();
        console.log('MSSQL Connection Pool established.');

        pool.on('error', async (err) => {
            console.error('MSSQL Pool Error:', err);
            await closeMssqlPool(); // Attempt to close the errored pool
        });

        return pool;
    } catch (error) {
        console.error('Failed to create connection pool:', error);
        pool = null; // Ensure pool is null on failure
        throw new Error(`Failed to connect to MSSQL: ${(error as Error).message}`); // Rethrow with clearer message
    }
}

// Fetch Customers (Query based on tKunde.md and tAdresse.md)
export async function fetchJtlCustomers() {
    try {
        const pool = await getConnectionPool();
        // Combine tKunde and tAdresse (standard address)
        // Use explicit column aliases to avoid ambiguity and match expected structure
        const result = await pool.request().query(`
            SELECT
                k.kKunde,
                k.dErstellt AS CustomerDateCreated,
                k.cSperre AS CustomerBlocked, -- Example: Assuming 'Y'/'N'
                k.cKundenNr AS CustomerNumber,
                a.cFirma AS AddressCompany,
                a.cVorname AS AddressFirstName,
                a.cName AS AddressLastName,
                a.cStrasse AS AddressStreet,
                a.cPLZ AS AddressZipCode,
                a.cOrt AS AddressCity,
                a.cLand AS AddressCountry,
                a.cTel AS AddressPhone,
                a.cMobil AS AddressMobile,
                a.cMail AS AddressEmail,
                a.cBundesland AS AddressState,
                a.cISO AS AddressCountryCode,
                a.cUSTID AS AddressVatId
            FROM dbo.tKunde k
            LEFT JOIN dbo.tAdresse a ON k.kKunde = a.kKunde AND a.nStandard = 1 -- Ensure join to standard address
            ORDER BY k.kKunde;
        `);
        console.log(`Fetched ${result.recordset.length} customers from JTL.`);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching JTL customers:', error);
        throw error; // Re-throw to be handled by sync service
    }
}

// Fetch Products (Query needs dbo.tArtikel structure - ADJUST BASED ON ACTUAL SCHEMA)
export async function fetchJtlProducts() {
    console.log("[MSSQL] Attempting to fetch JTL products...");
    const startTime = performance.now();
    try {
        const pool = await getConnectionPool();
        // Corrected Query: Joining tArtikelBeschreibung for Name/Description and tLagerbestand for StockLevel.
        // Assumes German language (kSprache = 1) for tArtikelBeschreibung.
        const result = await pool.request().query(`
            SELECT
                a.kArtikel,
                a.cArtNr AS Sku,
                tab.cName AS Name, -- From tArtikelBeschreibung
                tab.cBeschreibung AS Description, -- From tArtikelBeschreibung
                a.fVKNetto AS PriceNet,
                a.cBarcode AS Barcode,
                tl.fLagerbestand AS StockLevel, -- From tLagerbestand
                a.cAktiv AS IsActive,
                a.dErstelldatum AS ProductDateCreated
            FROM dbo.tArtikel a
            LEFT JOIN dbo.tArtikelBeschreibung tab ON a.kArtikel = tab.kArtikel AND tab.kSprache = 1 -- Assuming kSprache = 1
            LEFT JOIN dbo.tLagerbestand tl ON a.kArtikel = tl.kArtikel
            ORDER BY a.kArtikel;
        `);
         const duration = ((performance.now() - startTime) / 1000).toFixed(2);
         console.log(`[MSSQL] Fetched ${result.recordset.length} products from JTL in ${duration}s.`);
        return result.recordset;
    } catch (error) {
        console.error('[MSSQL] Error fetching JTL products:', error);
        throw error; // Re-throw
    }
}

export async function fetchJtlFirmen() {
    try {
        const pool = await getConnectionPool();
        const result = await pool.request().query(`SELECT kFirma, cName FROM dbo.tFirma ORDER BY cName;`);
        console.log(`Fetched ${result.recordset.length} companies from JTL.`);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching JTL Firmen:', error);
        throw error;
    }
}

export async function fetchJtlWarenlager() {
    try {
        const pool = await getConnectionPool();
        // Assuming tWarenlager has an nAktiv column, similar to tFirma. If not, remove `WHERE nAktiv = 1`.
        const result = await pool.request().query(`SELECT kWarenlager, cName FROM dbo.tWarenlager WHERE nAktiv = 1 ORDER BY cName;`);
        console.log(`Fetched ${result.recordset.length} active warehouses from JTL.`);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching JTL Warenlager:', error);
        throw error;
    }
}

export async function fetchJtlZahlungsarten() {
    try {
        const pool = await getConnectionPool();
        const result = await pool.request().query(`SELECT kZahlungsart, cName FROM dbo.tZahlungsart WHERE nAktiv = 1 ORDER BY cName;`);
        console.log(`Fetched ${result.recordset.length} active payment types from JTL.`);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching JTL Zahlungsarten:', error);
        throw error;
    }
}

export async function fetchJtlVersandarten() {
    try {
        const pool = await getConnectionPool();
        const result = await pool.request().query(`SELECT kVersandart, cName FROM dbo.tversandart WHERE cAktiv = 'Y' ORDER BY cName;`); // cAktiv is 'Y'/'N' in tversandart
        console.log(`Fetched ${result.recordset.length} active shipping types from JTL.`);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching JTL Versandarten:', error);
        throw error;
    }
}

export async function closeMssqlPool(): Promise<void> {
    if (pool) {
        try {
            await pool.close();
            console.log('MSSQL Connection Pool closed.');
        } catch (error) {
            console.error('Error closing MSSQL pool:', error);
            // Don't rethrow here usually, just log it.
        } finally {
            pool = null;
        }
    }
}

// Should be called once during app startup
export function initializeMssqlService() {
    // Optional: Pre-connect if settings exist? Generally better to connect on demand.
    console.log("MSSQL Service (Keytar) Initialized.");
}

export async function executeTransactionalQuery(
    queryString: string,
    params: { name: string, type: any, value: any }[]
): Promise<{ success: boolean; kAuftrag?: number; cAuftragsNr?: string; error?: string }> {
    let currentPool: sql.ConnectionPool | null = null; // Use a local variable for the pool in this function
    let transaction: sql.Transaction | null = null;
    try {
        currentPool = await getConnectionPool(); // Assumes getConnectionPool returns the existing global pool or a new one
        transaction = new sql.Transaction(currentPool);
        await transaction.begin();

        const request = new sql.Request(transaction);
        params.forEach(p => request.input(p.name, p.type, p.value));

        const result = await request.query(queryString);

        await transaction.commit();

        const output = result.recordset && result.recordset.length > 0 ? result.recordset[0] : {};

        return {
            success: true,
            kAuftrag: output.kAuftrag,
            cAuftragsNr: output.cAuftragsNr
        };
    } catch (err: any) {
        if (transaction) { // Check if transaction object was created
            try {
                // Attempt to rollback if the transaction hasn't been committed or already rolled back.
                // The rollback method itself often handles cases where it's called multiple times or on an inactive transaction,
                // but specific error handling for rollback failure might be needed depending on mssql library version.
                await transaction.rollback();
                console.log("Transaction rolled back due to error.");
            } catch (rbErr: any) {
                // Log rollback error, but the primary error is more important to return.
                console.error("Error rolling back transaction:", rbErr.message);
            }
        }
        console.error('Transactional query failed:', err.message);
        return { success: false, error: err.message };
    }
    // The connection pool (`currentPool` which likely points to the global `pool`)
    // is managed by its own lifecycle (e.g., closeMssqlPool on app quit or settings change).
    // No explicit pool closing here unless this function specifically creates and manages its own pool instance.
}