import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Phone, Mail, StickyNote, ArrowRightLeft, CheckCircle2, PlusCircle, Handshake } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import type { ActivityLogEntry } from "@/services/data/types"

const activityIcons: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  note: StickyNote,
  stage_change: ArrowRightLeft,
  task_completed: CheckCircle2,
  task_created: PlusCircle,
  deal_created: Handshake,
}

const activityColors: Record<string, string> = {
  call: "text-info-foreground",
  email: "text-info-foreground",
  note: "text-warning-foreground",
  stage_change: "text-info-foreground",
  task_completed: "text-success-foreground",
  task_created: "text-muted-foreground",
  deal_created: "text-muted-foreground",
}

interface TimelineEntryProps {
  entry: ActivityLogEntry
}

export function TimelineEntry({ entry }: TimelineEntryProps) {
  const [expanded, setExpanded] = useState(false)
  const Icon = activityIcons[entry.activity_type] ?? StickyNote
  const colorClass = activityColors[entry.activity_type] ?? "text-muted-foreground"

  let date: string
  try {
    date = format(new Date(entry.created_at), "dd. MMM, HH:mm", { locale: de })
  } catch {
    date = entry.created_at
  }

  return (
    <div className="flex gap-3 py-2 px-3 text-sm">
      <div className="pt-0.5 shrink-0">
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${expanded ? "break-words" : "truncate"}`}>{entry.title ?? entry.activity_type}</p>
        {entry.description && (
          <p className={`text-muted-foreground mt-1 whitespace-pre-wrap break-words ${expanded ? "" : "line-clamp-2"}`}>{entry.description}</p>
        )}
        {(entry.description || (entry.title?.length ?? 0) > 60) && <Button variant="link" size="sm" className="px-0" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Weniger anzeigen" : "Mehr anzeigen"}</Button>}
      </div>
      <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">{date}</span>
    </div>
  )
}
