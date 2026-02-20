# Suggestion box: external research

> **Confirmed direction**: general-purpose suggestion box, stream overlay (browser source), Channel Points redemption input, persistent across streams, hotkey-driven streamer controls (next/dismiss/pin), free viewer upvoting (popularity ranking), auto-approve all submissions (trust channel point cost barrier).

## 1. Existing streaming suggestion/request systems

### StreamElements
- Cloud-based platform complementing OBS Studio
- **Media share**: viewers request videos/songs without needing to tip; includes safe mode to shield against inappropriate content
- **Chatbot (SE.Live)**: loyalty point systems, minigames, spam filtering, custom commands, Stream Store integration
- **Viewer Queue Module**: built-in queue system for "play with viewers" and similar use cases
- Overlays rendered server-side, reducing local CPU load

### Streamlabs
- Media sharing widget for video/song requests during live streams
- Alert and event system for viewer engagement
- Poll widget: viewers vote in chat, results display on screen via Browser Source or Streamlabs plugin

### Streamer.bot
- **User Queue System extension**: viewers join via chat commands or Channel Points; logs `%user%`, `%rawInput%`, or combined `%user% Suggested %rawInput%`
- Highly customisable action system with triggers, sub-actions, and built-in queue blocking state
- WebSocket client API for external integrations
- Good for power users; steep learning curve for casual streamers

### Nightbot / Moobot
- Cloud-based chat bots with custom command builders
- Moobot: type `!suggest` as a command name, set a response, and configure per-user/role permissions
- Built-in auto-mod, message filters, cooldown timers
- Simple but limited — no queue/list management, no voting, no persistence beyond chat

### Twitch "Suggestion Box" extension (v2)
- Panel extension (appears below video player)
- Viewers post suggestions; visible list for both streamer and viewers
- Streamer can accept, discuss, or decline ideas
- Active even when channel is offline
- Open-source predecessor: [guanzo/suggestion-box-react](https://github.com/guanzo/suggestion-box-react) (later rewritten in Vue)

**Assessment**: Existing tools are either too simple (chat command = fire-and-forget) or too coupled to external platforms (StreamElements/Streamlabs cloud). None offer a deeply integrated, streamer-controlled, local-first, persistent suggestion queue with configurable use cases and overlay display.

---

## 2. Twitch API deep-dive: Channel Points + EventSub

### Channel Points custom rewards (primary input method)

#### API capabilities
- Create up to 50 custom rewards per channel
- `is_user_input_required: true` — viewer must type text when redeeming (perfect for suggestions)
- `should_redemptions_skip_request_queue: false` — keeps redemptions in a queue the streamer can fulfil/cancel
- Only the app that created a reward can update/delete it (enforced by `client_id`)
- Required scope: `channel:manage:redemptions` (create/update/delete rewards + manage redemptions)
- Read-only scope: `channel:read:redemptions` (listen to redemption events only)

#### Helix endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/helix/channel_points/custom_rewards` | POST | Create "Submit Suggestion" reward |
| `/helix/channel_points/custom_rewards` | GET | List existing rewards (check if already created) |
| `/helix/channel_points/custom_rewards` | PATCH | Update reward (cost, title, enabled state) |
| `/helix/channel_points/custom_rewards` | DELETE | Remove reward on cleanup |
| `/helix/channel_points/custom_rewards/redemptions` | GET | Fetch pending redemptions |
| `/helix/channel_points/custom_rewards/redemptions` | PATCH | Fulfil or cancel a redemption |

#### Create reward request body
```json
{
  "title": "Submit Suggestion",
  "cost": 500,
  "is_enabled": true,
  "is_user_input_required": true,
  "should_redemptions_skip_request_queue": false,
  "prompt": "Type your suggestion below!"
}
```

#### Redemption lifecycle (with auto-approve)
1. Viewer redeems reward, types suggestion text
2. Redemption enters Twitch's "UNFULFILLED" queue
3. Our app receives EventSub notification with `user_input` text
4. App stores suggestion locally in SQLite with status "active" (auto-approved)
5. App immediately calls PATCH to fulfil the redemption (points consumed)
6. Suggestion appears in overlay, ranked by votes
7. Streamer interacts via widget UI: checkboxes to check off / strikethrough suggestions

### EventSub WebSocket (real-time event delivery)

#### Connection flow
1. Connect to `wss://eventsub.wss.twitch.tv/ws` (optional: `?keepalive_timeout_seconds=30`)
2. Receive `session_welcome` message containing `session.id`
3. **Within 10 seconds**: call Create EventSub Subscription API with the session ID as transport
4. Receive `notification` messages when events occur
5. Handle `session_keepalive` messages (reset timeout timer)
6. Handle `session_reconnect` messages (connect to new URL, keep old connection until welcome received on new one)

#### Subscription request
```json
{
  "type": "channel.channel_points_custom_reward_redemption.add",
  "version": "1",
  "condition": {
    "broadcaster_user_id": "12345",
    "reward_id": "abc-123-def"
  },
  "transport": {
    "method": "websocket",
    "session_id": "<from welcome message>"
  }
}
```

#### Event payload fields (key ones)
- `id` — unique redemption ID
- `user_id`, `user_login`, `user_name` — who redeemed
- `user_input` — the suggestion text (up to 200 chars)
- `status` — "unfulfilled" at time of event
- `reward.id`, `reward.title`, `reward.cost` — reward details
- `redeemed_at` — ISO 8601 timestamp

#### Important constraints
- 200-character limit on `user_input` — sufficient for most suggestions
- Requires affiliate/partner status (Channel Points prerequisite)
- Max 3 WebSocket connections per user per app (client_id)
- Max 300 EventSub subscriptions total per client_id
- Keepalive timeout: 10-600 seconds (default 10s)

#### WebSocket close codes
| Code | Meaning | Action |
|------|---------|--------|
| 4000 | Internal server error | Reconnect |
| 4001 | Client sent inbound traffic | Bug — only pong responses allowed |
| 4003 | Connection unused | Must subscribe within 10s of welcome |
| 4004 | Reconnect grace expired | 30s window missed; reconnect fresh |
| 4005 | Network timeout (transient) | Reconnect |
| 4006 | Network error (transient) | Reconnect |
| 4007 | Invalid reconnect URL | Reconnect to default URL |

#### Graceful reconnection (server-initiated)
1. Receive `session_reconnect` message with new URL
2. Immediately connect to the new URL
3. **Keep old connection open** until welcome received on new connection
4. Old connection continues delivering events during overlap — no gap
5. Subscriptions are **automatically preserved** on the new connection
6. Old connection closes with code 4004 after 30 seconds if not disconnected

#### Event delivery guarantees
- **At-least-once delivery**: Twitch resends if unsure you received a notification
- **Duplicate messages have the same message ID** — must deduplicate by tracking processed IDs
- **No replay/backfill**: events lost during connection drops (non-graceful) are not replayed

### Backfill strategy for missed redemptions (confirmed requirement)

EventSub does **not** provide replay for events missed during connection loss. However, the Helix API provides a polling endpoint to recover missed redemptions.

#### GET `/helix/channel_points/custom_rewards/redemptions`

| Parameter | Type | Description |
|-----------|------|-------------|
| `broadcaster_id` | string, required | Channel ID |
| `reward_id` | string, required | The suggestion box reward ID |
| `status` | string, required | `UNFULFILLED`, `FULFILLED`, or `CANCELED` |
| `sort` | string | `OLDEST` (default) or `NEWEST` |
| `first` | integer | Results per page (default 20, max 50) |
| `after` | string | Cursor for pagination |

**Scope**: `channel:read:redemptions` or `channel:manage:redemptions`
**Constraint**: only the app that created the reward can query its redemptions

#### Backfill algorithm (on app startup / reconnection)

```
On startup or after connection gap:
  1. Record current timestamp as t_reconnect
  2. Establish EventSub WebSocket connection
  3. Query GET /redemptions with status=UNFULFILLED, sort=OLDEST
  4. Paginate through all results
  5. For each redemption:
     a. Check if redemption.id already exists in local SQLite
     b. If not: insert as new suggestion (auto-approve, status "active")
     c. If yes: skip (already processed)
  6. Fulfil all newly inserted redemptions via PATCH
  7. Resume normal EventSub processing
```

#### Key considerations
- **Deduplication**: use `redemption_id` as the unique key — both EventSub events and backfill polling return this same ID
- **Race condition**: EventSub may deliver events for redemptions that the backfill query also returns — deduplication via `redemption_id` in SQLite handles this (INSERT OR IGNORE)
- **Timing**: query UNFULFILLED redemptions because our app auto-fulfils on receipt — any UNFULFILLED ones were missed
- **Pagination**: max 50 per page; paginate through all UNFULFILLED to catch everything
- **Missed chat votes are acceptable losses** (confirmed by user) — votes are free, no recovery needed
- **No polling loop needed**: backfill only on startup and after connection recovery, not continuous polling

### OAuth authentication for desktop apps

#### Device Code Grant Flow (recommended for desktop)
Best suited because it requires no local web server and works naturally in a desktop app context.

1. **Request device code**: POST `https://id.twitch.tv/oauth2/device` with `client_id` and `scopes`
2. **Display to user**: show verification URL + user code (e.g. "Go to twitch.tv/activate and enter code ABCDEFGH")
3. **Poll for token**: POST `https://id.twitch.tv/oauth2/token` with `grant_type=urn:ietf:params:oauth:grant-type:device_code` at the specified interval (typically 5s)
4. **Receive tokens**: `access_token`, `refresh_token`, `expires_in`

#### Token management
- Access tokens expire after ~4 hours
- Refresh tokens are **one-time use** — each refresh returns a new refresh token
- 30-day inactivity expiration on unused refresh tokens
- Store tokens securely in app data (encrypted at rest)
- Required scopes: `channel:read:redemptions` (minimum) or `channel:manage:redemptions` (to also create/manage rewards)

#### Alternative: Authorization Code Flow
- Requires a local HTTP redirect server (e.g. `localhost:port/callback`)
- More traditional OAuth flow, well-supported
- Could use Tauri's existing window system to open the auth URL

---

## 3. Overlay display: browser source (confirmed)

The user confirmed **browser source** as the overlay method. This means serving a local web page that OBS can consume as a Browser Source.

### Approach: embedded HTTP server for overlay

Spin up a minimal HTTP server (e.g. `axum`) inside the Tauri app on a configurable localhost port, serving a dedicated overlay-only HTML/JS page. OBS Browser Source points to `http://localhost:{port}/overlay`.

#### Why not `tauri-plugin-localhost`?
- Exposes the **entire app's assets** through localhost — significant security risk
- Tauri's own documentation warns: "This plugin brings considerable security risks"
- We only need to serve one lightweight overlay page, not the full app

#### Why a separate `axum` server?
- Serves **only** the overlay page — minimal attack surface
- Can bind to `127.0.0.1` only (not exposed to network)
- Already have `tokio` in the dependency tree
- Full control over routes, WebSocket for real-time updates to the overlay
- Can serve on a configurable or auto-picked port

#### Real-time overlay updates
The overlay page connects to the embedded server via WebSocket. When suggestions change (new submission, vote, dismiss, pin), the server pushes updates to all connected overlay clients.

```
Rust backend state change  ─→  axum WebSocket broadcast  ─→  overlay JS re-renders
```

#### OBS Browser Source setup
- URL: `http://localhost:{port}/overlay`
- OBS makes browser backgrounds transparent by default
- Overlay HTML uses `body { background: transparent; }` for clean compositing
- Custom CSS in OBS Browser Source: `body { background: transparent !important; margin: 0; overflow: hidden; }`

#### Overlay content: ranked list view (confirmed)
- **List view** — not single-item cycling — showing a ranked list of suggestions
- Each suggestion displays: hex ID (2-digit, e.g. `a3`), suggestion text, vote count, author
- **Configurable max unchecked items visible** (default: 7)
- **Checked/strikethrough items** shown below the active list, also with configurable max visible
- Checked items **auto-hide after a configurable duration** (e.g. 30s, 60s)
- Entrance/exit animations for new suggestions and checked-off items

#### Hex ID system
- Each suggestion gets a unique 2-digit hex identifier (00–FF, 256 possible)
- IDs displayed next to each suggestion in the widget
- Viewers reference these IDs when voting: `!vote a3`
- IDs are assigned sequentially or from a pool; recycled when suggestions are dismissed/done
- 256 is sufficient — unlikely to have more than 256 active suggestions at once

### Streamer controls: mouse-driven widget UI (confirmed, no hotkeys)

All streamer interaction happens through the widget UI — **no global hotkeys** for this feature.

#### Checkbox / strikethrough interaction
- Each suggestion has a checkbox
- Clicking the checkbox: checks off the suggestion (text gets strikethrough, item sinks to bottom of list)
- **In live mode**: checkbox only appears on hover (matching existing send message input hover-to-reveal pattern with the same delay)
- Hover-to-reveal prevents accidental clicks and keeps the UI clean during streaming

#### Implementation notes
- Widget serves as both the streamer control panel and the viewer-facing overlay
- Checkbox state change: React click handler -> Tauri command -> Rust backend -> SQLite update (status "checked") -> WebSocket broadcast to overlay -> re-render
- Checked items move to a "checked" section below active suggestions
- After configurable auto-hide duration, checked items disappear from the overlay entirely (but persist in SQLite for history)

---

## 4. Technical considerations

### Real-time update architecture
```
                    ┌──────────────────────────────────┐
                    │          Twitch services          │
                    └──┬──────────────┬────────────┬───┘
                       │              │            │
                 EventSub WS     IRC chat    Helix API
                 (redemptions)  (!vote cmds) (backfill)
                       │              │            │
                       ▼              ▼            ▼
                    ┌──────────────────────────────────┐
                    │       Rust backend (Tauri)        │
                    │                                  │
                    │  EventSub handler ─→ auto-approve│
                    │  IRC vote parser ─→ vote handler │
                    │  Backfill poller ─→ dedup+insert │
                    │            │                     │
                    │       SQLite storage (sqlx)      │
                    │            │                     │
                    │     ┌──────┴────────┐            │
                    │     ▼               ▼            │
                    │  Tauri events   axum WS broadcast│
                    │  (streamer app) (overlay clients) │
                    └─────┼───────────────┼────────────┘
                          │               │
                          ▼               ▼
                    Zustand store    OBS Browser Source
                    (streamer UI)   (list view overlay)
                          │
                          ▼
                    Widget checkbox click
                          │
                          ▼
                    Tauri command ─→ Rust backend
                    ─→ SQLite update ─→ WS broadcast
```

### Spam prevention and rate limiting
- **Channel Points cost**: primary rate limiter — viewers must spend points to submit (configurable cost)
- **Twitch reward cooldown**: Channel Points rewards have built-in per-user and global cooldown settings
- **Max queue size**: configurable cap to prevent unbounded growth (e.g. 50 active suggestions)
- **Duplicate detection**: optional fuzzy match against existing suggestions to prevent repeats

### Moderation: auto-approve (confirmed)
The user confirmed **auto-approve all submissions**, trusting the Channel Points cost as a sufficient barrier.

- All suggestions are immediately visible in the overlay upon receipt
- Redemptions are auto-fulfilled (points consumed, no refund)
- Streamer can **check off** suggestions via checkbox in the widget UI (strikethrough + sink to bottom)
- No separate moderation queue — the widget itself is the control surface
- Optional future enhancement: keyword blocklist as a safety net

### Persistence (SQLite)
SQLite is the clear choice for this Tauri app:
- Serverless, zero-config, single-file database
- `sqlx` crate: async, compile-time checked queries, SQLite support
- Supports indexes, transactions, migrations
- Database file in app data directory (`dirs::data_dir()`)
- Suggestions persist across streams by default

#### Schema sketch
```sql
CREATE TABLE suggestions (
  id INTEGER PRIMARY KEY,
  hex_id TEXT NOT NULL,           -- 2-digit hex identifier (e.g. 'a3') for viewer voting
  text TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'channel_points',
  redemption_id TEXT UNIQUE,     -- Twitch redemption ID (unique for deduplication/backfill)
  reward_id TEXT,                -- Twitch reward ID
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'checked' | 'hidden'
  votes INTEGER NOT NULL DEFAULT 0,       -- denormalised vote count for fast sorting
  session_tag TEXT,              -- optional: group suggestions by stream/topic
  created_at TEXT NOT NULL,
  checked_at TEXT                -- timestamp when checked off (for auto-hide timer)
);

CREATE TABLE votes (
  suggestion_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (suggestion_id, user_id),
  FOREIGN KEY (suggestion_id) REFERENCES suggestions(id)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_ranking ON suggestions(status, votes DESC, created_at DESC);
CREATE INDEX idx_suggestions_hex ON suggestions(hex_id) WHERE status = 'active';
CREATE INDEX idx_suggestions_session ON suggestions(session_tag);
CREATE UNIQUE INDEX idx_suggestions_redemption ON suggestions(redemption_id);
```

#### Status flow (auto-approve, checkbox-driven)
```
Channel Points redemption received
         │
         ▼
     'active'  ──checkbox click──→  'checked' (strikethrough, sinks to bottom)
                                        │
                                   auto-hide timer expires
                                        │
                                        ▼
                                    'hidden' (removed from overlay, persists in DB)
```

#### Hex ID allocation
- Pool of 256 IDs (00–FF)
- Assign next available from pool when suggestion becomes active
- Return ID to pool when suggestion transitions to "hidden"
- If pool exhausted (extremely unlikely with 256 slots), reuse oldest hidden suggestion's ID

### Voting: free upvotes (confirmed)
Viewers upvote suggestions at no cost. Most popular suggestions float to the top.

#### Chat-based voting
- **Command**: `!vote <id>` or `!vote <number>` (e.g. `!vote 3` for the 3rd suggestion)
- Requires IRC/chat integration — use `twitch-irc` crate or EventSub `channel.chat.message`
- **One vote per user per suggestion**: enforced via `votes` table unique constraint
- Free to use — no Channel Points cost

#### Ranking
- **Primary sort**: vote count (descending) — most popular at the top
- **Tiebreaker**: newest first (most recently submitted)
- The "next" hotkey advances through suggestions in ranked order
- **Pinned suggestion** is always displayed regardless of rank

#### Implementation: chat listener for votes
Since voting is chat-based, we need a chat connection in addition to EventSub:
- `twitch-irc` crate: purpose-built, async/tokio, handles IRC protocol
- Or EventSub `channel.chat.message` subscription (v1) — same WebSocket connection, but requires `user:read:chat` scope
- Parse messages matching `!vote <arg>`, validate against active suggestions, insert into `votes` table
- Emit vote count update to overlay via WebSocket

#### Anti-spam for votes
- One vote per user per suggestion (database constraint)
- No cost barrier needed since votes don't create content
- Optional: follower-only or subscriber-only voting mode

### Rust crate options

| Crate | Purpose | Notes |
|-------|---------|-------|
| `twitch_api` | Helix API + EventSub types | Mature, well-typed, 6/6 Channel Points endpoints implemented |
| `tokio-tungstenite` | WebSocket client | Standard async WS for tokio; EventSub WS + overlay WS broadcast |
| `sqlx` | SQLite database | Async, compile-time checked queries, migration support |
| `twitch-irc` | IRC chat client | Needed for `!vote` command parsing (free upvotes) |
| `axum` | HTTP server | Lightweight; serves overlay page + WebSocket for real-time updates |

The `twitch_api` crate provides typed request/response structs for all Channel Points operations:
- `CreateCustomRewardRequest` / `CreateCustomRewardBody`
- `GetCustomRewardRequest` / `CustomReward`
- `GetCustomRewardRedemptionRequest` / `CustomRewardRedemption`
- `UpdateRedemptionStatusRequest` / `UpdateRedemptionStatusBody`
- `ChannelPointsCustomRewardRedemptionAddV1` (EventSub subscription type)
- `ChannelPointsCustomRewardRedemptionAddV1Payload` (event payload)

---

## 5. Prior art and inspiration

### Music request systems
- **Moobot Song Requests**: viewers submit YouTube links via chat; songs added to a queue; widget plays from top and advances automatically
- **Streamer.bot Song Request System**: YouTube Music integration with chat commands, queue management, and OBS overlay
- **StreamElements Media Share**: viewers request videos (free or paid); queue displayed in overlay
- **Key pattern**: input (chat/redemption) -> queue (with controls) -> display (overlay) -> resolution (played/skipped)

### Topic/game suggestion systems
- **Vote-to-Play** ([guanzo/vote-to-play](https://github.com/guanzo/vote-to-play)): Twitch overlay extension; viewers vote on what streamer plays next
- **Twitch Polls overlay** ([darmiel/twitch-poll-overlay](https://github.com/darmiel/twitch-poll-overlay)): chat-based "1" and "0" voting with live overlay display
- **Suggestion Box extension** ([guanzo/suggestion-box-react](https://github.com/guanzo/suggestion-box-react)): panel extension for viewer suggestions; open source

### Common UX patterns across all systems
1. **Clear submission flow**: viewer knows exactly how to submit (command, button, redemption)
2. **Visible queue**: both streamer and optionally viewers can see current suggestions
3. **Status feedback**: viewer gets confirmation their suggestion was received
4. **Streamer controls**: easy approve/reject/pick/clear actions
5. **Overlay display**: current/top suggestion(s) shown on stream
6. **Queue progression**: automatic or manual movement through the queue

---

## 6. Recommendation: implementation plan

Given the full confirmed direction and the existing Tauri 2 + Rust + React stack:

### Phase 1 — Core MVP
- **Auth**: Device Code Grant Flow for OAuth (`channel:manage:redemptions` + `user:read:chat` scopes)
- **Reward management**: auto-create "Submit Suggestion" custom reward via Helix API on first setup
- **EventSub**: WebSocket connection for `channel.channel_points_custom_reward_redemption.add`
- **Auto-approve**: immediately store with status "active", auto-fulfil redemption
- **Hex IDs**: assign 2-digit hex identifier (00–FF) to each suggestion
- **Storage**: SQLite via `sqlx` with migrations
- **Overlay**: `axum` HTTP server on localhost serving overlay page; WebSocket for real-time updates
- **List view**: ranked list of suggestions with hex IDs, vote counts, and checkbox controls
- **Checkbox interaction**: check off suggestions (strikethrough, sink to bottom, auto-hide after timer)
- **Hover-to-reveal**: checkboxes only visible on hover in live mode (matching existing UI pattern)
- **Backfill on restart**: poll UNFULFILLED redemptions via Helix API, deduplicate by `redemption_id`
- **Persistence**: suggestions survive app restart and carry across streams

### Phase 2 — Voting + chat integration
- **Chat listener**: `twitch-irc` crate for `!vote <hex_id>` command parsing
- **Free upvotes**: one vote per user per suggestion, popularity ranking
- **Overlay ranking**: suggestions sorted by vote count, most popular shown first
- **Vote count updates**: real-time push to overlay via WebSocket

### Phase 3 — Configurability and polish
- **Session tags**: group suggestions by stream or topic for organisation
- **Customisable reward**: let streamer adjust cost, title, cooldown, prompt from app settings
- **Overlay theming**: configurable position, size, colours, number of visible suggestions
- **Configurable limits**: max unchecked items (default 7), max checked items visible, auto-hide duration
- **Animations**: entrance/exit animations for suggestions and checked-off items
- **Export/archive**: export completed suggestion sessions

### Key technical decisions
- **`twitch_api` crate** for Helix API and EventSub types (mature, fully typed, all Channel Points endpoints)
- **`tokio-tungstenite`** for EventSub WebSocket connection (standard, performant)
- **`twitch-irc`** for chat-based voting commands (purpose-built, async/tokio)
- **`axum`** for overlay HTTP server + WebSocket broadcast (lightweight, tokio-native)
- **Device Code Grant Flow** for OAuth (no local server needed, natural desktop UX)
- **SQLite via `sqlx`** for persistence (async, compile-time checked, migration support)
- **Tauri events** for Rust-to-React communication within the app (existing pattern)
- **WebSocket broadcast** for overlay communication (independent of Tauri event system)
- **Helix polling** for backfill on startup/reconnection (UNFULFILLED redemptions)
- **Zustand store** for frontend state in the streamer app window (existing pattern)
- **No hotkeys** — all interaction via widget UI (checkboxes, hover states)
