## MODIFIED Requirements

### Requirement: Message expiry duration
Chat messages SHALL be automatically removed after 180,000ms (3 minutes) from their timestamp. The `MESSAGE_TTL_MS` constant SHALL be set to `180_000`.

#### Scenario: Message expires after 3 minutes
- **WHEN** a chat message has been displayed for 180 seconds
- **THEN** the message SHALL be removed from the message list on the next sweep

#### Scenario: Message fades before expiry
- **WHEN** a chat message has less than 5 seconds remaining before expiry
- **THEN** the message opacity SHALL fade linearly from 1 to 0 over those 5 seconds

#### Scenario: Message visible during lifetime
- **WHEN** a chat message is less than 175 seconds old
- **THEN** the message SHALL render at full opacity
