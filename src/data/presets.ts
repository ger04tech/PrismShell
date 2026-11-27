/**
 * Ready-made setups shown on Home: one click loads colours, font, background, cursor and prompt.
 * Every reference (scheme name, font id, prompt id) is checked by presets.test.ts.
 */
import type { Setup } from "@/core/setup";
import { DEFAULT_SETUP } from "@/core/store";
import { NERD_FONTS } from "@/data/fonts";
import { findScheme } from "@/data/schemes";

export interface Preset {
  id: string;
  name: string;
  description: string;
  scheme: string;
  fontId: string;
  opacity: number;
  useAcrylic: boolean;
  cursorShape: Setup["cursorShape"];
  prompt: string;
}

export const PRESETS: Preset[] = [
  {
    id: "neon",
    name: "Neón nocturno",
    description: "Synthwave, vidrio y un prompt que brilla",
    scheme: "Synthwave",
    fontId: "FiraCode",
    opacity: 78,
    useAcrylic: true,
    cursorShape: "bar",
    prompt: "multiverse-neon",
  },
  {
    id: "tokyo",
    name: "Medianoche en Tokio",
    description: "Azules profundos con detalles en rosa",
    scheme: "TokyoNight Storm",
    fontId: "JetBrainsMono",
    opacity: 85,
    useAcrylic: true,
    cursorShape: "bar",
    prompt: "tokyonight_storm",
  },
  {
    id: "autumn",
    name: "Café de otoño",
    description: "Tonos tierra, sólido y cálido",
    scheme: "Gruvbox Dark",
    fontId: "Iosevka",
    opacity: 100,
    useAcrylic: false,
    cursorShape: "filledBox",
    prompt: "gruvbox",
  },
  {
    id: "nordic",
    name: "Bosque nórdico",
    description: "Frío, limpio y tranquilo",
    scheme: "Nord",
    fontId: "IBMPlexMono",
    opacity: 92,
    useAcrylic: true,
    cursorShape: "underscore",
    prompt: "nordtron",
  },
  {
    id: "vampire",
    name: "Vampiro",
    description: "Dracula de pies a cabeza",
    scheme: "Dracula",
    fontId: "VictorMono",
    opacity: 90,
    useAcrylic: true,
    cursorShape: "bar",
    prompt: "dracula",
  },
  {
    id: "paper",
    name: "Papel",
    description: "Claro y suave, para trabajar de día",
    scheme: "Rose Pine Dawn",
    fontId: "CommitMono",
    opacity: 100,
    useAcrylic: false,
    cursorShape: "underscore",
    prompt: "zash",
  },
];

/** Builds the full Setup for a preset. Throws if a reference is broken (caught by the tests). */
export function presetSetup(preset: Preset): Setup {
  const scheme = findScheme(preset.scheme);
  const font = NERD_FONTS.find((f) => f.id === preset.fontId);
  if (!scheme || !font) throw new Error(`Preset "${preset.id}" apunta a un esquema o fuente que no existe.`);
  return {
    ...DEFAULT_SETUP,
    name: preset.name,
    scheme,
    font: { ...DEFAULT_SETUP.font, face: font.face, nerdFontId: font.id },
    background: { opacity: preset.opacity, useAcrylic: preset.useAcrylic },
    cursorShape: preset.cursorShape,
    prompt: { engine: "oh-my-posh", theme: preset.prompt },
  };
}
