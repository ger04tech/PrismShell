import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ImagePlus, Trash2, TriangleAlert, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Panel } from "@/components/Panel";
import { ScreenWithPreview } from "@/components/ScreenWithPreview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { Setup } from "@/core/setup";
import { useApp } from "@/core/store";
import { t } from "@/i18n/es";
import { isTauri, readImageDataUrl, transparencyEffectsOn } from "@/lib/tauri";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "bmp", "webp"];
/** Most useful first. */
const STRETCH_ORDER = ["uniformToFill", "uniform", "fill", "none"] as const satisfies readonly NonNullable<
  Setup["background"]["imageStretchMode"]
>[];

function SliderRow(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-[13px] font-medium">{props.label}</span>
        <span className="tabular-nums text-muted-foreground">
          {props.value}
          {props.unit}
        </span>
      </div>
      <Slider
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={[props.value]}
        onValueChange={([v]) => props.onChange(v)}
        aria-label={props.label}
      />
      {props.hint && <p className="mt-1.5 text-xs text-muted-foreground">{props.hint}</p>}
    </div>
  );
}

/** "8, 8, 8, 8" | "8" → 8 (we edit all sides together). */
function paddingValue(padding: string | undefined): number {
  return Number(padding?.split(",")[0]?.trim()) || 0;
}

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;

/** True when Windows "Transparency effects" is off. Re-checked on focus: the user comes back from Settings. */
function useTransparencyOff(): boolean {
  const [off, setOff] = useState(false);
  useEffect(() => {
    if (!isTauri()) return;
    const check = () => void transparencyEffectsOn().then((on) => setOff(on === false), () => setOff(false));
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);
  return off;
}

export function BackgroundScreen() {
  const { setup, updateSetup, imagePreviewUrl, setImagePreviewUrl } = useApp();
  const [error, setError] = useState<string | null>(null);
  const bg = setup.background;
  const transparencyOff = useTransparencyOff();

  const setBg = (patch: Partial<Setup["background"]>) => updateSetup({ background: { ...bg, ...patch } });

  async function chooseImage() {
    setError(null);
    try {
      const path = await open({
        multiple: false,
        directory: false,
        filters: [{ name: t.background.imagesFilter, extensions: IMAGE_EXTENSIONS }],
      });
      if (typeof path !== "string") return; // cancelled
      const url = await readImageDataUrl(path);
      setImagePreviewUrl(url);
      setBg({
        image: path,
        // Defaults that keep the text readable; the user can change them right below.
        imageOpacity: bg.imageOpacity ?? 0.35,
        imageStretchMode: bg.imageStretchMode ?? "uniformToFill",
      });
    } catch (e) {
      setError(`${t.background.imageError} ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function removeImage() {
    setImagePreviewUrl(null);
    setBg({ image: undefined, imageOpacity: undefined, imageStretchMode: undefined });
  }

  return (
    <ScreenWithPreview
      title={t.background.title}
      subtitle={t.background.subtitle}
      next={{ label: t.background.next, screen: "prompt" }}
    >
      <div className="-mx-5 -mb-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 pb-5">
        <Panel title={t.background.transparency}>
          <SliderRow
            label={t.background.opacity}
            value={bg.opacity}
            min={0}
            max={100}
            unit=" %"
            hint={t.background.opacityHint}
            onChange={(opacity) => setBg({ opacity })}
          />
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-[13px] font-medium">{t.background.acrylic}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t.background.acrylicHint}</span>
            </span>
            <Switch checked={bg.useAcrylic} onCheckedChange={(useAcrylic) => setBg({ useAcrylic })} />
          </label>
          {transparencyOff && (bg.opacity < 100 || bg.useAcrylic) && (
            <Alert>
              <TriangleAlert />
              <AlertDescription>
                {t.background.transparencyOff}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => void openUrl("ms-settings:colors")}>
                  {t.background.transparencyOpen}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </Panel>

        <Panel title={t.background.image}>
          {!bg.image ? (
            <button
              type="button"
              onClick={() => void chooseImage()}
              disabled={!isTauri()}
              className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/15 px-4 py-7 text-center outline-none transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <ImagePlus className="size-6 text-primary-soft" strokeWidth={1.5} absoluteStrokeWidth />
              <span className="text-[13px] font-medium">{t.background.chooseImage}</span>
              <span className="text-xs text-muted-foreground">{t.background.chooseHint}</span>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div
                  className="size-16 shrink-0 rounded-lg bg-muted bg-cover bg-center outline outline-1 -outline-offset-1 outline-white/10"
                  style={imagePreviewUrl ? { backgroundImage: `url("${imagePreviewUrl}")` } : undefined}
                />
                <span className="min-w-0 flex-1 truncate text-[13px]" title={bg.image}>
                  {fileName(bg.image)}
                </span>
                <Button variant="secondary" size="sm" onClick={() => void chooseImage()}>
                  {t.background.change}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={removeImage} aria-label={t.background.remove}>
                  <Trash2 />
                </Button>
              </div>
              <SliderRow
                label={t.background.imageOpacity}
                value={Math.round((bg.imageOpacity ?? 1) * 100)}
                min={0}
                max={100}
                unit=" %"
                hint={t.background.imageOpacityHint}
                onChange={(v) => setBg({ imageOpacity: v / 100 })}
              />
              <div>
                <div className="mb-2 text-[13px] font-medium">{t.background.stretch}</div>
                <div className="segmented">
                  {STRETCH_ORDER.map(
                    (mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setBg({ imageStretchMode: mode })}
                        aria-pressed={(bg.imageStretchMode ?? "uniformToFill") === mode}
                        className="segmented-item flex-1 px-2"
                      >
                        {t.stretchModes[mode]}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </>
          )}
          {error && (
            <Alert variant="destructive">
              <XCircle />
              <AlertDescription className="break-words">{error}</AlertDescription>
            </Alert>
          )}
        </Panel>

        <Panel title={t.background.layout}>
          <SliderRow
            label={t.background.padding}
            value={paddingValue(setup.padding)}
            min={0}
            max={32}
            unit=" px"
            onChange={(n) => updateSetup({ padding: String(n) })}
          />
        </Panel>
      </div>
    </ScreenWithPreview>
  );
}
