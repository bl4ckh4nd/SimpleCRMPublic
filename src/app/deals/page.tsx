"use client"

import { useState, useEffect, useCallback } from "react"
import { Link } from "@tanstack/react-router"
import { ChevronDown, Plus, Search, SlidersHorizontal, LayoutGrid, List, Calendar as CalendarIcon, Loader2 } from "lucide-react"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/components/ui/use-toast"
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination"

// Define the Deal type for better type safety
type Deal = {
  id: number;
  name: string;
  customer: string;
  value: string;
  createdDate: string;
  expectedCloseDate: string;
  stage: string;
}

// Define a type for API response of deals
interface DealFromApi {
  id: number;
  name: string;
  customer_id: number;
  customer_name: string; // Joined from customers table
  value: number;
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
    value: apiDeal.value.toString(),
    createdDate: apiDeal.created_date,
    expectedCloseDate: apiDeal.expected_close_date || "",
    stage: apiDeal.stage
  };
}

export default function DealsPage() {
  const { toast } = useToast()
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDealOpen, setIsAddDealOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table")
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [limit] = useState(10)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [newDeal, setNewDeal] = useState({
    name: "",
    customer: "",
    customer_id: "", // Will need to be populated from customer selection
    value: "",
    stage: "Interessent",
    expectedCloseDate: "", // Store the actual date string
    dateValue: undefined as Date | undefined // For the date picker UI component
  })

  // Fetch all customers for the dropdown
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)

  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      setIsLoadingCustomers(true)
      try {
        const customersData = await window.electronAPI.invoke('db:get-customers')
        setCustomers(Array.isArray(customersData) ? customersData as { id: number; name: string }[] : [])
      } catch (error) {
        console.error('Failed to load customers:', error)
        toast({
          title: "Fehler",
          description: "Kunden konnten nicht geladen werden",
          variant: "destructive"
        })
      } finally {
        setIsLoadingCustomers(false)
      }
    }
    loadCustomers()
  }, [toast])

  // Load deals with filtering and pagination
  const loadDeals = useCallback(async () => {
    setIsLoading(true)
    try {
      const filter: { stage?: string; query?: string } = {}
      
      // Apply stage filter if active
      if (activeFilter) {
        filter.stage = activeFilter
      }
      
      // Apply search query
      if (searchQuery.trim() !== '') {
        filter.query = searchQuery
      }
      
      const apiDeals = await window.electronAPI.invoke('deals:get-all', {
        limit,
        offset: (page - 1) * limit,
        filter
      })
      
      // Convert API deals to UI format
      const formattedDeals = Array.isArray(apiDeals) 
        ? apiDeals.map(formatDealForUI)
        : []
      
      setDeals(formattedDeals)
      
      // Calculate total pages based on results (this is an approximation)
      // In a real implementation, the backend would return a count
      setTotalPages(Math.max(1, Math.ceil(formattedDeals.length / limit)))
    } catch (error) {
      console.error('Failed to load deals:', error)
      toast({
        title: "Fehler",
        description: "Deals konnten nicht geladen werden",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter, limit, page, searchQuery, toast])

  // Load deals when component mounts and when dependencies change
  useEffect(() => {
    loadDeals()
  }, [loadDeals])

  // Setup dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Only start dragging after moving 8px to avoid accidental drags
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Group deals by stage for Kanban view
  const dealStages = ["Interessent", "Qualifiziert", "Angebot", "Verhandlung", "Gewonnen", "Verloren"]
  const groupedDeals = dealStages.reduce((acc, stage) => {
    acc[stage] = deals.filter(deal => deal.stage === stage)
    return acc
  }, {} as Record<string, Deal[]>)

  const handleAddDeal = async () => {
    if (!newDeal.name || !newDeal.customer_id || !newDeal.value) {
      toast({
        title: "Eingabefehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus",
        variant: "destructive"
      })
      return
    }

    try {
      const dealData = {
        name: newDeal.name,
        customer_id: parseInt(newDeal.customer_id),
        value: parseFloat(newDeal.value),
        stage: newDeal.stage,
        expected_close_date: newDeal.expectedCloseDate || null
      }

      const result = await window.electronAPI.invoke('deals:create', dealData) as { success: boolean; id?: number; error?: string }
      
      if (result.success && result.id) {
        toast({
          title: "Erfolg",
          description: "Deal erfolgreich hinzugefügt"
        })
        
        // Refresh the deals list
        await loadDeals()
        
        // Reset form and close dialog
        setNewDeal({
          name: "",
          customer: "",
          customer_id: "",
          value: "",
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
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Deal konnte nicht hinzugefügt werden",
        variant: "destructive"
      })
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const dealId = active.id as number;
    const deal = deals.find(d => d.id === dealId);
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
      setDeals(currentDeals => 
        currentDeals.map(deal => 
          deal.id === dealId ? { ...deal, stage: newStage } : deal
        )
      );
      
      // Persist the change to the database
      try {
        const result = await window.electronAPI.invoke('deals:update-stage', {
          dealId,
          newStage
        }) as { success: boolean; error?: string }
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update deal stage')
        }
        
        toast({
          title: "Deal aktualisiert",
          description: `Deal wurde auf "${newStage}" aktualisiert`
        })
      } catch (error) {
        console.error('Failed to update deal stage:', error)
        
        // Rollback the UI change if the API call fails
        await loadDeals()
        
        toast({
          title: "Fehler",
          description: "Deal-Status konnte nicht aktualisiert werden",
          variant: "destructive"
        })
      }
    }
    
    // Reset the active deal when dragging ends
    setActiveDeal(null);
  };

  // Handle search input with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    // Reset to page 1 when searching
    setPage(1)
  }

  // Handle filter selection
  const handleFilterSelect = (stage: string | null) => {
    setActiveFilter(stage)
    // Reset to page 1 when filtering
    setPage(1)
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto max-w-7xl py-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Deals</h1>
            <p className="text-muted-foreground">Verwalten Sie Ihre Deals</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Deals suchen..."
                className="pl-8 md:w-[300px]"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("table")}
                className="h-9 w-9"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "kanban" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("kanban")}
                className="h-9 w-9"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
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
            <Dialog open={isAddDealOpen} onOpenChange={setIsAddDealOpen}>
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
                    <Select 
                      value={newDeal.customer_id} 
                      onValueChange={(value) => {
                        const selectedCustomer = customers.find(c => c.id.toString() === value)
                        setNewDeal({ 
                          ...newDeal, 
                          customer_id: value,
                          customer: selectedCustomer?.name || ""
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kunden auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingCustomers ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : customers.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            Keine Kunden gefunden
                          </div>
                        ) : (
                          customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="value">Wert (€)</Label>
                    <Input
                      id="value"
                      value={newDeal.value}
                      onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                      placeholder="5000"
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
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Deal-Pipeline</CardTitle>
            <CardDescription>
              {isLoading 
                ? "Deals werden geladen..." 
                : `Sie haben ${deals.length} Deals in Ihrer Pipeline${activeFilter ? ` (gefiltert nach: ${activeFilter})` : ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : viewMode === "table" ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal-Name</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead className="hidden md:table-cell">Wert</TableHead>
                      <TableHead className="hidden md:table-cell">Erstellungsdatum</TableHead>
                      <TableHead className="hidden md:table-cell">Voraussichtlicher Abschluss</TableHead>
                      <TableHead>Phase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Keine Deals gefunden
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
                          <TableCell className="hidden md:table-cell">{deal.value} €</TableCell>
                          <TableCell className="hidden md:table-cell">{deal.createdDate}</TableCell>
                          <TableCell className="hidden md:table-cell">{deal.expectedCloseDate}</TableCell>
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
                </Table>                {(
                  <div className="mt-4 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <div 
                            onClick={() => page > 1 && setPage(prev => Math.max(1, prev - 1))}
                            className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          >
                            <PaginationPrevious />
                          </div>
                        </PaginationItem>
                        <PaginationItem>
                          <span className="flex h-10 items-center justify-center px-4">
                            Seite {page} von {totalPages || 1}
                          </span>
                        </PaginationItem>                        <PaginationItem>
                          <div 
                            onClick={() => page < (totalPages || 1) && setPage(prev => Math.min(totalPages || 1, prev + 1))}
                            className={page === (totalPages || 1) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          >
                            <PaginationNext />
                          </div>
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

