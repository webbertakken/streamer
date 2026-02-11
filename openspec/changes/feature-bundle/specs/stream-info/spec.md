# Stream info specification

## ADDED Requirements

### Requirement: Composable section display

The widget SHALL support four independently composable sections: title, game/category, uptime, and viewer count.

#### Scenario: All sections enabled

- **WHEN** all sections are enabled in the widget configuration
- **THEN** the widget SHALL display title, game, uptime, and viewer count sections

#### Scenario: Subset of sections enabled

- **WHEN** only title and game sections are enabled in configuration
- **THEN** the widget SHALL display only title and game sections, omitting uptime and viewer count

### Requirement: Independent section toggles

The system SHALL allow each section to be independently toggled via configuration, affecting what is rendered.

#### Scenario: Section toggled off not rendered

- **WHEN** a section is toggled off in the widget configuration
- **THEN** the widget SHALL not render that section

#### Scenario: Section toggled on is rendered

- **WHEN** a section is toggled on in the widget configuration
- **THEN** the widget SHALL render that section with current data

### Requirement: Data sourced from event bus and API

The widget SHALL source stream information from event bus events (channel_update, stream_online, stream_offline, viewer_count_update) and initial Helix API fetch.

#### Scenario: Initial data loaded from Helix API

- **WHEN** the widget initialises
- **THEN** the widget SHALL fetch current stream information from the Helix API

#### Scenario: Title and game updated from channel_update event

- **WHEN** a channel_update event is published to the event bus
- **THEN** the widget SHALL update the title and game sections with the new values

#### Scenario: Viewer count updated from event bus

- **WHEN** a viewer_count_update event is published to the event bus
- **THEN** the widget SHALL update the viewer count section with the new value

### Requirement: Uptime calculated from stream start

The widget SHALL calculate uptime from the stream_online event timestamp, updating in real-time.

#### Scenario: Uptime calculated when stream is live

- **WHEN** the stream is live and the uptime section is enabled
- **THEN** the widget SHALL calculate and display uptime based on the stream_online timestamp

#### Scenario: Uptime updates in real-time

- **WHEN** the stream is live and uptime section is displayed
- **THEN** the widget SHALL update the displayed uptime periodically (e.g., every minute)

### Requirement: Offline state display

The widget SHALL display an "Offline" state when the stream is not live.

#### Scenario: Offline displayed when stream is offline

- **WHEN** a stream_offline event is received or initial fetch indicates stream is offline
- **THEN** the widget SHALL display "Offline" state

#### Scenario: Sections hidden during offline state

- **WHEN** the stream is offline
- **THEN** the widget SHALL not display uptime or viewer count sections regardless of configuration

### Requirement: Default configuration

The widget SHALL use a default configuration with title, game, and uptime enabled, and viewer count disabled.

#### Scenario: Default config on first instantiation

- **WHEN** a stream info widget is added to the overlay for the first time
- **THEN** the widget SHALL initialise with title=true, game=true, uptime=true, viewers=false

### Requirement: Multiple widget instances allowed

The system SHALL allow multiple stream info widget instances with different section configurations.

#### Scenario: Multiple instances with different configs

- **WHEN** multiple stream info widgets are added to the overlay
- **THEN** the system SHALL allow all instances and each SHALL respect its own section configuration

#### Scenario: Independent configuration per instance

- **WHEN** one stream info widget instance has title and game enabled, and another has only uptime enabled
- **THEN** each widget SHALL display only its configured sections independently
