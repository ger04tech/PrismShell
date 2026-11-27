//! A closed list of external commands. The UI picks an action; it can never send free text.

use serde::{Deserialize, Serialize};
use std::process::Command;

use super::paths::local_app_data;
use super::CmdResult;

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ToolAction {
    OhMyPoshVersion,
    InstallOhMyPosh,
    InstallFont { id: String },
    PwshVersion,
    WingetVersion,
    ProfilePath { shell: Shell },
    /// Effective execution policy for the user, ignoring the Process scope.
    ExecutionPolicy { shell: Shell },
    /// Windows "Transparency effects" switch; when off, WT draws no acrylic or opacity.
    TransparencyEffects,
}

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum Shell {
    Pwsh,
    Powershell,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolOutput {
    /// `false` when the program could not be started (e.g. not installed).
    pub started: bool,
    pub code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

fn is_valid_font_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// oh-my-posh installed with `--scope user` lands here; our PATH may be stale right after install.
fn oh_my_posh_exe() -> String {
    if let Ok(local) = local_app_data() {
        let p = local
            .join("Programs")
            .join("oh-my-posh")
            .join("bin")
            .join("oh-my-posh.exe");
        if p.is_file() {
            return p.to_string_lossy().into_owned();
        }
    }
    "oh-my-posh".into()
}

fn shell_exe(shell: Shell) -> &'static str {
    match shell {
        Shell::Pwsh => "pwsh",
        Shell::Powershell => "powershell",
    }
}

fn to_vec(a: &[&str]) -> Vec<String> {
    a.iter().map(|s| s.to_string()).collect()
}

fn build(action: &ToolAction) -> CmdResult<(String, Vec<String>)> {
    Ok(match action {
        ToolAction::OhMyPoshVersion => (oh_my_posh_exe(), to_vec(&["version"])),
        ToolAction::InstallOhMyPosh => (
            "winget".into(),
            to_vec(&[
                "install",
                "JanDeDobbeleer.OhMyPosh",
                "--source",
                "winget",
                "--scope",
                "user",
                "--accept-package-agreements",
                "--accept-source-agreements",
                "--disable-interactivity",
            ]),
        ),
        ToolAction::InstallFont { id } => {
            if !is_valid_font_id(id) {
                return Err(format!("Id de fuente no válido: {id}"));
            }
            // Oh My Posh 33+ has no `--user` flag (passing it fails); without admin rights it
            // installs for the current user. `--plain` avoids the interactive/ANSI output.
            let mut args = to_vec(&["font", "install"]);
            args.push(id.clone());
            args.push("--plain".into());
            (oh_my_posh_exe(), args)
        }
        ToolAction::PwshVersion => (
            "pwsh".into(),
            to_vec(&["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"]),
        ),
        ToolAction::WingetVersion => ("winget".into(), to_vec(&["--version"])),
        ToolAction::ProfilePath { shell } => (
            shell_exe(*shell).into(),
            to_vec(&["-NoLogo", "-NoProfile", "-Command", "$PROFILE"]),
        ),
        // The first defined scope wins (MachinePolicy > UserPolicy > CurrentUser > LocalMachine).
        // Process is skipped: it only reflects whoever launched us. Empty output = Restricted.
        ToolAction::ExecutionPolicy { shell } => (
            shell_exe(*shell).into(),
            to_vec(&[
                "-NoLogo",
                "-NoProfile",
                "-Command",
                "(Get-ExecutionPolicy -List | Where-Object { $_.Scope -ne 'Process' -and $_.ExecutionPolicy -ne 'Undefined' } | Select-Object -First 1).ExecutionPolicy",
            ]),
        ),
        ToolAction::TransparencyEffects => (
            "reg".into(),
            to_vec(&[
                "query",
                r"HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
                "/v",
                "EnableTransparency",
            ]),
        ),
    })
}

#[tauri::command]
pub async fn run_tool(action: ToolAction) -> CmdResult<ToolOutput> {
    let (program, args) = build(&action)?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = Command::new(&program);
        cmd.args(&args);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }
        match cmd.output() {
            Ok(out) => ToolOutput {
                started: true,
                code: out.status.code(),
                stdout: String::from_utf8_lossy(&out.stdout).trim().to_string(),
                stderr: String::from_utf8_lossy(&out.stderr).trim().to_string(),
            },
            Err(e) => ToolOutput {
                started: false,
                code: None,
                stdout: String::new(),
                stderr: e.to_string(),
            },
        }
    })
    .await
    .map_err(|e| e.to_string())
}
