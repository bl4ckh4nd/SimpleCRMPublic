import { InvokeChannel } from '@shared/ipc/channels';
import { InferPayload, InferResult } from '@shared/ipc/types';

type InvokeArgs<C extends InvokeChannel> = InferPayload<C> extends undefined
  ? []
  : InferPayload<C> extends any[]
    ? InferPayload<C>
    : [InferPayload<C>];

// Define the structure of the API exposed by preload.js
declare global {
  interface Window {
    electronAPI: {
      // Typed invoke method derived from shared IPC contract
      invoke: <C extends InvokeChannel>(channel: C, ...args: InvokeArgs<C>) => Promise<InferResult<C>>;
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
