# Settings panel

## ADDED Requirements

### Requirement: Tabbed layout

The system SHALL provide a tabbed settings panel with General, Widgets, Twitch, and Appearance tabs.

#### Scenario: Tab navigation

- **WHEN** the user opens the settings panel
- **THEN** four tabs labelled General, Widgets, Twitch, and Appearance SHALL be displayed

#### Scenario: Tab switching

- **WHEN** the user clicks on a tab
- **THEN** the settings panel SHALL display the content for that tab

### Requirement: General tab content

The system SHALL provide a General tab containing file logging toggle and restore defaults.

#### Scenario: File logging toggle

- **WHEN** the user views the General tab
- **THEN** a file logging toggle control SHALL be displayed

#### Scenario: Log folder icon

- **WHEN** the user views the General tab
- **THEN** a log folder icon button SHALL be displayed to open the log directory

#### Scenario: Restore defaults button

- **WHEN** the user views the General tab
- **THEN** a restore defaults button SHALL be displayed

#### Scenario: Restore defaults action

- **WHEN** the user clicks restore defaults
- **THEN** all application settings SHALL be reset to their default values

### Requirement: Widgets tab content

The system SHALL provide a Widgets tab containing widget picker and preset manager.

#### Scenario: Widget picker displayed

- **WHEN** the user views the Widgets tab
- **THEN** the widget picker interface SHALL be displayed

#### Scenario: Preset manager displayed

- **WHEN** the user views the Widgets tab
- **THEN** the preset manager interface SHALL be displayed

### Requirement: Twitch tab content

The system SHALL provide a Twitch tab containing account auth, channel connection, and chat commands configuration.

#### Scenario: Account auth interface

- **WHEN** the user views the Twitch tab
- **THEN** Twitch account authentication controls SHALL be displayed

#### Scenario: Channel connection interface

- **WHEN** the user views the Twitch tab
- **THEN** channel connection controls SHALL be displayed

#### Scenario: Chat commands configuration

- **WHEN** the user views the Twitch tab
- **THEN** chat commands configuration interface SHALL be displayed

### Requirement: Appearance tab content

The system SHALL provide an Appearance tab containing Twitch colours toggle, presence threshold, and global sound volume.

#### Scenario: Twitch colours toggle

- **WHEN** the user views the Appearance tab
- **THEN** a Twitch colours toggle control SHALL be displayed

#### Scenario: Presence threshold control

- **WHEN** the user views the Appearance tab
- **THEN** a presence threshold configuration control SHALL be displayed

#### Scenario: Global sound volume control

- **WHEN** the user views the Appearance tab
- **THEN** a global sound volume slider SHALL be displayed

### Requirement: Per-widget gear icon

The system SHALL display a gear icon in the widget title bar during edit mode.

#### Scenario: Gear icon in edit mode

- **WHEN** edit mode is active
- **THEN** each widget title bar SHALL display a gear icon button

#### Scenario: Gear icon hidden in view mode

- **WHEN** edit mode is not active
- **THEN** the gear icon SHALL be hidden from widget title bars

### Requirement: Settings popover

The system SHALL open a settings popover when the per-widget gear icon is clicked.

#### Scenario: Popover opens on click

- **WHEN** the user clicks a widget's gear icon
- **THEN** a settings popover SHALL open anchored to that widget

#### Scenario: Popover anchored to widget

- **WHEN** a settings popover is displayed
- **THEN** it SHALL be positioned relative to the widget whose gear icon was clicked

### Requirement: Widget-specific settings components

The system SHALL allow widget types to define custom settings components.

#### Scenario: Widget defines settings component

- **WHEN** a widget type provides a settings component
- **THEN** that component SHALL be rendered inside the per-widget settings popover

#### Scenario: Widget has no settings

- **WHEN** a widget type does not provide a settings component
- **THEN** the gear icon MAY be hidden or the popover SHALL display a message indicating no additional settings are available
