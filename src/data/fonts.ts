/**
 * Curated Nerd Fonts. `id` is what `oh-my-posh font install <id>` expects
 * (the Nerd Fonts release asset name, checked against v3.5.1).
 * `face` is the family name Windows Terminal needs in `font.face`.
 * `preview` is the font bundled in the app (src/assets/fonts/preview-fonts.css) so the
 * preview shows the real letters even when the font is not installed.
 */
export interface NerdFont {
  id: string;
  face: string;
  label: string;
  preview: string;
  recommended?: boolean;
}

export const NERD_FONTS: NerdFont[] = [
  { id: "Meslo", face: "MesloLGM Nerd Font", label: "Meslo", preview: "Preview Meslo", recommended: true },
  { id: "CascadiaCode", face: "CaskaydiaCove Nerd Font", label: "Cascadia Code (CaskaydiaCove)", preview: "Cascadia Code Variable" },
  { id: "JetBrainsMono", face: "JetBrainsMono Nerd Font", label: "JetBrains Mono", preview: "JetBrains Mono Variable" },
  { id: "FiraCode", face: "FiraCode Nerd Font", label: "Fira Code", preview: "Fira Code Variable" },
  { id: "Hack", face: "Hack Nerd Font", label: "Hack", preview: "Preview Hack" },
  { id: "Iosevka", face: "Iosevka Nerd Font", label: "Iosevka", preview: "Iosevka" },
  { id: "SourceCodePro", face: "SauceCodePro Nerd Font", label: "Source Code Pro (SauceCodePro)", preview: "Source Code Pro Variable" },
  { id: "UbuntuMono", face: "UbuntuMono Nerd Font", label: "Ubuntu Mono", preview: "Ubuntu Mono" },
  { id: "VictorMono", face: "VictorMono Nerd Font", label: "Victor Mono", preview: "Victor Mono Variable" },
  { id: "0xProto", face: "0xProto Nerd Font", label: "0xProto", preview: "Preview 0xProto" },
  { id: "GeistMono", face: "GeistMono Nerd Font", label: "Geist Mono", preview: "Geist Mono Variable" },
  { id: "CommitMono", face: "CommitMono Nerd Font", label: "Commit Mono", preview: "Commit Mono" },
  { id: "Mononoki", face: "Mononoki Nerd Font", label: "Mononoki", preview: "Mononoki" },
  { id: "IBMPlexMono", face: "BlexMono Nerd Font", label: "IBM Plex Mono (BlexMono)", preview: "IBM Plex Mono" },
  { id: "RobotoMono", face: "RobotoMono Nerd Font", label: "Roboto Mono", preview: "Roboto Mono Variable" },
  { id: "Hasklig", face: "Hasklug Nerd Font", label: "Hasklig (Hasklug)", preview: "Preview Hasklug" },
];

/** Fonts that ship with Windows / Windows Terminal; fine for colors, but no prompt icons. */
export const BUILTIN_FONTS = ["Cascadia Mono", "Cascadia Code", "Consolas"];

const BUILTIN_PREVIEW: Record<string, string> = {
  "Cascadia Mono": "Cascadia Mono Variable",
  "Cascadia Code": "Cascadia Code Variable",
};

export const DEFAULT_FONT = NERD_FONTS[0];

/**
 * Registry names are the font's full name, e.g. "JetBrainsMono Nerd Font Regular". Some Nerd Fonts
 * (v3, e.g. Cascadia) shorten it to "CaskaydiaCove NF Regular" / "NFM" / "NFP", while their
 * typographic family (what we store and what Windows Terminal resolves) stays "… Nerd Font".
 * So "Nerd Font" also matches "NF".
 */
export function isFontInstalled(face: string, installed: string[]): boolean {
  const f = face.toLowerCase();
  const prefixes = f.endsWith(" nerd font") ? [f, f.replace(/ nerd font$/, " nf")] : [f];
  return installed.some((n) => {
    const name = n.toLowerCase();
    return prefixes.some((p) => name.startsWith(p));
  });
}

/** The bundled preview font for a face, if we have one. */
export function previewFontFor(face: string): string | undefined {
  return NERD_FONTS.find((f) => f.face === face)?.preview ?? BUILTIN_PREVIEW[face];
}

/**
 * CSS font-family for showing `face`: the installed font first (when installed), then the bundled
 * preview of the same letters, then safe monospace fallbacks.
 */
export function cssFontFamily(face: string, installed: boolean): string {
  const preview = previewFontFor(face);
  return [installed ? `"${face}"` : null, preview ? `"${preview}"` : null, '"Cascadia Mono Variable"', "Consolas", "monospace"]
    .filter(Boolean)
    .join(", ");
}
