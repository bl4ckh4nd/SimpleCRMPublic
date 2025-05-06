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
    const { password, ...settingsToStore } = settings;
    const account = getKeytarAccount(settings);

    try {
        await keytar.setPassword(KEYTAR_SERVICE, account, password);
        store.set(STORE_KEY_SETTINGS, settingsToStore);
        console.log('MSSQL settings saved (password in keychain).');
        // Ensure pool is reset if settings change
         await closeMssqlPool();
    } catch (error) {
        console.error('Failed to save password to keychain:', error);
        // It's better to throw an Error object
        throw new Error(`Failed to save password securely: ${(error as Error).message}`);
    }
}

export async function getMssqlSettingsWithKeytar(): Promise<MssqlSettings | null> {
    const storedSettings = store.get(STORE_KEY_SETTINGS);
    if (!storedSettings) {
        return null;
    }

    const account = getKeytarAccount(storedSettings);
    try {
        const password = await keytar.getPassword(KEYTAR_SERVICE, account);
        if (password === null) {
            console.warn(`Password not found in keychain for account: ${account}. User might need to re-enter.`);
             // Optionally clear stored settings if password is gone?
             // store.delete(STORE_KEY_SETTINGS);
            return null; // Or throw an error prompting re-configuration
        }
        // Combine stored settings with the retrieved password
        return { ...storedSettings, password };
    } catch (error) {
        console.error('Failed to retrieve password from keychain:', error);
        // Return null or partial settings, indicating an issue.
        return null;
    }
}

export async function testConnectionWithKeytar(settings: MssqlSettings): Promise<boolean> {
    // This function now expects the full settings object including the potentially plaintext password from the form
    // It doesn't rely on fetching from keytar itself, assuming the caller (UI) provides the password to test
    let testPool: sql.ConnectionPool | null = null;
    try {
         testPool = new sql.ConnectionPool({
            user: settings.user,
            password: settings.password, // Use password directly from input
            database: settings.database,
            server: settings.server,
            port: settings.port,
            pool: { max: 1, min: 0, idleTimeoutMillis: 5000 }, // Minimal pool for testing
            options: {
                encrypt: settings.encrypt ?? true, // Provide default value
                trustServerCertificate: settings.trustServerCertificate ?? false // Provide default value
            },
            connectionTimeout: 5000, // Shorter timeout for testing
            requestTimeout: 5000
        });
        await testPool.connect();
        console.log('Connection test successful.');
        return true;
    } catch (error) {
        console.error('Connection test failed:', (error as Error).message);
        return false;
    } finally {
         // Ensure pool closure
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