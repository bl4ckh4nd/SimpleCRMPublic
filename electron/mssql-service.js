const sql = require('mssql');
// In CommonJS, electron-store exports the constructor as the default export
const Store = require('electron-store').default || require('electron-store');

const store = new Store({
    defaults: {
        mssqlSettings: null
    }
});

let pool = null;

function saveMssqlSettings(settings) {
    store.set('mssqlSettings', settings);
}

function getMssqlSettings() {
    return store.get('mssqlSettings');
}

async function testConnection(settings) {
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

async function getConnectionPool() {
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

async function fetchCustomers() {
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

async function closeMssqlPool() {
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

module.exports = {
    saveMssqlSettings,
    getMssqlSettings,
    testConnection,
    fetchCustomers,
    closeMssqlPool
};
