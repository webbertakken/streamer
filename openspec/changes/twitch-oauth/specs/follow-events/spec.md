## ADDED Requirements

### Requirement: EventSub WebSocket connection

The system SHALL maintain a WebSocket connection to `wss://eventsub.wss.twitch.tv/ws` when the streamer is authenticated. Subscriptions SHALL be created via the Helix API (proxied through Rust) using the session ID from the welcome message.

#### Scenario: Connection established and subscriptions created

- **WHEN** the streamer is authenticated and a channel is connected
- **THEN** the system opens a WebSocket to the EventSub endpoint
- **AND** upon receiving the welcome message, subscribes to all configured event types within 10 seconds
- **AND** subscriptions are created in parallel

#### Scenario: Keepalive timeout triggers reconnect

- **WHEN** no message is received within the keepalive timeout plus a 5-second buffer
- **THEN** the system closes the connection and opens a new one
- **AND** re-subscribes to all event types

#### Scenario: Server-initiated reconnect

- **WHEN** a `session_reconnect` message is received with a new URL
- **THEN** the system connects to the new URL within 30 seconds
- **AND** closes the old connection after the new one is established

#### Scenario: Disconnect on logout

- **WHEN** the streamer logs out
- **THEN** the EventSub WebSocket is closed
- **AND** no reconnection is attempted

### Requirement: Follow and unfollow events

The system SHALL subscribe to `channel.follow` (v2) events. Follow events SHALL be displayed in a dedicated follow events widget.

#### Scenario: New follower

- **WHEN** a user follows the channel
- **THEN** the follow events widget displays the follower's username and timestamp
- **AND** the event is published to the event bus

### Requirement: Follow events widget

A dedicated widget SHALL display recent follow events in a scrollable list. Each entry shows the username and time of the follow.

#### Scenario: Widget displays follow history

- **WHEN** the overlay is visible and follow events have occurred
- **THEN** the widget shows a scrollable list of follow events, newest first

#### Scenario: No follows yet

- **WHEN** no follow events have been received since the session started
- **THEN** the widget displays "No follows yet" placeholder text

### Requirement: Follower count via Helix polling

The system SHALL poll `GET /helix/channels/followers` to retrieve the total follower count. The poll interval SHALL be 60 seconds.

#### Scenario: Follower count displayed

- **WHEN** the streamer is authenticated and connected
- **THEN** the system polls for follower count every 60 seconds
- **AND** the current count is available to widgets via the event bus

#### Scenario: Follower count updates

- **WHEN** a new poll returns a different follower count
- **THEN** a `follower_count_update` event is published to the event bus with the new total

### Requirement: Additional EventSub subscriptions

The system SHALL subscribe to all available channel events that the granted scopes permit:
- `channel.raid` (no scope required)
- `channel.update` (no scope required)
- `stream.online` / `stream.offline` (no scope required)
- `channel.subscribe`, `channel.subscription.gift`, `channel.subscription.message` (requires `channel:read:subscriptions`)
- `channel.ban`, `channel.unban` (no scope required for broadcaster's own channel)
- `channel.cheer` (requires `bits:read`)

All events SHALL be published to the event bus.

#### Scenario: Raid event received

- **WHEN** another channel raids the streamer's channel
- **THEN** a `raid` event is published to the event bus with the raider's name and viewer count

#### Scenario: Subscription event received

- **WHEN** a viewer subscribes, gifts a sub, or resubscribes
- **THEN** a corresponding event is published to the event bus with details (username, tier, message if present)

#### Scenario: Stream goes online or offline

- **WHEN** the stream starts or ends
- **THEN** a `stream_online` or `stream_offline` event is published to the event bus
