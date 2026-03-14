import { Search, CheckCircle2, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SnoozePopover } from "./snooze-popover"

interface ExecutionListToolbarProps {
  search: string
  onSearchChange: (search: string) => void
  priorityFilter: string
  onPriorityFilterChange: (priority: string) => void
  selectedCount: number
  onBulkComplete: () => void
  onBulkSnooze: (snoozedUntil: string) => void
}

export function ExecutionListToolbar({
  search,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  selectedCount,
  onBulkComplete,
  onBulkSnooze,
}: ExecutionListToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Suche..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue placeholder="Priorität" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle</SelectItem>
          <SelectItem value="High">Hoch</SelectItem>
          <SelectItem value="Medium">Mittel</SelectItem>
          <SelectItem value="Low">Niedrig</SelectItem>
        </SelectContent>
      </Select>

      {selectedCount > 0 && (
        <div className="flex items-center gap-1.5 ml-auto">
          <Badge variant="secondary" className="text-xs">
            {selectedCount} ausgewählt
          </Badge>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onBulkComplete}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Erledigen
          </Button>
          <SnoozePopover onSnooze={onBulkSnooze}>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Snooze
            </Button>
          </SnoozePopover>
        </div>
      )}
    </div>
  )
}
