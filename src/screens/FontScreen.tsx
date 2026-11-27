import { Check, CheckCircle2, Download, Loader2, XCircle } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { ScreenWithPreview } from "@/components/ScreenWithPreview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { installNerdFont, type InstallStep } from "@/core/install";
import { CURSOR_SHAPES, FONT_WEIGHTS, type Setup } from "@/core/setup";
import { useApp } from "@/core/store";
import { BUILTIN_FONTS, cssFontFamily, isFontInstalled, NERD_FONTS, type NerdFont } from "@/data/fonts";
import { t } from "@/i18n/es";
import { isTauri, listInstalledFonts } from "@/lib/tauri";
import { cn } from "@/lib/utils";

/** Small drawing of each cursor shape next to a letter. */
function CursorGlyph({ shape }: { shape: Setup["cursorShape"] }) {
  const c = "currentColor";
  const box = "inline-block h-[18px] w-[10px] align-middle";
  const style: Record<Setup["cursorShape"], CSSProperties> = {
    bar: { width: 2, background: c },
    filledBox: { background: c },
    emptyBox: { boxShadow: `inset 0 0 0 1.5px ${c}` },
    underscore: { boxShadow: `inset 0 -2px 0 ${c}` },
    doubleUnderscore: { background: `linear-gradient(to top, ${c} 1.5px, transparent 1.5px 3.5px, ${c} 3.5px 5px, transparent 5px)` },
    vintage: { background: `linear-gradient(to top, ${c} 25%, transparent 25%)` },
  };
  return (
    <span className="font-mono text-sm">
      a<span className={box} style={style[shape]} />
    </span>
  );
}

interface FontRowProps {
  label: string;
  face: string;
  selected: boolean;
  installed: boolean | null;
  recommended?: boolean;
  busy: boolean;
  disabled: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onInstall?: () => void;
}

function FontRow({ label, face, selected, installed, recommended, busy, disabled, onSelect, onPreview, onInstall }: FontRowProps) {
  return (
    <div
      data-selected={selected}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      className="flex items-center gap-3 rounded-xl bg-card py-1 pl-1 pr-3 surface-interactive"
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="min-w-0 flex-1 rounded-lg px-2.5 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold">{label}</span>
          {recommended && (
            <span className="rounded-md bg-primary/15 px-1.5 py-px text-[11px] font-medium text-primary-soft">
              {t.font.recommended}
            </span>
          )}
        </div>
        <div
          className="truncate text-[15px] text-muted-foreground"
          style={{ fontFamily: cssFontFamily(face, installed === true) }}
        >
          {t.font.sample}
        </div>
      </button>
      {installed ? (
        selected ? (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        ) : (
          <span className="shrink-0 rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-[11px] font-medium text-emerald-400">
            {t.font.installed}
          </span>
        )
      ) : (
        onInstall && (
          <Button size="sm" variant="secondary" className="-mr-1 shrink-0" onClick={onInstall} disabled={disabled}>
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            {busy ? t.font.installing : t.font.install}
          </Button>
        )
      )}
    </div>
  );
}

export function FontScreen() {
  const { setup, updateSetup, detection, patchDetection, setPreviewPatch } = useApp();

  // Fonts installed outside the app (e.g. by double-clicking a .ttf) show up without restarting.
  useEffect(() => {
    if (!isTauri()) return;
    listInstalledFonts()
      .then((installedFonts) => patchDetection({ installedFonts }))
      .catch(() => {});
  }, [patchDetection]);
  const clearPreview = () => setPreviewPatch(null);
  const previewFace = (face: string) => setPreviewPatch({ font: { ...setup.font, face } });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [step, setStep] = useState<InstallStep | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const installed = (face: string): boolean | null =>
    detection ? isFontInstalled(face, detection.installedFonts) : null;

  const setFont = (patch: Partial<Setup["font"]>) => updateSetup({ font: { ...setup.font, ...patch } });

  async function install(font: NerdFont) {
    setBusyId(font.id);
    setMessage(null);
    try {
      const result = await installNerdFont(font, detection?.ohMyPosh ?? null, setStep);
      patchDetection(result);
      setFont({ face: font.face, nerdFontId: font.id });
      setMessage({ ok: true, text: `${t.font.installedOk(font.label)} ${t.font.restartHint}` });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyId(null);
      setStep(null);
    }
  }

  return (
    <ScreenWithPreview title={t.font.title} subtitle={t.font.subtitle} next={{ label: t.font.next, screen: "background" }}>
      {/* Size + weight */}
      <div className="grid grid-cols-[1fr_auto] items-end gap-4 px-1">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-[13px] font-medium">{t.font.size}</span>
            <span className="tabular-nums text-muted-foreground">{setup.font.size} pt</span>
          </div>
          <Slider
            min={8}
            max={24}
            step={1}
            value={[setup.font.size]}
            onValueChange={([size]) => setFont({ size })}
            aria-label={t.font.size}
          />
        </div>
        <div className="w-40">
          <div className="mb-2 text-[13px] font-medium">{t.font.weight}</div>
          <Select value={setup.font.weight} onValueChange={(v) => setFont({ weight: v as Setup["font"]["weight"] })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map((w) => (
                <SelectItem key={w} value={w}>
                  {t.weights[w]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cursor */}
      <div className="px-1">
        <div className="mb-2 text-[13px] font-medium">{t.font.cursor}</div>
        <div className="grid grid-cols-3 gap-1.5" onMouseLeave={clearPreview} onBlur={clearPreview}>
          {CURSOR_SHAPES.map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => {
                updateSetup({ cursorShape: shape });
                clearPreview();
              }}
              onMouseEnter={() => setPreviewPatch({ cursorShape: shape })}
              onFocus={() => setPreviewPatch({ cursorShape: shape })}
              aria-pressed={setup.cursorShape === shape}
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg bg-card px-3 text-[13px] surface-interactive",
                setup.cursorShape === shape ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              <CursorGlyph shape={shape} />
              {t.cursors[shape]}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <Alert variant={message.ok ? "default" : "destructive"}>
          {message.ok ? <CheckCircle2 /> : <XCircle />}
          <AlertDescription className="whitespace-pre-line break-words">{message.text}</AlertDescription>
        </Alert>
      )}
      {busyId && step && (
        <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {step === "oh-my-posh"
            ? t.font.installingOmp
            : t.font.downloading(NERD_FONTS.find((f) => f.id === busyId)?.label ?? "")}
        </p>
      )}

      {/* Font list */}
      <div
        className="-mx-5 -mb-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-1"
        onMouseLeave={clearPreview}
        onBlur={clearPreview}
      >
        <h2 className="px-1 text-[13px] font-semibold">{t.font.nerdFonts}</h2>
        <p className="mb-2 px-1 text-xs text-muted-foreground">{t.font.nerdFontsHint}</p>
        <div className="flex flex-col gap-2">
          {NERD_FONTS.map((f) => (
            <FontRow
              key={f.id}
              label={f.label}
              face={f.face}
              recommended={f.recommended}
              selected={setup.font.face === f.face}
              installed={installed(f.face)}
              busy={busyId === f.id}
              disabled={busyId !== null || !isTauri()}
              onSelect={() => {
                setFont({ face: f.face, nerdFontId: f.id });
                clearPreview();
              }}
              onPreview={() => previewFace(f.face)}
              onInstall={() => void install(f)}
            />
          ))}
        </div>

        <h2 className="mt-6 px-1 text-[13px] font-semibold">{t.font.builtin}</h2>
        <p className="mb-2 px-1 text-xs text-muted-foreground">{t.font.builtinHint}</p>
        <div className="flex flex-col gap-2">
          {BUILTIN_FONTS.map((face) => (
            <FontRow
              key={face}
              label={face}
              face={face}
              selected={setup.font.face === face}
              installed={true}
              busy={false}
              disabled
              onSelect={() => {
                setFont({ face, nerdFontId: undefined });
                clearPreview();
              }}
              onPreview={() => previewFace(face)}
            />
          ))}
        </div>
      </div>
    </ScreenWithPreview>
  );
}
