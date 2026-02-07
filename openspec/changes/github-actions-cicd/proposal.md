## Why

There is no CI/CD pipeline — builds are manual and there's no automated versioning or release process. Setting up GitHub Actions now means every merge to `main` feeds into an automatic release flow, producing cross-platform binaries users can download directly from GitHub Releases.

## What changes

- Add a **Release Please** workflow that reads conventional commit messages on `main`, maintains a "Release PR" with changelog, and on merge creates a git tag + GitHub Release. Release Please bumps the version in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` simultaneously via its `extra-files` config.
- Add a **build workflow** triggered by `v*` tags that uses `tauri-apps/tauri-action@v0` with a matrix strategy to build for Windows x64, Linux x64, Linux arm64, macOS x64, and macOS arm64 — uploading all artifacts to the GitHub Release and generating `latest.json` for the Tauri updater.
- Add a **PR commit lint** check using `commitlint` (via a lightweight GitHub Action) to enforce the conventional commits format on PR titles (for squash-merge) so Release Please always gets clean input.
- Add a **workflow lint** check using `actionlint` that validates GitHub Actions workflow files on PRs that touch `.github/workflows/`.
- Version currently at `0.1.0` across all three manifest files stays in sync automatically.

## Capabilities

### New capabilities
- `ci-release`: Automated versioning, changelog generation, and GitHub Release creation via Release Please driven by conventional commits
- `ci-build`: Cross-platform Tauri builds (Windows x64, Linux x64, Linux arm64, macOS x64, macOS arm64) triggered by version tags, with artifacts on GitHub Releases
- `ci-commit-lint`: PR title validation enforcing conventional commit format for squash-merge workflows
- `ci-lint-workflows`: Validation of GitHub Actions workflow files using actionlint

### Modified capabilities
_None — no existing specs are affected._

## Impact

- **New files**: `.github/workflows/release-please.yml`, `.github/workflows/build.yml`, `.github/workflows/commit-lint.yml`, `.github/workflows/lint-workflows.yml`, `release-please-config.json`, `.release-please-manifest.json`
- **Dependencies**: No runtime dependencies added. CI-only tooling runs in GitHub Actions runners.
- **Repo settings**: Squash-merge should be the default merge strategy so PR titles (which follow conventional commits) become the commit message on `main`. Branch protection on `main` should require the commit-lint check to pass.
- **Secrets**: None required initially (no code signing). When code signing is added later, secrets for Apple/Windows certificates will be needed.
- **Version files**: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` — all bumped automatically by Release Please.
