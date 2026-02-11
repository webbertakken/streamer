# Runtime log level specification

## ADDED Requirements

### Requirement: stdin command interface

The application SHALL provide a stdin-based command interface for runtime log level control.

#### Scenario: command reader initialisation

- **WHEN** the application starts
- **THEN** a tokio task SHALL be spawned to read lines from stdin
- **THEN** the task SHALL continue reading until stdin is closed or the application terminates

#### Scenario: valid log level command

- **WHEN** the user enters `log <level>` where level is one of: trace, debug, info, warn, error
- **THEN** the tracing EnvFilter SHALL be updated to the specified level
- **THEN** a confirmation message SHALL be printed to stderr indicating the new level

#### Scenario: invalid log level command

- **WHEN** the user enters `log <level>` with an invalid level value
- **THEN** usage help SHALL be printed to stderr
- **THEN** the current log level SHALL remain unchanged

#### Scenario: invalid command format

- **WHEN** the user enters a command that does not match `log <level>`
- **THEN** usage help SHALL be printed to stderr
- **THEN** the current log level SHALL remain unchanged

### Requirement: tracing-subscriber integration

The application SHALL use tracing-subscriber's reload layer to enable dynamic log level changes.

#### Scenario: reload handle initialisation

- **WHEN** the tracing subscriber is initialised
- **THEN** a reload layer SHALL wrap the EnvFilter
- **THEN** a reload handle SHALL be made available to the stdin command task

#### Scenario: reload handle update

- **WHEN** a valid log level command is received
- **THEN** the reload handle SHALL update the EnvFilter with the new level
- **THEN** subsequent log events SHALL respect the new filter level

### Requirement: dependency configuration

The Cargo.toml manifest SHALL include the required tracing-subscriber features.

#### Scenario: env-filter feature availability

- **WHEN** the project is built
- **THEN** the `env-filter` feature SHALL be enabled for the tracing-subscriber dependency
- **THEN** EnvFilter functionality SHALL be available at compile time

### Requirement: compatibility with existing logging

The runtime log level feature SHALL work alongside existing logging configuration.

#### Scenario: multi-layer subscriber

- **WHEN** the tracing subscriber is configured
- **THEN** the reload layer SHALL work with existing file and stderr logging layers
- **THEN** log level changes SHALL affect all configured output layers

#### Scenario: initial log level

- **WHEN** the application starts
- **THEN** the initial log level SHALL be determined by existing environment variables or defaults
- **THEN** the runtime command interface SHALL be available to override this level
