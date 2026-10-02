import { Alert, AlertDescription } from "@/components/ui/alert"
import { PageHeader } from "@/components/page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect, useCallback, useSyncExternalStore, useRef } from "react"
import { toast } from "sonner"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { SmartQueueRail, presetQueues } from "@/components/followup/smart-queue-rail"
import { ExecutionList } from "@/components/followup/execution-list"
import { ExecutionListToolbar } from "@/components/followup/execution-list-toolbar"
import { InstantDetailPanel } from "@/components/followup/instant-detail-panel"
import { LogActivityDialog } from "@/components/followup/log-activity-dialog"
import { followUpService } from "@/services/data/followUpService"
import { taskService } from "@/services/data/taskService"
import type { FollowUpItem, ActivityLogEntry, QueueCounts, SavedView } from "@/services/data/types"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Keyboard } from "lucide-react"

export default function FollowUpPage() {
  const narrow = useSyncExternalStore(
    (listener) => { const query = window.matchMedia("(max-width: 1023px)"); query.addEventListener("change", listener); return () => query.removeEventListener("change", listener) },
    () => window.matchMedia("(max-width: 1023px)").matches,
  )
  // State
  const [activeQueue, setActiveQueue] = useState('heute')
  const [queueCounts, setQueueCounts] = useState<QueueCounts>({ heute: 0, ueberfaellig: 0, dieseWoche: 0, stagnierend: 0, highValueRisk: 0 })
  const [items, setItems] = useState<FollowUpItem[]>([])
  const [selectedItem, setSelectedItem] = useState<FollowUpItem | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set())
  const [timeline, setTimeline] = useState<ActivityLogEntry[]>([])
  const [timelineFilter, setTimelineFilter] = useState<string | undefined>(undefined)
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [logDialogOpen, setLogDialogOpen] = useState(false)

  const mounted = useRef(true)
  const itemRead = useRef(0)
  const timelineRead = useRef(0)
  const [readErrors, setReadErrors] = useState<Record<string, string>>({})
  const [retrying, setRetrying] = useState(false)
  const setReadError = (key: string, message: string) => {
    if (mounted.current) setReadErrors(current => ({ ...current, [key]: message }))
  }
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; itemRead.current++; timelineRead.current++ }
  }, [])

  const loadCounts = useCallback(async () => {
    try {
      const counts = await followUpService.getQueueCounts()
      if (mounted.current) setQueueCounts(counts)
      setReadError('counts', '')
    } catch { setReadError('counts', 'Warteschlangenzähler konnten nicht geladen werden.') }
  }, [])

  const loadItems = useCallback(async () => {
    const generation = ++itemRead.current
    setLoading(true)
    const filters: { query?: string; priority?: string } = {}
    if (search.trim()) filters.query = search.trim()
    if (priorityFilter !== 'all') filters.priority = priorityFilter
    try {
      const data = await followUpService.getItems(activeQueue, filters)
      if (generation !== itemRead.current || !mounted.current) return
      setItems(data)
      setReadError('items', '')
    } catch {
      if (generation === itemRead.current) setReadError('items', 'Arbeitsliste konnte nicht geladen werden.')
    } finally {
      if (generation === itemRead.current && mounted.current) setLoading(false)
    }
  }, [activeQueue, search, priorityFilter])

  const loadTimeline = useCallback(async (customerId: number, filter?: string) => {
    const generation = ++timelineRead.current
    try {
      const entries = await followUpService.getTimeline(customerId, filter)
      if (generation !== timelineRead.current || !mounted.current) return
      setTimeline(entries)
      setReadError('timeline', '')
    } catch {
      if (generation === timelineRead.current) setReadError('timeline', 'Aktivitäten konnten nicht geladen werden.')
    }
  }, [])

  const loadSavedViews = useCallback(async () => {
    try {
      const views = await followUpService.getSavedViews()
      if (mounted.current) setSavedViews(views)
      setReadError('views', '')
    } catch { setReadError('views', 'Gespeicherte Ansichten konnten nicht geladen werden.') }
  }, [])

  const retryReads = async () => {
    setRetrying(true)
    try {
      await Promise.all([loadCounts(), loadItems(), loadSavedViews(), selectedItem?.customer_id ? loadTimeline(selectedItem.customer_id, timelineFilter) : Promise.resolve()])
    } finally { if (mounted.current) setRetrying(false) }
  }

  // Initial load
  useEffect(() => {
    loadCounts()
    loadSavedViews()
  }, [loadCounts, loadSavedViews])

  // Reload items when queue/filters change
  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Load timeline when selected item changes
  useEffect(() => {
    timelineRead.current++
    setTimeline([])
    setReadError("timeline", "")
    if (selectedItem?.customer_id) {
      loadTimeline(selectedItem.customer_id, timelineFilter)
    } else {
      setTimeline([])
    }
  }, [selectedItem?.customer_id, selectedItem?.item_id, timelineFilter, loadTimeline])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  // Queue selection
  const handleQueueSelect = useCallback((queue: string) => {
    setActiveQueue(queue)
    setSelectedItem(null)
    setSelectedItemIds(new Set())
  }, [])

  // Item selection
  const handleItemSelect = useCallback((item: FollowUpItem) => {
    setSelectedItem(item)
  }, [])

  // Item checkbox toggle
  const handleItemToggleSelect = useCallback((itemId: number) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  // Complete task
  const handleComplete = useCallback(async (item: FollowUpItem) => {
    if (item.source_type !== 'task') return

    // Optimistic removal
    setItems(prev => prev.filter(i => !(i.item_id === item.item_id && i.source_type === 'task')))
    if (selectedItem?.item_id === item.item_id) {
      setSelectedItem(null)
    }

    const result = await taskService.toggleTaskCompletion(item.item_id, true)
    if (result.success) {
      toast.success('Aufgabe erledigt')
      loadCounts()
    } else {
      toast.error('Fehler beim Erledigen der Aufgabe')
      loadItems() // Revert
    }
  }, [selectedItem, loadCounts, loadItems])

  // Snooze task
  const handleSnooze = useCallback(async (item: FollowUpItem, snoozedUntil: string) => {
    if (item.source_type !== 'task') return

    // Optimistic removal
    setItems(prev => prev.filter(i => !(i.item_id === item.item_id && i.source_type === 'task')))
    if (selectedItem?.item_id === item.item_id) {
      setSelectedItem(null)
    }

    const result = await followUpService.snoozeTask(item.item_id, snoozedUntil)
    if (result.success) {
      toast.success('Aufgabe verschoben')
      loadCounts()
    } else {
      toast.error('Fehler beim Verschieben')
      loadItems()
    }
  }, [selectedItem, loadCounts, loadItems])

  // Bulk complete
  const handleBulkComplete = useCallback(async () => {
    const taskIds = Array.from(selectedItemIds)
    const taskItems = items.filter(i => taskIds.includes(i.item_id) && i.source_type === 'task')

    // Optimistic removal
    setItems(prev => prev.filter(i => !selectedItemIds.has(i.item_id) || i.source_type !== 'task'))
    setSelectedItemIds(new Set())

    let successCount = 0
    for (const item of taskItems) {
      const result = await taskService.toggleTaskCompletion(item.item_id, true)
      if (result.success) successCount++
    }

    if (successCount > 0) {
      toast.success(`${successCount} Aufgabe${successCount > 1 ? 'n' : ''} erledigt`)
      loadCounts()
    }
    if (successCount < taskItems.length) {
      toast.error('Einige Aufgaben konnten nicht erledigt werden')
      loadItems()
    }
  }, [selectedItemIds, items, loadCounts, loadItems])

  // Bulk snooze
  const handleBulkSnooze = useCallback(async (snoozedUntil: string) => {
    const taskIds = Array.from(selectedItemIds)
    const taskItems = items.filter(i => taskIds.includes(i.item_id) && i.source_type === 'task')

    setItems(prev => prev.filter(i => !selectedItemIds.has(i.item_id) || i.source_type !== 'task'))
    setSelectedItemIds(new Set())

    let successCount = 0
    for (const item of taskItems) {
      const result = await followUpService.snoozeTask(item.item_id, snoozedUntil)
      if (result.success) successCount++
    }

    if (successCount > 0) {
      toast.success(`${successCount} Aufgabe${successCount > 1 ? 'n' : ''} verschoben`)
      loadCounts()
    }
  }, [selectedItemIds, items, loadCounts])

  // Log activity
  const handleLogActivity = useCallback(async (data: { activity_type: string; title: string; description: string }) => {
    if (!selectedItem) return

    const result = await followUpService.logActivity({
      customer_id: selectedItem.customer_id,
      deal_id: selectedItem.deal_id ?? undefined,
      task_id: selectedItem.source_type === 'task' ? selectedItem.item_id : undefined,
      ...data,
    })

    if (result.success) {
      toast.success('Aktivität protokolliert')
      // Refresh timeline
      if (selectedItem.customer_id) {
        loadTimeline(selectedItem.customer_id, timelineFilter)
      }
      loadCounts()
    } else {
      toast.error('Fehler beim Protokollieren')
    }
  }, [selectedItem, timelineFilter, loadTimeline, loadCounts])

  // Open log dialog with specific type
  const openLogDialog = useCallback(() => {
    setLogDialogOpen(true)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      const currentIndex = selectedItem
        ? items.findIndex(i => i.item_id === selectedItem.item_id && i.source_type === selectedItem.source_type)
        : -1

      switch (e.key) {
        case 'j': {
          e.preventDefault()
          const nextIndex = Math.min(currentIndex + 1, items.length - 1)
          if (items[nextIndex]) setSelectedItem(items[nextIndex])
          break
        }
        case 'k': {
          e.preventDefault()
          const prevIndex = Math.max(currentIndex - 1, 0)
          if (items[prevIndex]) setSelectedItem(items[prevIndex])
          break
        }
        case 'e': {
          e.preventDefault()
          if (selectedItem) handleComplete(selectedItem)
          break
        }
        case 's': {
          e.preventDefault()
          // Snooze to tomorrow as default keyboard shortcut
          if (selectedItem && selectedItem.source_type === 'task') {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(9, 0, 0, 0)
            handleSnooze(selectedItem, tomorrow.toISOString())
          }
          break
        }
        case 'n': {
          e.preventDefault()
          if (selectedItem) openLogDialog()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem, items, handleComplete, handleSnooze, openLogDialog])

  return (
    <div className={`flex min-w-0 flex-col px-4 py-4 sm:px-6 ${narrow ? "min-h-full" : "h-full min-h-0"}`}>
      <PageHeader title="Nachverfolgung" subtitle="Priorisierte Aufgaben und Deals, die Ihre Aufmerksamkeit benötigen" actions={<Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <Keyboard className="h-4 w-4" />
              Tastenkürzel
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <p className="text-sm font-semibold mb-3">Tastenkürzel</p>
            <div className="space-y-2 text-sm">
              {[
                { key: 'j', desc: 'Nächste Aufgabe' },
                { key: 'k', desc: 'Vorherige Aufgabe' },
                { key: 'e', desc: 'Als erledigt markieren' },
                { key: 's', desc: 'Auf morgen verschieben' },
                { key: 'n', desc: 'Notiz hinzufügen' },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{desc}</span>
                  <kbd className="px-2 py-0.5 rounded border bg-muted text-xs font-mono">{key}</kbd>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Kürzel funktionieren nur außerhalb von Eingabefeldern.</p>
          </PopoverContent>
        </Popover>} />
      {Object.values(readErrors).some(Boolean) && <Alert variant="destructive" className="mb-4"><AlertDescription>{Object.values(readErrors).filter(Boolean).join(" ")}<Button size="sm" variant="outline" disabled={loading || retrying} onClick={retryReads}>Erneut versuchen</Button></AlertDescription></Alert>}
      {narrow ? <div className="space-y-6">
        <Select value={activeQueue} onValueChange={handleQueueSelect}>
          <SelectTrigger aria-label="Priorisierte Ansicht"><SelectValue /></SelectTrigger>
          <SelectContent>{presetQueues.map(q => <SelectItem key={q.id} value={q.id}>{q.label} ({queueCounts[q.countKey]})</SelectItem>)}{savedViews.map(v => <SelectItem key={v.id} value={`saved_${v.id}`}>{v.name}</SelectItem>)}</SelectContent>
        </Select>
        <section aria-label="Arbeitsliste" className="min-w-0 rounded-lg border">            <ExecutionListToolbar
              search={search}
              onSearchChange={handleSearchChange}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              selectedCount={selectedItemIds.size}
              onBulkComplete={handleBulkComplete}
              onBulkSnooze={handleBulkSnooze}
            />
            <ExecutionList filtered={Boolean(search.trim()) || priorityFilter !== "all"} readError={Boolean(readErrors.items)}
              items={items}
              loading={loading}
              selectedItem={selectedItem}
              selectedItemIds={selectedItemIds}
              activeQueue={activeQueue}
              onItemSelect={handleItemSelect}
              onItemToggleSelect={handleItemToggleSelect}
              onComplete={handleComplete}
              onSnooze={handleSnooze}
              onQueueSwitch={handleQueueSelect}
            />
</section>
        <section aria-label="Ausgewählte Aufgabe" className="min-w-0 rounded-lg border">            <InstantDetailPanel
              item={selectedItem}
              timeline={timeline}
              onTimelineFilterChange={setTimelineFilter}
              onLogCall={openLogDialog}
              onLogEmail={openLogDialog}
              onAddNote={openLogDialog}
              onSnooze={(snoozedUntil) => {
                if (selectedItem) handleSnooze(selectedItem, snoozedUntil)
              }}
              onComplete={() => {
                if (selectedItem) handleComplete(selectedItem)
              }}
            />
</section>
      </div> : <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
        <ResizablePanel defaultSize="18%" minSize="160px" maxSize="260px">
          <div className="h-full border-r overflow-y-auto">
            <SmartQueueRail
              activeQueue={activeQueue}
              counts={queueCounts}
              savedViews={savedViews}
              onQueueSelect={handleQueueSelect}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="52%" minSize="420px">
          <div className="flex flex-col h-full">
            <ExecutionListToolbar
              search={search}
              onSearchChange={handleSearchChange}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              selectedCount={selectedItemIds.size}
              onBulkComplete={handleBulkComplete}
              onBulkSnooze={handleBulkSnooze}
            />
            <ExecutionList filtered={Boolean(search.trim()) || priorityFilter !== "all"} readError={Boolean(readErrors.items)}
              items={items}
              loading={loading}
              selectedItem={selectedItem}
              selectedItemIds={selectedItemIds}
              activeQueue={activeQueue}
              onItemSelect={handleItemSelect}
              onItemToggleSelect={handleItemToggleSelect}
              onComplete={handleComplete}
              onSnooze={handleSnooze}
              onQueueSwitch={handleQueueSelect}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="30%" minSize="260px">
          <div className="h-full border-l overflow-y-auto">
            <InstantDetailPanel
              item={selectedItem}
              timeline={timeline}
              onTimelineFilterChange={setTimelineFilter}
              onLogCall={openLogDialog}
              onLogEmail={openLogDialog}
              onAddNote={openLogDialog}
              onSnooze={(snoozedUntil) => {
                if (selectedItem) handleSnooze(selectedItem, snoozedUntil)
              }}
              onComplete={() => {
                if (selectedItem) handleComplete(selectedItem)
              }}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>}

      <LogActivityDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        onSubmit={handleLogActivity}
      />
    </div>
  )
}
