import { z } from 'zod';
import type { AnyIpcEndpoint, InvokeChannel } from './channels';

type EndpointFor<C extends InvokeChannel> = Extract<AnyIpcEndpoint, { channel: C }>;

export type InferPayload<C extends InvokeChannel> = z.input<EndpointFor<C>['input']>;
export type InferResult<C extends InvokeChannel> = z.output<EndpointFor<C>['output']>;
export type EndpointPayload<E extends AnyIpcEndpoint> = z.input<E['input']>;
export type EndpointResult<E extends AnyIpcEndpoint> = z.output<E['output']>;

export type InvokeHandler<C extends InvokeChannel> = (
  payload: InferPayload<C>,
) => Promise<InferResult<C>> | InferResult<C>;
