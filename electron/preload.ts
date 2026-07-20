import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { AllowedInvokeChannels, type InvokeChannel } from '../shared/ipc/channels';

type WindowState = {
  isMaximized: boolean;
  isFullScreen: boolean;
};

const allowedInvokeChannels = new Set<string>(AllowedInvokeChannels);

const invoke = (channel: string, payload?: unknown) => {
  if (!allowedInvokeChannels.has(channel)) {
    return Promise.reject(new Error(`IPC invoke blocked for channel: ${channel}`));
  }
  return payload === undefined
    ? ipcRenderer.invoke(channel)
    : ipcRenderer.invoke(channel, payload);
};

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
  updates: {
    checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
    getStatus: () => ipcRenderer.invoke('app:get-update-status'),
    installUpdate: () => ipcRenderer.invoke('app:install-update'),
    onStatusChange: (callback: (status: unknown) => void) => {
      const listener = (_event: IpcRendererEvent, status: unknown) => callback(status);
      ipcRenderer.on('update:status', listener);
      return () => {
        ipcRenderer.removeListener('update:status', listener);
      };
    },
    onDownloadProgress: (callback: (progress: unknown) => void) => {
      const listener = (_event: IpcRendererEvent, progress: unknown) => callback(progress);
      ipcRenderer.on('update:download-progress', listener);
      return () => {
        ipcRenderer.removeListener('update:download-progress', listener);
      };
    },
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: InvokeChannel, payload?: unknown) => invoke(channel, payload),
  onSyncStatusChange: (callback: (status: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, status: unknown) => callback(status);
    ipcRenderer.on('sync:status-update', listener);
    return () => {
      ipcRenderer.removeListener('sync:status-update', listener);
    };
  },
});

// Log successful preload initialization
console.log('[Preload] Successfully loaded and exposed electronAPI to main world');
