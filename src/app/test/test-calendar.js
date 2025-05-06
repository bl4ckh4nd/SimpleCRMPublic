// Test script for calendar events

// Example of properly formatted calendar event
const testCalendarEvent = {
  title: "Test Event with Recurrence",
  description: "This is a test event with recurrence",
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
  all_day: false,
  color_code: "#3174ad",
  event_type: "Test",
  recurrence_rule: {
    frequency: "weekly",
    interval: 1,
    endDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString() // 30 days later
  }
};

// When sending to SQLite, make sure the recurrence_rule is a JSON string
const prepareForSqlite = (event) => {
  const sqliteCompatibleEvent = {
    ...event,
    // Convert boolean to integer for SQLite
    all_day: event.all_day ? 1 : 0
  };

  // IMPORTANT: Stringify complex objects like recurrence_rule
  if (event.recurrence_rule) {
    sqliteCompatibleEvent.recurrence_rule = 
      typeof event.recurrence_rule === 'string' 
        ? event.recurrence_rule 
        : JSON.stringify(event.recurrence_rule);
  }

  return sqliteCompatibleEvent;
};

// Example usage
const sqliteEvent = prepareForSqlite(testCalendarEvent);
console.log('Event ready for SQLite:', sqliteEvent);

// To use in your app, you would do:
// window.electronAPI.invoke('db:addCalendarEvent', sqliteEvent);

// When receiving events from SQLite, parse the JSON string back to an object
const parseFromSqlite = (dbEvent) => {
  const parsedEvent = {
    ...dbEvent,
    // Convert SQLite integer to boolean
    all_day: Boolean(dbEvent.all_day)
  };

  // Parse the recurrence_rule JSON string back to an object
  if (dbEvent.recurrence_rule && typeof dbEvent.recurrence_rule === 'string') {
    try {
      parsedEvent.recurrence_rule = JSON.parse(dbEvent.recurrence_rule);
    } catch (e) {
      console.error('Error parsing recurrence_rule:', e);
      parsedEvent.recurrence_rule = undefined;
    }
  }

  return parsedEvent;
};

// This file serves as documentation showing how to properly handle complex 
// objects with SQLite, which only accepts primitive types (strings, numbers, etc.)
// The key is to stringify complex objects like recurrence_rule when sending to SQLite
// and parse them back to objects when receiving from SQLite. 