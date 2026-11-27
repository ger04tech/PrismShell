/**
 * Applying, undoing and restoring. Everything goes through an injected FileSystem,
 * so tests run against an in-memory fake and never touch real user files.
 */
import { buildFragment, FRAGMENT_FILE } from "./apply/fragment";
import { removeBlock, upsertBlock } from "./apply/prompt";
import { applySetupToSettings, revertSettings, type ApplyOptions, type PreviousValues } from "./apply/terminal";
import type { Setup } from "./setup";

export interface FileSystem {
  /** `null` if the file does not exist. */
  readText(path: string): Promise<string | null>;
  /** Writes UTF-8. If `backupFirst`, copies the existing file to the backups folder; returns that copy's path. */
  writeText(path: string, contents: string, backupFirst: boolean): Promise<string | null>;
  removePath(path: string): Promise<void>;
  copyFile(from: string, to: string): Promise<void>;
}

export interface Locations {
  settingsPath: string;
  fragmentDir: string;
  appDir: string;
}

export interface TerminalState {
  /** Copy of settings.json taken before PrismShell's first write. */
  originalBackup?: string;
  previous: PreviousValues;
}

export interface AppliedState {
  version: 1;
  terminals: Record<string, TerminalState>;
  /** PowerShell profile files where we wrote our block. */
  profiles: string[];
}

/** Settings files already backed up during this run of the app. */
export interface Session {
  backedUp: Set<string>;
}

export const newSession = (): Session => ({ backedUp: new Set() });

const join = (dir: string, name: string) => `${dir.replace(/[\\/]+$/, "")}\\${name}`;
const statePath = (appDir: string) => join(appDir, "state.json");
export const fragmentFilePath = (fragmentDir: string) => join(fragmentDir, FRAGMENT_FILE);

const emptyState = (): AppliedState => ({ version: 1, terminals: {}, profiles: [] });

export async function loadState(fs: FileSystem, appDir: string): Promise<AppliedState> {
  const text = await fs.readText(statePath(appDir));
  if (!text) return emptyState();
  try {
    const parsed = JSON.parse(text) as AppliedState;
    return parsed.version === 1 ? { ...emptyState(), ...parsed } : emptyState();
  } catch {
    return emptyState();
  }
}

async function saveState(fs: FileSystem, appDir: string, state: AppliedState) {
  await fs.writeText(statePath(appDir), JSON.stringify(state, null, 2), false);
}

export class NoSettingsError extends Error {}

async function readSettings(fs: FileSystem, path: string): Promise<string> {
  const text = await fs.readText(path);
  if (text === null) throw new NoSettingsError(`No se encontró ${path}`);
  return text;
}

/** Writes settings.json, backing it up first the first time per session. */
async function writeSettings(fs: FileSystem, session: Session, path: string, text: string) {
  const backupFirst = !session.backedUp.has(path);
  const backup = await fs.writeText(path, text, backupFirst);
  session.backedUp.add(path);
  return backup;
}

/** Applies colors (fragment) + appearance (profiles.defaults). */
export async function applySetup(
  fs: FileSystem,
  session: Session,
  loc: Locations,
  setup: Setup,
  opts: ApplyOptions = {},
): Promise<{ changed: boolean; backup: string | null }> {
  const settings = await readSettings(fs, loc.settingsPath);
  const state = await loadState(fs, loc.appDir);
  const term = state.terminals[loc.settingsPath] ?? { previous: {} };

  const result = applySetupToSettings(settings, setup, term.previous, opts);

  // Scheme first, so the colorScheme name already exists when WT reloads settings.json.
  await fs.writeText(fragmentFilePath(loc.fragmentDir), buildFragment(setup), false);

  let backup: string | null = null;
  const changed = result.text !== settings;
  if (changed) {
    backup = await writeSettings(fs, session, loc.settingsPath, result.text);
  }

  state.terminals[loc.settingsPath] = {
    originalBackup: term.originalBackup ?? backup ?? undefined,
    previous: result.previous,
  };
  await saveState(fs, loc.appDir, state);
  return { changed, backup };
}

/** Adds/updates the Oh My Posh block in each given $PROFILE (creating the file if needed). */
/** Writes our $PROFILE block (welcome banner and/or Oh My Posh line, see applyAll) to each profile. */
export async function applyPrompt(fs: FileSystem, appDir: string, profilePaths: string[], body: string) {
  for (const p of profilePaths) {
    const current = (await fs.readText(p)) ?? "";
    const next = upsertBlock(current, body);
    if (next !== current) await fs.writeText(p, next, current.length > 0);
  }
  const state = await loadState(fs, appDir);
  state.profiles = [...new Set([...state.profiles, ...profilePaths])];
  await saveState(fs, appDir, state);
}

async function removePromptBlocks(fs: FileSystem, profiles: string[]) {
  for (const p of profiles) {
    const current = await fs.readText(p);
    if (current === null) continue;
    const next = removeBlock(current);
    if (next !== current) await fs.writeText(p, next, true);
  }
}

/** Removes our block from every $PROFILE we wrote to (e.g. the user turned the prompt off). */
export async function removePrompt(fs: FileSystem, appDir: string) {
  const state = await loadState(fs, appDir);
  if (state.profiles.length === 0) return;
  await removePromptBlocks(fs, state.profiles);
  state.profiles = [];
  await saveState(fs, appDir, state);
}

/** "Deshacer": puts back only the keys we changed, deletes our fragment and our $PROFILE block. */
export async function undoChanges(fs: FileSystem, session: Session, loc: Omit<Locations, "settingsPath">) {
  const state = await loadState(fs, loc.appDir);
  for (const [settingsPath, term] of Object.entries(state.terminals)) {
    const current = await fs.readText(settingsPath);
    if (current === null) continue;
    const next = revertSettings(current, term.previous);
    if (next !== current) await writeSettings(fs, session, settingsPath, next);
  }
  await removePromptBlocks(fs, state.profiles);
  await fs.removePath(loc.fragmentDir);
  await saveState(fs, loc.appDir, emptyState());
}

/** "Restaurar todo": puts back the original settings.json copy, deletes the fragment and our $PROFILE block. */
export async function restoreAll(fs: FileSystem, session: Session, loc: Omit<Locations, "settingsPath">) {
  const state = await loadState(fs, loc.appDir);
  for (const [settingsPath, term] of Object.entries(state.terminals)) {
    const original = term.originalBackup ? await fs.readText(term.originalBackup) : null;
    if (original !== null) {
      await writeSettings(fs, session, settingsPath, original);
    } else {
      // No copy (we never changed the file); fall back to key-by-key undo.
      const current = await fs.readText(settingsPath);
      if (current !== null) {
        const next = revertSettings(current, term.previous);
        if (next !== current) await writeSettings(fs, session, settingsPath, next);
      }
    }
  }
  await removePromptBlocks(fs, state.profiles);
  await fs.removePath(loc.fragmentDir);
  await saveState(fs, loc.appDir, emptyState());
}

export async function hasAppliedChanges(fs: FileSystem, appDir: string): Promise<boolean> {
  const s = await loadState(fs, appDir);
  return Object.keys(s.terminals).length > 0 || s.profiles.length > 0;
}
