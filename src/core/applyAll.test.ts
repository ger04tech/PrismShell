import { parse } from "jsonc-parser";
import { describe, expect, it } from "vitest";
import { memoryFs, SAMPLE_SETTINGS, SAMPLE_SETUP } from "./__fixtures__/fixtures";
import { BLOCK_START } from "./apply/prompt";
import { applyEverything, type ApplyDeps, type Shell } from "./applyAll";
import { newSession, undoChanges } from "./backup";

const SETTINGS = "C:\\Users\\test\\AppData\\Local\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json";
const PROFILE_7 = "C:\\Users\\test\\Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1";
const PROFILE_5 = "C:\\Users\\test\\Documents\\WindowsPowerShell\\Microsoft.PowerShell_profile.ps1";
const IMAGE = "D:\\fotos\\fondo.JPG";
const loc = {
  settingsPath: SETTINGS,
  fragmentDir: "C:\\Users\\test\\AppData\\Local\\Microsoft\\Windows Terminal\\Fragments\\PrismShell",
  appDir: "C:\\Users\\test\\AppData\\Roaming\\PrismShell",
};
const THEME = '{ "version": 3, "blocks": [] }';

function setupDeps(policy: Record<Shell, string> = { pwsh: "RemoteSigned", powershell: "RemoteSigned" }) {
  const mem = memoryFs({ [SETTINGS]: SAMPLE_SETTINGS, [IMAGE]: "<jpg bytes>" });
  const fetched: string[] = [];
  const deps: ApplyDeps = {
    fs: mem.fs,
    session: newSession(),
    profilePath: async (shell) => (shell === "pwsh" ? PROFILE_7 : PROFILE_5),
    executionPolicy: async (shell) => policy[shell],
    fetchText: async (url) => {
      fetched.push(url);
      return THEME;
    },
  };
  return { ...mem, deps, fetched };
}

const request = (setup = SAMPLE_SETUP, shells: Shell[] = ["pwsh", "powershell"]) => ({
  ...loc,
  setup,
  shells,
  ohMyPosh: true,
  themeUrl: (id: string) => `https://example.test/themes/${id}.omp.json`,
});

describe("applyEverything", () => {
  it("copies the image, edits settings, downloads the theme and writes both profiles", async () => {
    const { deps, files, fetched, backups } = setupDeps();
    const setup = { ...SAMPLE_SETUP, background: { ...SAMPLE_SETUP.background, image: IMAGE, imageOpacity: 0.3 } };
    const steps: string[] = [];

    const report = await applyEverything(deps, request(setup), (s) => steps.push(s));

    expect(steps).toEqual(["image", "settings", "prompt"]);
    const imageCopy = `${loc.fragmentDir}\\background.jpg`;
    expect(files.get(imageCopy)).toBe("<jpg bytes>");
    expect(parse(files.get(SETTINGS)!).profiles.defaults.backgroundImage).toBe(imageCopy);
    expect(report.backup).toBe(backups[0]);
    expect(fetched).toEqual(["https://example.test/themes/atomic.omp.json"]);
    const themePath = `${loc.appDir}\\themes\\atomic.omp.json`;
    expect(files.get(themePath)).toBe(THEME);
    for (const p of [PROFILE_7, PROFILE_5]) {
      expect(files.get(p)).toContain(BLOCK_START);
      expect(files.get(p)).toContain(themePath);
    }
    expect(report.blockedShells).toEqual([]);
  });

  it("reports shells whose execution policy blocks the profile", async () => {
    const { deps } = setupDeps({ pwsh: "RemoteSigned", powershell: "Restricted" });
    const report = await applyEverything(deps, request());
    expect(report.blockedShells).toEqual(["powershell"]);
  });

  it("refuses to write a theme that is not JSON", async () => {
    const { deps, files } = setupDeps();
    deps.fetchText = async () => "<html>404</html>";
    await expect(applyEverything(deps, request())).rejects.toThrow();
    expect(files.has(PROFILE_7)).toBe(false);
  });

  it("removes the prompt block when the prompt is turned off", async () => {
    const { deps, files } = setupDeps();
    await applyEverything(deps, request());
    expect(files.get(PROFILE_7)).toContain(BLOCK_START);

    await applyEverything(deps, request({ ...SAMPLE_SETUP, prompt: undefined }));
    expect(files.get(PROFILE_7)).not.toContain(BLOCK_START);
  });

  it("writes only the welcome banner when Oh My Posh is missing", async () => {
    const { deps, files, fetched } = setupDeps();
    await applyEverything(deps, { ...request({ ...SAMPLE_SETUP, welcome: true }), ohMyPosh: false });
    expect(fetched).toEqual([]);
    expect(files.get(PROFILE_7)).toContain("Bienvenida de PrismShell");
    expect(files.get(PROFILE_7)).not.toContain("oh-my-posh init");
  });

  it("keeps the block when only the welcome banner remains, and removes it when both are off", async () => {
    const { deps, files } = setupDeps();
    await applyEverything(deps, request({ ...SAMPLE_SETUP, welcome: true }));
    expect(files.get(PROFILE_7)).toContain("oh-my-posh init");

    await applyEverything(deps, request({ ...SAMPLE_SETUP, welcome: true, prompt: undefined }));
    expect(files.get(PROFILE_7)).toContain("Bienvenida de PrismShell");
    expect(files.get(PROFILE_7)).not.toContain("oh-my-posh init");

    await applyEverything(deps, request({ ...SAMPLE_SETUP, welcome: false, prompt: undefined }));
    expect(files.get(PROFILE_7)).not.toContain(BLOCK_START);
  });

  it("undo after a full apply puts settings.json back exactly", async () => {
    const { deps, files } = setupDeps();
    await applyEverything(deps, request());
    await undoChanges(deps.fs, deps.session, loc);
    expect(files.get(SETTINGS)).toBe(SAMPLE_SETTINGS);
    expect(files.get(PROFILE_7)).not.toContain(BLOCK_START);
  });
});
