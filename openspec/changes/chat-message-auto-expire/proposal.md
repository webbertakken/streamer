## Why

Chat messages currently persist for the entire session (up to 200 in memory), cluttering the chat widget during long streams. Messages should automatically fade out after 1 minute to keep the overlay clean and only show recent, relevant conversation.

## What Changes

- Add a timer-based expiry mechanism that removes chat messages 1 minute after they arrive
- Messages fade out visually before being removed from the in-memory store
- The existing 200-message hard cap remains as a secondary safeguard

## Capabilities

### New Capabilities

- `chat-message-expiry`: Automatic removal of chat messages after a configurable TTL (default 60 seconds), including fade-out animation and periodic cleanup of the in-memory message store

### Modified Capabilities

_(none — no existing spec-level requirements change)_

## Impact

- **`src/widgets/chat/ChatWidget.tsx`**: In-memory store gains expiry/cleanup logic; message rendering adds fade-out animation based on age
- **`src/stores/persistence.ts`**: Hydration should respect TTL — discard messages older than the expiry window on restore
- **No breaking changes** — purely additive behaviour on the existing chat pipeline
