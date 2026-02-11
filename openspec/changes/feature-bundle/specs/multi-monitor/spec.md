# Multi-monitor overlay support

## ADDED Requirements

### Requirement: Monitor enumeration

The system SHALL enumerate all available display monitors using the Tauri API.

#### Scenario: Monitor list retrieval

- **WHEN** the settings interface loads the multi-monitor configuration section
- **THEN** the system MUST call the `list_monitors` Rust command to retrieve available monitors with their names and resolutions

### Requirement: Monitor selection interface

The system SHALL provide a settings UI for selecting which monitors should display overlay windows.

#### Scenario: Monitor selection checkboxes

- **WHEN** the user views the multi-monitor settings
- **THEN** the system MUST display a checkbox list showing each available monitor with its name and resolution

#### Scenario: Selection persistence

- **WHEN** the user selects or deselects monitors
- **THEN** the system MUST persist these selections across application sessions

### Requirement: Overlay window creation

The system SHALL create a WebviewWindow for each selected monitor.

#### Scenario: Window creation for selected monitor

- **WHEN** a monitor is selected in settings
- **THEN** the system MUST create a WebviewWindow positioned and sized to fill that monitor

#### Scenario: Window removal for deselected monitor

- **WHEN** a previously selected monitor is deselected
- **THEN** the system MUST close the corresponding WebviewWindow

### Requirement: Window positioning and sizing

The system SHALL position and size overlay windows to match their target monitors.

#### Scenario: Full monitor coverage

- **WHEN** an overlay window is created for a monitor
- **THEN** the window MUST be maximised and positioned on the target monitor's display area

### Requirement: Primary and secondary window roles

The system SHALL designate the initial window as primary (with edit capabilities) and additional monitor windows as secondary (display-only).

#### Scenario: Primary window edit mode

- **WHEN** the user interacts with the primary window
- **THEN** the system MUST allow access to edit mode and widget configuration

#### Scenario: Secondary window display-only

- **WHEN** the user interacts with a secondary monitor window
- **THEN** the system MUST display widgets without providing edit mode access

### Requirement: State synchronisation

The system SHALL synchronise overlay state from the primary window to all secondary windows using Tauri events.

#### Scenario: Widget state propagation

- **WHEN** widget state changes in the primary window
- **THEN** the system MUST emit Tauri events to update all secondary windows with the new state

#### Scenario: Secondary window state display

- **WHEN** a secondary window receives a state update event
- **THEN** the window MUST render the updated widget state

### Requirement: Disconnected monitor handling

The system SHALL handle scenarios where a previously selected monitor is no longer available.

#### Scenario: Missing monitor on startup

- **WHEN** the application starts and a previously selected monitor is not connected
- **THEN** the system MUST skip creating a window for that monitor and continue normally

#### Scenario: Monitor disconnection during runtime

- **WHEN** a monitor displaying an overlay window is disconnected
- **THEN** the system MUST gracefully close the corresponding window without affecting other windows
