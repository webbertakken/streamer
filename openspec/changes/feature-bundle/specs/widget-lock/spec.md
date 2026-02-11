# Widget lock

## ADDED Requirements

### Requirement: Lock toggle visibility

The system SHALL display a lock toggle control in the widget title bar only when edit mode is active.

#### Scenario: Lock toggle appears in edit mode

- **WHEN** the user enables edit mode
- **THEN** each widget title bar SHALL display a lock icon button

#### Scenario: Lock toggle hidden in view mode

- **WHEN** the user disables edit mode
- **THEN** the lock icon button SHALL be hidden from all widget title bars

### Requirement: Locked prevents drag

The system SHALL prevent dragging of locked widgets.

#### Scenario: Locked widget cannot be moved

- **WHEN** a widget is locked
- **THEN** the user MUST NOT be able to drag the widget to a new position

#### Scenario: Unlocked widget can be moved

- **WHEN** a widget is unlocked
- **THEN** the user SHALL be able to drag the widget to reposition it

### Requirement: Locked prevents resize

The system SHALL prevent resizing of locked widgets.

#### Scenario: Locked widget cannot be resized

- **WHEN** a widget is locked
- **THEN** the user MUST NOT be able to resize the widget using resize handles

#### Scenario: Unlocked widget can be resized

- **WHEN** a widget is unlocked
- **THEN** the user SHALL be able to resize the widget using resize handles

### Requirement: Locked prevents removal

The system SHALL prevent removal of locked widgets.

#### Scenario: Locked widget cannot be removed

- **WHEN** a widget is locked
- **THEN** the remove/delete control SHALL be disabled or hidden

#### Scenario: Unlocked widget can be removed

- **WHEN** a widget is unlocked
- **THEN** the user SHALL be able to remove the widget from the layout

### Requirement: Lock state persisted

The system SHALL persist widget lock state across application sessions.

#### Scenario: Lock state saved

- **WHEN** the user locks or unlocks a widget
- **THEN** the lock state SHALL be saved to the WidgetInstance configuration

#### Scenario: Lock state restored

- **WHEN** the application loads a layout
- **THEN** each widget SHALL restore its previously saved lock state
