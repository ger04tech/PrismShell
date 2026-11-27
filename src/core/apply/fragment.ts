/**
 * Setup → JSON fragment with our color scheme.
 * Lives in %LOCALAPPDATA%\Microsoft\Windows Terminal\Fragments\PrismShell\schemes.json,
 * so the user's settings.json stays clean and removing it = deleting the folder.
 */
import type { ColorScheme, Setup } from "../setup";

export const FRAGMENT_FILE = "schemes.json";

/**
 * Suffix avoids clashing with schemes Windows Terminal ships (e.g. "One Half Dark")
 * or that the user already has with the same name.
 */
export function fragmentSchemeName(name: string): string {
  return `${name} (PrismShell)`;
}

export function buildFragment(setup: Setup): string {
  const scheme: ColorScheme = { ...setup.scheme, name: fragmentSchemeName(setup.scheme.name) };
  return JSON.stringify({ schemes: [scheme] }, null, 4) + "\n";
}
