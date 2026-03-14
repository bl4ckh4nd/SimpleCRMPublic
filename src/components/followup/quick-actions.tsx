import { Phone, Mail, PlusCircle, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SnoozePopover } from "./snooze-popover"

interface QuickActionsProps {
  onLogCall: () => void
  onLogEmail: () => void
  onCreateTask: () => void
  onSnooze: (snoozedUntil: string) => void
  onComplete: () => void
  sourceType: 'task' | 'deal'
}

export function QuickActions({
  onLogCall,
  onLogEmail,
  onCreateTask,
  onSnooze,
  onComplete,
  sourceType,
}: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t">
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onLogCall}>
        <Phone className="h-3 w-3 mr-1" />
        Anruf
      </Button>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onLogEmail}>
        <Mail className="h-3 w-3 mr-1" />
        Mail
      </Button>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCreateTask}>
        <PlusCircle className="h-3 w-3 mr-1" />
        Aufgabe
      </Button>
      {sourceType === 'task' && (
        <>
          <SnoozePopover onSnooze={onSnooze}>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Snooze
            </Button>
          </SnoozePopover>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onComplete}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Erledigt
          </Button>
        </>
      )}
    </div>
  )
}
