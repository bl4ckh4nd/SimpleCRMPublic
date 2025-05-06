// Main Electron process
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const windowStateKeeper = require('electron-window-state');
const fs = require('fs'); // For checking directory existence

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
  removeProductFromDeal,
  updateProductQuantityInDeal,
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
  deleteTask
} = require('../dist-electron/sqlite-service');
const { initializeSyncService, runSync, getLastSyncStatus } = require('../dist-electron/sync-service');
const { initializeMssqlService, saveMssqlSettingsWithKeytar, getMssqlSettingsWithKeytar, testConnectionWithKeytar, closeMssqlPool } = require('../dist-electron/mssql-keytar-service');

// Keep a global reference of the mainWindow object
let mainWindow;

// This will hold the function to load the content into the BrowserWindow
let loadURLFunction;

// Determine mode AT THE TOP
const isDevelopment = process.env.NODE_ENV === 'development';
console.log(`[Electron Main] Initial check: process.env.NODE_ENV = ${process.env.NODE_ENV}, isDevelopment = ${isDevelopment}`);

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

  ipcMain.handle('deals:add-product', async (_, { dealId, productId, quantity, priceAtTime }) => {
    try {
      const result = addProductToDeal(dealId, productId, quantity, priceAtTime);
      return { success: true, lastInsertRowid: result.lastInsertRowid };
    } catch (error) {
      console.error(`IPC Error adding product ${productId} to deal ${dealId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deals:remove-product', async (_, { dealId, productId }) => {
    try {
      const result = removeProductFromDeal(dealId, productId);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error(`IPC Error removing product ${productId} from deal ${dealId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deals:update-product-quantity', async (_, { dealId, productId, newQuantity }) => {
    try {
      const result = updateProductQuantityInDeal(dealId, productId, newQuantity);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error(`IPC Error updating quantity for product ${productId} in deal ${dealId}:`, error);
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

  // --- MSSQL Handlers (using Keytar service) ---
  ipcMain.handle('mssql:save-settings', async (_, settings) => {
    try {
      await saveMssqlSettingsWithKeytar(settings);
      return { success: true };
    } catch (error) {
      console.error('IPC Error saving MSSQL settings:', error);
      throw error;
    }
  });

  ipcMain.handle('mssql:get-settings', async () => {
    try {
      return await getMssqlSettingsWithKeytar();
    } catch (error) {
      console.error('IPC Error getting MSSQL settings:', error);
      throw error;
    }
  });

  ipcMain.handle('mssql:test-connection', async (_, settings) => {
    try {
      return await testConnectionWithKeytar(settings);
    } catch (error) {
      console.error('IPC Error testing MSSQL connection:', error);
      throw error;
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

  // --- Product Handlers ---
  // Note: This section was identified as duplicated and the second instance will be removed.
  // The first instance of Product Handlers (around line 188) is kept.

  // --- Deal Handlers ---
  // Note: This section was identified as duplicated and the second instance will be removed.
  // The first instance of Deal Handlers (around line 234) is kept.

  // --- Deal-Product Link Handlers ---
  // Note: This section was identified as duplicated and the second instance will be removed.
  // The first instance of Deal-Product Link Handlers (around line 276) is kept.

  // --- Task Handlers ---
  // Note: This section was identified as duplicated and the second instance will be removed.
  // The first instance of Task Handlers (around line 318) is kept.

  // --- Calendar Event Handlers ---
  // Note: This section was identified as duplicated and the second instance will be removed.
  // The first instance of Calendar Event Handlers (around line 153) is kept.

  // The duplicated handlers from approximately line 435 to line 589 have been removed.

} // End of setupIpcHandlers


// --- Main Application Initialization ---
async function initializeApp() {
  console.log('[Electron Main] initializeApp started.');
  if (isDevelopment) {
    console.log('[Electron Main] Development mode: Setting up Vite dev server loader.');
    loadURLFunction = async (windowInstance) => {
      const devUrl = 'http://localhost:5173';
      console.log(`[Electron Main] Attempting to load Vite dev server at: ${devUrl}`);
      await windowInstance.loadURL(devUrl);
      console.log('[Electron Main] Vite dev server loaded successfully.');
      windowInstance.webContents.openDevTools();
    };
  } else {
    // Production or packaged mode
    console.log('[Electron Main] Production mode: Initializing electron-serve.');
    const servePath = path.join(__dirname, '../dist'); // Relative to dist-electron/main.js
    console.log(`[Electron Main] electron-serve target directory: ${servePath}`);
    try {
      if (fs.existsSync(servePath)) {
        const { default: serve } = await import('electron-serve'); // Dynamically import
        loadURLFunction = serve({ directory: servePath }); // Initialize electron-serve
        console.log('[Electron Main] electron-serve initialized successfully.');
      } else {
        console.error(`[Electron Main] CRITICAL ERROR: electron-serve directory ${servePath} does not exist. Frontend will not load.`);
        loadURLFunction = null; // Mark as failed
        throw new Error(`electron-serve directory not found: ${servePath}`);
      }
    } catch (e) {
      console.error('[Electron Main] CRITICAL ERROR: Failed to dynamically import or initialize electron-serve:', e);
      loadURLFunction = null; // Mark as failed
      throw e; // Re-throw to be caught by initializeApp().catch()
    }
  }

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
    dialog.showErrorBox("Application Load Error", "Frontend loader not configured. This usually means electron-serve failed to initialize in production.");
    app.quit();
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
    app.whenReady().then(() => {
      console.log('[Electron Main] App is ready (after initializeApp).');
      setupIpcHandlers(); // Call setupIpcHandlers here
      createMainWindow();
    }).catch(err => {
      console.error('[Electron Main] app.whenReady() chain failed:', err);
      dialog.showErrorBox("App Ready Error", `Failed during app.whenReady(): ${err.message}`);
      app.quit();
    });
  })
  .catch(err => {
    console.error('[Electron Main] initializeApp() failed:', err);
    // Attempt to show dialog, but it might not work if app is not ready
    if (app.isReady()) {
        dialog.showErrorBox("Critical Initialization Error", `Failed to initialize application: ${err.message}. The application will now exit.`);
    } else {
        // Fallback for errors before app is fully ready
        console.error("Application will exit due to critical initialization failure before app was ready.");
    }
    // Ensure app quits if initialization fails critically
    if (!app.isQuitting()) {
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