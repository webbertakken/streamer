## Why

The `liveBg` toggle (both the global `widgetLiveBg` setting and the per-widget `instance.liveBg` override) complicates the background visibility model without adding value. Users must understand a three-way interaction between edit mode, `liveBg`, and `previewBg` to predict widget backgrounds. The simpler mental model is: edit mode always shows a solid background for easy selection, and live mode always applies the user's configured opacity/colour. Dragging BG opacity sliders should preview the actual opacity in real-time. Additionally, per-widget advanced overrides should all be individually resettable to the global default.

## What changes

- **Remove `liveBg` entirely**: delete the global `widgetLiveBg` / `toggleWidgetLiveBg` from `OverlayStore`, delete `instance.liveBg` from `WidgetInstance`, remove from `restoreDefaults()`, `default-settings.json`, `gatherState()`, and hydration
- **Simplify Widget.tsx background logic**: edit mode (not previewing) always shows `bg-black/50 backdrop-blur-sm`; edit mode with `previewBg` active shows actual `hexToRgba(effectiveBgColour, effectiveBgOpacity)`; live mode always shows actual `hexToRgba(effectiveBgColour, effectiveBgOpacity)`
- **Per-widget BG opacity slider preview**: trigger `setPreviewBg(true)` on pointer down and `setPreviewBg(false)` on pointer up for the per-widget slider in the advanced popover, matching the existing global slider pattern
- **Remove the "Show background in live mode" checkbox** from the appearance tab in `SettingsWidget.tsx`
- **Remove `liveBg` checkbox** from the per-widget advanced settings popover in `Widget.tsx`
- **Persistence migration**: add a v3 migration to strip `liveBg` from instances and `widgetLiveBg` from settings
- **Verify reset buttons**: confirm all per-widget advanced overrides (font, bg colour, bg opacity, text colour) have individual reset-to-global buttons — they already do

## Capabilities

### Modified capabilities

- `widget-opacity`: remove `liveBg` toggle from per-widget advanced overrides; add preview-on-drag for the per-widget BG opacity slider
- `settings-panel`: remove the "Show background in live mode" global checkbox from the appearance tab; remove `widgetLiveBg` from "Save as defaults" handler

## Impact

- **`src/stores/overlay.ts`** — remove `liveBg?: boolean` from `WidgetInstance`; remove `widgetLiveBg: boolean` and `toggleWidgetLiveBg` from `OverlayStore` interface and implementation; remove from `restoreDefaults()`
- **`src/stores/persistence.ts`** — bump `_v` to 3; add v3 migration to strip `liveBg` from instances and `widgetLiveBg` from settings; remove `widgetLiveBg` from `gatherState()`, `PersistedSettings`, and hydration
- **`src/widgets/Widget.tsx`** — remove `widgetLiveBg` selector; simplify background logic to: edit + not previewing = solid fallback, edit + previewing = actual colours, live = actual colours; remove the `liveBg` checkbox from `WidgetSettingsPopover` advanced section; add `onPointerDown`/`onPointerUp`/`onLostPointerCapture` handlers to the per-widget BG opacity slider for preview
- **`src/widgets/settings/SettingsWidget.tsx`** — remove `widgetLiveBg` / `toggleWidgetLiveBg` selectors; remove the "Show background in live mode" checkbox; remove `widgetLiveBg` from `handleSaveAsDefaults`
- **`src/assets/default-settings.json`** — remove `widgetLiveBg` key
