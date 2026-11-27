/**
 * Turns a gallery screenshot of an Oh My Posh theme (src/assets/prompt-themes/<id>.svg, made by
 * scripts/make_prompt_images.py) into art for the big TerminalPreview:
 *   - drops the flat dark background, so the scheme colour, opacity and image show through;
 *   - trims the 10 px padding around the prompt;
 *   - removes the fake "_" cursor and reports where it was, so the preview can type a command there.
 * The SVG keeps its embedded font and is shown through an <img> (blob URL), so its @font-face never
 * leaks into the page.
 */
import { useEffect, useState } from "react";

/** Values used by make_prompt_images.py when rendering at 16px. */
export const ART_FONT_PX = 16;
const BACKGROUND = "#16171e";
const PAD = 10;
const LINE_ASCENT = 15;

export interface PromptArt {
  url: string;
  /** Size in SVG px (rendered at ART_FONT_PX). */
  width: number;
  height: number;
  /** Where the cursor was: left of the command, and top of its line (SVG px). */
  cursorX: number;
  cursorTop: number;
}

export type PromptArtGeometry = Omit<PromptArt, "url">;

const SIZE = /width="([\d.]+)" height="([\d.]+)" viewBox="([\d.-]+) ([\d.-]+) ([\d.]+) ([\d.]+)"/;
/** A text run that is only "_": the cursor `oh-my-posh config export image` draws (one per image). */
const CURSOR = /<text\b[^>]*\bx="([\d.]+)" y="([\d.]+)"[^>]*>_<\/text>/g;

/** Pure transform (tested): returns the new SVG text and its geometry, or null if it is not ours. */
export function toPreviewSvg(svg: string): { svg: string; geometry: PromptArtGeometry } | null {
  const size = SIZE.exec(svg);
  if (!size) return null;
  const [, , , vx, vy, vw, vh] = size.map(Number);
  const x0 = vx + PAD;
  const y0 = vy + PAD;
  const width = Math.max(1, vw - 2 * PAD);
  const height = Math.max(1, vh - 2 * PAD);

  let out = svg.replace(
    SIZE,
    `width="${width.toFixed(2)}" height="${height.toFixed(2)}" viewBox="${x0.toFixed(2)} ${y0.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}"`,
  );
  out = out.replace(new RegExp(`<rect\\b[^>]*\\bfill="${BACKGROUND}"[^>]*/>`, "i"), "");

  // The fake cursor is the last "_" run (right-aligned blocks may come after it in the file);
  // without one, the command goes after the image.
  const cursor = [...out.matchAll(CURSOR)].at(-1);
  let cursorX = width;
  let cursorTop = height - (LINE_ASCENT + 4);
  if (cursor?.index !== undefined) {
    cursorX = Number(cursor[1]) - x0;
    cursorTop = Number(cursor[2]) - LINE_ASCENT - y0;
    out = out.slice(0, cursor.index) + out.slice(cursor.index + cursor[0].length);
  }
  return { svg: out, geometry: { width, height, cursorX, cursorTop } };
}

const RAW = import.meta.glob<string>("../../assets/prompt-themes/*.svg", { query: "?raw", import: "default" });
const cache = new Map<string, Promise<PromptArt | null>>();

function loadArt(themeId: string): Promise<PromptArt | null> {
  let pending = cache.get(themeId);
  if (!pending) {
    const loader = Object.entries(RAW).find(([path]) => path.endsWith(`/${themeId}.svg`))?.[1];
    pending = loader
      ? loader()
          .then((raw) => {
            const result = toPreviewSvg(raw);
            if (!result) return null;
            const url = URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml" }));
            return { url, ...result.geometry };
          })
          .catch(() => null)
      : Promise.resolve(null);
    cache.set(themeId, pending);
  }
  return pending;
}

/**
 * Art for a theme id (null: no image, use the drawn powerline). While a new theme loads, the
 * previous art stays on screen, so switching themes never flashes the generic prompt.
 */
export function usePromptArt(themeId: string | undefined): PromptArt | null {
  const [loaded, setLoaded] = useState<{ id: string; art: PromptArt | null } | null>(null);

  useEffect(() => {
    if (!themeId) return;
    let alive = true;
    void loadArt(themeId).then((art) => {
      if (alive) setLoaded({ id: themeId, art });
    });
    return () => {
      alive = false;
    };
  }, [themeId]);

  if (!themeId) return null;
  return loaded?.art ?? null;
}
