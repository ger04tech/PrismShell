import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { AlertTriangle, CheckCircle2, FolderOpen, Loader2, ShieldCheck, Sparkles, Undo2, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ScreenWithPreview } from "@/components/ScreenWithPreview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { applyEverything, type ApplyDeps, type ApplyReport, type ApplyStep, type Shell } from "@/core/applyAll";
import { undoChanges } from "@/core/backup";
import { useApp } from "@/core/store";
import { isFontInstalled } from "@/data/fonts";
import { OMP_THEME_URL, PROMPT_THEMES } from "@/data/prompts";
import { t } from "@/i18n/es";
import { isTauri, runTool, tauriFs } from "@/lib/tauri";

const SHELL_LABEL: Record<Shell, string> = { pwsh: t.prompt.pwsh, powershell: t.prompt.powershell };
const SWATCHES = ["red", "green", "yellow", "blue", "purple", "cyan"] as const;

async function toolLine(action: Parameters<typeof runTool>[0]): Promise<string | null> {
  const out = await runTool(action);
  return out.started && out.code === 0 ? out.stdout.split(/\r?\n/)[0]?.trim() ?? null : null;
}

/** The real side effects for applyEverything (tests use fakes instead). */
function realDeps(session: ApplyDeps["session"]): ApplyDeps {
  return {
    fs: tauriFs,
    session,
    profilePath: (shell) => toolLine({ kind: "profilePath", shell }),
    executionPolicy: async (shell) => {
      const out = await runTool({ kind: "executionPolicy", shell });
      return out.started && out.code === 0 ? out.stdout.trim() : null;
    },
    fetchText: async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`No se pudo descargar el tema (${res.status}).`);
      return res.text();
    },
  };
}

function Row({ label, children, warning }: { label: string; children: ReactNode; warning?: string }) {
  return (
    <div className="py-2.5">
      <div className="flex items-start gap-3">
        <span className="w-20 shrink-0 text-[13px] text-muted-foreground">{label}</span>
        <div className="min-w-0 flex-1 text-[13px]">{children}</div>
      </div>
      {warning && (
        <p className="ml-23 mt-1 flex items-start gap-1.5 text-xs text-amber-400">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          {warning}
        </p>
      )}
    </div>
  );
}

export function ApplyScreen() {
  const { setup, updateSetup, detection, settingsPath, session, promptShells, patchDetection, setLastApplyAt } = useApp();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<ApplyStep | null>(null);
  const [report, setReport] = useState<ApplyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [undone, setUndone] = useState(false);

  const terminal = detection?.terminals.find((x) => x.settingsPath === settingsPath);
  const fontOk = detection ? isFontInstalled(setup.font.face, detection.installedFonts) : true;
  const ompOk = Boolean(detection?.ohMyPosh);
  const shells = (Object.keys(promptShells) as Shell[]).filter(
    (s) => promptShells[s] && (s !== "pwsh" || !detection || detection.pwsh),
  );
  const theme = PROMPT_THEMES.find((p) => p.id === setup.prompt?.theme);
  const bg = setup.background;
  const padding = Number(setup.padding?.split(",")[0]) || 0;
  const canApply = isTauri() && Boolean(detection && settingsPath) && !busy;

  async function apply() {
    if (!detection || !settingsPath) return;
    setBusy(true);
    setError(null);
    setReport(null);
    setUndone(false);
    try {
      const result = await applyEverything(
        realDeps(session),
        {
          setup,
          settingsPath,
          fragmentDir: detection.paths.fragmentDir,
          appDir: detection.paths.appDir,
          shells,
          ohMyPosh: ompOk,
          themeUrl: OMP_THEME_URL,
        },
        setStep,
      );
      setReport(result);
      patchDetection({ applied: true });
      setLastApplyAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setStep(null);
    }
  }

  async function undo() {
    if (!detection) return;
    setBusy(true);
    setError(null);
    try {
      await undoChanges(tauriFs, session, { fragmentDir: detection.paths.fragmentDir, appDir: detection.paths.appDir });
      patchDetection({ applied: false });
      setLastApplyAt(null);
      setReport(null);
      setUndone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenWithPreview title={t.apply.title} subtitle={t.apply.subtitle}>
      <div className="-mx-5 -mb-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 pb-5">
        <section className="rounded-xl bg-card px-4 py-2 surface">
          <h2 className="pb-1 pt-2 text-[13px] font-semibold">{t.apply.summary}</h2>
          <div className="divide-y">
            <Row label={t.apply.terminal} warning={!terminal ? t.apply.noTerminal : undefined}>
              {terminal ? `Windows Terminal · ${t.channels[terminal.channel]}` : "—"}
            </Row>
            <Row label={t.apply.colors}>
              <div className="flex items-center gap-2">
                <span className="flex gap-[3px] rounded-md p-[5px] surface" style={{ background: setup.scheme.background }}>
                  {SWATCHES.map((k) => (
                    <span key={k} className="size-2 rounded-full" style={{ background: setup.scheme[k] }} />
                  ))}
                </span>
                {setup.scheme.name}
              </div>
            </Row>
            <Row label={t.apply.font} warning={!fontOk ? t.apply.fontNotInstalled : undefined}>
              {setup.font.face} · {setup.font.size}
              {" "}pt · {t.weights[setup.font.weight]} · {t.font.cursor.toLowerCase()} {t.cursors[setup.cursorShape].toLowerCase()}
            </Row>
            <Row label={t.apply.background}>
              {bg.opacity}
              {" "}%{bg.useAcrylic ? ` · ${t.apply.acrylicOn}` : ""} ·{" "}
              {bg.image ? (bg.image.split(/[\\/]/).pop() ?? "") : t.apply.noImage} · {t.apply.margin(padding)}
            </Row>
            <Row
              label={t.apply.prompt}
              warning={setup.prompt && !ompOk ? t.apply.ompMissing : undefined}
            >
              {setup.prompt
                ? `${theme?.label ?? setup.prompt.theme} · ${t.apply.shellsLabel(shells.map((s) => SHELL_LABEL[s]).join(" y ") || "—")}`
                : t.apply.off}
            </Row>
          </div>
        </section>

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-card p-4 surface">
          <span>
            <span className="block text-[13px] font-medium">{t.apply.welcome}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{t.apply.welcomeHint}</span>
          </span>
          <Switch checked={setup.welcome} onCheckedChange={(welcome) => updateSetup({ welcome })} />
        </label>

        <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
          <ShieldCheck className="mt-px size-4 shrink-0 text-emerald-500" />
          {t.apply.safety}
        </p>

        <Button
          className="h-11 shrink-0 gap-2 rounded-lg text-sm font-semibold"
          onClick={() => void apply()}
          disabled={!canApply}
        >
          {busy && step ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {busy && step ? t.apply.applying : t.apply.button}
        </Button>
        {busy && step && (
          <p className="flex items-center gap-2 px-1 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t.apply.steps[step]}
          </p>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle />
            <AlertTitle>{t.apply.failed}</AlertTitle>
            <AlertDescription className="whitespace-pre-line break-words">{error}</AlertDescription>
          </Alert>
        )}

        {undone && (
          <Alert>
            <CheckCircle2 />
            <AlertDescription>{t.apply.undoDone}</AlertDescription>
          </Alert>
        )}

        {report && (
          <section className="flex flex-col gap-3 rounded-xl bg-emerald-500/[0.07] p-4 outline outline-1 -outline-offset-1 outline-emerald-400/25">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-emerald-300">
              <CheckCircle2 className="size-5" />
              {report.settingsChanged || report.profiles.length > 0 ? t.apply.done : t.apply.noChanges}
            </p>
            <p className="text-[13px] text-muted-foreground">{t.apply.doneHint}</p>

            {report.backup && (
              <div className="text-[13px]">
                <div className="text-muted-foreground">{t.apply.backupAt}</div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-md bg-black/30 px-2 py-1 text-xs" title={report.backup}>
                    {report.backup}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void revealItemInDir(report.backup!)}
                  >
                    <FolderOpen /> {t.apply.openBackups}
                  </Button>
                </div>
              </div>
            )}

            {report.profiles.length > 0 && (
              <div className="text-[13px]">
                <div className="text-muted-foreground">{t.apply.profilesWritten}</div>
                <ul className="mt-1 list-inside list-disc">
                  {report.profiles.map((p) => (
                    <li key={p.path}>
                      {SHELL_LABEL[p.shell]}{" "}
                      <span className="font-mono text-xs text-muted-foreground" title={p.path}>
                        ({p.path.split(/[\\/]/).slice(-2).join("\\")})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.blockedShells.length > 0 && (
              <Alert>
                <AlertTriangle />
                <AlertDescription>
                  {t.apply.blocked(report.blockedShells.map((s) => SHELL_LABEL[s]).join(" y "))}
                  <code className="mt-1 block rounded-md bg-black/30 px-2 py-1 text-xs">{t.apply.blockedCommand}</code>
                </AlertDescription>
              </Alert>
            )}

            <Button variant="outline" className="self-start" onClick={() => void undo()} disabled={busy}>
              <Undo2 /> {t.apply.undo}
            </Button>
          </section>
        )}
      </div>
    </ScreenWithPreview>
  );
}
