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
import { useSearch } from "@tanstack/react-router";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarEvent, CalendarRBCEvent, RecurrenceRule, OnEventResizeArgs, OnEventDropArgs } from '@/types';
import { calendarService, TASK_EVENT_COMPLETED_COLOR, TASK_EVENT_DEFAULT_COLOR } from '@/services/data/calendarService';
import { taskService } from '@/services/data/taskService';
import { IPCChannels } from '@shared/ipc/channels';
import { CalendarEventDetails } from './components/event-details';
import { CalendarEventForm } from './components/event-form';
import type { EventFormData, EventFormSubmitPayload, TaskFormState } from './types';

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

const toTaskDueDateString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

const toEventFormData = (event: CalendarRBCEvent): EventFormData => ({
  id: event.id,
  title: event.title,
  start: new Date(event.start),
  end: new Date(event.end),
  allDay: event.allDay,
  description: event.description,
  color_code: event.color_code,
  event_type: event.event_type,
  recurrence_rule: event.recurrence_rule,
});

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

const darkenColor = (hex: string, percent: number): string => {
  try {
    const normalized = hex.replace(/^#/, "");
    const fullHex = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;

    let r = parseInt(fullHex.substring(0, 2), 16);
    let g = parseInt(fullHex.substring(2, 4), 16);
    let b = parseInt(fullHex.substring(4, 6), 16);

    const factor = 1 - percent / 100;
    r = Math.max(0, Math.min(255, Math.floor(r * factor)));
    g = Math.max(0, Math.min(255, Math.floor(g * factor)));
    b = Math.max(0, Math.min(255, Math.floor(b * factor)));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch (error) {
    console.error('Failed to darken color:', hex, error);
    return hex;
  }
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
  const [eventFormData, setEventFormData] = useState<EventFormData | null>(null);
  const [formTaskData, setFormTaskData] = useState<TaskFormState | null>(null);
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
  const { date: searchDate } = useSearch({ from: "/calendar" as const });

  useEffect(() => {
    if (!searchDate) return;

    const [yearString, monthString, dayString] = searchDate.split("-");
    const year = Number(yearString);
    const month = Number(monthString);
    const day = Number(dayString);

    if ([year, month, day].some((value) => Number.isNaN(value))) {
      return;
    }

    const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (Number.isNaN(targetDate.getTime())) {
      return;
    }

    setCurrentDate(targetDate);
    setCurrentView(Views.DAY);
  }, [searchDate]);

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
        return await window.electronAPI.invoke<typeof IPCChannels.Calendar.GetCalendarEvents>(
          IPCChannels.Calendar.GetCalendarEvents
        );
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

        const result = await window.electronAPI.invoke<typeof IPCChannels.Calendar.AddCalendarEvent>(
          IPCChannels.Calendar.AddCalendarEvent,
          sqliteCompatibleEvent
        );
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

        await window.electronAPI.invoke<typeof IPCChannels.Calendar.UpdateCalendarEvent>(
          IPCChannels.Calendar.UpdateCalendarEvent,
          sqliteCompatibleEvent
        );
      } catch (error) {
        console.error('Error updating calendar event:', error);
        throw error;
      }
    },
    deleteCalendarEvent: async (id) => {
      try {
        await window.electronAPI.invoke<typeof IPCChannels.Calendar.DeleteCalendarEvent>(
          IPCChannels.Calendar.DeleteCalendarEvent,
          id
        );
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
            recurrence_rule: parsedRule,
            task_id: event.task_id ?? null,
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

      const defaultEvent: EventFormData = {
        title: '',
        start: adjustedStart,
        end: adjustedEnd,
        allDay: isAllDay,
        description: '',
        color_code: '#3174ad'
      };
      setEventFormData(defaultEvent);
      setFormTaskData(null);
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
  }, [dbApi, calendarService, toast]);

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

  const handleAddEvent = useCallback(async ({ event: newEventData, task }: EventFormSubmitPayload) => {
    let createdTaskId: number | null = null;
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

      if (task && (!task.customer_id || task.customer_id <= 0)) {
        toast({ title: "Fehler", description: "Bitte wählen Sie einen Kunden für die Aufgabe aus.", variant: "destructive" });
        return;
      }

      const taskDueDate = toTaskDueDateString(newEventData.start);

      if (task) {
        const taskCreateResult = await taskService.createTask({
          customer_id: task.customer_id,
          title: newEventData.title,
          description: task.description ?? newEventData.description ?? '',
          due_date: taskDueDate,
          priority: task.priority,
          completed: task.completed ?? false,
          calendar_event_id: null,
        });

        if (!taskCreateResult.success || typeof taskCreateResult.id !== 'number') {
          throw new Error(taskCreateResult.error || 'Aufgabe konnte nicht erstellt werden.');
        }

        createdTaskId = taskCreateResult.id;
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
        recurrence_rule: newEventData.recurrence_rule ? JSON.stringify(newEventData.recurrence_rule) : null,
        task_id: createdTaskId,
      };

      console.log('Adding new calendar event to DB:', dbEvent);
      
      const data = await dbApi.addCalendarEvent(dbEvent);
      const insertedEventId = data.id || data.lastInsertRowid || Date.now();
      
      // Convert the returned data to RBC format
      const newEvent: CalendarRBCEvent = {
        id: insertedEventId,
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
        task_id: createdTaskId,
      };

      setEvents(prev => [...prev, newEvent]);

      if (createdTaskId) {
        try {
          await taskService.updateTask(createdTaskId, { calendar_event_id: Number(insertedEventId) }, { syncCalendar: false });
          await calendarService.updateTaskEvent(Number(insertedEventId), {
            title: newEventData.title,
            description: newEventData.description,
            dueDate: taskDueDate,
            customerName: task?.customer_name ?? undefined,
            completed: task?.completed ?? false,
            colorCode: newEventData.color_code,
          });
        } catch (linkError) {
          console.error('Failed to finalize task/calendar linkage:', linkError);
        }
      }

      toast({ title: "Erfolg", description: "Ereignis wurde erstellt" });
      setIsAddModalOpen(false);
      setEventFormData(null);
      setFormTaskData(null);
    } catch (error) {
      console.error('Error adding event:', error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast({
        title: "Fehler",
        description: `Ereignis konnte nicht erstellt werden: ${errorMessage}`,
        variant: "destructive",
      });

      if (createdTaskId) {
        try {
          await taskService.deleteTask(createdTaskId);
        } catch (cleanupError) {
          console.error('Failed to roll back task creation after calendar failure:', cleanupError);
        }
      }
    }
  }, [dbApi, toast]);

  const handleUpdateEvent = useCallback(async ({ event: updatedEventData, task }: EventFormSubmitPayload) => {
    if (!selectedEvent) return;

    let linkedTaskId = selectedEvent.task_id ?? null;
    let createdTaskId: number | null = null;

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

      if (task && (!task.customer_id || task.customer_id <= 0)) {
        toast({ title: "Fehler", description: "Bitte wählen Sie einen Kunden für die Aufgabe aus.", variant: "destructive" });
        return;
      }

      const numericEventId = typeof (updatedEventData.id ?? selectedEvent.id) === 'string'
        ? parseInt(String(updatedEventData.id ?? selectedEvent.id))
        : Number(updatedEventData.id ?? selectedEvent.id);

      const taskDueDate = toTaskDueDateString(updatedEventData.start);

      if (task) {
        if (task.id) {
          try {
            await taskService.updateTask(task.id, {
              title: updatedEventData.title,
              description: task.description ?? updatedEventData.description ?? '',
              due_date: taskDueDate,
              priority: task.priority,
              completed: task.completed ?? false,
            }, { syncCalendar: false });
          } catch (taskUpdateError) {
            throw new Error(taskUpdateError instanceof Error ? taskUpdateError.message : String(taskUpdateError));
          }
          linkedTaskId = task.id;
        } else {
          const taskCreateResult = await taskService.createTask({
            customer_id: task.customer_id,
            title: updatedEventData.title,
            description: task.description ?? updatedEventData.description ?? '',
            due_date: taskDueDate,
            priority: task.priority,
            completed: task.completed ?? false,
            calendar_event_id: null,
          });

          if (!taskCreateResult.success || typeof taskCreateResult.id !== 'number') {
            throw new Error(taskCreateResult.error || 'Aufgabe konnte nicht erstellt werden.');
          }

          linkedTaskId = taskCreateResult.id;
          createdTaskId = taskCreateResult.id;
        }
      } else if (selectedEvent.task_id) {
        try {
          await taskService.updateTask(selectedEvent.task_id, { calendar_event_id: null }, { syncCalendar: false });
        } catch (unlinkError) {
          console.error('Failed to unlink task from calendar event:', unlinkError);
        }
        linkedTaskId = null;
      }

      // Convert from RBC format to database format
      const dbEvent = {
        id: numericEventId,
        title: updatedEventData.title,
        description: updatedEventData.description || '',
        start_date: updatedEventData.start.toISOString(),
        end_date: updatedEventData.end.toISOString(),
        all_day: updatedEventData.allDay || false,
        color_code: updatedEventData.color_code || '#3174ad',
        event_type: updatedEventData.event_type || '',
        recurrence_rule: updatedEventData.recurrence_rule ? JSON.stringify(updatedEventData.recurrence_rule) : null,
        task_id: linkedTaskId,
        updated_at: new Date().toISOString()
      };

      console.log('Updating calendar event in DB:', dbEvent);
      
      await dbApi.updateCalendarEvent(dbEvent);

      setEvents(prev => prev.map(event =>
        event.id === selectedEvent.id ? {
          ...event,
          ...updatedEventData,
          id: event.id,
          task_id: linkedTaskId,
        } : event
      ));

      if (linkedTaskId) {
        try {
          await taskService.updateTask(linkedTaskId, { calendar_event_id: numericEventId }, { syncCalendar: false });
          await calendarService.updateTaskEvent(numericEventId, {
            title: updatedEventData.title,
            description: updatedEventData.description,
            dueDate: taskDueDate,
            customerName: task?.customer_name ?? undefined,
            completed: task?.completed ?? false,
            colorCode: updatedEventData.color_code,
          });
        } catch (linkError) {
          console.error('Failed to synchronize task after event update:', linkError);
        }
      }

      if (!task && selectedEvent.task_id) {
        toast({ title: "Hinweis", description: "Die Aufgabe bleibt bestehen, ist aber nicht mehr mit dem Termin verknüpft." });
      } else {
        toast({ title: "Erfolg", description: "Ereignis wurde aktualisiert" });
      }

      setIsEditModalOpen(false);
      setEventFormData(null);
      setFormTaskData(null);
    } catch (error) {
      console.error('Error updating event:', error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast({
        title: "Fehler",
        description: `Ereignis konnte nicht aktualisiert werden: ${errorMessage}`,
        variant: "destructive",
      });

      if (createdTaskId) {
        try {
          await taskService.deleteTask(createdTaskId);
        } catch (cleanupError) {
          console.error('Failed to clean up newly created task after event update failure:', cleanupError);
        }
      }
    }
  }, [calendarService, dbApi, selectedEvent, toast]);

  const handleDeleteEvent = useCallback(async (id: number | string) => {
    try {
      console.log('Deleting calendar event with ID:', id);
      const numericId = typeof id === 'string' ? parseInt(id) : id;

      const eventToDelete = events.find(event => String(event.id) === String(id));
      if (eventToDelete?.task_id) {
        try {
          await taskService.updateTask(eventToDelete.task_id, { calendar_event_id: null }, { syncCalendar: false });
        } catch (unlinkError) {
          console.error('Failed to unlink task before deleting event:', unlinkError);
        }
      }

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
  }, [dbApi, events, toast]);

  const handleEditEvent = useCallback(() => {
    if (!selectedEvent) return;

    setIsModalOpen(false);

    const eventData = toEventFormData(selectedEvent);
    setEventFormData(eventData);

    if (selectedEvent.task_id) {
      taskService.getTaskById(selectedEvent.task_id)
        .then((task) => {
          if (task) {
            setFormTaskData({
              id: Number(task.id),
              customer_id: Number(task.customer_id),
              customer_name: task.customer_name ?? null,
              priority: (task.priority as 'High' | 'Medium' | 'Low') ?? 'Medium',
              description: task.description ?? '',
              completed: Boolean(task.completed),
            });
          } else {
            setFormTaskData(null);
          }
        })
        .catch((error) => {
          console.error('Failed to load linked task for editing:', error);
          setFormTaskData(null);
        })
        .finally(() => {
          setIsEditModalOpen(true);
        });
    } else {
      setFormTaskData(null);
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
                  setEventFormData({
                    title: "",
                    start,
                    end,
                    allDay: false,
                    description: "",
                    color_code: "#3174ad",
                  });
                  setFormTaskData(null);
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
              eventPropGetter={(event: CalendarRBCEvent) => {
                const backgroundColor = event.color_code || TASK_EVENT_DEFAULT_COLOR;
                const isCompleted = backgroundColor.toLowerCase() === TASK_EVENT_COMPLETED_COLOR.toLowerCase();
                return {
                  className: 'cursor-pointer rbc-event',
                  style: {
                    backgroundColor,
                    borderColor: darkenColor(backgroundColor, isCompleted ? 5 : 15),
                    color: isCompleted ? '#1f2937' : '#ffffff',
                    opacity: isCompleted ? 0.7 : 0.9,
                    borderRadius: '4px',
                    borderWidth: '1px',
                    display: 'block',
                  }
                }
              }}
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
            <Dialog
              open={isModalOpen}
              onOpenChange={(isOpen) => {
                setIsModalOpen(isOpen);
                if (!isOpen) setSelectedEvent(null);
              }}
            >
              <CalendarEventDetails
                event={selectedEvent}
                recurrenceText={selectedEvent.recurrence_rule ? getRecurrenceText(selectedEvent.recurrence_rule) : undefined}
                onClose={() => {
                  setIsModalOpen(false);
                  setSelectedEvent(null);
                }}
                onEdit={handleEditEvent}
                onDelete={() => selectedEvent.id && handleDeleteEvent(selectedEvent.id)}
              />
            </Dialog>
          )}

          {isAddModalOpen && eventFormData && (
            <Dialog open={isAddModalOpen} onOpenChange={(isOpen) => {
              setIsAddModalOpen(isOpen);
              if (!isOpen) {
                setEventFormData(null);
                setFormTaskData(null);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neues Ereignis hinzufügen</DialogTitle>
                  <DialogDescription>
                    Füllen Sie die Details für das neue Ereignis aus.
                  </DialogDescription>
                </DialogHeader>
                <CalendarEventForm
                  key={`add-${eventFormData.start.getTime()}`}
                  initialData={eventFormData}
                  initialTaskData={formTaskData}
                  onSubmit={handleAddEvent}
                  onCancel={() => {
                    setIsAddModalOpen(false);
                    setEventFormData(null);
                    setFormTaskData(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}

          {isEditModalOpen && eventFormData && selectedEvent && (
            <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
              setIsEditModalOpen(isOpen);
              if (!isOpen) {
                setEventFormData(null);
                setFormTaskData(null);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ereignis bearbeiten</DialogTitle>
                  <DialogDescription>
                    Details für "{selectedEvent.title}" bearbeiten
                  </DialogDescription>
                </DialogHeader>
                <CalendarEventForm
                  key={`edit-${eventFormData.id ?? selectedEvent.id}`}
                  initialData={eventFormData}
                  initialTaskData={formTaskData}
                  onSubmit={handleUpdateEvent}
                  onCancel={() => {
                    setIsEditModalOpen(false);
                    setEventFormData(null);
                    setFormTaskData(null);
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
