## 1. Store — expiry sweep

- [ ] 1.1 Add `MESSAGE_TTL_MS` (60 000) and `SWEEP_INTERVAL_MS` (5 000) constants to `ChatWidget.tsx`
- [ ] 1.2 Implement `expireMessages()` — splice out entries where `Date.now() - msg.timestamp > MESSAGE_TTL_MS`, notify listeners only if something was removed
- [ ] 1.3 Export `startMessageExpiry()` / `stopMessageExpiry()` that manage a `setInterval` calling `expireMessages()`

## 2. Rendering — fade-out

- [ ] 2.1 In `ChatContent`, compute remaining lifetime per message and derive an inline `opacity` (1 when > 5 s left, linear ramp to 0 in the last 5 s)
- [ ] 2.2 Add a CSS `transition: opacity 1s` on each message div so opacity changes animate smoothly
- [ ] 2.3 Add a secondary `useEffect` interval (~1 s) in `ChatContent` to trigger re-renders so opacity values update while messages age

## 3. Hydration — filter expired on restore

- [ ] 3.1 In `hydrateChatHistory()` (`persistence.ts`), filter restored messages to only those within the 60 s TTL window before calling `loadChatMessages()`

## 4. Bootstrap — wire up

- [ ] 4.1 Call `startMessageExpiry()` during app initialisation (alongside `startAutoSave()`)

## 5. Verify

- [ ] 5.1 Run `yarn lint`, `yarn typecheck`, and confirm no errors
