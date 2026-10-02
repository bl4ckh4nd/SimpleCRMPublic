import { CheckCircle2, Clock } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PriorityIndicator } from "./priority-indicator"
import { SnoozePopover } from "./snooze-popover"
import { FollowUpSkeleton } from "./followup-skeleton"
import { FollowUpEmptyState } from "./followup-empty-state"
import type { FollowUpItem } from "@/services/data/types"

interface ExecutionListProps {
  filtered?: boolean
  readError?: boolean
  items: FollowUpItem[]
  loading: boolean
  selectedItem: FollowUpItem | null
  selectedItemIds: Set<number>
  activeQueue: string
  onItemSelect: (item: FollowUpItem) => void
  onItemToggleSelect: (itemId: number) => void
  onComplete: (item: FollowUpItem) => void
  onSnooze: (item: FollowUpItem, snoozedUntil: string) => void
  onQueueSwitch: (queue: string) => void
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'dd.MM.yy', { locale: de })
  } catch {
    return dateStr
  }
}

export function ExecutionList({
  filtered = false, readError = false,
  items,
  loading,
  selectedItem,
  selectedItemIds,
  activeQueue,
  onItemSelect,
  onItemToggleSelect,
  onComplete,
  onSnooze,
  onQueueSwitch,
}: ExecutionListProps) {
  if (loading) {
    return <FollowUpSkeleton />
  }

  if (items.length === 0) {
    if (readError) return <p className="p-6 text-sm text-muted-foreground">Arbeitsliste nicht verfügbar.</p>
    if (filtered) return <div className="p-6 text-sm"><h3 className="font-medium">Keine passenden Einträge</h3><p className="mt-2 text-muted-foreground">Ändern Sie die Suche oder den Prioritätsfilter.</p></div>
    return <FollowUpEmptyState queue={activeQueue} onSwitchQueue={onQueueSwitch} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="grid grid-cols-[32px_24px_minmax(0,1fr)_78px_72px] gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <span />
          <span />
          <span>Kontext</span>
          <span>Fällig</span>
          <span />
        </div>
      </div>

      <div className="divide-y">
        {items.map((item) => {
          const isSelected = selectedItem?.item_id === item.item_id && selectedItem?.source_type === item.source_type
          const isChecked = selectedItemIds.has(item.item_id)
          const isOverdue = item.due_date ? new Date(item.due_date) < new Date() : false

          return (
            <div
              key={`${item.source_type}-${item.item_id}`}
              className={cn(
                "grid grid-cols-[32px_24px_minmax(0,1fr)_78px_72px] gap-2 px-3 py-2 text-sm transition-colors items-center",
                isSelected && "bg-accent",
                !isSelected && "hover:bg-accent/50",
                isOverdue && !isSelected && "bg-danger"
              )}

            >
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  aria-label={`Auswählen: ${item.title}`}
                  checked={isChecked}
                  onCheckedChange={() => onItemToggleSelect(item.item_id)}

                />
              </div>

              <PriorityIndicator score={item.priority_score} dueDate={item.due_date} />

              <div className="min-w-0">
                <button type="button" aria-pressed={isSelected} onClick={() => onItemSelect(item)} className="w-full min-w-0 text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium">{item.customer_name || '—'}</span>
                  {item.customer_company && item.customer_company !== item.customer_name && (
                    <span className="truncate text-muted-foreground">· {item.customer_company}</span>
                  )}
                  {item.deal_stage && <Badge variant="outline" className="h-4 shrink-0 px-1 text-xs">{item.deal_stage}</Badge>}
                </div>
                <p className="truncate text-muted-foreground">{[item.deal_name, item.reason].filter(Boolean).join(' · ') || 'Kein weiterer Kontext'}</p>
                </button>
              </div>

              <span className={cn("tabular-nums", isOverdue && "text-danger-foreground font-medium")}>
                {formatDate(item.due_date)}
              </span>

              <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                {item.source_type === 'task' && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"

                      onClick={() => onComplete(item)}
                      title="Erledigt"
                    >
                      <CheckCircle2  />
                    </Button>
                    <SnoozePopover onSnooze={(date) => onSnooze(item, date)}>
                      <Button variant="ghost" size="icon-sm"  title="Zurückstellen">
                        <Clock  />
                      </Button>
                    </SnoozePopover>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
