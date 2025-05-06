// Define the structure of the API exposed by preload.js
declare global {
  interface Window {
    electronAPI: {
      // Define the invoke method signature accurately
      invoke: <T>(channel: string, ...args: any[]) => Promise<T>;
      // Define send and receive if needed, mirroring preload.js
      send: (channel: string, data?: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => (() => void) | undefined; // Return type for cleanup
      removeAllListeners: (channel: string) => void;
      // Add other specific methods if they were exposed directly (though invoke is preferred)
    };
  }
}

// Export {} is necessary to make this file a module type declaration
export {}; 