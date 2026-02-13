## MODIFIED Requirements

### Requirement: Widget background in edit mode

The widget content wrapper in `Widget.tsx` SHALL always display a solid semi-transparent background (`bg-black/50 backdrop-blur-sm`) when edit mode is active and the background is not being previewed. This replaces the previous logic that conditionally showed the actual colour when `liveBg` was enabled.

#### Scenario: Edit mode shows solid placeholder background

- **WHEN** `editMode` is `true`
- **AND** `previewBg` is `false`
- **THEN** the widget content wrapper SHALL have the class `bg-black/50 backdrop-blur-sm`
- **AND** SHALL NOT have an inline `backgroundColor` style

#### Scenario: Edit mode with preview active shows actual colours

- **WHEN** `editMode` is `true`
- **AND** `previewBg` is `true`
- **THEN** the widget content wrapper SHALL render with `backgroundColor` set to the effective colour and opacity via `hexToRgba()`
- **AND** SHALL NOT have the `bg-black/50 backdrop-blur-sm` classes

### Requirement: Widget background in live mode

The widget content wrapper SHALL always render the configured background colour and opacity in live mode. There is no longer a toggle to hide the background during live mode.

#### Scenario: Live mode always shows configured background

- **WHEN** `editMode` is `false`
- **THEN** the widget content wrapper SHALL render with `backgroundColor` set to `hexToRgba(effectiveBgColour, effectiveBgOpacity)`
- **AND** SHALL NOT have the `bg-black/50 backdrop-blur-sm` classes

#### Scenario: Zero opacity in live mode

- **WHEN** `editMode` is `false`
- **AND** `effectiveBgOpacity` is `0`
- **THEN** the widget content wrapper SHALL render with `backgroundColor` as `rgba(r, g, b, 0)` (fully transparent)
- **AND** no visual background SHALL be visible to the user

### Requirement: Background preview during slider interaction

The `previewBg` store flag SHALL be activated when the user is dragging any background opacity slider (global or per-widget) to provide a live preview of the actual background colours during edit mode.

#### Scenario: Global BG opacity slider triggers preview

- **WHEN** the user presses down on the global "BG opacity" range input in the appearance tab
- **THEN** `previewBg` SHALL be set to `true`
- **AND** when the pointer is released or capture is lost, `previewBg` SHALL be set to `false`

#### Scenario: Per-widget BG opacity slider triggers preview

- **WHEN** the user presses down on a per-widget "BG opacity" range input in the widget settings popover
- **THEN** `previewBg` SHALL be set to `true`
- **AND** when the pointer is released or capture is lost, `previewBg` SHALL be set to `false`

### Requirement: Simplified background style computation

The `Widget.tsx` content wrapper style logic SHALL be simplified from the previous `(!editMode || previewBg || (instance.liveBg ?? widgetLiveBg))` condition to `(!editMode || previewBg)`.

#### Scenario: No liveBg in style condition

- **WHEN** the widget content wrapper computes its `backgroundColor` style
- **THEN** the condition SHALL be `(!editMode || previewBg)`
- **AND** SHALL NOT reference `instance.liveBg`, `widgetLiveBg`, or any live-background state

### Requirement: Widget component no longer reads widgetLiveBg

The `Widget` component SHALL NOT subscribe to `widgetLiveBg` from the overlay store, since the field no longer exists.

#### Scenario: No widgetLiveBg selector in Widget

- **WHEN** the `Widget` component's store selectors are inspected
- **THEN** no selector SHALL reference `widgetLiveBg`
