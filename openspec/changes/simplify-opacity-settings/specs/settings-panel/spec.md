## REMOVED Requirements

### Requirement: Dedicated panel background opacity setting

**Reason**: The `panelBgOpacity` store field and its `setPanelBgOpacity` setter are redundant. The settings panel SHALL use the same global `widgetBgOpacity` value as all other widgets, removing the confusing dual-slider UX.

**Migration**: The v2 persistence migration carries the user's `panelBgOpacity` value forward as `widgetBgOpacity` so the settings panel retains its current appearance after upgrade.

#### Scenario: panelBgOpacity removed from overlay store

- **WHEN** the `OverlayStore` interface is inspected
- **THEN** the `panelBgOpacity` field SHALL NOT exist
- **AND** the `setPanelBgOpacity` method SHALL NOT exist

#### Scenario: restoreDefaults omits panelBgOpacity

- **WHEN** `restoreDefaults()` resets the store to default values
- **THEN** the reset object SHALL NOT include `panelBgOpacity`

#### Scenario: default-settings.json omits panelBgOpacity

- **WHEN** `default-settings.json` is read
- **THEN** the `panelBgOpacity` key SHALL NOT be present

### Requirement: Panel background opacity slider

**Reason**: The dedicated "Panel background opacity" slider in the appearance tab is redundant once the panel uses `widgetBgOpacity`. Users control background opacity through the existing "BG opacity" slider in the "Widget content" section.

**Migration**: No user action required; the existing "BG opacity" slider under "Widget content" governs all widget backgrounds including the settings panel.

#### Scenario: Opacity slider removed from panel background section

- **WHEN** the appearance tab's "Panel background" section is rendered
- **THEN** no opacity slider SHALL be displayed
- **AND** the section SHALL retain the colour picker and position grid

## MODIFIED Requirements

### Requirement: Settings panel background opacity source

The settings panel (`SettingsWidget`) SHALL read `widgetBgOpacity` from the overlay store instead of the removed `panelBgOpacity` for its background opacity. The panel background colour (`panelBgColour`) SHALL remain independently configurable.

#### Scenario: Panel uses widgetBgOpacity for background

- **WHEN** the `SettingsWidget` component renders
- **THEN** the panel background `rgba` SHALL be computed from `panelBgColour` and `widgetBgOpacity`
- **AND** `panelBgColour` SHALL still be used as the colour component (not `widgetBgColour`)

#### Scenario: Changing widgetBgOpacity affects panel background

- **WHEN** the user adjusts the "BG opacity" slider in the "Widget content" section
- **THEN** the settings panel background opacity SHALL update to match the new value

### Requirement: Save-as-defaults excludes panelBgOpacity

The dev-only "Save as defaults" handler in `GeneralTab` SHALL NOT include `panelBgOpacity` in the settings JSON it writes to disk.

#### Scenario: Defaults JSON excludes panelBgOpacity

- **WHEN** a developer clicks "Save as defaults" in dev mode
- **THEN** the written `default-settings.json` SHALL NOT contain a `panelBgOpacity` key

### Requirement: PersistedSettings retains legacy panelBgOpacity for migration

The `PersistedSettings.overlay` interface SHALL retain `panelBgOpacity` as an optional legacy field so the v2 migration code can read it from old data. The field SHALL NOT be written by `gatherState()`.

#### Scenario: Legacy field readable during migration

- **WHEN** v1 persisted data containing `panelBgOpacity` is loaded
- **THEN** the migration code SHALL be able to read `data.overlay.panelBgOpacity`
- **AND** the value SHALL be used to set `widgetBgOpacity` in the overlay patch
