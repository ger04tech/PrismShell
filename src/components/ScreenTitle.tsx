/** Screen heading: colour icon, title and a blinking cursor in the shape the user picked. */
import { NAV } from "@/app/nav";
import { CursorMark } from "@/components/preview/TerminalPreview";
import { useApp } from "@/core/store";

export function ScreenTitle({ title, subtitle }: { title: string; subtitle: string }) {
  const screen = useApp((s) => s.screen);
  const cursor = useApp((s) => s.previewPatch?.cursorShape ?? s.setup.cursorShape);
  const Icon = NAV.find((n) => n.id === screen)?.titleIcon;

  return (
    <header>
      <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-[-0.02em]">
        {Icon && <Icon aria-hidden className="size-6 shrink-0" />}
        <span>
          {title}
          <CursorMark shape={cursor} color="var(--color-primary-soft)" className="ml-1" />
        </span>
      </h1>
      <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">{subtitle}</p>
    </header>
  );
}
