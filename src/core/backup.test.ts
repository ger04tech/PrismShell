import { parse } from "jsonc-parser";
import { describe, expect, it } from "vitest";
import { memoryFs, SAMPLE_SETTINGS, SAMPLE_SETUP } from "./__fixtures__/fixtures";
import { buildPromptBody } from "./apply/prompt";
import { applyPrompt, applySetup, fragmentFilePath, hasAppliedChanges, newSession, restoreAll, undoChanges } from "./backup";
import { fragmentSchemeName } from "./apply/fragment";

const SETTINGS = "C:\\Users\\test\\AppData\\Local\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json";
const PROFILE = "C:\\Users\\test\\Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1";
const loc = {
  settingsPath: SETTINGS,
  fragmentDir: "C:\\Users\\test\\AppData\\Local\\Microsoft\\Windows Terminal\\Fragments\\PrismShell",
  appDir: "C:\\Users\\test\\AppData\\Roaming\\PrismShell",
};

describe("applySetup", () => {
  it("writes the fragment, edits settings and backs up once per session", async () => {
    const { fs, files, backups } = memoryFs({ [SETTINGS]: SAMPLE_SETTINGS });
    const session = newSession();

    const first = await applySetup(fs, session, loc, SAMPLE_SETUP);
    expect(first.changed).toBe(true);
    expect(backups).toHaveLength(1);
    expect(files.get(backups[0])).toBe(SAMPLE_SETTINGS);

    const fragment = JSON.parse(files.get(fragmentFilePath(loc.fragmentDir))!);
    expect(fragment.schemes[0].name).toBe(fragmentSchemeName("TokyoNight Night"));

    await applySetup(fs, session, loc, { ...SAMPLE_SETUP, cursorShape: "underscore" });
    expect(backups).toHaveLength(1);
    expect(parse(files.get(SETTINGS)!).profiles.defaults.cursorShape).toBe("underscore");
  });

  it("fails clearly when settings.json is missing", async () => {
    const { fs } = memoryFs();
    await expect(applySetup(fs, newSession(), loc, SAMPLE_SETUP)).rejects.toThrow(/No se encontró/);
  });
});

describe("undo and restore", () => {
  async function appliedEverything() {
    const original = "Set-Alias ll Get-ChildItem\r\n";
    const mem = memoryFs({ [SETTINGS]: SAMPLE_SETTINGS, [PROFILE]: original });
    const session = newSession();
    await applySetup(mem.fs, session, loc, SAMPLE_SETUP);
    await applyPrompt(mem.fs, loc.appDir, [PROFILE], buildPromptBody("C:\\themes\\atomic.omp.json"));
    return { ...mem, session, original };
  }

  it("undo puts back exactly the original files", async () => {
    const { fs, files, session, original } = await appliedEverything();
    expect(await hasAppliedChanges(fs, loc.appDir)).toBe(true);

    await undoChanges(fs, session, loc);
    expect(files.get(SETTINGS)).toBe(SAMPLE_SETTINGS);
    expect(files.get(PROFILE)).toBe(original);
    expect(files.has(fragmentFilePath(loc.fragmentDir))).toBe(false);
    expect(await hasAppliedChanges(fs, loc.appDir)).toBe(false);
  });

  it("undo keeps edits the user made after applying", async () => {
    const { fs, files, session } = await appliedEverything();
    files.set(SETTINGS, files.get(SETTINGS)!.replace('"copyOnSelect": false', '"copyOnSelect": true'));
    await undoChanges(fs, session, loc);
    expect(parse(files.get(SETTINGS)!).copyOnSelect).toBe(true);
    expect(parse(files.get(SETTINGS)!).profiles.defaults).toEqual({ padding: "4" });
  });

  it("restore all puts back the original backup, even over later edits", async () => {
    const { fs, files, original } = await appliedEverything();
    files.set(SETTINGS, files.get(SETTINGS)!.replace('"copyOnSelect": false', '"copyOnSelect": true'));
    await restoreAll(fs, newSession(), loc);
    expect(files.get(SETTINGS)).toBe(SAMPLE_SETTINGS);
    expect(files.get(PROFILE)).toBe(original);
    expect(files.has(fragmentFilePath(loc.fragmentDir))).toBe(false);
  });
});
