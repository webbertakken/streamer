## ADDED Requirements

### Requirement: Authenticated IRC connection

When the streamer is authenticated, the IRC connection SHALL use the OAuth token and the streamer's username instead of the anonymous `justinfan` identity. The connection SHALL request capabilities: `twitch.tv/tags`, `twitch.tv/commands`, `twitch.tv/membership`.

#### Scenario: Authenticated connection established

- **WHEN** the streamer is logged in and connects to a channel
- **THEN** the IRC connection sends `PASS oauth:<token>` and `NICK <username>`
- **AND** requests all three capabilities (tags, commands, membership)
- **AND** the chat widget displays messages as before

#### Scenario: Fallback to anonymous when not authenticated

- **WHEN** the streamer is not logged in and connects to a channel
- **THEN** the IRC connection uses `NICK justinfan12345` without a `PASS` line
- **AND** only requests `twitch.tv/tags` capability
- **AND** the chat input is disabled with a message indicating login is required

### Requirement: Chat input in the chat widget

The chat widget SHALL include a text input at the bottom for sending messages. The input MUST only be enabled when the streamer is authenticated.

#### Scenario: Sending a chat message

- **WHEN** the streamer types a message and presses Enter
- **THEN** the system sends `PRIVMSG #channel :message` via the IRC connection
- **AND** the input field is cleared

#### Scenario: Chat input disabled when not authenticated

- **WHEN** the streamer is not logged in
- **THEN** the chat input is visible but disabled
- **AND** placeholder text indicates "Log in to chat"

#### Scenario: Chat input disabled when not connected

- **WHEN** the IRC connection is not active
- **THEN** the chat input is disabled
- **AND** placeholder text indicates "Not connected"

### Requirement: Chat input respects edit mode

The chat input SHALL only be interactive when edit mode is active (so pointer events reach it). When edit mode is off, the overlay is click-through and the input is not usable.

#### Scenario: Input usable in edit mode

- **WHEN** edit mode is active and the streamer is authenticated
- **THEN** the chat input accepts focus, typing, and submission

#### Scenario: Input not usable outside edit mode

- **WHEN** edit mode is off
- **THEN** the entire overlay is click-through and the chat input cannot receive focus
