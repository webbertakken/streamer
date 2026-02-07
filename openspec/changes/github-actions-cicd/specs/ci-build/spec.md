## ADDED Requirements

### Requirement: Build workflow triggers on version tags

A GitHub Actions workflow at `.github/workflows/build.yml` SHALL trigger on tags matching `v*`.

#### Scenario: Tag push triggers build

- **WHEN** a tag matching `v*` is pushed to the repository
- **THEN** the build workflow starts
- **AND** it runs jobs for all five platform/architecture targets

### Requirement: Build matrix covers all target platforms

The build workflow SHALL use a matrix strategy to build for Windows x64, Linux x64, Linux arm64, macOS x64, and macOS arm64.

#### Scenario: Matrix includes all targets

- **WHEN** the build workflow runs
- **THEN** it starts a job on `windows-latest` with no extra args (Windows x64)
- **AND** it starts a job on `ubuntu-22.04` with no extra args (Linux x64)
- **AND** it starts a job on `ubuntu-22.04-arm` with no extra args (Linux arm64)
- **AND** it starts a job on `macos-latest` with args `--target aarch64-apple-darwin` (macOS arm64)
- **AND** it starts a job on `macos-latest` with args `--target x86_64-apple-darwin` (macOS x64)

#### Scenario: One platform failure does not cancel others

- **WHEN** a build job fails for one platform
- **THEN** the remaining platform jobs continue to completion (`fail-fast: false`)

### Requirement: Builds use tauri-action

Each matrix job SHALL use `tauri-apps/tauri-action@v0` to compile the Tauri application and upload artefacts.

#### Scenario: Artefacts uploaded to GitHub Release

- **WHEN** a matrix job completes successfully
- **THEN** the compiled binaries and installers are uploaded as assets to the GitHub Release matching the tag
- **AND** a `latest.json` file is generated and uploaded for the Tauri updater

### Requirement: Linux dependencies are installed

Linux build jobs SHALL install the required system packages before building.

#### Scenario: Ubuntu x64 dependencies

- **WHEN** the build job runs on `ubuntu-22.04`
- **THEN** `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, and `patchelf` are installed via apt

### Requirement: Rust toolchain and caching configured

Each build job SHALL install the stable Rust toolchain (with cross-compilation targets where needed) and use Rust build caching.

#### Scenario: macOS cross-compilation targets

- **WHEN** the build job runs on `macos-latest`
- **THEN** the Rust toolchain is installed with both `aarch64-apple-darwin` and `x86_64-apple-darwin` targets

#### Scenario: Rust cache reduces build times

- **WHEN** a build job runs after a previous successful build
- **THEN** `swatinem/rust-cache` restores cached compilation artefacts from the `src-tauri/target` directory

### Requirement: Frontend dependencies use yarn

Each build job SHALL install frontend dependencies using `yarn install --immutable`.

#### Scenario: Deterministic installs

- **WHEN** the build job installs frontend dependencies
- **THEN** it uses `yarn install --immutable` to ensure the lockfile is respected
- **AND** Node.js is set up with yarn caching enabled
