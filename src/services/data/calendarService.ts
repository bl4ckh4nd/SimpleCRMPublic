import { IPCChannels } from '@shared/ipc/channels';

interface AddTaskEventOptions {
  title: string;
  description?: string;
  dueDate: string;
  customerName?: string;
  colorCode?: string;
}

interface AddTaskEventResult {
  success: boolean;
  id: number;
}

interface UpdateTaskEventOptions {
  title?: string;
  description?: string;
  dueDate?: string;
  customerName?: string;
  completed?: boolean;
  colorCode?: string | null;
}

const DEFAULT_TASK_EVENT_COLOR = '#3174ad';
const COMPLETED_TASK_EVENT_COLOR = '#9CA3AF';

const parseDueDate = (dueDate: string): { start: Date; end: Date } => {
  const [yearString, monthString, dayString] = dueDate.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  if (!year || !month || !day) {
    throw new Error(`Ungültiges Fälligkeitsdatum: ${dueDate}`);
  }

  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return { start, end };
};

const buildTaskDescription = (description?: string, customerName?: string) => {
  const lines = [
    description?.trim() ? description.trim() : null,
    customerName ? `Kunde: ${customerName}` : null,
  ].filter(Boolean);

  return lines.join('\n');
};

export const calendarService = {
  async addTaskEvent({
    title,
    description,
    dueDate,
    customerName,
    colorCode,
  }: AddTaskEventOptions): Promise<AddTaskEventResult> {
    if (!window.electronAPI?.invoke) {
      throw new Error('Electron API nicht verfügbar. Kalender-Ereignis kann nicht erstellt werden.');
    }

    const { start, end } = parseDueDate(dueDate);

    const sqliteCompatibleEvent = {
      title,
      description: buildTaskDescription(description, customerName),
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      all_day: true,
      color_code: colorCode || DEFAULT_TASK_EVENT_COLOR,
      event_type: 'task',
      recurrence_rule: null,
    };

    const result = await window.electronAPI.invoke<typeof IPCChannels.Calendar.AddCalendarEvent>(
      IPCChannels.Calendar.AddCalendarEvent,
      sqliteCompatibleEvent,
    ) as { success?: boolean; id?: number; lastInsertRowid?: number };

    const calendarEventId =
      typeof result?.id === 'number'
        ? result.id
        : typeof result?.lastInsertRowid === 'number'
          ? Number(result.lastInsertRowid)
          : undefined;

    if (typeof calendarEventId !== 'number' || Number.isNaN(calendarEventId)) {
      throw new Error('Kalenderereignis konnte nicht erstellt werden: Keine Ereignis-ID erhalten.');
    }

    return {
      success: Boolean(result?.success ?? true),
      id: calendarEventId,
    };
  },

  async updateTaskEvent(
    eventId: number,
    {
      title,
      description,
      dueDate,
      customerName,
      completed,
      colorCode,
    }: UpdateTaskEventOptions
  ): Promise<void> {
    if (!window.electronAPI?.invoke) {
      throw new Error('Electron API nicht verfügbar. Kalender-Ereignis kann nicht aktualisiert werden.');
    }

    if (!eventId || Number.isNaN(Number(eventId))) {
      throw new Error('Ungültige Kalender-Ereignis-ID.');
    }

    const eventData: Record<string, unknown> = {};

    if (title !== undefined) {
      eventData.title = title;
    }

    if (description !== undefined || customerName !== undefined) {
      eventData.description = buildTaskDescription(description, customerName);
    }

    if (dueDate) {
      const { start, end } = parseDueDate(dueDate);
      eventData.start_date = start.toISOString();
      eventData.end_date = end.toISOString();
      eventData.all_day = 1;
    }

    if (completed !== undefined || colorCode !== undefined) {
      const resolvedColor =
        colorCode ??
        (completed ? COMPLETED_TASK_EVENT_COLOR : DEFAULT_TASK_EVENT_COLOR);

      eventData.color_code = resolvedColor;
    }

    if (Object.keys(eventData).length === 0) {
      return;
    }

    await window.electronAPI.invoke<typeof IPCChannels.Calendar.UpdateCalendarEvent>(
      IPCChannels.Calendar.UpdateCalendarEvent,
      {
        id: eventId,
        eventData,
      }
    );
  },

  async deleteTaskEvent(eventId: number): Promise<void> {
    if (!window.electronAPI?.invoke) {
      throw new Error('Electron API nicht verfügbar. Kalender-Ereignis kann nicht gelöscht werden.');
    }

    if (!eventId || Number.isNaN(Number(eventId))) {
      throw new Error('Ungültige Kalender-Ereignis-ID.');
    }

    await window.electronAPI.invoke<typeof IPCChannels.Calendar.DeleteCalendarEvent>(
      IPCChannels.Calendar.DeleteCalendarEvent,
      eventId
    );
  },
};

export const TASK_EVENT_DEFAULT_COLOR = DEFAULT_TASK_EVENT_COLOR;
export const TASK_EVENT_COMPLETED_COLOR = COMPLETED_TASK_EVENT_COLOR;

export type { AddTaskEventOptions, AddTaskEventResult, UpdateTaskEventOptions };
