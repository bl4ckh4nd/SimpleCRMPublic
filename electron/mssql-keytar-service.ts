import sql from 'mssql';
import Store from 'electron-store';
import keytar from 'keytar';
import { MssqlSettings } from './types'; // Assuming types.ts exists
import { performance } from 'perf_hooks'; // For timing

const STORE_KEY_SETTINGS = 'mssqlSettings_v2';
const KEYTAR_SERVICE = 'SimpleCRMElectron-MSSQL';

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
    // If server contains instance name, use it for uniqueness, otherwise just server.
    // Port is part of the key to allow different passwords for same user@server on different ports (though less common).
    const serverIdentifier = settings.server || 'unknown_server';
    return `${serverIdentifier}:${settings.port || 1433}-${settings.database || 'unknown_db'}-${settings.user || 'unknown_user'}`;
}

// Helper to get effective connection parameters based on forcePort
function getEffectiveConnectionParams(settings: MssqlSettings): Pick<MssqlSettings, 'server' | 'port'> {
    let effectiveServer = settings.server;
    let effectivePort = settings.port;

    if (settings.forcePort && settings.server && settings.server.includes('\\') && typeof settings.port === 'number') {
        console.log(`[MSSQL Keytar] 'forcePort' is true for named instance. Modifying server to connect directly.`);
        effectiveServer = settings.server.split('\\')[0]; // Use only the hostname
        // effectivePort remains settings.port (the one to be forced)
        console.log(`[MSSQL Keytar] Effective params for direct connection: Server='${effectiveServer}', Port=${effectivePort}`);
    } else if (settings.server && settings.server.includes('\\')) {
        console.log(`[MSSQL Keytar] Named instance detected. Port ${settings.port} will be ignored by mssql driver; SQL Browser will be used.`);
        // In this case, mssql library handles it, port in config might be ignored.
        // We pass the original server and port, mssql decides.
    }
    return { server: effectiveServer, port: effectivePort };
}

export async function saveMssqlSettingsWithKeytar(settings: MssqlSettings): Promise<void> {
    console.log('[MSSQL Keytar] Attempting to save settings. Clearing existing store key first.');
    store.delete(STORE_KEY_SETTINGS); // Clear existing settings first

    // settings is of type MssqlSettings. We want to store Omit<MssqlSettings, 'password'>.
    const { password, ...settingsToStore } = settings;
    // Use original server for keytar account, as "forcePort" is a connection-time override, not a change in identity for password storage.
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
        store.set(STORE_KEY_SETTINGS, settingsToStore); // settingsToStore includes forcePort
        console.log('[MSSQL Keytar] MSSQL settings (excluding password, including forcePort) saved to store. Data:', JSON.stringify(settingsToStore));
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
        // Use original server for keytar account retrieval
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

export async function clearMssqlPasswordFromKeytar(): Promise<{ success: boolean; message: string }> {
    const storedSettingsWithoutPassword = store.get(STORE_KEY_SETTINGS);
    console.log('[MSSQL Keytar] clearMssqlPasswordFromKeytar: Attempting to clear password. Current stored (non-sensitive) settings:', JSON.stringify(storedSettingsWithoutPassword));

    if (storedSettingsWithoutPassword && storedSettingsWithoutPassword.server && storedSettingsWithoutPassword.database && storedSettingsWithoutPassword.user) {
        // We need server, database, user, and port to form the correct account key
        const account = getKeytarAccount(storedSettingsWithoutPassword as Pick<MssqlSettings, 'server' | 'database' | 'user' | 'port'>);
        console.log('[MSSQL Keytar] clearMssqlPasswordFromKeytar: Generated keytar account for password deletion:', account);
        try {
            const wasPasswordDeleted = await keytar.deletePassword(KEYTAR_SERVICE, account);
            if (wasPasswordDeleted) {
                console.log('[MSSQL Keytar] Password successfully deleted from keychain for account:', account);
                // After clearing the password, it's a good idea to close any existing connection pool
                // as it might be using outdated (now cleared) credentials.
                // The next connection attempt will fail or prompt for a password if getMssqlSettingsWithKeytar is used and password is required.
                await closeMssqlPool();
                return { success: true, message: 'Password successfully cleared from secure storage.' };
            } else {
                console.log('[MSSQL Keytar] No password found in keychain for account:', account, '(it might have been already cleared or never set).');
                return { success: true, message: 'No password found in secure storage for the current settings.' };
            }
        } catch (error) {
            const errorMessage = `Failed to delete password from keychain: ${(error as Error).message}`;
            console.error('[MSSQL Keytar] clearMssqlPasswordFromKeytar:', errorMessage, error);
            return { success: false, message: errorMessage };
        }
    } else {
        const message = '[MSSQL Keytar] No complete MSSQL connection settings (server, user, database) found in store. Cannot determine which password account to clear from Keytar.';
        console.log(message);
        // This is arguably a success because there's no configured account to clear a password for.
        return { success: true, message: 'No connection settings are fully configured, so no password to clear.' };
    }
}

export async function testConnectionWithKeytar(settings: MssqlSettings): Promise<boolean> {
    let effectivePassword = settings.password;

    // If password is not provided in the settings input (i.e., undefined),
    // it means the frontend wants to test with the stored password.
    if (settings.password === undefined) {
        // Attempt to retrieve the password from Keytar
        if (settings.server && settings.database && settings.user) {
            // Use original server for keytar account for password retrieval
            const account = getKeytarAccount(settings as Pick<MssqlSettings, 'server' | 'database' | 'user' | 'port'>);
            try {
                const storedPassword = await keytar.getPassword(KEYTAR_SERVICE, account);
                effectivePassword = storedPassword !== null ? storedPassword : undefined;
                console.log('[MSSQL Keytar] For test connection, using password from keychain.');
            } catch (keytarError) {
                console.warn('[MSSQL Keytar] Could not retrieve password from keychain for test connection. Proceeding with undefined password.');
                effectivePassword = undefined;
            }
        } else {
            effectivePassword = undefined;
        }
    } else {
        // Password was provided directly in settings (could be "" or "actual_password")
        console.log('[MSSQL Keytar] For test connection, using password provided in settings input.');
    }

    const { server: connectServer, port: connectPort } = getEffectiveConnectionParams(settings);

    let testPool: sql.ConnectionPool | null = null;
    try {
        console.log(`[MSSQL Keytar] Test Connection: Attempting to connect to Server: ${connectServer}, Port: ${connectPort === undefined ? '(default)' : connectPort}`);
        testPool = new sql.ConnectionPool({
            user: settings.user,
            password: effectivePassword, // Use the determined effective password
            database: settings.database,
            server: connectServer, // Use effective server
            port: connectPort,     // Use effective port
            pool: { max: 1, min: 0, idleTimeoutMillis: 5000 }, // Minimal pool for testing
            options: {
                encrypt: settings.encrypt ?? true,
                trustServerCertificate: settings.trustServerCertificate ?? false
            },
            connectionTimeout: 10000, // Increased slightly for potentially slower direct connections
            requestTimeout: 10000
        });
        await testPool.connect();
        console.log('[MSSQL Keytar] Connection test successful.');
        return true;
    } catch (error) {
        console.error('[MSSQL Keytar] Connection test failed:', (error as Error).message);
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
    await closeMssqlPool();

    const settings = await getMssqlSettingsWithKeytar();
    if (!settings || !settings.server || !settings.user || !settings.database) { // Added more checks
        throw new Error('MSSQL settings not fully configured or password missing.');
    }

    const { server: connectServer, port: connectPort } = getEffectiveConnectionParams(settings);

    try {
         console.log(`[MSSQL Keytar] Pool: Attempting to connect to Server: ${connectServer}, Port: ${connectPort === undefined ? '(default)' : connectPort}, DB: ${settings.database}, User: ${settings.user}`);
         pool = new sql.ConnectionPool({
            user: settings.user,
            password: settings.password, // Password retrieved from Keytar
            database: settings.database,
            server: connectServer, // Use effective server
            port: connectPort,     // Use effective port
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
        console.log('[MSSQL Keytar] MSSQL Connection Pool established.');

        pool.on('error', async (err) => {
            console.error('[MSSQL Keytar] MSSQL Pool Error:', err);
            await closeMssqlPool(); // Attempt to close the errored pool
        });

        return pool;
    } catch (error) {
        console.error('[MSSQL Keytar] Failed to create connection pool:', error);
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
            LEFT JOIN (
                -- First, try to get the standard address
                SELECT kKunde, cFirma, cVorname, cName, cStrasse, cPLZ, cOrt, cLand, cTel, cMobil, cMail, cBundesland, cISO, cUSTID
                FROM dbo.tAdresse 
                WHERE nStandard = 1
                UNION ALL
                -- If no standard address exists, get the first available address
                SELECT DISTINCT a1.kKunde, a1.cFirma, a1.cVorname, a1.cName, a1.cStrasse, a1.cPLZ, a1.cOrt, a1.cLand, a1.cTel, a1.cMobil, a1.cMail, a1.cBundesland, a1.cISO, a1.cUSTID
                FROM dbo.tAdresse a1
                WHERE NOT EXISTS (SELECT 1 FROM dbo.tAdresse a2 WHERE a2.kKunde = a1.kKunde AND a2.nStandard = 1)
                AND a1.kAdresse = (SELECT MIN(kAdresse) FROM dbo.tAdresse a3 WHERE a3.kKunde = a1.kKunde)
            ) a ON k.kKunde = a.kKunde
            WHERE (k.cSperre != 'Y' OR k.cSperre IS NULL)  -- Only active customers
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
            WHERE a.cAktiv = 'Y'  -- Only active products
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
            console.log('[MSSQL Keytar] MSSQL Connection Pool closed.');
        } catch (error) {
            console.error('[MSSQL Keytar] Error closing MSSQL pool:', error);
        } finally {
            pool = null;
        }
    }
}

// Should be called once during app startup
export function initializeMssqlService() {
    console.log("[MSSQL Keytar] MSSQL Service (Keytar) Initialized.");
}

// Exported function to execute transactional queries
export async function executeTransactionalQuery(
    sqlQuery: string,
    params: { name: string; type: any; value: any }[]
): Promise<{ success: boolean; kAuftrag?: number; cAuftragsNr?: string; error?: string }> {
    let transaction: sql.Transaction | null = null;
    try {
        const pool = await getConnectionPool(); // Ensure pool is ready
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);
        params.forEach(param => {
            request.input(param.name, param.type, param.value);
        });

        const result = await request.query(sqlQuery);

        await transaction.commit();

        // Assuming the query returns kAuftrag and cAuftragsNr for order creation
        // Adjust based on actual return values for other types of transactions
        if (result.recordset && result.recordset.length > 0) {
            return {
                success: true,
                kAuftrag: result.recordset[0].kAuftrag,
                cAuftragsNr: result.recordset[0].cAuftragsNr
            };
        }
        return { success: true }; // For transactions that don't return specific IDs

    } catch (error: any) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('[MSSQL Keytar] Error during transaction rollback:', rollbackError);
            }
        }
        console.error('[MSSQL Keytar] Error in executeTransactionalQuery:', error);
        // Try to provide a more specific error message if available
        const errorMessage = error.originalError?.message || error.message || 'Unknown transaction error';
        return { success: false, error: errorMessage };
    }
}