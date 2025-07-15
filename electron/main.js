// Main Electron process
const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron'); // Added 'protocol'
const path = require('path');
const windowStateKeeper = require('electron-window-state');
const fs = require('fs'); // For checking directory existence
const log = require('electron-log');

// Configure electron-log
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/main.log');
log.catchErrors(); // Catch unhandled errors
Object.assign(console, log.functions); // Override console functions

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
    log.warn(`\[Electron Main\] Invalid port type received: ${typeof portInput}. Value: '${portInput}'. Will be treated as undefined.`);
    return undefined;
  }

  if (Number.isInteger(portNumber) && portNumber > 0 && portNumber <= 65535) {
    return portNumber;
  }
  log.warn(`\[Electron Main\] Invalid port value received: '${portInput}'. Resulted in '${portNumber}'. Will be treated as undefined.`);
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
  calculateDealValue, // Added for dynamic deal value calculation
  updateDealValueBasedOnCalculationMethod, // Added for dynamic deal value calculation
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
  getAllJtlVersandarten, // Added
  // Custom fields functions
  getAllCustomFields,
  getActiveCustomFields,
  getCustomFieldById,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getCustomFieldValuesForCustomer,
  setCustomFieldValue,
  deleteCustomFieldValue,
  // Dashboard functions
  getDashboardStats,
  getRecentCustomers,
  getUpcomingTasks
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
log.info(`\[Electron Main\] Initial check: process.env.NODE_ENV = ${process.env.NODE_ENV}, isDevelopment = ${isDevelopment}`);

// --- Setup loadURLFunction based on mode ---
// This setup, especially for electron-serve, needs to happen before 'app.ready'.
if (isDevelopment) {
  log.info('[Electron Main] Development mode: Setting up Vite dev server loader.');
  loadURLFunction = async (windowInstance) => {
    const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    log.info(`\[Electron Main\] Development mode: Attempting to load URL: ${viteDevServerUrl}`);
    try {
      await windowInstance.loadURL(viteDevServerUrl);
      log.info('[Electron Main] Development URL loaded successfully.');
    } catch (error) {
      log.error(`\[Electron Main\] Failed to load Vite dev server URL ${viteDevServerUrl}:`, error);
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
              log.error('Failed to save file:', err);
              event.reply('save-data-reply', { success: false, error: err.message });
            } else {
              log.info('File saved successfully:', result.filePath);
              event.reply('save-data-reply', { success: true });
            }
          });
        } else {
          event.reply('save-data-reply', { success: false, error: 'Save cancelled' });
        }
      })
      .catch((err) => {
        log.error('Error showing save dialog:', err);
        event.reply('save-data-reply', { success: false, error: err.message });
      });
  });

  // --- Database Handlers (SQLite) ---
  ipcMain.handle('db:get-customers', async () => {
    try {
      return getAllCustomers();
    } catch (error) {
      log.error('IPC Error getting customers:', error);
      throw error; // Propagate error to renderer
    }
  });

  ipcMain.handle('db:get-customer', async (_, customerId) => {
    try {
      return getCustomerById(customerId);
    } catch (error) {
      log.error(`IPC Error getting customer ${customerId}:`, error);
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
      log.error('IPC Error creating customer:', error);
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
      log.error('IPC Error updating customer:', error);
      return { success: false, error: error.message };
    }
  });

  // Handler to delete a customer
  ipcMain.handle('db:delete-customer', async (_, customerId) => {
    try {
      const result = deleteCustomer(customerId);
      return { success: result };
    } catch (error) {
      log.error(`IPC Error deleting customer ${customerId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // New handlers for deals and tasks related to a customer
  ipcMain.handle('db:get-deals-for-customer', async (_, customerId) => {
    try {
      return getDealsForCustomer(customerId);
    } catch (error) {
      log.error(`IPC Error getting deals for customer ${customerId}:`, error);
      return [];
    }
  });

  ipcMain.handle('db:get-tasks-for-customer', async (_, customerId) => {
    try {
      return getTasksForCustomer(customerId);
    } catch (error) {
      log.error(`IPC Error getting tasks for customer ${customerId}:`, error);
      return [];
    }
  });

  // --- Calendar Event Handlers (SQLite) ---
  ipcMain.handle('db:getCalendarEvents', async () => {
    try {
      return getAllCalendarEvents();
    } catch (error) {
      log.error('IPC Error getting calendar events:', error);
      throw error;
    }
  });

  ipcMain.handle('db:addCalendarEvent', async (_, eventData) => {
    try {
      log.info('Main process received addCalendarEvent with data:', JSON.stringify(eventData, null, 2));

      // Debug the data types
      log.info('Data types check:');
      Object.entries(eventData).forEach(([key, value]) => {
        log.info(`${key}: ${typeof value} - ${value}`);
      });

      const result = createCalendarEvent(eventData);
      log.info('Calendar event created with result:', result);
      return result;
    } catch (error) {
      log.error('IPC Error adding calendar event:', error);
      throw error;
    }
  });

  ipcMain.handle('db:updateCalendarEvent', async (_, eventData) => {
    try {
      log.info('Main process received updateCalendarEvent with data:', JSON.stringify(eventData, null, 2));
      return updateCalendarEvent(eventData.id, eventData);
    } catch (error) {
      log.error(`IPC Error updating calendar event ${eventData.id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:deleteCalendarEvent', async (_, eventId) => {
    try {
      return deleteCalendarEvent(eventId);
    } catch (error) {
      log.error(`IPC Error deleting calendar event ${eventId}:`, error);
      throw error;
    }
  });

  // --- Product Handlers (SQLite) ---
  ipcMain.handle('products:get-all', async () => {
    try {
      return getAllProducts(); // Already existed, ensure it's used
    } catch (error) {
      log.error('IPC Error getting all products:', error);
      throw error;
    }
  });

  ipcMain.handle('products:get-by-id', async (_, productId) => {
    try {
      return getProductById(productId);
    } catch (error) {
      log.error(`IPC Error getting product by id ${productId}:`, error);
      throw error;
    }
  });

  ipcMain.handle('products:create', async (_, productData) => {
    try {
      const result = createProduct(productData);
      return { success: true, lastInsertRowid: result.lastInsertRowid };
    } catch (error) {
      log.error('IPC Error creating product:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:update', async (_, { id, productData }) => {
    try {
      const result = updateProduct(id, productData);
      return { success: true, changes: result.changes };
    } catch (error) {
      log.error(`IPC Error updating product ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:delete', async (_, productId) => {
    try {
      const result = deleteProduct(productId);
      return { success: true, changes: result.changes };
    } catch (error) {
      log.error(`IPC Error deleting product ${productId}:`, error);
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
      log.error('IPC Error getting all deals:', error);
      return [];
    }
  });

  ipcMain.handle('deals:get-by-id', async (_, dealId) => {
    try {
      return getDealById(dealId);
    } catch (error) {
      log.error(`IPC Error getting deal by id ${dealId}:`, error);
      return null;
    }
  });

  ipcMain.handle('deals:create', async (_, dealData) => {
    try {
      const result = createDeal(dealData);
      return result;
    } catch (error) {
      log.error('IPC Error creating deal:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deals:update', async (_, { id, dealData }) => {
    try {
      const result = updateDeal(id, dealData);
      return result;
    } catch (error) {
      log.error(`IPC Error updating deal ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deals:update-stage', async (_, { dealId, newStage }) => {
    try {
      const result = updateDealStage(dealId, newStage);
      return result;
    } catch (error) {
      log.error(`IPC Error updating deal stage for ${dealId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // --- Deal-Product Link Handlers (SQLite) ---
  ipcMain.handle('deals:get-products', async (_, dealId) => {
    try {
      return getProductsForDeal(dealId);
    } catch (error) {
      log.error(`IPC Error getting products for deal ${dealId}:`, error);
      return [];
    }
  });

  ipcMain.handle('deals:add-product', async (_, { dealId, productId, quantity, price }) => { // Changed priceAtTime to price
    try {
      const result = addProductToDeal(dealId, productId, quantity, price); // Changed priceAtTime to price

      // Update the deal value if it's using dynamic calculation
      updateDealValueBasedOnCalculationMethod(dealId);

      // Assuming addProductToDeal returns the full deal_product link or enough info
      // For now, returning lastInsertRowid is fine if the frontend refetches or can construct the object.
      // Ideally, fetch the newly added/updated DealProductLink and return it.
      // const newDealProduct = getDealProductById(result.lastInsertRowid); // Hypothetical function
      // return { success: true, dealProduct: newDealProduct };
      return { success: true, lastInsertRowid: result.lastInsertRowid }; // Keep as is for now
    } catch (error) {
      log.error(`IPC Error adding product ${productId} to deal ${dealId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Updated to use dealProductId and call removeProductFromDealById
  ipcMain.handle('deals:remove-product', async (_, { dealProductId }) => {
    try {
      // Get the deal_id before removing the product
      const getDealIdStmt = getDb().prepare(`
        SELECT deal_id FROM ${DEAL_PRODUCTS_TABLE} WHERE id = ?
      `);
      const dealIdResult = getDealIdStmt.get(dealProductId);
      const dealId = dealIdResult?.deal_id;

      const result = removeProductFromDealById(dealProductId);

      // Update the deal value if it's using dynamic calculation
      if (dealId) {
        updateDealValueBasedOnCalculationMethod(dealId);
      }

      return { success: true, changes: result.changes };
    } catch (error) {
      log.error(`IPC Error removing deal_product_id ${dealProductId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Renamed from 'deals:update-product-quantity' to 'deals:update-product'
  // Updated to use dealProductId, quantity, price and call updateDealProduct
  ipcMain.handle('deals:update-product', async (_, { dealProductId, quantity, price }) => {
    try {
      const result = updateDealProduct(dealProductId, quantity, price);

      // Get the deal_id for this product link to update the deal value if needed
      const getDealIdStmt = getDb().prepare(`
        SELECT deal_id FROM ${DEAL_PRODUCTS_TABLE} WHERE id = ?
      `);
      const dealIdResult = getDealIdStmt.get(dealProductId);

      if (dealIdResult && dealIdResult.deal_id) {
        // Update the deal value if it's using dynamic calculation
        updateDealValueBasedOnCalculationMethod(dealIdResult.deal_id);
      }

      // Similar to add, ideally fetch and return the updated DealProductLink
      // const updatedDealProduct = getDealProductById(dealProductId); // Hypothetical
      // return { success: true, dealProduct: updatedDealProduct, changes: result.changes };
      return { success: true, changes: result.changes }; // Keep as is for now
    } catch (error) {
      log.error(`IPC Error updating deal_product_id ${dealProductId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // --- Task Handlers (SQLite) ---
  ipcMain.handle('tasks:get-all', async (_, { limit, offset, filter } = {}) => {
    try {
      return getAllTasks(limit, offset, filter);
    } catch (error) {
      log.error('IPC Error getting all tasks:', error);
      return [];
    }
  });

  ipcMain.handle('tasks:get-by-id', async (_, taskId) => {
    try {
      return getTaskById(taskId);
    } catch (error) {
      log.error(`IPC Error getting task by id ${taskId}:`, error);
      return null;
    }
  });

  ipcMain.handle('tasks:create', async (_, taskData) => {
    try {
      const result = createTask(taskData);
      return result;
    } catch (error) {
      log.error('IPC Error creating task:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tasks:update', async (_, { id, taskData }) => {
    try {
      const result = updateTask(id, taskData);
      return result;
    } catch (error) {
      log.error(`IPC Error updating task ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tasks:toggle-completion', async (_, { taskId, completed }) => {
    try {
      const result = updateTaskCompletion(taskId, completed);
      return result;
    } catch (error) {
      log.error(`IPC Error toggling completion for task ${taskId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tasks:delete', async (_, taskId) => {
    try {
      const result = deleteTask(taskId);
      return result;
    } catch (error) {
      log.error(`IPC Error deleting task ${taskId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // --- Custom Fields Handlers ---
  ipcMain.handle('custom-fields:get-all', async () => {
    try {
      return getAllCustomFields();
    } catch (error) {
      log.error('IPC Error getting all custom fields:', error);
      throw error;
    }
  });

  ipcMain.handle('custom-fields:get-active', async () => {
    try {
      return getActiveCustomFields();
    } catch (error) {
      log.error('IPC Error getting active custom fields:', error);
      throw error;
    }
  });

  ipcMain.handle('custom-fields:get-by-id', async (_, fieldId) => {
    try {
      return getCustomFieldById(fieldId);
    } catch (error) {
      log.error(`IPC Error getting custom field by id ${fieldId}:`, error);
      throw error;
    }
  });

  ipcMain.handle('custom-fields:create', async (_, fieldData) => {
    try {
      const result = createCustomField(fieldData);
      return { success: true, field: result };
    } catch (error) {
      log.error('IPC Error creating custom field:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('custom-fields:update', async (_, { id, fieldData }) => {
    try {
      const result = updateCustomField(id, fieldData);
      return { success: true, field: result };
    } catch (error) {
      log.error(`IPC Error updating custom field ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('custom-fields:delete', async (_, fieldId) => {
    try {
      const result = deleteCustomField(fieldId);
      return { success: result };
    } catch (error) {
      log.error(`IPC Error deleting custom field ${fieldId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('custom-fields:get-values-for-customer', async (_, customerId) => {
    try {
      return getCustomFieldValuesForCustomer(customerId);
    } catch (error) {
      log.error(`IPC Error getting custom field values for customer ${customerId}:`, error);
      throw error;
    }
  });

  ipcMain.handle('custom-fields:set-value', async (_, { customerId, fieldId, value }) => {
    try {
      const result = setCustomFieldValue(customerId, fieldId, value);
      return { success: result };
    } catch (error) {
      log.error(`IPC Error setting custom field value for customer ${customerId}, field ${fieldId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('custom-fields:delete-value', async (_, { customerId, fieldId }) => {
    try {
      const result = deleteCustomFieldValue(customerId, fieldId);
      return { success: result };
    } catch (error) {
      log.error(`IPC Error deleting custom field value for customer ${customerId}, field ${fieldId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // --- JTL Entity Handlers (from SQLite) ---
  ipcMain.handle('jtl:get-firmen', async () => {
    try {
      return getAllJtlFirmen();
    } catch (error) {
      log.error('IPC Error getting JTL Firmen:', error);
      throw error;
    }
  });

  ipcMain.handle('jtl:get-warenlager', async () => {
    try {
      return getAllJtlWarenlager();
    } catch (error) {
      log.error('IPC Error getting JTL Warenlager:', error);
      throw error;
    }
  });

  ipcMain.handle('jtl:get-zahlungsarten', async () => {
    try {
      return getAllJtlZahlungsarten();
    } catch (error) {
      log.error('IPC Error getting JTL Zahlungsarten:', error);
      throw error;
    }
  });

  ipcMain.handle('jtl:get-versandarten', async () => {
    try {
      return getAllJtlVersandarten();
    } catch (error) {
      log.error('IPC Error getting JTL Versandarten:', error);
      throw error;
    }
  });

  // --- MSSQL Handlers (using Keytar service) ---
  ipcMain.handle('mssql:save-settings', async (_, settings) => {
    // settings from renderer should include: server, port (string), database, user, password, encrypt, trustServerCertificate, forcePort
    log.info('[IPC Main] mssql:save-settings invoked with raw settings argument:', JSON.stringify(settings));
    try {
      const processedSettings = {
        ...settings,
        port: parsePort(settings.port), // port becomes number | undefined
        // forcePort is expected to be a boolean from the client
      };
      log.info('[IPC Main] mssql:save-settings: Processed settings for saving:', JSON.stringify(processedSettings));
      await saveMssqlSettingsWithKeytar(processedSettings);
      return { success: true };
    } catch (error) {
      // This catch block is for errors specifically from saveMssqlSettingsWithKeytar or the await itself
      log.error('[IPC Main] mssql:save-settings: Error during or after calling saveMssqlSettingsWithKeytar:', error.message, error.stack);
      return { success: false, error: (error).message || 'Unknown error during saveMssqlSettingsWithKeytar call' };
    }
  });

  ipcMain.handle('mssql:get-settings', async () => {
    try {
      const settings = await getMssqlSettingsWithKeytar(); // This will include forcePort if saved
      log.info('[IPC Main] mssql:get-settings: Retrieved settings:', JSON.stringify(settings));
      return settings;
    } catch (error) {
      log.error('IPC Error getting MSSQL settings:', error);
      return { success: false, error: (error).message || 'Failed to retrieve settings', data: null };
    }
  });

  ipcMain.handle('mssql:test-connection', async (_, settings) => {
    // settings from renderer should include: server, port (string), database, user, password, encrypt, trustServerCertificate, forcePort
    log.info('[IPC Main] mssql:test-connection invoked with raw settings:', JSON.stringify(settings));
    try {
      const processedSettings = {
        ...settings,
        port: parsePort(settings.port), // port becomes number | undefined
        // forcePort is expected to be a boolean from the client
      };
      log.info('[IPC Main] mssql:test-connection: Processed settings for test:', JSON.stringify(processedSettings));
      const success = await testConnectionWithKeytar(processedSettings);
      return { success: success };
    } catch (error) {
      log.error('[IPC Main] mssql:test-connection: Error testing connection:', error.message, error.stack);
      return { success: false, error: (error).message || 'Test connection failed in main process' };
    }
  });

  ipcMain.handle('mssql:clear-password', async () => {
    log.info('[IPC Main] mssql:clear-password invoked.');
    try {
      const result = await clearMssqlPasswordFromKeytar();
      log.info('[IPC Main] mssql:clear-password result:', result);
      return result; // Forward the result object { success: boolean, message: string }
    } catch (error) {
      log.error('[IPC Main] Error clearing MSSQL password from Keytar:', error.message, error.stack);
      return { success: false, message: error.message || 'Failed to clear password from Keytar in main process' };
    }
  });

  // --- Sync Handlers ---
  ipcMain.handle('sync:run', async () => {
    try {
      await runSync(mainWindow);
      return { success: true, message: 'Sync completed successfully' };
    } catch (error) {
      log.error('IPC Error running sync:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:get-status', async () => {
    try {
      return await getLastSyncStatus();
    } catch (error) {
      log.error('IPC Error getting sync status:', error);
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
      log.error(`IPC Error getting sync info for key "${key}":`, error);
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
      log.error(`IPC Error setting sync info for key "${key}":`, error);
      throw error;
    }
  });

  // --- JTL Specific Handlers ---
  ipcMain.handle('jtl:create-order', async (_, orderInput) => {
    try {
      log.info('[Electron Main] Received jtl:create-order with input:', orderInput);
      const result = await createJtlOrder(orderInput);
      log.info('[Electron Main] jtl:create-order result:', result);
      return result;
    } catch (error) {
      log.error('[Electron Main] IPC Error creating JTL order:', error);
      // Ensure the error structure is consistent for the frontend
      return { success: false, error: error.message || 'Unknown error during JTL order creation' };
    }
  });

  // --- Dashboard Handlers ---
  ipcMain.handle('dashboard:get-stats', async () => {
    try {
      log.info('[Electron Main] Fetching dashboard statistics');
      const stats = getDashboardStats();
      return stats;
    } catch (error) {
      log.error('[Electron Main] IPC Error getting dashboard stats:', error);
      throw error;
    }
  });

  ipcMain.handle('dashboard:get-recent-customers', async (_, limit = 5) => {
    try {
      log.info(`[Electron Main] Fetching recent customers with limit: ${limit}`);
      const customers = getRecentCustomers(limit);
      return customers;
    } catch (error) {
      log.error('[Electron Main] IPC Error getting recent customers:', error);
      throw error;
    }
  });

  ipcMain.handle('dashboard:get-upcoming-tasks', async (_, limit = 5) => {
    try {
      log.info(`[Electron Main] Fetching upcoming tasks with limit: ${limit}`);
      const tasks = getUpcomingTasks(limit);
      return tasks;
    } catch (error) {
      log.error('[Electron Main] IPC Error getting upcoming tasks:', error);
      throw error;
    }
  });

} // End of setupIpcHandlers


// --- Main Application Initialization ---
async function initializeApp() {
  log.info('[Electron Main] initializeApp started.');
  // The electron-serve/Vite loader setup is now done above.
  // This function now only initializes other critical services.

  // Initialize other critical services
  try {
    log.info('[Electron Main] Initializing database and other services...');
    initializeDatabase();
    initializeMssqlService();
    initializeSyncService();
    log.info('[Electron Main] Database and other services initialized.');
  } catch (error) {
    log.error("[Electron Main] Failed to initialize core services:", error);
    throw error; // Propagate to stop app launch if services are critical
  }
  log.info('[Electron Main] initializeApp finished.');
}

// --- Create Main Window ---
async function createMainWindow() {
  log.info(`[Electron Main] createMainWindow called.`);
  // Example structure:
  const windowState = windowStateKeeper({
    defaultWidth: 1400,
    defaultHeight: 1000,
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
    log.error('[Electron Main] ERROR in createMainWindow: loadURLFunction is not defined. Cannot load frontend.');
    dialog.showErrorBox("Application Load Error", "Frontend loader not configured. This usually means a critical error occurred during initial setup.");
    if (app && typeof app.isQuitting === 'function' && !app.isQuitting()) { app.quit(); } // Ensure app quits if critical error
    return;
  }

  try {
    log.info('[Electron Main] Attempting to load content into mainWindow...');
    await loadURLFunction(mainWindow);
    log.info('[Electron Main] Content loaded into mainWindow successfully.');
  } catch (error) {
    log.error('[Electron Main] Failed to load URL using loadURLFunction:', error);
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
      log.info('[Electron Main] App is ready (after initializeApp).');

      if (!isDevelopment) {
        log.info('[Electron Main] Production mode: Setting up file loading.');
        try {
          // Try to import electron-serve and handle different export patterns
          const electronServeModule = require('electron-serve');

          // Check if it's a function (direct export) or has a default export
          const electronServeFunc = typeof electronServeModule === 'function'
            ? electronServeModule
            : (electronServeModule.default || null);

          if (typeof electronServeFunc === 'function') {
            // Use electron-serve if available
            const loadURL = electronServeFunc({ directory: path.join(__dirname, '../dist') });

            // Register protocol for file serving
            protocol.registerFileProtocol('app', (request, callback) => {
              const filePath = path.normalize(`${__dirname}/../dist/${request.url.substr('app://-'.length)}`);
              callback(filePath);
            });

            loadURLFunction = async (windowInstance) => {
              log.info('[Electron Main] Production mode: Loading with electron-serve');
              try {
                await loadURL(windowInstance);
                log.info('[Electron Main] Content loaded successfully with electron-serve');
              } catch (error) {
                log.error('[Electron Main] Failed to load with electron-serve:', error);
                throw error; // Let the outer catch handle it
              }
            };
          } else {
            throw new Error('electron-serve did not provide a usable function');
          }
        } catch (error) {
          // Fallback to basic file loading if electron-serve fails
          log.error('[Electron Main] electron-serve failed, falling back to loadFile:', error);

          loadURLFunction = async (windowInstance) => {
            const indexPath = path.join(__dirname, '../dist/index.html');
            log.info(`[Electron Main] Production mode: Loading file directly: ${indexPath}`);

            try {
              await windowInstance.loadFile(indexPath);
              log.info('[Electron Main] Content loaded successfully with loadFile');
            } catch (prodError) {
              log.error('[Electron Main] Failed to load file directly:', prodError);
              dialog.showErrorBox("Load Error", `Could not load application files. Error: ${prodError.message}`);
            }
          };
        }
      } // End of !isDevelopment block for loadURLFunction setup

      setupIpcHandlers(); // Setup IPC handlers
      await createMainWindow(); // Create the main window

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createMainWindow();
        }
      });
    }).catch(err => {
      log.error('[Electron Main] Error during app.whenReady:', err);
      // Optionally, show a dialog to the user or quit the app
      dialog.showErrorBox("Application Startup Error", `A critical error occurred during application startup: ${err.message}. The application will now close.`);
      app.quit();
    });
  })
  .catch(err => {
    log.error('[Electron Main] Error during initializeApp:', err);
    // This is a critical failure, show error and quit
    // Note: app might not be ready here, so dialog might not work as expected
    // but it's worth a try.
    if (app && typeof dialog.showErrorBox === 'function') {
      dialog.showErrorBox("Application Initialization Error", `A critical error occurred during application initialization: ${err.message}. The application will now close.`);
    }
    // Ensure the app quits if initialization fails critically
    if (app && typeof app.quit === 'function') {
      app.quit();
    } else {
      process.exit(1); // Force exit if app object is not available
    }
  });

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Before quitting, ensure services are closed if they need explicit closing
    closeDatabase(); // Assuming this is synchronous or handles its own errors
    if (typeof closeMssqlPool === 'function') {
      closeMssqlPool().catch(err => log.error('Error closing MSSQL pool:', err));
    }
    log.info('[Electron Main] All windows closed, quitting application.');
    app.quit();
  }
});

// Handle app quit explicitly to ensure resources are released
app.on('will-quit', () => {
  // This is a good place for final cleanup if needed,
  // though window-all-closed might cover most cases for non-macOS.
  log.info('[Electron Main] Application will quit.');
  // Ensure database is closed on quit as well, especially for macOS or if app quits unexpectedly
  closeDatabase();
  if (typeof closeMssqlPool === 'function') {
    closeMssqlPool().catch(err => log.error('Error closing MSSQL pool on will-quit:', err));
  }
});