// This file provides a unified API to use either the Electron API or a web fallback
// when running in a browser context outside of Electron

// Create a type definition for our electron API
interface ElectronAPI {
  send: (channel: string, data: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  appInfo: {
    name: string;
    version: string;
  };
}

// Check if we're running in Electron
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && window.electron !== undefined;
};

// Safe access to the electron API
export const electronAPI = (): ElectronAPI | null => {
  if (isElectron()) {
    return (window as any).electron;
  }
  return null;
};

// Helper functions to provide a consistent API regardless of platform

// Send data to the main process (or do nothing in web)
export const sendToMain = (channel: string, data: any): void => {
  const api = electronAPI();
  if (api) {
    api.send(channel, data);
  } else {
    console.log(`Would send to ${channel} if in Electron:`, data);
  }
};

// Receive data from the main process (or do nothing in web)
export const receiveFromMain = (
  channel: string,
  func: (...args: any[]) => void
): void => {
  const api = electronAPI();
  if (api) {
    api.receive(channel, func);
  } else {
    console.log(`Would listen to ${channel} if in Electron`);
  }
};

// Get app info
export const getAppInfo = () => {
  const api = electronAPI();
  if (api) {
    return api.appInfo;
  }
  return {
    name: 'SimpleCRM (Web)',
    version: 'web',
  };
};

// Additional platform-specific features can be added here
export const saveDataToDesktop = (data: any, fileName: string) => {
  const api = electronAPI();
  if (api) {
    api.send('save-data', { data, fileName });
    return true;
  } else {
    // Web fallback - use browser download
    try {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  }
};
