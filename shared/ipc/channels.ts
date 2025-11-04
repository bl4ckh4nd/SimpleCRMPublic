import { literal, tuple } from './utils';

const WindowChannels = literal({
  GetState: 'window:get-state',
});

// DB related invoke channels
const DbChannels = literal({
  GetCustomers: 'db:get-customers',
  GetCustomersDropdown: 'db:get-customers-dropdown',
  SearchCustomers: 'db:search-customers',
  GetCustomer: 'db:get-customer',
  CreateCustomer: 'db:create-customer',
  UpdateCustomer: 'db:update-customer',
  DeleteCustomer: 'db:delete-customer',
  GetDealsForCustomer: 'db:get-deals-for-customer',
  GetTasksForCustomer: 'db:get-tasks-for-customer',
});

const CalendarChannels = literal({
  GetCalendarEvents: 'db:getCalendarEvents',
  AddCalendarEvent: 'db:addCalendarEvent',
  UpdateCalendarEvent: 'db:updateCalendarEvent',
  DeleteCalendarEvent: 'db:deleteCalendarEvent',
});

const ProductChannels = literal({
  GetAll: 'products:get-all',
  Search: 'products:search',
  GetById: 'products:get-by-id',
  Create: 'products:create',
  Update: 'products:update',
  Delete: 'products:delete',
});

const DealChannels = literal({
  GetAll: 'deals:get-all',
  GetById: 'deals:get-by-id',
  Create: 'deals:create',
  Update: 'deals:update',
  UpdateStage: 'deals:update-stage',
  GetProducts: 'deals:get-products',
  AddProduct: 'deals:add-product',
  RemoveProduct: 'deals:remove-product',
  UpdateProduct: 'deals:update-product',
  UpdateProductQuantityLegacy: 'deals:update-product-quantity',
});

const TaskChannels = literal({
  GetAll: 'tasks:get-all',
  GetById: 'tasks:get-by-id',
  Create: 'tasks:create',
  Update: 'tasks:update',
  ToggleCompletion: 'tasks:toggle-completion',
  Delete: 'tasks:delete',
});

const SyncChannels = literal({
  Run: 'sync:run',
  GetStatus: 'sync:get-status',
  GetInfo: 'sync:get-info',
  SetInfo: 'sync:set-info',
});

const MssqlChannels = literal({
  SaveSettings: 'mssql:save-settings',
  GetSettings: 'mssql:get-settings',
  TestConnection: 'mssql:test-connection',
  ClearPassword: 'mssql:clear-password',
});

const JtlChannels = literal({
  GetFirmen: 'jtl:get-firmen',
  GetWarenlager: 'jtl:get-warenlager',
  GetZahlungsarten: 'jtl:get-zahlungsarten',
  GetVersandarten: 'jtl:get-versandarten',
  CreateOrder: 'jtl:create-order',
});

const DashboardChannels = literal({
  GetStats: 'dashboard:get-stats',
  GetRecentCustomers: 'dashboard:get-recent-customers',
  GetUpcomingTasks: 'dashboard:get-upcoming-tasks',
});

const CustomFieldChannels = literal({
  GetAll: 'custom-fields:get-all',
  GetActive: 'custom-fields:get-active',
  GetById: 'custom-fields:get-by-id',
  Create: 'custom-fields:create',
  Update: 'custom-fields:update',
  Delete: 'custom-fields:delete',
  GetValuesForCustomer: 'custom-fields:get-values-for-customer',
  SetValue: 'custom-fields:set-value',
  DeleteValue: 'custom-fields:delete-value',
});

export const IPCChannels = {
  Window: WindowChannels,
  Db: DbChannels,
  Calendar: CalendarChannels,
  Products: ProductChannels,
  Deals: DealChannels,
  Tasks: TaskChannels,
  Sync: SyncChannels,
  Mssql: MssqlChannels,
  Jtl: JtlChannels,
  Dashboard: DashboardChannels,
  CustomFields: CustomFieldChannels,
} as const;

// Flattened invoke list for preload allow-listing
export const AllowedInvokeChannels = tuple(
  ...Object.values(IPCChannels.Window),
  ...Object.values(IPCChannels.Db),
  ...Object.values(IPCChannels.Calendar),
  ...Object.values(IPCChannels.Products),
  ...Object.values(IPCChannels.Deals),
  ...Object.values(IPCChannels.Tasks),
  ...Object.values(IPCChannels.Sync),
  ...Object.values(IPCChannels.Mssql),
  ...Object.values(IPCChannels.Jtl),
  ...Object.values(IPCChannels.Dashboard),
  ...Object.values(IPCChannels.CustomFields),
);

export type InvokeChannel = typeof AllowedInvokeChannels[number];

export const DeprecatedInvokeChannels = tuple(
  IPCChannels.Deals.UpdateProductQuantityLegacy,
);

export type DeprecatedInvokeChannel = typeof DeprecatedInvokeChannels[number];

export type ChannelGroups = typeof IPCChannels;
