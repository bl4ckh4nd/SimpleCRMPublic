"use client";

import * as React from "react";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, EventProps, View, SlotInfo } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import type { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS, de } from 'date-fns/locale';
import { MainNav } from "@/components/main-nav";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarEvent, CalendarRBCEvent, RecurrenceRule, OnEventResizeArgs, OnEventDropArgs } from '@/types';

// Initialize calendar
const locales = {
  'en-US': enUS,
  'de-DE': de,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// Create DnD calendar component
const DnDCalendar = withDragAndDrop(Calendar) as any;

// Constants for retry logic
const MAX_FETCH_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

// Database API
interface DatabaseAPI {
  getCalendarEvents: () => Promise<CalendarEvent[]>;
  addCalendarEvent: (event: any) => Promise<any>; // Using 'any' to accommodate both CalendarEvent and CalendarRBCEvent formats
  updateCalendarEvent: (event: any) => Promise<void>; // Using 'any' to accommodate both formats
  deleteCalendarEvent: (id: number) => Promise<void>;
}

// Using DragDropInfo imported from @/types

const getRecurrenceText = (rule: RecurrenceRule | string | null | undefined): string => {
  // If rule is null or undefined, return empty string
  if (!rule) return '';
  
  // If rule is a string, try to parse it
  if (typeof rule === 'string') {
    try {
      rule = JSON.parse(rule) as RecurrenceRule;
    } catch (e) {
      console.error('Error parsing recurrence rule:', e);
      return 'Ungültiges Wiederholungsmuster';
    }
  }

  const frequencyMap = {
    daily: 'Täglich',
    weekly: 'Wöchentlich',
    monthly: 'Monatlich',
    yearly: 'Jährlich',
    custom: 'Benutzerdefiniert'
  };

  let text = `${frequencyMap[rule.frequency]}`;
  if (rule.interval > 1) {
    text += ` (alle ${rule.interval} `;
    switch (rule.frequency) {
      case 'daily': text += 'Tage'; break;
      case 'weekly': text += 'Wochen'; break;
      case 'monthly': text += 'Monate'; break;
      case 'yearly': text += 'Jahre'; break;
    }
    text += ')';
  }

  if (rule.endDate) {
    text += ` bis ${new Date(rule.endDate).toLocaleDateString()}`;
  } else if (rule.occurrences) {
    text += `, ${rule.occurrences} mal`;
  }

  return text;
};

const CustomEvent: React.FC<EventProps<CalendarRBCEvent>> = ({ event }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="rbc-event-content" title={event.title}>
            {event.title}
            {event.description && <span className="block text-xs opacity-75">{event.description}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{event.title}</p>
          {event.description && <p>{event.description}</p>}
          <p className="text-xs text-muted-foreground">
            {format(new Date(event.start), 'Pp')} - {format(new Date(event.end), 'Pp')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Using OnEventResizeArgs and OnEventDropArgs imported from @/types

export default function CalendarPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarRBCEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchRetryCount = useRef(0);
  const [selectedEvent, setSelectedEvent] = useState<CalendarRBCEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newEventInfo, setNewEventInfo] = useState<Omit<CalendarRBCEvent, 'id'> | null>(null);
  const [currentView, setCurrentView] = useState<View>(Views.MONTH); // Initialize with a default view

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedView = localStorage.getItem('calendar_view');
        // Basic validation: check if savedView is a valid View
        if (savedView && (Object.values(Views) as string[]).includes(savedView)) {
          setCurrentView(savedView as View);
        }
      } catch (error) {
        console.error('CalendarPage: Failed to access localStorage to get calendar view.', error);
        // Fallback to default view is implicitly handled by initial useState value
      }
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    if (typeof window !== 'undefined' && currentView) {
      try {
        localStorage.setItem('calendar_view', currentView);
      } catch (error) {
        console.error('CalendarPage: Failed to access localStorage to set calendar view.', error);
      }
    }
  }, [currentView]);

  const [currentDate, setCurrentDate] = useState(new Date());

  // Using the DatabaseAPI interface defined above

  // Helper functions for database operations
  const dbApi: DatabaseAPI = useMemo(() => ({
    getCalendarEvents: async () => {
      try {
        // Add check for electronAPI existence
        if (!window.electronAPI?.invoke) {
          console.error("Electron API is not available.");
          // Decide how to handle this: throw error, return empty array, etc.
          // Throwing an error might be appropriate if the API is essential.
          throw new Error("Electron API not found. Cannot fetch calendar events.");
        }
        return await window.electronAPI.invoke('db:getCalendarEvents');
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        toast({
          title: "Fehler",
          description: "Kalenderereignisse konnten nicht geladen werden.",
          variant: "destructive",
        });
        return [];
      }
    },
    addCalendarEvent: async (event) => {
      try {
        // Debug the event data we're sending to SQLite
        console.log('Calendar event data being sent to SQLite:', JSON.stringify(event, null, 2));

        // Convert date objects to ISO strings to avoid SQLite binding issues
        const sqliteCompatibleEvent: Record<string, any> = {
          title: event.title,
          description: event.description || '',
          // Ensure start and end are Dates before calling toISOString()
          start_date: event.start instanceof Date ? event.start.toISOString() : event.start,
          end_date: event.end instanceof Date ? event.end.toISOString() : event.end,
          all_day: event.allDay || false,
          color_code: event.color_code || '#3174ad',
          event_type: event.event_type || '',
          recurrence_rule: null
        };

        // Only stringify the recurrence_rule if it exists and isn't null
        if (event.recurrence_rule && typeof event.recurrence_rule !== 'string') {
          sqliteCompatibleEvent.recurrence_rule = JSON.stringify(event.recurrence_rule);
        } else if (typeof event.recurrence_rule === 'string' && event.recurrence_rule !== '') {
          // If it's already a string, use it directly
          sqliteCompatibleEvent.recurrence_rule = event.recurrence_rule;
        } else {
          sqliteCompatibleEvent.recurrence_rule = null;
        }

        console.log('Converted SQLite-compatible event:', JSON.stringify(sqliteCompatibleEvent, null, 2));

        const result = await window.electronAPI.invoke('db:addCalendarEvent', sqliteCompatibleEvent);
        return result;
      } catch (error) {
        console.error('Error adding calendar event:', error);
        throw error;
      }
    },
    updateCalendarEvent: async (event) => {
      try {
        console.log('Updating calendar event:', JSON.stringify(event, null, 2));

        // Convert date objects to ISO strings
        const sqliteCompatibleEvent: Record<string, any> = {
          id: event.id,
          title: event.title,
          description: event.description || '',
          // Ensure start_date and end_date are strings (ISOs)
          start_date: typeof event.start_date === 'string' ? event.start_date : new Date(event.start_date).toISOString(),
          end_date: typeof event.end_date === 'string' ? event.end_date : new Date(event.end_date).toISOString(),
          all_day: event.all_day || false,
          color_code: event.color_code || '#3174ad',
          event_type: event.event_type || '',
          recurrence_rule: null
        };

        // Only stringify the recurrence_rule if it exists and isn't null
        if (event.recurrence_rule && typeof event.recurrence_rule !== 'string') {
          sqliteCompatibleEvent.recurrence_rule = JSON.stringify(event.recurrence_rule);
        } else if (typeof event.recurrence_rule === 'string' && event.recurrence_rule !== '') {
          // If it's already a string, use it directly
          sqliteCompatibleEvent.recurrence_rule = event.recurrence_rule;
        } else {
          sqliteCompatibleEvent.recurrence_rule = null;
        }

        console.log('Converted SQLite-compatible event for update:', JSON.stringify(sqliteCompatibleEvent, null, 2));

        await window.electronAPI.invoke('db:updateCalendarEvent', sqliteCompatibleEvent);
      } catch (error) {
        console.error('Error updating calendar event:', error);
        throw error;
      }
    },
    deleteCalendarEvent: async (id) => {
      try {
        await window.electronAPI.invoke('db:deleteCalendarEvent', id);
      } catch (error) {
        console.error('Error deleting calendar event:', error);
        throw error;
      }
    }
  }), [toast]); // Add toast to dependency array if used inside useMemo

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const fetchEvents = async () => {
      if (fetchRetryCount.current >= MAX_FETCH_RETRIES) {
        setFetchError("Maximale Anzahl von Ladeversuchen erreicht.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);

      try {
        const dbEvents = await dbApi.getCalendarEvents();
        const rbcEvents = dbEvents.map((event: CalendarEvent) => {
          let parsedRule = event.recurrence_rule;
          if (typeof event.recurrence_rule === 'string' && event.recurrence_rule !== null && event.recurrence_rule !== '') {
            try {
              parsedRule = JSON.parse(event.recurrence_rule);
            } catch (e) {
              console.error('Error parsing recurrence rule for event:', event.id, e);
              parsedRule = null;
            }
          }
          
          return {
            ...event,
            id: event.id,
            start: new Date(event.start_date),
            end: new Date(event.end_date),
            allDay: event.all_day,
            recurrence_rule: parsedRule
          };
        });
        setEvents(rbcEvents);
        fetchRetryCount.current = 0; // Reset retry count on success
      } catch (error) {
        console.error('Error fetching events:', error);
        setFetchError("Fehler beim Laden der Ereignisse.");
        fetchRetryCount.current += 1;
        timeoutId = setTimeout(fetchEvents, RETRY_DELAY_MS);
      } finally {
        setLoading(false);
      }
    };

    fetchRetryCount.current = 0;
    fetchEvents();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [dbApi]);

  const handleSelectEvent = useCallback((event: CalendarRBCEvent) => {
    // Ensure dates are properly converted
    let parsedRule = event.recurrence_rule;
    if (typeof event.recurrence_rule === 'string' && event.recurrence_rule !== null && event.recurrence_rule !== '') {
      try {
        parsedRule = JSON.parse(event.recurrence_rule);
      } catch (e) {
        console.error('Error parsing recurrence rule for selected event:', event.id, e);
        parsedRule = null;
      }
    }
    
    const eventWithDates = {
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
      recurrence_rule: parsedRule
    };
    setSelectedEvent(eventWithDates);
    setIsModalOpen(true);
  }, []);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    const { start, end, action, slots } = slotInfo;

    if (action === 'select' || action === 'click') {
      let isAllDay = false;
      let adjustedStart = start;
      let adjustedEnd = end;

      const durationMillis = end.getTime() - start.getTime();
      const dayInMillis = 24 * 60 * 60 * 1000;

      if (currentView === Views.MONTH && durationMillis >= dayInMillis) {
        isAllDay = true;
        adjustedStart = new Date(start);
        adjustedStart.setHours(0, 0, 0, 0);
        adjustedEnd = new Date(end);
        adjustedEnd.setHours(0, 0, 0, 0);
        if (end.getHours() === 0 && end.getMinutes() === 0 && durationMillis < dayInMillis) {
          adjustedEnd.setDate(adjustedEnd.getDate() + 1);
        }
      } else if (action === 'click' && currentView !== Views.MONTH) {
        adjustedEnd = new Date(start.getTime() + 60 * 60 * 1000);
      } else if (action === 'select' && slots && slots.length > 0) {
        const firstSlot = slots[0];
        const lastSlot = slots[slots.length - 1];
        if (start.getHours() === 0 && start.getMinutes() === 0 && durationMillis >= dayInMillis) {
          isAllDay = true;
          adjustedEnd = new Date(start);
          adjustedEnd.setHours(0, 0, 0, 0);
          adjustedEnd.setDate(start.getDate() + Math.ceil(durationMillis / dayInMillis));
        }
      } else if (action === 'click' && currentView === Views.MONTH) {
        isAllDay = true;
        adjustedStart = new Date(start);
        adjustedStart.setHours(0, 0, 0, 0);
        adjustedEnd = new Date(start);
        adjustedEnd.setDate(start.getDate() + 1);
        adjustedEnd.setHours(0, 0, 0, 0);
      }

      const defaultEvent: Omit<CalendarRBCEvent, 'id'> = {
        title: '',
        start: adjustedStart,
        end: adjustedEnd,
        allDay: isAllDay,
        description: '',
        color_code: '#3174ad'
      };
      setNewEventInfo(defaultEvent);
      setIsAddModalOpen(true);
    }
  }, [currentView]);

  const handleMoveEvent = useCallback(async (
    event: CalendarRBCEvent,
    start: Date,
    end: Date,
    isResize: boolean = false
  ) => {
    try {
      const durationMillis = end.getTime() - start.getTime();
      const dayInMillis = 24 * 60 * 60 * 1000;
      let isAllDay = start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0 &&
        end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0 &&
        durationMillis >= dayInMillis;

      if (!isResize && event.allDay) {
        isAllDay = true;
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        if (durationMillis < dayInMillis) {
          end.setDate(start.getDate() + 1);
        }
      }

      const updatedEvent: CalendarRBCEvent = {
        ...event,
        start,
        end,
        allDay: isAllDay
      };
      
      // Convert to database format
      const dbEvent = {
        id: typeof updatedEvent.id === 'string' ? parseInt(updatedEvent.id) : updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description || '',
        start_date: updatedEvent.start.toISOString(),
        end_date: updatedEvent.end.toISOString(),
        all_day: updatedEvent.allDay || false,
        color_code: updatedEvent.color_code || '#3174ad',
        event_type: updatedEvent.event_type || '',
        recurrence_rule: updatedEvent.recurrence_rule ? JSON.stringify(updatedEvent.recurrence_rule) : null,
        updated_at: new Date().toISOString()
      };
      
      console.log('Updating event after drag/resize:', dbEvent);
      
      await dbApi.updateCalendarEvent(dbEvent);

      setEvents(prev => prev.map(e =>
        e.id === event.id
          ? updatedEvent
          : e
      ));

      toast({
        title: "Ereignis aktualisiert",
        description: isResize
          ? "Dauer wurde angepasst"
          : "Termin wurde verschoben",
      });
    } catch (error) {
      console.error('Error updating event:', error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast({
        title: "Fehler",
        description: `Ereignis konnte nicht aktualisiert werden: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [dbApi, toast]);

  const handleEventResize = useCallback(
    ({ event, start, end, isAllDay }: OnEventResizeArgs) => {
      console.log("Event Resized:", event, start, end, isAllDay);
      const newStart = typeof start === 'string' ? new Date(start) : start;
      const newEnd = typeof end === 'string' ? new Date(end) : end;

      handleMoveEvent(event, newStart, newEnd, true);
    },
    [handleMoveEvent]
  );

  const handleEventDrop = useCallback(
    ({ event, start, end, isAllDay }: OnEventDropArgs) => {
      console.log("Event Dropped:", event, start, end, isAllDay);
      const newStart = typeof start === 'string' ? new Date(start) : start;
      const newEnd = typeof end === 'string' ? new Date(end) : end;

      handleMoveEvent(event, newStart, newEnd, false);
    },
    [handleMoveEvent]
  );

  const handleAddEvent = useCallback(async (newEventData: Omit<CalendarRBCEvent, 'id'>) => {
    try {
      if (!newEventData.title || !newEventData.start || !newEventData.end) {
        toast({ title: "Fehler", description: "Titel, Start und Ende sind erforderlich.", variant: "destructive" });
        return;
      }
      if (newEventData.start >= newEventData.end) {
        if (!newEventData.allDay || newEventData.end.getTime() !== newEventData.start.getTime()) {
          toast({ title: "Fehler", description: "Das Enddatum muss nach dem Startdatum liegen.", variant: "destructive" });
          return;
        }
      }

      // Convert from React Big Calendar event format to database format
      const dbEvent = {
        title: newEventData.title,
        description: newEventData.description,
        start_date: newEventData.start.toISOString(),
        end_date: newEventData.end.toISOString(),
        all_day: newEventData.allDay || false,
        color_code: newEventData.color_code,
        event_type: newEventData.event_type,
        recurrence_rule: newEventData.recurrence_rule ? JSON.stringify(newEventData.recurrence_rule) : null
      };

      console.log('Adding new calendar event to DB:', dbEvent);
      
      const data = await dbApi.addCalendarEvent(dbEvent);
      
      // Convert the returned data to RBC format
      const newEvent: CalendarRBCEvent = {
        id: data.id || data.lastInsertRowid || Date.now(),
        title: newEventData.title,
        start: newEventData.start,
        end: newEventData.end,
        allDay: newEventData.allDay,
        description: newEventData.description,
        color_code: newEventData.color_code,
        event_type: newEventData.event_type,
        recurrence_rule: newEventData.recurrence_rule,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setEvents(prev => [...prev, newEvent]);
      toast({ title: "Erfolg", description: "Ereignis wurde erstellt" });
      setIsAddModalOpen(false);
      setNewEventInfo(null);
    } catch (error) {
      console.error('Error adding event:', error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast({
        title: "Fehler",
        description: `Ereignis konnte nicht erstellt werden: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [dbApi, toast]);

  const handleUpdateEvent = useCallback(async (updatedEventData: CalendarRBCEvent) => {
    try {
      if (!updatedEventData.title || !updatedEventData.start || !updatedEventData.end) {
        toast({ title: "Fehler", description: "Titel, Start und Ende sind erforderlich.", variant: "destructive" });
        return;
      }
      if (updatedEventData.start >= updatedEventData.end) {
        if (!updatedEventData.allDay || updatedEventData.end.getTime() !== updatedEventData.start.getTime()) {
          toast({ title: "Fehler", description: "Das Enddatum muss nach dem Startdatum liegen.", variant: "destructive" });
          return;
        }
      }

      // Convert from RBC format to database format
      const dbEvent = {
        id: typeof updatedEventData.id === 'string' ? parseInt(updatedEventData.id) : updatedEventData.id,
        title: updatedEventData.title,
        description: updatedEventData.description || '',
        start_date: updatedEventData.start.toISOString(),
        end_date: updatedEventData.end.toISOString(),
        all_day: updatedEventData.allDay || false,
        color_code: updatedEventData.color_code || '#3174ad',
        event_type: updatedEventData.event_type || '',
        recurrence_rule: updatedEventData.recurrence_rule ? JSON.stringify(updatedEventData.recurrence_rule) : null,
        updated_at: new Date().toISOString()
      };

      console.log('Updating calendar event in DB:', dbEvent);
      
      await dbApi.updateCalendarEvent(dbEvent);

      setEvents(prev => prev.map(event =>
        event.id === updatedEventData.id ? updatedEventData : event
      ));

      toast({ title: "Erfolg", description: "Ereignis wurde aktualisiert" });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating event:', error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast({
        title: "Fehler",
        description: `Ereignis konnte nicht aktualisiert werden: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [dbApi, toast]);

  const handleDeleteEvent = useCallback(async (id: number | string) => {
    try {
      console.log('Deleting calendar event with ID:', id);
      const numericId = typeof id === 'string' ? parseInt(id) : id;
      await dbApi.deleteCalendarEvent(numericId);
      
      console.log('Event successfully deleted');
      setEvents(prev => prev.filter(event => event.id !== id));
      toast({ title: "Erfolg", description: "Ereignis wurde gelöscht" });
      setIsModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast({
        title: "Fehler",
        description: `Ereignis konnte nicht gelöscht werden: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [dbApi, toast]);

  const handleEditEvent = useCallback(() => {
    if (selectedEvent) {
      setNewEventInfo(selectedEvent);
      setIsModalOpen(false);
      setIsEditModalOpen(true);
    }
  }, [selectedEvent]);

  if (loading && fetchRetryCount.current === 0) {
    return (
      <div className="flex min-h-screen flex-col">

        <main className="flex flex-1 items-center justify-center">
          <p>Lade Kalender...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="container mx-auto max-w-7xl py-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Terminplaner</h1>
              <p className="text-muted-foreground">
                {currentView === Views.MONTH && "Monatsansicht"}
                {currentView === Views.WEEK && "Wochenansicht"}
                {currentView === Views.DAY && "Tagesansicht"}
                {currentView === Views.AGENDA && "Agenda"}
                {" - "}
                {currentDate.toLocaleDateString('de-DE', {
                  year: 'numeric',
                  month: currentView === Views.MONTH || currentView === Views.AGENDA ? 'long' : '2-digit',
                  day: currentView !== Views.MONTH ? '2-digit' : undefined,
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Heute
              </Button>
              <Button
                onClick={() => {
                  const now = new Date();
                  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
                  const end = new Date(start.getTime() + 60 * 60 * 1000);
                  setNewEventInfo({
                    title: "",
                    start: start,
                    end: end,
                    allDay: false,
                    description: "",
                    color_code: "#3174ad",
                  });
                  setIsAddModalOpen(true);
                }}
              >
                Ereignis hinzufügen
              </Button>
            </div>
          </div>

          {fetchError && !loading && (
            <Alert variant="destructive" className="mb-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Ladefehler</AlertTitle>
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}

          <section className="h-[75vh] w-full">
            <DnDCalendar<CalendarRBCEvent>
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              allDayAccessor="allDay"
              style={{ height: '100%', width: '100%' }}
              views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
              components={{
                event: CustomEvent,
              }}
              view={currentView}
              date={currentDate}
              onView={(newView: View) => setCurrentView(newView)}
              onNavigate={(newDate: Date) => {
                setCurrentDate(newDate);
              }}
              selectable
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              popup
              defaultView={Views.MONTH}
              step={30}
              timeslots={2}
              eventPropGetter={(event: CalendarRBCEvent) => ({
                className: 'cursor-pointer rbc-event',
                style: {
                  backgroundColor: event.color_code || '#3174ad',
                  borderColor: event.color_code ? darkenColor(event.color_code, 15) : '#255e8d',
                  color: '#ffffff',
                  opacity: 0.9,
                  borderRadius: '4px',
                  borderWidth: '1px',
                  display: 'block',
                }
              })}
              dayPropGetter={(date: Date) => ({
                className: `rbc-day ${date.getDay() === 0 || date.getDay() === 6 ? 'rbc-weekend' : ''}`,
              })}
              onEventDrop={handleEventDrop as any}
              onEventResize={handleEventResize as any}
              messages={{
                next: "Weiter",
                previous: "Zurück",
                today: "Heute",
                month: "Monat",
                week: "Woche",
                day: "Tag",
                agenda: "Agenda",
                date: "Datum",
                time: "Zeit",
                event: "Ereignis",
                allDay: "Ganztägig",
                noEventsInRange: "Keine Termine in diesem Zeitraum.",
                showMore: (total: number) => `+${total} weitere`,
              }}
              culture='de-DE'
              tooltipAccessor={(event: CalendarRBCEvent) => event.title + (event.description ? `\n${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}` : '')}
              resizable
              draggableAccessor={() => true}
            />
          </section>

          {selectedEvent && (
            <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
              setIsModalOpen(isOpen);
              if (!isOpen) setSelectedEvent(null);
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ereignisdetails</DialogTitle>
                  <DialogDescription>
                    Details für "{selectedEvent.title}"
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: selectedEvent.color_code || '#3174ad' }}
                    />
                    <p className="font-medium">{selectedEvent.title}</p>
                  </div>
                  <div className="grid gap-2">
                    <p><strong>Zeitraum:</strong></p>
                    <div className="pl-4 space-y-1">
                      <p>Von: {selectedEvent.start.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</p>
                      <p>Bis: {selectedEvent.end.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</p>
                      {selectedEvent.allDay && <p>(Ganztägig)</p>}
                    </div>
                  </div>
                  {selectedEvent.event_type && (
                    <p><strong>Typ:</strong> {selectedEvent.event_type}</p>
                  )}
                  {selectedEvent.description && (
                    <div>
                      <p><strong>Beschreibung:</strong></p>
                      <p className="pl-4 whitespace-pre-wrap">{selectedEvent.description}</p>
                    </div>
                  )}
                  {selectedEvent.recurrence_rule && (
                    <div>
                      <p><strong>Wiederholung:</strong></p>
                      <p className="pl-4">{getRecurrenceText(selectedEvent.recurrence_rule)}</p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsModalOpen(false); setSelectedEvent(null); }}>Schließen</Button>
                  <Button
                    variant="default"
                    onClick={handleEditEvent}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => selectedEvent.id && handleDeleteEvent(selectedEvent.id)}
                  >
                    Löschen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {newEventInfo && (
            <Dialog open={isAddModalOpen} onOpenChange={(isOpen) => {
              setIsAddModalOpen(isOpen);
              if (!isOpen) setNewEventInfo(null);
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neues Ereignis hinzufügen</DialogTitle>
                  <DialogDescription>
                    Füllen Sie die Details für das neue Ereignis aus.
                  </DialogDescription>
                </DialogHeader>
                <EventForm
                  initialData={newEventInfo}
                  onSubmit={handleAddEvent}
                  onCancel={() => {
                    setIsAddModalOpen(false);
                    setNewEventInfo(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}

          {selectedEvent && newEventInfo && (
            <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
              setIsEditModalOpen(isOpen);
              if (!isOpen) {
                setNewEventInfo(null);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ereignis bearbeiten</DialogTitle>
                  <DialogDescription>
                    Details für "{selectedEvent.title}" bearbeiten
                  </DialogDescription>
                </DialogHeader>
                <EventForm
                  initialData={newEventInfo}
                  onSubmit={(eventData) => {
                    if (selectedEvent) {
                      handleUpdateEvent({
                        ...eventData,
                        id: selectedEvent.id
                      });
                    }
                  }}
                  onCancel={() => {
                    setIsEditModalOpen(false);
                    setNewEventInfo(null);
                  }}
                  isEditMode={true}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </main>
    </div>
  );
}

interface EventFormProps {
  initialData: Omit<CalendarRBCEvent, 'id'>;
  onSubmit: (data: Omit<CalendarRBCEvent, 'id'>) => void;
  onCancel: () => void;
  isEditMode?: boolean;
}

function EventForm({ initialData, onSubmit, onCancel, isEditMode = false }: EventFormProps) {
  const [title, setTitle] = useState(initialData.title);
  const [start, setStart] = useState(initialData.start);
  const [end, setEnd] = useState(initialData.end);
  const [description, setDescription] = useState(initialData.description || '');
  const [allDay, setAllDay] = useState(initialData.allDay || false);
  const [color, setColor] = useState(initialData.color_code || '#3174ad');
  const [eventType, setEventType] = useState(initialData.event_type || '');
  const [showRecurrence, setShowRecurrence] = useState(!!initialData.recurrence_rule);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceRule['frequency']>(
    (initialData.recurrence_rule && typeof initialData.recurrence_rule !== 'string' ? initialData.recurrence_rule.frequency : null) || 'daily'
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    (initialData.recurrence_rule && typeof initialData.recurrence_rule !== 'string' ? initialData.recurrence_rule.interval : null) || 1
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    (initialData.recurrence_rule && typeof initialData.recurrence_rule !== 'string' ? initialData.recurrence_rule.endDate : null) || ''
  );
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(
    (initialData.recurrence_rule && typeof initialData.recurrence_rule !== 'string' ? initialData.recurrence_rule.occurrences : null) || 0
  );
  const [recurrenceEndType, setRecurrenceEndType] = useState(
    initialData.recurrence_rule && typeof initialData.recurrence_rule !== 'string' ? 
      (initialData.recurrence_rule.endDate ? 'date' : (initialData.recurrence_rule.occurrences ? 'occurrences' : 'never')) 
      : 'never'
  );
  
  const { toast } = useToast();

  const formatDateTimeLocal = (date: Date | null): string => {
    if (!date) return '';
    try {
      const adjustedDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      return adjustedDate.toISOString().slice(0, 16);
    } catch (e) {
      console.error("Error formatting date:", date, e);
      return '';
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    try {
      return format(date, "yyyy-MM-dd");
    } catch (e) {
      console.error("Error formatting date:", date, e);
      return '';
    }
  };

  const parseInputDate = (value: string, isAllDay: boolean): Date | null => {
    try {
      if (!value) return null;
      if (isAllDay) {
        // For all-day events, parse as YYYY-MM-DD and treat as local date
        const [year, month, day] = value.split('-').map(Number);
        // Important: Create date in local time, not UTC, to avoid timezone shifts
        return new Date(year, month - 1, day);
      } else {
        // For timed events, parse as ISO 8601 local time
        return new Date(value);
      }
    } catch (e) {
      console.error("Error parsing date string:", value, e);
      return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalStart = start;
    let finalEnd = end;

    if (!title) {
      toast({ title: "Fehler", description: "Titel ist erforderlich.", variant: "destructive" });
      return;
    }
    if (!finalStart || !finalEnd) {
      toast({ title: "Fehler", description: "Start- und Enddatum sind erforderlich.", variant: "destructive" });
      return;
    }

    if (allDay) {
      finalStart.setHours(0, 0, 0, 0);
      finalEnd = new Date(finalEnd);
      finalEnd.setHours(0, 0, 0, 0);
      if (finalEnd <= finalStart) {
        finalEnd = new Date(finalStart);
        finalEnd.setDate(finalStart.getDate() + 1);
      }
    } else if (finalStart >= finalEnd) {
      toast({ title: "Fehler", description: "Das Enddatum muss nach dem Startdatum liegen.", variant: "destructive" });
      return;
    }

    let recurrenceRule: RecurrenceRule | undefined = undefined;
    
    if (showRecurrence) {
      recurrenceRule = {
        frequency: recurrenceFrequency,
        interval: recurrenceInterval
      };
      
      if (recurrenceEndType === 'date' && recurrenceEndDate) {
        recurrenceRule.endDate = recurrenceEndDate;
      } else if (recurrenceEndType === 'occurrences' && recurrenceOccurrences > 0) {
        recurrenceRule.occurrences = recurrenceOccurrences;
      }
    }

    onSubmit({
      title,
      start: finalStart,
      end: finalEnd,
      description,
      allDay,
      color_code: color,
      event_type: eventType,
      recurrence_rule: recurrenceRule
    });
  };

  useEffect(() => {
    if (!allDay && start && end && start >= end) {
      const newEnd = new Date(start.getTime() + 60 * 60 * 1000);
      setEnd(newEnd);
    }
  }, [start, end, allDay]);

  const handleAllDayChange = (checked: boolean) => {
    setAllDay(checked);
    const currentStartDate = start || new Date();

    if (checked) {
      const startOfDay = new Date(currentStartDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(startOfDay.getDate() + 1);
      setStart(startOfDay);
      setEnd(endOfDay);
    } else {
      const defaultStart = new Date(currentStartDate);
      if (defaultStart.getHours() === 0 && defaultStart.getMinutes() === 0) {
        defaultStart.setHours(9, 0, 0, 0);
      }
      const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);
      setStart(defaultStart);
      setEnd(defaultEnd);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="title" className="text-right">Titel*</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" required />
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="eventType" className="text-right">Ereignistyp</Label>
          <Input 
            id="eventType" 
            value={eventType} 
            onChange={(e) => setEventType(e.target.value)} 
            className="col-span-3" 
            placeholder="z.B. Meeting, Termin, Urlaub..."
          />
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="allDay" className="text-right">Ganztägig</Label>
          <input
            id="allDay"
            type="checkbox"
            checked={allDay}
            onChange={(e) => handleAllDayChange(e.target.checked)}
            className="col-span-3 justify-self-start h-4 w-4 accent-primary"
          />
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="start" className="text-right">Start*</Label>
          <Input
            id="start"
            type={allDay ? "date" : "datetime-local"}
            value={allDay ? formatDate(start) : formatDateTimeLocal(start)}
            onChange={(e) => setStart(parseInputDate(e.target.value, allDay) || start)}
            className="col-span-3"
            required
          />
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="end" className="text-right">Ende*</Label>
          <Input
            id="end"
            type={allDay ? "date" : "datetime-local"}
            value={allDay ? formatDate(end) : formatDateTimeLocal(end)}
            onChange={(e) => setEnd(parseInputDate(e.target.value, allDay) || end)}
            className="col-span-3"
            required
            min={allDay ? formatDate(start) : formatDateTimeLocal(start)}
          />
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="color" className="text-right">Farbe</Label>
          <Input 
            id="color" 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
            className="col-span-3 p-1 h-10 w-14 border rounded-md" 
          />
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">Beschreibung</Label>
          <Textarea 
            id="description" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            className="col-span-3" 
          />
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="showRecurrence" className="text-right">Wiederholung</Label>
          <input
            id="showRecurrence"
            type="checkbox"
            checked={showRecurrence}
            onChange={(e) => setShowRecurrence(e.target.checked)}
            className="col-span-3 justify-self-start h-4 w-4 accent-primary"
          />
        </div>
        
        {showRecurrence && (
          <>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recurrenceFrequency" className="text-right">Frequenz</Label>
              <select
                id="recurrenceFrequency"
                value={recurrenceFrequency}
                onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceRule['frequency'])}
                className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
                <option value="monthly">Monatlich</option>
                <option value="yearly">Jährlich</option>
              </select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recurrenceInterval" className="text-right">Intervall</Label>
              <div className="col-span-3 flex items-center gap-2">
                <span>Alle</span>
                <Input
                  id="recurrenceInterval"
                  type="number"
                  min={1}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <span>
                  {recurrenceFrequency === 'daily' && 'Tage'}
                  {recurrenceFrequency === 'weekly' && 'Wochen'}
                  {recurrenceFrequency === 'monthly' && 'Monate'}
                  {recurrenceFrequency === 'yearly' && 'Jahre'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recurrenceEndType" className="text-right">Endet</Label>
              <select
                id="recurrenceEndType"
                value={recurrenceEndType}
                onChange={(e) => setRecurrenceEndType(e.target.value as 'never' | 'date' | 'occurrences')}
                className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="never">Niemals</option>
                <option value="date">Am Datum</option>
                <option value="occurrences">Nach Anzahl</option>
              </select>
            </div>
            
            {recurrenceEndType === 'date' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="recurrenceEndDate" className="text-right">Enddatum</Label>
                <Input
                  id="recurrenceEndDate"
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  className="col-span-3"
                  min={formatDate(start)}
                />
              </div>
            )}
            
            {recurrenceEndType === 'occurrences' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="recurrenceOccurrences" className="text-right">Wiederholungen</Label>
                <Input
                  id="recurrenceOccurrences"
                  type="number"
                  min={1}
                  value={recurrenceOccurrences}
                  onChange={(e) => setRecurrenceOccurrences(parseInt(e.target.value) || 0)}
                  className="col-span-3"
                />
              </div>
            )}
          </>
        )}
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit">
          {isEditMode ? 'Aktualisieren' : 'Speichern'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function darkenColor(hex: string, percent: number): string {
  try {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }

    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    const factor = 1 - percent / 100;
    r = Math.max(0, Math.min(255, Math.floor(r * factor)));
    g = Math.max(0, Math.min(255, Math.floor(g * factor)));
    b = Math.max(0, Math.min(255, Math.floor(b * factor)));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch (e) {
    console.error("Error darkening color:", hex, e);
    return hex;
  }
}
