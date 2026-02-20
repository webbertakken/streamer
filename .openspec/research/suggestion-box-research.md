# Research: suggestion box feature

## 1. Problem statement

Streamers need a way for viewers to submit ideas, requests, and feedback during live streams. Current options are either fire-and-forget (chat commands that get buried in noise) or tied to external cloud platforms (StreamElements, Streamlabs) that do not integrate with a local-first desktop overlay.

The streamer app already provides a rich overlay widget system with Twitch integration (IRC chat, EventSub, Helix API) but has no mechanism for collecting, ranking, or displaying viewer suggestions.

### Requirements (from user)

1. **General-purpose** — flexible for topics, Q&A, feedback, game suggestions
2. **Stream overlay only** — rendered as a widget in the existing overlay, no separate dashboard
3. **Channel points submission** — viewers spend channel points to submit (natural spam barrier)
4. **Persistent across streams** — suggestions carry over between sessions
5. **Hotkey-driven** — streamer cycles, dismisses, and pins suggestions via keyboard shortcuts
6. **Free upvoting** — viewers upvote via chat at no cost; most popular suggestions float to top
7. **Auto-approve** — all submissions accepted immediately; channel point cost is the trust barrier

## 2. Codebase context

### Architecture
Single **Tauri 2** desktop app. React 19 + TypeScript frontend, Rust backend. The window is always-on-top, transparent, and click-through (except in edit mode). Widgets render directly on screen as an overlay.

### Widget system
- 12 widget types registered via a **widget registry** (`src/widgets/registry.ts`)
- Each widget has: `id`, `component`, `defaults` (position/size), optional `singleton` flag, optional `defaultConfig`, optional `settingsComponent`
- Instances stored in a **Zustand** overlay store with position, size, visibility, lock state, and per-widget `config`
- `Widget.tsx` wrapper provides drag/resize/lock/settings popover in edit mode

### State patterns
- **Pattern A** (module-level array + listeners): used by chat, event-feed, follower-alerts — best fit for suggestions
- **Pattern B** (external Zustand store): used by viewer-count
- **Pattern C** (instance config): used by custom-text, stream-title — good for widget settings

### Twitch integration (existing)
- **Auth**: Device Code Grant flow in Rust (`auth.rs`), tokens at `~/.config/streamer/tokens.json`, auto-refresh
- **Current scopes**: `chat:read chat:edit moderator:read:followers user:read:chat channel:read:subscriptions bits:read channel:manage:broadcast`
- **IRC**: WebSocket to `wss://irc-ws.chat.twitch.tv:443`, parses PRIVMSG (display-name, color, badges, emotes), chat commands with template variables
- **EventSub**: WebSocket to Twitch EventSub, subscribes to 11 event types, maps to internal `ChannelEventType`, publishes on event bus
- **Helix**: Generic `helix_get`/`helix_patch` Rust commands with 401 retry
- **Event bus** (`src/events/bus.ts`): simple pub/sub — `publish(event)` / `subscribe(fn)` — used by all event sources and consumers

### Hotkeys (existing)
- `@tauri-apps/plugin-global-shortcut` for OS-wide shortcuts
- Currently registered: `Ctrl+Shift+I` (edit mode), `Ctrl+Shift+O` (overlay toggle)
- Registered in `App.tsx`, primary window only

### Persistence (existing)
- **JSON file-based**: `settings.json` (auto-saved, debounced 500ms), `ephemeral-chat-history.json`, `presets/*.json`
- All via Rust commands (`read_settings`/`write_settings` etc.) — no external databases
- Data directory: `~/.config/streamer/`

## 3. Existing solutions analysis

| Solution | Strengths | Weaknesses for this project |
|----------|-----------|----------------------------|
| **StreamElements/Streamlabs** | Polished UX, cloud-hosted, rich widget library | External dependency, no local-first control, no deep overlay integration |
| **Streamer.bot queue** | Highly customisable, channel points support | Steep learning curve, separate app, no native overlay |
| **Nightbot/Moobot `!suggest`** | Simple setup, familiar UX | No queue/list, no voting, no persistence, fire-and-forget |
| **Twitch "Suggestion Box" extension** | Panel below video, visible to viewers | Separate extension platform, sandboxed iframe, cannot integrate with desktop overlay |
| **Custom chat commands** | Works for all streamers (no affiliate needed) | Suggestions buried in chat, no built-in cost/spam barrier, no voting |

**Conclusion**: No existing solution provides a local-first, channel-points-driven suggestion queue with voting and hotkey controls that integrates directly into a Tauri desktop overlay.

## 4. Recommended approach

### Channel points redemption + chat voting, rendered as a native widget

Submissions are exclusively via channel points. Voting is exclusively via chat. This is not a hybrid multi-input system.

### Redemption lifecycle

1. Viewer redeems a channel points reward (configured with `is_user_input_required: true`)
2. Redemption enters Twitch's "UNFULFILLED" queue
3. App receives EventSub `channel.channel_points_custom_reward_redemption.add` notification
4. Event payload contains `user_input` (suggestion text, max 200 chars), `user_name`, `user_id`, `reward.id`, `redeemed_at`
5. App stores suggestion locally as "active" (auto-approved, no moderation queue)
6. Suggestion appears in overlay, ranked by votes
7. Streamer interacts via hotkeys: next, dismiss, pin

### Why not other approaches

- **Chat-only submission**: Does not meet requirement #3 (channel points). No natural cost barrier.
- **Hybrid (chat + channel points)**: User explicitly chose channel-points-only submission.
- **Web panel/browser source**: User explicitly chose overlay-only display (#2).
- **SQLite**: The codebase uses JSON file persistence everywhere (settings, presets, chat history). Introducing SQLite (`sqlx` or `tauri-plugin-sql`) would deviate from established patterns for marginal benefit — the suggestion dataset is small enough for JSON.
- **`twitch_api` / `twitch-irc` crates**: The codebase already has a working EventSub WebSocket client in the frontend (`eventsub.ts`) and Helix wrapper in Rust (`helix.rs`). Adding new crates would duplicate existing functionality. We extend what is already there.

## 5. Technical design

### 5.1 Data model

```typescript
interface Suggestion {
  id: string;              // UUID
  text: string;            // From redemption user_input (max 200 chars)
  username: string;        // Twitch display name
  userId: string;          // Twitch user ID
  redemptionId: string;    // Twitch redemption ID
  rewardId: string;        // Which reward was redeemed
  createdAt: number;       // Epoch ms
  status: "active" | "pinned" | "dismissed" | "done";
  votes: number;           // Upvote count
  voters: string[];        // User IDs (dedup)
}
```

Statuses: `active` (default), `pinned` (stays visible), `dismissed` (hidden from rotation), `done` (completed/archived).

### 5.2 Twitch integration changes

**Auth scope** (`src-tauri/src/auth.rs`):
- Add `channel:read:redemptions` to the SCOPES constant
- Existing users must re-authenticate to gain the new scope
- This scope is sufficient for: listening to redemption EventSub events AND listing custom rewards via Helix GET

**EventSub** (`src/twitch/eventsub.ts`):
- Add to `getSubscriptions()`:
  ```typescript
  { type: "channel.channel_points_custom_reward_redemption.add", version: "1", condition: { broadcaster_user_id: broadcasterId } }
  ```
- Add to `mapEventType()`: `"channel.channel_points_custom_reward_redemption.add" -> "channel_points_redemption"`
- Optionally filter by `reward_id` in the condition (if the streamer has selected a specific reward)

**Event bus** (`src/events/bus.ts`):
- Add `"channel_points_redemption"` to `ChannelEventType`

**IRC parsing** (`src/twitch/irc.ts`):
- Parse `user-id` tag from PRIVMSG (currently not extracted)
- Include `userId` in the published `"chat"` event data
- Required for vote deduplication (one vote per user per suggestion)

### 5.3 Widget

**Registration** (`src/widgets/registry.ts`):
```typescript
registerWidget({
  id: "suggestion-box",
  name: "Suggestion box",
  component: SuggestionBoxWidget,
  singleton: true,
  defaults: { x: 8, y: 560, width: 400, height: 260 },
  settingsComponent: SuggestionBoxSettings,
})
```

**State** (`src/widgets/suggestion-box/suggestion-box-state.ts`):
- Follows Pattern A (module-level array + listeners), matching chat, event-feed, etc.
- `suggestions: Suggestion[]` — the full persistent list
- `currentIndex: number` — pointer into the sorted active list
- Core functions: `pushSuggestion()`, `voteSuggestion()`, `dismissCurrent()`, `pinCurrent()`, `nextSuggestion()`, `loadSuggestions()`, `getSortedActive()`
- Subscribes to event bus for `"channel_points_redemption"` events (new suggestions) and `"chat"` events (vote commands)
- Vote trigger: matches `!vote` (configurable) from chat events, deduplicates by `userId` per suggestion

**Component** (`src/widgets/suggestion-box/SuggestionBoxWidget.tsx`):
- Wraps in `<Widget>` like all other widgets
- Displays: current suggestion text, submitter username, vote count, position indicator (e.g. "3/12")
- Pinned suggestions shown with a visual indicator
- Empty state shown in edit mode
- Settings component for: reward selection dropdown, vote trigger command, display preferences

### 5.4 Hotkeys

Uses existing `@tauri-apps/plugin-global-shortcut` (`register`/`unregister`).

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+S` | Toggle suggestion box visibility |
| `Ctrl+Shift+N` | Show next suggestion |
| `Ctrl+Shift+D` | Dismiss current suggestion |
| `Ctrl+Shift+P` | Pin/unpin current suggestion |

Registered in the suggestion box widget module (active only when widget instance exists), primary window only.

### 5.5 Persistence

**Dedicated file**: `~/.config/streamer/suggestions.json`

**Rust commands** (new `src-tauri/src/suggestions.rs`):
- `read_suggestions` — reads and returns JSON, or `null` if file does not exist
- `write_suggestions` — writes JSON to file

Follows the exact same pattern as `settings.rs` (`read_settings`/`write_settings`).

**Auto-save**: Subscribe suggestion state changes to a debounced save (500ms), same pattern as `persistence.ts` `scheduleSave()`.

**Hydration**: Load suggestions on app start (in `App.tsx` hydration flow or suggestion box widget mount).

### 5.6 Reward selection

**Manual selection** via a dropdown in widget settings:
1. Fetch available custom rewards via Helix `GET /channel_points/custom_rewards?broadcaster_id=...`
2. Display in the settings component as a `<select>`, showing reward name + cost
3. Store selected `rewardId` in widget instance config
4. Filter incoming redemption events by `rewardId` — only matching redemptions become suggestions
5. If no reward is selected, accept all redemptions (useful for testing)

This avoids the need for `channel:manage:channel_points_custom_rewards` scope (creating rewards via API). The streamer creates the reward in the Twitch dashboard with `is_user_input_required: true`.

### 5.7 Voting system

- Viewers type `!vote` in chat to upvote the currently displayed suggestion
- Subscribes directly to event bus `"chat"` events (NOT the existing `handleChatCommand` system, which has a 5s cooldown and sends responses)
- Silent: no chat response, no cooldown between different users voting
- One vote per user per suggestion: deduplicated via `voters[]` array using `userId` from IRC tags
- Suggestions sorted by `votes` descending; pinned items shown first

### 5.8 Twitch API constraints

- `user_input` max 200 characters — sufficient for most suggestions
- Channel Points require Affiliate/Partner status
- Max 3 WebSocket connections per user per client_id (we use 1 for EventSub, already established)
- Max 300 EventSub subscriptions total per client_id (we currently use 11, adding 1)
- Redemptions enter "UNFULFILLED" status — the app can optionally fulfil them via Helix PATCH (future enhancement, requires `channel:manage:redemptions`)

## 6. Changes summary

### New files
```
src/widgets/suggestion-box/
  suggestion-box-state.ts     # State, voting, event bus subscriptions, persistence
  SuggestionBoxWidget.tsx     # Widget component + settings component
src-tauri/src/suggestions.rs  # Rust read/write commands
```

### Modified files
| File | Change |
|------|--------|
| `src-tauri/src/auth.rs` | Add `channel:read:redemptions` to SCOPES |
| `src-tauri/src/lib.rs` | Add `mod suggestions`, register `read_suggestions` + `write_suggestions` commands |
| `src/events/bus.ts` | Add `"channel_points_redemption"` to `ChannelEventType` |
| `src/twitch/eventsub.ts` | Add redemption subscription to `getSubscriptions()` + mapping in `mapEventType()` |
| `src/twitch/irc.ts` | Parse `user-id` tag in `parsePRIVMSG()`, include `userId` in chat event data |
| `src/widgets/registry.ts` | Register `suggestion-box` widget |
| `src/stores/persistence.ts` | Hook suggestion auto-save into `startAutoSave()` |

## 7. Open questions and risks

1. **Reward listing scope**: Helix `GET /channel_points/custom_rewards` requires `channel:read:redemptions` or `channel:manage:channel_points_custom_rewards`. Need to verify `channel:read:redemptions` is sufficient for listing (not just listening to events).
2. **Vote command customisability**: Should `!vote` be configurable in widget settings, or is a fixed command acceptable?
3. **Suggestion limits**: Should there be a max number of active suggestions? What happens at the limit — reject new, or archive oldest?
4. **Done/archive workflow**: When a suggestion is marked "done", permanently delete or keep in an archive?
5. **Multi-monitor sync**: Should suggestions sync to secondary monitor windows? Currently only rendering state (instances, overlayVisible, editMode) syncs.
6. **Sound alerts**: Should new suggestions trigger a sound alert? The existing sound system (`audio/listener.ts`) already supports mapping event types to sounds.
7. **Re-authentication UX**: Existing users will need to log out and back in to get the new `channel:read:redemptions` scope. Should the app detect the missing scope and prompt?
8. **Redemption fulfilment**: Should the app auto-fulfil redemptions (confirming the point spend), or leave them unfulfilled in Twitch's queue? Auto-fulfilment requires upgrading to `channel:manage:redemptions` scope.
