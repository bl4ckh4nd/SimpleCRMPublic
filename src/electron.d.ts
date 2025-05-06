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

// Augment the Window interface
declare global {
    interface Window {
         // Keep the original electron interface if titlebar needs it
        electron?: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
        };
    }
}

 // Define basic App types (can be moved to src/types/)
 // Moved to src/services/data/types.ts
// export interface Customer { ... }
// export interface Product { ... }

export {}; // Add this line to treat the file as a module
