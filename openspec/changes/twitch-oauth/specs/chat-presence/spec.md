## ADDED Requirements

### Requirement: IRC JOIN/PART tracking

When authenticated, the system SHALL track IRC JOIN and PART events from the `twitch.tv/membership` capability. Each join and part SHALL be published to the event bus.

#### Scenario: User joins chat

- **WHEN** a JOIN event is received for a user
- **THEN** the user is added to the chat presence list
- **AND** a `join` event is published to the event bus

#### Scenario: User leaves chat

- **WHEN** a PART event is received for a user
- **THEN** the user is removed from the chat presence list
- **AND** a `part` event is published to the event bus

### Requirement: Chat presence widget

A widget SHALL display the current users in chat and a count. The list is scrollable and sorted alphabetically.

#### Scenario: Widget shows current viewers

- **WHEN** the overlay is visible and users are in chat
- **THEN** the widget displays an alphabetically sorted list of usernames and a total count

#### Scenario: Empty chat

- **WHEN** no users are tracked in chat
- **THEN** the widget displays "No viewers tracked" placeholder text

### Requirement: Configurable viewer threshold

The chat presence feature SHALL have a configurable viewer threshold (default: 1000). When the viewer count exceeds the threshold, JOIN/PART tracking MUST be disabled and the widget MUST display a clear explanation.

#### Scenario: Threshold exceeded

- **WHEN** the stream viewer count exceeds the configured threshold
- **THEN** the chat presence widget stops tracking JOIN/PART events
- **AND** displays a message: "Chat presence is unavailable above {threshold} viewers"
- **AND** existing presence data is cleared

#### Scenario: Threshold configurable in settings

- **WHEN** the streamer changes the threshold value in settings
- **THEN** the new threshold takes effect immediately
- **AND** if the current viewer count is below the new threshold, tracking resumes

#### Scenario: Below threshold

- **WHEN** the viewer count is at or below the threshold
- **THEN** JOIN/PART tracking is active and the widget displays the user list normally

### Requirement: Presence only available when authenticated

JOIN/PART tracking requires the `twitch.tv/membership` capability, which is only requested on authenticated connections.

#### Scenario: Not authenticated

- **WHEN** the streamer is not logged in
- **THEN** the chat presence widget displays "Log in to track chat presence"
- **AND** no JOIN/PART events are processed
