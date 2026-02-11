# Log folder shortcut

## ADDED Requirements

### Requirement: Log folder access button

The system SHALL provide a folder icon button in the settings General tab adjacent to the file logging toggle.

#### Scenario: Button visibility

- **WHEN** the user views the General tab in settings
- **THEN** the system MUST display a folder icon button next to the file logging toggle regardless of whether file logging is enabled

### Requirement: System file explorer integration

The system SHALL open the logs directory in the system file explorer when the folder icon button is clicked.

#### Scenario: Logs directory opening

- **WHEN** the user clicks the folder icon button
- **THEN** the system MUST open the logs directory (~/.config/streamer/logs/) in the system's default file explorer using tauri-plugin-opener

### Requirement: Graceful error handling

The system SHALL handle errors when attempting to open the logs directory.

#### Scenario: Missing logs directory

- **WHEN** the user clicks the folder icon button and the logs directory does not exist
- **THEN** the system MUST display an appropriate error message and not crash

#### Scenario: File explorer unavailable

- **WHEN** the system cannot open the file explorer
- **THEN** the system MUST display an appropriate error message to the user
