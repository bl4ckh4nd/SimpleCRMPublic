import { CalendarDays, AlertTriangle, CalendarRange, TrendingDown, DollarSign, Bookmark } from "lucide-react"
import { QueueItem } from "./queue-item"
import { Separator } from "@/components/ui/separator"
import type { QueueCounts, SavedView } from "@/services/data/types"

interface SmartQueueRailProps {
  activeQueue: string
  counts: QueueCounts
  savedViews: SavedView[]
  onQueueSelect: (queue: string) => void
}

const presetQueues = [
  { id: 'heute', label: 'Heute', icon: <CalendarDays className="h-4 w-4" />, urgency: 'neutral' as const, countKey: 'heute' as const },
  { id: 'ueberfaellig', label: 'Überfällig', icon: <AlertTriangle className="h-4 w-4" />, urgency: 'critical' as const, countKey: 'ueberfaellig' as const },
  { id: 'diese_woche', label: 'Diese Woche', icon: <CalendarRange className="h-4 w-4" />, urgency: 'neutral' as const, countKey: 'dieseWoche' as const },
  { id: 'stagnierende_deals', label: 'Stagnierende Deals', icon: <TrendingDown className="h-4 w-4" />, urgency: 'warning' as const, countKey: 'stagnierend' as const },
  { id: 'high_value_risk', label: 'High Value Risk', icon: <DollarSign className="h-4 w-4" />, urgency: 'warning' as const, countKey: 'highValueRisk' as const },
]

export function SmartQueueRail({ activeQueue, counts, savedViews, onQueueSelect }: SmartQueueRailProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Smart Queues
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-1.5 space-y-0.5">
        {presetQueues.map((q) => (
          <QueueItem
            key={q.id}
            label={q.label}
            count={counts[q.countKey]}
            active={activeQueue === q.id}
            icon={q.icon}
            urgency={q.urgency}
            onClick={() => onQueueSelect(q.id)}
          />
        ))}

        {savedViews.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="px-3 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gespeicherte Ansichten
              </h3>
            </div>
            {savedViews.map((view) => (
              <QueueItem
                key={`saved-${view.id}`}
                label={view.name}
                count={0}
                active={activeQueue === `saved_${view.id}`}
                icon={<Bookmark className="h-4 w-4" />}
                onClick={() => onQueueSelect(`saved_${view.id}`)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
