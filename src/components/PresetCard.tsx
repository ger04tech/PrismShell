/** A ready-made setup on Home: tiny terminal over the sample wallpaper, in the preset's own colours and font. */
import { Check } from "lucide-react";
import { SAMPLE_WALLPAPER, withAlpha } from "@/components/preview/TerminalPreview";
import type { Setup } from "@/core/setup";
import { cssFontFamily } from "@/data/fonts";
import type { Preset } from "@/data/presets";
import { t } from "@/i18n/es";

interface Props {
  preset: Preset;
  setup: Setup;
  fontInstalled: boolean;
  selected: boolean;
  onSelect: () => void;
}

export function PresetCard({ preset, setup, fontInstalled, selected, onSelect }: Props) {
  const s = setup.scheme;
  const chip = "rounded-[3px] px-1.5 font-semibold";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={t.home.presetUse(preset.name)}
      className="flex flex-col overflow-hidden rounded-xl bg-card text-left surface-interactive"
    >
      {/* 8px inset: inner radius 4 + 8 = outer 12. */}
      <div className="w-full p-2" style={{ background: SAMPLE_WALLPAPER }}>
        <div
          className="rounded-[4px] px-2.5 py-2 text-[11px] leading-[1.5] shadow-lg shadow-black/30"
          style={{
            background: withAlpha(s.background, setup.background.opacity / 100),
            backdropFilter: setup.background.useAcrylic ? "blur(10px)" : undefined,
            color: s.foreground,
            fontFamily: cssFontFamily(setup.font.face, fontInstalled),
          }}
        >
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className={chip} style={{ background: s.blue, color: s.background }}>
              ana
            </span>
            <span className={chip} style={{ background: s.purple, color: s.background }}>
              ~\prism
            </span>
            <span style={{ color: s.green }}>❯</span> ls
          </div>
          <div className="flex gap-2.5 whitespace-nowrap">
            <span className="font-bold" style={{ color: s.blue }}>
              src/
            </span>
            <span style={{ color: s.green }}>build.ps1</span>
            <span style={{ color: s.red }}>app.zip</span>
          </div>
        </div>
      </div>
      <div className="flex w-full items-start justify-between gap-2 px-3 pb-3 pt-2.5">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold">{preset.name}</div>
          <div className="line-clamp-2 text-xs text-muted-foreground">{preset.description}</div>
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
