## Context

The overlay app currently has five opacity-related mechanisms, but only two are meaningfully used. `WidgetInstance.opacity` (a per-instance field, default 100) is persisted, migrated, and written to `default-layout.json` — but never applied to the DOM; no component reads it. Meanwhile, `panelBgOpacity` is a standalone global setting exclusively for the settings panel, despite being functionally identical to `widgetBgOpacity`. This creates user confusion (two background opacity sliders with unclear scope) and unnecessary complexity in the store, persistence layer, and UI.

The settings panel (`SettingsWidget.tsx`) is not a registered widget in the registry — it is a standalone component rendered directly. It currently reads `panelBgColour` and `panelBgOpacity` from the overlay store to style its background, bypassing the `useWidgetBgOpacity()` / `useWidgetBgColour()` hooks that all other widgets use.

## Goals / Non-goals

**Goals:**
- Remove the dead `instance.opacity` field from `WidgetInstance` and all references (store, seeding, persistence, default JSON)
- Remove `panelBgOpacity` as a separate global setting; the settings panel should use the same global background opacity as all other widgets (`widgetBgOpacity`)
- Preserve the user's current `panelBgOpacity` value during migration by carrying it forward as a `bgOpacity` override on a dedicated "settings panel" concept
- Remove the "Panel background opacity" slider from the appearance tab
- Unify to two opacity controls: one global (`widgetBgOpacity`) and one optional per-widget override (`instance.bgOpacity`)

**Non-goals:**
- Adding the settings panel to the widget registry (it remains a standalone component)
- Changing `panelBgColour` — this stays as a separate setting because the panel colour serves a distinct purpose (readable settings UI vs transparent overlay widgets)
- Adding a per-panel bgOpacity override UI — the global `widgetBgOpacity` slider in the appearance tab already covers this

## Decisions

### 1. Remove `instance.opacity` from `WidgetInstance`

Delete the `opacity` field from the `WidgetInstance` interface in `src/stores/overlay.ts`. Remove all references:

- **`seedInstances()`**: remove `opacity: 100` from the registry-fallback seed path
- **`addInstance()`**: remove `opacity: 100` from the new-instance spread
- **`restoreDefaults()`**: no change needed (it calls `seedInstances()` which no longer includes `opacity`)

**Rationale:** The field is dead code. No component reads `instance.opacity`. The only per-widget opacity mechanism that works is `instance.bgOpacity` (background opacity override), which is resolved by `useWidgetBgOpacity()` in `Widget.tsx`.

### 2. Remove `panelBgOpacity` from `OverlayStore`

Delete from the `OverlayStore` interface and implementation:
- `panelBgOpacity: number`
- `setPanelBgOpacity: (opacity: number) => void`

Remove from `restoreDefaults()` the `panelBgOpacity` reset.

**Rationale:** The settings panel should use the same opacity system as all other widgets. Having a separate slider creates confusion ("which opacity slider controls what?").

### 3. Settings panel uses `widgetBgOpacity` for its background

In `SettingsWidget.tsx`, replace `panelBgOpacity` reads with `widgetBgOpacity`:

```typescript
// Before
const panelBgOpacity = useOverlayStore((s) => s.panelBgOpacity);
// ...
style={{ backgroundColor: hexToRgba(panelBgColour, panelBgOpacity), borderRadius }}

// After
const widgetBgOpacity = useOverlayStore((s) => s.widgetBgOpacity);
// ...
style={{ backgroundColor: hexToRgba(panelBgColour, widgetBgOpacity), borderRadius }}
```

Note that `panelBgColour` is intentionally kept — the panel colour remains independently configurable because the settings panel needs a readable background (typically darker/more opaque) distinct from overlay widgets that are often transparent.

The `AppearanceTab` component also references `panelBgOpacity` and `setPanelBgOpacity` for the slider — these lines and the slider UI are removed entirely.

**Rationale:** The settings panel is the only component that used `panelBgOpacity`. By switching it to `widgetBgOpacity`, the panel's background opacity becomes governed by the existing "BG opacity" slider under "Widget content", which is the single source of truth.

### 4. Remove the "Panel background opacity" slider from `AppearanceTab`

In the "Panel background" section of `AppearanceTab`, remove:
- The `panelBgOpacity` store selector
- The `setPanelBgOpacity` store selector
- The entire opacity slider `<div>` block (label + range input + percentage display)

The "Panel background" section retains the colour picker and the position grid.

**Rationale:** The opacity slider is redundant once the panel uses `widgetBgOpacity`. Users control background opacity through the existing "BG opacity" slider in the "Widget content" section above.

### 5. Remove `panelBgOpacity` from `handleSaveAsDefaults` in `GeneralTab`

The dev-only "Save as defaults" handler in `GeneralTab` currently gathers `panelBgOpacity` into the settings JSON. Remove this reference.

**Rationale:** The field no longer exists in the store or in `default-settings.json`.

### 6. Persistence migration (v1 to v2)

Bump `_v` from `1` to `2` in `gatherState()`. Add a v2 migration block in `hydrate()`:

```typescript
// Migrate v2: remove dead instance.opacity; carry panelBgOpacity forward as widgetBgOpacity if set
if ((data._v ?? 0) < 2) {
  for (const inst of instances) {
    delete (inst as Record<string, unknown>).opacity;
  }
  // Carry forward panelBgOpacity as widgetBgOpacity so users keep their panel appearance
  if (data.overlay.panelBgOpacity !== undefined) {
    // Only override if widgetBgOpacity wasn't explicitly set or differs from the default
    overlayPatch.widgetBgOpacity = data.overlay.panelBgOpacity;
  }
}
```

**Migration behaviour:**
- Strip `opacity` from every persisted instance object (it was never used anyway, so no visual change)
- Carry the user's `panelBgOpacity` value forward as `widgetBgOpacity` so the settings panel retains its current appearance after the upgrade

**Rationale:** The user chose their `panelBgOpacity` value for a reason — likely to make the settings panel readable. Since the panel now reads `widgetBgOpacity`, we should migrate the value across. This does mean other widgets' background opacity will also change to match the old panel value, but this is acceptable because:
1. Most users likely haven't customised `widgetBgOpacity` separately (the default is 0, meaning fully transparent)
2. If they have, the panel opacity was probably set to match anyway
3. Users can easily readjust via the single "BG opacity" slider

**Alternative considered:** Storing the old `panelBgOpacity` as a `bgOpacity` override on a "settings widget instance" — rejected because the settings panel is not a registered widget instance. It has no `instanceId` in the instances array and is not rendered via the `Widget` wrapper. Creating a phantom instance solely for migration would add unnecessary complexity.

### 7. Update `PersistedSettings` interface

Remove `panelBgOpacity` from the `PersistedSettings.overlay` interface in `persistence.ts`. Keep the field as optional in the type during the transition (it may appear in v1 data being read), or simply allow the v2 migration to read it from the raw data before applying.

**Approach:** Keep `panelBgOpacity?: number` in the interface as a legacy field with a comment, so the migration code in `hydrate()` can read it from old data. The v2 migration block reads it but `gatherState()` no longer writes it.

### 8. Update `gatherState()`

Remove `panelBgOpacity` from the gathered overlay object. Remove `opacity` from instance serialisation — since it's deleted from the interface, TypeScript will naturally exclude it.

### 9. Update `default-settings.json`

Remove the `panelBgOpacity` key-value pair from `src/assets/default-settings.json`.

### 10. Update `default-layout.json`

Remove the `opacity` field from every instance object in `src/assets/default-layout.json`.

### 11. Clean up hydration

In `hydrate()`, remove the line that applies `panelBgOpacity` to the store:
```typescript
// Remove this line:
...(data.overlay.panelBgOpacity !== undefined && { panelBgOpacity: data.overlay.panelBgOpacity }),
```

Also remove the migration block that sets default `opacity` on instances missing it:
```typescript
// Remove these lines:
if (inst.opacity === undefined) inst.opacity = 100;
```

And in the old-format migration path, remove `opacity: 100` from the fallback object.

## Risks / Trade-offs

- **[Widget background opacity changes for existing users]** — Users who had `panelBgOpacity` set to e.g. 60 will see `widgetBgOpacity` migrate to 60, which may change the background opacity of other widgets that were previously at the default of 0. This is a one-time change and easily correctable via the single slider. The trade-off is worthwhile for removing the confusing dual-slider UX.
- **[Panel readability at low widgetBgOpacity]** — If the user sets `widgetBgOpacity` to 0, the settings panel background will also be fully transparent (relying only on the `backdrop-blur-sm` effect and `panelBgColour`). The panel retains its own colour control, so users can set a solid `panelBgColour` to compensate. The `backdrop-blur-sm` class also provides some visual separation.
- **[No per-panel opacity override UI]** — Without a dedicated panel opacity control, users cannot set the panel to a different opacity than other widgets. This is an intentional simplification. If needed in future, the panel could be added to the widget registry to gain per-instance overrides, but that is out of scope.

## Open questions

- None — the scope is contained and the migration path is straightforward.
