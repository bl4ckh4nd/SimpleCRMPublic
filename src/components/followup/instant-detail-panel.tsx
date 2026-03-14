import { User, Briefcase, BadgeDollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Timeline } from "./timeline"
import { QuickActions } from "./quick-actions"
import type { FollowUpItem, ActivityLogEntry } from "@/services/data/types"

interface InstantDetailPanelProps {
  item: FollowUpItem | null
  timeline: ActivityLogEntry[]
  onTimelineFilterChange: (filter: string | undefined) => void
  onLogCall: () => void
  onLogEmail: () => void
  onCreateTask: () => void
  onSnooze: (snoozedUntil: string) => void
  onComplete: () => void
}

export function InstantDetailPanel({
  item,
  timeline,
  onTimelineFilterChange,
  onLogCall,
  onLogEmail,
  onCreateTask,
  onSnooze,
  onComplete,
}: InstantDetailPanelProps) {
  if (!item) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Zeile auswählen um Details anzuzeigen
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Customer Info */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{item.customer_name || '—'}</span>
        </div>

        {item.deal_name && (
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{item.deal_name}</span>
            {item.deal_stage && (
              <Badge variant="outline" className="text-xs h-5">
                {item.deal_stage}
              </Badge>
            )}
          </div>
        )}

        {item.deal_value != null && item.deal_value > 0 && (
          <div className="flex items-center gap-2">
            <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {Number(item.deal_value).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{item.title}</span>
        </div>

        {item.reason && (
          <Badge
            variant={
              item.source_type === 'deal' ? "secondary"
              : item.priority === 'High' ? "destructive"
              : "outline"
            }
            className="text-xs"
          >
            {item.reason}
          </Badge>
        )}
      </div>

      <QuickActions
        onLogCall={onLogCall}
        onLogEmail={onLogEmail}
        onCreateTask={onCreateTask}
        onSnooze={onSnooze}
        onComplete={onComplete}
        sourceType={item.source_type}
      />

      <Separator />

      {/* Timeline */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Aktivitäten
          </h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <Timeline entries={timeline} onFilterChange={onTimelineFilterChange} />
        </div>
      </div>
    </div>
  )
}
