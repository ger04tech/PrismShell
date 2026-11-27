//! Thin Rust layer: read/write text (with backup), list paths, run a closed set of tools.
//! All "what to change" logic lives in TypeScript (`src/core`).

pub mod files;
pub mod fonts;
pub mod paths;
pub mod tools;

/// Errors are sent to the UI as plain strings.
pub type CmdResult<T> = Result<T, String>;

pub(crate) fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}
