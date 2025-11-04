import { z } from 'zod';
import { InvokeChannel } from './channels';
import { IpcSchemas } from './schemas';

export type PayloadSchemaMap = typeof IpcSchemas;

export type InferPayload<C extends InvokeChannel> = z.infer<PayloadSchemaMap[C]['payload']>;
export type InferResult<C extends InvokeChannel> = z.infer<PayloadSchemaMap[C]['result']>;

export type InvokeHandler<C extends InvokeChannel> = (
  payload: InferPayload<C>,
) => Promise<InferResult<C>> | InferResult<C>;
