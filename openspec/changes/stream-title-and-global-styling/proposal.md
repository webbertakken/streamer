## Why

The stream title widget is currently limited — it hides outside edit mode and has no visual customisation. Streamers need to display their title on the overlay during broadcasts with styling that matches their brand. Additionally, chat messages expire too quickly (60s), and there's no global control over rounded corners across all visible elements.

## What changes

- **Stream title display toggle**: allow the widget to remain visible outside edit mode (the config exists but there's no UI to control it, plus add font, size, colour, and background colour settings)
- **Stream title styling**: configurable font family, font size, text colour, and background colour per-instance
- **Global rounded corners setting**: a single setting in the appearance tab that controls `border-radius` for all widget backgrounds, alert boxes, chat message bubbles, and other visible elements
- **Chat message TTL**: increase `MESSAGE_TTL_MS` from 60,000ms to 180,000ms (3 minutes)

## Capabilities

### New capabilities
- `global-styling`: global appearance settings (rounded corners) applied across all widgets and visible UI elements

### Modified capabilities
- `stream-title`: add display-mode toggle UI and per-widget font/size/colour/background styling options
- `chat-messages`: change message expiry from 60s to 180s

## Impact

- **`src/widgets/stream-title/StreamTitleWidget.tsx`** — settings component, config interface expansion, styled rendering
- **`src/widgets/chat/ChatWidget.tsx`** — `MESSAGE_TTL_MS` constant change
- **`src/stores/overlay.ts`** — new `borderRadius` (or similar) field in the overlay store
- **`src/widgets/settings/SettingsWidget.tsx`** — new rounded corners control in the appearance tab
- **`src/widgets/Widget.tsx`** — consume global border-radius and apply to widget wrappers
- **`src/widgets/registry.ts`** — expanded `defaultConfig` for stream-title
- **Alert widgets** (`FollowerAlertWidget`, `RaidAlertWidget`, `SubscriptionAlertWidget`) — consume global border-radius instead of hardcoded `rounded-xl`
