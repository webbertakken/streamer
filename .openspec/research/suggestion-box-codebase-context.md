# Suggestion box codebase context

## 1. Overall architecture

**Single Tauri 2 desktop app** (not a monorepo despite Yarn). The codebase is a streaming overlay that renders widgets on top of the screen as an always-on-top, transparent, click-through window.

### Directory structure
```
streamer/
  src/                # React frontend (TypeScript)
    App.tsx           # Root: hydration, global shortcuts, widget rendering
    main.tsx          # ReactDOM entry
    stores/           # Zustand stores (overlay, twitch)
    events/           # Event bus (pub/sub) + file logger
    twitch/           # IRC chat, EventSub, Helix API, auth, badges
    audio/            # Sound alert system
    multimonitor/     # Secondary window management
    widgets/          # All widget components + registry
      registry.ts     # Widget definition + registration
      Widget.tsx      # Base widget wrapper (drag, resize, settings popover)
      settings/       # Settings panel (tabs: General, Widgets, Twitch, Appearance)
      chat/           # Chat widget + state (messages, TTL, fade)
      follower-alerts/# Alert popup widget
      event-feed/     # Live event feed
      ...             # 12 widget types total
  src-tauri/          # Rust backend
    src/
      lib.rs          # Tauri setup, commands registration, monitor management
      auth.rs         # Twitch OAuth Device Code Grant flow, token storage
      helix.rs        # Authenticated Helix GET/PATCH, EventSub subscribe
      settings.rs     # JSON settings persistence (~/.config/streamer/)
      presets.rs       # Preset save/load/export/import
      event_log.rs    # Event logging to disk
```

## 2. Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Tauri 2 (Rust backend + WebView frontend) |
| Frontend | React 19.1, TypeScript 5.8, Vite 7 |
| State | Zustand 5 (two stores: overlay + twitch) |
| Styling | Tailwind CSS 4 (via @tailwindcss/vite) |
| Testing | Vitest 4, Testing Library, jsdom |
| Linting | oxlint |
| Build | Vite + tauri-build |
| Package manager | Yarn 4.9.2 (via Volta) |
| Pre-commit | Husky + lint-staged (oxlint on src/**/*.{ts,tsx}) |
| CI | GitHub Actions (checks.yml, build.yml, commit-lint.yml, release-please.yml) |

## 3. Twitch integrations

### 3.1 Authentication
- **Device Code Grant** flow via Rust backend (`auth.rs`)
- Tokens stored in `~/.config/streamer/tokens.json`
- Auto-refresh when expiring within 5 minutes
- Scopes: `chat:read chat:edit moderator:read:followers user:read:chat channel:read:subscriptions bits:read channel:manage:broadcast`

### 3.2 IRC chat
- WebSocket connection to `wss://irc-ws.chat.twitch.tv:443`
- Authenticated mode (when logged in) or anonymous (`justinfan12345`)
- Parses PRIVMSG (with tags: display-name, color, badges, emotes), JOIN, PART
- Chat commands system: configurable `!trigger -> response` with template variables (`{uptime}`, `{game}`, `{title}`, `{viewers}`, `{followers}`)
- 5-second command cooldown
- Can send messages back to chat via `sendChatMessage()`

### 3.3 EventSub
- WebSocket connection to Twitch EventSub
- Subscribes to: `channel.follow`, `channel.raid`, `channel.update`, `stream.online`, `stream.offline`, `channel.subscribe`, `channel.subscription.gift`, `channel.subscription.message`, `channel.ban`, `channel.unban`, `channel.cheer`
- Events are mapped to internal `ChannelEventType` and published on the event bus

### 3.4 Helix API
- Generic `helix_get` and `helix_patch` commands in Rust (with 401 retry)
- Frontend uses for: user lookup, follower count polling, viewer count polling, stream info, channel title read/update
- EventSub subscription creation also via Helix

## 4. Event bus

**Location**: `src/events/bus.ts`

Simple pub/sub system:
```typescript
type ChannelEventType = "chat" | "join" | "part" | "follow" | "raid" | "subscribe" | "gift_sub" | "cheer" | "ban" | "unban" | "stream_online" | "stream_offline" | "channel_update" | "follower_count_update" | "viewer_count_update";

interface ChannelEvent {
  type: ChannelEventType;
  timestamp: number;
  data: Record<string, unknown>;
}
```

Used by: EventSub notifications, IRC messages, Helix polling, sound alerts, file logger, widgets.

## 5. Widget system

### 5.1 Registry pattern
Each widget type is registered with:
```typescript
interface WidgetDefinition {
  id: string;              // e.g. "chat", "viewer-count"
  name: string;            // display name
  component: ComponentType<WidgetInstanceProps>;
  defaults: { x, y, width, height };
  singleton?: boolean;     // only one instance allowed
  defaultConfig?: Record<string, unknown>;
  settingsComponent?: ComponentType<{ instanceId: string }>;
}
```

### 5.2 Registered widgets (12 total)
1. `chat` (singleton) - Live Twitch chat with input
2. `viewer-count` (singleton) - Live viewer count
3. `follower-alerts` (singleton) - Animated follow alerts
4. `event-feed` (singleton) - Running event list
5. `custom-text` - Configurable text (multi-instance)
6. `chat-presence` (singleton) - Active chatters list
7. `follow-events` (singleton) - Follow event list
8. `event-log` (singleton) - Full event log
9. `raid-alerts` (singleton) - Raid notifications
10. `subscription-alerts` (singleton) - Sub notifications
11. `stream-info` - Stream info display (multi-instance)
12. `stream-title` (singleton) - Editable stream title

### 5.3 Widget instance model
Each instance stored in Zustand:
```typescript
interface WidgetInstance {
  instanceId: string;   // e.g. "chat-1"
  typeId: string;       // e.g. "chat"
  x, y, width, height: number;
  visible: boolean;
  locked: boolean;
  contentAlign?: "left" | "center" | "right";
  fontFamily?: string;
  bgColour?: string;
  bgOpacity?: number;
  textColour?: string;
  config?: Record<string, unknown>;  // widget-specific config
}
```

### 5.4 Widget wrapper (`Widget.tsx`)
- Drag-and-drop with 8px grid snap + 16px magnet to guide lines
- Resize handle (bottom-right)
- Per-widget settings popover (alignment, font, bg colour/opacity, text colour)
- Lock/unlock, remove buttons
- Edit mode vs. live mode rendering

### 5.5 Widget state patterns

**Pattern A: Module-level arrays + listeners** (used by chat, event-feed, follow-events, follower-alerts, event-log)
```typescript
const items: Item[] = [];
const listeners = new Set<() => void>();
function pushItem(item: Item) { items.push(item); listeners.forEach(fn => fn()); }
// Components subscribe with useReducer + useEffect
```

**Pattern B: External Zustand store** (used by viewer-count)
```typescript
const useViewerCount = create<{ count: number; ... }>();
```

**Pattern C: Instance config** (used by custom-text, stream-info, stream-title)
Config stored in `instance.config` and accessed via `useOverlayStore`.

## 6. State management and persistence

### 6.1 Zustand stores
- **`useOverlayStore`**: All overlay state (instances, settings, appearance). Hot-module replacement safe.
- **`useTwitchStore`**: Twitch connection state (channel, connected, authenticated, username, userId, userColour).

### 6.2 Persistence
- Settings saved to `~/.config/streamer/settings.json` via Rust `write_settings` command
- Auto-save: subscribes to both stores, debounces 500ms, saves on any change
- Chat history separately saved to `ephemeral-chat-history.json` (restored if same channel, <10 min old)
- Migration system: `_v` version field, currently at v3

### 6.3 Multi-monitor sync
- Primary window broadcasts state to secondary windows via Tauri events
- Secondary windows listen and apply state changes
- Only rendering state is synced (instances, overlayVisible, editMode, etc.)

## 7. Settings panel

Located in `src/widgets/settings/SettingsWidget.tsx`. Four tabs:
- **General**: File logging toggle, restore defaults
- **Widgets**: Widget picker (add new), multi-monitor, presets
- **Twitch**: Auth (login/logout), channel connect, chat commands
- **Appearance**: Twitch colours, presence threshold, border radius, font, bg colours/opacity, text colours, sound alerts config

Only visible in edit mode (Ctrl+Shift+I). Positioned via `panelAlignH`/`panelAlignV`.

## 8. Existing patterns relevant to suggestion box

### 8.1 Chat commands (closest analogy)
The existing chat command system in `irc.ts` + Settings shows how to:
- Receive chat messages and pattern-match triggers
- Respond to chat with `sendChatMessage()`
- Configure commands via the settings UI

### 8.2 Alert widgets (follower-alerts, raid-alerts, sub-alerts)
Show how to:
- Queue incoming events
- Display one at a time with animation
- Auto-dismiss after timeout

### 8.3 Event feed / Event log
Show how to:
- Maintain a scrollable list of events
- Subscribe to the event bus
- Use the module-level array + listeners pattern

### 8.4 Custom text widget
Shows how to use `config` for per-widget settings (text content, font size, colour, alignment).

## 9. User decisions for suggestion box

1. **Use case**: General-purpose (flexible, configurable for topics, Q&A, feedback)
2. **Display**: Stream overlay only (no separate dashboard)
3. **Submission**: Channel points redemption (viewers spend channel points)
4. **Persistence**: Persistent across streams (suggestions carry over)
5. **Interaction**: Hotkey-driven (keyboard shortcuts to show next, dismiss, pin)
6. **Voting**: Free upvotes (viewers upvote at no cost, most popular float to top)
7. **Moderation**: Auto-approve all (trust channel point cost barrier, no review queue)

## 10. Channel points redemption integration

### 10.1 Required Twitch EventSub subscription
- **Type**: `channel.channel_points_custom_reward_redemption.add` (version `1`)
- **Condition**: `{ broadcaster_user_id: broadcasterId }` (optionally `reward_id` to filter to a specific reward)
- **Required scope**: `channel:read:redemptions` or `channel:manage:redemptions`

### 10.2 Current auth scopes (NEED UPDATE)
Current scopes in `auth.rs` line 9-10:
```
chat:read chat:edit moderator:read:followers user:read:chat channel:read:subscriptions bits:read channel:manage:broadcast
```
**Missing**: `channel:read:redemptions` (or `channel:manage:redemptions` if we want to manage reward status)

Adding `channel:read:redemptions` is the minimum needed. If we want to:
- Create the custom reward via API: need `channel:manage:channel_points_custom_rewards`
- Update redemption status (fulfil/cancel): need `channel:manage:redemptions`

Recommendation: Add `channel:read:redemptions` for listening + `channel:manage:redemptions` for updating status.

### 10.3 EventSub payload structure
The `channel.channel_points_custom_reward_redemption.add` event contains:
```json
{
  "id": "redemption-id",
  "broadcaster_user_id": "...",
  "user_id": "...",
  "user_login": "...",
  "user_name": "DisplayName",
  "user_input": "The suggestion text entered by the viewer",
  "status": "unfulfilled",
  "reward": {
    "id": "reward-id",
    "title": "Suggest Something",
    "cost": 500,
    "prompt": "Enter your suggestion"
  },
  "redeemed_at": "2024-01-01T00:00:00Z"
}
```

The `user_input` field is what contains the viewer's suggestion text.

### 10.4 Integration points
1. **EventSub subscription**: Add `channel.channel_points_custom_reward_redemption.add` to `getSubscriptions()` in `eventsub.ts`
2. **Event bus mapping**: Add `"channel_points_redemption"` to `ChannelEventType` in `bus.ts`, map from `channel.channel_points_custom_reward_redemption.add`
3. **Auth scope**: Add `channel:read:redemptions` (minimum) to SCOPES in `auth.rs`
4. **Reward filtering**: User configures which reward ID triggers suggestions (in widget settings)

### 10.5 Setting up the channel points reward
Two approaches:
- **Manual**: Streamer creates the reward in Twitch dashboard, copies reward ID into widget settings
- **API-managed**: App creates/manages the reward via Helix API (requires `channel:manage:channel_points_custom_rewards` scope)

Recommendation: Start with manual reward selection. The widget settings would list available rewards (fetched via Helix `GET /channel_points/custom_rewards`) and let the streamer pick one.

## 11. Persistent storage design

### 11.1 Current persistence patterns
- **settings.json**: Auto-saved overlay state (debounced 500ms), loaded on hydration. Via Rust `read_settings`/`write_settings`.
- **ephemeral-chat-history.json**: Temporary, expires after 10 minutes. Via Rust `read_chat_history`/`write_chat_history`.
- **presets/**: Named JSON files in `~/.config/streamer/presets/`. Separate Rust commands for CRUD.

### 11.2 Suggestion persistence approach
Suggestions need to persist across streams, so they should NOT use the ephemeral pattern.

Best approach: **Dedicated suggestions file** in `~/.config/streamer/suggestions.json`

Add new Rust commands:
- `read_suggestions` -> reads `suggestions.json`
- `write_suggestions` -> writes `suggestions.json`

This follows the same pattern as `settings.rs` but with a dedicated file. Suggestions are separate from overlay settings because:
- They are user-generated content, not app configuration
- They could grow large (many suggestions over time)
- They have their own lifecycle (create, archive, delete)

### 11.3 Suggestion data model
```typescript
interface Suggestion {
  id: string;                    // UUID
  text: string;                  // The suggestion content (from user_input)
  username: string;              // Who submitted it
  userId: string;                // Twitch user ID
  redemptionId: string;          // Twitch redemption ID
  rewardId: string;              // Which reward was redeemed
  createdAt: number;             // Timestamp
  status: "active" | "pinned" | "dismissed" | "done";
  votes: number;                 // Upvote count (free voting)
  voters: string[];              // User IDs who have voted (dedup)
}
```

Note: No "pending"/"approved"/"rejected" statuses needed since all suggestions are auto-approved.

## 12. Hotkey-driven interaction design

### 12.1 Existing hotkey system
The app uses `@tauri-apps/plugin-global-shortcut` (`register`/`unregister`). Currently registered:
- `Ctrl+Shift+I` — toggle edit mode
- `Ctrl+Shift+O` — toggle overlay visibility

Hotkeys are registered in `App.tsx` via `useEffect`, primary window only. They work as OS-wide global shortcuts (captured even when the app is not focused).

### 12.2 Suggestion box hotkeys
Proposed shortcuts (streamer-facing, work during gameplay):
- `Ctrl+Shift+S` — toggle suggestion box visibility
- `Ctrl+Shift+N` — show next suggestion (cycle through sorted list)
- `Ctrl+Shift+D` — dismiss current suggestion (mark as dismissed, remove from rotation)
- `Ctrl+Shift+P` — pin/unpin current suggestion (keep visible)

Implementation:
- Register in `App.tsx` alongside existing shortcuts, or in the widget itself
- Better to register in a dedicated hook/effect within the suggestion box widget module, so they are only active when the widget exists
- The hotkeys modify suggestion state (next/dismiss/pin) which triggers re-render + auto-persist

### 12.3 Hotkey state model
The widget tracks a "focused suggestion index" or "current suggestion":
```typescript
interface SuggestionBoxState {
  suggestions: Suggestion[];
  currentIndex: number;       // Index into sorted suggestions
  visible: boolean;           // Widget visibility toggle
}
```
- "Next" increments `currentIndex`, wrapping around
- "Dismiss" sets `status: "dismissed"` on current, advances to next
- "Pin" sets `status: "pinned"` on current (pinned items stay visible regardless of cycling)

## 13. Free upvote system design

### 13.1 Chat-based voting
Viewers type a chat command (e.g. `!vote` or `!upvote`) to upvote the currently displayed suggestion.

Implementation approach:
- Subscribe to the event bus for `"chat"` events in the suggestion box state module
- When a chat message matches the vote trigger (e.g. `!vote`), increment the vote count on the current suggestion
- Deduplicate: track `voters[]` per suggestion (by userId via IRC tags) — one vote per user per suggestion
- This reuses the existing IRC message flow; no new Twitch API needed

### 13.2 Vote trigger in chat
The existing `handleChatCommand` in `irc.ts` has a 5s cooldown and sends a response. Voting should NOT use that system because:
- It has a global cooldown (would rate-limit voting)
- It sends a chat response (noisy for votes)

Instead: the suggestion box module subscribes directly to the event bus `"chat"` events and handles vote commands internally, silently. No cooldown, no chat response.

### 13.3 Sorting by popularity
Suggestions sorted by `votes` descending (most popular first). The "Next" hotkey cycles through this sorted list. Pinned items are shown separately/first.

### 13.4 Extending IRC parsing for userId
Currently `parsePRIVMSG` extracts `display-name` and `color` from IRC tags. For vote deduplication, we also need the `user-id` tag.

The IRC PRIVMSG tags already contain `user-id=<id>`. We need to:
1. Parse `user-id` in `parsePRIVMSG` (add to return type)
2. Include `userId` in the published `"chat"` event data
3. Use `userId` for vote deduplication in suggestion box state

This is a small change to `irc.ts` `parsePRIVMSG` and the chat event publish in `handleMessage`.

## 14. Key integration points (updated)

### Backend (Rust)
1. **Auth scope** (`auth.rs`): Add `channel:read:redemptions` to SCOPES
2. **Suggestion persistence** (new `suggestions.rs`): `read_suggestions`/`write_suggestions` commands for `~/.config/streamer/suggestions.json`
3. **Register commands** (`lib.rs`): Add new commands to `invoke_handler`

### Frontend — Twitch plumbing
4. **EventSub** (`eventsub.ts`): Add `channel.channel_points_custom_reward_redemption.add` subscription + map to `"channel_points_redemption"`
5. **Event bus** (`bus.ts`): Add `"channel_points_redemption"` to `ChannelEventType`
6. **IRC parsing** (`irc.ts`): Extract `user-id` tag from PRIVMSG, include in chat event data

### Frontend — Widget
7. **Widget registration** (`registry.ts`): Register `suggestion-box` widget (singleton)
8. **State** (new `suggestion-box/suggestion-box-state.ts`): Suggestions array, current index, visibility, voting logic, persistence hooks
9. **Component** (new `suggestion-box/SuggestionBoxWidget.tsx`): Overlay display (current suggestion + vote count, pinned items)
10. **Settings** (new settings component): Reward picker, vote trigger, hotkey display
11. **Hotkeys** (`App.tsx` or widget module): Register `Ctrl+Shift+S/N/D/P`
12. **Persistence** (`persistence.ts`): Hook suggestion state auto-save

### New files
```
src/widgets/suggestion-box/
  suggestion-box-state.ts    # State management, voting, persistence
  SuggestionBoxWidget.tsx    # Widget component + settings component
src-tauri/src/suggestions.rs # Rust persistence commands
```

## 15. Technology constraints

- No external databases; all state is local files + in-memory
- Window is always-on-top, transparent, click-through (except in edit mode)
- Chat input only works when hovering the input area for 500ms (cursor passthrough mechanism)
- All widgets must work within the Widget wrapper (drag/resize/lock/settings)
- Must support multi-monitor sync if instances are synced
- Tailwind CSS 4 for styling, no CSS modules
- Channel points redemption requires the broadcaster to have Affiliate/Partner status
- The reward must be configured to require user input (for the suggestion text)
- Existing users will need to re-authenticate to get the new scope
- Global shortcuts are OS-wide; must avoid conflicts with common shortcuts
- Vote dedup requires parsing `user-id` from IRC tags (minor `irc.ts` change)
