// seed-database.ts
// Script to populate the database with fake customers and products for testing

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { generateCustomer, generateProduct, FakeCustomer, FakeProduct } from './fake-data-generators';

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

interface SeedOptions {
    customers: number;
    products: number;
    batchSize: number;
    skipConfirmation?: boolean;
}

class DatabaseSeeder {
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

    async seedCustomers(count: number, batchSize: number = 1000): Promise<void> {
        console.log(`\n🎯 Generating ${count.toLocaleString()} customers...`);
        
        // Check for existing test customers (using negative jtl_kKunde values)
        const existingTestCustomers = this.db.prepare(`
            SELECT COUNT(*) as count FROM customers 
            WHERE jtl_kKunde < 0
        `).get() as { count: number };

        if (existingTestCustomers.count > 0) {
            console.log(`⚠️  Found ${existingTestCustomers.count} existing test customers`);
        }

        const insertStmt = this.db.prepare(`
            INSERT INTO customers (
                jtl_kKunde, name, firstName, company, email, phone, mobile, 
                street, zipCode, city, country, status, notes, affiliateLink,
                lastModifiedLocally
            ) VALUES (
                @jtl_kKunde, @name, @firstName, @company, @email, @phone, @mobile,
                @street, @zipCode, @city, @country, @status, @notes, @affiliateLink,
                @lastModifiedLocally
            )
        `);

        const now = new Date().toISOString();
        let inserted = 0;
        let batchCount = 0;

        while (inserted < count) {
            const currentBatchSize = Math.min(batchSize, count - inserted);
            const customers: FakeCustomer[] = [];

            // Generate batch
            for (let i = 0; i < currentBatchSize; i++) {
                customers.push(generateCustomer(inserted + i));
            }

            // Insert batch in transaction
            const insertBatch = this.db.transaction((customers: FakeCustomer[]) => {
                for (let i = 0; i < customers.length; i++) {
                    const customer = customers[i];
                    insertStmt.run({
                        ...customer,
                        jtl_kKunde: -(inserted + i + 1), // Use negative numbers to distinguish from real JTL IDs
                        lastModifiedLocally: now
                    });
                }
            });

            try {
                insertBatch(customers);
                inserted += currentBatchSize;
                batchCount++;
                
                const progress = (inserted / count * 100).toFixed(1);
                process.stdout.write(`\r📝 Inserted ${inserted.toLocaleString()}/${count.toLocaleString()} customers (${progress}%) - Batch ${batchCount}`);
                
            } catch (error) {
                console.error(`\n❌ Error in batch ${batchCount}:`, error);
                throw error;
            }
        }

        console.log(`\n✅ Successfully inserted ${inserted.toLocaleString()} customers in ${batchCount} batches`);
    }

    async seedProducts(count: number, batchSize: number = 1000): Promise<void> {
        console.log(`\n🎯 Generating ${count.toLocaleString()} products...`);
        
        // Check for existing test products
        const existingTestProducts = this.db.prepare(`
            SELECT COUNT(*) as count FROM products 
            WHERE sku LIKE 'PRD-%' OR sku LIKE 'ART-%' OR sku LIKE 'ITM-%' OR sku LIKE 'SKU-%'
        `).get() as { count: number };

        if (existingTestProducts.count > 0) {
            console.log(`⚠️  Found ${existingTestProducts.count} existing test products`);
        }

        const insertStmt = this.db.prepare(`
            INSERT INTO products (
                name, sku, description, price, isActive, 
                dateCreated, lastModified, lastModifiedLocally
            ) VALUES (
                @name, @sku, @description, @price, @isActive,
                @dateCreated, @lastModified, @lastModifiedLocally
            )
        `);

        const now = new Date().toISOString();
        let inserted = 0;
        let batchCount = 0;

        while (inserted < count) {
            const currentBatchSize = Math.min(batchSize, count - inserted);
            const products: FakeProduct[] = [];

            // Generate batch
            for (let i = 0; i < currentBatchSize; i++) {
                products.push(generateProduct(inserted + i));
            }

            // Insert batch in transaction
            const insertBatch = this.db.transaction((products: FakeProduct[]) => {
                for (const product of products) {
                    insertStmt.run({
                        ...product,
                        isActive: product.isActive ? 1 : 0, // Convert boolean to integer
                        dateCreated: now,
                        lastModified: now,
                        lastModifiedLocally: now
                    });
                }
            });

            try {
                insertBatch(products);
                inserted += currentBatchSize;
                batchCount++;
                
                const progress = (inserted / count * 100).toFixed(1);
                process.stdout.write(`\r📦 Inserted ${inserted.toLocaleString()}/${count.toLocaleString()} products (${progress}%) - Batch ${batchCount}`);
                
            } catch (error) {
                console.error(`\n❌ Error in batch ${batchCount}:`, error);
                throw error;
            }
        }

        console.log(`\n✅ Successfully inserted ${inserted.toLocaleString()} products in ${batchCount} batches`);
    }

    showDatabaseStats(): void {
        const customerCount = this.db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
        const productCount = this.db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
        const testCustomerCount = this.db.prepare(`
            SELECT COUNT(*) as count FROM customers 
            WHERE jtl_kKunde < 0
        `).get() as { count: number };
        const testProductCount = this.db.prepare(`
            SELECT COUNT(*) as count FROM products 
            WHERE sku LIKE 'PRD-%' OR sku LIKE 'ART-%' OR sku LIKE 'ITM-%' OR sku LIKE 'SKU-%'
        `).get() as { count: number };

        console.log('\n📊 Database Statistics:');
        console.log(`   👥 Total Customers: ${customerCount.count.toLocaleString()}`);
        console.log(`   🧪 Test Customers: ${testCustomerCount.count.toLocaleString()}`);
        console.log(`   📦 Total Products: ${productCount.count.toLocaleString()}`);
        console.log(`   🧪 Test Products: ${testProductCount.count.toLocaleString()}`);
    }

    close(): void {
        this.db.close();
    }
}

async function promptConfirmation(message: string): Promise<boolean> {
    const readline = require('readline');
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
    const options: SeedOptions = {
        customers: 30000,
        products: 3500,
        batchSize: 1000,
        skipConfirmation: false
    };

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--customers':
                options.customers = parseInt(args[++i]) || options.customers;
                break;
            case '--products':
                options.products = parseInt(args[++i]) || options.products;
                break;
            case '--batch-size':
                options.batchSize = parseInt(args[++i]) || options.batchSize;
                break;
            case '--yes':
            case '-y':
                options.skipConfirmation = true;
                break;
            case '--help':
            case '-h':
                console.log(`
SimpleCRM Database Seeder

Usage: npm run seed-db [options]

Options:
  --customers <number>    Number of customers to generate (default: 30000)
  --products <number>     Number of products to generate (default: 3500)
  --batch-size <number>   Batch size for insertions (default: 1000)
  --yes, -y              Skip confirmation prompt
  --help, -h             Show this help message

Examples:
  npm run seed-db                               # Use defaults
  npm run seed-db --customers 1000 --products 100  # Generate smaller dataset
  npm run seed-db --yes                         # Skip confirmation
`);
                process.exit(0);
                break;
        }
    }

    console.log(`
🌱 SimpleCRM Database Seeder
=============================

Configuration:
  📍 Database: ${dbPath}
  👥 Customers: ${options.customers.toLocaleString()}
  📦 Products: ${options.products.toLocaleString()}
  📊 Batch size: ${options.batchSize.toLocaleString()}
`);

    if (!options.skipConfirmation) {
        const confirmed = await promptConfirmation('Do you want to proceed with seeding the database?');
        if (!confirmed) {
            console.log('❌ Seeding cancelled');
            process.exit(0);
        }
    }

    const seeder = new DatabaseSeeder();
    
    try {
        const startTime = Date.now();

        // Show initial stats
        seeder.showDatabaseStats();

        // Seed customers
        if (options.customers > 0) {
            await seeder.seedCustomers(options.customers, options.batchSize);
        }

        // Seed products
        if (options.products > 0) {
            await seeder.seedProducts(options.products, options.batchSize);
        }

        // Show final stats
        seeder.showDatabaseStats();

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n🎉 Seeding completed successfully in ${duration} seconds!`);

    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        seeder.close();
    }
}

// Handle process signals
process.on('SIGINT', () => {
    console.log('\n🛑 Seeding interrupted by user');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Seeding terminated');
    process.exit(0);
});

if (require.main === module) {
    main().catch(console.error);
}

export type { SeedOptions };
export { DatabaseSeeder };