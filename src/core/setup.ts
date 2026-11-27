import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #rrggbb");

/** Windows Terminal color scheme: name + 16 ANSI colors + 4 extras. */
export const ColorSchemeSchema = z.object({
  name: z.string().min(1),
  background: hex,
  foreground: hex,
  cursorColor: hex,
  selectionBackground: hex,
  black: hex,
  red: hex,
  green: hex,
  yellow: hex,
  blue: hex,
  purple: hex,
  cyan: hex,
  white: hex,
  brightBlack: hex,
  brightRed: hex,
  brightGreen: hex,
  brightYellow: hex,
  brightBlue: hex,
  brightPurple: hex,
  brightCyan: hex,
  brightWhite: hex,
});
export type ColorScheme = z.infer<typeof ColorSchemeSchema>;

export const FONT_WEIGHTS = ["thin", "light", "normal", "medium", "semi-bold", "bold"] as const;
export const CURSOR_SHAPES = ["bar", "vintage", "underscore", "filledBox", "emptyBox", "doubleUnderscore"] as const;
export const STRETCH_MODES = ["none", "fill", "uniform", "uniformToFill"] as const;

export const SetupSchema = z.object({
  version: z.literal(2),
  name: z.string(),
  author: z.string().optional(),
  scheme: ColorSchemeSchema,
  font: z.object({
    face: z.string(),
    size: z.number().min(6).max(36),
    weight: z.enum(FONT_WEIGHTS).default("normal"),
    nerdFontId: z.string().optional(),
  }),
  background: z.object({
    opacity: z.number().int().min(0).max(100),
    useAcrylic: z.boolean(),
    image: z.string().optional(),
    imageOpacity: z.number().min(0).max(1).optional(),
    imageStretchMode: z.enum(STRETCH_MODES).optional(),
  }),
  cursorShape: z.enum(CURSOR_SHAPES),
  padding: z.string().optional(),
  prompt: z
    .object({
      engine: z.literal("oh-my-posh"),
      theme: z.string(),
    })
    .optional(),
  /** v2: "PRISMSHELL" banner when a PowerShell tab opens. */
  welcome: z.boolean(),
});
export type Setup = z.infer<typeof SetupSchema>;

/** Accepts older versions too: v1 had no welcome banner (it stays off). */
export function parseSetup(data: unknown): Setup {
  if (data && typeof data === "object" && (data as { version?: unknown }).version === 1) {
    data = { ...data, version: 2, welcome: false };
  }
  return SetupSchema.parse(data);
}
