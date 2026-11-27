import { openUrl } from "@tauri-apps/plugin-opener";
import { AlertTriangle, Check, CheckCircle2, Download, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/Panel";
import { ScreenWithPreview } from "@/components/ScreenWithPreview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { installOhMyPosh } from "@/core/install";
import type { ColorScheme } from "@/core/setup";
import { useApp } from "@/core/store";
import { NERD_FONTS } from "@/data/fonts";
import { PROMPT_THEMES, type PromptTheme } from "@/data/prompts";
import { t } from "@/i18n/es";
import { isTauri } from "@/lib/tauri";

/**
 * Screenshots rendered with `oh-my-posh config export image` (src/assets/prompt-themes/<id>.svg,
 * made by scripts/make_prompt_images.py: one prompt per image, tightly cropped, never wrapped).
 * Themes without one show a generic drawing in the scheme's colors.
 */
const THEME_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("../assets/prompt-themes/*.{png,svg,webp}", { eager: true, query: "?url", import: "default" }),
  ).map(([path, url]) => [path.split("/").pop()!.replace(/\.(png|svg|webp)$/, ""), url]),
);

const OMP_REPO = "https://github.com/JanDeDobbeleer/oh-my-posh";

function FallbackArt({ s }: { s: ColorScheme }) {
  const seg = "inline-block px-2 py-px font-semibold";
  return (
    <div className="flex h-full items-center px-3 font-mono text-[11px]" style={{ background: s.background }}>
      <span className={seg} style={{ background: s.blue, color: s.background }}>ana</span>
      <span className={seg} style={{ background: s.purple, color: s.background }}>~/proyectos</span>
      <span className={seg} style={{ background: s.green, color: s.background }}>main</span>
      <span className="ml-1.5" style={{ color: s.green }}>❯</span>
    </div>
  );
}

/** Every thumbnail at the same scale, so prompt text has the same size in every card. */
const THUMB_SCALE = 0.6;

/**
 * Theme screenshot at THUMB_SCALE of its natural size. Explicit width/height (read on load) instead
 * of CSS `zoom`, which WebView2 does not apply the same way everywhere.
 */
function Thumb({ src }: { src: string }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      className={size ? "block max-w-none" : "block max-w-none opacity-0"}
      style={size ? { width: size.w * THUMB_SCALE, height: size.h * THUMB_SCALE } : { height: 0 }}
    />
  );
}

function ThemeCard({
  theme,
  selected,
  scheme,
  onSelect,
  onPreview,
}: {
  theme: PromptTheme;
  selected: boolean;
  scheme: ColorScheme;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const image = THEME_IMAGES[theme.id];
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      aria-pressed={selected}
      className="overflow-hidden rounded-xl text-left surface-interactive"
    >
      {/* Full panel width so the whole prompt shows; every theme at the same scale. */}
      {/* Height follows the prompt (1–4 lines). Long prompts are cut on the right, so the edge
          fades out instead of slicing a segment in half. */}
      <div className="flex min-h-[88px] items-center bg-[#16171e] px-4 py-4">
        <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,black_calc(100%-56px),transparent)]">
          {image ? (
            <Thumb src={image} />
          ) : (
            <FallbackArt s={scheme} />
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 bg-card px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{theme.label}</div>
          <div className="truncate text-xs text-muted-foreground">{theme.description}</div>
        </div>
        {selected && (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        )}
      </div>
    </button>
  );
}

export function PromptScreen() {
  const { setup, updateSetup, detection, patchDetection, promptShells, setPromptShells, setPreviewPatch } = useApp();
  const clearPreview = () => setPreviewPatch(null);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const lastTheme = setup.prompt?.theme ?? "atomic";
  const enabled = Boolean(setup.prompt);
  const selectedTheme = PROMPT_THEMES.find((p) => p.id === setup.prompt?.theme);
  const usingNerdFont = NERD_FONTS.some((f) => f.face === setup.font.face);

  async function install() {
    setInstalling(true);
    setMessage(null);
    try {
      const ohMyPosh = await installOhMyPosh();
      patchDetection({ ohMyPosh });
      setMessage({ ok: true, text: t.prompt.ompInstalledOk });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setInstalling(false);
    }
  }

  return (
    <ScreenWithPreview
      title={t.prompt.title}
      subtitle={t.prompt.subtitle}
      next={{ label: t.prompt.next, screen: "apply" }}
      footerNote={
        <button type="button" onClick={() => void openUrl(OMP_REPO)} className="underline-offset-4 hover:underline">
          {t.prompt.credits}
        </button>
      }
    >
      <div className="-mx-5 -mb-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 pb-5">
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-card p-4 surface">
          <span>
            <span className="block text-[13px] font-semibold">{t.prompt.enable}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{t.prompt.enableHint}</span>
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={(on) =>
              updateSetup({ prompt: on ? { engine: "oh-my-posh", theme: lastTheme } : undefined })
            }
          />
        </label>

        {enabled && (
          <>
            <Panel title={t.prompt.omp}>
              {detection?.ohMyPosh ? (
                <p className="flex items-center gap-2 text-[13px]">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  {t.prompt.ompInstalled(detection.ohMyPosh)}
                </p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">{t.prompt.ompMissing}</p>
                  <Button onClick={() => void install()} disabled={installing || !isTauri()}>
                    {installing ? <Loader2 className="animate-spin" /> : <Download />}
                    {installing ? t.prompt.ompInstalling : t.prompt.ompInstall}
                  </Button>
                </div>
              )}
              {message && (
                <Alert variant={message.ok ? "default" : "destructive"}>
                  {message.ok ? <CheckCircle2 /> : <XCircle />}
                  <AlertDescription className="whitespace-pre-line break-words">{message.text}</AlertDescription>
                </Alert>
              )}
            </Panel>

            <Panel title={t.prompt.shells}>
              <label className="flex cursor-pointer items-center justify-between gap-4 text-[13px]">
                <span>
                  {t.prompt.pwsh}
                  {detection && !detection.pwsh && (
                    <span className="ml-2 text-xs text-muted-foreground">({t.prompt.pwshMissing})</span>
                  )}
                </span>
                <Switch
                  checked={promptShells.pwsh && Boolean(!detection || detection.pwsh)}
                  disabled={Boolean(detection && !detection.pwsh)}
                  onCheckedChange={(pwsh) => setPromptShells({ pwsh })}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-4 text-[13px]">
                <span>{t.prompt.powershell}</span>
                <Switch checked={promptShells.powershell} onCheckedChange={(powershell) => setPromptShells({ powershell })} />
              </label>
            </Panel>

            {selectedTheme?.needsNerdFont && !usingNerdFont && (
              <Alert>
                <AlertTriangle />
                <AlertDescription>{t.prompt.nerdFontWarning}</AlertDescription>
              </Alert>
            )}

            <h2 className="px-1 pt-2 text-[13px] font-semibold">{t.prompt.themes}</h2>
            <div className="flex flex-col gap-3" onMouseLeave={clearPreview} onBlur={clearPreview}>
              {PROMPT_THEMES.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  scheme={setup.scheme}
                  selected={setup.prompt?.theme === theme.id}
                  onSelect={() => {
                    updateSetup({ prompt: { engine: "oh-my-posh", theme: theme.id } });
                    clearPreview();
                  }}
                  onPreview={() => setPreviewPatch({ prompt: { engine: "oh-my-posh", theme: theme.id } })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </ScreenWithPreview>
  );
}
