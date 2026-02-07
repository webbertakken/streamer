## ADDED Requirements

### Requirement: Release Please workflow exists

A GitHub Actions workflow at `.github/workflows/release-please.yml` SHALL run on every push to `main` and use `googleapis/release-please-action` to manage versioning.

#### Scenario: Conventional feat commit triggers a minor release PR

- **WHEN** a commit with prefix `feat:` is pushed to `main`
- **THEN** Release Please opens (or updates) a pull request titled "chore(main): release x.y.z"
- **AND** the PR body contains a generated changelog grouped by commit type

#### Scenario: Conventional fix commit triggers a patch release PR

- **WHEN** a commit with prefix `fix:` is pushed to `main`
- **THEN** Release Please opens (or updates) a pull request with a patch version bump

#### Scenario: Breaking change triggers a major release PR

- **WHEN** a commit with prefix `feat!:` or a `BREAKING CHANGE:` footer is pushed to `main`
- **THEN** Release Please opens (or updates) a pull request with a major version bump

### Requirement: Merging the release PR creates a tag and GitHub Release

When the Release Please PR is merged, the action SHALL create a git tag and a GitHub Release with the changelog as the release body.

#### Scenario: Release PR merged

- **WHEN** the Release Please PR is merged to `main`
- **THEN** a git tag `v<version>` is created on the merge commit
- **AND** a GitHub Release is created with the tag and changelog body

### Requirement: All three version files are bumped in sync

Release Please SHALL update the version in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` within the release PR.

#### Scenario: Version files updated

- **WHEN** Release Please creates or updates the release PR
- **THEN** `package.json` contains the new version in the `"version"` field
- **AND** `src-tauri/tauri.conf.json` contains the new version in the `"version"` field
- **AND** `src-tauri/Cargo.toml` contains the new version in the `version` field under `[package]`
- **AND** all three files have the same version string

### Requirement: Release Please configuration files exist

The repository SHALL contain `release-please-config.json` and `.release-please-manifest.json` at the root.

#### Scenario: Configuration is valid

- **WHEN** Release Please runs
- **THEN** it reads `release-please-config.json` for release type, extra files, and changelog sections
- **AND** it reads `.release-please-manifest.json` for the current version
