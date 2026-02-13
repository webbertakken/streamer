## 1. Remove dead `instance.opacity` field

- [ ] 1.1 Delete the `opacity` field from the `WidgetInstance` interface in `src/stores/overlay.ts`
- [ ] 1.2 Remove `opacity: 100` from the registry-fallback seed path in `seedInstances()`
- [ ] 1.3 Remove `opacity: 100` from the new-instance spread in `addInstance()`
- [ ] 1.4 Remove the `opacity` field from every instance object in `src/assets/default-layout.json`

## 2. Remove `panelBgOpacity` from overlay store

- [ ] 2.1 Delete `panelBgOpacity: number` and `setPanelBgOpacity: (opacity: number) => void` from the `OverlayStore` interface in `src/stores/overlay.ts`
- [ ] 2.2 Delete the `panelBgOpacity` initialiser and `setPanelBgOpacity` setter from the store implementation in `createOverlayStore()`
- [ ] 2.3 Remove `panelBgOpacity` from the `restoreDefaults()` reset object

## 3. Update settings panel to use `widgetBgOpacity`

- [ ] 3.1 In `SettingsWidget()` component (`src/widgets/settings/SettingsWidget.tsx`), replace the `panelBgOpacity` store selector with `widgetBgOpacity` and update the `hexToRgba` call to use `widgetBgOpacity` while keeping `panelBgColour` as the colour
- [ ] 3.2 Remove the `panelBgOpacity` and `setPanelBgOpacity` selectors from `AppearanceTab()`
- [ ] 3.3 Remove the entire opacity slider `<div>` block (label + range input + percentage display) from the "Panel background" section in `AppearanceTab()`

## 4. Remove `panelBgOpacity` from "Save as defaults"

- [ ] 4.1 Remove the `panelBgOpacity: s.panelBgOpacity` line from `handleSaveAsDefaults()` in `GeneralTab`

## 5. Update `default-settings.json`

- [ ] 5.1 Remove the `panelBgOpacity` key-value pair from `src/assets/default-settings.json`

## 6. Persistence migration (v1 to v2)

- [ ] 6.1 Bump `_v` from `1` to `2` in `gatherState()` in `src/stores/persistence.ts`
- [ ] 6.2 Add a v2 migration block in `hydrate()` that strips `opacity` from every persisted instance and carries `panelBgOpacity` forward as `widgetBgOpacity`
- [ ] 6.3 Remove the `panelBgOpacity` property from the `gatherState()` overlay object
- [ ] 6.4 Remove the hydration line that spreads `panelBgOpacity` into the store (`...(data.overlay.panelBgOpacity !== undefined && { panelBgOpacity: data.overlay.panelBgOpacity })`)
- [ ] 6.5 Remove the `if (inst.opacity === undefined) inst.opacity = 100;` migration line from `hydrate()`
- [ ] 6.6 Remove `opacity: 100` from the old-format migration fallback object in `hydrate()`
- [ ] 6.7 Keep `panelBgOpacity?: number` in the `PersistedSettings.overlay` interface as a legacy field (with a comment) so the v2 migration can read it from old data

## 7. Verify and test

- [ ] 7.1 Run `tsc --noEmit` to confirm no type errors from removed fields
- [ ] 7.2 Run the dev server and verify the settings panel renders with `widgetBgOpacity` controlling its background opacity
- [ ] 7.3 Verify the "Panel background" section in the appearance tab shows the colour picker and position grid but no opacity slider
- [ ] 7.4 Verify the "BG opacity" slider under "Widget content" affects both widget backgrounds and the settings panel background
