import { CALENDAR_EVENTS_TABLE, CUSTOMERS_TABLE, TASKS_TABLE } from './database-schema';
import { createActivityLog, getDb } from './sqlite-service';

const DEFAULT_COLOR = '#3174ad';
const COMPLETED_COLOR = '#94a3b8';

type TaskSchedule = {
  startDate: string;
  endDate: string;
  allDay: boolean;
};

type Result = { success: true; id?: number; eventId?: number } | { success: false; error: string };

const fail = (error: unknown): Result => ({
  success: false,
  error: error instanceof Error ? error.message : String(error),
});

export function listTasks(limit = 100, offset = 0, filter: { completed?: boolean; priority?: string; query?: string } = {}) {
  let sql = `
    SELECT t.*, c.name AS customer_name,
      (SELECT id FROM ${CALENDAR_EVENTS_TABLE} WHERE task_id = t.id LIMIT 1) AS calendar_event_id
    FROM ${TASKS_TABLE} t
    LEFT JOIN ${CUSTOMERS_TABLE} c ON c.id = t.customer_id
    WHERE 1=1`;
  const params: unknown[] = [];

  if (filter.completed !== undefined) {
    sql += ' AND t.completed = ?';
    params.push(filter.completed ? 1 : 0);
  }
  if (filter.priority) {
    sql += ' AND t.priority = ?';
    params.push(filter.priority);
  }
  if (filter.query?.trim()) {
    sql += ' AND (t.title LIKE ? OR t.description LIKE ? OR c.name LIKE ?)';
    const query = `%${filter.query.trim()}%`;
    params.push(query, query, query);
  }

  sql += ' ORDER BY t.due_date ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return getDb().prepare(sql).all(...params);
}

export function getScheduledTask(taskId: number) {
  return getDb().prepare(`
    SELECT t.*, c.name AS customer_name,
      (SELECT id FROM ${CALENDAR_EVENTS_TABLE} WHERE task_id = t.id LIMIT 1) AS calendar_event_id
    FROM ${TASKS_TABLE} t
    LEFT JOIN ${CUSTOMERS_TABLE} c ON c.id = t.customer_id
    WHERE t.id = ?
  `).get(taskId);
}

function upsertSchedule(taskId: number, schedule: TaskSchedule) {
  const db = getDb();
  const task = db.prepare(`SELECT title, description, completed FROM ${TASKS_TABLE} WHERE id = ?`).get(taskId) as {
    title: string;
    description?: string;
    completed: number;
  } | undefined;
  if (!task) throw new Error('Task not found');

  const now = new Date().toISOString();
  const existing = db.prepare(`SELECT id FROM ${CALENDAR_EVENTS_TABLE} WHERE task_id = ?`).get(taskId) as { id: number } | undefined;
  const values = {
    taskId,
    title: task.title,
    description: task.description ?? '',
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    allDay: schedule.allDay ? 1 : 0,
    color: task.completed ? COMPLETED_COLOR : DEFAULT_COLOR,
    now,
  };

  if (existing) {
    db.prepare(`
      UPDATE ${CALENDAR_EVENTS_TABLE}
      SET title=@title, description=@description, start_date=@startDate, end_date=@endDate,
          all_day=@allDay, color_code=@color, event_type='task', updated_at=@now
      WHERE id=@id
    `).run({ ...values, id: existing.id });
    return existing.id;
  }

  const inserted = db.prepare(`
    INSERT INTO ${CALENDAR_EVENTS_TABLE}
      (title, description, start_date, end_date, all_day, color_code, event_type, task_id, created_at, updated_at)
    VALUES (@title, @description, @startDate, @endDate, @allDay, @color, 'task', @taskId, @now, @now)
  `).run(values);
  return Number(inserted.lastInsertRowid);
}

export function createScheduledTask(task: Record<string, unknown>, schedule?: TaskSchedule): Result {
  try {
    return getDb().transaction((): Result => {
      const now = new Date().toISOString();
      const inserted = getDb().prepare(`
        INSERT INTO ${TASKS_TABLE}
          (customer_id, title, description, due_date, priority, completed, created_date, last_modified)
        VALUES (@customer_id, @title, @description, @due_date, @priority, @completed, @now, @now)
      `).run({
        customer_id: task.customer_id,
        title: task.title,
        description: task.description ?? '',
        due_date: task.due_date ?? '',
        priority: task.priority,
        completed: task.completed ? 1 : 0,
        now,
      });
      const id = Number(inserted.lastInsertRowid);
      const eventId = schedule ? upsertSchedule(id, schedule) : undefined;
      createActivityLog({
        customer_id: Number(task.customer_id),
        task_id: id,
        activity_type: 'task_created',
        title: `Aufgabe erstellt: ${String(task.title)}`,
      });
      return { success: true, id, eventId };
    })();
  } catch (error) {
    return fail(error);
  }
}

export function updateScheduledTask(taskId: number, changes: Record<string, unknown>): Result {
  try {
    return getDb().transaction((): Result => {
      const allowed = ['customer_id', 'title', 'description', 'due_date', 'priority', 'completed', 'snoozed_until'];
      const entries = Object.entries(changes).filter(([key, value]) => allowed.includes(key) && value !== undefined);
      if (!entries.length) return { success: false, error: 'No fields to update' };

      const data = Object.fromEntries(entries);
      if ('completed' in data) data.completed = data.completed ? 1 : 0;
      data.id = taskId;
      data.now = new Date().toISOString();
      const assignments = entries.map(([key]) => `${key}=@${key}`).join(', ');
      const updated = getDb().prepare(`UPDATE ${TASKS_TABLE} SET ${assignments}, last_modified=@now WHERE id=@id`).run(data);
      if (!updated.changes) return { success: false, error: 'Task not found' };

      const event = getDb().prepare(`SELECT * FROM ${CALENDAR_EVENTS_TABLE} WHERE task_id = ?`).get(taskId) as Record<string, unknown> | undefined;
      if (event) {
        if ('due_date' in changes && !changes.due_date) {
          getDb().prepare(`DELETE FROM ${CALENDAR_EVENTS_TABLE} WHERE task_id = ?`).run(taskId);
        } else {
          const startDate = String(changes.due_date ?? event.start_date);
          const oldStart = new Date(String(event.start_date)).getTime();
          const oldEnd = new Date(String(event.end_date)).getTime();
          const duration = Number.isFinite(oldEnd - oldStart) ? oldEnd - oldStart : 24 * 60 * 60 * 1000;
          upsertSchedule(taskId, {
            startDate,
            endDate: 'due_date' in changes ? new Date(new Date(startDate).getTime() + duration).toISOString() : String(event.end_date),
            allDay: Boolean(event.all_day),
          });
        }
      }
      return { success: true, id: taskId };
    })();
  } catch (error) {
    return fail(error);
  }
}

export function setTaskSchedule(taskId: number, schedule: TaskSchedule): Result {
  try {
    return getDb().transaction(() => {
      const eventId = upsertSchedule(taskId, schedule);
      getDb().prepare(`UPDATE ${TASKS_TABLE} SET due_date=?, last_modified=? WHERE id=?`)
        .run(schedule.startDate, new Date().toISOString(), taskId);
      return { success: true as const, id: taskId, eventId };
    })();
  } catch (error) {
    return fail(error);
  }
}

export function removeTaskSchedule(taskId: number): Result {
  try {
    getDb().prepare(`DELETE FROM ${CALENDAR_EVENTS_TABLE} WHERE task_id = ?`).run(taskId);
    return { success: true, id: taskId };
  } catch (error) {
    return fail(error);
  }
}

export function setTaskCompletion(taskId: number, completed: boolean): Result {
  const result = updateScheduledTask(taskId, { completed });
  if (result.success && completed) {
    const task = getScheduledTask(taskId) as { customer_id: number; title: string } | undefined;
    if (task) createActivityLog({ customer_id: task.customer_id, task_id: taskId, activity_type: 'task_completed', title: `Aufgabe erledigt: ${task.title}` });
  }
  return result;
}

export function deleteScheduledTask(taskId: number): Result {
  try {
    const deleted = getDb().prepare(`DELETE FROM ${TASKS_TABLE} WHERE id = ?`).run(taskId);
    return deleted.changes ? { success: true, id: taskId } : { success: false, error: 'Task not found' };
  } catch (error) {
    return fail(error);
  }
}

export function updateEventWithTask(eventId: number, eventData: Record<string, unknown>): Result {
  try {
    return getDb().transaction((): Result => {
      const event = getDb().prepare(`SELECT task_id FROM ${CALENDAR_EVENTS_TABLE} WHERE id = ?`).get(eventId) as { task_id: number | null } | undefined;
      if (!event) return { success: false, error: 'Calendar event not found' };
      if (!event.task_id) {
        const allowed = ['title', 'description', 'start_date', 'end_date', 'all_day', 'color_code', 'event_type', 'recurrence_rule'];
        const entries = Object.entries(eventData).filter(([key, value]) => allowed.includes(key) && value !== undefined);
        if (!entries.length) return { success: false, error: 'No fields to update' };
        const data = Object.fromEntries(entries);
        data.id = eventId;
        data.now = new Date().toISOString();
        const assignments = entries.map(([key]) => `${key}=@${key}`).join(', ');
        getDb().prepare(`UPDATE ${CALENDAR_EVENTS_TABLE} SET ${assignments}, updated_at=@now WHERE id=@id`).run(data);
        return { success: true, eventId };
      }

      const taskChanges: Record<string, unknown> = {};
      if ('title' in eventData) taskChanges.title = eventData.title;
      if ('description' in eventData) taskChanges.description = eventData.description;
      if ('start_date' in eventData) taskChanges.due_date = eventData.start_date;
      const updated = updateScheduledTask(event.task_id, taskChanges);
      if (!updated.success) throw new Error(updated.error);
      const current = getDb().prepare(`SELECT * FROM ${CALENDAR_EVENTS_TABLE} WHERE id = ?`).get(eventId) as Record<string, unknown>;
      upsertSchedule(event.task_id, {
        startDate: String(eventData.start_date ?? current.start_date),
        endDate: String(eventData.end_date ?? current.end_date),
        allDay: Boolean(eventData.all_day ?? current.all_day),
      });
      return { success: true, id: event.task_id, eventId };
    })();
  } catch (error) {
    return fail(error);
  }
}

export function deleteEventWithTask(eventId: number): Result {
  try {
    const deleted = getDb().prepare(`DELETE FROM ${CALENDAR_EVENTS_TABLE} WHERE id = ?`).run(eventId);
    return deleted.changes ? { success: true, eventId } : { success: false, error: 'Calendar event not found' };
  } catch (error) {
    return fail(error);
  }
}

export function saveCalendarEntry(input: {
  eventId?: number;
  event: {
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    all_day: boolean;
    color_code?: string;
    event_type?: string;
    recurrence_rule?: string | null;
  };
  task?: {
    id?: number | null;
    customer_id: number;
    priority: 'High' | 'Medium' | 'Low';
    description?: string;
    completed?: boolean;
  } | null;
}): Result {
  try {
    return getDb().transaction((): Result => {
      const db = getDb();
      const now = new Date().toISOString();
      const existing = input.eventId
        ? db.prepare(`SELECT task_id FROM ${CALENDAR_EVENTS_TABLE} WHERE id = ?`).get(input.eventId) as { task_id: number | null } | undefined
        : undefined;
      if (input.eventId && !existing) return { success: false, error: 'Calendar event not found' };

      let taskId: number | null = input.task?.id ?? existing?.task_id ?? null;
      if (input.task) {
        const taskValues = {
          customer_id: input.task.customer_id,
          title: input.event.title,
          description: input.task.description ?? input.event.description ?? '',
          due_date: input.event.start_date,
          priority: input.task.priority,
          completed: input.task.completed ? 1 : 0,
          now,
        };
        if (taskId) {
          const updated = db.prepare(`
            UPDATE ${TASKS_TABLE}
            SET customer_id=@customer_id, title=@title, description=@description, due_date=@due_date,
                priority=@priority, completed=@completed, last_modified=@now
            WHERE id=@id
          `).run({ ...taskValues, id: taskId });
          if (!updated.changes) return { success: false, error: 'Task not found' };
        } else {
          const inserted = db.prepare(`
            INSERT INTO ${TASKS_TABLE}
              (customer_id, title, description, due_date, priority, completed, created_date, last_modified)
            VALUES (@customer_id, @title, @description, @due_date, @priority, @completed, @now, @now)
          `).run(taskValues);
          taskId = Number(inserted.lastInsertRowid);
        }
      } else {
        taskId = null;
      }

      const eventValues = {
        ...input.event,
        description: input.event.description ?? '',
        all_day: input.event.all_day ? 1 : 0,
        color_code: input.event.color_code ?? DEFAULT_COLOR,
        event_type: input.task ? 'task' : (input.event.event_type ?? ''),
        recurrence_rule: input.event.recurrence_rule ?? null,
        task_id: taskId,
        now,
      };
      let eventId = input.eventId;
      if (eventId) {
        db.prepare(`
          UPDATE ${CALENDAR_EVENTS_TABLE}
          SET title=@title, description=@description, start_date=@start_date, end_date=@end_date,
              all_day=@all_day, color_code=@color_code, event_type=@event_type,
              recurrence_rule=@recurrence_rule, task_id=@task_id, updated_at=@now
          WHERE id=@id
        `).run({ ...eventValues, id: eventId });
      } else {
        const inserted = db.prepare(`
          INSERT INTO ${CALENDAR_EVENTS_TABLE}
            (title, description, start_date, end_date, all_day, color_code, event_type,
             recurrence_rule, task_id, created_at, updated_at)
          VALUES (@title, @description, @start_date, @end_date, @all_day, @color_code, @event_type,
                  @recurrence_rule, @task_id, @now, @now)
        `).run(eventValues);
        eventId = Number(inserted.lastInsertRowid);
      }
      return { success: true, id: taskId ?? undefined, eventId };
    })();
  } catch (error) {
    return fail(error);
  }
}
