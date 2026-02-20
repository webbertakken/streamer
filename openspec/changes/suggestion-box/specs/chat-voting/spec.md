## ADDED Requirements

### Requirement: Parse user-id from IRC PRIVMSG

The IRC parser SHALL extract the `user-id` tag from PRIVMSG messages and include it as `userId` in the parsed message result.

#### Scenario: PRIVMSG with user-id tag

- **WHEN** a PRIVMSG IRC line contains a `user-id` tag (e.g. `user-id=12345`)
- **THEN** the parsed result includes `userId: "12345"`

#### Scenario: PRIVMSG without user-id tag

- **WHEN** a PRIVMSG IRC line does not contain a `user-id` tag
- **THEN** the parsed result includes `userId` as an empty string

### Requirement: Include userId in chat event data

The IRC message handler SHALL include the `userId` field in the published `chat` event data.

#### Scenario: Chat event includes userId

- **WHEN** a PRIVMSG is parsed and published as a `chat` event on the event bus
- **THEN** the event data includes `userId` alongside `username` and `text`

### Requirement: Vote command matching with hex ID

The suggestion box state SHALL listen for chat events matching the configured vote trigger command followed by a hex ID (default `!vote <hex-id>`). Matching SHALL be case-insensitive for both the command and the hex ID. The command SHALL match exactly (no partial matches on the trigger word), and the hex ID SHALL be a valid 1-2 character hex string.

#### Scenario: Valid vote with hex ID

- **WHEN** a chat event with text `!vote a3` is received
- **THEN** the system registers a vote for the suggestion with hex ID `a3`

#### Scenario: Case-insensitive vote command and hex ID

- **WHEN** a chat event with text `!Vote A3` or `!VOTE a3` is received
- **THEN** the system registers a vote for the suggestion with hex ID `a3`

#### Scenario: Partial match does not trigger vote

- **WHEN** a chat event with text `!voteforpedro` is received
- **THEN** no vote is registered

#### Scenario: Vote with no hex ID

- **WHEN** a chat event with text `!vote` (no hex ID) is received
- **THEN** no vote is registered

#### Scenario: Vote with invalid hex ID

- **WHEN** a chat event with text `!vote zz` (invalid hex) is received
- **THEN** no vote is registered

#### Scenario: Vote for non-existent hex ID

- **WHEN** a chat event with text `!vote ff` is received and no suggestion has hex ID `ff`
- **THEN** no vote is registered (silently ignored)

### Requirement: One vote per user per suggestion

The system SHALL enforce one vote per user per suggestion, using the `userId` from the chat event for deduplication. Duplicate votes SHALL be silently ignored.

#### Scenario: First vote from a user

- **WHEN** a user votes on a suggestion they have not previously voted on
- **THEN** the suggestion's vote count increments by 1 and the user's ID is added to the voters array

#### Scenario: Duplicate vote from same user

- **WHEN** a user votes on a suggestion they have already voted on (userId exists in voters array)
- **THEN** the vote is silently ignored and the vote count does not change

### Requirement: Silent vote operation

The system SHALL NOT send any chat response or visual feedback in response to vote commands. No cooldown SHALL be applied to vote commands.

#### Scenario: Vote processed silently

- **WHEN** a valid vote command is received and processed
- **THEN** no message is sent to chat and no cooldown is enforced

### Requirement: Votes apply to targeted suggestion by hex ID

Votes SHALL apply to the specific suggestion identified by the hex ID in the vote command, not to any "current" or "displayed" suggestion.

#### Scenario: Vote targets specific suggestion

- **WHEN** suggestion A has hex ID `0a` and suggestion B has hex ID `1b`, and a user types `!vote 1b`
- **THEN** suggestion B's vote count increases (not suggestion A)
