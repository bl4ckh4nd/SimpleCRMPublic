import { ipcMain, IpcMainInvokeEvent } from 'electron';
import type { AnyIpcEndpoint } from '../../shared/ipc/channels';
import type { EndpointPayload, EndpointResult } from '../../shared/ipc/types';

export interface RegisterIpcOptions {
  logger?: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}

export type IpcHandler<E extends AnyIpcEndpoint> = (
  event: IpcMainInvokeEvent,
  payload: EndpointPayload<E>,
) => Promise<unknown> | unknown;

export function registerIpcHandler<E extends AnyIpcEndpoint>(
  definition: E,
  handler: IpcHandler<E>,
  options: RegisterIpcOptions = {},
) {
  const { logger = console } = options;
  const { channel, input, output } = definition;

  const wrappedHandler = async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    try {
      if (args.length > 1) {
        throw new TypeError(`IPC channel ${channel} accepts one payload argument`);
      }

      const parsedPayload = input.parse(args[0]) as EndpointPayload<E>;
      const result = await handler(event, parsedPayload);
      return output.parse(result) as EndpointResult<E>;
    } catch (error) {
      logger.error(`[IPC] Handler error for ${channel}:`, error);
      throw error;
    }
  };

  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, wrappedHandler);

  return () => ipcMain.removeHandler(channel);
}
