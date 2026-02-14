## Why

Twitch emotes in chat messages are not rendered — they appear as plain text (e.g. "thecod67Noted" instead of an inline image). The IRC connection already receives emote metadata in the `emotes` tag but discards it during parsing, so chat messages lose all emote information before reaching the UI.

## What changes

- **Parse emote metadata from IRC**: extract the `emotes` tag in `parsePRIVMSG`, capturing emote IDs and their character positions within the message text
- **Carry emote data through the message model**: add an `emotes` field to `ChatMessage` so parsed emote positions flow from IRC to the renderer
- **Render emotes as inline images**: replace emote text ranges with `<img>` elements using the Twitch CDN, following the same inline-image pattern already used for badges

This covers all native Twitch emotes (global, channel, and subscriber). Third-party emote providers (BTTV, FFZ, 7TV) are out of scope.

## Capabilities

### New capabilities

- `twitch-emote-rendering`: native Twitch emotes rendered as inline images within chat messages

### Modified capabilities

_None._

## Impact

- **`src/twitch/irc.ts`** — parse the `emotes` tag in `parsePRIVMSG`, include emote data in the returned object and in `pushChatMessage` calls
- **`src/widgets/chat/chat-state.ts`** — add `emotes` field to `ChatMessage` interface
- **`src/widgets/chat/ChatWidget.tsx`** — split message text into text and emote image segments for rendering
