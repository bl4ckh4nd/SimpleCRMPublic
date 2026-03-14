import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TimelineEntry } from "./timeline-entry"
import type { ActivityLogEntry } from "@/services/data/types"

interface TimelineProps {
  entries: ActivityLogEntry[]
  onFilterChange?: (filter: string | undefined) => void
}

const filters = [
  { value: undefined, label: "Alle" },
  { value: "tasks", label: "Aufgaben" },
  { value: "deals", label: "Deals" },
  { value: "communication", label: "Kommunikation" },
] as const

export function Timeline({ entries, onFilterChange }: TimelineProps) {
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined)

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-3 py-2 border-b">
        {filters.map((f) => (
          <Button
            key={f.label}
            variant={activeFilter === f.value ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => { setActiveFilter(f.value); onFilterChange?.(f.value) }}
          >
            {f.label}
          </Button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Noch keine Aktivitäten
          </p>
        ) : (
          <div className="divide-y">
            {entries.map((entry) => (
              <TimelineEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
