## Context

The overlay app uses a Zustand store (`src/stores/overlay.ts`) for global settings and per-widget instance config via `WidgetInstance.config`. Widgets render inside a `Widget` wrapper (`src/widgets/Widget.tsx`) that applies edit-mode styling (`bg-black/50 rounded-lg backdrop-blur-sm`) and opacity. The stream title widget already has a `showOutsideEditMode` config field but no settings UI to toggle it. Chat message TTL is a hardcoded constant. Rounded corners are scattered across widgets as hardcoded Tailwind classes (`rounded`, `rounded-lg`, `rounded-xl`).

## Goals / Non-goals

**Goals:**
- Expose stream title display toggle and per-widget styling (font, size, colour, background) via a settings panel
- Add a global border-radius setting to the overlay store, consumed by all visible elements
- Increase chat message TTL to 3 minutes

**Non-goals:**
- Per-widget border-radius overrides (global only for now)
- Font picker with preview/live search — a simple `<select>` of common streaming fonts is sufficient
- Custom font uploads

## Decisions

### 1. Stream title config shape

Extend `StreamTitleConfig` with styling fields:

```typescript
interface StreamTitleConfig {
  showOutsideEditMode: boolean;
  fontFamily: string;      // default: "inherit"
  fontSize: number;        // default: 14 (px)
  textColour: string;      // default: "#ffffff"
  backgroundColour: string; // default: "transparent"
}
```

**Rationale:** Keeping styling in per-instance config (not the global store) lets users have different styling if the widget is ever made non-singleton. The `defaultConfig` in the registry provides sensible defaults.

**Alternative considered:** Storing in the global overlay store — rejected because these are widget-specific display preferences, not app-wide settings.

### 2. Stream title settings component

Register a `settingsComponent` on the stream-title widget definition (same pattern as `custom-text` and `stream-info`). The settings popover will contain:
- Checkbox: "Show outside edit mode" (maps to `showOutsideEditMode`)
- Select: Font family (curated list of ~10 web-safe/streaming fonts)
- Number input: Font size (px, range 10–48)
- Colour input: Text colour
- Colour input: Background colour

**Rationale:** The `WidgetSettingsPopover` in `Widget.tsx` already renders `settingsComponent` when present. This is the established pattern.

### 3. Global border-radius in the overlay store

Add to `OverlayStore`:

```typescript
borderRadius: number;           // default: 8 (px)
setBorderRadius: (px: number) => void;
```

Expose via a range slider in the appearance tab of `SettingsWidget.tsx` (range 0–24px).

**Rationale:** A single numeric value is simple to consume. Widgets read it from the store and apply as inline `style={{ borderRadius: px }}`, replacing hardcoded Tailwind `rounded-*` classes where appropriate.

**Alternative considered:** CSS custom property on `<body>` — rejected because Zustand is already the settings bus; inline styles are simpler and more explicit than cascading CSS variables in this codebase.

### 4. Consuming global border-radius

Three consumption points:
- **`Widget.tsx` content wrapper** — replace `rounded-lg` with `style={{ borderRadius }}` on the `w-full h-full overflow-hidden` div (both edit and non-edit mode)
- **Alert widgets** — replace `rounded-xl` with `style={{ borderRadius }}` on alert containers
- **Chat message bubbles** — replace `rounded` on `bg-black/30` message containers with `style={{ borderRadius }}`

Each component calls `useOverlayStore((s) => s.borderRadius)` to read the value.

**Rationale:** Minimal surface area — only three types of elements need the change. The edit-mode dashed border on `Widget.tsx` keeps its own `rounded` since it's a UI chrome element, not content.

### 5. Chat message TTL

Change `MESSAGE_TTL_MS` from `60_000` to `180_000`. Keep `SWEEP_INTERVAL_MS` at `5_000` and `FADE_DURATION_MS` at `5_000`.

**Rationale:** Simple constant change. The fade still starts 5s before expiry, giving a smooth exit. No config UI needed — this is a fixed policy change.

### 6. Font family picker — system fonts with fuzzy search

Since this is a Tauri desktop app (WebView2/Chromium), the webview has full access to OS-installed fonts. No bundling or CDN loading needed.

**Approach:**
- Use `window.queryLocalFonts()` (Chromium Local Font Access API) to enumerate all installed system fonts
- Extract unique font family names and cache them in component state on first settings open
- Render as a text input with a fuzzy-match autocomplete dropdown (fzf-style scoring)
- Use a lightweight fuzzy search library (e.g. `fzf-for-js` or similar) for ranking
- Preview the selected font inline on the input text itself (`style={{ fontFamily }}`)
- Default value: `"inherit"` (empty input shows placeholder "Default font")

```typescript
// Lazy-load system fonts on first settings open
async function loadSystemFonts(): Promise<string[]> {
  if (!("queryLocalFonts" in window)) return [];
  const fonts = await window.queryLocalFonts();
  const families = [...new Set(fonts.map((f) => f.family))];
  return families.sort();
}
```

**Rationale:** Streamers already have their preferred fonts installed (e.g. from OBS, Photoshop, etc.). System font enumeration gives them access to everything they own. Fuzzy search makes large font lists navigable without scrolling. No external font loading, no network dependency, no permission beyond the one-time browser prompt.

**Alternative considered:** Hardcoded Google Fonts list loaded via CDN — rejected because the app runs locally and the user's installed fonts are more relevant and complete.

### 7. Global widget styling with per-widget overrides

The overlay store provides global defaults for widget appearance:
- `widgetBgColour` (string, default: `"#000000"`) — background colour
- `widgetBgOpacity` (number 0–100, default: 30) — background opacity percentage
- `widgetTextColour` (string, default: `"#ffffff"`) — text colour
- `widgetLiveBg` (boolean, default: `false`) — show background in live mode (non-edit mode)
- `globalFont` (string, default: `"inherit"`) — font family for all widget content

Each `WidgetInstance` can optionally override these via per-instance fields: `bgColour`, `bgOpacity`, `textColour`, `liveBg`, `fontFamily`. When unset (`undefined`), the global value applies.

**Resolution hooks** in `Widget.tsx` implement the cascade:
- `useWidgetBgColour(instanceId)` → `instance.bgColour ?? global widgetBgColour`
- `useWidgetBgOpacity(instanceId)` → `instance.bgOpacity ?? global widgetBgOpacity`
- `useWidgetTextColour(instanceId)` → `instance.textColour ?? global widgetTextColour`
- `useWidgetFont(instanceId)` → `instance.fontFamily ?? global globalFont`
- Live background resolves inline: `instance.liveBg ?? widgetLiveBg`

**UI layout:**
- Global settings live in the Appearance tab of `SettingsWidget.tsx` under "Widget content"
- Per-widget overrides live in a collapsed `<details>` "Advanced" section in the widget settings popover
- Each override shows a reset button (×) when set, clearing back to global default
- Widgets that manage their own font (stream-title, custom-text) skip the font override

**Rationale:** Separating global defaults from per-widget overrides gives streamers one place to set their brand colours while still allowing individual widget customisation. The cascade pattern (instance > global) is consistent and predictable.

**Alternative considered:** Storing all styling in per-instance config only — rejected because it forces users to configure every widget individually, which is tedious and error-prone for consistent branding.

## Risks / Trade-offs

- **[`queryLocalFonts()` permission prompt]** → Chromium shows a one-time permission dialog. Acceptable UX since font selection is an intentional settings action. Fallback: if the API is unavailable or denied, the input still works as free-text (user types a font name manually).
- **[Fuzzy search dependency]** → Adding a small library (e.g. `fzf-for-js` ~3KB). Minimal footprint, no alternatives needed.
- **[Border-radius on alerts]** → Alerts use `rounded-xl` (12px) which may differ from the user's chosen value. The global setting replaces this, so users who prefer rounder alerts need to set a higher value globally. Acceptable trade-off for simplicity.
- **[Colour input browser support]** → `<input type="color">` is well-supported but styling varies. Wrap with a small swatch preview if needed.
- **[Per-widget opacity removed]** → The per-widget CSS opacity slider was removed because it was ambiguous with the background opacity setting. Background opacity (in Advanced) provides the same visual effect without affecting text readability.

## Open questions

- None — requirements are clear and scope is contained.
