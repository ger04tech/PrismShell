/** What is installed on this PC: Windows Terminal, PowerShell, Oh My Posh, winget, fonts. */
import { findProfileOverrides, type ProfileOverride } from "./apply/terminal";
import { hasAppliedChanges } from "./backup";
import {
  getPaths,
  listInstalledFonts,
  readText,
  runTool,
  tauriFs,
  type AppPaths,
  type TerminalCandidate,
  type ToolAction,
} from "@/lib/tauri";

export interface Detection {
  paths: AppPaths;
  /** Only the settings.json files that exist. */
  terminals: TerminalCandidate[];
  pwsh: string | null;
  ohMyPosh: string | null;
  winget: string | null;
  installedFonts: string[];
  /** Per settings.json path: profiles that override our keys. */
  overrides: Record<string, ProfileOverride[]>;
  applied: boolean;
}

/** Runs a tool and returns its first output line, or null if it is missing or failed. */
async function versionOf(action: ToolAction): Promise<string | null> {
  try {
    const out = await runTool(action);
    if (!out.started || out.code !== 0) return null;
    return out.stdout.split(/\r?\n/)[0]?.trim() || null;
  } catch {
    return null;
  }
}

async function overridesFor(path: string): Promise<ProfileOverride[]> {
  try {
    const text = await readText(path);
    return text ? findProfileOverrides(text) : [];
  } catch {
    return [];
  }
}

export async function detect(): Promise<Detection> {
  const paths = await getPaths();
  const terminals = paths.terminals.filter((t) => t.exists);

  const [pwsh, ohMyPosh, winget, installedFonts, applied, overrideList] = await Promise.all([
    versionOf({ kind: "pwshVersion" }),
    versionOf({ kind: "ohMyPoshVersion" }),
    versionOf({ kind: "wingetVersion" }),
    listInstalledFonts().catch(() => [] as string[]),
    hasAppliedChanges(tauriFs, paths.appDir).catch(() => false),
    Promise.all(terminals.map((t) => overridesFor(t.settingsPath))),
  ]);

  const overrides = Object.fromEntries(terminals.map((t, i) => [t.settingsPath, overrideList[i]]));
  return { paths, terminals, pwsh, ohMyPosh, winget, installedFonts, overrides, applied };
}
