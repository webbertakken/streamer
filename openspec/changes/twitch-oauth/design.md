## Context

The overlay connects to Twitch chat anonymously via `justinfan` IRC and has no API access. The Rust backend (`lib.rs`) currently only handles cursor passthrough. The frontend manages IRC in `src/twitch/irc.ts` and state in `src/stores/twitch.ts` (channel name + connected boolean). All widgets render inside a transparent, always-on-top Tauri window.

To enable chat sending, follower data, EventSub events, and file logging we need authenticated Twitch access and a richer Rust backend.

## Goals / Non-goals

**Goals:**
- Streamer can log in via Twitch OAuth from the settings panel (one click)
- Authenticated IRC: read chat, send messages, receive JOIN/PART membership events
- Helix API polling for follower count
- EventSub WebSocket for follow/unfollow and all available channel events
- Centralised event bus that feeds both the event log widget and file logger
- Secure token storage via OS credential manager

**Non-goals:**
- Bot account support (only the streamer's own account)
- Server-side components or webhook transport
- Chat moderation actions (ban, timeout, slow mode)
- Custom OAuth scopes UI — scopes are fixed at build time

## Decisions

### 1. OAuth flow: PKCE with localhost redirect via `tauri-plugin-oauth`

Twitch only allows HTTP redirect URIs, ruling out custom protocol handlers. `tauri-plugin-oauth` spins up a temporary localhost server on the Rust side to capture the redirect.

- **Flow**: Open system browser → Twitch consent → redirect to `http://127.0.0.1:{port}/callback` → plugin captures auth code → Rust exchanges code for tokens using PKCE verifier
- **Why not implicit grant**: Implicit is deprecated by Twitch; PKCE is the recommended flow for public clients
- **Why not embedded webview**: Security risk (app could intercept credentials); Twitch may block embedded user-agents

### 2. Token storage: `tauri-plugin-keyring` (OS credential manager)

Stores access token, refresh token, and expiry in the OS keychain (Windows Credential Manager / macOS Keychain / Linux Secret Service).

- **Why not `tauri-plugin-store`**: Writes unencrypted JSON to disk — unsuitable for secrets
- **Why not `tauri-plugin-stronghold`**: Deprecated, removed in Tauri v3
- Tokens are never sent to the frontend; Rust commands proxy all Helix API calls and provide the token to IRC via a Tauri command

### 3. Token exchange and refresh in Rust

All token operations happen in Rust:
- `auth_start` → returns the authorisation URL (with PKCE challenge)
- `auth_callback` → exchanges code for tokens, stores in keyring
- `auth_status` → returns `{ authenticated: bool, username: string | null }`
- `auth_logout` → revokes token, clears keyring
- `auth_get_token` → internal helper (not exposed to frontend) that refreshes if expired

The frontend never sees raw tokens. For IRC, a dedicated command returns just the OAuth token string needed for the `PASS` line.

### 4. IRC upgrade: authenticated with membership capability

Upgrade the existing `irc.ts` connection:
- If authenticated: `PASS oauth:<token>` + `NICK <username>` (from auth status)
- If not authenticated: fall back to `justinfan` (read-only, no membership)
- Request capabilities: `twitch.tv/tags twitch.tv/commands twitch.tv/membership`
- Parse JOIN/PART events from membership capability for chat presence tracking
- Add `sendMessage(text: string)` that sends `PRIVMSG #channel :text`

### 5. EventSub WebSocket on the frontend

Single WebSocket connection to `wss://eventsub.wss.twitch.tv/ws`:
- On welcome message, extract `session_id`
- Subscribe to events via Helix REST (proxied through Rust for auth):
  - `channel.follow` (requires `moderator:read:followers`)
  - `channel.raid`
  - `channel.update`
  - `stream.online` / `stream.offline`
  - `channel.subscribe`, `channel.subscription.gift`, `channel.subscription.message` (requires `channel:read:subscriptions`)
  - `channel.ban`, `channel.unban`
  - `channel.cheer` (requires `bits:read`)
- Handle keepalive (reconnect if no message within keepalive timeout + buffer)
- Handle `session_reconnect` by connecting to the new URL before closing old

**Why frontend, not Rust**: WebSocket in the browser is trivial; the only Rust involvement is proxying subscription creation (which needs the token).

### 6. Centralised event bus

A TypeScript module (`src/events/bus.ts`) that all event sources publish to:
- IRC handler pushes: `chat`, `join`, `part`
- EventSub handler pushes: `follow`, `unfollow`, `raid`, `subscribe`, `gift_sub`, `cheer`, `ban`, `unban`, `stream_online`, `stream_offline`, `channel_update`
- Helix poller pushes: `follower_count_update`

Each event has a common shape: `{ type, timestamp, data }`.

Consumers subscribe to the bus:
- **Event log widget**: displays all events in a scrollable feed
- **Follow events widget**: filters for follow/unfollow
- **Chat presence widget**: filters for join/part
- **File logger**: sends events to Rust for disk writing

### 7. Event log file writing via Rust

A Tauri command `append_event_log(event: string)` appends a JSON line to a log file:
- Default path: `~/.config/streamer/logs/{channel}-{date}.jsonl`
- One file per channel per day, rotated automatically
- The frontend calls this for every event from the bus
- A settings toggle controls whether file logging is active (enabled by default)
- The Rust side handles file creation, appending, and flushing — no filesystem access from the webview

### 8. Scopes

Fixed at build time: `chat:read chat:edit moderator:read:followers user:read:chat channel:read:subscriptions bits:read`

This covers: chat read/send, follower events, subscription events, cheer events, and EventSub WebSocket chat.

## Risks / Trade-offs

- **JOIN/PART unreliable above 1000 viewers** → Chat presence widget shows a clear warning and auto-disables above a configurable threshold (default 1000). The threshold is user-configurable in settings.
- **EventSub 10-second subscription window** → Must subscribe quickly after WebSocket welcome; subscriptions are batched in parallel `Promise.all`.
- **Token refresh race** → Rust token helper uses a mutex to ensure only one refresh at a time; callers retry once on 401.
- **Port conflicts for OAuth callback** → `tauri-plugin-oauth` picks a random available port; the Twitch app must be configured with `http://127.0.0.1` as the redirect domain (Twitch allows localhost without specifying port).
- **No client secret in the binary** → PKCE eliminates the need; only the client ID is bundled.
- **File I/O performance** → JSONL append is cheap; Rust buffers writes and flushes periodically rather than on every event.
