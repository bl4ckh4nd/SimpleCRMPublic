interface MssqlSettings {
  server: string;
  database: string;
  user: string;
  password: string;
  port: number;
  encrypt: boolean;
  trustServerCertificate: boolean;
}

interface SyncStatus {
    status: 'Idle' | 'Running' | 'Success' | 'Error' | 'Skipped' | 'Never' | 'Unknown';
    message?: string;
    progress?: number; // 0-100
    timestamp?: string; // ISO string
}

interface WindowState {
  isMaximized: boolean;
  isFullScreen: boolean;
}

interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  info?: any;
  error?: string;
}

// Augment the Window interface
declare global {
    interface Window {
         // Keep the original electron interface if titlebar needs it
        electron?: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
            getWindowState?: () => Promise<WindowState>;
            onWindowStateChange?: (callback: (state: WindowState) => void) => () => void;
            updates?: {
              checkForUpdates: () => Promise<any>;
              getStatus: () => Promise<UpdateStatus>;
              installUpdate: () => Promise<any>;
              onStatusChange: (callback: (status: UpdateStatus) => void) => () => void;
              onDownloadProgress: (callback: (progress: any) => void) => () => void;
            };
        };
    }
}

 // Define basic App types (can be moved to src/types/)
 // Moved to src/services/data/types.ts
// export interface Customer { ... }
// export interface Product { ... }

export {}; // Add this line to treat the file as a module
