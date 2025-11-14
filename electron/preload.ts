import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { AllowedInvokeChannels } from '@shared/ipc/channels';

type WindowState = {
  isMaximized: boolean;
  isFullScreen: boolean;
};

const allowedInvokeChannels = new Set(AllowedInvokeChannels);

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.send('window-control', 'minimize'),
  maximize: () => ipcRenderer.send('window-control', 'maximize'),
  close: () => ipcRenderer.send('window-control', 'close'),
  getWindowState: () => ipcRenderer.invoke('window:get-state') as Promise<WindowState>,
  onWindowStateChange: (callback: (state: WindowState) => void) => {
    const listener = (_event: IpcRendererEvent, state: WindowState) => callback(state);
    ipcRenderer.on('window-state-changed', listener);
    return () => {
      ipcRenderer.removeListener('window-state-changed', listener);
    };
  },
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => {
      if (allowedInvokeChannels.has(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      console.error(`IPC invoke blocked for channel: ${channel}`);
      return Promise.reject(new Error(`IPC invoke blocked for channel: ${channel}`));
    },
  },
  updates: {
    checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
    getStatus: () => ipcRenderer.invoke('app:get-update-status'),
    installUpdate: () => ipcRenderer.invoke('app:install-update'),
    onStatusChange: (callback: (status: any) => void) => {
      const listener = (_event: IpcRendererEvent, status: any) => callback(status);
      ipcRenderer.on('update:status', listener);
      return () => {
        ipcRenderer.removeListener('update:status', listener);
      };
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      const listener = (_event: IpcRendererEvent, progress: any) => callback(progress);
      ipcRenderer.on('update:download-progress', listener);
      return () => {
        ipcRenderer.removeListener('update:download-progress', listener);
      };
    },
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
      if (allowedInvokeChannels.has(channel)) {
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
        'sync:status-update', // Add sync status channel
        'window-state-changed',
        'update:status',
        'update:download-progress',
    ];
    if (validChannels.includes(channel)) {
      const listener = (event: IpcRendererEvent, ...args: any[]) => func(...args);
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

// Log successful preload initialization
console.log('[Preload] Successfully loaded and exposed electronAPI to main world');
