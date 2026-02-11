## Why

The overlay is functional but minimal — widgets can't be locked, styled, or organised into presets, and key Twitch events (raids, subs) have no dedicated widgets. Streamers need more control over their overlay layout, richer Twitch integration, and quality-of-life features (sound alerts, multi-monitor, connection status) to make this a daily-driver streaming tool.

## What changes

### Widgets & UX
- **Widget lock/unlock** — per-widget lock toggle that prevents move, resize, and removal until unlocked
- **Widget opacity/transparency** — per-widget transparency slider (0–100%)
- **Widget presets** — save, load, import, and export full widget layout snapshots (positions, sizes, visibility, and per-widget config) as JSON files
- **Settings panel overhaul** — per-widget inline settings (click a widget in edit mode to configure it) and reorganised tabbed/categorised settings panel (General, Widgets, Twitch, Appearance)

### Twitch integration
- **Raid alerts widget** — dedicated alert widget for channel.raid events with raider name and viewer count display
- **Subscription alerts widget** — alert widget for channel.subscribe, channel.subscription.gift, and channel.subscription.message events with tier and gifter info
- **Chat commands** — configurable !commands that respond in chat (e.g. `!uptime` → "Stream has been live for 2h 30m")
- **Stream info widget** — composable widget with toggleable sections: stream title, game/category, uptime, and viewer count

### Quality of life
- **Connection status indicators** — the viewer count widget's red dot changes colour based on connection health (green = connected, red/amber = disconnected/reconnecting) for IRC and EventSub
- **Sound alerts** — audio notifications for events (follows, raids, subs, cheers) with bundled default sounds and support for user-provided custom audio files per event type, with volume control
- **Multi-monitor support** — settings UI with a checkbox list of available monitors; overlay appears on all selected monitors
- **Log folder shortcut** — folder icon next to the file logging toggle that opens the logs directory in the system file explorer

### Developer experience
- **Runtime log level control** — CLI stdin commands in the dev server to change Rust tracing log level on-the-fly (e.g. `log debug`, `log trace`, `log info`)
- **Save layout as defaults** — dev-mode-only button that snapshots the current widget layout and config to a `default-layout.json` file in the source tree, so `seedIfNeeded()` uses it instead of hardcoded registry defaults

## Capabilities

### New capabilities
- `widget-lock`: per-widget lock/unlock toggle preventing move, resize, and removal
- `widget-opacity`: per-widget transparency slider control
- `widget-presets`: save/load/import/export widget layout and config presets as JSON
- `settings-panel`: per-widget inline settings and tabbed/categorised settings panel overhaul
- `raid-alerts`: dedicated raid alert widget using existing EventSub channel.raid subscription
- `subscription-alerts`: alert widget for sub, gift sub, and resub events
- `chat-commands`: configurable bot responses to !commands in chat via IRC
- `stream-info`: composable stream info widget with toggleable title/game/uptime/viewers sections
- `connection-status`: connection health indicator via viewer count widget dot colour changes
- `sound-alerts`: audio notification system with bundled defaults and custom sound support per event type
- `multi-monitor`: multi-monitor overlay support with per-monitor selection in settings
- `log-folder-shortcut`: file explorer shortcut for the event log directory
- `runtime-log-level`: CLI stdin interface for changing Rust tracing log level at runtime
- `dev-default-layout`: dev-mode button to snapshot current widget layout as the default for fresh installs

### Modified capabilities

_None — no existing spec requirements are changing._

## Impact

### Frontend (`src/`)
- **Widget system** (`src/widgets/Widget.tsx`): lock state, opacity CSS, inline settings trigger
- **Overlay store** (`src/stores/overlay.ts`): new fields on `WidgetInstance` (locked, opacity), preset CRUD operations, monitor selection state
- **Settings panel** (`src/widgets/settings/`): full rewrite — tabbed layout, per-widget config panels, preset manager, monitor picker, sound config
- **New widgets**: `raid-alerts/`, `subscription-alerts/`, `stream-info/`, plus chat command config UI
- **Viewer count widget** (`src/widgets/viewer-count/`): dynamic dot colour based on connection state
- **Event bus** (`src/events/bus.ts`): may need connection status events
- **Audio system**: new module for sound playback, volume control, and custom sound file management
- **Twitch IRC** (`src/twitch/irc.ts`): command parsing and bot response logic
- **Persistence** (`src/stores/persistence.ts`): preset file I/O, sound file paths, monitor preferences

### Rust backend (`src-tauri/`)
- **New Tauri commands**: open log folder (shell/opener), list monitors, runtime log level change
- **Tracing** (`src-tauri/src/main.rs`): stdin listener for dynamic `EnvFilter` reload
- **Multi-window**: create overlay windows on selected monitors

### Assets
- Bundled default sound files (small audio clips for alert events)

### Dependencies
- Possible: Tauri monitor/window APIs (already available), `tracing-subscriber` reload layer (for runtime log level)
