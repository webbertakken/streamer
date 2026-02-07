## MODIFIED Requirements

### Requirement: Widget registry exists

The project MUST include a widget registry module for registering and listing widgets. The registry SHALL include the following built-in widget types: chat, viewer count, follower alerts, event feed, custom text, follow events, chat presence, and event log.

#### Scenario: Registry is importable

- **WHEN** a developer imports the widget registry
- **THEN** it exports a registration function and a way to list registered widgets
- **AND** all built-in widget types are registered

#### Scenario: New widgets registered

- **WHEN** the application initialises
- **THEN** the follow events, chat presence, and event log widgets are available in the registry alongside existing widgets
