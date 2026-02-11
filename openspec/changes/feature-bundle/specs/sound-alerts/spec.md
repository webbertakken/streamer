# Sound alerts

## ADDED Requirements

### Requirement: Event-triggered audio playback

The system SHALL play audio notifications when configured Twitch events are received via the event bus.

#### Scenario: Sound plays for configured event

- **WHEN** a Twitch event occurs for which a sound is configured
- **THEN** the system MUST play the assigned sound using HTMLAudioElement

#### Scenario: No sound for unconfigured event

- **WHEN** a Twitch event occurs for which no sound is assigned
- **THEN** the system MUST NOT play any audio

### Requirement: Bundled default sounds

The system SHALL include default sound files as Vite assets for common notification types.

#### Scenario: Default sounds available

- **WHEN** the application is installed
- **THEN** the system MUST provide bundled MP3 files for chime, ding, fanfare, and alert sounds

### Requirement: Custom sound file support

The system SHALL allow users to select custom audio files from their filesystem for event notifications.

#### Scenario: Custom sound selection

- **WHEN** the user chooses to assign a custom sound to an event type
- **THEN** the system MUST open a Tauri file dialogue to select an audio file and store the file path in settings

#### Scenario: Custom sound playback

- **WHEN** an event with an assigned custom sound occurs
- **THEN** the system MUST play the audio file from the stored path

### Requirement: Per-event sound mapping

The system SHALL maintain a mapping of event types to their assigned sounds (bundled or custom).

#### Scenario: Event type sound assignment

- **WHEN** the user configures sound alerts
- **THEN** the system MUST allow independent sound assignment for follow, raid, subscribe, gift_sub, and cheer event types

### Requirement: Global volume control

The system SHALL provide a global volume control affecting all sound alert playback.

#### Scenario: Volume adjustment

- **WHEN** the user adjusts the volume slider (0-100%)
- **THEN** all subsequently played sounds MUST respect the configured volume level

#### Scenario: Volume persistence

- **WHEN** the application restarts
- **THEN** the system MUST restore the previously configured volume setting

### Requirement: Master enable/disable toggle

The system SHALL provide a master toggle to enable or disable all sound alerts.

#### Scenario: Sounds disabled

- **WHEN** the master toggle is disabled
- **THEN** the system MUST NOT play any event sounds regardless of individual event configuration

#### Scenario: Sounds enabled

- **WHEN** the master toggle is enabled
- **THEN** the system MUST play sounds for configured events according to their individual settings

### Requirement: Sound configuration interface

The system SHALL provide sound alert configuration controls within the settings Appearance tab.

#### Scenario: Configuration UI available

- **WHEN** the user navigates to the Appearance tab in settings
- **THEN** the system MUST display controls for master toggle, volume slider, and per-event sound assignment
