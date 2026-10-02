"use client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { customerStatusTone } from "@/lib/status-presentation";

import { useState, useEffect } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  ChevronDown,
  Search,
  SlidersHorizontal,
  Loader2,
  ArrowUpDown,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import ExportButton from "@/components/export-button"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { localDataService } from "@/services/data/localDataService"
import type { Customer } from "@/services/data/types"
import { AddCustomerDialog } from "@/components/add-customer-dialog"
import { getPrimaryPhone, getPrimaryContact } from "@/lib/contact-utils"
import { SyncStatusDisplay } from "@/components/sync-status-display"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { GroupSelector, GroupOption } from "@/components/grouping/group-selector"
import { GroupedList } from "@/components/grouping/grouped-list"
import { customerGroupingFields, groupItemsByField, getCustomFieldGroupingOptions } from "@/lib/grouping"
import { PageHeader } from "@/components/page-header"

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

const columns: ColumnDef<Customer>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Alle auswählen"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Zeile auswählen"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorFn: (row) => `${row.firstName || ''} ${row.name}`,
    id: 'fullName', // Explicit ID needed when using accessorFn
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link to="/customers/$customerId" params={{ customerId: row.original.id.toString() }} className="hover:underline font-medium">
        {`${row.original.firstName || ''} ${row.original.name}`}
      </Link>
    ),
  },
  {
    accessorKey: "customerNumber",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Kundennr.
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.original.customerNumber || '-',
  },
  {
    accessorKey: "company",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Firma
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.original.company || '-',
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        E-Mail
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
     cell: ({ row }) => row.original.email || '-',
  },
  {
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
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const statusLabels: Record<string, string> = { Active: "Aktiv", Lead: "Lead", Inactive: "Inaktiv" };
      return (
        <Badge variant={customerStatusTone(row.original.status)}>
          {statusLabels[row.original.status] ?? row.original.status}
        </Badge>
      );
    },
    filterFn: 'equals', // Use built-in 'equals' or a custom function if needed
  },
  {
    accessorKey: "jtl_kKunde",
    id: "jtlCustomerNumber",
    header: "JTL Kundennr.",
    cell: ({ row }) => row.original.jtl_kKunde?.toString() || '-',
  },
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

const globalFilterFn: FilterFn<Customer> = (row, columnId, filterValue) => {
  const customer = row.original;
  const query = String(filterValue).toLowerCase(); // Ensure query is string and lowercase

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
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const navigate = useNavigate()

  const [isGrouped, setIsGrouped] = useState(false)
  const [selectedGrouping, setSelectedGrouping] = useState<string | null>(null)
  const [groupingOptions, setGroupingOptions] = useState<GroupOption[]>([])
  const [availableGroupingFields, setAvailableGroupingFields] = useState<typeof customerGroupingFields>([])

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = useState(''); // State for global filter input

  useEffect(() => {
    const initializeGroupingOptions = async () => {
      try {
        const standardOptions = customerGroupingFields.map(field => ({
          value: field.value,
          label: field.label
        }));

        const customFieldGroupings = await getCustomFieldGroupingOptions();
        const customOptions = customFieldGroupings.map(field => ({
          value: field.value,
          label: field.label
        }));

        setGroupingOptions([...standardOptions, ...customOptions]);

        setAvailableGroupingFields([...customerGroupingFields, ...customFieldGroupings]);
      } catch (error) {
        console.error("Failed to initialize grouping options:", error);
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

  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    const fetchCustomersWithCustomFields = async () => {
      setIsLoading(true)
      try {
        const customers = await localDataService.getCustomers()
        if (!cancelled) setCustomers(customers)
      } catch (error) {
        if (cancelled) return
        setLoadError(true)
        console.error("Failed to fetch customers:", error)
        toast.error("Kunden konnten nicht aus der lokalen Datenbank geladen werden.")

      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    setLoadError(false)
    fetchCustomersWithCustomFields()
    return () => { cancelled = true }
  }, [retry])

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

  const handleCustomerAdded = (newCustomer: Customer) => {
    setCustomers(prev => [newCustomer, ...prev]);
  };

  const handleDeleteSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map(row => row.original.id);
    if (selectedIds.length === 0) {
      toast.info("Keine Kunden zum Löschen ausgewählt.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await localDataService.deleteCustomers(selectedIds);
      if (!result.success) {
        const related = result.blockers?.reduce(
          (count, blocker) => count + blocker.deals + blocker.tasks,
          0,
        );
        toast.error("Kunden konnten nicht gelöscht werden.", {
          description: related
            ? `${related} verknüpfte Deals oder Aufgaben müssen zuerst entfernt werden.`
            : result.error,
        });
        return;
      }

      setCustomers(prev => prev.filter(c => !result.deletedIds.includes(Number(c.id))));
      table.resetRowSelection();
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
      <div className="px-4 py-4 sm:px-6">
        <PageHeader title="Kunden" subtitle="Kundenstamm durchsuchen, gruppieren und verwalten." actions={<AddCustomerDialog onCustomerAdded={handleCustomerAdded} />} />
          {loadError && <Alert variant="destructive" className="mb-4"><AlertDescription>Kunden konnten nicht geladen werden.<Button size="sm" variant="outline" disabled={isLoading} onClick={() => setRetry(value => value + 1)}>Erneut versuchen</Button></AlertDescription></Alert>}
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <SyncStatusDisplay />
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                density="compact"
                type="search"
                placeholder="Kunden suchen..." aria-label="Kunden suchen..."
                className="pl-8 w-full"
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>

            <GroupSelector
              options={groupingOptions}
              selectedGrouping={selectedGrouping}
              isGrouped={isGrouped}
              onGroupingChange={setSelectedGrouping}
              onToggleGrouping={setIsGrouped}
            />

            {(() => {
              const statusLabels: Record<string, string> = { Active: 'Aktiv', Lead: 'Lead', Inactive: 'Inaktiv' }
              const currentFilter = table.getColumn('status')?.getFilterValue() as string | undefined
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <SlidersHorizontal className="h-4 w-4" />
                      Statusfilter ({currentFilter ? (statusLabels[currentFilter] ?? currentFilter) : 'Alle'})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => table.getColumn('status')?.setFilterValue(undefined)}>Alle</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => table.getColumn('status')?.setFilterValue('Active')}>Aktiv</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => table.getColumn('status')?.setFilterValue('Lead')}>Lead</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => table.getColumn('status')?.setFilterValue('Inactive')}>Inaktiv</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            })()}

             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="ml-auto hidden sm:flex">
                    Spaltenauswahl <ChevronDown className="h-4 w-4" />
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

          </div>

           {table.getFilteredSelectedRowModel().rows.length > 0 && (
             <div className="mb-4 flex items-center gap-2 rounded-md border bg-muted p-2">
                <span className="text-sm font-medium">
                    {table.getFilteredSelectedRowModel().rows.length} von{" "}
                    {table.getFilteredRowModel().rows.length} Zeile(n) ausgewählt.
                </span>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    disabled={isLoading}
                >
                    <Trash2 className="h-4 w-4" />
                    Ausgewählte löschen
                </Button>
             </div>
           )}
           <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Kunden löschen?</AlertDialogTitle>
                 <AlertDialogDescription>
                   Sie sind dabei, {table.getFilteredSelectedRowModel().rows.length} Kunden zu löschen. Diese Aktion kann nicht rückgängig gemacht werden.
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                 <AlertDialogAction
                   onClick={handleDeleteSelected}
                   className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                 >
                   Löschen
                 </AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>

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
              <div className="mt-4">
                <GroupedList
                  groups={groupItemsByField(table.getFilteredRowModel().rows.map(row => row.original), selectedGrouping, availableGroupingFields)}
                  renderItem={(customer) => (
                    <div className="border-b py-2 px-4 hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link to="/customers/$customerId" params={{ customerId: customer.id.toString() }} className="font-medium hover:underline">
                            {`${customer.firstName || ''} ${customer.name}`}
                          </Link>
                          <div className="text-sm text-muted-foreground">
                            {customer.company ? `${customer.company} • ` : ''}
                            {getPrimaryContact(customer)}
                          </div>
                        </div>
                        <Badge variant={customerStatusTone(customer.status)}>
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
                            className="cursor-pointer"
                            onClick={() => navigate({ to: '/customers/$customerId', params: { customerId: row.original.id.toString() } })}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell
                                key={cell.id}
                                onClick={cell.column.id === 'select' || cell.column.id === 'actions' ? (e) => e.stopPropagation() : undefined}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="h-24 text-center">
                            {isLoading ? "Kunden werden geladen…" : loadError ? "Kundenbestand nicht verfügbar." : globalFilter ? "Keine passenden Kunden. Ändern Sie die Suche." : "Keine Kunden vorhanden."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
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
