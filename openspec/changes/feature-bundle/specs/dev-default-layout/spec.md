# Dev default layout specification

## ADDED Requirements

### Requirement: dev-mode settings button

The settings panel SHALL provide a dev-mode-only button to snapshot the current widget layout.

#### Scenario: button visibility in development

- **WHEN** the application is running with `import.meta.env.DEV` set to true
- **THEN** a "Save current layout as default" button SHALL be visible in the General tab of settings

#### Scenario: button hidden in production

- **WHEN** the application is running with `import.meta.env.DEV` set to false
- **THEN** the "Save current layout as default" button SHALL NOT be rendered

#### Scenario: button activation

- **WHEN** the user clicks the "Save current layout as default" button
- **THEN** the current WidgetInstance array SHALL be serialised to JSON
- **THEN** the Rust `write_default_layout` command SHALL be invoked with the serialised layout

### Requirement: Rust write command

The Rust backend SHALL provide a debug-only command to write the default layout file.

#### Scenario: command availability in debug builds

- **WHEN** the application is compiled with `#[cfg(debug_assertions)]`
- **THEN** the `write_default_layout` command SHALL be registered and available

#### Scenario: command unavailable in release builds

- **WHEN** the application is compiled without `#[cfg(debug_assertions)]`
- **THEN** the `write_default_layout` command SHALL NOT be compiled or available

#### Scenario: successful file write

- **WHEN** the `write_default_layout` command is invoked with valid layout data
- **THEN** the data SHALL be written to `src/assets/default-layout.json`
- **THEN** the file SHALL be formatted as valid JSON
- **THEN** a success response SHALL be returned to the frontend

#### Scenario: write error handling

- **WHEN** the `write_default_layout` command encounters a file system error
- **THEN** an error response SHALL be returned to the frontend
- **THEN** the error message SHALL be displayed to the user

### Requirement: default layout loading

The seedIfNeeded() function SHALL use the default-layout.json file as the source for initial widgets.

#### Scenario: default layout file exists

- **WHEN** seedIfNeeded() is called and `src/assets/default-layout.json` exists
- **THEN** the file SHALL be imported as a Vite JSON asset
- **THEN** the WidgetInstance array from the file SHALL be used as the initial layout

#### Scenario: widget type in default layout

- **WHEN** a widget type is present in default-layout.json
- **THEN** the widget instances from the file SHALL be used
- **THEN** registry defaults for that widget type SHALL NOT be instantiated

#### Scenario: widget type not in default layout

- **WHEN** a widget type is NOT present in default-layout.json
- **THEN** the registry defaults for that widget type SHALL be used as a fallback
- **THEN** the widget SHALL be initialised using its registered default configuration

#### Scenario: missing default layout file

- **WHEN** seedIfNeeded() is called and `src/assets/default-layout.json` does not exist
- **THEN** all widget types SHALL use their registry defaults
- **THEN** the layout SHALL be constructed from per-widget registry defaults

### Requirement: source control integration

The default-layout.json file SHALL be tracked in version control.

#### Scenario: file committed to repository

- **WHEN** default-layout.json is created or modified
- **THEN** the file SHALL be committed to the Git repository
- **THEN** the file SHALL NOT be listed in .gitignore

#### Scenario: file location

- **WHEN** the default layout is written
- **THEN** the file MUST be located at `src/assets/default-layout.json`
- **THEN** the file SHALL be within the source tree for Vite asset importing
