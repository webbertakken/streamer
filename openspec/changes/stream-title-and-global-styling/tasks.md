## 1. Global border-radius store and settings UI

- [x] 1.1 Add `borderRadius: number` (default 8) and `setBorderRadius` to `OverlayStore` in `src/stores/overlay.ts`, include in persist config
- [x] 1.2 Add "Rounded corners" range slider (0–24px) with numeric readout to the appearance tab in `src/widgets/settings/SettingsWidget.tsx`

## 2. Consume global border-radius across widgets

- [x] 2.1 In `src/widgets/Widget.tsx`, replace hardcoded `rounded-lg` on the content wrapper with inline `style={{ borderRadius }}` from the store
- [x] 2.2 In alert widgets (`FollowerAlertWidget`, `RaidAlertWidget`, `SubscriptionAlertWidget`), replace `rounded-xl` with inline `style={{ borderRadius }}` from the store
- [x] 2.3 In `src/widgets/chat/ChatWidget.tsx`, replace `rounded` on chat message `bg-black/30` containers with inline `style={{ borderRadius }}` from the store

## 3. Chat message TTL

- [x] 3.1 Change `MESSAGE_TTL_MS` from `60_000` to `180_000` in `src/widgets/chat/ChatWidget.tsx`

## 4. Stream title widget config and settings component

- [x] 4.1 Extend `StreamTitleConfig` interface with `fontFamily` (default `"inherit"`), `fontSize` (default `14`), `textColour` (default `"#ffffff"`), `backgroundColour` (default `"transparent"`)
- [x] 4.2 Update `defaultConfig` in the stream-title `registerWidget` call in `src/widgets/stream-title/StreamTitleWidget.tsx` to include all new fields
- [x] 4.3 Create `StreamTitleSettings` component with: "Show outside edit mode" checkbox, font family fuzzy input, font size number input (10–48), text colour picker, background colour picker
- [x] 4.4 Register `settingsComponent: StreamTitleSettings` on the stream-title widget definition

## 5. Font family fuzzy picker

- [x] 5.1 Install a lightweight fuzzy search library (e.g. `fzf-for-js`)
- [x] 5.2 Create a `loadSystemFonts` utility using `window.queryLocalFonts()` that returns cached unique font family names
- [x] 5.3 Build a reusable `FontPicker` component: text input with fuzzy-match autocomplete dropdown, inline font preview, free-text fallback when API unavailable

## 6. Stream title styled rendering

- [x] 6.1 Apply `fontFamily`, `fontSize`, `color`, and `backgroundColor` from config as inline styles on the title display element in `StreamTitleContent`
- [x] 6.2 Ensure the widget respects `showOutsideEditMode` — visible outside edit mode when toggled on, hidden when toggled off
