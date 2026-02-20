## ADDED Requirements

### Requirement: Suggestion data model

The system SHALL represent each suggestion with the following fields: `id` (UUID), `hexId` (unique 2-digit hex string, 00-FF), `text` (string, max 200 characters), `username` (Twitch display name), `userId` (Twitch user ID), `redemptionId` (Twitch redemption ID), `rewardId` (reward ID), `createdAt` (epoch ms), `status` (one of `active`, `done`), `votes` (number), `voters` (array of user IDs), `checkedAt` (epoch ms, optional — set when status changes to `done`).

New suggestions SHALL default to `active` status with 0 votes, an empty voters array, and no `checkedAt`.

#### Scenario: New suggestion is created from a redemption event

- **WHEN** a channel points redemption event arrives with matching reward ID
- **THEN** the system creates a suggestion with status `active`, votes `0`, empty voters, a unique hex ID, and the text/username/userId from the redemption event

### Requirement: Hex ID allocation

Each suggestion SHALL be assigned a unique 2-digit hexadecimal identifier (00-FF) on creation, chosen randomly from the available pool. IDs SHALL be stable for the lifetime of a suggestion and SHALL NOT be reassigned while the suggestion exists. When all 256 IDs are in use, IDs from done suggestions SHALL be recycled.

#### Scenario: Random hex ID assignment

- **WHEN** a new suggestion is created and unused hex IDs are available
- **THEN** the suggestion receives a randomly chosen hex ID from the available pool

#### Scenario: Hex ID stability

- **WHEN** a suggestion exists with hex ID `a3`
- **THEN** the hex ID remains `a3` regardless of vote count changes or position shifts

#### Scenario: Hex ID recycling

- **WHEN** all 256 hex IDs are in use and a new suggestion arrives
- **THEN** the system recycles a hex ID from a done suggestion

### Requirement: Widget registration

The system SHALL register a `suggestion-box` widget in the widget registry with `singleton: true`, a settings component, and default position/size values.

#### Scenario: Widget appears in the add-widget menu

- **WHEN** the user opens the widget picker in edit mode
- **THEN** a "Suggestion box" option is available

#### Scenario: Only one instance allowed

- **WHEN** a suggestion box widget already exists
- **THEN** the widget picker does not allow adding a second instance

### Requirement: Ranked list display

The widget SHALL display a ranked list of suggestions following the EventFeedWidget pattern (scrollable container, `space-y-1.5` spacing, `lineBg` text background). Each list item SHALL show the hex ID, suggestion text, submitter username, and vote count. Active suggestions SHALL be sorted by vote count descending.

#### Scenario: Multiple active suggestions

- **WHEN** multiple active suggestions exist with different vote counts
- **THEN** the widget displays them as a ranked list sorted by vote count descending, with hex IDs, text, username, and vote count visible for each

#### Scenario: No active suggestions in edit mode

- **WHEN** no active suggestions exist and the overlay is in edit mode
- **THEN** the widget displays an empty state placeholder

#### Scenario: No active suggestions in live mode

- **WHEN** no active suggestions exist and the overlay is not in edit mode
- **THEN** the widget displays nothing (empty/hidden content)

### Requirement: Configurable max active items visible

The widget settings SHALL include a configurable maximum number of active suggestions visible in the list, with a default of 7. Suggestions beyond this limit SHALL be hidden but still exist in state.

#### Scenario: More suggestions than max visible

- **WHEN** 12 active suggestions exist and max active visible is 7
- **THEN** only the top 7 by vote count are displayed

#### Scenario: Default max active items

- **WHEN** no custom value is configured for max active visible
- **THEN** the default of 7 is used

### Requirement: Reversible checkbox to mark suggestions done

Each suggestion in the list SHALL have a checkbox. Clicking the checkbox on an active suggestion SHALL set its status to `done`, apply a strikethrough style, and move it to the done section. Clicking the checkbox on a done suggestion SHALL restore its status to `active` and move it back to the active section.

#### Scenario: Mark a suggestion as done

- **WHEN** the streamer clicks the checkbox on an active suggestion
- **THEN** the suggestion's status changes to `done`, `checkedAt` is set to the current time, the text is displayed with strikethrough, and the suggestion moves to the done section below active suggestions

#### Scenario: Uncheck a done suggestion

- **WHEN** the streamer clicks the checkbox on a done suggestion
- **THEN** the suggestion's status changes back to `active`, `checkedAt` is cleared, the strikethrough is removed, and the suggestion returns to the active section in its ranked position

### Requirement: Done items section

Done (strikethrough) suggestions SHALL be displayed below active suggestions in the list. The number of visible done items SHALL be configurable with a default of 3, showing the most recently checked first.

#### Scenario: Done items displayed below active

- **WHEN** both active and done suggestions exist
- **THEN** active suggestions appear first (ranked by votes), followed by done suggestions below

#### Scenario: Max done items visible

- **WHEN** 5 done suggestions exist and max done visible is 3
- **THEN** only the 3 most recently checked are displayed

### Requirement: Auto-hide done items

Done suggestions SHALL automatically hide after a configurable duration (default: 30 seconds). The duration is measured from the `checkedAt` timestamp.

#### Scenario: Done item auto-hides

- **WHEN** a suggestion is marked done and the configured auto-hide duration (default 30s) elapses
- **THEN** the suggestion is no longer visible in the done section

#### Scenario: Auto-hide duration configurable

- **WHEN** the auto-hide duration is set to 60 seconds in settings
- **THEN** done items remain visible for 60 seconds before hiding

### Requirement: Hover-to-reveal checkboxes in live mode

In live mode (not edit mode), suggestion checkboxes SHALL only appear when the streamer hovers over the widget for 500ms. This SHALL use the same OS cursor position polling pattern as the ChatWidget ChatInputContainer (`POLL_INTERVAL_MS=200`, `LONG_HOVER_MS=500`, `set_ignore_cursor`).

#### Scenario: Checkbox hidden in live mode by default

- **WHEN** the overlay is in live mode and the cursor is not hovering over the widget
- **THEN** checkboxes are not visible

#### Scenario: Checkbox appears after hover delay

- **WHEN** the overlay is in live mode and the cursor hovers over the suggestion box widget for 500ms
- **THEN** checkboxes become visible for all suggestions in the list

#### Scenario: Checkboxes always visible in edit mode

- **WHEN** the overlay is in edit mode
- **THEN** checkboxes are always visible (no hover required)

### Requirement: Redemption event filtering

The suggestion box state SHALL only create suggestions from `channel_points_redemption` events whose `reward.id` matches the configured reward ID in the widget instance config. Duplicates SHALL be rejected by `redemptionId`.

#### Scenario: Matching reward redemption

- **WHEN** a `channel_points_redemption` event arrives with a reward ID matching the configured reward
- **THEN** a new suggestion is created from the event data

#### Scenario: Non-matching reward redemption

- **WHEN** a `channel_points_redemption` event arrives with a reward ID that does not match the configured reward
- **THEN** no suggestion is created

#### Scenario: No reward selected

- **WHEN** no reward is selected in settings
- **THEN** no channel point redemptions create suggestions (feature is inactive)

#### Scenario: Duplicate redemption ID

- **WHEN** a `channel_points_redemption` event arrives with a redemption ID that already exists in state
- **THEN** no duplicate suggestion is created

### Requirement: Reward selection in settings

The widget settings SHALL include a dropdown of available channel point custom rewards fetched via the Helix API (`GET /channel_points/custom_rewards`). The selected reward ID SHALL be stored in the widget instance config.

#### Scenario: Rewards loaded in settings

- **WHEN** the user opens the suggestion box widget settings
- **THEN** a dropdown lists the broadcaster's available channel point custom rewards

#### Scenario: Reward selected

- **WHEN** the user selects a reward from the dropdown
- **THEN** the reward ID is stored in the widget instance config

### Requirement: State follows module-level pattern

The suggestion box state SHALL follow the module-level array + listeners pattern (Pattern A), consistent with chat-state and event-feed state. It SHALL expose subscription and unsubscription functions for external consumers (e.g. persistence).

#### Scenario: External subscription to state changes

- **WHEN** the persistence layer subscribes to suggestion state changes
- **THEN** it receives notifications when suggestions are added, voted on, or status-changed

### Requirement: Vote trigger configuration

The widget settings SHALL include a configurable vote trigger command with `!vote` as the default.

#### Scenario: Custom vote trigger

- **WHEN** the user changes the vote trigger to `!upvote` in settings
- **THEN** only `!upvote <hex-id>` chat messages trigger votes

### Requirement: Display settings

The widget settings SHALL include controls for: max active items visible (default 7), max done items visible (default 3), and auto-hide duration for done items (default 30 seconds).

#### Scenario: Settings updated

- **WHEN** the user changes max active items to 10
- **THEN** up to 10 active suggestions are visible in the list
