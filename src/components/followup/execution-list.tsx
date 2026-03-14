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
    return <FollowUpEmptyState queue={activeQueue} onSwitchQueue={onQueueSwitch} />
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="grid grid-cols-[32px_24px_1fr_1fr_1fr_100px_100px_80px] gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <span />
          <span />
          <span>Kunde</span>
          <span>Deal</span>
          <span>Grund</span>
          <span>Fällig</span>
          <span>Kontakt</span>
          <span />
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y">
        {items.map((item) => {
          const isSelected = selectedItem?.item_id === item.item_id && selectedItem?.source_type === item.source_type
          const isChecked = selectedItemIds.has(item.item_id)
          const isOverdue = item.due_date ? new Date(item.due_date) < new Date() : false

          return (
            <div
              key={`${item.source_type}-${item.item_id}`}
              className={cn(
                "grid grid-cols-[32px_24px_1fr_1fr_1fr_100px_100px_80px] gap-1 px-3 py-2 text-xs cursor-pointer transition-colors items-center",
                isSelected && "bg-accent",
                !isSelected && "hover:bg-accent/50",
                isOverdue && !isSelected && "bg-red-500/5"
              )}
              onClick={() => onItemSelect(item)}
            >
              {/* Checkbox */}
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => onItemToggleSelect(item.item_id)}
                  className="h-3.5 w-3.5"
                />
              </div>

              {/* Priority indicator */}
              <PriorityIndicator score={item.priority_score} dueDate={item.due_date} />

              {/* Customer */}
              <span className="truncate font-medium">{item.customer_name || '—'}</span>

              {/* Deal */}
              <span className="truncate">
                {item.deal_name || '—'}
                {item.deal_stage && (
                  <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">
                    {item.deal_stage}
                  </Badge>
                )}
              </span>

              {/* Reason */}
              <span className="truncate text-muted-foreground">{item.reason}</span>

              {/* Due date */}
              <span className={cn("tabular-nums", isOverdue && "text-red-500 font-medium")}>
                {formatDate(item.due_date)}
              </span>

              {/* Last contact */}
              <span className="text-muted-foreground tabular-nums">
                {formatDate(item.last_contact_date)}
              </span>

              {/* Actions */}
              <div className="flex gap-0.5 justify-end" onClick={(e) => e.stopPropagation()}>
                {item.source_type === 'task' && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onComplete(item)}
                      title="Erledigt"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                    <SnoozePopover onSnooze={(date) => onSnooze(item, date)}>
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Snooze">
                        <Clock className="h-3.5 w-3.5" />
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
