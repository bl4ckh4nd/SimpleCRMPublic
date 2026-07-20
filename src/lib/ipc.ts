import type { AnyIpcEndpoint } from '@shared/ipc/channels';
import type { EndpointPayload, EndpointResult } from '@shared/ipc/types';

type EndpointArgs<E extends AnyIpcEndpoint> = undefined extends EndpointPayload<E>
  ? [payload?: Exclude<EndpointPayload<E>, undefined>]
  : [payload: EndpointPayload<E>];

export function invoke<E extends AnyIpcEndpoint>(
  definition: E,
  ...args: EndpointArgs<E>
): Promise<EndpointResult<E>> {
  if (!window.electronAPI) {
    return Promise.reject(new Error(`Electron API unavailable for ${definition.channel}`));
  }

  return window.electronAPI.invoke(
    definition.channel,
    ...(args as unknown as never[]),
  ) as Promise<EndpointResult<E>>;
}
