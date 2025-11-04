import { CalendarRBCEvent } from '@/types';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CalendarEventDetailsProps {
  event: CalendarRBCEvent;
  recurrenceText?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function CalendarEventDetails({ event, recurrenceText, onEdit, onDelete, onClose }: CalendarEventDetailsProps) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Ereignisdetails</DialogTitle>
        <DialogDescription>Details für "{event.title}"</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: event.color_code || '#3174ad' }} />
          <p className="font-medium">{event.title}</p>
        </div>
        <div className="grid gap-2">
          <p className="font-semibold">Zeitraum</p>
          <div className="pl-4 space-y-1 text-sm">
            <p>Von: {event.start.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</p>
            <p>Bis: {event.end.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</p>
            {event.allDay && <p>(Ganztägig)</p>}
          </div>
        </div>
        {event.event_type && (
          <p><strong>Typ:</strong> {event.event_type}</p>
        )}
        {event.description && (
          <div>
            <p className="font-semibold">Beschreibung</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground pl-4">{event.description}</p>
          </div>
        )}
        {recurrenceText && (
          <div>
            <p className="font-semibold">Wiederholung</p>
            <p className="pl-4 text-sm text-muted-foreground">{recurrenceText}</p>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Schließen
        </Button>
        <Button onClick={onEdit}>Bearbeiten</Button>
        <Button variant="destructive" onClick={onDelete}>
          Löschen
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
