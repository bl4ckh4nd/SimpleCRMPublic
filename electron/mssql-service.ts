import sql from 'mssql';
import Store from 'electron-store';
import { MssqlSettings, MssqlError } from './types';

// Define the schema type explicitly
type MssqlStoreSchema = {
    mssqlSettings: MssqlSettings | null;
};

// Use the explicit type when creating the store instance
const store: Store<MssqlStoreSchema> = new Store<MssqlStoreSchema>({
    defaults: {
        mssqlSettings: null
    }
});

let pool: sql.ConnectionPool | null = null;

export function saveMssqlSettings(settings: MssqlSettings): void {
    store.set('mssqlSettings', settings);
}

export function getMssqlSettings(): MssqlSettings | null {
    return store.get('mssqlSettings');
}

export async function testConnection(settings: MssqlSettings): Promise<boolean> {
    const testPool = new sql.ConnectionPool({
        user: settings.user,
        password: settings.password,
        database: settings.database,
        server: settings.server,
        port: settings.port,
        options: {
            encrypt: settings.encrypt,
            trustServerCertificate: settings.trustServerCertificate
        }
    });

    try {
        await testPool.connect();
        await testPool.close();
        return true;
    } catch (error) {
        console.error('Connection test failed:', error);
        return false;
    }
}

async function getConnectionPool(): Promise<sql.ConnectionPool> {
    if (pool && pool.connected) {
        return pool;
    }

    const settings = getMssqlSettings();
    if (!settings) {
        throw new Error('MSSQL settings not configured');
    }

    try {
        pool = await new sql.ConnectionPool({
            user: settings.user,
            password: settings.password,
            database: settings.database,
            server: settings.server,
            port: settings.port,
            options: {
                encrypt: settings.encrypt,
                trustServerCertificate: settings.trustServerCertificate
            }
        }).connect();

        pool.on('error', err => {
            console.error('Pool error:', err);
            pool?.close();
            pool = null;
        });

        return pool;
    } catch (error) {
        console.error('Failed to create connection pool:', error);
        throw error;
    }
}

export async function fetchCustomers() {
    try {
        const pool = await getConnectionPool();
        const result = await pool.request().query(`
            SELECT 
                k.kKunde,
                k.dErstellt,
                k.cSperre,
                a.cFirma,
                a.cVorname,
                a.cName,
                a.cStrasse,
                a.cPLZ,
                a.cOrt,
                a.cLand,
                a.cTel,
                a.cMobil,
                a.cMail
            FROM dbo.tKunde k
            LEFT JOIN dbo.tAdresse a ON k.kKunde = a.kKunde AND a.nStandard = 1
            ORDER BY a.cName, a.cVorname;
        `);
        
        return result.recordset;
    } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
    }
}

export async function closeMssqlPool(): Promise<void> {
    if (pool) {
        try {
            await pool.close();
            pool = null;
        } catch (error) {
            console.error('Error closing pool:', error);
            throw error;
        }
    }
}
