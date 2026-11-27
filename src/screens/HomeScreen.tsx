import { openUrl } from "@tauri-apps/plugin-opener";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Download,
  ExternalLink,
  Loader2,
  MonitorCog,
  RefreshCw,
  RotateCcw,
  Undo2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PresetCard } from "@/components/PresetCard";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { restoreAll, undoChanges } from "@/core/backup";
import { detect } from "@/core/detect";
import { useApp } from "@/core/store";
import { isFontInstalled, NERD_FONTS } from "@/data/fonts";
import { PRESETS, presetSetup } from "@/data/presets";
import { t } from "@/i18n/es";
import { isTauri, tauriFs } from "@/lib/tauri";

const STORE_URL = "https://apps.microsoft.com/detail/9n0dx20hk701";

/** ok = installed · todo = the app can install it later · optional = nice to have · missing = needed. */
type Status = "ok" | "todo" | "optional" | "missing";

const STATUS_UI: Record<Status, { icon: ReactNode; badge: string; badgeClass: string }> = {
  ok: {
    icon: <CheckCircle2 className="mt-px size-[18px] shrink-0 text-emerald-500" />,
    badge: t.common.installed,
    badgeClass: "rounded-md bg-emerald-500/12 text-emerald-400",
  },
  todo: {
    icon: <Download className="mt-px size-[18px] shrink-0 text-primary-soft" />,
    badge: t.common.toInstall,
    badgeClass: "rounded-md bg-primary/15 text-primary-soft",
  },
  optional: {
    icon: <CircleDashed className="mt-px size-[18px] shrink-0 text-muted-foreground" />,
    badge: t.common.optional,
    badgeClass: "rounded-md bg-white/[0.07] text-muted-foreground",
  },
  missing: {
    icon: <AlertTriangle className="mt-px size-[18px] shrink-0 text-amber-400" />,
    badge: t.common.missing,
    badgeClass: "rounded-md bg-amber-400/12 text-amber-400",
  },
};

function StatusRow({ status, title, detail }: { status: Status; title: string; detail: string }) {
  const ui = STATUS_UI[status];
  return (
    <div className="flex items-start gap-3 py-3">
      {ui.icon}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium">{title}</span>
          <Badge className={ui.badgeClass}>{ui.badge}</Badge>
        </div>
        <p className="mt-0.5 break-words text-[13px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

/** "C:\Users\…\LocalState\settings.json" → "…\LocalState\settings.json"; full path on hover. */
function ShortPath({ path }: { path: string }) {
  const parts = path.split(/[\\/]/);
  const short = parts.length > 2 ? `…\\${parts.slice(-2).join("\\")}` : path;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default font-mono text-xs font-normal text-muted-foreground">{short}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-none font-mono text-xs">{path}</TooltipContent>
    </Tooltip>
  );
}

export function HomeScreen() {
  const { detection, settingsPath, session, setDetection, setSettingsPath, goTo, setup, loadSetup } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inTauri = isTauri();

  const refresh = useCallback(async () => {
    if (!isTauri()) return;
    setLoading(true);
    setError(null);
    try {
      setDetection(await detect());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [setDetection]);

  useEffect(() => {
    if (!detection) void refresh();
  }, [detection, refresh]);

  async function runRecovery(kind: "undo" | "restore") {
    if (!detection) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const loc = { fragmentDir: detection.paths.fragmentDir, appDir: detection.paths.appDir };
      if (kind === "undo") await undoChanges(tauriFs, session, loc);
      else await restoreAll(tauriFs, session, loc);
      setMessage(kind === "undo" ? t.home.undoDone : t.home.restoreDone);
      setDetection(await detect());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const nerdInstalled = detection ? NERD_FONTS.filter((f) => isFontInstalled(f.face, detection.installedFonts)) : [];
  const overrides = detection && settingsPath ? (detection.overrides[settingsPath] ?? []) : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-8 pb-10 pt-7">
      <div className="mb-2 flex items-end justify-between gap-4">
        <ScreenTitle title={t.home.title} subtitle={t.home.subtitle} />
        <Button variant="outline" onClick={refresh} disabled={loading || !inTauri}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          {loading ? t.home.checking : t.home.refresh}
        </Button>
      </div>

      {!inTauri && (
        <Alert>
          <AlertTriangle />
          <AlertDescription>{t.home.notInTauri}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <XCircle />
          <AlertTitle>{t.common.error}</AlertTitle>
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert>
          <CheckCircle2 />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {detection && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t.home.terminal}</CardTitle>
              {detection.terminals.length > 1 && <CardDescription>{t.home.terminalChoose}</CardDescription>}
            </CardHeader>
            <CardContent>
              {detection.terminals.length === 0 ? (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm">{t.home.terminalMissing}</p>
                  <p className="text-sm text-muted-foreground">{t.home.terminalInstall}</p>
                  <Button variant="outline" onClick={() => void openUrl(STORE_URL)}>
                    <ExternalLink /> {t.home.openStore}
                  </Button>
                </div>
              ) : detection.terminals.length === 1 ? (
                <div className="flex items-start gap-3">
                  <MonitorCog className="mt-px size-[18px] shrink-0 text-primary-soft" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium">{t.channels[detection.terminals[0].channel]}</span>
                    <ShortPath path={detection.terminals[0].settingsPath} />
                  </div>
                </div>
              ) : (
                <RadioGroup value={settingsPath ?? undefined} onValueChange={setSettingsPath} className="gap-3">
                  {detection.terminals.map((term) => (
                    <div key={term.settingsPath} className="flex items-start gap-3">
                      <RadioGroupItem value={term.settingsPath} id={term.settingsPath} className="mt-0.5" />
                      <Label htmlFor={term.settingsPath} className="flex flex-col items-start gap-0.5">
                        <span>{t.channels[term.channel]}</span>
                        <ShortPath path={term.settingsPath} />
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              {overrides.length > 0 && (
                <Alert className="mt-4">
                  <AlertTriangle />
                  <AlertTitle>{t.home.overrides}</AlertTitle>
                  <AlertDescription>
                    <ul className="list-inside list-disc">
                      {overrides.map((o) => (
                        <li key={o.name}>
                          <b>{o.name}</b>: <span className="font-mono text-xs">{o.keys.join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="divide-y py-1">
              <StatusRow
                status={detection.pwsh ? "ok" : "optional"}
                title={t.home.pwsh}
                detail={detection.pwsh ?? t.home.pwshMissing}
              />
              <StatusRow
                status={detection.ohMyPosh ? "ok" : "todo"}
                title={t.home.ohMyPosh}
                detail={detection.ohMyPosh ?? t.home.ohMyPoshMissing}
              />
              <StatusRow
                status={detection.winget ? "ok" : "missing"}
                title={t.home.winget}
                detail={detection.winget ?? t.home.wingetMissing}
              />
              <StatusRow
                status={nerdInstalled.length > 0 ? "ok" : "todo"}
                title={t.home.fonts}
                detail={
                  nerdInstalled.length > 0
                    ? `${t.home.fontsSome(nerdInstalled.length)}: ${nerdInstalled.map((f) => f.label).join(", ")}`
                    : t.home.fontsNone
                }
              />
            </CardContent>
          </Card>

          {detection.applied && (
            <Card>
              <CardHeader>
                <CardTitle>{t.home.applied}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void runRecovery("undo")} disabled={loading}>
                  <Undo2 /> {t.home.undo}
                </Button>
                <Button variant="destructive" onClick={() => void runRecovery("restore")} disabled={loading}>
                  <RotateCcw /> {t.home.restore}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="mt-2">
            <Button
              className="h-10 gap-2 rounded-lg ps-4 pe-3.5 text-sm font-semibold"
              onClick={() => goTo("themes")}
              disabled={detection.terminals.length === 0}
            >
              {t.home.start}
              <ArrowRight strokeWidth={2} absoluteStrokeWidth />
            </Button>
          </div>
        </>
      )}

      <section className="mt-6 flex flex-col gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{t.home.presetsTitle}</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{t.home.presetsSubtitle}</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {PRESETS.map((preset) => {
            const presetValue = presetSetup(preset);
            return (
              <PresetCard
                key={preset.id}
                preset={preset}
                setup={presetValue}
                fontInstalled={detection ? isFontInstalled(presetValue.font.face, detection.installedFonts) : false}
                selected={setup.name === preset.name}
                onSelect={() => {
                  loadSetup(presetValue);
                  goTo("themes");
                }}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
