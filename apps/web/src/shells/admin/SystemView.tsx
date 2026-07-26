import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderSVG } from "uqr";
import { Button } from "@stagesync/ui";
import {
  MetricGrid,
  NetworkUrlList,
  QrWrap,
} from "../shared/index.js";
import {
  clearHostLogs,
  downloadDiagnosticsExport,
  fetchNetworkInfo,
  fetchMidiHostStatus,
  fetchHostUpdateStatus,
  fetchSafetyNetStatus,
  pickPrimaryJoinUrl,
  networkDisplayUrls,
  apkDownloadUrlsFromJoin,
  probeApkAvailable,
  postApplyHostUpdate,
  postSafetyNetPromote,
  type HostLogLine,
  type NetworkInfo,
  type HostUpdateStatus,
  type MidiHostStatus,
  type SafetyNetStatus,
} from "../../lib/setlistApi.js";
import {
  canUseDesktopUpdater,
  checkDesktopUpdate,
  installDesktopUpdate,
  openExternalUrl,
  formatUnknownError,
  type DesktopUpdateInfo,
} from "../../lib/desktopBridge.js";
import {
  DOCS_INSTALL_URL,
  DOCS_ISSUES_URL,
  DOCS_RELEASES_URL,
} from "../../lib/docsLinks.js";
import { APP_VERSION } from "../../lib/appVersion.js";
import { useMqMobile } from "../../lib/useMqMobile.js";
import { ShellConfirmDialog } from "../ShellBlockingDialog.js";
import shell from "../AdminShell.module.css";
import { AdminAccordionCard } from "./AdminAccordionCard.js";
import styles from "./SystemView.module.css";

export type SystemViewProps = {
  statusMsg: string | null;
  autoCheckUpdate?: boolean;
  onAutoCheckUpdateConsumed?: () => void;
};

type HostCardId = "network" | "about" | "logs" | "midi";

/** Admin Host — two-column content-height layout (Sieć+APK | Logi / About | MIDI). */
export function SystemView({
  statusMsg,
  autoCheckUpdate = false,
  onAutoCheckUpdateConsumed,
}: SystemViewProps) {
  const mobile = useMqMobile();
  const [openCard, setOpenCard] = useState<HostCardId>("network");
  const [lines, setLines] = useState<HostLogLine[]>([]);
  const [paused, setPaused] = useState(false);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [performerApkUrl, setPerformerApkUrl] = useState<string | null>(null);
  const [consoleApkUrl, setConsoleApkUrl] = useState<string | null>(null);
  const [performerApkReady, setPerformerApkReady] = useState(false);
  const [consoleApkReady, setConsoleApkReady] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [midi, setMidi] = useState<MidiHostStatus | null>(null);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [safety, setSafety] = useState<SafetyNetStatus | null>(null);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [diagBusy, setDiagBusy] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!copiedUrl) return;
    const t = window.setTimeout(() => setCopiedUrl(null), 2000);
    return () => window.clearTimeout(t);
  }, [copiedUrl]);

  const refreshMidi = useCallback(async () => {
    try {
      const status = await fetchMidiHostStatus();
      setMidi(status);
      setMidiError(null);
    } catch (err) {
      setMidiError(err instanceof Error ? err.message : "Błąd MIDI");
    }
  }, []);

  const refreshSafety = useCallback(async () => {
    try {
      const s = await fetchSafetyNetStatus();
      setSafety(s);
      setSafetyError(null);
    } catch (err) {
      setSafetyError(
        err instanceof Error ? err.message : "Błąd Safety Net",
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const n = await fetchNetworkInfo();
        if (cancelled) return;
        setNetwork(n);
        const join = pickPrimaryJoinUrl(n);
        const apkUrls = join ? apkDownloadUrlsFromJoin(join) : null;
        if (!apkUrls) {
          setPerformerApkUrl(null);
          setConsoleApkUrl(null);
          setPerformerApkReady(false);
          setConsoleApkReady(false);
          return;
        }
        setPerformerApkUrl(apkUrls.performer);
        setConsoleApkUrl(apkUrls.console);
        const [perfOk, consOk] = await Promise.all([
          probeApkAvailable(apkUrls.performer),
          probeApkAvailable(apkUrls.console),
        ]);
        if (cancelled) return;
        setPerformerApkReady(perfOk);
        setConsoleApkReady(consOk);
      } catch (err) {
        if (!cancelled) {
          setNetworkError(err instanceof Error ? err.message : "Błąd sieci");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshMidi();
    const id = window.setInterval(() => {
      void refreshMidi();
    }, 1000);
    return () => window.clearInterval(id);
  }, [refreshMidi]);

  useEffect(() => {
    void refreshSafety();
  }, [refreshSafety]);

  useEffect(() => {
    const es = new EventSource("/api/system/logs/stream");
    es.onmessage = (ev) => {
      if (pausedRef.current) return;
      try {
        const line = JSON.parse(ev.data) as HostLogLine;
        setLines((prev) => [...prev.slice(-199), line]);
      } catch {
        /* ignore */
      }
    };
    es.addEventListener("clear", () => {
      if (!pausedRef.current) setLines([]);
    });
    return () => es.close();
  }, []);

  const primaryUrl = network ? pickPrimaryJoinUrl(network) : null;

  const qrSvg = useMemo(() => {
    if (!primaryUrl) return null;
    try {
      return renderSVG(primaryUrl, {
        ecc: "M",
        border: 1,
        pixelSize: 3,
      });
    } catch {
      return null;
    }
  }, [primaryUrl]);

  const rateLabel = (n: number | undefined) =>
    n == null ? "—" : String(Math.round(n));

  const midiInLabel = (() => {
    if (!midi) return "—";
    const name =
      midi.inputs.find((p) => p.id === midi.config.inputId)?.name ??
      midi.config.inputId ??
      "—";
    if (!midi.config.inputId) return name;
    const ch =
      midi.config.inputChannel == null
        ? "Omni"
        : `Kanał ${midi.config.inputChannel + 1}`;
    return `${name} (${ch})`;
  })();

  const midiOutLabel = (() => {
    if (!midi) return "—";
    const name =
      midi.outputs.find((p) => p.id === midi.config.outputId)?.name ??
      midi.config.outputId ??
      "—";
    if (!midi.config.outputId) return name;
    const ch = `Kanał ${(midi.config.outputChannel ?? 0) + 1}`;
    return `${name} (${ch})`;
  })();

  return (
    <div
      className={mobile ? shell.accordionStack : styles.root}
      data-host-mobile={mobile ? "1" : undefined}
    >
      <div className={mobile ? shell.accordionFlatten : styles.column}>
        <AdminAccordionCard
          id="network"
          title="Połączenie & Sieć"
          ariaLabel="Połączenie i sieć"
          mobile={mobile}
          openId={openCard}
          onOpen={setOpenCard}
          className={styles.card}
          bodyClassName={styles.cardBody}
        >
            <div className={styles.networkMain}>
              {networkError ? (
                <p className={shell.error} role="alert">
                  {networkError}
                </p>
              ) : null}
              {network ? (
                <div className={styles.networkRow}>
                  <div className={styles.networkMeta}>
                    <p className={shell.muted}>
                      Port <strong>{network.port}</strong> · {network.hostname} ·
                      v{network.version}
                    </p>
                    {primaryUrl && qrSvg ? (
                      <p className={shell.muted}>
                        <strong>Dołącz do hosta</strong> — zeskanuj QR w tej
                        samej sieci LAN.
                      </p>
                    ) : null}
                    <NetworkUrlList
                      urls={networkDisplayUrls(network).map((u) => ({
                        url: u,
                        action: (
                          <Button
                            variant="ghost"
                            onClick={() => {
                              void (async () => {
                                try {
                                  await navigator.clipboard.writeText(u);
                                  setCopiedUrl(u);
                                  setNetworkError(null);
                                } catch {
                                  setCopiedUrl(null);
                                  setNetworkError(
                                    "Nie udało się skopiować URL",
                                  );
                                }
                              })();
                            }}
                          >
                            {copiedUrl === u ? "Skopiowano" : "Kopiuj"}
                          </Button>
                        ),
                      }))}
                    />
                    {statusMsg ? (
                      <p className={shell.muted} role="status">
                        {statusMsg}
                      </p>
                    ) : null}
                  </div>
                  {primaryUrl && qrSvg ? (
                    <div className={styles.qrSlot}>
                      <QrWrap
                        svg={qrSvg}
                        aria-label={`Kod QR dołączenia: ${primaryUrl}`}
                      />
                    </div>
                  ) : null}
                </div>
              ) : networkError ? null : (
                <p className={shell.muted}>Wczytywanie…</p>
              )}
            </div>

            <div
              className={styles.apkTiles}
              aria-label="Pobieranie aplikacji Android"
            >
              <ApkTile
                title="StageSync Performer"
                ready={performerApkReady}
                apkUrl={performerApkUrl}
              />
              <ApkTile
                title="StageSync Console"
                ready={consoleApkReady}
                apkUrl={consoleApkUrl}
              />
            </div>
        </AdminAccordionCard>

        <AdminAccordionCard
          id="about"
          title="O Aplikacji & Aktualizacje"
          ariaLabel="O aplikacji i aktualizacje"
          mobile={mobile}
          openId={openCard}
          onOpen={setOpenCard}
          className={styles.card}
          bodyClassName={styles.cardBody}
        >
            <div className={styles.aboutBody}>
              <p className={shell.muted}>
                Wersja <strong>{APP_VERSION}</strong>
              </p>
              <div className={shell.actions}>
                <Button
                  variant="ghost"
                  onClick={() => void openExternalUrl(DOCS_INSTALL_URL)}
                >
                  Dokumentacja ↗
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void openExternalUrl(DOCS_ISSUES_URL)}
                >
                  Zgłoś błąd ↗
                </Button>
              </div>
              <UpdatePanel
                autoCheck={autoCheckUpdate}
                onAutoCheckConsumed={onAutoCheckUpdateConsumed}
              />
            </div>
        </AdminAccordionCard>
      </div>

      <div className={mobile ? shell.accordionFlatten : styles.column}>
        <AdminAccordionCard
          id="logs"
          title="Logi serwera"
          ariaLabel="Logi serwera"
          mobile={mobile}
          openId={openCard}
          onOpen={setOpenCard}
          className={styles.card}
          headMeta={<span className={shell.muted}>{lines.length}</span>}
          bodyClassName={styles.cardBodyFill}
        >
            {diagError ? (
              <p className={`${shell.error} ${styles.logError}`} role="alert">
                {diagError}
              </p>
            ) : null}
            <pre
              id="host-log-terminal"
              className={styles.logTerminal}
              aria-live="polite"
            >
              {lines.length === 0
                ? "Oczekiwanie na logi…"
                : lines
                    .map(
                      (l) =>
                        `${new Date(l.t).toISOString().slice(11, 19)} [${l.level}] ${l.msg}`,
                    )
                    .join("\n")}
            </pre>
            <div className={styles.logActions}>
              <Button
                variant="ghost"
                selected={paused}
                aria-pressed={paused}
                aria-label={
                  paused ? "Wznów logi na żywo" : "Wstrzymaj logi na żywo"
                }
                onClick={() => setPaused((v) => !v)}
              >
                {paused ? "Wznów" : "Pauza"}
              </Button>
              <Button
                variant="ghost"
                aria-label="Wyczyść logi hosta"
                onClick={() => {
                  void (async () => {
                    try {
                      await clearHostLogs();
                      setLines([]);
                    } catch {
                      /* ignore */
                    }
                  })();
                }}
              >
                Wyczyść
              </Button>
              <Button
                variant="ghost"
                loading={diagBusy}
                aria-label="Pobierz paczkę diagnostyki ZIP"
                onClick={() => {
                  void (async () => {
                    setDiagBusy(true);
                    setDiagError(null);
                    try {
                      await downloadDiagnosticsExport();
                    } catch (err) {
                      setDiagError(
                        err instanceof Error
                          ? err.message
                          : "Eksport diagnostyki nieudany",
                      );
                    } finally {
                      setDiagBusy(false);
                    }
                  })();
                }}
              >
                Pobierz (.zip)
              </Button>
            </div>
        </AdminAccordionCard>

        <AdminAccordionCard
          id="midi"
          title="MIDI & Safety Net"
          ariaLabel="MIDI i Safety Net"
          mobile={mobile}
          openId={openCard}
          onOpen={setOpenCard}
          className={styles.card}
          bodyClassName={styles.cardBody}
        >
            <div className={styles.midiStack}>
              <div aria-label="Safety Net">
                <p className={styles.sectionLabel}>Safety Net</p>
                {safetyError ? (
                  <p className={shell.error} role="alert">
                    {safetyError}
                  </p>
                ) : null}
                {safety ? (
                  <>
                    <p className={shell.muted}>
                      Rola:{" "}
                      <strong>
                        {safety.role === "master" ? "Master" : "Spare"}
                      </strong>
                      {safety.midiOutAllowed
                        ? " — MIDI OUT dozwolony"
                        : " — MIDI OUT wyciszony"}
                    </p>
                    {safety.role === "spare" ? (
                      <Button
                        variant="primary"
                        disabled={safetyBusy}
                        onClick={() => {
                          setSafetyBusy(true);
                          void postSafetyNetPromote()
                            .then((s) => {
                              setSafety(s);
                              setSafetyError(null);
                            })
                            .catch((err) => {
                              setSafetyError(
                                err instanceof Error
                                  ? err.message
                                  : "Promote nieudany",
                              );
                            })
                            .finally(() => setSafetyBusy(false));
                        }}
                      >
                        {safetyBusy ? "Przejmowanie…" : "Przejmij (Master)"}
                      </Button>
                    ) : (
                      <p className={shell.muted}>
                        Host jest Masterem. Spare ustawiasz przez{" "}
                        <code>STAGESYNC_SAFETY_ROLE=spare</code>.
                      </p>
                    )}
                  </>
                ) : !safetyError ? (
                  <p className={shell.muted}>Ładowanie…</p>
                ) : null}
              </div>

              <div className={styles.sectionSplit} aria-label="Telemetria MIDI">
                <p className={styles.sectionLabel}>Telemetria MIDI</p>
                <div className={styles.midiBody}>
                  {midiError ? (
                    <p className={shell.error} role="alert">
                      {midiError}
                    </p>
                  ) : null}
                  {midi ? (
                    <>
                      {midi.clockOutActive || midi.lastError ? (
                        <p className={shell.muted}>
                          {[
                            midi.clockOutActive ? "clock OUT aktywny" : null,
                            midi.lastError || null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                      <MetricGrid
                        aria-label="Metryki MIDI"
                        items={[
                          {
                            label: "Clock/s",
                            value: rateLabel(midi.rates.clockPerSec),
                          },
                          {
                            label: "SPP/s",
                            value: rateLabel(midi.rates.sppPerSec),
                          },
                          {
                            label: "PC/s",
                            value: rateLabel(midi.rates.pcPerSec),
                          },
                          {
                            label: "Beat→WS",
                            value: rateLabel(midi.rates.beatToWsPerSec),
                          },
                        ]}
                      />
                      <div className={styles.midiPorts}>
                        <div
                          className={styles.midiPortRow}
                          role="group"
                          aria-label={`MIDI In: ${midiInLabel}`}
                        >
                          <span className={styles.midiLabel}>Wejście</span>
                          <span
                            className={styles.midiPortValue}
                            title={midiInLabel}
                          >
                            {midiInLabel}
                          </span>
                        </div>
                        <div
                          className={styles.midiPortRow}
                          role="group"
                          aria-label={`MIDI Out: ${midiOutLabel}`}
                        >
                          <span className={styles.midiLabel}>Wyjście</span>
                          <span
                            className={styles.midiPortValue}
                            title={midiOutLabel}
                          >
                            {midiOutLabel}
                          </span>
                        </div>
                        <div
                          className={styles.midiPortRow}
                          role="group"
                          aria-label={
                            midi.config.clockOutEnabled
                              ? "Clock OUT: włączony"
                              : "Clock OUT: wyłączony"
                          }
                        >
                          <span className={styles.midiLabel}>Clock OUT</span>
                          <span className={styles.midiPortValue}>
                            {midi.config.clockOutEnabled
                              ? "włączony"
                              : "wyłączony"}
                          </span>
                        </div>
                      </div>
                      {!midi.available ? (
                        <p className={shell.muted}>
                          Brak natywnego MIDI w tym środowisku (Docker / CI).
                          Desktop sidecar ładuje urządzenia hosta.
                        </p>
                      ) : null}
                    </>
                  ) : midiError ? null : (
                    <p className={shell.muted}>Wczytywanie…</p>
                  )}
                </div>
              </div>
            </div>
        </AdminAccordionCard>
      </div>
    </div>
  );
}

function ApkTile({
  title,
  ready,
  apkUrl,
}: {
  title: string;
  ready: boolean;
  apkUrl: string | null;
}) {
  return (
    <div className={styles.apkTile}>
      <h3 className={styles.apkTitle}>{title}</h3>
      <p className={styles.apkStatus}>
        {ready ? "APK dostępne na hoście" : "Brak APK w tej instalacji"}
      </p>
      <div className={styles.apkActions}>
        {ready && apkUrl ? (
          <Button
            variant="secondary"
            aria-label={`Pobierz APK ${title}`}
            onClick={() => void openExternalUrl(apkUrl)}
          >
            Pobierz APK
          </Button>
        ) : null}
        <Button
          variant="ghost"
          aria-label={`Releases — ${title}`}
          onClick={() => void openExternalUrl(DOCS_RELEASES_URL)}
        >
          Releases ↗
        </Button>
      </div>
    </div>
  );
}

/** Update panel — Sprawdź / Aktualizuj host + desktop (ADR 0004 amendement β1). */
function UpdatePanel({
  autoCheck = false,
  onAutoCheckConsumed,
}: {
  autoCheck?: boolean;
  onAutoCheckConsumed?: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [hostStatus, setHostStatus] = useState<HostUpdateStatus | null>(null);
  const [desktopStatus, setDesktopStatus] = useState<DesktopUpdateInfo | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [confirmHostUpdate, setConfirmHostUpdate] = useState(false);
  const [confirmDesktopUpdate, setConfirmDesktopUpdate] = useState(false);
  // Require real Tauri IPC — Android Console on :4000 matches isDesktopShell() without invoke.
  const inTauri = canUseDesktopUpdater();

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setError(null);
    setHostStatus(null);
    setDesktopStatus(null);
    setDone(false);
    try {
      // Desktop: only the app version / Tauri updater — host/Watchtower is Docker-only.
      if (inTauri) {
        try {
          setDesktopStatus(await checkDesktopUpdate());
        } catch (e) {
          setError(`Aplikacja: ${formatUnknownError(e)}`);
        }
        return;
      }
      try {
        const host = await fetchHostUpdateStatus();
        setHostStatus(host);
        if (host.error) setError(`Host: ${host.error}`);
      } catch (e) {
        setError(`Host: ${formatUnknownError(e)}`);
      }
    } finally {
      setChecking(false);
    }
  }, [inTauri]);

  useEffect(() => {
    if (!autoCheck) return;
    let cancelled = false;
    void handleCheck().finally(() => {
      if (!cancelled) onAutoCheckConsumed?.();
    });
    return () => {
      cancelled = true;
    };
    // Intentional: run once when native menu requests a check (autoCheck rising edge).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onAutoCheckConsumed is unstable identity from parent
  }, [autoCheck, handleCheck]);

  const handleApplyHost = useCallback(async () => {
    setApplying(true);
    setError(null);
    try {
      await postApplyHostUpdate();
      setDone(true);
    } catch (e) {
      setError(formatUnknownError(e));
    } finally {
      setApplying(false);
    }
  }, []);

  const handleApplyDesktop = useCallback(async () => {
    setApplying(true);
    setError(null);
    try {
      await installDesktopUpdate();
    } catch (e) {
      setError(formatUnknownError(e));
      setApplying(false);
    }
  }, []);

  return (
    <div className={styles.updateBlock}>
      <div className={styles.updateRow}>
        <Button
          variant="secondary"
          onClick={handleCheck}
          disabled={checking || applying}
        >
          {checking ? "Sprawdzam…" : "Sprawdź aktualizacje"}
        </Button>
        <span className={shell.muted}>Kanał: oficjalne</span>
      </div>
      {error ? (
        <p className={styles.updateError} role="alert">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className={shell.muted}>
          Aktualizacja hosta uruchomiona — połączenie wróci za chwilę.
        </p>
      ) : null}
      {!inTauri && hostStatus ? (
        <div className={styles.updateRow}>
          <span className={shell.muted}>
            Host: {hostStatus.current} → {hostStatus.latest ?? "?"}{" "}
            {!hostStatus.updateAvailable && hostStatus.latest && "(aktualny)"}
          </span>
          {hostStatus.updateAvailable ? (
            <Button
              variant="primary"
              onClick={() => setConfirmHostUpdate(true)}
              disabled={applying}
            >
              {applying ? "Aktualizuję…" : "Aktualizuj host"}
            </Button>
          ) : null}
        </div>
      ) : null}
      {inTauri && desktopStatus ? (
        <div className={styles.updateRow}>
          <span className={shell.muted}>
            {desktopStatus.available ? (
              <>
                Aplikacja: {desktopStatus.current} →{" "}
                {desktopStatus.version ?? "?"}
              </>
            ) : (
              <>Aplikacja: {desktopStatus.current} (aktualna)</>
            )}
          </span>
          {desktopStatus.available ? (
            <Button
              variant="primary"
              onClick={() => setConfirmDesktopUpdate(true)}
              disabled={applying}
            >
              {applying ? "Aktualizuję…" : "Aktualizuj aplikację"}
            </Button>
          ) : null}
        </div>
      ) : null}
      {!inTauri && hostStatus ? (
        <p className={shell.muted}>
          Desktop: pobierz instalator z{" "}
          <a
            href={DOCS_RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              e.preventDefault();
              void openExternalUrl(DOCS_RELEASES_URL);
            }}
          >
            Releases
          </a>
          .
        </p>
      ) : null}
      <ShellConfirmDialog
        open={confirmHostUpdate}
        title="Aktualizacja hosta"
        message="Aktualizacja hosta spowoduje ~30s przerwę połączenia WS. Kontynuować?"
        confirmLabel="Aktualizuj"
        onConfirm={() => {
          setConfirmHostUpdate(false);
          void handleApplyHost();
        }}
        onCancel={() => setConfirmHostUpdate(false)}
      />
      <ShellConfirmDialog
        open={confirmDesktopUpdate}
        title="Aktualizacja aplikacji"
        message="StageSync zostanie uruchomiony ponownie po aktualizacji. Zapisz niezapisane zmiany w projekcie przed kontynuacją. Kontynuować?"
        confirmLabel="Aktualizuj"
        onConfirm={() => {
          setConfirmDesktopUpdate(false);
          void handleApplyDesktop();
        }}
        onCancel={() => setConfirmDesktopUpdate(false)}
      />
    </div>
  );
}
