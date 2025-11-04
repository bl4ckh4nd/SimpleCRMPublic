"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CustomerCombobox, type CustomerOption } from "@/components/customer-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { TASK_EVENT_DEFAULT_COLOR } from "@/services/data/calendarService";
import type { RecurrenceRule } from "@/types";
import type { EventFormData, EventFormSubmitPayload, TaskFormState } from "../types";

interface CalendarEventFormProps {
  initialData: EventFormData;
  initialTaskData?: TaskFormState | null;
  onSubmit: (payload: EventFormSubmitPayload) => void;
  onCancel: () => void;
  isEditMode?: boolean;
}

const recurrenceFrequencyOptions: Array<{ value: RecurrenceRule["frequency"]; label: string }> = [
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "monthly", label: "Monatlich" },
  { value: "yearly", label: "Jährlich" },
];

const eventColorPalette = ["#3174ad", "#0ea5e9", "#22c55e", "#f97316", "#f43f5e", "#6366f1", "#14b8a6"];

const formatDateTimeLocal = (date: Date | null): string => {
  if (!date) return "";
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 16);
};

const formatDateOnly = (date: Date | null): string => {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
};

const parseInputDate = (value: string, isAllDay: boolean): Date | null => {
  if (!value) return null;
  if (isAllDay) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

const normalizeRecurrenceRule = (
  recurrence_rule: RecurrenceRule | string | null | undefined
): RecurrenceRule | undefined => {
  if (!recurrence_rule) return undefined;
  if (typeof recurrence_rule === "string") {
    try {
      return JSON.parse(recurrence_rule) as RecurrenceRule;
    } catch (error) {
      console.error("Failed to parse recurrence rule:", error);
      return undefined;
    }
  }
  return recurrence_rule;
};

export function CalendarEventForm({
  initialData,
  initialTaskData = null,
  onSubmit,
  onCancel,
  isEditMode = false,
}: CalendarEventFormProps) {
  const { toast } = useToast();

  const [title, setTitle] = useState(initialData.title);
  const [start, setStart] = useState(initialData.start);
  const [end, setEnd] = useState(initialData.end);
  const [description, setDescription] = useState(initialData.description || "");
  const [allDay, setAllDay] = useState(initialData.allDay ?? false);
  const [color, setColor] = useState(initialData.color_code || TASK_EVENT_DEFAULT_COLOR);
  const [eventType, setEventType] = useState(initialData.event_type || "");

  const normalizedRule = useMemo(() => normalizeRecurrenceRule(initialData.recurrence_rule), [initialData.recurrence_rule]);
  const [showRecurrence, setShowRecurrence] = useState(Boolean(normalizedRule));
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceRule["frequency"]>(normalizedRule?.frequency ?? "daily");
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(normalizedRule?.interval ?? 1);
  const [recurrenceEndType, setRecurrenceEndType] = useState<"never" | "date" | "occurrences">(
    normalizedRule?.endDate ? "date" : normalizedRule?.occurrences ? "occurrences" : "never"
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>(normalizedRule?.endDate ?? "");
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState<number>(normalizedRule?.occurrences ?? 0);

  const [linkTask, setLinkTask] = useState(Boolean(initialTaskData));
  const [taskCustomerId, setTaskCustomerId] = useState<number>(initialTaskData?.customer_id ?? 0);
  const [taskCustomerName, setTaskCustomerName] = useState<string | null>(initialTaskData?.customer_name ?? null);
  const [taskPriority, setTaskPriority] = useState<"High" | "Medium" | "Low">(initialTaskData?.priority ?? "Medium");
  const [taskCompleted, setTaskCompleted] = useState<boolean>(initialTaskData?.completed ?? false);

  useEffect(() => {
    if (!allDay && start && end && start >= end) {
      const nextHour = new Date(start.getTime() + 60 * 60 * 1000);
      setEnd(nextHour);
    }
  }, [start, end, allDay]);

  const handleAllDayChange = (checked: boolean) => {
    setAllDay(checked);
    const current = start || new Date();

    if (checked) {
      const startOfDay = new Date(current);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(startOfDay.getDate() + 1);
      setStart(startOfDay);
      setEnd(endOfDay);
    } else {
      const defaultStart = new Date(current);
      if (defaultStart.getHours() === 0 && defaultStart.getMinutes() === 0) {
        defaultStart.setHours(9, 0, 0, 0);
      }
      const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);
      setStart(defaultStart);
      setEnd(defaultEnd);
    }
  };

  const handleLinkTaskChange = (checked: boolean) => {
    setLinkTask(checked);
    if (!checked) {
      setTaskCompleted(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!title) {
      toast({ title: "Fehler", description: "Titel ist erforderlich.", variant: "destructive" });
      return;
    }

    if (!start || !end) {
      toast({ title: "Fehler", description: "Start- und Enddatum sind erforderlich.", variant: "destructive" });
      return;
    }

    if (!allDay && start >= end) {
      toast({ title: "Fehler", description: "Das Enddatum muss nach dem Startdatum liegen.", variant: "destructive" });
      return;
    }

    if (linkTask && (!taskCustomerId || taskCustomerId <= 0)) {
      toast({ title: "Fehler", description: "Bitte wählen Sie einen Kunden für die Aufgabe aus.", variant: "destructive" });
      return;
    }

    let finalStart = start;
    let finalEnd = end;

    if (allDay) {
      finalStart = new Date(start);
      finalStart.setHours(0, 0, 0, 0);
      finalEnd = new Date(end);
      finalEnd.setHours(0, 0, 0, 0);
      if (finalEnd <= finalStart) {
        finalEnd = new Date(finalStart);
        finalEnd.setDate(finalStart.getDate() + 1);
      }
    }

    let recurrenceRule: RecurrenceRule | undefined;
    if (showRecurrence) {
      recurrenceRule = {
        frequency: recurrenceFrequency,
        interval: recurrenceInterval,
      };

      if (recurrenceEndType === "date" && recurrenceEndDate) {
        recurrenceRule.endDate = recurrenceEndDate;
      } else if (recurrenceEndType === "occurrences" && recurrenceOccurrences > 0) {
        recurrenceRule.occurrences = recurrenceOccurrences;
      }
    }

    onSubmit({
      event: {
        id: initialData.id,
        title,
        start: finalStart,
        end: finalEnd,
        allDay,
        description,
        color_code: color,
        event_type: eventType,
        recurrence_rule: recurrenceRule,
      },
      task: linkTask
        ? {
            id: initialTaskData?.id ?? null,
            customer_id: taskCustomerId,
            customer_name: taskCustomerName,
            description,
            priority: taskPriority,
            completed: taskCompleted,
          }
        : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right" htmlFor="title">
            Titel*
          </Label>
          <Input id="title" className="col-span-3" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right" htmlFor="eventType">
            Ereignistyp
          </Label>
          <Input
            id="eventType"
            className="col-span-3"
            value={eventType}
            placeholder="z.B. Meeting, Termin, Urlaub..."
            onChange={(event) => setEventType(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right" htmlFor="allDay">
            Ganztägig
          </Label>
          <div className="col-span-3 flex items-center gap-2">
            <Switch id="allDay" checked={allDay} onCheckedChange={handleAllDayChange} />
            <span className="text-sm text-muted-foreground">Ganztägiges Ereignis ohne Uhrzeit</span>
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right" htmlFor="start">
            Start*
          </Label>
          <Input
            id="start"
            type={allDay ? "date" : "datetime-local"}
            className="col-span-3"
            value={allDay ? formatDateOnly(start) : formatDateTimeLocal(start)}
            onChange={(event) => setStart(parseInputDate(event.target.value, allDay) || start)}
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right" htmlFor="end">
            Ende*
          </Label>
          <Input
            id="end"
            type={allDay ? "date" : "datetime-local"}
            className="col-span-3"
            value={allDay ? formatDateOnly(end) : formatDateTimeLocal(end)}
            min={allDay ? formatDateOnly(start) : formatDateTimeLocal(start)}
            onChange={(event) => setEnd(parseInputDate(event.target.value, allDay) || end)}
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right" htmlFor="color">
            Farbe
          </Label>
          <div className="col-span-3 flex flex-wrap items-center gap-2">
            {eventColorPalette.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`h-8 w-8 rounded-full border-2 ${color === preset ? "border-foreground" : "border-transparent"}`}
                style={{ backgroundColor: preset }}
                onClick={() => setColor(preset)}
                aria-label={`Farbe ${preset}`}
              />
            ))}
            <Input id="color" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-10 w-16 cursor-pointer" />
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right" htmlFor="description">
            Beschreibung
          </Label>
          <Textarea id="description" className="col-span-3" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right" htmlFor="recurrence">
            Wiederholung
          </Label>
          <div className="col-span-3 flex items-center gap-2">
            <Switch id="recurrence" checked={showRecurrence} onCheckedChange={setShowRecurrence} />
            <span className="text-sm text-muted-foreground">Regelmäßiges Ereignis</span>
          </div>
        </div>

        {showRecurrence && (
          <div className="space-y-4 rounded-md border p-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="recurrenceFrequency">
                Frequenz
              </Label>
              <Select value={recurrenceFrequency} onValueChange={(value) => setRecurrenceFrequency(value as RecurrenceRule["frequency"]) }>
                <SelectTrigger id="recurrenceFrequency" className="col-span-3">
                  <SelectValue placeholder="Frequenz wählen" />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceFrequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="recurrenceInterval">
                Intervall
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <span>Alle</span>
                <Input
                  id="recurrenceInterval"
                  type="number"
                  min={1}
                  value={recurrenceInterval}
                  onChange={(event) => setRecurrenceInterval(parseInt(event.target.value, 10) || 1)}
                  className="w-20"
                />
                <span>
                  {{
                    daily: "Tage",
                    weekly: "Wochen",
                    monthly: "Monate",
                    yearly: "Jahre",
                    custom: "Intervalle",
                  }[recurrenceFrequency]}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="recurrenceEndType">
                Endet
              </Label>
              <Select value={recurrenceEndType} onValueChange={(value) => setRecurrenceEndType(value as typeof recurrenceEndType)}>
                <SelectTrigger id="recurrenceEndType" className="col-span-3">
                  <SelectValue placeholder="Ende wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Niemals</SelectItem>
                  <SelectItem value="date">Am Datum</SelectItem>
                  <SelectItem value="occurrences">Nach Anzahl</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recurrenceEndType === "date" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="recurrenceEndDate">
                  Enddatum
                </Label>
                <Input
                  id="recurrenceEndDate"
                  type="date"
                  className="col-span-3"
                  min={formatDateOnly(start)}
                  value={recurrenceEndDate}
                  onChange={(event) => setRecurrenceEndDate(event.target.value)}
                />
              </div>
            )}

            {recurrenceEndType === "occurrences" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="recurrenceOccurrences">
                  Wiederholungen
                </Label>
                <Input
                  id="recurrenceOccurrences"
                  type="number"
                  min={1}
                  className="col-span-3"
                  value={recurrenceOccurrences || ""}
                  onChange={(event) => setRecurrenceOccurrences(parseInt(event.target.value, 10) || 1)}
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-4 items-start gap-4">
          <Label className="text-right" htmlFor="linkTask">
            Mit Aufgabe verknüpfen
          </Label>
          <div className="col-span-3 space-y-2">
            <div className="flex items-center gap-2">
              <Switch id="linkTask" checked={linkTask} onCheckedChange={handleLinkTaskChange} />
              <span className="text-sm text-muted-foreground">
                Erstellt bzw. aktualisiert eine Aufgabe und hält Kalender & Aufgaben synchron.
              </span>
            </div>

            {linkTask && (
              <div className="space-y-4 rounded-md border p-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="taskCustomer">
                    Kunde*
                  </Label>
                  <div className="col-span-3">
                    <CustomerCombobox
                      value={taskCustomerId || undefined}
                      onValueChange={(value) => setTaskCustomerId(Number(value) || 0)}
                      onCustomerSelect={(option: CustomerOption | null) => {
                        setTaskCustomerId(option ? Number(option.id) : 0);
                        setTaskCustomerName(option?.name ?? null);
                      }}
                      placeholder="Kunde auswählen..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="taskPriority">
                    Priorität*
                  </Label>
                  <Select value={taskPriority} onValueChange={(value) => setTaskPriority(value as "High" | "Medium" | "Low") }>
                    <SelectTrigger id="taskPriority" className="col-span-3">
                      <SelectValue placeholder="Priorität wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">Hoch</SelectItem>
                      <SelectItem value="Medium">Mittel</SelectItem>
                      <SelectItem value="Low">Niedrig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isEditMode && initialTaskData?.id && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right" htmlFor="taskCompleted">
                      Aufgabe erledigt
                    </Label>
                    <div className="col-span-3 flex items-center gap-2">
                      <Switch id="taskCompleted" checked={taskCompleted} onCheckedChange={setTaskCompleted} />
                      <span className="text-sm text-muted-foreground">
                        Übernimmt den Status in Kalender & Aufgabenliste.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit">{isEditMode ? "Aktualisieren" : "Speichern"}</Button>
      </div>
    </form>
  );
}
