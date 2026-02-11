## 1. Foundation — extend WidgetInstance and overlay store

- [x] 1.1 Add `locked: boolean` (default `false`) and `opacity: number` (default `100`) fields to `WidgetInstance` interface in overlay store
- [x] 1.2 Add persistence migration to handle existing settings missing the new fields (default values)
- [x] 1.3 Add `commands: ChatCommand[]` field to overlay store for chat command registry
- [x] 1.4 Add `eventSubConnected: boolean` to TwitchStore and wire it in the EventSub connect/disconnect handlers

## 2. Widget lock

- [x] 2.1 Add lock/unlock toggle icon to `Widget.tsx` title bar (visible in edit mode only)
- [x] 2.2 Guard `handleDragStart` — early return if `instance.locked`
- [x] 2.3 Guard `handleResizeStart` — early return if `instance.locked`
- [x] 2.4 Guard remove button — hide or disable when `instance.locked`
- [x] 2.5 Verify lock state persists across app restarts

## 3. Widget opacity

- [x] 3.1 Apply `style={{ opacity: instance.opacity / 100 }}` to widget content wrapper in `Widget.tsx` (not edit chrome)
- [x] 3.2 Add opacity slider (0–100%) to per-widget settings popover (built in group 5)
- [x] 3.3 Verify opacity persists across app restarts

## 4. Settings panel — tabbed layout

- [x] 4.1 Create tab component with General, Widgets, Twitch, Appearance tabs
- [x] 4.2 Move file logging toggle + restore defaults into General tab
- [x] 4.3 Move widget picker into Widgets tab
- [x] 4.4 Move account auth + channel connection into Twitch tab
- [x] 4.5 Move Twitch colours toggle + presence threshold into Appearance tab
- [x] 4.6 Remove old flat settings layout, wire up new tabbed component

## 5. Settings panel — per-widget inline settings

- [x] 5.1 Add gear icon to `Widget.tsx` title bar (edit mode only, alongside lock icon)
- [x] 5.2 Create settings popover component anchored to widget position
- [x] 5.3 Add `settingsComponent` field to `WidgetDefinition` in registry (optional, defaults to null)
- [x] 5.4 Wire gear icon click to open/close the popover with the widget's settings component
- [x] 5.5 Create settings component for custom-text widget (text, fontSize, colour, fontFamily, textAlign)
- [x] 5.6 Add opacity slider to the base popover (available for all widget types)

## 6. Connection status indicator

- [x] 6.1 Update `ViewerCountWidget.tsx` to read `connected` and `eventSubConnected` from TwitchStore
- [x] 6.2 Implement dot colour logic: green (both), amber (partial), red (neither)
- [x] 6.3 Conditionally apply `animate-pulse` (on when any connection active, off when fully disconnected)
- [x] 6.4 Add tooltip on hover in edit mode showing IRC and EventSub status breakdown

## 7. Raid alerts widget

- [x] 7.1 Create `src/widgets/raid-alerts/` module with queue, push function, and listener pattern (matching follower-alerts)
- [x] 7.2 Define `RaidAlert` interface: `{ id, fromUsername, viewerCount }`
- [x] 7.3 Subscribe to event bus `raid` events and call `pushRaidAlert()`
- [x] 7.4 Build `RaidAlertWidget` component with 4-second auto-dismiss and animation
- [x] 7.5 Register `raid-alerts` in widget registry as singleton with defaults

## 8. Subscription alerts widget

- [x] 8.1 Create `src/widgets/subscription-alerts/` module with queue and push function
- [x] 8.2 Define `SubAlert` interface: `{ id, username, tier, isGift, gifterUsername?, message? }`
- [x] 8.3 Subscribe to event bus `subscribe` and `gift_sub` events and call `pushSubAlert()`
- [x] 8.4 Build `SubAlertWidget` component displaying tier, gifter info, and resub message
- [x] 8.5 Register `subscription-alerts` in widget registry as singleton with defaults

## 9. Stream info widget

- [x] 9.1 Create `src/widgets/stream-info/` module
- [x] 9.2 Define `StreamInfoConfig` interface: `{ showTitle, showGame, showUptime, showViewers }` with defaults
- [x] 9.3 Build component subscribing to `channel_update`, `stream_online`, `stream_offline`, `viewer_count_update` events
- [x] 9.4 Implement uptime calculation from `stream_online` timestamp with live-updating display
- [x] 9.5 Fetch initial title/game/stream status via Helix API on mount
- [x] 9.6 Render each section conditionally based on config toggles
- [x] 9.7 Create settings component for stream-info (section toggle checkboxes)
- [x] 9.8 Register `stream-info` in widget registry (not singleton) with defaults

## 10. Chat commands

- [x] 10.1 Define `ChatCommand` interface: `{ trigger, response, enabled }` and add to overlay store
- [x] 10.2 Ship built-in default commands: `!uptime` → "Stream has been live for {uptime}", `!game` → "Currently playing {game}"
- [x] 10.3 Implement template variable resolver for `{uptime}`, `{game}`, `{title}`, `{viewers}`, `{followers}`
- [x] 10.4 Add command detection in `irc.ts` `handleMessage()` after PRIVMSG parsing — check for matching triggers
- [x] 10.5 Implement 5-second global cooldown tracking
- [x] 10.6 Send responses via existing `sendChatMessage()` (skip if not authenticated)
- [x] 10.7 Build command management UI in Twitch settings tab (add, edit, delete, toggle enable/disable)

## 11. Sound alerts

- [x] 11.1 Source or create 4 small MP3 sound files (chime, ding, fanfare, alert) and add to `src/assets/sounds/`
- [x] 11.2 Create `src/audio/player.ts` with `playSound()` function using `HTMLAudioElement`
- [x] 11.3 Create `src/audio/sounds.ts` with sound mapping configuration (event type → bundled or custom sound)
- [x] 11.4 Add sound-related fields to overlay store: `soundEnabled`, `soundVolume`, `soundMappings`
- [x] 11.5 Create event bus subscriber that triggers `playSound()` for configured event types
- [x] 11.6 Implement custom sound file selection via Tauri file dialog and `convertFileSrc()` for playback URL
- [x] 11.7 Build sound configuration UI in Appearance settings tab (master toggle, volume slider, per-event sound picker)

## 12. Widget presets

- [x] 12.1 Add Rust commands: `list_presets`, `save_preset`, `load_preset`, `delete_preset` operating on `~/.config/streamer/presets/`
- [x] 12.2 Add `tauri-plugin-dialog` dependency for file picker dialogues
- [x] 12.3 Build preset manager UI in Widgets settings tab (list, save, load, delete)
- [x] 12.4 Implement save: snapshot current `instances` → write to `presets/<slug>.json`
- [x] 12.5 Implement load: read preset file → replace `instances` in overlay store → trigger persist
- [x] 12.6 Implement export: Tauri save-file dialogue → write preset JSON to user-chosen path
- [x] 12.7 Implement import: Tauri open-file dialogue → validate JSON → copy to presets directory
- [x] 12.8 Add preset schema version field for future migration support

## 13. Multi-monitor support

- [x] 13.1 Add Rust command `list_monitors` returning monitor id, name, position, and size
- [x] 13.2 Add `selectedMonitors: string[]` to persisted overlay store
- [x] 13.3 Build monitor selection UI in Widgets settings tab (checkbox list with name + resolution)
- [x] 13.4 Implement WebviewWindow creation per selected monitor (positioned and maximised on target)
- [x] 13.5 Implement state broadcast from primary window via Tauri events (`emit`)
- [x] 13.6 Implement state listener on secondary windows via Tauri events (`listen`) updating local store
- [x] 13.7 Disable edit mode controls on secondary windows (display-only)
- [x] 13.8 Handle monitor disconnect gracefully (remove window, update selection)

## 14. Log folder shortcut

- [x] 14.1 Add Rust command `open_log_folder` using `opener::reveal_item_in_dir()` for the logs directory
- [x] 14.2 Add folder icon button next to file logging toggle in General settings tab
- [x] 14.3 Wire button click to invoke `open_log_folder` command with error handling

## 15. Runtime log level control

- [x] 15.1 Add `env-filter` feature to `tracing-subscriber` in `Cargo.toml`
- [x] 15.2 Replace current tracing `.init()` with `reload::Layer` setup using `EnvFilter`
- [x] 15.3 Spawn tokio task reading stdin lines
- [x] 15.4 Parse `log <level>` commands (trace, debug, info, warn, error)
- [x] 15.5 Update filter via `reload_handle.modify()` and print confirmation to stderr
- [x] 15.6 Print usage help for invalid commands

## 16. Dev default layout

- [x] 16.1 Add Rust command `write_default_layout` guarded by `#[cfg(debug_assertions)]` that writes JSON to `src/assets/default-layout.json`
- [x] 16.2 Create initial `src/assets/default-layout.json` with current registry defaults
- [x] 16.3 Update `seedIfNeeded()` to read `default-layout.json` (Vite JSON import) instead of constructing from registry defaults
- [x] 16.4 Fall back to registry defaults for widget types not present in the JSON
- [x] 16.5 Add "Save as defaults" button in General settings tab (visible only when `import.meta.env.DEV`)
- [x] 16.6 Wire button to snapshot current `instances` and invoke `write_default_layout`
