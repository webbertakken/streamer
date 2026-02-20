## ADDED Requirements

### Requirement: Rust read command for suggestions

The Rust backend SHALL provide a `read_suggestions` Tauri command that reads `suggestions.json` from the app data directory (`~/.config/streamer/`). It SHALL return `null` if the file does not exist.

#### Scenario: Suggestions file exists

- **WHEN** `read_suggestions` is invoked and `suggestions.json` exists
- **THEN** the command returns the parsed JSON content

#### Scenario: Suggestions file does not exist

- **WHEN** `read_suggestions` is invoked and `suggestions.json` does not exist
- **THEN** the command returns `null`

#### Scenario: Suggestions file is corrupt

- **WHEN** `read_suggestions` is invoked and `suggestions.json` contains invalid JSON
- **THEN** the command returns an error

### Requirement: Rust write command for suggestions

The Rust backend SHALL provide a `write_suggestions` Tauri command that writes JSON data to `suggestions.json` in the app data directory. It SHALL create the parent directory if it does not exist.

#### Scenario: Write suggestions to disk

- **WHEN** `write_suggestions` is invoked with a valid JSON payload
- **THEN** the data is written to `~/.config/streamer/suggestions.json` as pretty-printed JSON

### Requirement: Command registration

The `read_suggestions` and `write_suggestions` commands SHALL be registered in the Tauri invoke handler in `lib.rs`.

#### Scenario: Commands are callable from frontend

- **WHEN** the frontend invokes `read_suggestions` or `write_suggestions`
- **THEN** the commands execute without "command not found" errors

### Requirement: Debounced auto-save

The suggestion state module SHALL subscribe to state changes and trigger a debounced save (500ms) using the `write_suggestions` command, following the same pattern as `scheduleSave()` in `persistence.ts`.

#### Scenario: State changes trigger debounced save

- **WHEN** a suggestion is added, voted on, or status-changed
- **THEN** a save is scheduled for 500ms later

#### Scenario: Rapid state changes coalesce

- **WHEN** multiple state changes occur within 500ms
- **THEN** only one write operation is performed (the debounce timer resets on each change)

### Requirement: Hydration on widget mount

The suggestion box widget SHALL load persisted suggestions from disk when it mounts, using the `read_suggestions` command. This is the sole backfill mechanism — there is no Twitch API replay for missed redemptions.

#### Scenario: Suggestions restored on mount

- **WHEN** the suggestion box widget mounts and `suggestions.json` exists with valid data
- **THEN** the suggestion state is populated with the persisted suggestions (including hex IDs, vote counts, and statuses)

#### Scenario: No persisted suggestions

- **WHEN** the suggestion box widget mounts and `suggestions.json` does not exist
- **THEN** the suggestion state starts empty

### Requirement: Persistence file location

Suggestions SHALL be stored at `~/.config/streamer/suggestions.json`, consistent with the app's existing data directory.

#### Scenario: File stored in correct location

- **WHEN** suggestions are saved
- **THEN** the file is written to `~/.config/streamer/suggestions.json`

### Requirement: Hex ID preservation across restarts

Persisted suggestions SHALL retain their hex IDs when restored from disk. The hex ID allocator SHALL account for already-assigned IDs when allocating new ones.

#### Scenario: Hex IDs preserved on restart

- **WHEN** suggestions are loaded from disk with hex IDs `0a`, `1b`, `2c`
- **THEN** those suggestions retain their hex IDs and new suggestions receive IDs not in `{0a, 1b, 2c}`
