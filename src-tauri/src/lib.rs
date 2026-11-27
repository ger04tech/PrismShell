mod commands;

use commands::{files, fonts, paths, tools};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            paths::get_paths,
            files::read_text,
            files::path_exists,
            files::write_text_with_backup,
            files::backup_file,
            files::copy_file,
            files::read_image_data_url,
            files::remove_path,
            fonts::list_installed_fonts,
            tools::run_tool,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
