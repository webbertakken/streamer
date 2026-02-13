## Why

There are currently five distinct opacity mechanisms across the codebase, but only two are meaningfully used. `instance.opacity` is persisted and migrated but never applied to the DOM (dead code), and `panelBgOpacity` is a standalone global setting solely for the settings panel despite being functionally identical to the widget background opacity concept. This creates confusion for users (two background opacity sliders with unclear scope) and unnecessary complexity in the store, persistence layer, and UI.

## What changes

- **Remove `instance.opacity`**: delete the dead field from `WidgetInstance`, seeding logic, persistence migration, and default layout JSON
- **Remove `panelBgOpacity` as a separate global setting**: the settings panel should use the same global background opacity as all other widgets, falling back to `widgetBgOpacity`
- **Unify to two opacity controls**: one global (`widgetBgOpacity`) and one optional per-widget override (`instance.bgOpacity`) — this is the existing pattern, but the settings panel currently bypasses it
- **Settings panel uses the widget opacity system**: the settings panel reads `widgetBgOpacity` (or its own per-widget override if one exists) instead of `panelBgOpacity`
- **Remove the "Panel background opacity" slider** from the appearance tab; the existing "BG opacity" slider already controls the global default
- **Persistence migration (v2)**: strip `opacity` from persisted instances, remove `panelBgOpacity` from persisted overlay settings, and carry forward existing `panelBgOpacity` value as the settings widget's `bgOpacity` override so users do not lose their current appearance
- **Update default-settings.json**: remove `panelBgOpacity` entry
- **Update default-layout.json**: remove `opacity` field from all instances

## Capabilities

### New capabilities

_(none)_

### Modified capabilities

- `widget-opacity`: remove the dead `instance.opacity` field; the only per-widget opacity mechanism is `instance.bgOpacity` (background opacity override)
- `settings-panel`: the settings panel background now uses the global `widgetBgOpacity` default (with optional per-widget override) instead of its own `panelBgOpacity` setting; remove the dedicated "Panel background opacity" slider from the appearance tab

## Impact

- **`src/stores/overlay.ts`** — remove `instance.opacity` from `WidgetInstance` interface; remove `panelBgOpacity` / `setPanelBgOpacity` from `OverlayStore`; update `seedInstances()`, `addInstance()`, and `restoreDefaults()` to drop `opacity`
- **`src/stores/persistence.ts`** — bump `_v` to 2; migration strips `opacity` from instances; migrate `panelBgOpacity` into settings widget's `bgOpacity` override; remove `panelBgOpacity` from `gatherState()` and `PersistedSettings`
- **`src/widgets/settings/SettingsWidget.tsx`** — replace `panelBgOpacity` reads with `widgetBgOpacity` (or the settings widget's `bgOpacity` override via `useWidgetBgOpacity`); remove the "Panel background opacity" slider from `AppearanceTab`
- **`src/widgets/Widget.tsx`** — no changes expected (already uses `useWidgetBgOpacity`, does not reference `instance.opacity`)
- **`src/assets/default-settings.json`** — remove `panelBgOpacity` key
- **`src/assets/default-layout.json`** — remove `opacity` field from all instance objects
