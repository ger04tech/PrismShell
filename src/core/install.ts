/** Installs Oh My Posh and Nerd Fonts through the closed list of Rust tool actions. */
import type { NerdFont } from "@/data/fonts";
import { listInstalledFonts, runTool, type ToolAction, type ToolOutput } from "@/lib/tauri";

export class InstallError extends Error {
  constructor(
    message: string,
    readonly output?: ToolOutput,
  ) {
    super(message);
  }
}

/** Last non-empty lines of a tool's output, for error messages. */
function tail(out: ToolOutput, lines = 4): string {
  const text = [out.stderr, out.stdout].filter(Boolean).join("\n");
  return text.split(/\r?\n/).filter((l) => l.trim()).slice(-lines).join("\n");
}

async function run(action: ToolAction, failMessage: string): Promise<ToolOutput> {
  const out = await runTool(action);
  if (!out.started) throw new InstallError(`${failMessage} (${out.stderr})`, out);
  if (out.code !== 0) throw new InstallError(`${failMessage}\n${tail(out)}`, out);
  return out;
}

export async function ohMyPoshVersion(): Promise<string | null> {
  const out = await runTool({ kind: "ohMyPoshVersion" });
  return out.started && out.code === 0 ? out.stdout.split(/\r?\n/)[0]?.trim() || null : null;
}

/** winget install (user scope, no admin). */
export async function installOhMyPosh(): Promise<string> {
  await run({ kind: "installOhMyPosh" }, "No se pudo instalar Oh My Posh con winget.");
  const version = await ohMyPoshVersion();
  if (!version) throw new InstallError("Oh My Posh se instaló, pero no se pudo ejecutar todavía.");
  return version;
}

export type InstallStep = "oh-my-posh" | "font";

/**
 * Installs a Nerd Font for the current user via `oh-my-posh font install <id> --plain`,
 * installing Oh My Posh first if needed. Returns the refreshed font list and OMP version.
 */
export async function installNerdFont(
  font: NerdFont,
  ohMyPosh: string | null,
  onStep: (step: InstallStep) => void,
): Promise<{ installedFonts: string[]; ohMyPosh: string }> {
  let version = ohMyPosh;
  if (!version) {
    onStep("oh-my-posh");
    version = await installOhMyPosh();
  }
  onStep("font");
  await run({ kind: "installFont", id: font.id }, `No se pudo instalar ${font.label}.`);
  return { installedFonts: await listInstalledFonts(), ohMyPosh: version };
}
