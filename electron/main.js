// Main Electron process
const { app, BrowserWindow, dialog, protocol } = require('electron'); // Added 'protocol'
const path = require('path');
const windowStateKeeper = require('electron-window-state');
const log = require('electron-log');
const { registerAllIpcHandlers } = require('../dist-electron/electron/ipc/router');

// Configure electron-log
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/main.log');
log.catchErrors(); // Catch unhandled errors
Object.assign(console, log.functions); // Override console functions

const isDevelopment = process.env.NODE_ENV === 'development';
// Reduce log noise and protect secrets by defaulting to warn in production
log.transports.file.level = isDevelopment ? 'debug' : 'warn';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5 MB rotation cap
log.transports.file.maxLogFiles = 3;

// Secret masking and port parsing moved into dedicated IPC modules.

const { initializeDatabase, closeDatabase } = require('../dist-electron/electron/sqlite-service');
const { initializeSyncService } = require('../dist-electron/electron/sync-service');
const {
  initializeMssqlService,
  closeMssqlPool,
} = require('../dist-electron/electron/mssql-keytar-service');

// Keep a global reference of the mainWindow object
let mainWindow;

// This will hold the function to load the content into the BrowserWindow
let loadURLFunction;

let cleanupIpcHandlers = () => {};

// Determine mode AT THE TOP
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

// IPC handlers are registered via electron/ipc/router.ts once the app is ready.


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

  const preloadPath = path.join(__dirname, 'electron/preload.js');
  const fs = require('fs');
  if (!fs.existsSync(preloadPath)) {
    log.error(`[Electron Main] CRITICAL: Preload script not found at: ${preloadPath}`);
  } else {
    log.info(`[Electron Main] Preload script found at: ${preloadPath}`);
  }

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
      sandbox: true,
      preload: preloadPath,
    },
    title: 'SimpleCRM',
    backgroundColor: '#FFFFFF',
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    autoHideMenuBar: true,
  });

  windowState.manage(mainWindow);

  // Add preload error logging to diagnose preload script issues
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    log.info(`[Preload/Console] Level ${level}: ${message} (${sourceId}:${line})`);
  });

  // Catch preload errors specifically
  mainWindow.webContents.on('crashed', () => {
    log.error('[Preload/Renderer] Renderer process crashed');
  });

  mainWindow.webContents.on('unresponsive', () => {
    log.warn('[Preload/Renderer] Renderer process is unresponsive');
  });

  const emitWindowState = () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.webContents.isDestroyed()) {
      log.warn('[Electron Main] Skipping window state emit: webContents destroyed.');
      return;
    }
    const payload = {
      isMaximized: mainWindow.isMaximized(),
      isFullScreen: mainWindow.isFullScreen(),
    };
    log.debug(`[Electron Main] Emitting window state: ${JSON.stringify(payload)}`);
    mainWindow.webContents.send('window-state-changed', payload);
  };

  mainWindow.on('maximize', emitWindowState);
  mainWindow.on('unmaximize', emitWindowState);
  mainWindow.on('enter-full-screen', emitWindowState);
  mainWindow.on('leave-full-screen', emitWindowState);
  mainWindow.on('resized', () => {
    if (!mainWindow) {
      return;
    }
    // When leaving snapped states on Windows, resize fires before unmaximize.
    if (!mainWindow.isMaximized() && !mainWindow.isFullScreen()) {
      emitWindowState();
    }
  });

  mainWindow.webContents.once('did-finish-load', () => {
    log.debug('[Electron Main] Renderer finished loading, sending initial window state.');
    emitWindowState();
  });

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

      cleanupIpcHandlers = registerAllIpcHandlers({
        logger: log,
        isDevelopment,
        getMainWindow: () => mainWindow,
      });
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
  if (typeof cleanupIpcHandlers === 'function') {
    try {
      cleanupIpcHandlers();
    } catch (error) {
      log.error('Error during IPC cleanup:', error);
    }
  }
  // Ensure database is closed on quit as well, especially for macOS or if app quits unexpectedly
  closeDatabase();
  if (typeof closeMssqlPool === 'function') {
    closeMssqlPool().catch(err => log.error('Error closing MSSQL pool on will-quit:', err));
  }
});
