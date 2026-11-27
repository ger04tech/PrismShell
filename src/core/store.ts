/** One store for the Setup being edited, plus what we detected on the PC. */
import { create } from "zustand";
import { DEFAULT_FONT } from "@/data/fonts";
import { findScheme, SCHEMES } from "@/data/schemes";
import { newSession, type Session } from "./backup";
import type { Detection } from "./detect";
import type { Setup } from "./setup";

export const DEFAULT_SETUP: Setup = {
  version: 2,
  name: "Mi setup",
  scheme: findScheme("TokyoNight Night") ?? SCHEMES[0],
  font: { face: DEFAULT_FONT.face, size: 12, weight: "normal", nerdFontId: DEFAULT_FONT.id },
  background: { opacity: 90, useAcrylic: true },
  cursorShape: "bar",
  padding: "8, 8, 8, 8",
  prompt: { engine: "oh-my-posh", theme: "atomic" },
  welcome: true,
};

export type ScreenId = "home" | "themes" | "font" | "background" | "prompt" | "apply";

interface AppState {
  screen: ScreenId;
  setup: Setup;
  detection: Detection | null;
  /** settings.json the user chose to customize. */
  settingsPath: string | null;
  session: Session;
  /** `data:` URL of setup.background.image, only for the preview. */
  imagePreviewUrl: string | null;
  /** Which PowerShell profiles get the Oh My Posh block when applying. */
  promptShells: { pwsh: boolean; powershell: boolean };
  setPromptShells(patch: Partial<AppState["promptShells"]>): void;
  /** Temporary changes shown only in the preview while hovering an option (never applied). */
  previewPatch: Partial<Setup> | null;
  setPreviewPatch(patch: Partial<Setup> | null): void;
  /** When the last successful "Aplicar" happened (Date.now()), for the preview's celebration. */
  lastApplyAt: number | null;
  setLastApplyAt(at: number | null): void;
  /** Replaces the whole Setup (e.g. a ready-made one) and drops the background image preview. */
  loadSetup(setup: Setup): void;

  goTo(screen: ScreenId): void;
  setImagePreviewUrl(url: string | null): void;
  updateSetup(patch: Partial<Setup>): void;
  setDetection(d: Detection): void;
  /** Updates part of the detection (e.g. fonts after installing one). No-op before the first detection. */
  patchDetection(patch: Partial<Detection>): void;
  setSettingsPath(path: string): void;
}

export const useApp = create<AppState>((set) => ({
  screen: "home",
  setup: DEFAULT_SETUP,
  detection: null,
  settingsPath: null,
  session: newSession(),
  imagePreviewUrl: null,
  promptShells: { pwsh: true, powershell: true },
  setPromptShells: (patch) => set((s) => ({ promptShells: { ...s.promptShells, ...patch } })),
  previewPatch: null,
  setPreviewPatch: (previewPatch) => set({ previewPatch }),
  lastApplyAt: null,
  setLastApplyAt: (lastApplyAt) => set({ lastApplyAt }),
  loadSetup: (setup) => set({ setup, imagePreviewUrl: null, previewPatch: null }),

  goTo: (screen) => set({ screen, previewPatch: null }),
  setImagePreviewUrl: (imagePreviewUrl) => set({ imagePreviewUrl }),
  updateSetup: (patch) => set((s) => ({ setup: { ...s.setup, ...patch } })),
  setDetection: (detection) =>
    set((s) => ({
      detection,
      // Keep the user's choice if it still exists; otherwise pick the first one found.
      settingsPath: detection.terminals.some((t) => t.settingsPath === s.settingsPath)
        ? s.settingsPath
        : (detection.terminals[0]?.settingsPath ?? null),
    })),
  patchDetection: (patch) => set((s) => (s.detection ? { detection: { ...s.detection, ...patch } } : {})),
  setSettingsPath: (settingsPath) => set({ settingsPath }),
}));
