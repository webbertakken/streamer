# Chat commands specification

## ADDED Requirements

### Requirement: Command registry storage

The system SHALL store a command registry in the overlay store with persistence, containing trigger, response template, and enabled toggle for each command.

#### Scenario: Command registry persisted

- **WHEN** a command is added or modified in the registry
- **THEN** the system SHALL persist the command configuration to the overlay store

#### Scenario: Command registry loaded on initialisation

- **WHEN** the overlay initialises
- **THEN** the system SHALL load the command registry from the overlay store

### Requirement: Template variable resolution

The system SHALL resolve template variables in command response templates, supporting: {uptime}, {game}, {title}, {viewers}, {followers}.

#### Scenario: Template variables resolved in response

- **WHEN** a command response contains template variables
- **THEN** the system SHALL replace {uptime} with stream uptime, {game} with current game/category, {title} with stream title, {viewers} with current viewer count, and {followers} with follower count

#### Scenario: Response sent with resolved variables

- **WHEN** a command is triggered
- **THEN** the system SHALL send the response with all template variables resolved to current values

### Requirement: Parse commands from IRC messages

The system SHALL parse commands from IRC PRIVMSG messages, detecting triggers that match registered commands.

#### Scenario: Command trigger detected in chat message

- **WHEN** an IRC PRIVMSG message contains text matching a registered command trigger
- **THEN** the system SHALL identify the command and prepare to execute it

#### Scenario: Non-command messages ignored

- **WHEN** an IRC PRIVMSG message does not match any registered command trigger
- **THEN** the system SHALL not execute any command logic

### Requirement: Send responses via existing sendChatMessage

The system SHALL send command responses to Twitch chat using the existing sendChatMessage() function.

#### Scenario: Command response sent to chat

- **WHEN** a command is triggered and cooldown permits
- **THEN** the system SHALL call sendChatMessage() with the resolved response text

### Requirement: Global 5-second cooldown

The system SHALL enforce a global 5-second cooldown between command responses, preventing response spam.

#### Scenario: Command triggers respect cooldown

- **WHEN** a command is triggered within 5 seconds of the previous response
- **THEN** the system SHALL not send a response

#### Scenario: Command triggers after cooldown

- **WHEN** a command is triggered more than 5 seconds after the previous response
- **THEN** the system SHALL send the command response

### Requirement: Built-in default commands

The system SHALL ship with built-in default commands (!uptime, !game) that are enabled by default.

#### Scenario: Default commands available on first launch

- **WHEN** the overlay initialises for the first time with no saved command registry
- **THEN** the system SHALL populate the registry with !uptime and !game commands in enabled state

#### Scenario: !uptime command shows stream uptime

- **WHEN** the !uptime command is triggered
- **THEN** the system SHALL respond with the current stream uptime

#### Scenario: !game command shows current game

- **WHEN** the !game command is triggered
- **THEN** the system SHALL respond with the current game/category

### Requirement: Command management UI

The system SHALL provide a command management interface in the settings Twitch tab, allowing users to add, edit, delete, and toggle commands.

#### Scenario: Add new command

- **WHEN** a user adds a new command via the management UI
- **THEN** the system SHALL create the command in the registry with the specified trigger, response, and enabled state

#### Scenario: Edit existing command

- **WHEN** a user modifies an existing command via the management UI
- **THEN** the system SHALL update the command's trigger, response, or enabled state in the registry

#### Scenario: Delete command

- **WHEN** a user deletes a command via the management UI
- **THEN** the system SHALL remove the command from the registry

#### Scenario: Toggle command enabled state

- **WHEN** a user toggles a command's enabled state via the management UI
- **THEN** the system SHALL update the command's enabled field and the command SHALL only trigger when enabled

### Requirement: Commands require authentication

The system SHALL only process and respond to commands when the user is authenticated with Twitch, not in anonymous IRC mode.

#### Scenario: Commands active when authenticated

- **WHEN** the user is authenticated with Twitch
- **THEN** the system SHALL process and respond to registered command triggers

#### Scenario: Commands inactive in anonymous mode

- **WHEN** the user is connected in anonymous IRC mode
- **THEN** the system SHALL not process or respond to command triggers
