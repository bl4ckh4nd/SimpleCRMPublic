import { CalendarDays, AlertTriangle, CalendarRange, TrendingDown, DollarSign, Bookmark } from "lucide-react"
import { QueueItem } from "./queue-item"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { QueueCounts, SavedView } from "@/services/data/types"

interface SmartQueueRailProps {
  activeQueue: string
  counts: QueueCounts
  savedViews: SavedView[]
  onQueueSelect: (queue: string) => void
}

const presetQueues = [
  { id: 'heute', label: 'Heute', icon: <CalendarDays className="h-4 w-4" />, urgency: 'neutral' as const, countKey: 'heute' as const, tooltip: 'Aufgaben und Deals, die heute fällig sind.' },
  { id: 'ueberfaellig', label: 'Überfällig', icon: <AlertTriangle className="h-4 w-4" />, urgency: 'critical' as const, countKey: 'ueberfaellig' as const, tooltip: 'Aufgaben mit abgelaufenem Fälligkeitsdatum, die noch offen sind.' },
  { id: 'diese_woche', label: 'Diese Woche', icon: <CalendarRange className="h-4 w-4" />, urgency: 'neutral' as const, countKey: 'dieseWoche' as const, tooltip: 'Aufgaben und Deals, die bis Ende dieser Woche fällig sind.' },
  { id: 'stagnierende_deals', label: 'Stagnierende Deals', icon: <TrendingDown className="h-4 w-4" />, urgency: 'warning' as const, countKey: 'stagnierend' as const, tooltip: 'Deals ohne Aktivität seit mehr als 14 Tagen.' },
  { id: 'high_value_risk', label: 'High Value Risk', icon: <DollarSign className="h-4 w-4" />, urgency: 'warning' as const, countKey: 'highValueRisk' as const, tooltip: 'Hochwertige Deals mit überfälliger oder fehlender Aktion.' },
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
        <TooltipProvider delayDuration={500}>
          {presetQueues.map((q) => (
            <Tooltip key={q.id}>
              <TooltipTrigger asChild>
                <span>
                  <QueueItem
                    label={q.label}
                    count={counts[q.countKey]}
                    active={activeQueue === q.id}
                    icon={q.icon}
                    urgency={q.urgency}
                    onClick={() => onQueueSelect(q.id)}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px] text-xs">
                {q.tooltip}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>

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
