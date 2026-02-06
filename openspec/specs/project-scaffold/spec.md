# project-scaffold Specification

## Purpose
TBD - created by archiving change scaffold-tauri-react-project. Update Purpose after archive.
## Requirements
### Requirement: Tauri application initialised

The project MUST contain a working Tauri v2 application with a React + TypeScript frontend.

#### Scenario: Application builds and launches

- **WHEN** the developer runs the Tauri dev command
- **THEN** a transparent, always-on-top window appears
- **AND** the React frontend renders inside the webview

### Requirement: Frontend tooling configured

The project MUST have Tailwind CSS and Zustand installed and configured.

#### Scenario: Styles and state available

- **WHEN** a React component uses Tailwind classes
- **THEN** the styles are applied correctly
- **AND** Zustand stores are accessible from any component

### Requirement: Widget registry exists

The project MUST include an empty widget registry module for future widget registration.

#### Scenario: Registry is importable

- **WHEN** a developer imports the widget registry
- **THEN** it exports a registration function and a way to list registered widgets
- **AND** zero widgets are registered by default

### Requirement: MIT licence present

The project MUST include an MIT licence file at the repository root.

#### Scenario: Licence file exists

- **WHEN** a user views the repository root
- **THEN** a `LICENCE` file exists containing the MIT licence text

