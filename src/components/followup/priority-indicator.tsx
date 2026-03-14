import { cn } from "@/lib/utils"

interface PriorityIndicatorProps {
  score: number
  dueDate?: string
  className?: string
}

export function PriorityIndicator({ score, dueDate, className }: PriorityIndicatorProps) {
  const isOverdue = dueDate ? new Date(dueDate) < new Date() : false
  const isDueSoon = dueDate
    ? new Date(dueDate).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000 && !isOverdue
    : false

  const level = score >= 50 || isOverdue
    ? 'critical'
    : score >= 25 || isDueSoon
    ? 'warning'
    : 'neutral'

  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full shrink-0",
        level === 'critical' && "bg-red-500",
        level === 'warning' && "bg-amber-500",
        level === 'neutral' && "bg-muted-foreground/40",
        className
      )}
      title={
        level === 'critical' ? 'Überfällig / Kritisch'
        : level === 'warning' ? 'Bald fällig'
        : 'Geplant'
      }
    />
  )
}
