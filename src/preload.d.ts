import { InvokeChannel } from '@shared/ipc/channels';
import { InferPayload, InferResult } from '@shared/ipc/types';

type InvokeArgs<C extends InvokeChannel> = undefined extends InferPayload<C>
  ? [payload?: Exclude<InferPayload<C>, undefined>]
  : [payload: InferPayload<C>];

// Define the structure of the API exposed by preload.js
declare global {
  interface Window {
    electronAPI: {
      invoke: <C extends InvokeChannel>(channel: C, ...args: InvokeArgs<C>) => Promise<InferResult<C>>;
      onSyncStatusChange: (callback: (status: unknown) => void) => () => void;
    };
  }
}

export {}; 
