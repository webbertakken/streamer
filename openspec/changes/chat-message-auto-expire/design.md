## Context

Chat messages live in a plain in-memory array (`messages[]` in `ChatWidget.tsx`) with a subscriber-based notification pattern. Messages are pushed by the IRC handler, capped at 200, and rendered by `ChatContent`. Persistence saves/restores messages via a debounced Tauri command with a 10-minute staleness window.

There is no mechanism to remove individual messages by age today.

## Goals / Non-Goals

**Goals:**
- Messages automatically disappear ~60 seconds after arrival
- Smooth visual fade-out so disappearance isn't jarring
- Expired messages removed from memory to avoid phantom state

**Non-Goals:**
- Making TTL user-configurable (can be added later; hardcode 60 s for now)
- Changing the 200-message hard cap behaviour
- Animating message _arrival_ (only departure)

## Decisions

### 1. Interval-based sweep in the store module

Run a `setInterval` (every ~5 s) that splices out messages older than 60 s and notifies listeners. This keeps expiry logic co-located with the existing store (`ChatWidget.tsx`) and avoids per-message timers.

**Alternative considered — per-message `setTimeout`**: More precise removal timing, but creates up to 200 concurrent timers during a busy chat and complicates cleanup. The sweep approach is simpler and the ≤5 s granularity is imperceptible to users.

### 2. CSS transition for fade-out

Each `<div>` rendered in `ChatContent` gets an inline `opacity` derived from its remaining lifetime. When a message has ≤5 s left, opacity transitions from 1 → 0 over 5 s using a CSS `transition` on opacity. This avoids adding an animation library.

### 3. Start/stop sweep lifecycle

Export `startMessageExpiry()` / `stopMessageExpiry()` from the store module. Call `startMessageExpiry()` alongside `startAutoSave()` in the app bootstrap. This keeps the interval controllable and testable.

### 4. Hydration respects TTL

In `hydrateChatHistory()`, filter restored messages to only those within the 60 s window — not just the existing 10-minute staleness check. This prevents a batch of already-expired messages appearing briefly on restore.

## Risks / Trade-offs

- **5 s sweep granularity** — messages may linger up to ~5 s past their TTL. This is acceptable; chat expiry doesn't need frame-precise timing. → Mitigation: the CSS fade hides the tail end visually.
- **Rapid chat during raids** — many messages arriving and expiring simultaneously could cause layout reflow. → Mitigation: messages fade to opacity 0 before removal, so the height collapse is less noticeable; the 200-cap already bounds the worst case.
