import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { SmartQueueRail } from "@/components/followup/smart-queue-rail"
import { ExecutionList } from "@/components/followup/execution-list"
import { ExecutionListToolbar } from "@/components/followup/execution-list-toolbar"
import { InstantDetailPanel } from "@/components/followup/instant-detail-panel"
import { LogActivityDialog } from "@/components/followup/log-activity-dialog"
import { followUpService } from "@/services/data/followUpService"
import { taskService } from "@/services/data/taskService"
import type { FollowUpItem, ActivityLogEntry, QueueCounts, SavedView } from "@/services/data/types"

export default function FollowUpPage() {
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
  const [logDialogType, setLogDialogType] = useState<'call' | 'email' | 'note'>('note')

  // Load queue counts
  const loadCounts = useCallback(async () => {
    const counts = await followUpService.getQueueCounts()
    setQueueCounts(counts)
  }, [])

  // Load items for active queue
  const loadItems = useCallback(async () => {
    setLoading(true)
    const filters: { query?: string; priority?: string } = {}
    if (search.trim()) filters.query = search.trim()
    if (priorityFilter !== 'all') filters.priority = priorityFilter

    const data = await followUpService.getItems(activeQueue, filters)
    setItems(data)
    setLoading(false)
  }, [activeQueue, search, priorityFilter])

  // Load timeline for selected item
  const loadTimeline = useCallback(async (customerId: number, filter?: string) => {
    const entries = await followUpService.getTimeline(customerId, filter)
    setTimeline(entries)
  }, [])

  // Load saved views
  const loadSavedViews = useCallback(async () => {
    const views = await followUpService.getSavedViews()
    setSavedViews(views)
  }, [])

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
      deal_id: selectedItem.deal_id,
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
  const openLogDialog = useCallback((type: 'call' | 'email' | 'note') => {
    setLogDialogType(type)
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
          if (selectedItem) openLogDialog('note')
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem, items, handleComplete, handleSnooze, openLogDialog])

  return (
    <div className="flex flex-col px-6" style={{ height: 'calc(100vh - 104px)' }}>
      <ResizablePanelGroup direction="horizontal" defaultLayout={["220px", "1fr", "350px"]}>
        {/* Left Rail: Smart Queues */}
        <ResizablePanel minSize="180px" maxSize="300px">
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

        {/* Center: Execution List */}
        <ResizablePanel minSize="300px">
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
            <ExecutionList
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

        {/* Right: Instant Detail Panel */}
        <ResizablePanel minSize="250px" maxSize="500px">
          <div className="h-full border-l overflow-y-auto">
            <InstantDetailPanel
              item={selectedItem}
              timeline={timeline}
              onTimelineFilterChange={setTimelineFilter}
              onLogCall={() => openLogDialog('call')}
              onLogEmail={() => openLogDialog('email')}
              onCreateTask={() => openLogDialog('note')}
              onSnooze={(snoozedUntil) => {
                if (selectedItem) handleSnooze(selectedItem, snoozedUntil)
              }}
              onComplete={() => {
                if (selectedItem) handleComplete(selectedItem)
              }}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Log Activity Dialog */}
      <LogActivityDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        onSubmit={handleLogActivity}
      />
    </div>
  )
}
