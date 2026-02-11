## ADDED Requirements

### Requirement: Centralised event bus

The system SHALL provide a centralised event bus module that all event sources publish to and all consumers subscribe to. Each event SHALL have the shape `{ type: string, timestamp: number, data: object }`.

#### Scenario: Event published and received

- **WHEN** any event source (IRC handler, EventSub handler, Helix poller) publishes an event
- **THEN** all registered subscribers receive the event

#### Scenario: Subscriber added after events

- **WHEN** a subscriber registers after events have already been published
- **THEN** the subscriber receives only future events (no replay)

### Requirement: Event log widget

A widget SHALL display all channel events in a scrollable, chronological feed. Each entry shows a timestamp, event type badge, and a human-readable summary.

#### Scenario: Events displayed in order

- **WHEN** events are received from any source
- **THEN** the event log widget displays them in chronological order (newest at the bottom)
- **AND** each entry includes the time, a coloured type badge, and a summary

#### Scenario: Event types rendered distinctly

- **WHEN** events of different types appear (chat, follow, raid, sub, join, part, ban, cheer, etc.)
- **THEN** each type has a distinct badge colour and label

#### Scenario: No events yet

- **WHEN** no events have been received
- **THEN** the widget displays "No events yet" placeholder text

#### Scenario: Large volume of events

- **WHEN** more than 500 events have been received
- **THEN** the oldest events beyond 500 are discarded from the in-memory list
- **AND** the widget remains responsive

### Requirement: File logging

The system SHALL optionally write all events to a JSONL file on disk via a Rust command. File logging is enabled by default.

#### Scenario: Events written to file

- **WHEN** file logging is enabled and an event occurs
- **THEN** the event is sent to the Rust backend via `append_event_log`
- **AND** written as a single JSON line to `~/.config/streamer/logs/{channel}-{date}.jsonl`

#### Scenario: File rotation by date

- **WHEN** the date changes during a session
- **THEN** subsequent events are written to a new file with the current date

#### Scenario: File logging disabled

- **WHEN** the streamer disables file logging in settings
- **THEN** no events are sent to the Rust backend for writing
- **AND** the event log widget continues to display events normally

#### Scenario: File logging toggle in settings

- **WHEN** the streamer toggles file logging in the settings panel
- **THEN** the setting takes effect immediately without restarting

### Requirement: File logging does not block the UI

The Rust command for appending events SHALL buffer writes and flush periodically. The frontend SHALL call the command without awaiting it (fire-and-forget with error catching).

#### Scenario: High event volume

- **WHEN** many events arrive in rapid succession (e.g. raid with 1000+ viewers joining)
- **THEN** the UI remains responsive
- **AND** events are eventually written to the log file
