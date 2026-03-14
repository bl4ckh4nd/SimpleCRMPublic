// Main Electron process
import { app, BrowserWindow, dialog, globalShortcut, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import log from 'electron-log';
import windowStateKeeper from 'electron-window-state';
import { registerAllIpcHandlers } from './ipc/router';
import {
  initializeAutoUpdater,
  checkForUpdatesAndNotify,
} from './update-service';

// Configure electron-log
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/main.log');
log.catchErrors(); // Catch unhandled errors
Object.assign(console, log.functions); // Override console functions

const isDevelopment = process.env.NODE_ENV === 'development';
// Keep production startup diagnosable without enabling full debug logging.
log.transports.file.level = isDevelopment ? 'debug' : 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5 MB rotation cap
log.transports.file.maxLogFiles = 3;

// Secret masking and port parsing moved into dedicated IPC modules.

import { initializeDatabase, closeDatabase } from './sqlite-service';
import { initializeSyncService } from './sync-service';
import {
  initializeMssqlService,
  closeMssqlPool,
} from './mssql-keytar-service';

// Keep a global reference of the mainWindow object
let mainWindow: BrowserWindow | null;
let devToolsWindow: BrowserWindow | null = null;

// This will hold the function to load the content into the BrowserWindow
let loadURLFunction;

let cleanupIpcHandlers = () => {};

const getWindowUrl = (windowInstance: BrowserWindow) => {
  try {
    return windowInstance.webContents.getURL() || '<empty>';
  } catch (error) {
    log.warn('[Electron Main] Failed to read current window URL:', error);
    return '<unavailable>';
  }
};

const ensureDevToolsWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return null;
  }
  if (devToolsWindow && !devToolsWindow.isDestroyed()) {
    return devToolsWindow;
  }

  const { workArea } = screen.getPrimaryDisplay();
  const width = Math.min(1200, Math.max(900, Math.floor(workArea.width * 0.6)));
  const height = Math.min(900, Math.max(650, Math.floor(workArea.height * 0.75)));
  const x = workArea.x + Math.max(0, Math.floor((workArea.width - width) / 2));
  const y = workArea.y + Math.max(0, Math.floor((workArea.height - height) / 2));

  devToolsWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    title: 'SimpleCRM DevTools',
    autoHideMenuBar: false,
    show: false,
  });

  devToolsWindow.on('closed', () => {
    devToolsWindow = null;
  });

  mainWindow.webContents.setDevToolsWebContents(devToolsWindow.webContents);
  return devToolsWindow;
};

// Determine mode AT THE TOP
log.info(`\[Electron Main\] Initial check: process.env.NODE_ENV = ${process.env.NODE_ENV}, isDevelopment = ${isDevelopment}`);

// --- Setup loadURLFunction based on mode ---
// This setup, especially for electron-serve, needs to happen before 'app.ready'.
if (isDevelopment) {
  log.info('[Electron Main] Development mode: Setting up Vite dev server loader.');
  loadURLFunction = async (windowInstance) => {
    const viteDevServerUrl = new URL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173').toString();
    log.info(`\[Electron Main\] Development mode: Attempting to load URL: ${viteDevServerUrl}`);
    try {
      await windowInstance.loadURL(viteDevServerUrl);
      log.info('[Electron Main] Development URL loaded successfully.');
    } catch (error) {
      log.error(`\[Electron Main\] Failed to load Vite dev server URL ${viteDevServerUrl}:`, error);
      dialog.showErrorBox("Dev Server Load Error", `Could not connect to Vite dev server at ${viteDevServerUrl}. Please ensure it's running. Error: ${error.message}`);
    }
  };
} else {
  log.info('[Electron Main] Production mode: Setting up electron-serve loader before app ready.');
  try {
    const electronServeModule = require('electron-serve');
    const electronServeFunc = typeof electronServeModule === 'function'
      ? electronServeModule
      : (electronServeModule.default || null);

    if (typeof electronServeFunc === 'function') {
      const loadAppUrl = electronServeFunc({ directory: path.join(__dirname, '../dist') });
      loadURLFunction = async (windowInstance) => {
        log.info('[Electron Main] Production mode: Loading renderer with electron-serve.');
        await loadAppUrl(windowInstance);
        log.info(`[Electron Main] Content loaded successfully with electron-serve: ${getWindowUrl(windowInstance)}`);
      };
    } else {
      throw new Error('electron-serve did not provide a usable function');
    }
  } catch (error) {
    log.error('[Electron Main] electron-serve setup failed:', error);
    throw error;
  }
}

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

  const openDevToolsBar = () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    try {
      const toolsWindow = ensureDevToolsWindow();
      if (!mainWindow.webContents.isDevToolsOpened()) {
        // Use a dedicated window to avoid DevTools restoring off-screen.
        mainWindow.webContents.openDevTools({ mode: 'detach', activate: true });
        log.info('[Electron Main] DevTools opened (detach mode).');
      } else {
        mainWindow.webContents.focusDevTools();
        log.info('[Electron Main] DevTools focused.');
      }
      if (toolsWindow && !toolsWindow.isDestroyed()) {
        if (toolsWindow.isMinimized()) {
          toolsWindow.restore();
        }
        toolsWindow.show();
        toolsWindow.focus();
      }
    } catch (error) {
      log.error('[Electron Main] Failed to open DevTools bar:', error);
    }
  };

  // Add preload error logging to diagnose preload script issues
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    log.info(`[Preload/Console] Level ${level}: ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('dom-ready', () => {
    log.info(`[Electron Main] dom-ready: ${getWindowUrl(mainWindow!)}`);
  });

  mainWindow.webContents.on('did-navigate', (_event, url) => {
    log.info(`[Electron Main] did-navigate: ${url}`);
  });

  mainWindow.webContents.on('did-navigate-in-page', (_event, url, isMainFrame) => {
    log.info(`[Electron Main] did-navigate-in-page: url=${url} isMainFrame=${isMainFrame}`);
  });

  // Catch preload errors specifically
  mainWindow.webContents.on('crashed', () => {
    log.error('[Preload/Renderer] Renderer process crashed');
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log.error(`[Preload/Renderer] Render process gone: reason=${details.reason} exitCode=${details.exitCode}`);
  });

  mainWindow.webContents.on('unresponsive', () => {
    log.warn('[Preload/Renderer] Renderer process is unresponsive');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    log.error(`[Electron Main] did-fail-load: code=${errorCode} description=${errorDescription} url=${validatedURL}`);
    openDevToolsBar();
  });

  mainWindow.webContents.on('devtools-opened', () => {
    log.info('[Electron Main] DevTools opened event.');
  });

  mainWindow.webContents.on('devtools-closed', () => {
    log.info('[Electron Main] DevTools closed event.');
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
    log.debug(`[Electron Main] Renderer finished loading at ${getWindowUrl(mainWindow!)}, sending initial window state.`);
    emitWindowState();
    openDevToolsBar();
    setTimeout(openDevToolsBar, 1000);
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
    log.info(`[Electron Main] Content loaded into mainWindow successfully at ${getWindowUrl(mainWindow)}.`);
  } catch (error) {
    log.error('[Electron Main] Failed to load URL using loadURLFunction:', error);
    const errorMsg = `Failed to load application content. Error: ${error.message}\nURL: ${error.url || (isDevelopment ? 'http://localhost:5173' : 'app://- (electron-serve)') }`;
    dialog.showErrorBox("Application Load Error", errorMsg);
  }

  mainWindow.on('closed', () => {
    if (devToolsWindow && !devToolsWindow.isDestroyed()) {
      devToolsWindow.close();
    }
    devToolsWindow = null;
    mainWindow = null;
  });
}

// --- App Lifecycle ---
initializeApp()
  .then(() => {
    app.whenReady().then(async () => { // Added async here
      log.info('[Electron Main] App is ready (after initializeApp).');

      cleanupIpcHandlers = registerAllIpcHandlers({
        logger: log,
        isDevelopment,
        getMainWindow: () => mainWindow,
      });

      if (!isDevelopment) {
        try {
          initializeAutoUpdater({
            logger: log,
            getMainWindow: () => mainWindow,
          });

          // Perform a background update check without blocking window creation
          checkForUpdatesAndNotify().catch((error) => {
            log.error('[Electron Main] Auto-update check failed:', error);
          });
        } catch (error) {
          log.error('[Electron Main] Failed to initialize auto-updater:', error);
        }
      }

      await createMainWindow(); // Create the main window

      const toggleDevTools = () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          return;
        }
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
        } else {
          ensureDevToolsWindow();
          mainWindow.webContents.openDevTools({ mode: 'detach', activate: true });
        }
      };

      const f12Registered = globalShortcut.register('F12', toggleDevTools);
      const chordRegistered = globalShortcut.register('CommandOrControl+Shift+I', toggleDevTools);
      log.info(`[Electron Main] Registered F12 DevTools shortcut: ${f12Registered}`);
      log.info(`[Electron Main] Registered Cmd/Ctrl+Shift+I DevTools shortcut: ${chordRegistered}`);

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
  globalShortcut.unregisterAll();
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
