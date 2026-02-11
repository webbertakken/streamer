## Context

The overlay is a Tauri v2 desktop app with a React 19 + Zustand frontend. Widgets are rendered via a registry-based system — each widget is a React component wrapped in a `<Widget>` container that provides drag, resize, and remove controls in edit mode. State is persisted to `~/.config/streamer/settings.json` via debounced Rust IPC. Twitch integration covers OAuth (device code flow), IRC chat, EventSub WebSocket, and Helix API polling. The event bus decouples event sources from widget consumers. Currently all widgets are singleton except custom-text, and only custom-text has per-widget config (though no UI to edit it — you must edit JSON).

## Goals / Non-goals

**Goals:**
- Extend the widget system with lock, opacity, and preset management
- Add dedicated alert widgets for raids and subscriptions
- Add configurable chat bot command responses
- Add a composable stream info widget
- Improve settings UX with tabs and per-widget inline configuration
- Add connection health visibility via existing viewer count dot
- Add audio alerts with bundled and custom sound support
- Support overlay on multiple monitors simultaneously
- Add log folder shortcut and runtime log level control

**Non-goals:**
- Visual themes / global colour schemes (future enhancement)
- Chat command overlay actions (only bot text responses for now)
- Widget z-index / layering controls
- OBS integration or browser source mode
- Custom CSS injection for widgets
- Sub-only or mod-only command permissions (keep commands simple)

## Decisions

### D1: Widget lock — extend `WidgetInstance` with `locked` field

Add `locked: boolean` (default `false`) to `WidgetInstance`. In `Widget.tsx`, guard `handleDragStart`, `handleResizeStart`, and the remove button with `if (instance.locked) return`. Show a lock/unlock toggle icon in the widget title bar during edit mode.

**Alternative considered**: Separate lock state in a `Map<string, boolean>` outside the instance. Rejected — complicates persistence and requires a parallel data structure to keep in sync.

### D2: Widget opacity — CSS opacity on the content wrapper

Add `opacity: number` (default `100`, range 0–100) to `WidgetInstance`. Apply as `style={{ opacity: instance.opacity / 100 }}` on the widget's content container (not the edit-mode chrome). The slider lives in the per-widget settings panel (D5).

**Alternative considered**: Tailwind opacity classes (`opacity-50`, etc.). Rejected — only provides fixed steps; inline `style` gives smooth 0–100 range.

### D3: Widget presets — directory-based storage with import/export

Store presets in `~/.config/streamer/presets/` as individual JSON files: `{ name: string, instances: WidgetInstance[] }`. This keeps `settings.json` clean and makes import/export trivial (copy file in/out).

**Operations:**
- **Save**: Snapshot current `instances` array → write to `presets/<slug>.json`
- **Load**: Read preset file → replace `instances` in overlay store → persist
- **Delete**: Remove preset file
- **Export**: Tauri save-file dialog → write preset JSON to user-chosen path
- **Import**: Tauri open-file dialog → validate JSON → copy to presets directory

**New Rust commands**: `list_presets`, `save_preset`, `load_preset`, `delete_preset` (all operate on the presets directory). Import/export use `tauri-plugin-dialog` for file picker.

**Alternative considered**: Store presets inside `settings.json` as an array. Rejected — presets contain full widget snapshots which bloat the settings file, and individual files make import/export natural.

### D4: Alert widgets — follow the follower-alerts queue pattern

Both raid-alerts and subscription-alerts follow the exact same architecture as `follower-alerts/`:

1. Module-level queue array + listener set
2. Exported `pushRaidAlert()` / `pushSubAlert()` function
3. Event bus subscription that calls the push function when matching events arrive
4. Widget component that polls the queue, displays for 4 seconds, then pops

**Raid alert data**: `{ id, fromUsername, viewerCount }` — sourced from `channel.raid` event bus events.

**Subscription alert data**: `{ id, username, tier, isGift, gifterUsername?, message? }` — sourced from `subscribe` and `gift_sub` event bus events. Tier displayed as "Tier 1/2/3".

Sound alerts (D8) hook into the same push functions to trigger audio.

### D5: Settings panel — tabbed layout with per-widget inline settings

**Tabbed panel** with four tabs:
- **General**: file logging toggle (with log folder icon — D10), restore defaults
- **Widgets**: widget picker (add/remove), preset manager (save/load/import/export)
- **Twitch**: account auth, channel connection, chat commands config
- **Appearance**: Twitch colours toggle, presence threshold, global sound volume

**Per-widget inline settings**: In edit mode, each widget shows a gear icon in the title bar (alongside lock toggle). Clicking it opens a settings popover anchored to the widget. Each widget type defines its own settings component (or `null` if no settings). Custom-text already has a config interface — others will follow the same pattern. New configurable widgets: custom-text (existing), stream-info (section toggles), sound-alerts (per-event sounds), chat-presence (threshold).

**Alternative considered**: Sidebar settings panel. Rejected — permanently consumes screen space on the overlay, which should maximise usable area.

### D6: Chat commands — registry in overlay store, parse in IRC handler

Store commands in the overlay store (persisted): `commands: ChatCommand[]` where `ChatCommand = { trigger: string, response: string, enabled: boolean }`.

**Template variables** in responses: `{uptime}`, `{game}`, `{title}`, `{viewers}`, `{followers}`. Variables resolved at response time from store/event data.

**Parsing**: In `irc.ts` `handleMessage()`, after `parsePRIVMSG()`, check if `text` starts with a registered command trigger. If matched, resolve template variables and call the existing `sendChatMessage()`.

**Built-in commands** shipped by default (user can disable/edit):
- `!uptime` → "Stream has been live for {uptime}"
- `!game` → "Currently playing {game}"

**Cooldown**: 5-second global cooldown to prevent spam. Per-command cooldowns are a non-goal for now.

**Alternative considered**: Separate command handler module with plugin system. Rejected — overkill for simple text responses. The current approach keeps it simple and can be refactored later if commands grow complex.

### D7: Stream info widget — config-driven composable sections

Config interface:
```typescript
interface StreamInfoConfig {
  showTitle: boolean    // default: true
  showGame: boolean     // default: true
  showUptime: boolean   // default: true
  showViewers: boolean  // default: false (separate widget exists)
}
```

**Data sources:**
- Title/game: subscribe to `channel_update` events on the event bus, store latest values in component state. Initial fetch via Helix API `GET /channels` on mount.
- Uptime: subscribe to `stream_online` / `stream_offline` events. Calculate elapsed time from `stream_online` timestamp. Poll-updated via the existing Helix streams endpoint.
- Viewers: read from `viewer_count_update` events (already published by the existing poller).

Each section is a row in a compact vertical layout. Sections toggled off via config don't render.

### D8: Sound alerts — HTMLAudioElement with event bus subscription

New `src/audio/` module:

```typescript
interface SoundMapping {
  eventType: ChannelEventType
  builtIn: string | null   // e.g. "chime", "ding"
  customPath: string | null // user-provided file path
}
```

**Architecture:**
1. `src/audio/player.ts` — `playSound(soundId: string)` using `HTMLAudioElement`
2. `src/audio/sounds.ts` — sound configuration and mapping, reads from overlay store
3. Event bus subscriber that listens for configured event types and triggers playback

**Bundled sounds**: Small MP3 files in `src/assets/sounds/` (included via Vite). Ship 3–4 defaults: chime, ding, fanfare, alert.

**Custom sounds**: User selects audio files via Tauri file dialog. Path stored in settings. Playback uses `convertFileSrc()` (Tauri API) to create a URL the webview can load.

**Volume**: Global volume slider (0–100) in settings, applied via `audio.volume`.

**Alternative considered**: Web Audio API for mixing/effects. Rejected — `HTMLAudioElement` is simpler and sufficient for one-shot alert sounds. Rust-side audio via `rodio` was also considered but adds unnecessary complexity since the browser handles audio fine.

### D9: Multi-monitor — multiple Tauri WebviewWindows

Use Tauri's `availableMonitors()` to enumerate displays. Store selected monitor IDs in persisted settings. For each selected monitor, create a `WebviewWindow` positioned and sized to fill that monitor.

**State synchronisation**: Each window loads the same React app. The primary window owns the Zustand store and broadcasts state changes via Tauri events (`emit`). Secondary windows listen via `listen()` and update their local store. Edit mode only operates on the primary window — secondary windows are display-only.

**New Rust commands**: `list_monitors` (returns monitor id, name, position, size). Window creation uses Tauri's `WebviewWindow::builder()`.

**Settings UI**: Checkbox list of monitors in the Widgets tab. Each monitor shows its name/resolution. Primary monitor pre-selected.

**Alternative considered**: Single window spanning multiple monitors. Rejected — doesn't work for non-contiguous or differently-sized monitors. Tauri multi-window is the correct approach, though more complex.

### D10: Log folder shortcut — opener plugin

Add a folder icon button next to the file logging toggle in the General settings tab. On click, invoke a new Rust command `open_log_folder` that uses `opener::reveal_item_in_dir()` (from `tauri-plugin-opener`) pointing at the logs directory (`~/.config/streamer/logs/`).

### D11: Connection status — extend TwitchStore, colour the viewer count dot

Add `eventSubConnected: boolean` to `TwitchStore` (set by the EventSub module's connect/disconnect handlers, mirroring how IRC already sets `connected`).

**Viewer count dot colour logic:**
| IRC | EventSub | Dot colour | Animation |
|-----|----------|------------|-----------|
| ✓   | ✓        | Green (`bg-green-500`) | `animate-pulse` |
| ✓   | ✗        | Amber (`bg-amber-500`) | `animate-pulse` |
| ✗   | ✓        | Amber (`bg-amber-500`) | `animate-pulse` |
| ✗   | ✗        | Red (`bg-red-500`) | none |

The viewer count widget reads both `connected` and `eventSubConnected` from the Twitch store and applies the appropriate Tailwind classes.

### D12: Runtime log level — tracing reload layer + stdin reader

1. Add `env-filter` feature to `tracing-subscriber` in `Cargo.toml`
2. Replace the current `.init()` tracing setup with a `reload::Layer`:
   ```rust
   let filter = EnvFilter::new("info");
   let (filter_layer, reload_handle) = reload::Layer::new(filter);
   ```
3. Spawn a `tokio::task` that reads lines from stdin
4. Parse commands: `log <level>` where level is `trace|debug|info|warn|error`
5. On valid command, call `reload_handle.modify(|filter| *filter = EnvFilter::new(level))`
6. Print confirmation to stderr (e.g., `[log] level set to: debug`)

**Dev server only**: The stdin listener is always present but only useful when running interactively (production builds won't have a terminal attached, so it's inert).

**Alternative considered**: File-watching a log config file. More portable but less convenient than typing directly in the terminal where logs are already streaming.

### D13: Dev default layout — snapshot to source tree JSON

Dev-mode-only button in the settings panel (General tab, only visible when `import.meta.env.DEV` is true). On click:

1. Snapshot the current `instances` array from the overlay store
2. Write it to `src/assets/default-layout.json` via a new Rust command `write_default_layout`
3. `seedIfNeeded()` reads this file (imported as a Vite JSON asset) instead of constructing instances from per-widget registry defaults

The registry `defaults` (x, y, width, height) become fallbacks only — used when a widget type isn't present in `default-layout.json`. This lets the developer arrange widgets visually, click "save as defaults", and have that layout ship as the out-of-the-box experience.

**Rust command**: `write_default_layout` accepts a JSON string and writes it to the project source directory. Only callable in dev builds (guarded by `#[cfg(debug_assertions)]`).

**Alternative considered**: Overwriting `registry.ts` with code generation. Rejected — fragile, harder to maintain, and a JSON file is simpler to diff and version control.

## Risks / Trade-offs

**[Multi-window state sync complexity]** → Mitigation: Start with Tauri event broadcasting. If latency or consistency issues arise, fall back to shared file-based state or Rust-managed state. Keep secondary windows display-only (no edit mode) to reduce sync surface.

**[Sound file size in bundle]** → Mitigation: Use short, compressed MP3 clips (<50KB each). Ship only 3–4 defaults. Total bundle impact under 200KB.

**[Chat command abuse]** → Mitigation: Global 5-second cooldown. Commands only respond to triggers the streamer explicitly configured. No wildcard or regex matching.

**[Preset schema drift]** → Mitigation: Presets store raw `WidgetInstance[]` snapshots. If the `WidgetInstance` schema changes, add a version field and migration logic (same pattern as existing settings migration).

**[stdin log level on Windows]** → Mitigation: `tokio::io::stdin()` works on Windows. However, if `cargo tauri dev` pipes stdin differently, fall back to a named pipe or environment variable reload trigger. Test early on Windows.

**[Monitor enumeration on different OSes]** → Mitigation: Tauri's monitor APIs are cross-platform. Test on Windows first (primary target), document any macOS/Linux differences.
