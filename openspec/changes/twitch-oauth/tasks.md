## 1. Rust dependencies and plugin setup

- [x] 1.1 Add `tauri-plugin-oauth` to Cargo.toml and register in `lib.rs`
- [x] 1.2 Add `keyring` crate to Cargo.toml (direct crate, no plugin wrapper needed)
- [x] 1.3 Add `reqwest` (with TLS) to Cargo.toml for Helix API calls from Rust

## 2. OAuth PKCE flow (Rust)

- [x] 2.1 Create `src-tauri/src/auth.rs` module with PKCE helpers (code verifier, challenge generation)
- [x] 2.2 Implement `auth_start` command: generate PKCE pair, build Twitch authorisation URL with scopes, start localhost server via plugin, return URL to frontend
- [x] 2.3 Implement `auth_callback` command: exchange authorisation code for tokens using PKCE verifier, store tokens in keyring
- [x] 2.4 Implement `auth_status` command: check keyring for stored tokens, validate expiry, return `{ authenticated, username }`
- [x] 2.5 Implement `auth_logout` command: revoke token with Twitch, clear keyring entries
- [x] 2.6 Implement `auth_get_irc_token` command: return access token string for IRC PASS (refresh if needed)
- [x] 2.7 Implement token refresh helper with mutex guard to prevent concurrent refreshes

## 3. Helix API proxy (Rust)

- [x] 3.1 Implement `helix_get` command: generic authenticated GET to Helix endpoints, handles token injection and 401 retry with refresh
- [x] 3.2 Implement `eventsub_subscribe` command: POST to EventSub subscription endpoint with session ID, event type, and condition

## 4. Event log file writing (Rust)

- [x] 4.1 Implement `append_event_log` command: accept JSON string, append to `~/.config/streamer/logs/{channel}-{date}.jsonl`
- [x] 4.2 Add buffered writer that flushes periodically (not on every call)
- [x] 4.3 Handle date rollover: detect date change and open a new file

## 5. Frontend auth integration

- [x] 5.1 Create `src/twitch/auth.ts` module: `login()` calls `auth_start`, opens URL in browser; `logout()` calls `auth_logout`; `getAuthStatus()` calls `auth_status`
- [x] 5.2 Extend `src/stores/twitch.ts` with auth state: `authenticated`, `username`, `login`, `logout`, `checkAuth`
- [x] 5.3 Update settings panel: show "Log in with Twitch" button when unauthenticated, show username and "Log out" when authenticated
- [x] 5.4 Call `checkAuth` on app startup to restore session from keyring

## 6. IRC upgrade to authenticated

- [x] 6.1 Refactor `connectChat` in `src/twitch/irc.ts`: if authenticated, fetch token via `auth_get_irc_token` and send `PASS oauth:<token>` + `NICK <username>`
- [x] 6.2 Request all three capabilities when authenticated: `twitch.tv/tags twitch.tv/commands twitch.tv/membership`
- [x] 6.3 Fall back to anonymous `justinfan` with only `twitch.tv/tags` when not authenticated
- [x] 6.4 Add `sendChatMessage(text: string)` function that sends `PRIVMSG #channel :text`

## 7. Chat input in chat widget

- [x] 7.1 Add text input to `ChatWidget` below the message list
- [x] 7.2 Wire input to `sendChatMessage` on Enter keypress
- [x] 7.3 Disable input with placeholder "Log in to chat" when not authenticated
- [x] 7.4 Disable input with placeholder "Not connected" when IRC is disconnected

## 8. Event bus

- [x] 8.1 Create `src/events/bus.ts`: typed event bus with `publish(event)`, `subscribe(callback)`, `unsubscribe(callback)`
- [x] 8.2 Define event type union: `chat`, `join`, `part`, `follow`, `raid`, `subscribe`, `gift_sub`, `cheer`, `ban`, `unban`, `stream_online`, `stream_offline`, `channel_update`, `follower_count_update`
- [x] 8.3 Wire IRC message handler to publish `chat` events to the bus
- [x] 8.4 Wire IRC membership handler to publish `join`/`part` events to the bus

## 9. EventSub WebSocket (frontend)

- [x] 9.1 Create `src/twitch/eventsub.ts`: connect to `wss://eventsub.wss.twitch.tv/ws`, parse welcome message for session ID
- [x] 9.2 After welcome, subscribe to all event types in parallel via `eventsub_subscribe` Rust command
- [x] 9.3 Parse notification messages and publish typed events to the event bus
- [x] 9.4 Handle keepalive timeout: reconnect if no message within timeout + 5s buffer
- [x] 9.5 Handle `session_reconnect`: connect to new URL, close old connection after new is established
- [x] 9.6 Disconnect and suppress reconnect on logout

## 10. Follower count polling

- [x] 10.1 Create `src/twitch/helix.ts`: `fetchFollowerCount(broadcasterId)` calls `helix_get` for `/helix/channels/followers`
- [x] 10.2 Start 60-second poll interval when authenticated and connected; publish `follower_count_update` events to the bus
- [x] 10.3 Stop polling on disconnect or logout

## 11. Chat presence widget

- [x] 11.1 Create `src/widgets/chat-presence/ChatPresenceWidget.tsx` with alphabetically sorted user list and count
- [x] 11.2 Subscribe to `join`/`part` events from the bus to maintain presence set
- [x] 11.3 Show "Log in to track chat presence" when not authenticated
- [x] 11.4 Implement configurable viewer threshold (default 1000): disable tracking and show explanation when exceeded
- [x] 11.5 Add threshold setting to settings panel
- [x] 11.6 Register widget in `src/widgets/registry.ts`

## 12. Follow events widget

- [x] 12.1 Create `src/widgets/follow-events/FollowEventsWidget.tsx` with scrollable list of follow events (newest first)
- [x] 12.2 Subscribe to `follow` events from the bus
- [x] 12.3 Show "No follows yet" placeholder when empty
- [x] 12.4 Register widget in `src/widgets/registry.ts`

## 13. Event log widget

- [x] 13.1 Create `src/widgets/event-log/EventLogWidget.tsx` with scrollable chronological feed
- [x] 13.2 Subscribe to all events from the bus; cap in-memory list at 500
- [x] 13.3 Render each event with timestamp, coloured type badge, and human-readable summary
- [x] 13.4 Show "No events yet" placeholder when empty
- [x] 13.5 Register widget in `src/widgets/registry.ts`

## 14. Event log file writer (frontend)

- [x] 14.1 Create `src/events/file-logger.ts`: subscribe to bus, call `append_event_log` Rust command (fire-and-forget with error catch)
- [x] 14.2 Add file logging toggle to settings panel (enabled by default)
- [x] 14.3 Store toggle state in overlay store; skip Rust calls when disabled

## 15. Wiring and startup

- [x] 15.1 Initialise auth check, event bus, and file logger in `App.tsx` on mount
- [x] 15.2 Connect EventSub and start follower polling after successful auth
- [x] 15.3 Tear down EventSub, polling, and file logger on logout
- [x] 15.4 Verify all new widgets appear in the settings widget picker
