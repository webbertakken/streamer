## 1. Release Please configuration

- [x] 1.1 Create `release-please-config.json` at repo root with `release-type: node`, `packages: { ".": {} }`, `extra-files` entries for `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` using generic updater regex, and changelog sections config
- [x] 1.2 Create `.release-please-manifest.json` at repo root with `{ ".": "0.1.0" }` matching the current version

## 2. Release Please workflow

- [x] 2.1 Create `.github/workflows/release-please.yml` — triggers on push to `main`, uses `googleapis/release-please-action@v4` with `config-file` and `manifest-file` inputs, `contents: write` and `pull-requests: write` permissions

## 3. Build workflow

- [x] 3.1 Create `.github/workflows/build.yml` — triggers on tags matching `v*`, uses matrix strategy with five entries (windows-latest, ubuntu-22.04, ubuntu-22.04-arm, macos-latest × 2 targets), `fail-fast: false`
- [x] 3.2 Add Linux dependency installation step — conditional on `runner.os == 'Linux'`, installs `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`
- [x] 3.3 Add Node.js setup step with `actions/setup-node@v4`, node version `lts/*`, cache `yarn`
- [x] 3.4 Add Rust toolchain step with `dtolnay/rust-toolchain@stable`, conditional `targets` for macOS runners (`aarch64-apple-darwin,x86_64-apple-darwin`)
- [x] 3.5 Add `swatinem/rust-cache@v2` step with `workspaces: './src-tauri -> target'`
- [x] 3.6 Add `yarn install --immutable` step for frontend dependencies
- [x] 3.7 Add `tauri-apps/tauri-action@v0` step with `tagName: v__VERSION__`, `releaseName: 'v__VERSION__'`, `releaseBody` from changelog, `releaseDraft: false`, `prerelease: false`, matrix `args` passed through, `GITHUB_TOKEN` env var

## 4. Commit lint workflow

- [x] 4.1 Create `.github/workflows/commit-lint.yml` — triggers on `pull_request_target` (opened, edited, synchronize), uses `amannn/action-semantic-pull-request@v5` with `GITHUB_TOKEN`, allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

## 5. Workflow lint

- [x] 5.1 Create `.github/workflows/lint-workflows.yml` — triggers on `pull_request` with path filter `.github/workflows/**`, uses `rhysd/actionlint@v1` to validate workflow files

## 6. Verification

- [x] 6.1 Validate all workflow YAML files parse correctly (`actionlint` or manual review)
- [x] 6.2 Verify `release-please-config.json` extra-files regex matches version strings in `tauri.conf.json` and `Cargo.toml`
