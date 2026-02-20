## Why

Streamers need a way for viewers to submit and vote on ideas during live streams. Current options are either fire-and-forget (chat commands buried in noise) or tied to external cloud platforms that do not integrate with the local-first desktop overlay. The app already has rich Twitch integration (IRC, EventSub, Helix) and a widget system, but no mechanism for collecting, ranking, or displaying viewer suggestions.

## What changes

- Add a new **suggestion box widget** displaying a ranked list of suggestions with vote counts, hex IDs, and hover-to-reveal checkboxes
- Accept submissions via **Twitch channel point redemptions** (natural spam barrier, no moderation queue needed)
- Enable **targeted voting** via chat command (`!vote <hex-id>`) — each suggestion gets a unique 2-digit hex identifier (00-FF)
- Per-user vote deduplication per suggestion
- **Check off / uncheck** suggestions via reversible checkbox (strikethrough, sink to bottom, auto-hide after configurable duration)
- In live mode, checkboxes appear on hover only (matching the ChatWidget cursor polling pattern with 500ms delay)
- **Persist suggestions** across app restarts via dedicated JSON file (sole backfill mechanism — no Twitch API replay available for manually-created rewards)
- Add **reward selection** in widget settings (dropdown of available channel point rewards via Helix API)
- **BREAKING**: Add `channel:read:redemptions` OAuth scope — existing users must re-authenticate

## Capabilities

### New capabilities

- `suggestion-box`: Core widget component following EventFeedWidget pattern (scrollable list, `space-y-1.5`, `lineBg`), state management, ranked list display with hex IDs and vote counts, configurable max visible active/done items, reversible checkbox interaction with strikethrough and auto-hide, hover-to-reveal checkboxes in live mode following ChatWidget cursor polling pattern, settings component (reward selection, vote trigger, display limits, auto-hide duration)
- `channel-points-redemption`: EventSub subscription for `channel.channel_points_custom_reward_redemption.add`, event bus integration (`channel_points_redemption` event type), event mapping — reusable for future channel point features beyond suggestions
- `chat-voting`: IRC `user-id` tag parsing for vote deduplication, `!vote <hex-id>` command matching from chat events targeting specific suggestions by hex ID, one-vote-per-user-per-suggestion enforcement, silent operation (no chat response)
- `suggestion-persistence`: Rust read/write commands for `suggestions.json`, debounced auto-save on state changes, hydration on widget mount — serves as the sole backfill mechanism across restarts

### Modified capabilities

_(none — no existing spec-level requirements are changing)_

## Impact

**Auth** (`src-tauri/src/auth.rs`): New `channel:read:redemptions` scope added to `SCOPES` constant — breaking change requiring re-authentication for existing users.

**Event bus** (`src/events/bus.ts`): New `channel_points_redemption` event type added to `ChannelEventType` union.

**EventSub** (`src/twitch/eventsub.ts`): New subscription type and event mapping for channel point redemptions.

**IRC** (`src/twitch/irc.ts`): Parse `user-id` tag from PRIVMSG, include `userId` in published `chat` event data — required for vote deduplication.

**Widget registry** (`src/widgets/registry.ts`): New `suggestion-box` widget registration.

**Rust backend** (`src-tauri/src/lib.rs`): New `suggestions` module with `read_suggestions` and `write_suggestions` commands.

**Persistence** (`src/stores/persistence.ts`): Hook suggestion state auto-save into the existing debounced save pattern.

**New files**: `src/widgets/suggestion-box/` (widget + state), `src-tauri/src/suggestions.rs` (Rust persistence).

**Dependencies**: No new crate or npm dependencies — uses existing EventSub WebSocket and Helix API infrastructure.
