"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Link } from "@tanstack/react-router"
import { ChevronDown, Plus, Search, SlidersHorizontal, LayoutGrid, List, Calendar as CalendarIcon, Loader2, FileBox } from "lucide-react"
import ExportButton from "@/components/export-button"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from "@/components/deal/kanban-card"
import { KanbanColumn } from "@/components/deal/kanban-column"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CustomerCombobox } from "@/components/customer-combobox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination"
import { GroupSelector, GroupOption } from "@/components/grouping/group-selector"
import { GroupedList } from "@/components/grouping/grouped-list"
import { dealGroupingFields, groupItemsByField } from "@/lib/grouping"
import { IPCChannels } from '@shared/ipc/channels';

import { EmptyState } from "@/components/empty-state"

// Define the Deal type for better type safety
type Deal = {
  id: number;
  name: string;
  customer: string;
  customer_id: number;
  value: string;
  value_calculation_method?: 'static' | 'dynamic';
  createdDate: string;
  expectedCloseDate: string;
  stage: string;
  notes?: string;
}

// Define a type for API response of deals
interface DealFromApi {
  id: number;
  name: string;
  customer_id: number;
  customer_name: string; // Joined from customers table
  value: number;
  value_calculation_method: 'static' | 'dynamic';
  created_date: string;
  expected_close_date: string | null;
  stage: string;
  notes: string | null;
  last_modified: string;
}

// Convert API deal format to UI deal format
function formatDealForUI(apiDeal: DealFromApi): Deal {
  return {
    id: apiDeal.id,
    name: apiDeal.name,
    customer: apiDeal.customer_name,
    customer_id: apiDeal.customer_id,
    value: apiDeal.value.toString(),
    value_calculation_method: apiDeal.value_calculation_method,
    createdDate: apiDeal.created_date,
    expectedCloseDate: apiDeal.expected_close_date || "",
    stage: apiDeal.stage,
    notes: apiDeal.notes || ""
  };
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('de-DE')
  } catch {
    return dateString
  }
}

const formatCurrency = (value: string | number | null | undefined): string => {
  const num = Number(value)
  if (isNaN(num)) return '-'
  return num.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

const PAGE_SIZE = 10

export default function DealsPage() {
  const [allDeals, setAllDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isAddDealOpen, setIsAddDealOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table")
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [page, setPage] = useState(1)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [isGrouped, setIsGrouped] = useState(false)
  const [selectedGrouping, setSelectedGrouping] = useState<string | null>(null)
  const [groupingOptions, setGroupingOptions] = useState<GroupOption[]>([])
  const [newDeal, setNewDeal] = useState({
    name: "",
    customer: "",
    customer_id: "", // Will need to be populated from customer selection
    value: "",
    value_calculation_method: "static" as 'static' | 'dynamic', // Default to static
    stage: "Interessent",
    expectedCloseDate: "", // Store the actual date string
    dateValue: undefined as Date | undefined // For the date picker UI component
  })


  // Derived state for pagination
  const totalPages = Math.max(1, Math.ceil(allDeals.length / PAGE_SIZE))
  const deals = allDeals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Load all deals with optional filtering (pagination is client-side)
  const loadDeals = useCallback(async () => {
    setIsLoading(true)
    try {
      const filter: { stage?: string; query?: string } = {}

      if (activeFilter) {
        filter.stage = activeFilter
      }

      if (searchQuery.trim() !== '') {
        filter.query = searchQuery
      }

      const apiDeals = await window.electronAPI.invoke(
        IPCChannels.Deals.GetAll,
        { limit: 10000, offset: 0, filter }
      )

      const formattedDeals = Array.isArray(apiDeals)
        ? apiDeals.map(formatDealForUI)
        : []

      setAllDeals(formattedDeals)
      setPage(1)
    } catch (error) {
      console.error('Failed to load deals:', error)
      toast.error("Fehler", { description: "Deals konnten nicht geladen werden" })
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter, searchQuery])

  useEffect(() => {
    loadDeals()
  }, [loadDeals])

  useEffect(() => {
    const options = dealGroupingFields.map(field => ({
      value: field.value,
      label: field.label
    }))
    setGroupingOptions(options)
  }, [])

  // Setup dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Only start dragging after moving 8px to avoid accidental drags
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Group ALL deals by stage for Kanban view (unaffected by page slice)
  const dealStages = ["Interessent", "Qualifiziert", "Angebot", "Verhandlung", "Gewonnen", "Verloren"]
  const groupedDeals = dealStages.reduce((acc, stage) => {
    acc[stage] = allDeals.filter(deal => deal.stage === stage)
    return acc
  }, {} as Record<string, Deal[]>)

  const handleAddDeal = async () => {
    if (!newDeal.name || !newDeal.customer_id || (newDeal.value_calculation_method === 'static' && !newDeal.value)) {
      toast.error("Eingabefehler", { description: "Bitte füllen Sie alle Pflichtfelder aus" })
      return
    }

    try {
      const dealData = {
        name: newDeal.name,
        customer_id: parseInt(newDeal.customer_id),
        value: parseFloat(newDeal.value),
        value_calculation_method: newDeal.value_calculation_method,
        stage: newDeal.stage,
        expected_close_date: newDeal.expectedCloseDate || null
      }

      const result = await window.electronAPI.invoke(
        IPCChannels.Deals.Create,
        dealData
      ) as { success: boolean; id?: number; error?: string }

      if (result.success && result.id) {
        toast.success("Deal erfolgreich hinzugefügt")

        // Refresh the deals list
        await loadDeals()

        // Reset form and close dialog
        setNewDeal({
          name: "",
          customer: "",
          customer_id: "",
          value: "",
          value_calculation_method: "static",
          stage: "Interessent",
          expectedCloseDate: "",
          dateValue: undefined
        })

        setIsAddDealOpen(false)
      } else {
        throw new Error(result.error || 'Unbekannter Fehler')
      }
    } catch (error) {
      console.error('Failed to add deal:', error)
      toast.error("Fehler", {
        description: error instanceof Error ? error.message : "Deal konnte nicht hinzugefügt werden"
      })
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const dealId = active.id as number;
    const deal = allDeals.find(d => d.id === dealId);
    if (deal) {
      setActiveDeal(deal);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const dealId = Number(active.id);
      const newStage = over.id as string;

      // Optimistically update the UI
      setAllDeals(currentDeals =>
        currentDeals.map(deal =>
          deal.id === dealId ? { ...deal, stage: newStage } : deal
        )
      );

      // Persist the change to the database
      try {
        const result = await window.electronAPI.invoke(
          IPCChannels.Deals.UpdateStage,
          {
            dealId,
            newStage
          }
        ) as { success: boolean; error?: string }

        if (!result.success) {
          throw new Error(result.error || 'Failed to update deal stage')
        }

        toast.success("Deal aktualisiert", { description: `Deal wurde auf "${newStage}" aktualisiert` })
      } catch (error) {
        console.error('Failed to update deal stage:', error)

        // Rollback the UI change if the API call fails
        await loadDeals()

        toast.error("Fehler", { description: "Deal-Status konnte nicht aktualisiert werden" })
      }
    }

    // Reset the active deal when dragging ends
    setActiveDeal(null);
  };

  // Handle stage change from Kanban card dropdown (keyboard-accessible alternative to drag)
  const handleKanbanStageChange = async (dealId: number, newStage: string) => {
    setAllDeals(current => current.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    try {
      const result = await window.electronAPI.invoke(IPCChannels.Deals.UpdateStage, { dealId, newStage }) as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);
      toast.success("Deal aktualisiert", { description: `Deal wurde auf "${newStage}" aktualisiert` });
    } catch (error) {
      await loadDeals();
      toast.error("Fehler", { description: "Deal-Status konnte nicht aktualisiert werden" });
    }
  };

  // Handle search input with 300ms debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchInput(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(value)
    }, 300)
  }

  // Handle filter selection
  const handleFilterSelect = (stage: string | null) => {
    setActiveFilter(stage)
    setPage(1)
  }

  return (
    <main className="flex-1">
      <div className="px-6 py-4">
        <h1 className="text-2xl font-bold mb-4">Deals</h1>
        <div className="flex flex-wrap gap-2 items-center mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Deals suchen..."
                className="pl-8 md:w-[300px]"
                value={searchInput}
                onChange={handleSearchChange}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("table")}
                className="h-9 w-9"
                aria-label="Tabellenansicht"
                title="Tabellenansicht"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "kanban" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("kanban")}
                className="h-9 w-9"
                aria-label="Kanban-Ansicht"
                title="Kanban-Ansicht"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            {viewMode === "table" && (
              <GroupSelector
                options={groupingOptions}
                selectedGrouping={selectedGrouping}
                isGrouped={isGrouped}
                onGroupingChange={setSelectedGrouping}
                onToggleGrouping={setIsGrouped}
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filter
                  {activeFilter && <Badge variant="secondary" className="ml-2">{activeFilter}</Badge>}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={activeFilter === null}
                  onCheckedChange={() => handleFilterSelect(null)}
                >
                  Alle Deals
                </DropdownMenuCheckboxItem>
                {dealStages.map(stage => (
                  <DropdownMenuCheckboxItem
                    key={stage}
                    checked={activeFilter === stage}
                    onCheckedChange={() => handleFilterSelect(stage)}
                  >
                    {stage}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ExportButton data={deals} fileName="deals.json">
              Exportieren
            </ExportButton>
            <Dialog
              open={isAddDealOpen}
              onOpenChange={setIsAddDealOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Neuer Deal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neuen Deal hinzufügen</DialogTitle>
                  <DialogDescription>Geben Sie die Details des Deals unten ein, um ihn zu Ihrer Pipeline hinzuzufügen.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Deal-Name</Label>
                    <Input
                      id="name"
                      value={newDeal.name}
                      onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
                      placeholder="Jahresservicevertrag"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="customer">Kunde</Label>
                    <CustomerCombobox
                      value={newDeal.customer_id}
                      onValueChange={(value) => {
                        setNewDeal({
                          ...newDeal,
                          customer_id: value,
                          customer: "" // Will be populated from the selected customer
                        })
                      }}
                      placeholder="Kunde auswählen..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="value_calculation_method">Wertberechnung</Label>
                    <Select
                      value={newDeal.value_calculation_method}
                      onValueChange={(value) => setNewDeal({
                        ...newDeal,
                        value_calculation_method: value as 'static' | 'dynamic'
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Berechnungsmethode auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">Statisch (manuell)</SelectItem>
                        <SelectItem value="dynamic">Dynamisch (aus Produkten)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="value">Wert (€){newDeal.value_calculation_method === 'dynamic' ? ' (wird automatisch berechnet)' : ''}</Label>
                    <Input
                      id="value"
                      value={newDeal.value}
                      onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                      placeholder="5000"
                      disabled={newDeal.value_calculation_method === 'dynamic'}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stage">Phase</Label>
                    <Select value={newDeal.stage} onValueChange={(value) => setNewDeal({ ...newDeal, stage: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Phase auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Interessent">Interessent</SelectItem>
                        <SelectItem value="Qualifiziert">Qualifiziert</SelectItem>
                        <SelectItem value="Angebot">Angebot</SelectItem>
                        <SelectItem value="Verhandlung">Verhandlung</SelectItem>
                        <SelectItem value="Gewonnen">Gewonnen</SelectItem>
                        <SelectItem value="Verloren">Verloren</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expectedCloseDate">Voraussichtliches Abschlussdatum</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newDeal.dateValue ? (
                            format(newDeal.dateValue, "PPP", { locale: de })
                          ) : (
                            <span>Datum auswählen</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newDeal.dateValue}
                          onSelect={(date) => {
                            // Handle date selection
                            setNewDeal({
                              ...newDeal,
                              dateValue: date,
                              expectedCloseDate: date ? format(date, "yyyy-MM-dd") : ""
                            })
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDealOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleAddDeal}>Deal hinzufügen</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Deal-Pipeline</CardTitle>
            <CardDescription>
              {isLoading
                ? "Deals werden geladen..."
                : `Sie haben ${allDeals.length} Deals in Ihrer Pipeline${activeFilter ? ` (gefiltert nach: ${activeFilter})` : ''}${isGrouped && selectedGrouping ? ` (gruppiert nach: ${dealGroupingFields.find(f => f.value === selectedGrouping)?.label || selectedGrouping})` : ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : viewMode === "table" ? (
              <>
                {isGrouped && selectedGrouping ? (
                  // Grouped view
                  <div className="mt-4">
                    <GroupedList
                      groups={groupItemsByField(allDeals, selectedGrouping, dealGroupingFields)}
                      renderItem={(deal) => (
                        <div className="border-b py-2 px-4 hover:bg-muted/50">
                          <div className="flex items-center justify-between">
                            <div>
                              <Link to="/deals/$dealId" params={{ dealId: deal.id.toString() }} className="font-medium hover:underline">
                                {deal.name}
                              </Link>
                              <div className="text-sm text-muted-foreground">
                                {deal.customer} • {formatCurrency(deal.value)}
                              </div>
                            </div>
                            <Badge
                              variant={
                                deal.stage === "Gewonnen"
                                  ? "default"
                                  : deal.stage === "Verloren"
                                    ? "destructive"
                                    : deal.stage === "Verhandlung"
                                      ? "secondary"
                                      : "outline"
                              }
                            >
                              {deal.stage}
                            </Badge>
                          </div>
                        </div>
                      )}
                      keyExtractor={(deal) => deal.id}
                      groupHeaderClassName="mb-2"
                      groupContentClassName="mb-4 space-y-1 pl-8"
                    />
                  </div>
                ) : (
                  // Regular table view
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal-Name</TableHead>
                        <TableHead>Kunde</TableHead>
                        <TableHead className="hidden md:table-cell">Wert</TableHead>
                        <TableHead className="hidden md:table-cell">
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help underline decoration-dotted">Berechnung</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[200px] text-xs">
                                <p><strong>Statisch:</strong> Manuell eingegebener Wert.</p>
                                <p><strong>Dynamisch:</strong> Wird automatisch aus verknüpften Produkten berechnet.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableHead>
                        <TableHead className="hidden md:table-cell">Erstellungsdatum</TableHead>
                        <TableHead className="hidden md:table-cell">Voraussichtlicher Abschluss</TableHead>
                        <TableHead>Phase</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allDeals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-16">
                            <div className="flex flex-col items-center justify-center gap-3 text-center">
                              <FileBox className="h-10 w-10 text-muted-foreground/40" />
                              <div>
                                <p className="font-medium">Keine Deals gefunden</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {activeFilter ? `Keine Deals in Phase "${activeFilter}".` : 'Erstellen Sie Ihren ersten Deal, um Ihre Pipeline zu starten.'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        deals.map((deal) => (
                          <TableRow key={deal.id}>
                            <TableCell className="font-medium">
                              <Link to="/deals/$dealId" params={{ dealId: deal.id.toString() }} className="hover:underline">
                                {deal.name}
                              </Link>
                            </TableCell>
                            <TableCell>{deal.customer}</TableCell>
                            <TableCell className="hidden md:table-cell">{formatCurrency(deal.value)}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {deal.value_calculation_method === 'dynamic' ? 'Dynamisch' : 'Statisch'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{formatDate(deal.createdDate)}</TableCell>
                            <TableCell className="hidden md:table-cell">{formatDate(deal.expectedCloseDate)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  deal.stage === "Gewonnen"
                                    ? "default"
                                    : deal.stage === "Verloren"
                                      ? "destructive"
                                      : deal.stage === "Verhandlung"
                                        ? "secondary"
                                        : "outline"
                                }
                              >
                                {deal.stage}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}

                {/* Pagination - show only when not grouped and there are multiple pages */}
                {!isGrouped && totalPages > 1 && (
                  <div className="mt-4 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <span className="flex h-10 items-center justify-center px-4">
                            Seite {page} von {totalPages}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                            className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {dealStages.map((stage) => (
                    <KanbanColumn
                      key={stage}
                      id={stage}
                      title={stage}
                      deals={groupedDeals[stage] || []}
                      onStageChange={handleKanbanStageChange}
                    />
                  ))}
                </div>
                <DragOverlay>
                  {activeDeal && <KanbanCard deal={activeDeal} />}
                </DragOverlay>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
