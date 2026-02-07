## ADDED Requirements

### Requirement: PR title lint workflow exists

A GitHub Actions workflow at `.github/workflows/commit-lint.yml` SHALL run on pull request events and validate the PR title against the conventional commits specification.

#### Scenario: Valid conventional commit title passes

- **WHEN** a pull request is opened with the title `feat: add widget rotation`
- **THEN** the commit-lint check passes

#### Scenario: Valid breaking change title passes

- **WHEN** a pull request is opened with the title `feat!: redesign event system`
- **THEN** the commit-lint check passes

#### Scenario: Invalid title fails the check

- **WHEN** a pull request is opened with the title `Added some stuff`
- **THEN** the commit-lint check fails
- **AND** the failure message indicates the expected conventional commit format

#### Scenario: Title with scope passes

- **WHEN** a pull request is opened with the title `fix(auth): handle token expiry`
- **THEN** the commit-lint check passes

### Requirement: Lint check uses amannn/action-semantic-pull-request

The workflow SHALL use `amannn/action-semantic-pull-request` to validate PR titles.

#### Scenario: Allowed commit types

- **WHEN** the action validates a PR title
- **THEN** it accepts the types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

### Requirement: Lint check runs on PR lifecycle events

The workflow SHALL trigger on `pull_request_target` events for `opened`, `edited`, and `synchronize` actions.

#### Scenario: Title edited after opening

- **WHEN** a PR title is edited from an invalid to a valid conventional commit format
- **THEN** the commit-lint check re-runs and passes
