# Calendar Event Handling Notes

## Handling `recurrence_rule` with SQLite

The SQLite database expects all named parameters used in a query to be provided, even if they are null. This caused the error:

```
RangeError: Missing named parameter "recurrence_rule"
```

### Fixed Implementation

1. **Always include `recurrence_rule` in the parameter object**, even when it's null:

```javascript
// In sqlite-service.ts - createCalendarEvent
const cleanData = {
  // ... other fields
  recurrence_rule: null, // Default to null
  now: now
};

// Only override if a value exists
if (eventData.recurrence_rule) {
  cleanData.recurrence_rule = typeof eventData.recurrence_rule === 'string' 
      ? eventData.recurrence_rule
      : JSON.stringify(eventData.recurrence_rule);
}
```

2. **On the frontend, include `recurrence_rule: null` in the event object**:

```javascript
// In page.tsx - addCalendarEvent and updateCalendarEvent
const sqliteCompatibleEvent = {
  // ... other fields
  recurrence_rule: null // Default to null
};

// Only stringify if it exists and isn't null
if (event.recurrence_rule) {
  sqliteCompatibleEvent.recurrence_rule = JSON.stringify(event.recurrence_rule);
}
```

## Type Handling

For complete type safety, the interfaces for calendar events should be updated:

```typescript
interface CalendarEvent {
  // ... other fields
  recurrence_rule?: RecurrenceRule | string | null;
}

interface CalendarRBCEvent {
  // ... other fields
  recurrence_rule?: RecurrenceRule | string | null;
}
```

## General Rules for SQLite Parameters

1. All named parameters (`@paramName`) in SQL queries must be provided in the parameter object, even if they are null
2. Use default values in your parameter objects for optional fields
3. SQLite doesn't have a boolean type - convert booleans to integers (0/1)
4. Complex objects must be stringified as JSON before storing
5. When retrieving data, parse stringified JSON back to objects 