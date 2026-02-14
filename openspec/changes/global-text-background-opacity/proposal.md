## Why

Several widgets (chat, chat presence, event feed, event log, follow events, viewer count, custom text) use a hard-coded `bg-black/30` class on individual text lines in live mode, creating a per-line text background highlight instead of a full widget background. This opacity is not user-configurable, meaning streamers cannot adjust the readability of text over their gameplay without also changing the full widget background opacity, which serves a different visual purpose.

## What changes

- **Add `textBgOpacity` global setting** to `OverlayStore` (default: 30, matching the current hard-coded `bg-black/30`) with a setter `setTextBgOpacity`
- **Add `textBgOpacity` slider** to the appearance tab in the settings panel, under the existing "Widget content" section, labelled "Text BG opacity"
- **Replace hard-coded `bg-black/30`** in all widgets that use per-line text backgrounds with a dynamic inline `backgroundColor` style using `rgba(0, 0, 0, textBgOpacity / 100)`, consumed via a new `useTextBgStyle()` hook or read directly from the store
- **Persist and restore** the new setting via the existing persistence layer
- **Add to default-settings.json** as `"textBgOpacity": 30`
- **Include in `restoreDefaults()`** and `handleSaveAsDefaults()`

### Affected widgets (use per-line text background in live mode)

| Widget | Pattern |
|---|---|
| Chat | `bg-black/30` on each message line + input |
| Chat presence | `bg-black/30` on each username line |
| Event feed | `bg-black/30` on each event line |
| Event log | `bg-black/30` on each log line |
| Follow events | `bg-black/30` on each follow line |
| Viewer count | `bg-black/30` on the count container |
| Custom text | `bg-black/30` on the text span |

### Widgets not affected (use full widget background or own config)

| Widget | Reason |
|---|---|
| Stream title | Own `backgroundColour` config |
| Stream info | No per-line background, uses full widget bg |
| Follower alerts | Gradient background, not text-level |
| Raid alerts | Gradient background, not text-level |
| Subscription alerts | Gradient background, not text-level |

## Capabilities

### New capabilities

- `text-bg-opacity`: global slider controlling the opacity of per-line text background highlights in live mode (0-100, default 30)

### Modified capabilities

- `settings-panel`: add "Text BG opacity" slider to the appearance tab's "Widget content" section
- `widget-opacity`: document the distinction between full widget background opacity (`widgetBgOpacity`) and text-level background opacity (`textBgOpacity`)

## Impact

- **`src/stores/overlay.ts`** -- add `textBgOpacity: number`, `setTextBgOpacity` to `OverlayStore`; include in `restoreDefaults()`
- **`src/stores/persistence.ts`** -- persist and hydrate `textBgOpacity`; no migration needed (new field with sensible default)
- **`src/assets/default-settings.json`** -- add `"textBgOpacity": 30`
- **`src/widgets/Widget.tsx`** -- add `useTextBgStyle()` hook returning `{ backgroundColor: rgba(0,0,0, textBgOpacity/100) }` for live mode
- **`src/widgets/chat/ChatWidget.tsx`** -- replace `bg-black/30` with dynamic style from store
- **`src/widgets/chat-presence/ChatPresenceWidget.tsx`** -- same replacement
- **`src/widgets/event-feed/EventFeedWidget.tsx`** -- same replacement
- **`src/widgets/event-log/EventLogWidget.tsx`** -- same replacement
- **`src/widgets/follow-events/FollowEventsWidget.tsx`** -- same replacement
- **`src/widgets/viewer-count/ViewerCountWidget.tsx`** -- same replacement
- **`src/widgets/custom-text/CustomTextWidget.tsx`** -- same replacement
- **`src/widgets/settings/SettingsWidget.tsx`** -- add "Text BG opacity" slider; include `textBgOpacity` in `handleSaveAsDefaults()`
