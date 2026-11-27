/** Typed wrappers around the Rust commands in src-tauri/src/commands. */
import { invoke } from "@tauri-apps/api/core";
import type { FileSystem } from "@/core/backup";

export type TerminalChannel = "stable" | "preview" | "canary" | "unpackaged";

export interface TerminalCandidate {
  channel: TerminalChannel;
  settingsPath: string;
  exists: boolean;
}

export interface AppPaths {
  localAppData: string;
  appData: string;
  appDir: string;
  backupDir: string;
  fragmentDir: string;
  terminals: TerminalCandidate[];
}

export type ToolAction =
  | { kind: "ohMyPoshVersion" }
  | { kind: "installOhMyPosh" }
  | { kind: "installFont"; id: string }
  | { kind: "pwshVersion" }
  | { kind: "wingetVersion" }
  | { kind: "profilePath"; shell: "pwsh" | "powershell" }
  | { kind: "executionPolicy"; shell: "pwsh" | "powershell" }
  | { kind: "transparencyEffects" };

export interface ToolOutput {
  started: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
}

export const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const getPaths = () => invoke<AppPaths>("get_paths");
export const readText = (path: string) => invoke<string | null>("read_text", { path });
export const pathExists = (path: string) => invoke<boolean>("path_exists", { path });
export const writeTextWithBackup = (path: string, contents: string, backupFirst: boolean) =>
  invoke<string | null>("write_text_with_backup", { path, contents, backupFirst });
export const backupFile = (path: string) => invoke<string | null>("backup_file", { path });
export const copyFile = (from: string, to: string) => invoke<void>("copy_file", { from, to });
export const removePath = (path: string) => invoke<void>("remove_path", { path });
export const readImageDataUrl = (path: string) => invoke<string>("read_image_data_url", { path });
export const listInstalledFonts = () => invoke<string[]>("list_installed_fonts");
export const runTool = (action: ToolAction) => invoke<ToolOutput>("run_tool", { action });

/** Windows "Transparency effects" switch. Null when unknown (value missing: Windows treats it as on). */
export async function transparencyEffectsOn(): Promise<boolean | null> {
  const out = await runTool({ kind: "transparencyEffects" });
  const m = /EnableTransparency\s+REG_DWORD\s+0x([0-9a-f]+)/i.exec(out.stdout);
  return m ? m[1] !== "0" : null;
}

/** The real file system, used by the app. Tests use an in-memory fake instead. */
export const tauriFs: FileSystem = {
  readText,
  writeText: writeTextWithBackup,
  removePath,
  copyFile,
};
