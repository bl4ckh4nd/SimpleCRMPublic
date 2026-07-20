// cleanup-database.ts
// Script to safely remove generated test data from the database

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Determine database path - match Electron's app.getPath('userData') behavior
function getElectronUserDataPath(): string {
    if (process.platform === 'win32') {
        return path.join(process.env.APPDATA || '', 'Electron');
    } else if (process.platform === 'darwin') {
        return path.join(process.env.HOME || '', 'Library', 'Application Support', 'Electron');
    } else {
        // Linux and other platforms
        return path.join(process.env.HOME || '', '.config', 'Electron');
    }
}

// Try to find the database in multiple possible locations
function findDatabasePath(): string {
    const possiblePaths = [
        // Standard Electron user data location
        path.join(getElectronUserDataPath(), 'database.sqlite'),
        // Development fallback location
        path.join(process.cwd(), 'userData', 'database.sqlite'),
        // Alternative development location
        path.join(process.cwd(), 'database.sqlite')
    ];

    for (const dbPath of possiblePaths) {
        if (fs.existsSync(dbPath)) {
            console.log(`✅ Found database at: ${dbPath}`);
            return dbPath;
        }
    }

    // If no database found, return the primary location for error reporting
    return possiblePaths[0];
}

const dbPath = findDatabasePath();

interface CleanupOptions {
    customers: boolean;
    products: boolean;
    resetAutoIncrement: boolean;
    skipConfirmation: boolean;
    dryRun: boolean;
}

class DatabaseCleaner {
    private db: Database.Database;

    constructor() {
        if (!fs.existsSync(dbPath)) {
            console.error(`❌ Database not found!`);
            console.error('\nSearched in the following locations:');
            const searchPaths = [
                path.join(getElectronUserDataPath(), 'database.sqlite'),
                path.join(process.cwd(), 'userData', 'database.sqlite'),
                path.join(process.cwd(), 'database.sqlite')
            ];
            searchPaths.forEach(p => console.error(`  - ${p}`));
            console.error('\n💡 To create the database:');
            console.error('   1. Run the SimpleCRM application: npm run electron:dev');
            console.error('   2. Wait for the app to fully load');
            console.error('   3. Close the app and retry this script');
            process.exit(1);
        }

        this.db = new Database(dbPath, { verbose: console.log });
        this.db.exec('PRAGMA foreign_keys = ON;');
        console.log(`✅ Connected to database at: ${dbPath}`);
    }

    analyzeTestData(): { customers: number; products: number; dealProducts: number } {
        const testCustomers = this.db.prepare(`
            SELECT COUNT(*) as count FROM customers 
            WHERE jtl_kKunde < 0
        `).get() as { count: number };

        const testProducts = this.db.prepare(`
            SELECT COUNT(*) as count FROM products 
            WHERE sku LIKE 'PRD-%' OR sku LIKE 'ART-%' OR sku LIKE 'ITM-%' OR sku LIKE 'SKU-%'
        `).get() as { count: number };

        // Check for deal_products that reference test products
        const dealProductsWithTestProducts = this.db.prepare(`
            SELECT COUNT(*) as count FROM deal_products dp
            INNER JOIN products p ON dp.product_id = p.id
            WHERE p.sku LIKE 'PRD-%' OR p.sku LIKE 'ART-%' OR p.sku LIKE 'ITM-%' OR p.sku LIKE 'SKU-%'
        `).get() as { count: number };

        return {
            customers: testCustomers.count,
            products: testProducts.count,
            dealProducts: dealProductsWithTestProducts.count
        };
    }

    async cleanupTestCustomers(dryRun: boolean = false): Promise<number> {
        const countStmt = this.db.prepare(`
            SELECT COUNT(*) as count FROM customers 
            WHERE jtl_kKunde < 0
        `);
        
        const count = (countStmt.get() as { count: number }).count;
        
        if (count === 0) {
            console.log('📝 No test customers found to clean up');
            return 0;
        }

        if (dryRun) {
            console.log(`🧪 DRY RUN: Would delete ${count.toLocaleString()} test customers`);
            return count;
        }

        console.log(`🗑️  Deleting ${count.toLocaleString()} test customers...`);

        // Delete in transaction to maintain data integrity
        const deleteTransaction = this.db.transaction(() => {
            // Delete custom field values for these customers first
            const deleteCustomFieldValues = this.db.prepare(`
                DELETE FROM customer_custom_field_values 
                WHERE customer_id IN (
                    SELECT id FROM customers 
                    WHERE jtl_kKunde < 0
                )
            `);
            const customFieldValuesDeleted = deleteCustomFieldValues.run().changes;

            // Delete deals (which will cascade to deal_products and tasks due to FK constraints)
            const deleteDeals = this.db.prepare(`
                DELETE FROM deals 
                WHERE customer_id IN (
                    SELECT id FROM customers 
                    WHERE jtl_kKunde < 0
                )
            `);
            const dealsDeleted = deleteDeals.run().changes;

            // Delete the customers themselves
            const deleteCustomers = this.db.prepare(`
                DELETE FROM customers 
                WHERE jtl_kKunde < 0
            `);
            const customersDeleted = deleteCustomers.run().changes;

            console.log(`   📊 Deleted ${customFieldValuesDeleted} custom field values`);
            console.log(`   📊 Deleted ${dealsDeleted} associated deals`);
            console.log(`   📊 Deleted ${customersDeleted} test customers`);

            return customersDeleted;
        });

        const deleted = deleteTransaction();
        console.log(`✅ Successfully cleaned up ${deleted.toLocaleString()} test customers`);
        return deleted;
    }

    async cleanupTestProducts(dryRun: boolean = false): Promise<number> {
        const countStmt = this.db.prepare(`
            SELECT COUNT(*) as count FROM products 
            WHERE sku LIKE 'PRD-%' OR sku LIKE 'ART-%' OR sku LIKE 'ITM-%' OR sku LIKE 'SKU-%'
        `);
        
        const count = (countStmt.get() as { count: number }).count;
        
        if (count === 0) {
            console.log('📦 No test products found to clean up');
            return 0;
        }

        if (dryRun) {
            console.log(`🧪 DRY RUN: Would delete ${count.toLocaleString()} test products`);
            return count;
        }

        console.log(`🗑️  Deleting ${count.toLocaleString()} test products...`);

        // Delete in transaction
        const deleteTransaction = this.db.transaction(() => {
            // First delete deal_products that reference test products
            const deleteDealProducts = this.db.prepare(`
                DELETE FROM deal_products 
                WHERE product_id IN (
                    SELECT id FROM products 
                    WHERE sku LIKE 'PRD-%' OR sku LIKE 'ART-%' OR sku LIKE 'ITM-%' OR sku LIKE 'SKU-%'
                )
            `);
            const dealProductsDeleted = deleteDealProducts.run().changes;

            // Then delete the products themselves
            const deleteProducts = this.db.prepare(`
                DELETE FROM products 
                WHERE sku LIKE 'PRD-%' OR sku LIKE 'ART-%' OR sku LIKE 'ITM-%' OR sku LIKE 'SKU-%'
            `);
            const productsDeleted = deleteProducts.run().changes;

            console.log(`   📊 Deleted ${dealProductsDeleted} deal-product relationships`);
            console.log(`   📊 Deleted ${productsDeleted} test products`);

            return productsDeleted;
        });

        const deleted = deleteTransaction();
        console.log(`✅ Successfully cleaned up ${deleted.toLocaleString()} test products`);
        return deleted;
    }

    resetAutoIncrementCounters(dryRun: boolean = false): void {
        if (dryRun) {
            console.log('🧪 DRY RUN: Would reset auto-increment counters');
            return;
        }

        console.log('🔄 Resetting auto-increment counters...');

        // Get current max IDs
        const maxCustomerId = this.db.prepare('SELECT MAX(id) as maxId FROM customers').get() as { maxId: number | null };
        const maxProductId = this.db.prepare('SELECT MAX(id) as maxId FROM products').get() as { maxId: number | null };

        // Reset sequences
        if (maxCustomerId.maxId) {
            this.db.exec(`UPDATE sqlite_sequence SET seq = ${maxCustomerId.maxId} WHERE name = 'customers'`);
            console.log(`   📊 Reset customers sequence to ${maxCustomerId.maxId}`);
        } else {
            this.db.exec("DELETE FROM sqlite_sequence WHERE name = 'customers'");
            console.log('   📊 Reset customers sequence to 0 (table empty)');
        }

        if (maxProductId.maxId) {
            this.db.exec(`UPDATE sqlite_sequence SET seq = ${maxProductId.maxId} WHERE name = 'products'`);
            console.log(`   📊 Reset products sequence to ${maxProductId.maxId}`);
        } else {
            this.db.exec("DELETE FROM sqlite_sequence WHERE name = 'products'");
            console.log('   📊 Reset products sequence to 0 (table empty)');
        }

        console.log('✅ Auto-increment counters reset successfully');
    }

    showDatabaseStats(): void {
        const customerCount = this.db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
        const productCount = this.db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
        const testData = this.analyzeTestData();

        console.log('\n📊 Database Statistics:');
        console.log(`   👥 Total Customers: ${customerCount.count.toLocaleString()}`);
        console.log(`   🧪 Test Customers: ${testData.customers.toLocaleString()}`);
        console.log(`   📦 Total Products: ${productCount.count.toLocaleString()}`);
        console.log(`   🧪 Test Products: ${testData.products.toLocaleString()}`);
        if (testData.dealProducts > 0) {
            console.log(`   🔗 Deal-Products with test products: ${testData.dealProducts.toLocaleString()}`);
        }
    }

    close(): void {
        this.db.close();
    }
}

async function promptConfirmation(message: string): Promise<boolean> {
    const readline = await import('node:readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(`${message} (y/N): `, (answer: string) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

async function main() {
    const args = process.argv.slice(2);
    const options: CleanupOptions = {
        customers: true,
        products: true,
        resetAutoIncrement: true,
        skipConfirmation: false,
        dryRun: false
    };

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--customers-only':
                options.customers = true;
                options.products = false;
                break;
            case '--products-only':
                options.customers = false;
                options.products = true;
                break;
            case '--no-reset':
                options.resetAutoIncrement = false;
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--yes':
            case '-y':
                options.skipConfirmation = true;
                break;
            case '--help':
            case '-h':
                console.log(`
SimpleCRM Database Cleanup

Usage: npm run cleanup-db [options]

Options:
  --customers-only       Only clean up test customers
  --products-only        Only clean up test products
  --no-reset            Don't reset auto-increment counters
  --dry-run             Show what would be deleted without actually deleting
  --yes, -y             Skip confirmation prompt
  --help, -h            Show this help message

Examples:
  npm run cleanup-db                    # Clean up all test data
  npm run cleanup-db --dry-run          # Preview what would be deleted
  npm run cleanup-db --customers-only   # Only remove test customers
  npm run cleanup-db --yes              # Skip confirmation
`);
                process.exit(0);
                break;
        }
    }

    console.log(`
🧹 SimpleCRM Database Cleanup
==============================

Configuration:
  📍 Database: ${dbPath}
  👥 Clean customers: ${options.customers}
  📦 Clean products: ${options.products}
  🔄 Reset counters: ${options.resetAutoIncrement}
  🧪 Dry run: ${options.dryRun}
`);

    const cleaner = new DatabaseCleaner();
    
    try {
        // Show current stats
        cleaner.showDatabaseStats();
        
        const testData = cleaner.analyzeTestData();
        const totalToDelete = (options.customers ? testData.customers : 0) + 
                            (options.products ? testData.products : 0);

        if (totalToDelete === 0) {
            console.log('\n🎉 No test data found to clean up!');
            return;
        }

        if (!options.skipConfirmation && !options.dryRun) {
            console.log(`\n⚠️  This will delete ${totalToDelete.toLocaleString()} test records`);
            const confirmed = await promptConfirmation('Are you sure you want to proceed?');
            if (!confirmed) {
                console.log('❌ Cleanup cancelled');
                process.exit(0);
            }
        }

        const startTime = Date.now();
        let totalDeleted = 0;

        // Clean up customers
        if (options.customers) {
            totalDeleted += await cleaner.cleanupTestCustomers(options.dryRun);
        }

        // Clean up products
        if (options.products) {
            totalDeleted += await cleaner.cleanupTestProducts(options.dryRun);
        }

        // Reset auto-increment counters
        if (options.resetAutoIncrement && !options.dryRun && totalDeleted > 0) {
            cleaner.resetAutoIncrementCounters();
        }

        // Show final stats
        if (!options.dryRun) {
            cleaner.showDatabaseStats();
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        if (options.dryRun) {
            console.log(`\n🧪 Dry run completed in ${duration} seconds`);
            console.log(`   Would have deleted ${totalDeleted.toLocaleString()} test records`);
        } else {
            console.log(`\n🎉 Cleanup completed successfully in ${duration} seconds!`);
            console.log(`   Deleted ${totalDeleted.toLocaleString()} test records`);
        }

    } catch (error) {
        console.error('\n❌ Cleanup failed:', error);
        process.exit(1);
    } finally {
        cleaner.close();
    }
}

// Handle process signals
process.on('SIGINT', () => {
    console.log('\n🛑 Cleanup interrupted by user');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Cleanup terminated');
    process.exit(0);
});

if (require.main === module) {
    main().catch(console.error);
}

export type { CleanupOptions };
export { DatabaseCleaner };
