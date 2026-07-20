import { z, type ZodType } from 'zod';

export type IpcEndpoint<
  Channel extends string = string,
  Input extends ZodType = ZodType,
  Output extends ZodType = ZodType,
> = Readonly<{ channel: Channel; input: Input; output: Output }>;

export const endpoint = <
  const Channel extends string,
  Input extends ZodType,
  Output extends ZodType,
>(channel: Channel, input: Input, output: Output): IpcEndpoint<Channel, Input, Output> =>
  Object.freeze({ channel, input, output });

// Legacy endpoints stay permissive until their domain schema is promoted here.
// Runtime validation still occurs; new and invariant-bearing endpoints use exact schemas below.
// `any` is deliberate at this compatibility edge: promoting a legacy endpoint
// replaces it with an exact domain schema and removes the escape hatch.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const row = z.custom<any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const objectValue = z.custom<any>();
const rows = z.array(row);
const nullableRow = row.nullable();
const positiveId = z.number().int().positive();
const success = z.object({ success: z.literal(true) }).loose();
const failure = z.object({
  success: z.literal(false),
  error: z.string().optional(),
  code: z.string().optional(),
}).loose();
const mutation = z.union([success, failure]);
const page = z.object({
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  filter: row.optional(),
}).optional();

const customer = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().nullable().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
}).loose();

const task = z.object({
  id: positiveId,
  customer_id: positiveId,
  title: z.string(),
  description: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.string(),
  completed: z.union([z.boolean(), z.number()]),
  calendar_event_id: positiveId.nullable().optional(),
}).loose();

const notificationSettings = z.object({
  smtp: z.object({
    enabled: z.boolean(),
    host: z.string(),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
    user: z.string(),
    password: z.string().nullable().optional(),
    from_address: z.string(),
    notify_to: z.string(),
  }),
  digest: z.object({
    hour: z.number().int().min(0).max(23),
    deals_days_ahead: z.number().int().min(0).max(365),
  }),
});
const notificationLog = z.object({
  id: positiveId,
  sent_date: z.string(),
  recipient: z.string(),
  task_count: z.number().int().nonnegative(),
  deal_count: z.number().int().nonnegative(),
  status: z.enum(['sent', 'skipped', 'failed']),
  attempts: z.number().int().nonnegative(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  sent_at: z.string().nullable(),
});

export const IPC = {
  Window: {
    GetState: endpoint('window:get-state', z.undefined(), z.object({ isMaximized: z.boolean(), isFullScreen: z.boolean() })),
  },
  Update: {
    CheckForUpdates: endpoint('app:check-for-updates', z.undefined(), row),
    InstallUpdate: endpoint('app:install-update', z.undefined(), row),
    GetStatus: endpoint('app:get-update-status', z.undefined(), row),
  },
  Db: {
    GetCustomers: endpoint('db:get-customers', z.object({ includeCustomFields: z.boolean() }), z.array(customer)),
    GetCustomersDropdown: endpoint('db:get-customers-dropdown', z.undefined(), rows),
    SearchCustomers: endpoint(
      'db:search-customers',
      z.object({ query: z.string(), limit: z.number().int().positive().max(100).optional() }),
      rows,
    ),
    GetCustomer: endpoint('db:get-customer', positiveId, nullableRow),
    CreateCustomer: endpoint('db:create-customer', row, mutation),
    UpdateCustomer: endpoint('db:update-customer', z.object({ id: positiveId, customerData: row }), mutation),
    DeleteCustomer: endpoint('db:delete-customer', positiveId, mutation),
    DeleteCustomers: endpoint(
      'db:delete-customers',
      z.object({ customerIds: z.array(positiveId).min(1) }),
      z.union([
        z.object({ success: z.literal(true), deletedIds: z.array(positiveId) }),
        z.object({
          success: z.literal(false),
          error: z.string(),
          code: z.literal('CUSTOMER_HAS_RELATIONS').optional(),
          blockers: z.array(z.object({ customerId: positiveId, deals: z.number().int(), tasks: z.number().int() })).optional(),
        }),
      ]),
    ),
    GetDealsForCustomer: endpoint('db:get-deals-for-customer', positiveId, rows),
    GetTasksForCustomer: endpoint('db:get-tasks-for-customer', positiveId, z.array(task)),
  },
  Calendar: {
    GetCalendarEvents: endpoint(
      'db:getCalendarEvents',
      z.object({ startDate: z.string().optional(), endDate: z.string().optional() }).optional(),
      rows,
    ),
    AddCalendarEvent: endpoint('db:addCalendarEvent', row, mutation),
    UpdateCalendarEvent: endpoint('db:updateCalendarEvent', z.object({ id: positiveId, eventData: row }), mutation),
    DeleteCalendarEvent: endpoint('db:deleteCalendarEvent', positiveId, mutation),
    SaveEntry: endpoint(
      'calendar:save-entry',
      z.object({
        eventId: positiveId.optional(),
        event: z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          start_date: z.string(),
          end_date: z.string(),
          all_day: z.boolean(),
          color_code: z.string().optional(),
          event_type: z.string().optional(),
          recurrence_rule: z.string().nullable().optional(),
        }),
        task: z.object({
          id: positiveId.nullable().optional(),
          customer_id: positiveId,
          priority: z.enum(['High', 'Medium', 'Low']),
          description: z.string().optional(),
          completed: z.boolean().optional(),
        }).nullable().optional(),
      }),
      mutation,
    ),
  },
  Products: {
    GetAll: endpoint('products:get-all', z.undefined(), rows),
    Search: endpoint(
      'products:search',
      z.object({ query: z.string(), limit: z.number().int().positive().max(100).optional() }),
      rows,
    ),
    GetById: endpoint('products:get-by-id', positiveId, nullableRow),
    Create: endpoint('products:create', row, mutation),
    Update: endpoint('products:update', z.object({ id: positiveId, productData: row }), mutation),
    Delete: endpoint('products:delete', positiveId, mutation),
  },
  Deals: {
    GetAll: endpoint('deals:get-all', page, rows),
    GetById: endpoint('deals:get-by-id', positiveId, nullableRow),
    Create: endpoint('deals:create', row, mutation),
    Update: endpoint('deals:update', z.object({ id: positiveId, dealData: objectValue }), mutation),
    Delete: endpoint('deals:delete', positiveId, mutation),
    UpdateStage: endpoint('deals:update-stage', z.object({ dealId: positiveId, newStage: z.string().min(1) }), mutation),
    GetProducts: endpoint('deals:get-products', positiveId, rows),
    GetTasks: endpoint('deals:get-tasks', positiveId, z.array(task)),
    AddProduct: endpoint(
      'deals:add-product',
      z.object({ dealId: positiveId, productId: positiveId, quantity: z.number().int().positive(), unitPrice: z.number().nonnegative() }),
      mutation,
    ),
    RemoveProduct: endpoint('deals:remove-product', z.object({ dealProductId: positiveId }), mutation),
    UpdateProduct: endpoint(
      'deals:update-product',
      z.object({ dealProductId: positiveId, quantity: z.number().int().positive(), unitPrice: z.number().nonnegative().optional() }),
      mutation,
    ),
  },
  Tasks: {
    GetAll: endpoint('tasks:get-all', z.object({
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
      filter: z.object({ completed: z.boolean().optional(), priority: z.string().optional(), query: z.string().optional() }).optional(),
    }).optional(), z.array(task)),
    GetById: endpoint('tasks:get-by-id', positiveId, task.nullable()),
    Create: endpoint(
      'tasks:create',
      z.object({
        task: row,
        schedule: z.object({ startDate: z.string(), endDate: z.string(), allDay: z.boolean() }).optional(),
      }),
      mutation,
    ),
    Update: endpoint('tasks:update', z.object({ id: positiveId, taskData: row }), mutation),
    ToggleCompletion: endpoint('tasks:toggle-completion', z.object({ taskId: positiveId, completed: z.boolean() }), mutation),
    SetSchedule: endpoint(
      'tasks:set-schedule',
      z.object({ taskId: positiveId, startDate: z.string(), endDate: z.string(), allDay: z.boolean() }),
      mutation,
    ),
    RemoveSchedule: endpoint('tasks:remove-schedule', z.object({ taskId: positiveId }), mutation),
    Delete: endpoint('tasks:delete', positiveId, mutation),
  },
  Sync: {
    Run: endpoint('sync:run', z.undefined(), row),
    GetStatus: endpoint('sync:get-status', z.undefined(), row.nullable()),
    GetInfo: endpoint('sync:get-info', z.string(), z.union([z.string(), row, z.null()])),
    SetInfo: endpoint('sync:set-info', z.object({ key: z.string(), value: z.string() }), mutation),
  },
  Mssql: {
    SaveSettings: endpoint('mssql:save-settings', row, mutation),
    GetSettings: endpoint('mssql:get-settings', z.undefined(), row.nullable()),
    TestConnection: endpoint('mssql:test-connection', row, mutation),
    ClearPassword: endpoint('mssql:clear-password', z.undefined(), mutation),
  },
  Jtl: {
    GetFirmen: endpoint('jtl:get-firmen', z.undefined(), rows),
    GetWarenlager: endpoint('jtl:get-warenlager', z.undefined(), rows),
    GetZahlungsarten: endpoint('jtl:get-zahlungsarten', z.undefined(), rows),
    GetVersandarten: endpoint('jtl:get-versandarten', z.undefined(), rows),
    CreateOrder: endpoint('jtl:create-order', row, mutation),
  },
  Dashboard: {
    GetStats: endpoint('dashboard:get-stats', z.undefined(), row),
    GetRecentCustomers: endpoint('dashboard:get-recent-customers', positiveId.optional(), rows),
    GetUpcomingTasks: endpoint('dashboard:get-upcoming-tasks', positiveId.optional(), z.array(task)),
  },
  CustomFields: {
    GetAll: endpoint('custom-fields:get-all', z.undefined(), rows),
    GetActive: endpoint('custom-fields:get-active', z.undefined(), rows),
    GetById: endpoint('custom-fields:get-by-id', positiveId, nullableRow),
    Create: endpoint('custom-fields:create', row, mutation),
    Update: endpoint('custom-fields:update', z.object({ id: positiveId, fieldData: row }), mutation),
    Delete: endpoint('custom-fields:delete', positiveId, mutation),
    GetValuesForCustomer: endpoint('custom-fields:get-values-for-customer', positiveId, rows),
    SetValue: endpoint(
      'custom-fields:set-value',
      z.object({ fieldId: positiveId, customerId: positiveId, value: z.any() }),
      mutation,
    ),
    DeleteValue: endpoint(
      'custom-fields:delete-value',
      z.object({ fieldId: positiveId, customerId: positiveId }),
      mutation,
    ),
  },
  FollowUp: {
    GetItems: endpoint('followup:get-items', z.object({
      queue: z.string(),
      filters: z.object({ query: z.string().optional(), priority: z.string().optional() }).optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    }), rows),
    GetQueueCounts: endpoint('followup:get-queue-counts', z.undefined(), row),
    SnoozeTask: endpoint('followup:snooze-task', z.object({ taskId: positiveId, snoozedUntil: z.string() }), mutation),
    LogActivity: endpoint('followup:log-activity', z.object({
      customer_id: positiveId.optional(), deal_id: positiveId.optional(), task_id: positiveId.optional(),
      activity_type: z.string(), title: z.string().optional(), description: z.string().optional(),
    }), mutation),
    GetTimeline: endpoint('followup:get-timeline', z.object({
      customerId: positiveId,
      filter: z.string().optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    }), rows),
    GetSavedViews: endpoint('followup:get-saved-views', z.undefined(), rows),
    CreateSavedView: endpoint('followup:create-saved-view', z.object({ name: z.string().min(1), filters: z.string() }), mutation),
    DeleteSavedView: endpoint('followup:delete-saved-view', positiveId, mutation),
  },
  Notifications: {
    GetSettings: endpoint(
      'notifications:get-settings',
      z.undefined(),
      notificationSettings.omit({ smtp: true }).extend({
        smtp: notificationSettings.shape.smtp.omit({ password: true }).extend({ hasPassword: z.boolean() }),
      }),
    ),
    SaveSettings: endpoint('notifications:save-settings', notificationSettings, mutation),
    GetLog: endpoint(
      'notifications:get-log',
      z.object({ limit: z.number().int().positive().max(100).optional() }).optional(),
      z.array(notificationLog),
    ),
    GetStatus: endpoint('notifications:get-status', z.undefined(), z.object({
      enabled: z.boolean(),
      running: z.boolean(),
      lastHeartbeatAt: z.string().nullable(),
      nextRunAt: z.string(),
      lastRun: notificationLog.nullable(),
    })),
    SendTest: endpoint('notifications:send-test', z.undefined(), mutation),
  },
} as const;

type Values<T> = T[keyof T];
type EndpointsOf<T> = Values<{
  [Group in keyof T]: Values<T[Group]>;
}>;

export type AnyIpcEndpoint = EndpointsOf<typeof IPC>;
export type InvokeChannel = AnyIpcEndpoint['channel'];

export const AllIpcEndpoints = Object.freeze(
  Object.values(IPC).flatMap((group) => Object.values(group)),
) as readonly AnyIpcEndpoint[];

export const AllowedInvokeChannels = Object.freeze(
  AllIpcEndpoints.map(({ channel }) => channel),
) as readonly InvokeChannel[];

type ChannelTree<T> = {
  readonly [Group in keyof T]: {
    readonly [Name in keyof T[Group]]: T[Group][Name] extends IpcEndpoint<infer Channel> ? Channel : never;
  };
};

export const IPCChannels = Object.freeze(Object.fromEntries(
  Object.entries(IPC).map(([groupName, group]) => [
    groupName,
    Object.freeze(Object.fromEntries(
      Object.entries(group).map(([name, definition]) => [name, definition.channel]),
    )),
  ]),
)) as ChannelTree<typeof IPC>;

export const DeprecatedInvokeChannels = Object.freeze([]) as readonly InvokeChannel[];
export type DeprecatedInvokeChannel = never;
export type ChannelGroups = typeof IPCChannels;
