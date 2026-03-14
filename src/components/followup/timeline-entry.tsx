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
  call: "text-blue-500",
  email: "text-violet-500",
  note: "text-amber-500",
  stage_change: "text-cyan-500",
  task_completed: "text-green-500",
  task_created: "text-muted-foreground",
  deal_created: "text-muted-foreground",
}

interface TimelineEntryProps {
  entry: ActivityLogEntry
}

export function TimelineEntry({ entry }: TimelineEntryProps) {
  const Icon = activityIcons[entry.activity_type] ?? StickyNote
  const colorClass = activityColors[entry.activity_type] ?? "text-muted-foreground"

  let date: string
  try {
    date = format(new Date(entry.created_at), "dd. MMM, HH:mm", { locale: de })
  } catch {
    date = entry.created_at
  }

  return (
    <div className="flex gap-3 py-2 px-3 text-xs">
      <div className="pt-0.5 shrink-0">
        <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{entry.title ?? entry.activity_type}</p>
        {entry.description && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2">{entry.description}</p>
        )}
      </div>
      <span className="text-muted-foreground shrink-0 whitespace-nowrap">{date}</span>
    </div>
  )
}
