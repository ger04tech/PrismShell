/**
 * "Aplicar": runs every step that turns a Setup into real changes, in a safe order:
 * background image → colors + appearance (with backup) → Oh My Posh prompt.
 * All side effects go through injected dependencies, so tests never touch real files.
 */
import { buildPromptBody } from "./apply/prompt";
import { buildWelcomeBody } from "./apply/welcome";
import { applyPrompt, applySetup, removePrompt, type FileSystem, type Session } from "./backup";
import type { Setup } from "./setup";

export type Shell = "pwsh" | "powershell";

export interface ApplyDeps {
  fs: FileSystem;
  session: Session;
  /** `$PROFILE` path for a shell, or null if the shell is not available. */
  profilePath(shell: Shell): Promise<string | null>;
  /** Effective execution policy ("RemoteSigned", "Restricted"…), or null if unknown. */
  executionPolicy(shell: Shell): Promise<string | null>;
  /** Downloads a text file (the Oh My Posh theme). */
  fetchText(url: string): Promise<string>;
}

export interface ApplyRequest {
  setup: Setup;
  settingsPath: string;
  fragmentDir: string;
  appDir: string;
  shells: Shell[];
  /** False when Oh My Posh is not installed: its line would fail at every shell start. */
  ohMyPosh: boolean;
  themeUrl(id: string): string;
}

export type ApplyStep = "image" | "settings" | "prompt";

export interface ApplyReport {
  settingsChanged: boolean;
  /** Copy of settings.json made before the first change of this session, if any. */
  backup: string | null;
  imagePath?: string;
  profiles: { shell: Shell; path: string }[];
  /** Shells whose execution policy blocks the $PROFILE from running. */
  blockedShells: Shell[];
}

const join = (dir: string, name: string) => `${dir.replace(/[\\/]+$/, "")}\\${name}`;

/** Policies under which a local, unsigned $PROFILE does not run. */
const BLOCKING_POLICIES = new Set(["restricted", "allsigned", ""]);

export async function applyEverything(
  deps: ApplyDeps,
  req: ApplyRequest,
  onStep: (step: ApplyStep) => void = () => {},
): Promise<ApplyReport> {
  const { fs, session } = deps;
  const { setup } = req;

  // 1. Background image: copied next to our fragment so the original can move or be deleted.
  let imagePath: string | undefined;
  if (setup.background.image) {
    onStep("image");
    const ext = setup.background.image.split(".").pop()?.toLowerCase() ?? "png";
    imagePath = join(req.fragmentDir, `background.${ext}`);
    await fs.copyFile(setup.background.image, imagePath);
  }

  // 2. Colors (fragment) + appearance (profiles.defaults), with backup.
  onStep("settings");
  const { changed, backup } = await applySetup(
    fs,
    session,
    { settingsPath: req.settingsPath, fragmentDir: req.fragmentDir, appDir: req.appDir },
    setup,
    { backgroundImagePath: imagePath },
  );

  // 3. $PROFILE block: welcome banner and/or Oh My Posh prompt.
  const profiles: ApplyReport["profiles"] = [];
  const blockedShells: Shell[] = [];
  const usePrompt = Boolean(setup.prompt && req.ohMyPosh);
  if ((usePrompt || setup.welcome) && req.shells.length > 0) {
    onStep("prompt");
    const body: string[] = [];
    if (setup.welcome) body.push(buildWelcomeBody());
    if (setup.prompt && usePrompt) {
      const themeJson = await deps.fetchText(req.themeUrl(setup.prompt.theme));
      JSON.parse(themeJson); // refuse to write anything that is not a valid theme file
      const themePath = join(join(req.appDir, "themes"), `${setup.prompt.theme}.omp.json`);
      await fs.writeText(themePath, themeJson, false);
      body.push(buildPromptBody(themePath));
    }

    for (const shell of req.shells) {
      const path = await deps.profilePath(shell);
      if (!path) continue;
      profiles.push({ shell, path });
      const policy = (await deps.executionPolicy(shell))?.trim().toLowerCase();
      if (policy !== undefined && BLOCKING_POLICIES.has(policy)) blockedShells.push(shell);
    }
    await applyPrompt(fs, req.appDir, profiles.map((p) => p.path), body.join("\n"));
  } else if (!usePrompt && !setup.welcome) {
    // Nothing left for the profile: take our block back out of any profile we wrote before.
    await removePrompt(fs, req.appDir);
  }

  return { settingsChanged: changed, backup, imagePath, profiles, blockedShells };
}
