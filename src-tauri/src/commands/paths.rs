use serde::Serialize;
use std::path::{Component, Path, PathBuf};

use super::CmdResult;

const APP_DIR: &str = "PrismShell";

fn env_dir(name: &str) -> CmdResult<PathBuf> {
    std::env::var_os(name)
        .map(PathBuf::from)
        .ok_or_else(|| format!("La variable de entorno {name} no existe"))
}

pub fn local_app_data() -> CmdResult<PathBuf> {
    env_dir("LOCALAPPDATA")
}

pub fn app_data() -> CmdResult<PathBuf> {
    env_dir("APPDATA")
}

/// `%APPDATA%\PrismShell`
pub fn app_dir() -> CmdResult<PathBuf> {
    Ok(app_data()?.join(APP_DIR))
}

/// `%LOCALAPPDATA%\Microsoft\Windows Terminal`
fn unpackaged_wt_dir() -> CmdResult<PathBuf> {
    Ok(local_app_data()?.join("Microsoft").join("Windows Terminal"))
}

/// `%LOCALAPPDATA%\Microsoft\Windows Terminal\Fragments\PrismShell`
pub fn fragment_dir() -> CmdResult<PathBuf> {
    Ok(unpackaged_wt_dir()?.join("Fragments").join(APP_DIR))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalCandidate {
    /// "stable" | "preview" | "canary" | "unpackaged"
    pub channel: &'static str,
    pub settings_path: String,
    pub exists: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPaths {
    pub local_app_data: String,
    pub app_data: String,
    pub app_dir: String,
    pub backup_dir: String,
    pub fragment_dir: String,
    pub terminals: Vec<TerminalCandidate>,
}

fn s(p: &Path) -> String {
    p.to_string_lossy().into_owned()
}

#[tauri::command]
pub fn get_paths() -> CmdResult<AppPaths> {
    let local = local_app_data()?;
    let packages = local.join("Packages");
    let packaged = [
        ("stable", "Microsoft.WindowsTerminal_8wekyb3d8bbwe"),
        ("preview", "Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe"),
        ("canary", "Microsoft.WindowsTerminalCanary_8wekyb3d8bbwe"),
    ];

    let mut terminals: Vec<TerminalCandidate> = packaged
        .iter()
        .map(|(channel, pkg)| {
            let p = packages.join(pkg).join("LocalState").join("settings.json");
            TerminalCandidate { channel, exists: p.is_file(), settings_path: s(&p) }
        })
        .collect();

    let unpackaged = unpackaged_wt_dir()?.join("settings.json");
    terminals.push(TerminalCandidate {
        channel: "unpackaged",
        exists: unpackaged.is_file(),
        settings_path: s(&unpackaged),
    });

    let app_dir = app_dir()?;
    Ok(AppPaths {
        local_app_data: s(&local),
        app_data: s(&app_data()?),
        backup_dir: s(&app_dir.join("backups")),
        app_dir: s(&app_dir),
        fragment_dir: s(&fragment_dir()?),
        terminals,
    })
}

fn lower(p: &Path) -> String {
    p.to_string_lossy().to_lowercase().replace('/', "\\")
}

fn is_lexically_clean(p: &Path) -> bool {
    p.is_absolute()
        && !p
            .components()
            .any(|c| matches!(c, Component::ParentDir | Component::CurDir))
}

fn under(p: &Path, root: &Path) -> bool {
    let root = lower(root);
    let root = root.trim_end_matches('\\');
    lower(p).starts_with(&format!("{root}\\"))
}

/// Writable locations: Windows Terminal folders, our own folder and PowerShell profile files.
pub fn ensure_writable(p: &Path) -> CmdResult<()> {
    if !is_lexically_clean(p) {
        return Err(format!("Ruta no permitida: {}", p.display()));
    }
    let packages = local_app_data()?.join("Packages");

    let in_packaged_wt = under(p, &packages)
        && p
            .strip_prefix(&packages)
            .ok()
            .and_then(|rest| rest.components().next())
            .map(|c| {
                c.as_os_str()
                    .to_string_lossy()
                    .to_lowercase()
                    .starts_with("microsoft.windowsterminal")
            })
            .unwrap_or(false);

    let is_ps_profile = {
        let name = p.file_name().map(|n| n.to_string_lossy().to_lowercase());
        let parent = p
            .parent()
            .and_then(|d| d.file_name())
            .map(|n| n.to_string_lossy().to_lowercase());
        matches!(name.as_deref(), Some(n) if n.ends_with("profile.ps1"))
            && matches!(parent.as_deref(), Some("powershell") | Some("windowspowershell"))
    };

    if in_packaged_wt || under(p, &unpackaged_wt_dir()?) || under(p, &app_dir()?) || is_ps_profile {
        Ok(())
    } else {
        Err(format!("Ruta no permitida: {}", p.display()))
    }
}

/// Deletable locations: only our fragment folder and our app folder.
pub fn ensure_deletable(p: &Path) -> CmdResult<()> {
    if !is_lexically_clean(p) {
        return Err(format!("Ruta no permitida: {}", p.display()));
    }
    let frag = fragment_dir()?;
    if lower(p) == lower(&frag) || under(p, &frag) || under(p, &app_dir()?) {
        Ok(())
    } else {
        Err(format!("No se puede borrar: {}", p.display()))
    }
}
