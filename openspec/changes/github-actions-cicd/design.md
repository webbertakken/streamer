## Context

The streamer app is a Tauri v2 desktop overlay (React + Rust). Version `0.1.0` is tracked in three files: `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`. There is no CI/CD — builds and releases are entirely manual. The repository uses Yarn 4 with Volta pinning and is hosted on GitHub.

## Goals / Non-goals

**Goals:**
- Fully automatic versioning driven by conventional commit messages — no manual steps
- Cross-platform builds for Windows x64, Linux x64, Linux arm64, macOS x64, macOS arm64
- Artefacts published to GitHub Releases with `latest.json` for the Tauri updater
- Changelog generated automatically from commit history
- All three version files kept in sync

**Non-goals:**
- Code signing (Windows/macOS) — will be a separate change when certificates are available
- Auto-update integration in the app (updater plugin) — separate concern
- Publishing to app stores (Microsoft Store, Mac App Store)
- Linux arm7 / Windows arm64 builds

## Decisions

### Release Please over semantic-release

**Choice**: Google's Release Please.
**Why**: It creates a human-reviewable "Release PR" before tagging, giving a review gate. semantic-release publishes immediately on push with no approval step. Release Please also natively supports bumping multiple files (`extra-files`) including JSON and TOML, which is needed for our three version files.
**Alternative rejected**: semantic-release — no review gate, less ergonomic multi-file version bumping.

### Squash-merge with PR title as commit message

**Choice**: Enforce squash-merge so the PR title becomes the conventional commit on `main`.
**Why**: Developers don't need to write conventional commits on every individual commit — only the PR title matters. This is simpler to enforce (one title vs many commits) and works naturally with the commit-lint check on PR titles.
**Trade-off**: Individual commits within a PR are lost in `main` history. Acceptable for this project size.

### commitlint via GitHub Action (not a pre-commit hook)

**Choice**: Validate conventional commit format on PR titles using a lightweight GitHub Action (`amannn/action-semantic-pull-request`).
**Why**: No local tooling required. Runs as a required status check. Validates the PR title specifically (which becomes the squash-merge commit message).
**Alternative rejected**: Husky/commitlint locally — adds dev dependency overhead, doesn't cover the PR title directly, can be bypassed with `--no-verify`.

### tauri-action for builds

**Choice**: `tauri-apps/tauri-action@v0` with matrix strategy.
**Why**: Official Tauri action. Handles Rust caching, native dependency installation, artifact naming, release asset uploading, and `latest.json` generation out of the box. No need to reinvent the build pipeline.

### Separate workflows (not one monolith)

**Choice**: Three workflow files — `release-please.yml`, `build.yml`, `commit-lint.yml`.
**Why**: Each has a different trigger (`push` to `main`, tag push, `pull_request`) and a distinct responsibility. Keeps files small and debuggable.

### Draft releases

**Choice**: `tauri-action` creates a draft release; Release Please publishes it.
**Why**: Actually, Release Please creates the release and tag in one step. `tauri-action` then attaches build artefacts to the existing release. The release is published by Release Please and the build workflow adds assets afterwards. The `releaseId` output from Release Please is not needed — `tauri-action` finds the release by tag name.

**Flow**:
1. Conventional commits land on `main` via squash-merge
2. Release Please opens/updates a Release PR with changelog + version bumps
3. Merging the Release PR: Release Please creates a git tag (`v0.2.0`) and a GitHub Release
4. The `v*` tag triggers the build workflow
5. `tauri-action` builds all 5 platform/arch targets and uploads artefacts to the release

## Risks / Trade-offs

- **Risk**: Release Please doesn't support Cargo.toml natively as a release type → **Mitigation**: Use `extra-files` with `x-]tauri-version` regex replacer to match `version = "x.y.z"` in Cargo.toml and `"version": "x.y.z"` in tauri.conf.json. package.json is handled natively by the `node` release type.
- **Risk**: Build matrix takes time (~15-20 min for 5 targets) → **Mitigation**: `fail-fast: false` so one failure doesn't cancel others. Rust caching via `swatinem/rust-cache` reduces subsequent build times.
- **Risk**: macOS arm64 and x64 builds both run on `macos-latest` (arm64 runner) with cross-compilation for x64 → **Mitigation**: Tauri supports cross-compilation via `--target` flag. This is the officially documented approach.
- **Risk**: Linux arm64 runner (`ubuntu-22.04-arm`) may have longer queue times → **Mitigation**: Acceptable for release builds. Not on the critical path for development.
- **Risk**: Developers write non-conventional PR titles → **Mitigation**: `amannn/action-semantic-pull-request` runs as a required check, blocking merge until the title is valid.
