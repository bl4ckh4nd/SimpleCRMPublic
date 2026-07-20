# Runtime context

SimpleCRM is a local-first Electron application. SQLite in the Electron main process is the source of truth; the React renderer never owns durable CRM state and cannot access Node APIs directly.

## Runtime boundaries

- `electron/main.ts` is the only Electron entrypoint. Vite emits it as `dist-electron/main.js`.
- `shared/ipc/channels.ts` defines every invoke endpoint as one object containing its channel plus Zod input/output schemas. The preload allowlist and TypeScript payload/result types are derived from those endpoint objects.
- `electron/ipc/` validates renderer input and main-process output at the boundary.
- `electron/task-scheduling.ts` owns the Task/Calendar projection. `calendar_events.task_id` is the sole persisted link.
- `electron/deal-products.ts` owns deal-product mutations and dynamic deal-value recalculation.
- `electron/sqlite-service.ts` owns customer collection reads and guarded batch deletion.
- `electron/notification-digest.ts` owns the optional Electron background digest. Non-secret settings are stored under Electron `userData`; the SMTP password is stored in Keytar.

## Timing and feedback

Task/calendar and deal/product writes are SQLite transactions. IPC failures are returned as structured mutation errors and logged by the main process. Notification delivery has a durable daily log, at most three attempts per day, a five-minute retry interval, and a heartbeat-backed worker status exposed in Settings.

## Deletion policy

Customers referenced by Tasks or Deals cannot be deleted. Batch customer deletion is all-or-none and reports blockers. Task deletion cascades to its projected calendar event; deleting or detaching an event does not delete its Task unless the Task itself is deleted.
