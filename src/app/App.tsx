import { useLayoutEffect, useRef, useState } from "react";
import logo from "@/assets/logo.png";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NAV } from "@/app/nav";
import { useApp, type ScreenId } from "@/core/store";
import { t } from "@/i18n/es";
import { ApplyScreen } from "@/screens/ApplyScreen";
import { BackgroundScreen } from "@/screens/BackgroundScreen";
import { FontScreen } from "@/screens/FontScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { PromptScreen } from "@/screens/PromptScreen";
import { ThemesScreen } from "@/screens/ThemesScreen";

const SWATCHES = ["red", "green", "yellow", "blue", "purple", "cyan"] as const;

// Icon side gets 2px less padding so the pair looks centred.
const TAB = "flex h-full items-center gap-1.5 rounded-t-[10px] ps-3 pe-3.5 text-[13px] font-medium";

function Screen({ id }: { id: ScreenId }) {
  switch (id) {
    case "home":
      return <HomeScreen />;
    case "themes":
      return <ThemesScreen />;
    case "font":
      return <FontScreen />;
    case "background":
      return <BackgroundScreen />;
    case "prompt":
      return <PromptScreen />;
    case "apply":
      return <ApplyScreen />;
  }
}

/**
 * Folder-style tabs: the active tab is a piece of the page background that rises into the coloured
 * header, with concave corners at its foot (see `nav-tab` in index.css). It slides between tabs.
 */
function TopNav() {
  const screen = useApp((s) => s.screen);
  const goTo = useApp((s) => s.goTo);
  const tabRefs = useRef<Partial<Record<ScreenId, HTMLButtonElement | null>>>({});
  // Null until measured: the tab mounts already in place, so it does not slide in on start.
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const tab = tabRefs.current[screen];
      if (tab) setBox({ left: tab.offsetLeft, width: tab.offsetWidth });
    };
    update();
    // Webfont load changes tab widths.
    void document.fonts?.ready.then(update);
  }, [screen]);

  return (
    <nav className="relative self-stretch pt-2">
      {box && <div aria-hidden className="nav-tab absolute top-2 bottom-0" style={box} />}
      <div className="relative flex h-full items-end gap-1">
        {NAV.map((item) => {
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[item.id] = el;
              }}
              type="button"
              onClick={() => goTo(item.id)}
              aria-current={active ? "page" : undefined}
              className={`${TAB} outline-none transition-[color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-[0.97] ${
                active ? "text-foreground" : "text-white/65 hover:text-white"
              }`}
            >
              <item.icon aria-hidden className="size-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function App() {
  const scheme = useApp((s) => s.setup.scheme);
  const screen = useApp((s) => s.screen);

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <header className="flex h-13 shrink-0 items-center gap-6 nav-glass px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="size-8" />
            <span className="prism-text text-[20px] font-extrabold tracking-[-0.02em]">{t.app.name}</span>
          </div>

          <TopNav />

          {/* What is selected right now, visible from every screen. */}
          <div className="ml-auto flex min-w-0 items-center gap-2.5 text-[13px] font-medium text-white/90">
            <span className="flex shrink-0 gap-[3px] rounded-md p-[5px] surface" style={{ background: scheme.background }}>
              {SWATCHES.map((k) => (
                <span key={k} className="size-2 rounded-full" style={{ background: scheme[k] }} />
              ))}
            </span>
            <span className="truncate">{scheme.name}</span>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Screen id={screen} />
        </main>
      </div>
    </TooltipProvider>
  );
}
