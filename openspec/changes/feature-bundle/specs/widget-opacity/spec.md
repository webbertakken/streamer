# Widget opacity

## ADDED Requirements

### Requirement: Opacity slider in per-widget settings

The system SHALL provide an opacity slider control in the per-widget settings popover.

#### Scenario: Opacity slider accessible

- **WHEN** the user opens the per-widget settings popover
- **THEN** an opacity slider control SHALL be displayed

#### Scenario: Opacity slider adjustable

- **WHEN** the user adjusts the opacity slider
- **THEN** the widget opacity SHALL update in real-time to reflect the selected value

### Requirement: Opacity applied to content only

The system SHALL apply opacity only to widget content, not to edit mode chrome elements.

#### Scenario: Content opacity applied

- **WHEN** a widget has opacity set below 100%
- **THEN** the widget content wrapper SHALL have the opacity applied via CSS

#### Scenario: Edit chrome unaffected

- **WHEN** a widget has opacity set below 100% and edit mode is active
- **THEN** the title bar, resize handles, and other edit chrome SHALL remain fully opaque

### Requirement: Default opacity

The system SHALL set widget opacity to 100% by default.

#### Scenario: New widget default opacity

- **WHEN** a new widget is created
- **THEN** its opacity SHALL be set to 100%

### Requirement: Opacity persisted

The system SHALL persist widget opacity across application sessions.

#### Scenario: Opacity saved

- **WHEN** the user changes a widget's opacity
- **THEN** the opacity value SHALL be saved to the WidgetInstance configuration

#### Scenario: Opacity restored

- **WHEN** the application loads a layout
- **THEN** each widget SHALL restore its previously saved opacity value

### Requirement: Opacity range

The system SHALL support opacity values from 0% to 100%.

#### Scenario: Minimum opacity

- **WHEN** the user sets opacity to 0%
- **THEN** the widget content SHALL be fully transparent

#### Scenario: Maximum opacity

- **WHEN** the user sets opacity to 100%
- **THEN** the widget content SHALL be fully opaque

#### Scenario: Intermediate opacity

- **WHEN** the user sets opacity to any value between 0% and 100%
- **THEN** the widget content SHALL be rendered with proportional transparency
