## 1. Auth and event bus foundation

- [x] 1.1 Add `channel:read:redemptions` to the SCOPES constant in `src-tauri/src/auth.rs`
- [x] 1.2 Add `channel_points_redemption` to the `ChannelEventType` union in `src/events/bus.ts`

## 2. EventSub integration

- [x] 2.1 Add `channel.channel_points_custom_reward_redemption.add` subscription to `getSubscriptions()` in `src/twitch/eventsub.ts`
- [x] 2.2 Add event type mapping `"channel.channel_points_custom_reward_redemption.add" -> "channel_points_redemption"` in `mapEventType()` in `src/twitch/eventsub.ts`

## 3. IRC parsing — user-id tag

- [x] 3.1 Parse `user-id` tag from PRIVMSG in `parsePRIVMSG()` in `src/twitch/irc.ts` and include it in the returned object
- [x] 3.2 Include `userId` in the published `chat` event data in the `handleMessage()` function in `src/twitch/irc.ts`
- [x] 3.3 Add tests for `parsePRIVMSG()` with `user-id` tag present and absent

## 4. Rust persistence — suggestions module

- [x] 4.1 Create `src-tauri/src/suggestions.rs` with `read_suggestions` and `write_suggestions` Tauri commands following the `settings.rs` pattern
- [x] 4.2 Register `suggestions` module and commands in `src-tauri/src/lib.rs` (add `mod suggestions`, register commands in invoke handler, manage state in setup)

## 5. Suggestion box state

- [x] 5.1 Create `src/widgets/suggestion-box/suggestion-box-state.ts` with the Suggestion data model (`id`, `hexId`, `text`, `username`, `userId`, `redemptionId`, `rewardId`, `createdAt`, `status: "active" | "done"`, `votes`, `voters`, `checkedAt?`), module-level state array, hex ID allocator, and subscription functions
- [x] 5.2 Implement `pushSuggestion()` with hex ID allocation and redemption ID dedup, `voteSuggestion(hexId, userId)` with per-user dedup, `toggleDone(id)` toggling between `active`/`done` (setting/clearing `checkedAt`), `getSortedActive()` returning ranked list by vote count descending
- [x] 5.3 Implement hex ID allocator: random 2-digit hex assignment (00-FF), never duplicating active IDs, stable for the suggestion's lifetime, recycling from done suggestions when pool exhausted, reservation of already-assigned IDs on hydration
- [x] 5.4 Subscribe to `channel_points_redemption` events on the event bus — filter by configured reward ID, deduplicate by redemption ID, create suggestions from matching events
- [x] 5.5 Subscribe to `chat` events on the event bus — match `!vote <hex-id>` pattern (configurable trigger, case-insensitive, exact command match, valid hex ID required), deduplicate by userId + suggestionId, increment vote count on targeted suggestion
- [x] 5.6 Implement `loadSuggestions()` for hydration from persisted data (preserving hex IDs and initialising allocator with used IDs)
- [x] 5.7 Add tests for state functions (push with hex ID, vote by hex ID with dedup, toggle done/active, sorting, hex ID allocation/recycling/preservation, redemption ID dedup)

## 6. Suggestion box widget component

- [x] 6.1 Create `src/widgets/suggestion-box/SuggestionBoxWidget.tsx` following EventFeedWidget pattern (scrollable container, `space-y-1.5`, `lineBg`) with ranked list showing hex ID, suggestion text, username, and vote count per row
- [x] 6.2 Implement reversible checkbox per row — clicking toggles between `active` and `done`, done items get strikethrough text and move to done section, unchecking restores to active section
- [x] 6.3 Implement done items section below active list with configurable max visible (default 3), most recently checked shown first
- [x] 6.4 Implement auto-hide for done items after configurable duration (default 30s), measured from `checkedAt`
- [x] 6.5 Implement hover-to-reveal checkboxes in live mode following ChatWidget ChatInputContainer cursor polling pattern (`POLL_INTERVAL_MS=200`, `LONG_HOVER_MS=500`, `set_ignore_cursor`, `hoverStartRef`); checkboxes always visible in edit mode
- [x] 6.6 Implement configurable max active items visible (default 7) — only top N by vote count displayed
- [x] 6.7 Implement empty state (edit mode placeholder vs live mode hidden)
- [x] 6.8 Create settings component with reward selection dropdown (Helix API fetch), vote trigger command input, max active visible, max done visible, auto-hide duration
- [x] 6.9 Register the widget in `src/widgets/registry.ts` with `singleton: true`, defaults, settings component, and default config

## 7. Persistence integration

- [x] 7.1 Add debounced auto-save in suggestion-box-state (subscribe to state changes, invoke `write_suggestions` with 500ms debounce)
- [x] 7.2 Call `loadSuggestions()` on widget mount using `read_suggestions` command (sole backfill mechanism — no Twitch API replay available for manually-created rewards)
- [x] 7.3 Hook suggestion auto-save subscription into the persistence lifecycle (alongside existing store subscriptions in `persistence.ts` or self-contained in suggestion-box-state)

## 8. Quality and verification

- [x] 8.1 Run `yarn rust:clippy` and fix any Rust warnings in the new suggestions module
- [x] 8.2 Run `yarn typecheck` and fix any TypeScript errors
- [x] 8.3 Run `yarn lint` and fix any linting issues
- [x] 8.4 Run `yarn test` and ensure all tests pass (including new tests from 3.3 and 5.7)
- [ ] 8.5 Verify the complete flow end-to-end: redemption event -> suggestion created with hex ID -> vote by hex ID -> toggle done/active -> strikethrough + auto-hide -> persistence across restart with hex ID preservation
