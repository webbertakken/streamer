## REMOVED Requirements

### Requirement: Per-instance opacity field

**Reason**: The `WidgetInstance.opacity` field is dead code — no component reads or applies it to the DOM. The only working per-widget opacity mechanism is `instance.bgOpacity` (background opacity override), resolved by `useWidgetBgOpacity()` in `Widget.tsx`.

**Migration**: The persistence v2 migration strips `opacity` from all persisted instance objects. No visual change occurs because the field was never rendered. The per-widget background opacity override (`bgOpacity`) remains available.

#### Scenario: Instance opacity field removed from interface

- **WHEN** the `WidgetInstance` interface is inspected
- **THEN** the `opacity` field SHALL NOT exist
- **AND** only `bgOpacity` (optional) SHALL remain as the per-widget opacity mechanism

#### Scenario: Seeded instances omit opacity

- **WHEN** `seedInstances()` creates instances from the registry fallback path
- **THEN** each instance object SHALL NOT contain an `opacity` property

#### Scenario: New instances omit opacity

- **WHEN** `addInstance()` creates a new widget instance
- **THEN** the instance object SHALL NOT contain an `opacity` property

#### Scenario: Default layout omits opacity

- **WHEN** `default-layout.json` is read
- **THEN** no instance object SHALL contain an `opacity` field

## MODIFIED Requirements

### Requirement: Persistence migration handles opacity cleanup

The persistence layer SHALL migrate v1 data to v2 by stripping the dead `opacity` field from all persisted instances and carrying `panelBgOpacity` forward as `widgetBgOpacity`.

#### Scenario: v2 migration strips instance opacity

- **WHEN** persisted data with `_v < 2` is loaded during hydration
- **THEN** the `opacity` property SHALL be deleted from every instance object

#### Scenario: v2 migration carries panelBgOpacity to widgetBgOpacity

- **WHEN** persisted data with `_v < 2` is loaded
- **AND** `data.overlay.panelBgOpacity` is defined
- **THEN** `widgetBgOpacity` in the overlay patch SHALL be set to the `panelBgOpacity` value

#### Scenario: v2 migration with no panelBgOpacity

- **WHEN** persisted data with `_v < 2` is loaded
- **AND** `data.overlay.panelBgOpacity` is undefined
- **THEN** `widgetBgOpacity` SHALL remain at its existing or default value

#### Scenario: Hydration no longer sets default opacity on instances

- **WHEN** persisted instances are loaded during hydration
- **THEN** the migration SHALL NOT set `inst.opacity = 100` as a default
- **AND** the old-format migration path SHALL NOT include `opacity: 100` in fallback objects

#### Scenario: Persistence version bumped to 2

- **WHEN** `gatherState()` serialises the current state
- **THEN** the `_v` field SHALL be `2`

#### Scenario: panelBgOpacity excluded from gathered state

- **WHEN** `gatherState()` serialises the overlay state
- **THEN** the resulting object SHALL NOT contain a `panelBgOpacity` property

#### Scenario: Hydration no longer applies panelBgOpacity to store

- **WHEN** persisted data is loaded during hydration
- **THEN** the hydration logic SHALL NOT spread `panelBgOpacity` into the store state
