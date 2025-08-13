"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  ChevronDown,
  Plus,
  Search,
  SlidersHorizontal,
  Copy,
  Loader2,
  ArrowUpDown,
  MoreHorizontal,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import ExportButton from "@/components/export-button"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { localDataService } from "@/services/data/localDataService"
import { customFieldService } from "@/services/data/customFieldService"
import type { Customer } from "@/services/data/types"
import { AddCustomerDialog } from "@/components/add-customer-dialog"
import { getPrimaryPhone, getPrimaryContact } from "@/lib/contact-utils"
import { SyncStatusDisplay } from "@/components/sync-status-display"
import { DataTablePagination } from "@/components/data-table-pagination"
import { GroupSelector, GroupOption } from "@/components/grouping/group-selector"
import { GroupedList } from "@/components/grouping/grouped-list"
import { customerGroupingFields, groupItemsByField, getCustomFieldGroupingOptions } from "@/lib/grouping"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  useReactTable,
  FilterFn,
} from "@tanstack/react-table"

// Helper function for date formatting (if needed for sync status)
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "N/A"
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("de-DE") + ' ' + date.toLocaleTimeString("de-DE");
  } catch (e) {
    return dateString
  }
}

// Define columns outside the component or memoize them
const columns: ColumnDef<Customer>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    // Combined Name Column
    accessorFn: (row) => `${row.firstName || ''} ${row.name}`,
    id: 'fullName', // Explicit ID needed when using accessorFn
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link to="/customers/$id" params={{ id: row.original.id.toString() }} className="hover:underline font-medium">
        {`${row.original.firstName || ''} ${row.original.name}`}
      </Link>
    ),
  },
  {
    accessorKey: "customerNumber",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Kundennr.
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.original.customerNumber || '-',
  },
  {
    accessorKey: "company",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Firma
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.original.company || '-',
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        E-Mail
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
     cell: ({ row }) => row.original.email || '-',
  },
  {
    // Combined Phone Column with proper prioritization
    accessorFn: (row) => getPrimaryPhone(row),
    id: 'contactPhone',
    header: "Telefon",
    cell: ({ row }) => getPrimaryPhone(row.original) || '-',
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Status
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.status === "Active" ? "default" : row.original.status === "Lead" ? "secondary" : "outline"}>
        {row.original.status}
      </Badge>
    ),
    // Enable filtering on this column
    filterFn: 'equals', // Use built-in 'equals' or a custom function if needed
  },
  {
    accessorKey: "customerNumber",
    id: "jtlCustomerNumber",
    header: "JTL Kundennr.",
    cell: ({ row }) => row.original.customerNumber || '-',
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const customer = row.original;
      const copyAffiliateLink = (link?: string) => {
        if (link) {
          navigator.clipboard.writeText(link);
          toast.success("Affiliate-Link kopiert");
        } else {
          toast.info("Kein Affiliate-Link vorhanden.");
        }
      };
      return customer.affiliateLink ? (
        <Button variant="ghost" size="icon" onClick={() => copyAffiliateLink(customer.affiliateLink)} title={customer.affiliateLink}>
          <Copy className="h-4 w-4" />
        </Button>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
    enableSorting: false,
    enableHiding: false,
  }
];

// German column name mapping for visibility dropdown
const columnDisplayNames: Record<string, string> = {
  'fullName': 'Name',
  'customerNumber': 'Kundennr.',
  'jtlCustomerNumber': 'JTL Kundennr.',
  'company': 'Firma',
  'email': 'E-Mail',
  'contactPhone': 'Telefon',
  'status': 'Status',
  'actions': 'Aktionen'
};

// Custom global filter function
const globalFilterFn: FilterFn<Customer> = (row, columnId, filterValue) => {
  const customer = row.original;
  const query = String(filterValue).toLowerCase(); // Ensure query is string and lowercase

  // Check across relevant fields
  const nameMatch = customer.name?.toLowerCase().includes(query) ?? false;
  const firstNameMatch = customer.firstName?.toLowerCase().includes(query) ?? false;
  const emailMatch = customer.email?.toLowerCase().includes(query) ?? false;
  const companyMatch = customer.company?.toLowerCase().includes(query) ?? false;
  const phoneMatch = customer.phone?.toLowerCase().includes(query) ?? false;
  const mobileMatch = customer.mobile?.toLowerCase().includes(query) ?? false;
  const jtlIdMatch = customer.jtl_kKunde !== undefined && customer.jtl_kKunde !== null ? customer.jtl_kKunde.toString().includes(query) : false;

  return nameMatch || firstNameMatch || emailMatch || companyMatch || phoneMatch || mobileMatch || jtlIdMatch;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  // Grouping state
  const [isGrouped, setIsGrouped] = useState(false)
  const [selectedGrouping, setSelectedGrouping] = useState<string | null>(null)
  const [groupingOptions, setGroupingOptions] = useState<GroupOption[]>([])
  const [availableGroupingFields, setAvailableGroupingFields] = useState<typeof customerGroupingFields>([])

  // React Table State
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = useState(''); // State for global filter input

  // Initialize grouping options from customerGroupingFields and custom fields
  useEffect(() => {
    const initializeGroupingOptions = async () => {
      try {
        // Get standard grouping options
        const standardOptions = customerGroupingFields.map(field => ({
          value: field.value,
          label: field.label
        }));

        // Get custom field grouping options
        const customFieldGroupings = await getCustomFieldGroupingOptions();
        const customOptions = customFieldGroupings.map(field => ({
          value: field.value,
          label: field.label
        }));

        // Combine standard and custom options
        setGroupingOptions([...standardOptions, ...customOptions]);

        // Add custom field groupings to the available grouping fields
        setAvailableGroupingFields([...customerGroupingFields, ...customFieldGroupings]);
      } catch (error) {
        console.error("Failed to initialize grouping options:", error);
        // Fallback to standard options
        const standardOptions = customerGroupingFields.map(field => ({
          value: field.value,
          label: field.label
        }));
        setGroupingOptions(standardOptions);
        setAvailableGroupingFields(customerGroupingFields);
      }
    };

    initializeGroupingOptions();
  }, []);

  useEffect(() => {
    const fetchCustomersWithCustomFields = async () => {
      console.log(`🔍 [CustomersPage] Starting to fetch customers with custom fields`);
      const startTime = Date.now();
      
      setIsLoading(true)
      try {
        // Fetch customers
        console.log(`🔍 [CustomersPage] Fetching customers list...`);
        const fetchStartTime = Date.now();
        const fetchedCustomers = await localDataService.getCustomers()
        console.log(`🔍 [CustomersPage] Fetched ${fetchedCustomers.length} customers in ${Date.now() - fetchStartTime}ms`);

        // PERFORMANCE CRITICAL: For each customer, fetch their custom field values
        // This creates N+1 queries (1 for customers + N for each customer's custom fields)
        console.log(`🔍 [CustomersPage] PERFORMANCE WARNING: About to fetch custom fields for ${fetchedCustomers.length} customers individually (N+1 query pattern)`);
        const customFieldsStartTime = Date.now();
        
        const customersWithFields = await Promise.all(
          fetchedCustomers.map(async (customer, index) => {
            try {
              const customerStartTime = Date.now();
              const customFieldValues = await customFieldService.getCustomFieldValuesForCustomer(Number(customer.id));
              console.log(`🔍 [CustomersPage] Customer ${index + 1}/${fetchedCustomers.length} (ID: ${customer.id}) custom fields fetched in ${Date.now() - customerStartTime}ms`);

              // Convert array of values to a key-value object
              const customFields = customFieldValues.reduce((acc, field) => {
                acc[field.name || ''] = field.value;
                return acc;
              }, {} as Record<string, any>);

              // Return customer with custom fields
              return {
                ...customer,
                customFields
              };
            } catch (error) {
              console.error(`Failed to fetch custom fields for customer ${customer.id}:`, error);
              // Return customer without custom fields
              return {
                ...customer,
                customFields: {}
              };
            }
          })
        );

        console.log(`🔍 [CustomersPage] All custom fields fetched in ${Date.now() - customFieldsStartTime}ms`);
        console.log(`🔍 [CustomersPage] Total time to load customers with custom fields: ${Date.now() - startTime}ms`);
        
        setCustomers(customersWithFields);
      } catch (error) {
        console.error("Failed to fetch customers:", error)
        toast.error("Could not load customers from local database.")
        setCustomers([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchCustomersWithCustomFields()
  }, [])

  const table = useReactTable({
    data: customers,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter, // Link state to table
    globalFilterFn: globalFilterFn, // Use custom global filter
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const copyAffiliateLink = (link?: string) => {
    if (link) {
      navigator.clipboard.writeText(link)
      toast.success("Affiliate-Link in die Zwischenablage kopiert")
    } else {
      toast.info("Kein Affiliate-Link für diesen Kunden vorhanden.")
    }
  }

  const handleCustomerAdded = (newCustomer: Customer) => {
    setCustomers(prev => [newCustomer, ...prev]);
    // Optionally reset filters/sorting or navigate
  };

  // Handle bulk delete action
  const handleDeleteSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map(row => row.original.id);
    if (selectedIds.length === 0) {
      toast.info("Keine Kunden zum Löschen ausgewählt.");
      return;
    }

    try {
      setIsLoading(true); // Indicate processing
      // Call the actual API
      const api = window.electronAPI as any;

      // Delete each customer
      for (const id of selectedIds) {
        await api.invoke('db:delete-customer', id);
      }

      // Update state after successful deletion
      setCustomers(prev => prev.filter(c => !selectedIds.includes(c.id)));
      table.resetRowSelection(); // Clear selection
      toast.success(`${selectedIds.length} Kunde(n) gelöscht.`);
    } catch (error) {
      console.error("Failed to delete selected customers:", error);
      toast.error("Fehler beim Löschen der ausgewählten Kunden.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <main className="flex-1">
      <div className="container mx-auto max-w-7xl py-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Kunden</h1>
              <p className="text-muted-foreground">Anzeige lokaler Kunden (synchronisiert mit JTL)</p>
            </div>
            <div className="flex items-center gap-3">
              <SyncStatusDisplay />
            </div>
          </div>

          {/* Toolbar: Search, Filters, Actions */}
          <div className="flex flex-wrap gap-2 items-center mb-4">
            {/* Global Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Kunden suchen..."
                className="pl-8 w-full"
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>

            {/* Grouping Selector */}
            <GroupSelector
              options={groupingOptions}
              selectedGrouping={selectedGrouping}
              isGrouped={isGrouped}
              onGroupingChange={setSelectedGrouping}
              onToggleGrouping={setIsGrouped}
            />

            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Statusfilter {table.getColumn('status')?.getFilterValue() ? `(${table.getColumn('status')?.getFilterValue()})` : '(Alle)'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => table.getColumn('status')?.setFilterValue(undefined)}>Alle</DropdownMenuItem>
                <DropdownMenuItem onClick={() => table.getColumn('status')?.setFilterValue('Active')}>Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => table.getColumn('status')?.setFilterValue('Lead')}>Lead</DropdownMenuItem>
                <DropdownMenuItem onClick={() => table.getColumn('status')?.setFilterValue('Inactive')}>Inactive</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

             {/* Column Visibility Toggle */}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto hidden sm:flex">
                    Spaltenauswahl <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                        return (
                        <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                            {columnDisplayNames[column.id] || column.id}
                        </DropdownMenuCheckboxItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>

            <ExportButton data={customers} fileName="customers_export.json">
              Exportieren
            </ExportButton>
            <AddCustomerDialog onCustomerAdded={handleCustomerAdded} />
          </div>

           {/* Bulk Actions Bar (appears when rows are selected) */}
           {table.getFilteredSelectedRowModel().rows.length > 0 && (
             <div className="mb-4 flex items-center gap-2 rounded-md border bg-muted p-2">
                <span className="text-sm font-medium">
                    {table.getFilteredSelectedRowModel().rows.length} von{" "}
                    {table.getFilteredRowModel().rows.length} Zeile(n) ausgewählt.
                </span>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={isLoading} // Disable while loading/deleting
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Ausgewählte löschen
                </Button>
             </div>
           )}

        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Kundenliste</CardTitle>
            <CardDescription>
              {isLoading
                ? "Lade Kunden..."
                : ` ${table.getFilteredRowModel().rows.length} von ${customers.length} Kunden angezeigt${isGrouped && selectedGrouping ? ` (gruppiert nach: ${availableGroupingFields.find(f => f.value === selectedGrouping)?.label || selectedGrouping})` : ''}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && table.getRowModel().rows.length === 0 ? ( // Show loader only if no data is displayed yet
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Lade Daten...</span>
              </div>
            ) : isGrouped && selectedGrouping ? (
              // Grouped view
              <div className="mt-4">
                <GroupedList
                  groups={groupItemsByField(table.getFilteredRowModel().rows.map(row => row.original), selectedGrouping, availableGroupingFields)}
                  renderItem={(customer) => (
                    <div className="border-b py-2 px-4 hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link to="/customers/$id" params={{ id: customer.id.toString() }} className="font-medium hover:underline">
                            {`${customer.firstName || ''} ${customer.name}`}
                          </Link>
                          <div className="text-sm text-muted-foreground">
                            {customer.company ? `${customer.company} • ` : ''}
                            {getPrimaryContact(customer)}
                          </div>
                        </div>
                        <Badge variant={customer.status === "Active" ? "default" : customer.status === "Lead" ? "secondary" : "outline"}>
                          {customer.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                  keyExtractor={(customer) => customer.id}
                  groupHeaderClassName="mb-2"
                  groupContentClassName="mb-4 space-y-1 pl-8"
                />
              </div>
            ) : (
              // Regular table view
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id} colSpan={header.colSpan}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="h-24 text-center">
                            {isLoading ? "Lade..." : "Keine Kunden gefunden."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                <div className="py-4">
                  <DataTablePagination table={table} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

