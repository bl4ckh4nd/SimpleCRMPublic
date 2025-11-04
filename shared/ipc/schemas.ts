import { z, ZodTypeAny } from 'zod';
import { AllowedInvokeChannels, DeprecatedInvokeChannels, IPCChannels, InvokeChannel } from './channels';

type SchemaEntry = {
  payload: ZodTypeAny;
  result: ZodTypeAny;
  deprecated?: boolean;
};

const baseSchemaMap = new Map<InvokeChannel, SchemaEntry>();

for (const channel of AllowedInvokeChannels) {
  baseSchemaMap.set(channel as InvokeChannel, {
    payload: z.any(),
    result: z.any(),
    deprecated: (DeprecatedInvokeChannels as readonly string[]).includes(channel),
  });
}

const successResponse = z.object({ success: z.literal(true) }).passthrough();
const failureResponse = z.object({ success: z.literal(false), error: z.string().optional() }).passthrough();
const standardResult = z.union([successResponse, failureResponse]);

// --- Deals ---
const dealProductIdentifier = z.object({
  dealProductId: z.number().int().positive().optional(),
  dealId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
});

const addDealProductPayload = z.object({
  dealId: z.number().int().positive(),
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  price: z.number().nonnegative().optional(),
  priceAtTime: z.number().nonnegative().optional(),
});

const removeDealProductPayload = z.object({
  dealProductId: z.number().int().positive().optional(),
  dealId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
}).refine((data) => !!data.dealProductId || (!!data.dealId && !!data.productId), {
  message: 'dealProductId or (dealId and productId) is required',
});

const updateDealProductPayload = dealProductIdentifier.extend({
  quantity: z.number().positive(),
  price: z.number().nonnegative().optional(),
  priceAtTime: z.number().nonnegative().optional(),
});

baseSchemaMap.set(IPCChannels.Deals.AddProduct, {
  payload: addDealProductPayload,
  result: standardResult,
});

baseSchemaMap.set(IPCChannels.Deals.RemoveProduct, {
  payload: removeDealProductPayload,
  result: standardResult,
});

baseSchemaMap.set(IPCChannels.Deals.UpdateProduct, {
  payload: updateDealProductPayload,
  result: standardResult,
});

baseSchemaMap.set(IPCChannels.Deals.UpdateProductQuantityLegacy, {
  payload: updateDealProductPayload,
  result: standardResult,
  deprecated: true,
});

baseSchemaMap.set(IPCChannels.Deals.GetProducts, {
  payload: z.number().int().positive(),
  result: z.array(z.any()),
});

// --- MSSQL ---
const mssqlSettingsBase = z.object({
  server: z.string().min(1),
  port: z.union([z.string(), z.number()]).optional(),
  database: z.string().min(1),
  user: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  encrypt: z.boolean().optional(),
  trustServerCertificate: z.boolean().optional(),
  forcePort: z.boolean().optional(),
});

baseSchemaMap.set(IPCChannels.Mssql.SaveSettings, {
  payload: mssqlSettingsBase,
  result: standardResult,
});

baseSchemaMap.set(IPCChannels.Mssql.GetSettings, {
  payload: z.undefined(),
  result: z.object({}).passthrough(),
});

baseSchemaMap.set(IPCChannels.Mssql.TestConnection, {
  payload: mssqlSettingsBase,
  result: z.union([
    successResponse,
    failureResponse.extend({ errorDetails: z.any().optional() }),
  ]),
});

baseSchemaMap.set(IPCChannels.Mssql.ClearPassword, {
  payload: z.undefined(),
  result: standardResult,
});

export const IpcSchemas: Record<InvokeChannel, SchemaEntry> = Object.fromEntries(
  Array.from(baseSchemaMap.entries())
) as Record<InvokeChannel, SchemaEntry>;

export const getPayloadSchema = (channel: InvokeChannel) => IpcSchemas[channel].payload;
export const getResultSchema = (channel: InvokeChannel) => IpcSchemas[channel].result;
export const isDeprecatedChannel = (channel: InvokeChannel) => Boolean(IpcSchemas[channel].deprecated);
