## ADDED Requirements

### Requirement: Messages expire after TTL

The system SHALL automatically remove chat messages from the in-memory store once they exceed a 60-second time-to-live (TTL) measured from their `timestamp`.

#### Scenario: Message removed after 60 seconds
- **WHEN** a chat message has been in the store for more than 60 seconds
- **THEN** it SHALL be removed from the store within 5 seconds of exceeding the TTL

#### Scenario: Sweep runs periodically
- **WHEN** the expiry sweep is active
- **THEN** it SHALL run at a fixed interval (≤ 5 seconds) and remove all messages whose age exceeds the TTL

### Requirement: Messages fade out before removal

The system SHALL visually fade messages to transparent as they approach expiry so that disappearance is not abrupt.

#### Scenario: Fade begins near end of life
- **WHEN** a message has ≤ 5 seconds of remaining lifetime
- **THEN** its rendered opacity SHALL transition from 1 to 0 over the remaining time using a CSS transition

#### Scenario: Fresh messages are fully opaque
- **WHEN** a message has more than 5 seconds of remaining lifetime
- **THEN** it SHALL be rendered at full opacity (1)

### Requirement: Expiry lifecycle is controllable

The system SHALL expose `startMessageExpiry()` and `stopMessageExpiry()` functions to start and stop the periodic sweep, allowing the interval to be managed during app bootstrap and in tests.

#### Scenario: Start expiry on app boot
- **WHEN** the application starts and chat is initialised
- **THEN** `startMessageExpiry()` SHALL be called to begin the periodic sweep

#### Scenario: Stop expiry cleans up interval
- **WHEN** `stopMessageExpiry()` is called
- **THEN** the periodic sweep interval SHALL be cleared and no further removals occur

### Requirement: Hydration filters expired messages

When restoring chat history from disk, the system SHALL discard any messages older than the TTL so that already-expired messages are never displayed.

#### Scenario: Restore only fresh messages
- **WHEN** chat history is hydrated from disk
- **THEN** only messages with a `timestamp` within the 60-second TTL window SHALL be loaded into the store
