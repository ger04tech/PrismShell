/**
 * A fake Windows Terminal drawn with HTML/CSS from a Setup: tab bar, powerline prompt,
 * `ls` and `git status` output, and the cursor. Never runs a real terminal.
 * Powerline arrows are CSS shapes, so the preview looks right even without a Nerd Font.
 */
import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { ColorScheme, Setup } from "@/core/setup";
import { cssFontFamily } from "@/data/fonts";
import { cn } from "@/lib/utils";
import { ART_FONT_PX, usePromptArt, type PromptArt } from "./promptArt";
import { WELCOME_FROM, WELCOME_ROWS, WELCOME_TO } from "@/core/apply/welcome";

/** "#rrggbb" + alpha (0–1) → "rgb(r g b / a)". */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${alpha})`;
}

/** WT padding "8" | "8, 4" | "8, 4, 8, 4" (left, top, right, bottom) → CSS padding. */
function toCssPadding(padding: string | undefined): string {
  const v = (padding ?? "8").split(",").map((s) => Number(s.trim()) || 0);
  const [l, t = l, r = l, b = t] = v;
  return `${t}px ${r}px ${b}px ${l}px`;
}

const CHEVRON = "polygon(0 0, calc(100% - 0.55em) 0, 100% 50%, calc(100% - 0.55em) 100%, 0 100%, 0.55em 50%)";
const CHEVRON_FIRST = "polygon(0 0, calc(100% - 0.55em) 0, 100% 50%, calc(100% - 0.55em) 100%, 0 100%)";

function Segment({ bg, fg, first, children }: { bg: string; fg: string; first?: boolean; children: ReactNode }) {
  return (
    <span
      className="inline-block py-px font-semibold"
      style={{
        background: bg,
        color: fg,
        clipPath: first ? CHEVRON_FIRST : CHEVRON,
        padding: first ? "0 1.05em 0 0.6em" : "0 1.05em 0 1.15em",
        marginLeft: first ? 0 : "-0.4em",
      }}
    >
      {children}
    </span>
  );
}

/** Height of one prompt line in the theme images (16px Hack: 15 ascent + 4 descent). */
const ART_LINE = 19;

interface PromptLook {
  s: ColorScheme;
  fancy: boolean;
  /** Image of the chosen Oh My Posh theme; null draws a generic powerline from the scheme. */
  art: PromptArt | null;
  /** Terminal font px / ART_FONT_PX, so the image matches the chosen size. */
  scale: number;
}

function Prompt({ look, command, cursor }: { look: PromptLook; command?: string; cursor?: ReactNode }) {
  const { s, fancy, art, scale: k } = look;
  if (!fancy) {
    return (
      <div className="flex items-center whitespace-nowrap">
        <span style={{ color: s.foreground }}>PS C:\Users\ana\proyectos&gt;&nbsp;</span>
        <span style={{ color: s.yellow }}>{command}</span>
        {cursor}
      </div>
    );
  }
  if (art) {
    // The theme's own prompt (its own colours, as in the real terminal); the command and the
    // cursor go where the image had its cursor.
    return (
      // Prompts wider than the preview fade out at the edge instead of being sliced mid-segment.
      <div className="relative [mask-image:linear-gradient(to_right,black_calc(100%-48px),transparent)]" style={{ height: art.height * k }}>
        <img
          src={art.url}
          alt=""
          draggable={false}
          className="absolute left-0 top-0 max-w-none select-none"
          style={{ width: art.width * k, height: art.height * k }}
        />
        <span
          className="absolute flex items-center whitespace-nowrap"
          style={{ left: art.cursorX * k, top: art.cursorTop * k, height: ART_LINE * k }}
        >
          {command && <span style={{ color: s.foreground }}>{command}</span>}
          {cursor}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center whitespace-nowrap">
      <Segment bg={s.blue} fg={s.background} first>
        ana
      </Segment>
      <Segment bg={s.purple} fg={s.background}>
        ~\proyectos\prism
      </Segment>
      <Segment bg={s.green} fg={s.background}>
        ⎇ main
      </Segment>
      <span className="ml-1.5" style={{ color: s.brightGreen }}>
        ❯
      </span>
      {command && (
        <span className="ml-2" style={{ color: s.foreground }}>
          {command}
        </span>
      )}
      {cursor}
    </div>
  );
}

/** The blinking cursor, sized in em so it fits any text it sits next to. */
export function CursorMark({ shape, color, className }: { shape: Setup["cursorShape"]; color: string; className?: string }) {
  const base: CSSProperties = { display: "inline-block", width: "0.6em", height: "1.15em", verticalAlign: "-0.2em" };
  const styles: Record<Setup["cursorShape"], CSSProperties> = {
    bar: { ...base, width: 2, background: color },
    filledBox: { ...base, background: color },
    emptyBox: { ...base, boxShadow: `inset 0 0 0 1px ${color}` },
    underscore: { ...base, boxShadow: `inset 0 -2px 0 ${color}` },
    // Two thin lines with a gap, as Windows Terminal draws it.
    doubleUnderscore: { ...base, background: `linear-gradient(to top, ${color} 1px, transparent 1px 3px, ${color} 3px 4px, transparent 4px)` },
    vintage: { ...base, background: `linear-gradient(to top, ${color} 25%, transparent 25%)` },
  };
  return (
    <span
      aria-hidden
      className={cn("motion-safe:animate-[prism-blink_1.1s_steps(1)_infinite]", className ?? "ml-2")}
      style={styles[shape]}
    />
  );
}

/** WT backgroundImageStretchMode → CSS background-size. */
const STRETCH_CSS: Record<NonNullable<Setup["background"]["imageStretchMode"]>, string> = {
  none: "auto",
  fill: "100% 100%",
  uniform: "contain",
  uniformToFill: "cover",
};

/** Deterministic pseudo-random numbers, so a celebration renders the same on every re-render. */
function seeded(seed: number) {
  let x = seed % 2147483647 || 1;
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}

const CONFETTI_KEYS = ["red", "green", "yellow", "blue", "purple", "cyan", "brightRed", "brightYellow", "brightBlue", "brightPurple"] as const;

/** One-off shower of the scheme's colours. Plays once; nothing under reduced motion. */
function Confetti({ s, seed }: { s: ColorScheme; seed: number }) {
  const pieces = useMemo(() => {
    const rnd = seeded(seed);
    return Array.from({ length: 42 }, (_, i) => ({
      left: `${rnd() * 100}%`,
      color: s[CONFETTI_KEYS[i % CONFETTI_KEYS.length]],
      delay: `${Math.round(rnd() * 350)}ms`,
      duration: `${1300 + Math.round(rnd() * 600)}ms`,
      drift: `${Math.round((rnd() - 0.5) * 80)}px`,
      spin: `${Math.round((rnd() - 0.5) * 720)}deg`,
      w: 5 + Math.round(rnd() * 4),
      round: rnd() > 0.6,
    }));
  }, [s, seed]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden motion-reduce:hidden [container-type:size]">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute -top-3"
          style={
            {
              left: p.left,
              width: p.w,
              height: p.round ? p.w : p.w * 1.6,
              borderRadius: p.round ? "50%" : 1.5,
              background: p.color,
              "--drift": p.drift,
              "--spin": p.spin,
              opacity: 0,
              animation: `prism-fall ${p.duration} cubic-bezier(0.33, 0, 0.6, 1) ${p.delay} forwards`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Sample wallpaper behind previews, so transparency and acrylic are visible. */
export const SAMPLE_WALLPAPER =
  "radial-gradient(circle at 18% 25%, #ff7ab6 0, transparent 38%), radial-gradient(circle at 82% 20%, #5ee7df 0, transparent 35%), radial-gradient(circle at 70% 85%, #7c6cf0 0, transparent 40%), radial-gradient(circle at 20% 90%, #ffb86b 0, transparent 30%), linear-gradient(135deg, #1e3a8a, #312e81)";

export interface TerminalPreviewProps {
  setup: Setup;
  /** `data:` URL of the background image (setup.background.image), if any. */
  imageUrl?: string | null;
  /** False when the chosen font is not installed: the preview uses the bundled copy of its letters. */
  fontInstalled?: boolean;
  /** Date.now() of a successful "Aplicar": shows the result in the terminal (and confetti right after). */
  celebrateAt?: number | null;
  className?: string;
}

export function TerminalPreview({ setup, imageUrl, fontInstalled = true, celebrateAt, className }: TerminalPreviewProps) {
  const s = setup.scheme;
  const bg = setup.background;
  const fancy = Boolean(setup.prompt);
  const fontPx = (setup.font.size * 4) / 3;
  const look: PromptLook = { s, fancy, art: usePromptArt(setup.prompt?.theme), scale: fontPx / ART_FONT_PX };
  const fontFamily = cssFontFamily(setup.font.face, fontInstalled);
  const weight = { thin: 100, light: 300, normal: 400, medium: 500, "semi-bold": 600, bold: 700 }[setup.font.weight];
  // Confetti only right after applying, not when coming back to the screen later.
  const freshCelebration = useMemo(() => celebrateAt != null && Date.now() - celebrateAt < 2500, [celebrateAt]);

  return (
    <div
      className={cn("relative flex flex-col overflow-hidden rounded-2xl p-6", className)}
      style={{
        background: SAMPLE_WALLPAPER,
      }}
    >
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg shadow-2xl shadow-black/50 ring-1 ring-white/10">
        {/* Tab bar */}
        <div className="flex h-9 items-center gap-1 bg-[#202020] pl-2 text-[12px] text-white/85">
          <div className="flex h-7 items-center gap-2 rounded-t-md bg-[#2b2b2b] px-3">
            <span className="size-3 rounded-sm" style={{ background: s.blue }} />
            PowerShell
            <span className="ml-3 text-white/50">✕</span>
          </div>
          <span className="px-2 text-white/60">＋</span>
          <span className="px-1 text-white/60">⌄</span>
          <div className="ml-auto flex h-full text-white/70">
            <span className="grid w-11 place-items-center">—</span>
            <span className="grid w-11 place-items-center">▢</span>
            <span className="grid w-11 place-items-center">✕</span>
          </div>
        </div>

        {/* Terminal body */}
        <div
          className="relative isolate min-h-[230px] flex-1 overflow-hidden leading-[1.35]"
          style={{
            background: withAlpha(s.background, bg.opacity / 100),
            backdropFilter: bg.useAcrylic ? "blur(22px) saturate(140%)" : undefined,
            color: s.foreground,
            fontFamily,
            fontSize: `${fontPx}px`,
            fontWeight: weight,
            padding: toCssPadding(setup.padding),
          }}
        >
          {imageUrl && (
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-center bg-no-repeat"
              style={{
                backgroundImage: `url("${imageUrl}")`,
                backgroundSize: STRETCH_CSS[bg.imageStretchMode ?? "uniformToFill"],
                opacity: bg.imageOpacity ?? 1,
              }}
            />
          )}
          {setup.welcome && (
            // Smaller than the real one so the 70-column banner fits the preview window.
            <div className="mb-2">
              <pre
                className="m-0 w-max text-[0.55em] leading-none"
                style={{
                  fontFamily: "inherit",
                  backgroundImage: `linear-gradient(90deg, rgb(${WELCOME_FROM.join(" ")}), rgb(${WELCOME_TO.join(" ")}))`,
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {WELCOME_ROWS.join("\n")}
              </pre>
              <div className="mt-1" style={{ color: s.brightBlack }}>
                Hola, ana!
              </div>
            </div>
          )}
          <Prompt look={look} command="ls" />
          <div className="mb-2 mt-0.5 flex flex-wrap gap-x-6">
            <span style={{ color: s.blue }} className="font-bold">
              src/
            </span>
            <span style={{ color: s.blue }} className="font-bold">
              docs/
            </span>
            <span>README.md</span>
            <span style={{ color: s.green }}>build.ps1</span>
            <span style={{ color: s.red }}>backup.zip</span>
            <span style={{ color: s.cyan }}>logo.png</span>
          </div>
          <Prompt look={look} command="git status" />
          <div className="mt-0.5">On branch main</div>
          <div>Changes not staged for commit:</div>
          <div className="pl-8" style={{ color: s.red }}>
            modified: src/app.tsx
          </div>
          <div className="pl-8" style={{ color: s.green }}>
            new file: src/theme.json
          </div>
          <div className="mb-2" style={{ color: s.brightBlack }}>
            # 2 archivos cambiados
          </div>
          {celebrateAt != null && (
            <>
              <Prompt look={look} command="prismshell apply" />
              <div className="mb-2 mt-0.5">
                <span style={{ color: s.green }}>✓</span> colores{"  "}
                <span style={{ color: s.green }}>✓</span> fuente{"  "}
                <span style={{ color: s.green }}>✓</span> fondo{"  "}
                <span style={{ color: s.green }}>✓</span> prompt
                <div style={{ color: s.brightPurple }}>✨ listo, abre una pestaña nueva en Windows Terminal</div>
              </div>
            </>
          )}
          <Prompt
            look={look}
            cursor={<CursorMark shape={setup.cursorShape} color={s.cursorColor} className={look.art && fancy ? "" : "ml-2"} />}
          />
        </div>
      </div>
      {freshCelebration && <Confetti s={s} seed={celebrateAt!} />}
    </div>
  );
}
