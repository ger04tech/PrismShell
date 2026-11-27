import { openUrl } from "@tauri-apps/plugin-opener";
import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ScreenWithPreview } from "@/components/ScreenWithPreview";
import { Input } from "@/components/ui/input";
import type { ColorScheme } from "@/core/setup";
import { useApp } from "@/core/store";
import { isLightScheme, SCHEME_SOURCE, SCHEMES } from "@/data/schemes";
import { t } from "@/i18n/es";

type Filter = "all" | "dark" | "light";

const SWATCH_KEYS = ["red", "green", "yellow", "blue", "purple", "cyan"] as const;

function SchemeCard({
  scheme,
  selected,
  onSelect,
  onPreview,
}: {
  scheme: ColorScheme;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      aria-pressed={selected}
      className="relative overflow-hidden rounded-xl text-left surface-interactive"
    >
      {/* Mini terminal */}
      <div className="px-3 pb-3 pt-2.5 font-mono text-[11px] leading-snug" style={{ background: scheme.background }}>
        <div style={{ color: scheme.foreground }}>
          <span style={{ color: scheme.green }}>❯</span> ls <span style={{ color: scheme.blue }}>src/</span>
        </div>
        <div className="mt-2 flex gap-1">
          {SWATCH_KEYS.map((k) => (
            <span key={k} className="h-3.5 flex-1 rounded-full" style={{ background: scheme[k] }} />
          ))}
        </div>
      </div>
      <div className="flex min-h-[44px] items-center justify-between gap-2 bg-card px-3 py-2">
        <span className="line-clamp-2 text-[13px] font-medium leading-tight" title={scheme.name}>
          {scheme.name}
        </span>
        {selected && (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        )}
      </div>
    </button>
  );
}

export function ThemesScreen() {
  const { setup, updateSetup, setPreviewPatch } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SCHEMES.filter((s) => {
      if (filter === "dark" && isLightScheme(s)) return false;
      if (filter === "light" && !isLightScheme(s)) return false;
      return !q || s.name.toLowerCase().includes(q);
    });
  }, [query, filter]);

  return (
    <ScreenWithPreview
      title={t.themes.title}
      subtitle={t.themes.subtitle}
      next={{ label: t.themes.next, screen: "font" }}
      footerNote={
        <button
          type="button"
          onClick={() => void openUrl(SCHEME_SOURCE.url)}
          className="underline-offset-4 hover:underline"
        >
          {t.themes.credits}
        </button>
      }
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.themes.search}
          className="h-9 pl-9"
        />
      </div>
      <div className="flex items-center gap-3">
        <div className="segmented" role="tablist">
          {(["all", "dark", "light"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className="segmented-item"
            >
              {t.themes[f]}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[13px] tabular-nums text-muted-foreground">{t.themes.count(visible.length)}</span>
      </div>

      <div className="-mx-5 -mb-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-1">
        {visible.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">{t.themes.empty}</p>
        ) : (
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3"
            onMouseLeave={() => setPreviewPatch(null)}
            onBlur={() => setPreviewPatch(null)}
          >
            {visible.map((scheme) => (
              <SchemeCard
                key={scheme.name}
                scheme={scheme}
                selected={scheme.name === setup.scheme.name}
                onSelect={() => {
                  updateSetup({ scheme });
                  setPreviewPatch(null);
                }}
                onPreview={() => setPreviewPatch({ scheme })}
              />
            ))}
          </div>
        )}
      </div>
    </ScreenWithPreview>
  );
}
