## Context

The streamer overlay app is a Tauri desktop application with a React frontend. It provides a widget-based overlay system with Twitch integration via IRC (chat), EventSub (subscriptions, follows, raids, cheers), and the Helix API. Widgets are registered in a central registry and rendered on a draggable canvas. State follows a module-level array + listeners pattern (e.g. chat-state). Persistence uses JSON files in `~/.config/streamer/` via Rust Tauri commands.

Currently, the app has no channel point redemption handling and does not parse the `user-id` IRC tag from PRIVMSG messages.

**Relevant widget patterns:**
- **EventFeedWidget**: scrollable list layout with `space-y-1.5`, `lineBg` class for text background, auto-scroll to bottom, empty state in edit mode only.
- **ChatWidget cursor polling** (ChatInputContainer): in live mode (cursor events ignored via `set_ignore_cursor`), polls OS cursor position every `POLL_INTERVAL_MS=200`ms and reveals interactive elements after `LONG_HOVER_MS=500`ms of hovering over the widget bounding rect. Uses `hoverStartRef` timestamp pattern.

## Goals / Non-goals

**Goals:**

- Viewers submit suggestions via channel point redemptions, displayed as a ranked list in an overlay widget
- Targeted voting via `!vote <hex-id>` chat command with unique 2-digit hex identifiers per suggestion
- Per-user vote deduplication per suggestion
- Ranked list view with configurable max visible active and done items
- Reversible checkbox interaction to mark suggestions done (strikethrough, sink to bottom, auto-hide)
- Hover-to-reveal checkboxes in live mode (matching ChatWidget cursor polling pattern)
- Suggestions persist across app restarts via dedicated JSON file
- Reusable channel point redemption event plumbing for future features
- Reward selection from available rewards via Helix API in widget settings

**Non-goals:**

- Global hotkeys (all interaction via widget UI — mouse-driven only)
- Single-item cycling view (replaced by ranked list view)
- Twitch API backfill/replay for missed redemptions (not possible for manually-created rewards)
- Moderation queue / approval workflow (channel point cost is the trust barrier)
- Creating channel point rewards via API (requires `channel:manage:channel_points_custom_rewards`)
- SQLite or any new persistence dependency (JSON is sufficient for this dataset size)
- Sound alerts on new suggestions (can be added later via existing sound system)
- Multi-monitor sync of suggestion state
- Chat responses to votes (silent operation to avoid spam)

## Decisions

### 1. List view with hex IDs instead of single-item cycling

**Decision**: Display a ranked list of active suggestions with vote counts and 2-digit hex IDs, instead of cycling through one suggestion at a time.

**Rationale**: A list view gives both the streamer and viewers an overview of all suggestions at once. Hex IDs (00-FF) provide a compact, recognisable identifier for targeted voting. 256 possible IDs is more than sufficient for any single stream session.

**Alternative**: Single-item cycling with next/previous hotkeys. Rejected because it hides context and requires keyboard shortcuts.

### 2. Targeted voting by hex ID (`!vote <hex-id>`)

**Decision**: Viewers vote for specific suggestions using `!vote a3` rather than voting for "the currently displayed" suggestion.

**Rationale**: With a list view, there is no single "current" suggestion. Targeted voting lets viewers see the list and choose which suggestion to upvote. Hex IDs are short enough to type quickly in chat.

**Alternative**: Vote for item at a position number. Rejected because positions shift as votes change the ranking.

### 3. Hex ID allocation

**Decision**: Assign 2-digit hex IDs (00-FF) randomly from the available pool as suggestions arrive. IDs are stable for the lifetime of a suggestion and never reassigned while it exists. When the pool is exhausted (256 suggestions), recycle IDs from done suggestions.

**Rationale**: Random assignment avoids predictable patterns that could be gamed. Stability is essential — if IDs shifted, votes could target the wrong suggestion.

### 4. Reversible checkbox model instead of hotkeys

**Decision**: Suggestions are checked off via checkbox click (strikethrough text, sink to bottom of list). Checking is reversible — unchecking restores the suggestion to active. In live mode, checkboxes appear only on hover (500ms delay, matching ChatWidget `ChatInputContainer` cursor polling pattern). No global hotkeys.

**Rationale**: Mouse-driven interaction is simpler and more intuitive for streamers already using the overlay UI. Reversibility prevents accidental data loss. The hover-to-reveal pattern is already established in the ChatWidget (OS cursor polling with `POLL_INTERVAL_MS=200`, `LONG_HOVER_MS=500`, `set_ignore_cursor`).

**Alternative**: Global hotkeys for dismiss/pin. Rejected — explicitly removed from scope.

### 5. Configurable list limits

**Decision**: Three configurable values in widget settings:
- Max active items visible (default: 7) — active suggestions shown in ranked order
- Max done items visible (default: 3) — checked/strikethrough items shown below active list
- Auto-hide duration for done items (default: 30s) — done items disappear after this duration

**Rationale**: Prevents the list from becoming overwhelming on screen. Configurable so streamers can tune for their layout.

### 6. Separate `channel-points-redemption` capability from `suggestion-box`

**Decision**: EventSub subscription for channel point redemptions is a standalone event bus integration, not embedded in the suggestion box widget.

**Rationale**: Channel point redemptions are a general Twitch feature. Other widgets may want to react to redemptions. Keeping it as a separate event type in the bus (`channel_points_redemption`) follows the existing pattern where `follow`, `raid`, `subscribe`, etc. are all independent event types.

### 7. Parse `user-id` from IRC in chat event data

**Decision**: Extend the IRC PRIVMSG parser to extract the `user-id` tag and include it as `userId` in the published `chat` event data.

**Rationale**: Vote deduplication requires a stable user identifier. Display names can change; `user-id` is immutable. Backwards-compatible — existing consumers that don't use `userId` are unaffected.

### 8. JSON file persistence as sole backfill mechanism

**Decision**: Store suggestions in `~/.config/streamer/suggestions.json`. This is the sole mechanism for backfill across app restarts — no Twitch API replay.

**Rationale**: Twitch's EventSub does not support replay for manually-created channel point rewards. The Helix API endpoint for listing redemptions (`GET /channel_points/custom_rewards/redemptions`) requires `channel:manage:channel_points_custom_rewards` scope which we are not requesting. JSON persistence is the established pattern in the codebase and sufficient for the dataset size. Missed redemptions during app downtime are an accepted trade-off — the debounced auto-save (500ms) minimises the window for data loss.

**Alternative**: Twitch API backfill via Helix redemption listing. Not possible without the manage scope, and would add complexity for marginal benefit.

### 9. Module-level state (Pattern A), not Zustand store

**Decision**: Suggestion state uses a module-level array with a listener pattern, matching `chat-state.ts`.

**Rationale**: Widget-local state that does not need to be in the global overlay store. Module-level state with subscription functions is the established pattern.

### 10. Widget follows EventFeedWidget pattern

**Decision**: The suggestion box widget follows the EventFeedWidget scrollable list pattern: `space-y-1.5` spacing, `lineBg` class for text background, scrollable overflow, empty state in edit mode only.

**Rationale**: Visual consistency with existing list-based widgets. The pattern is proven and familiar to the codebase.

## Risks / Trade-offs

**[Breaking auth scope change]** Adding `channel:read:redemptions` requires existing users to re-authenticate.
  - Mitigation: The app already handles expired/invalid tokens gracefully. Users will be prompted to re-authenticate on next launch.

**[Helix reward listing scope]** `GET /channel_points/custom_rewards` may require `channel:manage:channel_points_custom_rewards` rather than `channel:read:redemptions`.
  - Mitigation: Verify during implementation. If read scope is insufficient, fall back to manual reward ID input or add the manage scope.

**[No Twitch API backfill]** Redemptions that arrive while the app is offline are lost. JSON persistence is the only recovery mechanism.
  - Trade-off: Accepted. The debounced auto-save (500ms) minimises the data loss window. In practice, the app runs continuously during streams. Between streams, missed redemptions are unlikely since channel point rewards are typically disabled off-stream.

**[Hex ID exhaustion]** 256 IDs could theoretically be exhausted in a very long stream.
  - Mitigation: Recycle IDs from done suggestions. In practice, 256 is far more than any single session would need.

**[Vote command conflicts]** The `!vote` trigger could conflict with other bots.
  - Mitigation: Vote trigger is configurable in widget settings.

**[Hover detection in live mode]** OS cursor polling at 200ms intervals may feel slightly delayed.
  - Mitigation: This is the same pattern already used and accepted for the chat input. 500ms hover threshold prevents accidental reveals.
