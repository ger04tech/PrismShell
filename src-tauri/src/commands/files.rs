use std::fs;
use std::path::{Path, PathBuf};

use super::paths::{app_dir, ensure_deletable, ensure_writable};
use super::{err, CmdResult};

/// Returns the file as UTF-8 text, or `None` if it does not exist.
#[tauri::command]
pub fn read_text(path: String) -> CmdResult<Option<String>> {
    let p = Path::new(&path);
    if !p.exists() {
        return Ok(None);
    }
    let bytes = fs::read(p).map_err(err)?;
    let text = String::from_utf8_lossy(&bytes);
    // Strip a UTF-8 BOM if present.
    Ok(Some(text.trim_start_matches('\u{feff}').to_string()))
}

#[tauri::command]
pub fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

/// Copies `path` into `%APPDATA%\PrismShell\backups\<stem>-<timestamp>.<ext>` and returns the new path.
pub fn backup(path: &Path) -> CmdResult<PathBuf> {
    let dir = app_dir()?.join("backups");
    fs::create_dir_all(&dir).map_err(err)?;
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "file".into());
    let ext = path
        .extension()
        .map(|s| format!(".{}", s.to_string_lossy()))
        .unwrap_or_default();
    let stamp = chrono::Local::now().format("%Y%m%d-%H%M%S");
    let mut dest = dir.join(format!("{stem}-{stamp}{ext}"));
    let mut n = 1;
    while dest.exists() {
        dest = dir.join(format!("{stem}-{stamp}-{n}{ext}"));
        n += 1;
    }
    fs::copy(path, &dest).map_err(err)?;
    Ok(dest)
}

/// Writes UTF-8 text atomically (temp file + rename). If `backup_first` is true and the file
/// exists, a copy is saved first and its path is returned.
#[tauri::command]
pub fn write_text_with_backup(
    path: String,
    contents: String,
    backup_first: bool,
) -> CmdResult<Option<String>> {
    let p = PathBuf::from(&path);
    ensure_writable(&p)?;

    let backup_path = if backup_first && p.is_file() {
        Some(backup(&p)?)
    } else {
        None
    };

    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(err)?;
    }
    let tmp = p.with_extension("prismshell-tmp");
    fs::write(&tmp, contents.as_bytes()).map_err(err)?;
    fs::rename(&tmp, &p).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        err(e)
    })?;

    Ok(backup_path.map(|b| b.to_string_lossy().into_owned()))
}

/// Makes a backup copy without writing anything.
#[tauri::command]
pub fn backup_file(path: String) -> CmdResult<Option<String>> {
    let p = PathBuf::from(&path);
    if !p.is_file() {
        return Ok(None);
    }
    Ok(Some(backup(&p)?.to_string_lossy().into_owned()))
}

/// Copies any readable file (e.g. a background image) into a writable location.
#[tauri::command]
pub fn copy_file(from: String, to: String) -> CmdResult<()> {
    let dest = PathBuf::from(&to);
    ensure_writable(&dest)?;
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(err)?;
    }
    fs::copy(&from, &dest).map_err(err)?;
    Ok(())
}

const MAX_IMAGE_BYTES: u64 = 25 * 1024 * 1024;

/// Reads an image chosen by the user and returns it as a `data:` URL for the preview.
/// Only common image types, up to 25 MB.
#[tauri::command]
pub fn read_image_data_url(path: String) -> CmdResult<String> {
    use base64::Engine;

    let p = Path::new(&path);
    let ext = p
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "webp" => "image/webp",
        _ => return Err(format!("Formato de imagen no soportado: .{ext}")),
    };
    let size = fs::metadata(p).map_err(err)?.len();
    if size > MAX_IMAGE_BYTES {
        return Err("La imagen pesa más de 25 MB.".into());
    }
    let bytes = fs::read(p).map_err(err)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{mime};base64,{b64}"))
}

/// Deletes a file or folder inside our fragment/app folders only.
#[tauri::command]
pub fn remove_path(path: String) -> CmdResult<()> {
    let p = PathBuf::from(&path);
    ensure_deletable(&p)?;
    if p.is_dir() {
        fs::remove_dir_all(&p).map_err(err)?;
    } else if p.is_file() {
        fs::remove_file(&p).map_err(err)?;
    }
    Ok(())
}
