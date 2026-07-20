import {
  AllIpcEndpoints,
  type AnyIpcEndpoint,
  type InvokeChannel,
} from './channels';

type EndpointFor<C extends InvokeChannel> = Extract<AnyIpcEndpoint, { channel: C }>;

const endpointMap = new Map(
  AllIpcEndpoints.map((definition) => [definition.channel, definition]),
) as Map<InvokeChannel, AnyIpcEndpoint>;

export const getEndpoint = <C extends InvokeChannel>(channel: C) => {
  const definition = endpointMap.get(channel);
  if (!definition) throw new Error(`Unknown IPC channel: ${channel}`);
  return definition as EndpointFor<C>;
};

// Compatibility for tests and tooling; definitions still live only on IPC endpoints.
export const IpcSchemas = Object.freeze(Object.fromEntries(
  AllIpcEndpoints.map(({ channel, input, output }) => [
    channel,
    { payload: input, result: output },
  ]),
)) as {
  readonly [C in InvokeChannel]: {
    readonly payload: EndpointFor<C>['input'];
    readonly result: EndpointFor<C>['output'];
  };
};

export const getPayloadSchema = <C extends InvokeChannel>(channel: C) => getEndpoint(channel).input;
export const getResultSchema = <C extends InvokeChannel>(channel: C) => getEndpoint(channel).output;
export const isDeprecatedChannel = (channel: InvokeChannel) => {
  void channel;
  return false;
};
