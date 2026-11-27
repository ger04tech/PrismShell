/**
 * Curated color schemes from mbadolato/iTerm2-Color-Schemes (windowsterminal/), MIT License.
 * See LICENSE-iTerm2-Color-Schemes.txt in this folder.
 */
import { ColorSchemeSchema, type ColorScheme } from "@/core/setup";

const modules = import.meta.glob<{ default: unknown }>("./*.json", { eager: true });

export const SCHEMES: ColorScheme[] = Object.values(modules)
  .map((m) => ColorSchemeSchema.parse(m.default))
  .sort((a, b) => a.name.localeCompare(b.name));

export const SCHEME_SOURCE = {
  name: "iTerm2-Color-Schemes",
  author: "Mark Badolato y colaboradores",
  url: "https://github.com/mbadolato/iTerm2-Color-Schemes",
  license: "MIT",
};

export function findScheme(name: string): ColorScheme | undefined {
  return SCHEMES.find((s) => s.name === name);
}

/** Rough luminance check, used to tag light/dark themes in the gallery. */
export function isLightScheme(scheme: ColorScheme): boolean {
  const n = parseInt(scheme.background.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
}
