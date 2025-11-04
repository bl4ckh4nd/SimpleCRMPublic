import { IPCChannels } from '@shared/ipc/channels';
import { registerIpcHandler } from './register';
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskCompletion,
  deleteTask,
} from '../sqlite-service';

interface TaskHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}

type Disposer = () => void;

export function registerTaskHandlers(options: TaskHandlersOptions) {
  const { logger } = options;
  const disposers: Disposer[] = [];

  /*
   * Full‑Text Search (FTS) for Tasks — Implementation Plan
   * Goal: Search should match across both task title and description ("content")
   * while remaining fast and safe. We will prefer SQLite FTS5 with a LIKE fallback.
   *
   * 1) Schema: Add FTS5 virtual table and triggers
   *    - In `electron/database-schema.ts` add:
   *      `export const createTasksFtsTable = \`
   *         CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts
   *         USING fts5(title, description, content='tasks', content_rowid='id', tokenize='unicode61');
   *       \`;`
   *    - In `electron/sqlite-service.ts#initializeDatabase()` exec `createTasksFtsTable` for new DBs.
   *    - In the existing migration path (`runMigrations()`), ensure the FTS table exists and create triggers:
   *      AFTER INSERT ON tasks  → `INSERT INTO tasks_fts(rowid, title, description) VALUES (new.id, new.title, new.description);`
   *      AFTER UPDATE ON tasks  → `DELETE FROM tasks_fts WHERE rowid = old.id; INSERT INTO tasks_fts(rowid, title, description) VALUES (new.id, new.title, new.description);`
   *      AFTER DELETE ON tasks  → `DELETE FROM tasks_fts WHERE rowid = old.id;`
   *    - Backfill once after creating the table: `INSERT INTO tasks_fts(rowid, title, description) SELECT id, title, description FROM tasks;`
   *
   * 2) Query path: Use FTS when a search term is present, else keep current ordering
   *    - Keep using the existing channel `tasks:get-all` with `{ filter.query }` to avoid renderer changes.
   *    - In `electron/sqlite-service.ts#getAllTasks(...)`:
   *      • If `filter.query` is truthy AND `tasks_fts` exists, run the FTS variant:
   *        SELECT t.*, c.name AS customer_name, bm25(tasks_fts) AS rank
   *        FROM tasks t
   *        JOIN tasks_fts ON tasks_fts.rowid = t.id
   *        LEFT JOIN customers c ON t.customer_id = c.id
   *        WHERE tasks_fts MATCH @ftsQuery
   *          AND <existing completed/priority filters>
   *          AND ( @customerTerm IS NULL OR c.name LIKE @customerTerm )  -- optional: keep customer name matching
   *        ORDER BY rank, t.due_date ASC
   *        LIMIT @limit OFFSET @offset;
   *      • Else (no FTS support), fall back to current LIKE across title + description (+ customer name).
   *
   * 3) Query builder: safe tokenization + prefix matching
   *    - Add a small helper in `sqlite-service.ts`:
   *      `function toFtsQuery(q: string) { return q.trim().split(/\s+/).map(t => t.replace(/["']/g, '"')).map(t => `${t}*`).join(' AND '); }`
   *      • Supports multi-word AND and prefix matches (foo* bar*).
   *      • If the user includes quotes, treat the entire string as a phrase and append `*` to the last token only.
   *    - Bind parameters via prepared statements (no string interpolation).
   *
   * 4) Capability detection and resilience
   *    - Detect FTS5/table availability once (e.g., `SELECT name FROM sqlite_master WHERE type='table' AND name='tasks_fts'`).
   *    - Wrap FTS query in try/catch. On error, log at debug and fall back to the LIKE query.
   *
   * 5) IPC contract (unchanged) and types
   *    - Continue to accept `{ limit, offset, filter: { completed?, priority?, query? } }` on `tasks:get-all`.
   *    - No preload or channel changes required. Renderer keeps calling the same API.
   *
   * 6) Tests
   *    - Add Electron tests in `__tests__/electron/tasks.search.test.ts`:
   *      • Matches in `title` only, `description` only, and both.
   *      • Prefix search (e.g., "meet" finds "meeting").
   *      • Filters (completed/priority) interact correctly with FTS.
   *      • Fallback path works when FTS is unavailable (simulate by querying a temp DB without the FTS table).
   *
   * 7) Data + DX
   *    - Update `npm run seed-db` to ensure `tasks.description` contains realistic text for search.
   *    - Optional: expose `rank` in results for renderer-side tie‑breaking; keep ordering primarily by due_date for UX.
   *
   * Rollout notes
   *    - Existing consumers remain unaffected. New DBs get FTS automatically; existing DBs are migrated on startup.
   *    - The LIKE fallback ensures behavior parity if FTS is ever unavailable.
   */

  disposers.push(
    registerIpcHandler(IPCChannels.Tasks.GetAll, async (_event, params: any = {}) => {
      try {
        const { limit, offset, filter } = params ?? {};
        return getAllTasks(limit, offset, filter);
      } catch (error) {
        logger.error('IPC Error getting all tasks:', error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Tasks.GetById, async (_event, taskId: number) => {
      try {
        return getTaskById(taskId);
      } catch (error) {
        logger.error(`IPC Error getting task by id ${taskId}:`, error);
        return null;
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Tasks.Create, async (_event, taskData: any) => {
      try {
        return createTask(taskData);
      } catch (error) {
        logger.error('IPC Error creating task:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Tasks.Update, async (_event, payload: any) => {
      try {
        const { id, taskData } = payload ?? {};
        return updateTask(id, taskData);
      } catch (error) {
        logger.error('IPC Error updating task:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Tasks.ToggleCompletion, async (_event, payload: any) => {
      try {
        const { taskId, completed } = payload ?? {};
        return updateTaskCompletion(taskId, completed);
      } catch (error) {
        logger.error('IPC Error toggling task completion:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Tasks.Delete, async (_event, taskId: number) => {
      try {
        return deleteTask(taskId);
      } catch (error) {
        logger.error(`IPC Error deleting task ${taskId}:`, error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
