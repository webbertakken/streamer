## Why

Streamer has no codebase yet — we need a project scaffold that sets up the Tauri v2 + React + TypeScript foundation so that all future work has a solid base to build on.

## What Changes

- Initialise a Tauri v2 project with React + TypeScript frontend
- Add Tailwind CSS and Zustand
- Set up the basic transparent overlay window configuration
- Create an empty widget registry structure
- Add MIT licence

## Capabilities

### New Capabilities
- `project-scaffold`: Base Tauri v2 application with React frontend, ready for widget development

### Modified Capabilities
<!-- None — this is a greenfield project -->

## Impact

- `src-tauri/` — Rust backend with Tauri config for transparent overlay window
- `src/` — React + TypeScript frontend with Tailwind and Zustand
- `package.json`, `Cargo.toml`, `tsconfig.json`, `tailwind.config.*` — project config files
- `LICENCE` — MIT licence file
