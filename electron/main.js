// Main Electron process
const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron'); // Added 'protocol'
const path = require('path');
const windowStateKeeper = require('electron-window-state');
const fs = require('fs'); // For checking directory existence

// Helper function to parse port
function parsePort(portInput) {
  if (portInput === null || portInput === undefined) {
    return undefined; // No port provided
  }

  let portNumber;
  if (typeof portInput === 'number') {
    portNumber = portInput;
  } else if (typeof portInput === 'string') {
    if (portInput.trim() === '') {
      return undefined; // Empty string
    }
    portNumber = Number(portInput);
  } else {
    console.warn(`[Electron Main] Invalid port type received: ${typeof portInput}. Value: '${portInput}'. Will be treated as undefined.`);
    return undefined;
  }

  if (Number.isInteger(portNumber) && portNumber > 0 && portNumber <= 65535) {
    return portNumber;
  }
  console.warn(`[Electron Main] Invalid port value received: '${portInput}'. Resulted in '${portNumber}'. Will be treated as undefined.`);
  return undefined; // Invalid port number
}

const {
  initializeDatabase,
  closeDatabase,
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsForDeal,
  addProductToDeal,
  removeProductFromDeal, // Keep if used elsewhere, or can be removed if new one covers all
  updateProductQuantityInDeal, // Keep if used elsewhere, or can be removed
  updateDealProduct, // Added for the new functionality
  removeProductFromDealById, // Added for the new functionality
  getSyncInfo, // Ensure this is imported
  setSyncInfo, // Ensure this is imported
  getDealsForCustomer,
  getTasksForCustomer,
  getAllDeals,
  getDealById,
  createDeal,
  updateDeal,
  updateDealStage,
  getAllCalendarEvents,
  getCalendarEventById,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskCompletion,
  deleteTask,
  getAllJtlFirmen, // Added
  getAllJtlWarenlager, // Added
  getAllJtlZahlungsarten, // Added
  getAllJtlVersandarten // Added
} = require('../dist-electron/sqlite-service');
const { initializeSyncService, runSync, getLastSyncStatus } = require('../dist-electron/sync-service');
const { 
  initializeMssqlService, 
  saveMssqlSettingsWithKeytar, 
  getMssqlSettingsWithKeytar, 
  testConnectionWithKeytar, 
  closeMssqlPool,
  clearMssqlPasswordFromKeytar // Import the new function
} = require('../dist-electron/mssql-keytar-service');
const { createJtlOrder } = require('../dist-electron/jtl-order-service'); // Added

// Keep a global reference of the mainWindow object
let mainWindow;

// This will hold the function to load the content into the BrowserWindow
let loadURLFunction;

// Determine mode AT THE TOP
const isDevelopment = process.env.NODE_ENV === 'development';
console.log(`[Electron Main] Initial check: process.env.NODE_ENV = ${process.env.NODE_ENV}, isDevelopment = ${isDevelopment}`);

// --- Setup loadURLFunction based on mode ---
// This setup, especially for electron-serve, needs to happen before 'app.ready'.
if (isDevelopment) {
  console.log('[Electron Main] Development mode: Setting up Vite dev server loader.');
  loadURLFunction = async (windowInstance) => {
    const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    console.log(`[Electron Main] Development mode: Attempting to load URL: ${viteDevServerUrl}`);
    try {
      await windowInstance.loadURL(viteDevServerUrl);
      console.log('[Electron Main] Development URL loaded successfully.');
    } catch (error) {
      console.error(`[Electron Main] Failed to load Vite dev server URL ${viteDevServerUrl}:`, error);
      dialog.showErrorBox("Dev Server Load Error", `Could not connect to Vite dev server at ${viteDevServerUrl}. Please ensure it's running. Error: ${error.message}`);
    }
  };
} // Production mode setup for loadURLFunction will be done inside app.whenReady()

// --- IPC Handlers Setup ---
// (setupIpcHandlers function definition should be here or imported)
// For brevity, assuming setupIpcHandlers is defined as in your existing code.
// Ensure this is defined before being called.
function setupIpcHandlers() {
  // Window control handlers
  ipcMain.on('window-control', (_, command) => {
    if (!mainWindow) return;
    switch (command) {
      case 'minimize': mainWindow.minimize(); break;
      case 'maximize': mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); break;
      case 'close': mainWindow.close(); break;
    }
  });

  ipcMain.on('save-data', (event, { data, fileName }) => {
    dialog.showSaveDialog({
      title: 'Save Data',
      defaultPath: fileName,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
      .then((result) => {
        if (!result.canceled && result.filePath) {
          fs.writeFile(result.filePath, JSON.stringify(data, null, 2), (err) => {
            if (err) {
              console.error('Failed to save file:', err);
              event.reply('save-data-reply', { success: false, error: err.message });
            } else {
              console.log('File saved successfully:', result.filePath);
              event.reply('save-data-reply', { success: true });
            }
          });
        } else {
          event.reply('save-data-reply', { success: false, error: 'Save cancelled' });
        }
      })
      .catch((err) => {
        console.error('Error showing save dialog:', err);
        event.reply('save-data-reply', { success: false, error: err.message });
      });
  });

  // --- Database Handlers (SQLite) ---
  ipcMain.handle('db:get-customers', async () => {
    try {
      return getAllCustomers();
    } catch (error) {
      console.error('IPC Error getting customers:', error);
      throw error; // Propagate error to renderer
    }
  });

  ipcMain.handle('db:get-customer', async (_, customerId) => {
    try {
      return getCustomerById(customerId);
    } catch (error) {
      console.error(`IPC Error getting customer ${customerId}:`, error);
      throw error;
    }
  });

  // Handler to create a customer
  ipcMain.handle('db:create-customer', async (_, customerData) => {
    try {
      const newCustomer = createCustomer(customerData);
      if (newCustomer) {
        return { success: true, customer: newCustomer };
      } else {
        return { success: false, error: 'Failed to create customer' };
      }
    } catch (error) {
      console.error('IPC Error creating customer:', error);
      return { success: false, error: error.message };
    }
  });

  // Handler to update a customer
  ipcMain.handle('db:update-customer', async (_, { id, customerData }) => {
    try {
      const updatedCustomer = updateCustomer(id, customerData);
      if (updatedCustomer) {
        return { success: true, customer: updatedCustomer };
      } else {
        return { success: false, error: 'Failed to update customer' };
      }
    } catch (error) {
      console.error('IPC Error updating customer:', error);
      return { success: false, error: error.message };
    }
  });

  // Handler to delete a customer
  ipcMain.handle('db:delete-customer', async (_, customerId) => {
    try {
      const result = deleteCustomer(customerId);
      return { success: result };
    } catch (error) {
      console.error(`IPC Error deleting customer ${customerId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // New handlers for deals and tasks related to a customer
  ipcMain.handle('db:get-deals-for-customer', async (_, customerId) => {
    try {
      return getDealsForCustomer(customerId);
    } catch (error) {
      console.error(`IPC Error getting deals for customer ${customerId}:`, error);
      return [];
    }
  });

  ipcMain.handle('db:get-tasks-for-customer', async (_, customerId) => {
    try {
      return getTasksForCustomer(customerId);
    } catch (error) {
      console.error(`IPC Error getting tasks for customer ${customerId}:`, error);
      return [];
    }
  });

  // --- Calendar Event Handlers (SQLite) ---
  ipcMain.handle('db:getCalendarEvents', async () => {
    try {
      return getAllCalendarEvents();
    } catch (error) {
      console.error('IPC Error getting calendar events:', error);
      throw error;
    }
  });

  ipcMain.handle('db:addCalendarEvent', async (_, eventData) => {
    try {
      console.log('Main process received addCalendarEvent with data:', JSON.stringify(eventData, null, 2));
      
      // Debug the data types
      console.log('Data types check:');
      Object.entries(eventData).forEach(([key, value]) => {
        console.log(`${key}: ${typeof value} - ${value}`);
      });
      
      const result = createCalendarEvent(eventData);
      console.log('Calendar event created with result:', result);
      return result;
    } catch (error) {
      console.error('IPC Error adding calendar event:', error);
      throw error;
    }
  });

  ipcMain.handle('db:updateCalendarEvent', async (_, eventData) => {
    try {
      console.log('Main process received updateCalendarEvent with data:', JSON.stringify(eventData, null, 2));
      return updateCalendarEvent(eventData.id, eventData);
    } catch (error) {
      console.error(`IPC Error updating calendar event ${eventData.id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:deleteCalendarEvent', async (_, eventId) => {
    try {
      return deleteCalendarEvent(eventId);
    } catch (error) {
      console.error(`IPC Error deleting calendar event ${eventId}:`, error);
      throw error;
    }
  });

  // --- Product Handlers (SQLite) ---
  ipcMain.handle('products:get-all', async () => {
    try {
      return getAllProducts(); // Already existed, ensure it's used
    } catch (error) {
      console.error('IPC Error getting all products:', error);
      throw error;
    }
  });

  ipcMain.handle('products:get-by-id', async (_, productId) => {
    try {
      return getProductById(productId);
    } catch (error) {
      console.error(`IPC Error getting product by id ${productId}:`, error);
      throw error;
    }
  });

  ipcMain.handle('products:create', async (_, productData) => {
    try {
      const result = createProduct(productData);
      return { success: true, lastInsertRowid: result.lastInsertRowid };
    } catch (error) {
      console.error('IPC Error creating product:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:update', async (_, { id, productData }) => {
    try {
      const result = updateProduct(id, productData);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error(`IPC Error updating product ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:delete', async (_, productId) => {
    try {
      const result = deleteProduct(productId);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error(`IPC Error deleting product ${productId}:`, error);
      // Special handling for delete constraint error
      if (error.message && error.message.includes('linked to one or more deals')) {
           return { success: false, error: 'Product is linked to existing deals and cannot be deleted.' };
      }
      return { success: false, error: error.message };
    }
  });

  // --- Deal Handlers (SQLite) ---
  ipcMain.handle('deals:get-all', async (_, { limit, offset, filter } = {}) => {
    try {
      return getAllDeals(limit, offset, filter);
    } catch (error) {
      console.error('IPC Error getting all deals:', error);
      return [];
    }
  });

  ipcMain.handle('deals:get-by-id', async (_, dealId) => {
    try {
      return getDealById(dealId);
    } catch (error) {
      console.error(`IPC Error getting deal by id ${dealId}:`, error);
      return null;
    }
  });

  ipcMain.handle('deals:create', async (_, dealData) => {
    try {
      const result = createDeal(dealData);
      return result;
    } catch (error) {
      console.error('IPC Error creating deal:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deals:update', async (_, { id, dealData }) => {
    try {
      const result = updateDeal(id, dealData);
      return result;
    } catch (error) {
      console.error(`IPC Error updating deal ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deals:update-stage', async (_, { dealId, newStage }) => {
    try {
      const result = updateDealStage(dealId, newStage);
      return result;
    } catch (error) {
      console.error(`IPC Error updating deal stage for ${dealId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // --- Deal-Product Link Handlers (SQLite) ---
  ipcMain.handle('deals:get-products', async (_, dealId) => {
    try {
      return getProductsForDeal(dealId);
    } catch (error) {
      console.error(`IPC Error getting products for deal ${dealId}:`, error);
      return [];
    }
  });

  ipcMain.handle('deals:add-product', async (_, { dealId, productId, quantity, price }) => { // Changed priceAtTime to price
    try {
      const result = addProductToDeal(dealId, productId, quantity, price); // Changed priceAtTime to price
      // Assuming addProductToDeal returns the full deal_product link or enough info
      // For now, returning lastInsertRowid is fine if the frontend refetches or can construct the object.
      // Ideally, fetch the newly added/updated DealProductLink and return it.
      // const newDealProduct = getDealProductById(result.lastInsertRowid); // Hypothetical function
      // return { success: true, dealProduct: newDealProduct };
      return { success: true, lastInsertRowid: result.lastInsertRowid }; // Keep as is for now
    } catch (error) {
      console.error(`IPC Error adding product ${productId} to deal ${dealId}:`, error);
      return { success: false, error: error.message };
    }
  });
  
  // Updated to use dealProductId and call removeProductFromDealById
  ipcMain.handle('deals:remove-product', async (_, { dealProductId }) => {
    try {
      const result = removeProductFromDealById(dealProductId);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error(`IPC Error removing deal_product_id ${dealProductId}:`, error);
      return { success: false, error: error.message };
    }
  });
  
  // Renamed from 'deals:update-product-quantity' to 'deals:update-product'
  // Updated to use dealProductId, quantity, price and call updateDealProduct
  ipcMain.handle('deals:update-product', async (_, { dealProductId, quantity, price }) => {
    try {
      const result = updateDealProduct(dealProductId, quantity, price);
      // Similar to add, ideally fetch and return the updated DealProductLink
      // const updatedDealProduct = getDealProductById(dealProductId); // Hypothetical
      // return { success: true, dealProduct: updatedDealProduct, changes: result.changes };
      return { success: true, changes: result.changes }; // Keep as is for now
    } catch (error) {
      console.error(`IPC Error updating deal_product_id ${dealProductId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // --- Task Handlers (SQLite) ---
  ipcMain.handle('tasks:get-all', async (_, { limit, offset, filter } = {}) => {
    try {
      return getAllTasks(limit, offset, filter);
    } catch (error) {
      console.error('IPC Error getting all tasks:', error);
      return [];
    }
  });

  ipcMain.handle('tasks:get-by-id', async (_, taskId) => {
    try {
      return getTaskById(taskId);
    } catch (error) {
      console.error(`IPC Error getting task by id ${taskId}:`, error);
      return null;
    }
  });

  ipcMain.handle('tasks:create', async (_, taskData) => {
    try {
      const result = createTask(taskData);
      return result;
    } catch (error) {
      console.error('IPC Error creating task:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tasks:update', async (_, { id, taskData }) => {
    try {
      const result = updateTask(id, taskData);
      return result;
    } catch (error) {
      console.error(`IPC Error updating task ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tasks:toggle-completion', async (_, { taskId, completed }) => {
    try {
      const result = updateTaskCompletion(taskId, completed);
      return result;
    } catch (error) {
      console.error(`IPC Error toggling completion for task ${taskId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tasks:delete', async (_, taskId) => {
    try {
      const result = deleteTask(taskId);
      return result;
    } catch (error) {
      console.error(`IPC Error deleting task ${taskId}:`, error);
      return { success: false, error: error.message };
    }
  });
 
  // --- JTL Entity Handlers (from SQLite) ---
  ipcMain.handle('jtl:get-firmen', async () => {
    try {
      return getAllJtlFirmen();
    } catch (error) {
      console.error('IPC Error getting JTL Firmen:', error);
      throw error;
    }
  });

  ipcMain.handle('jtl:get-warenlager', async () => {
    try {
      return getAllJtlWarenlager();
    } catch (error) {
      console.error('IPC Error getting JTL Warenlager:', error);
      throw error;
    }
  });

  ipcMain.handle('jtl:get-zahlungsarten', async () => {
    try {
      return getAllJtlZahlungsarten();
    } catch (error) {
      console.error('IPC Error getting JTL Zahlungsarten:', error);
      throw error;
    }
  });

  ipcMain.handle('jtl:get-versandarten', async () => {
    try {
      return getAllJtlVersandarten();
    } catch (error) {
      console.error('IPC Error getting JTL Versandarten:', error);
      throw error;
    }
  });

  // --- MSSQL Handlers (using Keytar service) ---
  ipcMain.handle('mssql:save-settings', async (_, settings) => {
    // settings from renderer should include: server, port (string), database, user, password, encrypt, trustServerCertificate, forcePort
    console.log('[IPC Main] mssql:save-settings invoked with raw settings argument:', JSON.stringify(settings));
    try {
      const processedSettings = {
        ...settings,
        port: parsePort(settings.port), // port becomes number | undefined
        // forcePort is expected to be a boolean from the client
      };
      console.log('[IPC Main] mssql:save-settings: Processed settings for saving:', JSON.stringify(processedSettings));
      await saveMssqlSettingsWithKeytar(processedSettings);
      return { success: true };
    } catch (error) {
      // This catch block is for errors specifically from saveMssqlSettingsWithKeytar or the await itself
      console.error('[IPC Main] mssql:save-settings: Error during or after calling saveMssqlSettingsWithKeytar:', error.message, error.stack);
      return { success: false, error: (error).message || 'Unknown error during saveMssqlSettingsWithKeytar call' };
    }
  });

  ipcMain.handle('mssql:get-settings', async () => {
    try {
      const settings = await getMssqlSettingsWithKeytar(); // This will include forcePort if saved
      console.log('[IPC Main] mssql:get-settings: Retrieved settings:', JSON.stringify(settings));
      return settings; 
    } catch (error) {
      console.error('IPC Error getting MSSQL settings:', error);
      return { success: false, error: (error).message || 'Failed to retrieve settings', data: null };
    }
  });

  ipcMain.handle('mssql:test-connection', async (_, settings) => {
    // settings from renderer should include: server, port (string), database, user, password, encrypt, trustServerCertificate, forcePort
    console.log('[IPC Main] mssql:test-connection invoked with raw settings:', JSON.stringify(settings));
    try {
      const processedSettings = {
        ...settings,
        port: parsePort(settings.port), // port becomes number | undefined
        // forcePort is expected to be a boolean from the client
      };
      console.log('[IPC Main] mssql:test-connection: Processed settings for test:', JSON.stringify(processedSettings));
      const success = await testConnectionWithKeytar(processedSettings);
      return { success: success };
    } catch (error) {
      console.error('[IPC Main] mssql:test-connection: Error testing connection:', error.message, error.stack);
      return { success: false, error: (error).message || 'Test connection failed in main process' };
    }
  });

  ipcMain.handle('mssql:clear-password', async () => {
    console.log('[IPC Main] mssql:clear-password invoked.');
    try {
      const result = await clearMssqlPasswordFromKeytar();
      console.log('[IPC Main] mssql:clear-password result:', result);
      return result; // Forward the result object { success: boolean, message: string }
    } catch (error) {
      console.error('[IPC Main] Error clearing MSSQL password from Keytar:', error.message, error.stack);
      return { success: false, message: error.message || 'Failed to clear password from Keytar in main process' };
    }
  });

  // --- Sync Handlers ---
  ipcMain.handle('sync:run', async () => {
    try {
      await runSync();
      return { success: true, message: 'Sync completed (or started if async)' };
    } catch (error) {
      console.error('IPC Error running sync:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:get-status', async () => {
    try {
      return await getLastSyncStatus();
    } catch (error) {
      console.error('IPC Error getting sync status:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:get-info', async (_, key) => {
    try {
      if (!key) {
        throw new Error('Sync info key is required.');
      }
      return await getSyncInfo(key);
    } catch (error) {
      console.error(`IPC Error getting sync info for key "${key}":`, error);
      throw error;
    }
  });

  ipcMain.handle('sync:set-info', async (_, { key, value }) => {
    try {
      if (!key) {
        throw new Error('Sync info key is required.');
      }
      await setSyncInfo(key, value);
      return { success: true };
    } catch (error) {
      console.error(`IPC Error setting sync info for key "${key}":`, error);
      throw error;
    }
  });

  // --- JTL Specific Handlers ---
  ipcMain.handle('jtl:create-order', async (_, orderInput) => {
    try {
      console.log('[Electron Main] Received jtl:create-order with input:', orderInput);
      const result = await createJtlOrder(orderInput);
      console.log('[Electron Main] jtl:create-order result:', result);
      return result;
    } catch (error) {
      console.error('[Electron Main] IPC Error creating JTL order:', error);
      // Ensure the error structure is consistent for the frontend
      return { success: false, error: error.message || 'Unknown error during JTL order creation' };
    }
  });

} // End of setupIpcHandlers


// --- Main Application Initialization ---
async function initializeApp() {
  console.log('[Electron Main] initializeApp started.');
  // The electron-serve/Vite loader setup is now done above.
  // This function now only initializes other critical services.

  // Initialize other critical services
  try {
    console.log('[Electron Main] Initializing database and other services...');
    initializeDatabase();
    initializeMssqlService();
    initializeSyncService();
    console.log('[Electron Main] Database and other services initialized.');
  } catch (error) {
    console.error("[Electron Main] Failed to initialize core services:", error);
    throw error; // Propagate to stop app launch if services are critical
  }
  console.log('[Electron Main] initializeApp finished.');
}

// --- Create Main Window ---
async function createMainWindow() {
  console.log(`[Electron Main] createMainWindow called.`);
  // Example structure:
  const windowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800,
  });

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'), // Path relative to dist-electron/main.js
    },
    title: 'SimpleCRM',
    backgroundColor: '#FFFFFF',
    frame: true, // Assuming you want the frame for custom controls
    titleBarStyle: 'hidden', // If using custom title bar
    autoHideMenuBar: true,
  });

  windowState.manage(mainWindow);

  if (!loadURLFunction) {
    console.error('[Electron Main] ERROR in createMainWindow: loadURLFunction is not defined. Cannot load frontend.');
    dialog.showErrorBox("Application Load Error", "Frontend loader not configured. This usually means a critical error occurred during initial setup.");
    if (app && typeof app.isQuitting === 'function' && !app.isQuitting()) {
      app.quit();
    } else if (app && typeof app.quit === 'function') {
      app.quit();
    }
    return;
  }

  try {
    console.log('[Electron Main] Attempting to load content into mainWindow...');
    await loadURLFunction(mainWindow);
    console.log('[Electron Main] Content loaded into mainWindow successfully.');
  } catch (error) {
    console.error('[Electron Main] Failed to load URL using loadURLFunction:', error);
    const errorMsg = `Failed to load application content. Error: ${error.message}\nURL: ${error.url || (isDevelopment ? 'http://localhost:5173' : 'app://- (electron-serve)') }`;
    dialog.showErrorBox("Application Load Error", errorMsg);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- App Lifecycle ---
initializeApp()
  .then(() => {
    app.whenReady().then(async () => { // Added async here
      console.log('[Electron Main] App is ready (after initializeApp).');

      if (!isDevelopment) {
        // Production or packaged mode: Setup loadURLFunction here
        try {
          console.log('[Electron Main] Production mode: Setting up manual file protocol \'app://\'.');
          const servePath = path.join(__dirname, '../dist'); // __dirname in dist-electron points to app.asar/dist-electron or file equivalent

          if (!fs.existsSync(servePath)) {
            console.error(`[Electron Main] Production load error: Frontend build directory ${servePath} does not exist.`);
            dialog.showErrorBox("Application Load Error", `Cannot find application files at ${servePath}. The application might be corrupted or not built correctly.`);
            loadURLFunction = async () => { throw new Error(`servePath ${servePath} not found, app cannot load.`); };
            if (app && typeof app.quit === 'function') app.quit();
          } else {
            // protocol.registerFileProtocol MUST be called after 'ready'
            protocol.registerFileProtocol('app', (request, callback) => {
              try {
                let urlPath = decodeURI(request.url.slice('app://'.length));
                
                // Strip query parameters and hash from urlPath
                const queryIndex = urlPath.indexOf('?');
                if (queryIndex !== -1) urlPath = urlPath.substring(0, queryIndex);
                const hashIndex = urlPath.indexOf('#');
                if (hashIndex !== -1) urlPath = urlPath.substring(0, hashIndex);

                let resourcePath;
                // If the path starts with 'index.html/', it's an asset request relative to index.html being treated as a directory.
                // The actual resource is what comes after 'index.html/'.
                if (urlPath.startsWith('index.html/')) {
                  resourcePath = urlPath.substring('index.html/'.length);
                } else if (urlPath === 'index.html' || urlPath === '' || urlPath === '/') {
                  // Request for the root, serve index.html
                  resourcePath = 'index.html';
                } else {
                  // Direct request for an asset or an SPA route
                  resourcePath = urlPath;
                }

                // Prevent directory traversal attacks by ensuring resourcePath is clean
                resourcePath = path.normalize(resourcePath).replace(/^(\.\.[\/\\])+/, '');

                const filePath = path.join(servePath, resourcePath);
                const resolvedFilePath = path.resolve(filePath); // Normalize for security check and fs access

                // Security check: Ensure resolved path is still within servePath
                if (!resolvedFilePath.startsWith(path.resolve(servePath))) {
                  console.error(`[Electron Main] Security: Denied access to ${resolvedFilePath} (outside ${path.resolve(servePath)}) for resource ${resourcePath}`);
                  return callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
                }

                if (fs.existsSync(resolvedFilePath) && fs.statSync(resolvedFilePath).isFile()) {
                  return callback({ path: resolvedFilePath });
                } else {
                  // SPA Fallback: If file not found and it looks like a route (no extension or not an asset type we know),
                  // serve index.html. Check resourcePath as it's the intended resource.
                  if (!path.extname(resourcePath)) { // Common check for SPA routes
                    const indexPath = path.join(servePath, 'index.html');
                    const resolvedIndexPath = path.resolve(indexPath);
                    if (fs.existsSync(resolvedIndexPath) && fs.statSync(resolvedIndexPath).isFile()) {
                      return callback({ path: resolvedIndexPath });
                    }
                  }
                  console.warn(`[Electron Main] File not found for 'app://' protocol. Requested URL: ${request.url}, Parsed resourcePath: ${resourcePath}, Resolved: ${resolvedFilePath}`);
                  return callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
                }
              } catch (err) {
                console.error(`[Electron Main] Error in 'app://' protocol handler for ${request.url}:`, err);
                return callback({ error: -2 }); // net::ERR_FAILED
              }
            });

            loadURLFunction = async (windowInstance) => {
              try {
                await windowInstance.loadURL('app://index.html');
                console.log('[Electron Main] Production URL (app://index.html) loaded successfully via manual protocol.');
              } catch (loadErr) {
                console.error('[Electron Main] Error loading URL via manual protocol in production:', loadErr);
                dialog.showErrorBox("Application Load Error", `Failed to load application content (app://index.html): ${loadErr.message}`);
                if (app && typeof app.quit === 'function') app.quit();
              }
            };
            console.log('[Electron Main] Production mode: loadURLFunction configured using manual file protocol.');
          }
        } catch (e) {
          console.error('[Electron Main] CRITICAL ERROR during manual protocol setup:', e);
          dialog.showErrorBox('Application Initialization Error', `Failed to set up production file serving (manual protocol): ${e.message}`);
          loadURLFunction = async () => { throw new Error('Manual protocol setup failed critically.'); };
          if (app && typeof app.quit === 'function') app.quit();
        }
      }

      // Ensure loadURLFunction is defined before proceeding
      if (!loadURLFunction) {
        console.error('[Electron Main] CRITICAL: loadURLFunction was not defined by the time it was needed after app.ready. Quitting.');
        dialog.showErrorBox("Application Critical Error", "Failed to configure application loader. The application will now exit.");
        if (app && typeof app.quit === 'function') app.quit();
        return; // Stop further execution in this block
      }
      
      setupIpcHandlers();
      await createMainWindow(); // Ensure createMainWindow is awaited if it's async
    }).catch(err => {
      console.error('[Electron Main] app.whenReady() chain failed:', err);
      dialog.showErrorBox("App Ready Error", `Failed during app.whenReady(): ${err.message}`);
      if (app && typeof app.quit === 'function') {
        app.quit();
      }
    });
  })
  .catch(err => {
    console.error('[Electron Main] initializeApp() failed:', err);
    // Attempt to show dialog, but it might not work if app is not ready
    if (app && typeof app.isReady === 'function' && app.isReady()) {
        dialog.showErrorBox("Critical Initialization Error", `Failed to initialize application: ${err.message}. The application will now exit.`);
    } else {
        // Fallback for errors before app is fully ready
        console.error("Application will exit due to critical initialization failure before app was ready.");
    }
    // Ensure app quits if initialization fails critically
    if (app && typeof app.isQuitting === 'function' && !app.isQuitting()) {
        app.quit();
    } else if (app && typeof app.quit === 'function') { // Fallback if isQuitting is not available
        app.quit();
    }
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    console.log('[Electron Main] All windows closed. Closing database and MSSQL pool.');
    closeDatabase();
    if (typeof closeMssqlPool === 'function') {
      closeMssqlPool().catch(err => console.error("[Electron Main] Error closing MSSQL pool:", err));
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log('[Electron Main] App activated and no windows open, creating main window.');
    createMainWindow();
  }
});