# ADR 0001: Main-process ownership for CRM invariants

Status: accepted

## Decision

Business invariants that span tables live behind main-process modules, not renderer orchestration:

- Task scheduling: `electron/task-scheduling.ts`
- Deal products and calculated value: `electron/deal-products.ts`
- Customer collection loading/deletion: `electron/sqlite-service.ts`
- Notification digest scheduling/delivery: `electron/notification-digest.ts`

The renderer requests one domain operation. The owner validates its inputs, performs all related SQLite writes in one transaction, and returns one result.

## Consequences

The UI can no longer leave half-linked Task/Calendar rows or stale dynamic Deal values when a later IPC call fails. Existing databases are reconciled toward `calendar_events.task_id`; new databases enforce one event per Task. Renderer services remain thin adapters and do not compensate for partial main-process writes.
