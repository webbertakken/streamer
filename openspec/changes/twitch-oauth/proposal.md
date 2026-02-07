## Why

The overlay currently connects to Twitch chat anonymously (read-only). To send chat messages, show follower counts, receive follow/unfollow events, track who joins or leaves chat, and maintain a persistent log of all channel activity, we need an authenticated connection via Twitch OAuth.

## What changes

- Add a Twitch OAuth flow so the streamer can log in with their Twitch account from the overlay settings
- Upgrade the IRC connection from anonymous (`justinfan`) to authenticated, enabling chat send
- Add a chat input to the existing chat widget
- Poll the Helix API for follower count and display it in the existing viewer count widget (or a dedicated widget)
- Subscribe to follow/unfollow events via EventSub (WebSocket transport) and display them in a new follow events widget
- Track IRC JOIN/PART membership events and display a "viewers in chat" list/count, with a configurable viewer threshold above which the feature disables itself (default: 1000) — the UI must make the limitation clear
- Store the OAuth token securely on the Rust side (not in localStorage)
- Add an event log widget that aggregates all channel events (chat messages, follows, unfollows, raids, joins, parts, subs, bans, etc.) into a single scrollable feed — anything we can get our hands on
- The event log optionally writes to a file on disk (enabled by default), managed via a Tauri command so the frontend doesn't need filesystem access

## Capabilities

### New capabilities
- `twitch-auth`: OAuth PKCE flow, token storage, refresh, and revocation
- `chat-send`: Authenticated IRC connection and chat input UI
- `follow-events`: EventSub WebSocket subscription for follow/unfollow events, displayed in a dedicated widget
- `chat-presence`: IRC JOIN/PART tracking with configurable viewer threshold and clear UX around the limitation
- `event-log`: Aggregated channel event feed widget with optional file logging (enabled by default)

### Modified capabilities
- `project-scaffold`: The widget registry gains new widget types (follow events, chat presence); the chat widget gains an input field

## Impact

- **New dependencies**: None expected — Tauri can handle OAuth redirect via a localhost server or deep link; WebSocket for EventSub reuses browser APIs
- **Rust side**: New commands for secure token storage (Tauri's `tauri-plugin-store` or OS keychain) and possibly a localhost callback server for the OAuth redirect
- **Twitch scopes required**: `chat:read`, `chat:edit`, `moderator:read:followers`, `user:read:chat`
- **API rate limits**: Helix polling should respect rate limits (800 points/min for authenticated requests); follower count polled every 30-60s
- **Filesystem**: Event log writes to a configurable path via Rust (default: `logs/` in the app data directory). File writing is behind a Tauri command, not done in the webview
- **Security**: Client ID can be bundled; client secret must NOT be bundled (PKCE flow avoids needing it). Tokens stored in OS keychain or encrypted store, never in webview localStorage
