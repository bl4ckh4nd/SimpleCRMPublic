# ADR 0002: Endpoint-based IPC contract

Status: accepted

## Decision

Each invoke endpoint is declared once in `shared/ipc/channels.ts` as `{ channel, input, output }`. Channel compatibility trees, preload allowlists, handler types, and renderer result types are derived from that object graph.

Main-process registration receives the endpoint object and validates both sides with Zod. The context bridge accepts only derived allowlisted invoke channels and at most one payload. Specialized subscriptions, such as sync status, are exposed as named methods rather than a generic event bridge.

## Consequences

Adding or changing an endpoint requires one contract edit. Channel strings and schemas cannot drift into separate maps, and invalid output from a handler fails at the same observable boundary as invalid renderer input.
