## ADDED Requirements

### Requirement: Global border-radius setting
The overlay store SHALL expose a `borderRadius` numeric field (default: 8px) that controls the corner rounding of all visible UI elements. The setting SHALL be persisted across sessions.

#### Scenario: Default border-radius applied on fresh install
- **WHEN** the app loads with no saved settings
- **THEN** all widget backgrounds, alert containers, and chat message bubbles SHALL render with `border-radius: 8px`

#### Scenario: User changes border-radius
- **WHEN** the user adjusts the border-radius slider in the appearance tab
- **THEN** all widget content wrappers, alert containers, and chat message bubbles SHALL immediately update to the new value

#### Scenario: Border-radius set to zero
- **WHEN** the user sets border-radius to 0
- **THEN** all visible elements SHALL render with sharp corners (no rounding)

### Requirement: Border-radius appearance control
The settings widget appearance tab SHALL include a range slider for border-radius with a range of 0–24px and a numeric readout of the current value.

#### Scenario: Slider displayed in appearance tab
- **WHEN** the user opens the settings widget and navigates to the appearance tab
- **THEN** a "Rounded corners" slider SHALL be visible with the current value displayed

#### Scenario: Slider updates store
- **WHEN** the user drags the rounded corners slider
- **THEN** the overlay store `borderRadius` value SHALL update to match the slider position

### Requirement: Widget wrapper consumes global border-radius
The `Widget.tsx` content wrapper SHALL apply the global `borderRadius` value as an inline style, replacing any hardcoded Tailwind `rounded-*` classes on the content div.

#### Scenario: Widget renders with global border-radius
- **WHEN** a widget is visible (edit mode or non-edit mode)
- **THEN** its content wrapper div SHALL have `style.borderRadius` set to the store value in pixels

### Requirement: Alert widgets consume global border-radius
All alert widgets (follower, raid, subscription) SHALL apply the global `borderRadius` value instead of hardcoded `rounded-xl`.

#### Scenario: Alert renders with global border-radius
- **WHEN** an alert fires (follower, raid, or subscription)
- **THEN** the alert container SHALL use `style.borderRadius` from the global store instead of `rounded-xl`

### Requirement: Chat message bubbles consume global border-radius
Chat message containers with `bg-black/30` backgrounds SHALL apply the global `borderRadius` value instead of hardcoded `rounded`.

#### Scenario: Chat message renders with global border-radius
- **WHEN** a chat message is displayed
- **THEN** the message container SHALL use `style.borderRadius` from the global store

### Requirement: Global widget background colour
The overlay store SHALL expose `widgetBgColour` (default: `"#000000"`) and `widgetBgOpacity` (default: 30) fields controlling the default background for all widget content wrappers. These SHALL be configurable via colour picker and range slider in the Appearance tab.

#### Scenario: Background applied in live mode when enabled
- **WHEN** `widgetLiveBg` is true (or a widget's `liveBg` override is true)
- **THEN** the widget content wrapper SHALL render with the effective background colour and opacity
- **AND** the background SHALL be visible in both edit mode and live mode

#### Scenario: Background hidden in live mode when disabled
- **WHEN** `widgetLiveBg` is false and the widget has no `liveBg` override
- **THEN** the widget content wrapper SHALL only show background in edit mode (with backdrop blur)

### Requirement: Global widget text colour
The overlay store SHALL expose `widgetTextColour` (default: `"#ffffff"`) controlling the default text colour for all widget content. This SHALL be configurable via colour picker in the Appearance tab.

### Requirement: Global font
The overlay store SHALL expose `globalFont` (default: `"inherit"`) controlling the default font family for all widget content. This SHALL be configurable via a font picker with fuzzy search over system fonts in the Appearance tab.

### Requirement: Per-widget style overrides
Each `WidgetInstance` SHALL support optional override fields (`bgColour`, `bgOpacity`, `textColour`, `fontFamily`, `liveBg`) that take precedence over global defaults when set. When unset (`undefined`), the global value SHALL apply.

#### Scenario: Per-widget override takes precedence
- **WHEN** a widget instance has `bgColour` set to `"#ff0000"`
- **AND** the global `widgetBgColour` is `"#000000"`
- **THEN** the widget SHALL render with a red background

#### Scenario: Per-widget override cleared
- **WHEN** the user clicks the reset button (×) next to a per-widget override
- **THEN** the override field SHALL be set to `undefined`
- **AND** the widget SHALL revert to the global default value

### Requirement: Advanced settings section
Per-widget style overrides SHALL be displayed in a collapsed `<details>` "Advanced" section within the widget settings popover. Each overrideable setting SHALL show a reset button (×) when an override is active.

#### Scenario: Advanced section collapsed by default
- **WHEN** the user opens a widget's settings popover
- **THEN** the Advanced section SHALL be collapsed (closed) by default

#### Scenario: Reset button visible only when override is set
- **WHEN** a per-widget override field is `undefined` (using global default)
- **THEN** no reset button SHALL be shown for that field
