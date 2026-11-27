/**
 * Setup → targeted edits in Windows Terminal's settings.json (`profiles.defaults`).
 * Uses jsonc-parser so comments and formatting survive. Never re-serializes the whole file.
 */
import {
  applyEdits,
  findNodeAtLocation,
  getNodeValue,
  modify,
  parseTree,
  type FormattingOptions,
  type JSONPath,
  type Node,
  type ParseError,
} from "jsonc-parser";
import type { Setup } from "../setup";
import { fragmentSchemeName } from "./fragment";

export const DEFAULTS_PATH: JSONPath = ["profiles", "defaults"];

/** Keys (relative to profiles.defaults) that PrismShell owns. */
export const MANAGED_KEYS: readonly JSONPath[] = [
  ["colorScheme"],
  ["font", "face"],
  ["font", "size"],
  ["font", "weight"],
  ["opacity"],
  ["useAcrylic"],
  ["cursorShape"],
  ["padding"],
  ["backgroundImage"],
  ["backgroundImageOpacity"],
  ["backgroundImageStretchMode"],
];

/** Objects we may have to create (and remove again on undo if they end up empty). */
const MANAGED_CONTAINERS: readonly JSONPath[] = [["profiles"], DEFAULTS_PATH, [...DEFAULTS_PATH, "font"]];

/** What a key looked like before PrismShell touched it. JSON-safe (no `undefined`). */
export type PreviousValue = { absent: true } | { absent: false; value: unknown };
/** Keyed by `JSON.stringify(path)` with the full path from the document root. */
export type PreviousValues = Record<string, PreviousValue>;

export interface ApplyOptions {
  /** Absolute path to the copied background image, if any. */
  backgroundImagePath?: string;
}

export class SettingsParseError extends Error {}

const keyOf = (path: JSONPath) => JSON.stringify(path);

function parseOrThrow(text: string): Node {
  const errors: ParseError[] = [];
  const root = parseTree(text, errors, { allowTrailingComma: true, disallowComments: false });
  if (errors.length > 0 || !root) {
    throw new SettingsParseError("settings.json no es JSON válido; no se modificó nada.");
  }
  return root;
}

/** Detects the file's indentation and line endings so our edits blend in. */
export function detectFormatting(text: string): FormattingOptions {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const indentMatch = text.match(/^([ \t]+)\S/m);
  const indent = indentMatch?.[1] ?? "    ";
  const insertSpaces = !indent.startsWith("\t");
  return { insertSpaces, tabSize: insertSpaces ? indent.length : 1, eol };
}

function readValue(root: Node | undefined, path: JSONPath): PreviousValue {
  const node = root ? findNodeAtLocation(root, path) : undefined;
  return node ? { absent: false, value: getNodeValue(node) } : { absent: true };
}

function setValue(text: string, path: JSONPath, value: unknown, formatting: FormattingOptions): string {
  const edits = modify(text, path, value, { formattingOptions: formatting });
  return applyEdits(text, edits);
}

/** The desired value for each managed key. `undefined` means "remove the key". */
export function setupToDefaults(setup: Setup, opts: ApplyOptions = {}): Map<string, { path: JSONPath; value: unknown }> {
  const bg = setup.background;
  const hasImage = Boolean(opts.backgroundImagePath);
  const values: [JSONPath, unknown][] = [
    [["colorScheme"], fragmentSchemeName(setup.scheme.name)],
    [["font", "face"], setup.font.face],
    [["font", "size"], setup.font.size],
    [["font", "weight"], setup.font.weight],
    [["opacity"], bg.opacity],
    [["useAcrylic"], bg.useAcrylic],
    [["cursorShape"], setup.cursorShape],
    [["padding"], setup.padding],
    [["backgroundImage"], hasImage ? opts.backgroundImagePath : undefined],
    [["backgroundImageOpacity"], hasImage ? bg.imageOpacity : undefined],
    [["backgroundImageStretchMode"], hasImage ? bg.imageStretchMode : undefined],
  ];
  return new Map(
    values.map(([rel, value]) => {
      const path = [...DEFAULTS_PATH, ...rel];
      return [keyOf(path), { path, value }];
    }),
  );
}

function assertProfilesIsObject(root: Node | undefined) {
  const profiles = root ? findNodeAtLocation(root, ["profiles"]) : undefined;
  if (profiles && profiles.type !== "object") {
    throw new SettingsParseError(
      'Tu settings.json usa el formato antiguo ("profiles" como lista). Abre la configuración de Windows Terminal una vez y guárdala para actualizarlo.',
    );
  }
}

/**
 * Applies the setup. Returns the new text and the merged "previous values" record:
 * values already recorded (from an earlier apply) are kept, so undo always returns to
 * the state before PrismShell's first change.
 */
export function applySetupToSettings(
  text: string,
  setup: Setup,
  previous: PreviousValues = {},
  opts: ApplyOptions = {},
): { text: string; previous: PreviousValues } {
  const root = parseOrThrow(text);
  assertProfilesIsObject(root);
  const formatting = detectFormatting(text);
  const nextPrevious: PreviousValues = { ...previous };

  for (const path of MANAGED_CONTAINERS) {
    const k = keyOf(path);
    if (!(k in nextPrevious)) nextPrevious[k] = readValue(root, path).absent ? { absent: true } : { absent: false, value: null };
  }

  let out = text;
  for (const [k, { path, value }] of setupToDefaults(setup, opts)) {
    if (!(k in nextPrevious)) nextPrevious[k] = readValue(root, path);
    const current = readValue(parseOrThrow(out), path);
    if (value === undefined && current.absent) continue;
    if (!current.absent && JSON.stringify(current.value) === JSON.stringify(value)) continue;
    out = setValue(out, path, value, formatting);
  }
  return { text: out, previous: nextPrevious };
}

/** Puts back only the keys PrismShell changed; everything else stays as the user left it. */
export function revertSettings(text: string, previous: PreviousValues): string {
  const formatting = detectFormatting(text);
  let out = text;

  const containerKeys = new Set(MANAGED_CONTAINERS.map(keyOf));
  for (const [k, prev] of Object.entries(previous)) {
    if (containerKeys.has(k)) continue;
    const path = JSON.parse(k) as JSONPath;
    const current = readValue(parseOrThrow(out), path);
    if (prev.absent) {
      if (!current.absent) out = setValue(out, path, undefined, formatting);
    } else if (current.absent || JSON.stringify(current.value) !== JSON.stringify(prev.value)) {
      out = setValue(out, path, prev.value, formatting);
    }
  }

  // Remove containers we created, deepest first, only if they are now empty.
  const containers = [...MANAGED_CONTAINERS].sort((a, b) => b.length - a.length);
  for (const path of containers) {
    const prev = previous[keyOf(path)];
    if (!prev?.absent) continue;
    const node = findNodeAtLocation(parseOrThrow(out), path);
    if (node && node.type === "object" && (node.children?.length ?? 0) === 0) {
      out = setValue(out, path, undefined, formatting);
    }
  }
  return out;
}

export interface ProfileOverride {
  name: string;
  keys: string[];
}

/**
 * Profiles in `profiles.list` that set one of our keys themselves; those win over
 * `profiles.defaults`, so the user would not see our change in them.
 */
export function findProfileOverrides(text: string): ProfileOverride[] {
  const root = parseOrThrow(text);
  const list = root ? findNodeAtLocation(root, ["profiles", "list"]) : undefined;
  if (!list || list.type !== "array") return [];
  const topLevel = new Set(MANAGED_KEYS.map((p) => String(p[0])));
  // Legacy flat font keys also override `font.*`.
  const legacy: Record<string, string> = { fontFace: "font", fontSize: "font", fontWeight: "font" };

  const result: ProfileOverride[] = [];
  for (const item of list.children ?? []) {
    const profile = getNodeValue(item) as Record<string, unknown>;
    if (!profile || typeof profile !== "object" || profile.hidden === true) continue;
    const keys = Object.keys(profile).filter((k) => topLevel.has(k) || k in legacy);
    if (keys.length > 0) result.push({ name: String(profile.name ?? "(sin nombre)"), keys });
  }
  return result;
}
