## REMOVED Requirements

### Requirement: Global live-background toggle

**Reason**: The `widgetLiveBg` boolean and `toggleWidgetLiveBg` method are replaced by a simpler three-state background model: edit mode always shows a solid placeholder, live mode always applies the actual colour/opacity settings, and slider preview shows the real colours while dragging. The toggle added unnecessary cognitive load for users.

**Migration**: The v3 persistence migration strips `widgetLiveBg` from persisted settings. No visual degradation occurs because live mode now unconditionally renders the configured background colour and opacity.

#### Scenario: widgetLiveBg removed from overlay store interface

- **WHEN** the `OverlayStore` interface is inspected
- **THEN** the `widgetLiveBg` field SHALL NOT exist
- **AND** the `toggleWidgetLiveBg` method SHALL NOT exist

#### Scenario: widgetLiveBg removed from store implementation

- **WHEN** `createOverlayStore()` is inspected
- **THEN** no `widgetLiveBg` initialiser or `toggleWidgetLiveBg` setter SHALL be present

#### Scenario: widgetLiveBg removed from restoreDefaults

- **WHEN** `restoreDefaults()` resets the store to default values
- **THEN** the reset object SHALL NOT include `widgetLiveBg`

#### Scenario: widgetLiveBg removed from default-settings.json

- **WHEN** `src/assets/default-settings.json` is read
- **THEN** the `widgetLiveBg` key SHALL NOT be present

### Requirement: Per-instance live-background override

**Reason**: The `WidgetInstance.liveBg` optional field is removed alongside the global toggle. Per-widget background visibility is now governed entirely by the simplified three-state model.

**Migration**: The v3 persistence migration strips `liveBg` from all persisted instances. The v1 migration that already cleared per-widget style overrides continues to delete `liveBg` for pre-v1 data.

#### Scenario: liveBg removed from WidgetInstance interface

- **WHEN** the `WidgetInstance` interface is inspected
- **THEN** the `liveBg` field SHALL NOT exist

#### Scenario: liveBg stripped during v3 migration

- **WHEN** persisted data with `_v < 3` is loaded during hydration
- **THEN** the `liveBg` property SHALL be deleted from every instance object

#### Scenario: liveBg removed from handleSaveAsDefaults destructuring

- **WHEN** the "Save as defaults" handler strips per-widget overrides
- **THEN** the destructured fields SHALL NOT include `liveBg`

### Requirement: "Show background in live mode" checkbox in appearance tab

**Reason**: The global checkbox in `AppearanceTab` is redundant under the new three-state background model.

#### Scenario: Checkbox removed from appearance tab

- **WHEN** the appearance tab's "Widget content" section is rendered
- **THEN** no "Show background in live mode" checkbox SHALL be displayed

### Requirement: Per-widget "Live background" checkbox in advanced settings

**Reason**: The per-widget liveBg override checkbox in the `WidgetSettingsPopover` advanced section is removed alongside the global toggle.

#### Scenario: Live background checkbox removed from widget popover

- **WHEN** the advanced section of a widget's settings popover is rendered
- **THEN** no "Live background" checkbox SHALL be displayed

## MODIFIED Requirements

### Requirement: Persistence retains legacy widgetLiveBg for migration

The `PersistedSettings.overlay` interface SHALL retain `widgetLiveBg` as an optional legacy field so the v3 migration code can read (and discard) it from old data. The field SHALL NOT be written by `gatherState()`.

#### Scenario: Legacy field retained in interface

- **WHEN** the `PersistedSettings` interface is inspected
- **THEN** `widgetLiveBg?: boolean` SHALL be present in the `overlay` sub-interface with a legacy comment

#### Scenario: widgetLiveBg excluded from gatherState

- **WHEN** `gatherState()` serialises the overlay state
- **THEN** the resulting object SHALL NOT contain a `widgetLiveBg` property

#### Scenario: Hydration no longer applies widgetLiveBg to store

- **WHEN** persisted data is loaded during hydration
- **THEN** the hydration logic SHALL NOT spread `widgetLiveBg` into the store state

### Requirement: Persistence version bumped to 3

The `gatherState()` function SHALL output `_v: 3` to indicate the liveBg removal migration.

#### Scenario: Version is 3

- **WHEN** `gatherState()` serialises the current state
- **THEN** the `_v` field SHALL be `3`
