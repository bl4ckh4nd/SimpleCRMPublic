import { Clock, Moon, Sun, CalendarDays } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

interface SnoozePopoverProps {
  onSnooze: (snoozedUntil: string) => void
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function getSnoozeDate(option: string): string {
  const now = new Date()
  switch (option) {
    case 'tonight': {
      const tonight = new Date(now)
      tonight.setHours(18, 0, 0, 0)
      if (tonight <= now) tonight.setDate(tonight.getDate() + 1)
      return tonight.toISOString()
    }
    case 'tomorrow': {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)
      return tomorrow.toISOString()
    }
    case 'next_week': {
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + (8 - nextWeek.getDay()) % 7 || 7)
      nextWeek.setHours(9, 0, 0, 0)
      return nextWeek.toISOString()
    }
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  }
}

export function SnoozePopover({ onSnooze, children, open, onOpenChange }: SnoozePopoverProps) {
  const handleSnooze = (option: string) => {
    onSnooze(getSnoozeDate(option))
    onOpenChange?.(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        <div className="flex flex-col">
          <Button variant="ghost" size="sm" className="justify-start text-xs h-8" onClick={() => handleSnooze('tonight')}>
            <Moon className="h-3.5 w-3.5 mr-2" />
            Heute Abend
          </Button>
          <Button variant="ghost" size="sm" className="justify-start text-xs h-8" onClick={() => handleSnooze('tomorrow')}>
            <Sun className="h-3.5 w-3.5 mr-2" />
            Morgen
          </Button>
          <Button variant="ghost" size="sm" className="justify-start text-xs h-8" onClick={() => handleSnooze('next_week')}>
            <CalendarDays className="h-3.5 w-3.5 mr-2" />
            Nächste Woche
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
