## 1. Remove `liveBg` from WidgetInstance interface

- [ ] 1.1 Delete the `liveBg?: boolean` field from the `WidgetInstance` interface in `src/stores/overlay.ts`

## 2. Remove `widgetLiveBg` and `toggleWidgetLiveBg` from OverlayStore

- [ ] 2.1 Delete `widgetLiveBg: boolean` and `toggleWidgetLiveBg: () => void` from the `OverlayStore` interface in `src/stores/overlay.ts`
- [ ] 2.2 Delete the `widgetLiveBg` initialiser and `toggleWidgetLiveBg` setter from the store implementation in `createOverlayStore()`

## 3. Remove `widgetLiveBg` from restoreDefaults

- [ ] 3.1 Remove `widgetLiveBg: defaultSettings.widgetLiveBg` from the `restoreDefaults()` reset object in `src/stores/overlay.ts`

## 4. Remove `widgetLiveBg` from default-settings.json

- [ ] 4.1 Delete the `"widgetLiveBg": false` key-value pair from `src/assets/default-settings.json`

## 5. Simplify Widget.tsx background logic

- [ ] 5.1 Remove the `widgetLiveBg` store selector (`const widgetLiveBg = useOverlayStore(...)`) from the `Widget` component in `src/widgets/Widget.tsx`
- [ ] 5.2 Simplify the content wrapper `backgroundColor` condition from `(!editMode || previewBg || (instance.liveBg ?? widgetLiveBg))` to `(!editMode || previewBg)` — edit mode shows solid placeholder, preview and live mode show actual colours

## 6. Remove liveBg per-widget override from Widget.tsx advanced settings

- [ ] 6.1 Delete the entire "Live background" checkbox `<div>` block (lines containing `instance.liveBg`, the checkbox, label, and reset button) from the `WidgetSettingsPopover` advanced section in `src/widgets/Widget.tsx`

## 7. Add previewBg pointer handlers to per-widget BG opacity slider

- [ ] 7.1 Add `onPointerDown`, `onPointerUp`, and `onLostPointerCapture` handlers to the per-widget "BG opacity" range input in `WidgetSettingsPopover` that set/clear `previewBg` via `useOverlayStore.getState().setPreviewBg()`, mirroring the global slider in `AppearanceTab`

## 8. Remove "Show background in live mode" checkbox from AppearanceTab

- [ ] 8.1 Remove the `widgetLiveBg` and `toggleWidgetLiveBg` store selectors from `AppearanceTab()` in `src/widgets/settings/SettingsWidget.tsx`
- [ ] 8.2 Delete the entire "Show background in live mode" `<label>` block (checkbox + label text) from the appearance tab

## 9. Remove widgetLiveBg from handleSaveAsDefaults in GeneralTab

- [ ] 9.1 Remove `widgetLiveBg: s.widgetLiveBg` from the `settings` object in `handleSaveAsDefaults()` in `src/widgets/settings/SettingsWidget.tsx`
- [ ] 9.2 Remove `liveBg: _lb` from the destructuring in the `cleaned` mapping of `handleSaveAsDefaults()` (the field no longer exists on `WidgetInstance`)

## 10. Update persistence layer

- [ ] 10.1 Bump `_v` from `2` to `3` in `gatherState()` in `src/stores/persistence.ts`
- [ ] 10.2 Add a v3 migration block in `hydrate()` that strips `liveBg` from every persisted instance when `_v < 3`
- [ ] 10.3 Remove `widgetLiveBg: overlay.widgetLiveBg` from the `gatherState()` overlay object
- [ ] 10.4 Remove the hydration line that spreads `widgetLiveBg` into the store (`...(data.overlay.widgetLiveBg !== undefined && { widgetLiveBg: data.overlay.widgetLiveBg })`)
- [ ] 10.5 Add a `/** @legacy read-only, stripped by v3 migration */` comment to the `widgetLiveBg?: boolean` field in the `PersistedSettings.overlay` interface (keep for migration readability)

## 11. Verify all per-widget overrides have reset buttons

- [ ] 11.1 Confirm font override (font picker + reset x) is present for non-self-font widgets
- [ ] 11.2 Confirm background colour override (colour picker + reset x) is present
- [ ] 11.3 Confirm BG opacity override (range slider + reset x) is present
- [ ] 11.4 Confirm text colour override (colour picker + reset x) is present
- [ ] 11.5 Confirm no liveBg checkbox remains in the advanced section

## 12. Verify and test

- [ ] 12.1 Run `tsc --noEmit` to confirm no type errors from removed fields
- [ ] 12.2 Run the dev server and verify edit mode shows solid `bg-black/50 backdrop-blur-sm` on all widgets
- [ ] 12.3 Verify dragging the global BG opacity slider triggers preview (actual colours visible during drag)
- [ ] 12.4 Verify dragging a per-widget BG opacity slider triggers preview
- [ ] 12.5 Verify live mode (edit mode off) always renders configured background colour and opacity
- [ ] 12.6 Verify the appearance tab no longer has a "Show background in live mode" checkbox
- [ ] 12.7 Verify widget settings popover advanced section no longer has a "Live background" checkbox
