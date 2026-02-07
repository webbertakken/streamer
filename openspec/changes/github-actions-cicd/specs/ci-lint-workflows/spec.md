## ADDED Requirements

### Requirement: Workflow lint check exists

A GitHub Actions workflow at `.github/workflows/lint-workflows.yml` SHALL run on pull requests that modify files under `.github/workflows/` and validate them using `actionlint`.

#### Scenario: Valid workflow files pass

- **WHEN** a pull request modifies a workflow file and all workflow files are valid
- **THEN** the lint-workflows check passes

#### Scenario: Invalid workflow file fails the check

- **WHEN** a pull request introduces a syntax error or invalid expression in a workflow file
- **THEN** the lint-workflows check fails
- **AND** the error details are shown in the check output

### Requirement: Lint only triggers on workflow changes

The workflow SHALL only run when files under `.github/workflows/` are changed, using a path filter.

#### Scenario: Unrelated PR does not trigger lint

- **WHEN** a pull request only modifies source code files outside `.github/workflows/`
- **THEN** the lint-workflows workflow does not run
