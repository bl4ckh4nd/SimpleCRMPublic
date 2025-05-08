import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.send('window-control', 'minimize'),
  maximize: () => ipcRenderer.send('window-control', 'maximize'),
  close: () => ipcRenderer.send('window-control', 'close'),
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => {
      const allowedChannels: string[] = [
        // DB Channels
        'db:get-customers',
        'db:get-customer',
        'db:create-customer',
        'db:update-customer',
        'db:delete-customer',
        'db:get-deals-for-customer',
        'db:get-tasks-for-customer',
        
        // Calendar Channels
        'db:getCalendarEvents',
        'db:addCalendarEvent',
        'db:updateCalendarEvent',
        'db:deleteCalendarEvent',
      ];
      if (allowedChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      console.error(`IPC invoke blocked for channel: ${channel}`);
      return Promise.reject(new Error(`IPC invoke blocked for channel: ${channel}`));
    }
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  // --- MSSQL (Now using Keytar versions via invoke below) ---
  // saveSettings: (settings) => ipcRenderer.invoke('mssql:save-settings', settings),
  // getSettings: () => ipcRenderer.invoke('mssql:get-settings'),
  // testConnection: (settings) => ipcRenderer.invoke('mssql:test-connection', settings),
  // fetchMssqlCustomers: () => ipcRenderer.invoke('mssql:fetch-customers'), // Keep or remove if only sync is used

  // --- Generic Invoke Handler ---
  invoke: (channel: string, ...args: any[]) => {
      const allowedChannels: string[] = [
        // DB Channels
        'db:get-customers',
        'db:get-customer',
        'db:create-customer',
        'db:update-customer',
        'db:delete-customer',
        'db:get-deals-for-customer',
        'db:get-tasks-for-customer',
        
        // Calendar Channels
        'db:getCalendarEvents',
        'db:addCalendarEvent',
        'db:updateCalendarEvent',
        'db:deleteCalendarEvent',
        
        // Product Channels
        'products:get-all',
        'products:get-by-id',
        'products:create',
        'products:update',
        'products:delete',

        // Deal Channels (new)
        'deals:get-all',
        'deals:get-by-id',
        'deals:create',
        'deals:update',
        'deals:update-stage',
        
        // Deal-Product Link Channels
        'deals:get-products',
        'deals:add-product',
        'deals:remove-product',
        'deals:update-product-quantity',

        // Task Channels (new)
        'tasks:get-all',
        'tasks:get-by-id',
        'tasks:create',
        'tasks:update',
        'tasks:toggle-completion',
        'tasks:delete',

        // Sync Channels
        'sync:run',
        'sync:get-status',
        'sync:get-info',      // Added
        'sync:set-info',      // Added

        // MSSQL Channels (using Keytar service)
        'mssql:save-settings',
        'mssql:get-settings',
        'mssql:test-connection',
        // JTL Channels
        'jtl:get-firmen',
        'jtl:get-warenlager',
        'jtl:get-zahlungsarten',
        'jtl:get-versandarten',
        'jtl:create-order', // Added as it's used in deal detail page
      ];
      if (allowedChannels.includes(channel)) {
          return ipcRenderer.invoke(channel, ...args);
      }
      console.error(`IPC invoke blocked for channel: ${channel}`);
      return Promise.reject(new Error(`IPC invoke blocked for channel: ${channel}`));
  },

  // --- General IPC Send/Receive (for non-invoke patterns like status updates) ---
  send: (channel: string, data?: any) => {
    // Keep existing valid send channels + window controls if needed
    const validChannels: string[] = ['toMain', 'printContent', 'save-data', 'load-data', 'window-control'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    const validChannels: string[] = [
        'fromMain',
        'save-data-reply',
        'load-data-reply',
        'sync:status-update' // Add sync status channel
    ];
    if (validChannels.includes(channel)) {
      const listener = (event: IpcRendererEvent, ...args: any[]) => func(...args);
      // Ensure we remove previous listener for the same channel to avoid duplicates
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, listener);
      // Return a cleanup function
      return () => {
         ipcRenderer.removeListener(channel, listener);
      };
    }
    // Return a no-op cleanup function if channel is invalid
     return () => {};
  },
   removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
