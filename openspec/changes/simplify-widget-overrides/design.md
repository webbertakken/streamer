## Context

The overlay currently has a `liveBg` toggle at two levels: a global `widgetLiveBg` boolean in the overlay store (defaulting to `false`) and an optional per-widget `instance.liveBg` override. These control whether widget backgrounds are visible outside of edit mode. The interaction model is confusing: in `Widget.tsx`, the background colour is applied when `!editMode || previewBg || (instance.liveBg ?? widgetLiveBg)`, meaning users must understand a three-way fallback chain to predict what they see.

The `previewBg` mechanism already exists for the global BG opacity slider in `SettingsWidget.tsx` — it sets `previewBg` to `true` on pointer down and `false` on pointer up, causing `Widget.tsx` to show the actual background colours while dragging. However, the per-widget BG opacity slider in the `WidgetSettingsPopover` does not use this pattern, so users cannot preview per-widget opacity changes in real-time during drag.

All four per-widget advanced overrides (font, bg colour, bg opacity, text colour) already have reset-to-global buttons (the `x` that sets the override to `undefined`). The `liveBg` override also has a reset button, but the entire `liveBg` feature is being removed.

## Goals / Non-goals

**Goals:**
- Remove the `liveBg` toggle entirely (global and per-widget) to simplify the background visibility model
- Make edit mode always show a solid fallback background (`bg-black/50 backdrop-blur-sm`) for easy widget selection
- Make live mode always apply the actual `hexToRgba(effectiveBgColour, effectiveBgOpacity)` — no toggle needed
- Enable live preview when dragging the per-widget BG opacity slider (using the existing `previewBg` mechanism)
- Ensure all remaining per-widget advanced overrides have reset buttons (already the case)

**Non-goals:**
- Changing the global BG colour/opacity defaults or the per-widget override mechanism
- Adding new per-widget overrides
- Changing how `previewBg` works for the global slider (it already works correctly)
- Modifying the `panelBgColour` setting or the settings panel background behaviour

## Decisions

### 1. Remove `liveBg` from `WidgetInstance`

Delete `liveBg?: boolean` from the `WidgetInstance` interface in `src/stores/overlay.ts`.

**Rationale:** The field controlled whether a widget's configured background was visible in live mode. With the new model, backgrounds are always visible in live mode (governed solely by `bgColour` + `bgOpacity`). Users who want invisible backgrounds simply set `bgOpacity` to 0.

### 2. Remove `widgetLiveBg` and `toggleWidgetLiveBg` from `OverlayStore`

Delete from the `OverlayStore` interface and the `create()` implementation:
- `widgetLiveBg: boolean`
- `toggleWidgetLiveBg: () => void`

Remove `widgetLiveBg: defaultSettings.widgetLiveBg` from the store initialisation.

Remove `widgetLiveBg: defaultSettings.widgetLiveBg` from `restoreDefaults()`.

**Rationale:** The global toggle is the counterpart of the per-widget `liveBg` — both are being removed in favour of the simpler "opacity is always applied in live mode" model.

### 3. Remove `widgetLiveBg` from `default-settings.json`

Delete the `"widgetLiveBg": false` entry from `src/assets/default-settings.json`.

**Rationale:** The setting no longer exists. The file should not reference dead keys.

### 4. Simplify background logic in `Widget.tsx`

Replace the current background style computation in the content `<div>`:

```typescript
// Before
className={`w-full h-full overflow-hidden ${editMode && !previewBg ? "bg-black/50 backdrop-blur-sm" : ""}`}
style={{
  borderRadius,
  fontFamily: effectiveFont,
  backgroundColor: (!editMode || previewBg || (instance.liveBg ?? widgetLiveBg))
    ? hexToRgba(effectiveBgColour, effectiveBgOpacity)
    : undefined,
  color: effectiveTextColour,
}}

// After
className={`w-full h-full overflow-hidden ${editMode && !previewBg ? "bg-black/50 backdrop-blur-sm" : ""}`}
style={{
  borderRadius,
  fontFamily: effectiveFont,
  backgroundColor: (!editMode || previewBg)
    ? hexToRgba(effectiveBgColour, effectiveBgOpacity)
    : undefined,
  color: effectiveTextColour,
}}
```

Remove the `widgetLiveBg` selector from the component:
```typescript
// Remove this line
const widgetLiveBg = useOverlayStore((s) => s.widgetLiveBg);
```

**Background behaviour after this change:**
| State | Background |
|---|---|
| Edit mode, not previewing | `bg-black/50 backdrop-blur-sm` (solid fallback) |
| Edit mode, previewing (slider dragged) | `hexToRgba(effectiveBgColour, effectiveBgOpacity)` (actual configured colours) |
| Live mode (not in edit mode) | `hexToRgba(effectiveBgColour, effectiveBgOpacity)` (actual configured colours) |

**Rationale:** This is the simplest possible model. Edit mode shows a consistent, visible background for widget manipulation. Live mode always shows what the user configured. The `previewBg` escape hatch lets users see the actual result while adjusting sliders.

### 5. Remove `liveBg` checkbox from `WidgetSettingsPopover`

In the `WidgetSettingsPopover` component in `Widget.tsx`, remove the entire `liveBg` checkbox block (lines 417-436 in the current code):

```typescript
// Remove this entire block
<div className="flex items-center gap-2">
  <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
    <input
      type="checkbox"
      checked={instance.liveBg ?? useOverlayStore.getState().widgetLiveBg}
      onChange={() => updateInstance(instanceId, { liveBg: !(instance.liveBg ?? useOverlayStore.getState().widgetLiveBg) })}
      className="accent-blue-500"
    />
    Live background
  </label>
  {instance.liveBg !== undefined && (
    <button
      onClick={() => updateInstance(instanceId, { liveBg: undefined })}
      className="text-[10px] text-white/40 hover:text-white/60"
      title="Reset to global"
    >
      ×
    </button>
  )}
</div>
```

**Rationale:** The feature no longer exists. The advanced section will retain four overrides: font (where applicable), bg colour, bg opacity, and text colour.

### 6. Add `previewBg` handlers to the per-widget BG opacity slider

In the `WidgetSettingsPopover` component, add `onPointerDown`, `onPointerUp`, and `onLostPointerCapture` handlers to the per-widget BG opacity `<input type="range">`, mirroring the pattern used by the global slider in `SettingsWidget.tsx`:

```typescript
// Before (per-widget BG opacity slider)
<input
  type="range"
  min={0}
  max={100}
  value={instance.bgOpacity ?? useOverlayStore.getState().widgetBgOpacity}
  onChange={(e) => updateInstance(instanceId, { bgOpacity: Number(e.target.value) })}
  className="flex-1 accent-blue-500"
/>

// After
<input
  type="range"
  min={0}
  max={100}
  value={instance.bgOpacity ?? useOverlayStore.getState().widgetBgOpacity}
  onChange={(e) => updateInstance(instanceId, { bgOpacity: Number(e.target.value) })}
  onPointerDown={() => useOverlayStore.getState().setPreviewBg(true)}
  onPointerUp={() => useOverlayStore.getState().setPreviewBg(false)}
  onLostPointerCapture={() => useOverlayStore.getState().setPreviewBg(false)}
  className="flex-1 accent-blue-500"
/>
```

**Rationale:** Without this, dragging the per-widget opacity slider in edit mode shows the solid edit-mode fallback background, not the actual opacity being configured. The `previewBg` flag temporarily overrides the edit-mode fallback, letting the user see the real result. The `onLostPointerCapture` handler ensures `previewBg` is reset even if the pointer leaves the slider during drag.

### 7. Remove "Show background in live mode" from `SettingsWidget.tsx`

In the `AppearanceTab` component, remove:
- The `widgetLiveBg` selector: `const widgetLiveBg = useOverlayStore((s) => s.widgetLiveBg);`
- The `toggleWidgetLiveBg` selector: `const toggleWidgetLiveBg = useOverlayStore((s) => s.toggleWidgetLiveBg);`
- The entire checkbox block:
  ```tsx
  <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
    <input
      type="checkbox"
      checked={widgetLiveBg}
      onChange={toggleWidgetLiveBg}
      className="accent-blue-500"
    />
    Show background in live mode
  </label>
  ```

**Rationale:** The toggle no longer exists. Background visibility in live mode is now solely controlled by `bgColour` + `bgOpacity`.

### 8. Remove `widgetLiveBg` from `handleSaveAsDefaults`

In the `GeneralTab` component's `handleSaveAsDefaults` function, remove `widgetLiveBg: s.widgetLiveBg` from the settings object. Also remove `liveBg: _lb` from the destructuring that strips per-widget overrides from instances.

**Rationale:** The field no longer exists in the store or in `default-settings.json`.

### 9. Persistence migration (v3)

Bump `_v` from `2` to `3` in `gatherState()`. Add a v3 migration block in `hydrate()`:

```typescript
// Migrate v3: remove liveBg from instances and widgetLiveBg from settings
if ((data._v ?? 0) < 3) {
  for (const inst of instances) {
    delete inst.liveBg;
  }
}
```

The `widgetLiveBg` field in `PersistedSettings.overlay` is already optional and will simply be ignored during hydration (since we remove the line that reads it). No explicit deletion needed for the settings-level field — it is not written to the store and will be dropped on the next save when `gatherState()` no longer includes it.

**Migration behaviour:**
- Strip `liveBg` from every persisted instance object
- `widgetLiveBg` in persisted settings is no longer read or written — it will be dropped on the next auto-save

**Rationale:** Clean migration ensures no stale fields accumulate in persisted data. Bumping to v3 (rather than folding into the existing v2 migration) ensures users upgrading from any previous version get the correct migration applied.

### 10. Update `gatherState()` in `persistence.ts`

Remove `widgetLiveBg: overlay.widgetLiveBg` from the gathered overlay object.

### 11. Update hydration in `persistence.ts`

Remove the line that applies `widgetLiveBg` to the store:
```typescript
// Remove this line
...(data.overlay.widgetLiveBg !== undefined && { widgetLiveBg: data.overlay.widgetLiveBg }),
```

Keep `widgetLiveBg?: boolean` in the `PersistedSettings.overlay` interface as a legacy field (with a comment) so the v1 migration code that deletes `inst.liveBg` for `_v < 1` still compiles, and so the v3 migration can reference the type. It will be a read-only legacy field.

### 12. Verify per-widget reset buttons

All four remaining per-widget advanced overrides already have reset buttons:
- **Font override**: reset button shown when `instance.fontFamily` is set (line 346-353)
- **Background colour**: reset button shown when `instance.bgColour` is set (line 369-377)
- **BG opacity**: reset button shown when `instance.bgOpacity !== undefined` (line 389-397)
- **Text colour**: reset button shown when `instance.textColour` is set (line 407-415)

No changes needed here.

## Risks / Trade-offs

- **[Users who relied on `liveBg: false` lose that capability]** — Users who intentionally kept `widgetLiveBg` off (the default) to hide widget backgrounds in live mode will now see backgrounds applied. However, the default `widgetBgOpacity` is `0` (fully transparent), so the visual impact is nil for users who haven't customised opacity. Users who did set a non-zero opacity and relied on `liveBg: false` to hide it in live mode will need to set opacity back to 0. This is a minor one-time adjustment.
- **[`previewBg` is global, not per-widget]** — When the per-widget opacity slider triggers `previewBg`, all widgets switch to preview mode (showing actual backgrounds). This is the same behaviour as the global slider and is acceptable because: (a) the user is actively adjusting settings and expects to see the result, and (b) the preview state is transient (only while the slider is held down).
- **[v3 migration does not handle downgrade]** — If a user downgrades to an older version after upgrading to v3, the older version will not understand `_v: 3` and will run all migrations from v0. The v1 migration already deletes `liveBg` from instances, so this is safe. The `widgetLiveBg` setting will be missing from persisted data, causing the older version to use its default (`false`), which is the same as the previous default.

## Open questions

- None — the scope is contained and all affected files are identified.
