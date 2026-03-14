import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface QueueItemProps {
  label: string
  count: number
  active: boolean
  icon: React.ReactNode
  urgency?: 'critical' | 'warning' | 'neutral'
  onClick: () => void
}

export function QueueItem({ label, count, active, icon, urgency, onClick }: QueueItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "hover:bg-accent/50 text-muted-foreground"
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      <Badge
        variant={
          urgency === 'critical' && count > 0 ? "destructive"
          : urgency === 'warning' && count > 0 ? "default"
          : "secondary"
        }
        className="h-5 min-w-[1.25rem] px-1.5 text-xs tabular-nums"
      >
        {count}
      </Badge>
    </button>
  )
}
