/**
 * Shared layout for the customization screens: the terminal preview stays fixed on the left,
 * the screen's controls live in their own panel on the right.
 */
import { ArrowRight, Info } from "lucide-react";
import type { ReactNode } from "react";
import { TerminalPreview } from "@/components/preview/TerminalPreview";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Button } from "@/components/ui/button";
import { useApp, type ScreenId } from "@/core/store";
import { isFontInstalled } from "@/data/fonts";
import { t } from "@/i18n/es";

interface Props {
  title: string;
  subtitle: string;
  next?: { label: string; screen: ScreenId };
  /** Small print under the preview, left of the "next" button (credits, notes). */
  footerNote?: ReactNode;
  /** Content of the right panel. It should handle its own scrolling area if it is long. */
  children: ReactNode;
}

export function ScreenWithPreview({ title, subtitle, next, footerNote, children }: Props) {
  const { setup: chosen, previewPatch, detection, goTo, imagePreviewUrl, screen, lastApplyAt } = useApp();
  // While hovering an option, the preview shows it on top of what is chosen.
  const setup = previewPatch ? { ...chosen, ...previewPatch } : chosen;
  // Unknown until detection ran (e.g. in the browser): assume installed to avoid a false warning.
  const fontInstalled = detection ? isFontInstalled(setup.font.face, detection.installedFonts) : true;

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-8 pb-6 pt-7">
        <ScreenTitle title={title} subtitle={subtitle} />

        <div className="flex max-h-[680px] min-h-0 flex-1 flex-col">
          <TerminalPreview
            setup={setup}
            imageUrl={setup.background.image ? imagePreviewUrl : null}
            fontInstalled={fontInstalled}
            celebrateAt={screen === "apply" ? lastApplyAt : null}
            className="flex-1"
          />
          {!fontInstalled && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-px size-3.5 shrink-0" />
              {t.themes.fontMissing(setup.font.face)}
            </p>
          )}
        </div>

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">{footerNote}</div>
          {next && (
            <Button className="h-10 gap-2 rounded-lg ps-4 pe-3.5 text-sm font-semibold" onClick={() => goTo(next.screen)}>
              {next.label}
              <ArrowRight strokeWidth={2} absoluteStrokeWidth />
            </Button>
          )}
        </footer>
      </section>

      <aside className="flex w-[42%] min-w-[340px] max-w-[600px] shrink-0 flex-col gap-4 border-l bg-panel px-5 py-5">
        {children}
      </aside>
    </div>
  );
}
