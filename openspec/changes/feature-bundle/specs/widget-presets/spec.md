# Widget presets

## ADDED Requirements

### Requirement: Save preset

The system SHALL allow users to save the current widget layout as a named preset.

#### Scenario: Save current layout

- **WHEN** the user chooses to save a preset and provides a name
- **THEN** the current WidgetInstance[] snapshot SHALL be saved as a JSON file in `~/.config/streamer/presets/`

#### Scenario: Preset includes complete state

- **WHEN** a preset is saved
- **THEN** it SHALL include all widget positions, sizes, visibility states, lock states, opacity values, and widget-specific configuration

### Requirement: Load preset

The system SHALL allow users to load a preset, replacing the current layout.

#### Scenario: Load replaces layout

- **WHEN** the user loads a preset
- **THEN** the current widget layout SHALL be replaced with the preset's WidgetInstance[] snapshot

#### Scenario: Load restores complete state

- **WHEN** a preset is loaded
- **THEN** all widget positions, sizes, visibility, lock states, opacity, and configuration SHALL be restored

### Requirement: Delete preset

The system SHALL allow users to delete saved presets.

#### Scenario: Delete removes preset file

- **WHEN** the user deletes a preset
- **THEN** the corresponding JSON file SHALL be removed from `~/.config/streamer/presets/`

#### Scenario: Deleted preset unavailable

- **WHEN** a preset has been deleted
- **THEN** it SHALL no longer appear in the preset manager list

### Requirement: Export preset

The system SHALL allow users to export a preset to a user-chosen file path.

#### Scenario: Export via file dialogue

- **WHEN** the user chooses to export a preset
- **THEN** a Tauri file save dialogue SHALL be displayed

#### Scenario: Export writes JSON

- **WHEN** the user selects a file path in the export dialogue
- **THEN** the preset JSON SHALL be written to the chosen location

### Requirement: Import preset

The system SHALL allow users to import a preset from a file with JSON validation.

#### Scenario: Import via file dialogue

- **WHEN** the user chooses to import a preset
- **THEN** a Tauri file open dialogue SHALL be displayed

#### Scenario: Import validates structure

- **WHEN** the user selects a file to import
- **THEN** the system SHALL validate that the file contains valid preset JSON structure

#### Scenario: Invalid import rejected

- **WHEN** an imported file fails JSON validation
- **THEN** the system SHALL display an error message and SHALL NOT save the preset

#### Scenario: Valid import saved

- **WHEN** an imported file passes validation
- **THEN** the preset SHALL be saved to `~/.config/streamer/presets/` and appear in the preset manager

### Requirement: Preset manager UI

The system SHALL provide a preset manager interface in the settings Widgets tab.

#### Scenario: Preset manager accessible

- **WHEN** the user opens settings and navigates to the Widgets tab
- **THEN** the preset manager interface SHALL be displayed

#### Scenario: Preset manager lists presets

- **WHEN** the preset manager is displayed
- **THEN** it SHALL show a list of all available presets with their names

#### Scenario: Preset manager actions available

- **WHEN** the preset manager is displayed
- **THEN** it SHALL provide controls for save, load, delete, import, and export operations

### Requirement: Preset snapshot completeness

The system SHALL ensure presets capture the complete WidgetInstance[] state.

#### Scenario: Preset includes all instances

- **WHEN** a preset is saved
- **THEN** it SHALL include every widget instance currently in the layout

#### Scenario: Preset structure format

- **WHEN** a preset is saved
- **THEN** it SHALL be stored as JSON with structure `{ name: string, instances: WidgetInstance[] }`
