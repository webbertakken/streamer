# Agents

## Rust

- When writing `#[cfg]`-gated code, proactively add `#[allow(unused_variables)]` if parameters are only used in some platform branches
- Always run `yarn rust:clippy` (not just `cargo check`) as part of local verification
