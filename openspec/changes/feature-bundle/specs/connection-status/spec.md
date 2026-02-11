# Connection status indicator

## ADDED Requirements

### Requirement: EventSub connection state tracking

The system SHALL track the EventSub connection state in the TwitchStore alongside the existing IRC connection state.

#### Scenario: EventSub connection state available

- **WHEN** the EventSub client establishes or loses connection
- **THEN** the TwitchStore MUST update the `eventSubConnected` boolean property accordingly

### Requirement: Visual connection status indicator

The viewer count widget's status dot SHALL dynamically reflect the combined state of IRC and EventSub connections through colour and animation.

#### Scenario: Both connections active

- **WHEN** both IRC and EventSub are connected
- **THEN** the status dot MUST display green (bg-green-500) with pulse animation (animate-pulse)

#### Scenario: Partial connectivity

- **WHEN** exactly one of IRC or EventSub is connected
- **THEN** the status dot MUST display amber (bg-amber-500) with pulse animation (animate-pulse)

#### Scenario: Complete disconnection

- **WHEN** neither IRC nor EventSub is connected
- **THEN** the status dot MUST display red (bg-red-500) without pulse animation

### Requirement: Connection status tooltip

The system SHALL provide detailed connection information via tooltip when the user hovers over the status dot whilst in edit mode.

#### Scenario: Tooltip display in edit mode

- **WHEN** the user hovers over the status dot whilst edit mode is active
- **THEN** the system MUST display a tooltip showing the individual connection states for IRC and EventSub

#### Scenario: Tooltip hidden in display mode

- **WHEN** the user is not in edit mode
- **THEN** the system MUST NOT display the detailed connection tooltip
