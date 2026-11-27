use super::CmdResult;

/// Lists installed font names from the registry (machine + current user),
/// e.g. "CaskaydiaCove Nerd Font Mono Regular". The " (TrueType)" suffix is removed.
#[tauri::command]
pub fn list_installed_fonts() -> CmdResult<Vec<String>> {
    #[cfg(windows)]
    {
        use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
        use winreg::RegKey;
        const KEY: &str = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts";

        let mut names = Vec::new();
        for hive in [HKEY_LOCAL_MACHINE, HKEY_CURRENT_USER] {
            if let Ok(key) = RegKey::predef(hive).open_subkey(KEY) {
                for (name, _) in key.enum_values().flatten() {
                    let clean = name
                        .trim_end_matches(" (TrueType)")
                        .trim_end_matches(" (OpenType)")
                        .trim()
                        .to_string();
                    names.push(clean);
                }
            }
        }
        names.sort();
        names.dedup();
        Ok(names)
    }
    #[cfg(not(windows))]
    {
        Ok(Vec::new())
    }
}
