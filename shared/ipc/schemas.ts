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

// --- Calendar ---
baseSchemaMap.set(IPCChannels.Calendar.GetCalendarEvents, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Calendar.AddCalendarEvent, {
  payload: z.any(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Calendar.UpdateCalendarEvent, {
  payload: z.any(),
  result: z.undefined(),
});

baseSchemaMap.set(IPCChannels.Calendar.DeleteCalendarEvent, {
  payload: z.number().int(),
  result: z.undefined(),
});

// --- Deals ---
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

// --- JTL ---
baseSchemaMap.set(IPCChannels.Jtl.GetFirmen, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Jtl.GetWarenlager, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Jtl.GetZahlungsarten, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Jtl.GetVersandarten, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

// --- Products ---
baseSchemaMap.set(IPCChannels.Products.GetAll, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Products.Search, {
  payload: z.string(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Products.GetById, {
  payload: z.number().int().positive(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Products.Create, {
  payload: z.any(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Products.Update, {
  payload: z.any(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Products.Delete, {
  payload: z.number().int().positive(),
  result: z.undefined(),
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

// --- Dashboard ---
baseSchemaMap.set(IPCChannels.Dashboard.GetStats, {
  payload: z.undefined(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Dashboard.GetRecentCustomers, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Dashboard.GetUpcomingTasks, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

// --- Tasks ---
baseSchemaMap.set(IPCChannels.Tasks.GetAll, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Tasks.GetById, {
  payload: z.number().int().positive(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Tasks.Create, {
  payload: z.any(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Tasks.Update, {
  payload: z.any(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Tasks.ToggleCompletion, {
  payload: z.number().int().positive(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Tasks.Delete, {
  payload: z.number().int().positive(),
  result: z.undefined(),
});

// --- Custom Fields ---
baseSchemaMap.set(IPCChannels.CustomFields.GetAll, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.CustomFields.GetActive, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.CustomFields.GetById, {
  payload: z.number().int().positive(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.CustomFields.Create, {
  payload: z.any(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.CustomFields.Update, {
  payload: z.any(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.CustomFields.Delete, {
  payload: z.number().int().positive(),
  result: z.undefined(),
});

baseSchemaMap.set(IPCChannels.CustomFields.GetValuesForCustomer, {
  payload: z.number().int().positive(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.CustomFields.SetValue, {
  payload: z.object({
    customFieldId: z.number().int().positive(),
    customerId: z.number().int().positive(),
    value: z.string(),
  }),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.CustomFields.DeleteValue, {
  payload: z.object({
    customFieldId: z.number().int().positive(),
    customerId: z.number().int().positive(),
  }),
  result: z.undefined(),
});

// --- Remaining DB channels ---
baseSchemaMap.set(IPCChannels.Db.GetCustomers, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Db.GetCustomersDropdown, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Db.SearchCustomers, {
  payload: z.string(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Db.GetCustomer, {
  payload: z.number().int().positive(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Db.CreateCustomer, {
  payload: z.any(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Db.UpdateCustomer, {
  payload: z.any(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Db.DeleteCustomer, {
  payload: z.number().int().positive(),
  result: z.undefined(),
});

baseSchemaMap.set(IPCChannels.Db.GetDealsForCustomer, {
  payload: z.number().int().positive(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Db.GetTasksForCustomer, {
  payload: z.number().int().positive(),
  result: z.array(z.any()),
});

// --- Deals (remaining channels) ---
baseSchemaMap.set(IPCChannels.Deals.GetAll, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.Deals.GetById, {
  payload: z.number().int().positive(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Deals.Create, {
  payload: z.any(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Deals.Update, {
  payload: z.any(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Deals.UpdateStage, {
  payload: z.object({
    dealId: z.number().int().positive(),
    stageId: z.number().int().positive(),
  }),
  result: z.any(),
});

// --- JTL (remaining channel) ---
baseSchemaMap.set(IPCChannels.Jtl.CreateOrder, {
  payload: z.any(),
  result: z.any(),
});

// --- Sync ---
baseSchemaMap.set(IPCChannels.Sync.Run, {
  payload: z.undefined(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Sync.GetStatus, {
  payload: z.undefined(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Sync.GetInfo, {
  payload: z.undefined(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Sync.SetInfo, {
  payload: z.any(),
  result: z.any(),
});

// --- Window ---
baseSchemaMap.set(IPCChannels.Window.GetState, {
  payload: z.undefined(),
  result: z.object({ isMaximized: z.boolean(), isFullScreen: z.boolean() }),
});

// --- Update ---
baseSchemaMap.set(IPCChannels.Update.CheckForUpdates, {
  payload: z.undefined(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Update.InstallUpdate, {
  payload: z.undefined(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.Update.GetStatus, {
  payload: z.undefined(),
  result: z.any(),
});

// --- Follow-Up ---
baseSchemaMap.set(IPCChannels.FollowUp.GetItems, {
  payload: z.any(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.FollowUp.GetQueueCounts, {
  payload: z.undefined(),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.FollowUp.SnoozeTask, {
  payload: z.object({
    taskId: z.number().int().positive(),
    snoozedUntil: z.string(),
  }),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.FollowUp.LogActivity, {
  payload: z.object({
    customer_id: z.number().int().positive().optional(),
    deal_id: z.number().int().positive().optional(),
    task_id: z.number().int().positive().optional(),
    activity_type: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
  }),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.FollowUp.GetTimeline, {
  payload: z.any(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.FollowUp.GetSavedViews, {
  payload: z.undefined(),
  result: z.array(z.any()),
});

baseSchemaMap.set(IPCChannels.FollowUp.CreateSavedView, {
  payload: z.object({
    name: z.string().min(1),
    filters: z.string(),
  }),
  result: z.any(),
});

baseSchemaMap.set(IPCChannels.FollowUp.DeleteSavedView, {
  payload: z.number().int().positive(),
  result: z.any(),
});

export const IpcSchemas: Record<InvokeChannel, SchemaEntry> = Object.fromEntries(
  Array.from(baseSchemaMap.entries())
) as Record<InvokeChannel, SchemaEntry>;

export const getPayloadSchema = (channel: InvokeChannel) => IpcSchemas[channel].payload;
export const getResultSchema = (channel: InvokeChannel) => IpcSchemas[channel].result;
export const isDeprecatedChannel = (channel: InvokeChannel) => Boolean(IpcSchemas[channel].deprecated);
