import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderSVG } from "uqr";
import { Button } from "@stagesync/ui";
import {
  clearHostLogs,
  downloadDiagnosticsExport,
  fetchNetworkInfo,
  fetchMidiHostStatus,
  fetchHostUpdateStatus,
  pickPrimaryJoinUrl,
  postApplyHostUpdate,
  type HostLogLine,
  type NetworkInfo,
  type HostUpdateStatus,
  type MidiHostStatus,
} from "../../lib/setlistApi.js";
import {
  isDesktopShell,
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
import { ShellConfirmDialog } from "../ShellBlockingDialog.js";
import shell from "../AdminShell.module.css";
import styles from "./SystemView.module.css";

export type SystemViewProps = {
  statusMsg: string | null;
  autoCheckUpdate?: boolean;
  onAutoCheckUpdateConsumed?: () => void;
};

/** Admin Host — network / MIDI telemetry / about + full-height log console. */
export function SystemView({
  statusMsg,
  autoCheckUpdate = false,
  onAutoCheckUpdateConsumed,
}: SystemViewProps) {
  const [lines, setLines] = useState<HostLogLine[]>([]);
  const [paused, setPaused] = useState(false);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [midi, setMidi] = useState<MidiHostStatus | null>(null);
  const [midiError, setMidiError] = useState<string | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const n = await fetchNetworkInfo();
        if (!cancelled) setNetwork(n);
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

  return (
    <div className={styles.root}>
      <div className={styles.left}>
        <section
          className={`${shell.card} ${styles.leftCard}`}
          aria-label="Sieć i szybkie połączenie"
        >
          <div className={shell.cardHead}>
            <h2 className={shell.cardTitle}>Sieć &amp; Szybkie Połączenie</h2>
          </div>
          <div className={`${shell.cardBody} ${styles.networkBody}`}>
            {networkError ? (
              <p className={shell.error} role="alert">
                {networkError}
              </p>
            ) : null}
            {network ? (
              <>
                <div className={styles.networkTop}>
                  <div className={styles.networkMeta}>
                    <p className={shell.muted}>
                      Port <strong>{network.port}</strong> · {network.hostname} ·
                      v{network.version}
                    </p>
                    {primaryUrl && qrSvg ? (
                      <p className={shell.muted}>
                        Zeskanuj QR telefonem / tabletem w tej samej sieci LAN.
                      </p>
                    ) : null}
                  </div>
                  {primaryUrl && qrSvg ? (
                    <div
                      className={styles.qrWrap}
                      aria-label={`Kod QR dla ${primaryUrl}`}
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  ) : null}
                </div>
                <ul className={styles.urlList} aria-label="Adresy sieciowe">
                  {network.urls.map((u) => (
                    <li key={u} className={shell.networkUrlRow}>
                      <span className={shell.songMeta}>{u}</span>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          void (async () => {
                            try {
                              await navigator.clipboard.writeText(u);
                              setCopiedUrl(u);
                            } catch {
                              setCopiedUrl(null);
                              setNetworkError("Nie udało się skopiować URL");
                            }
                          })();
                        }}
                      >
                        {copiedUrl === u ? "Skopiowano" : "Kopiuj"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            ) : networkError ? null : (
              <p className={shell.muted}>Wczytywanie…</p>
            )}
            {statusMsg ? (
              <p className={shell.muted} role="status">
                {statusMsg}
              </p>
            ) : null}
          </div>
        </section>

        <section
          className={`${shell.card} ${styles.leftCard}`}
          aria-label="Telemetria MIDI i Audio"
        >
          <div className={shell.cardHead}>
            <h2 className={shell.cardTitle}>Telemetria MIDI/Audio</h2>
          </div>
          <div className={`${shell.cardBody} ${shell.midiBody}`}>
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
                <div
                  className={shell.midiMeters}
                  role="group"
                  aria-label="Metryki MIDI"
                >
                  <div className={shell.midiMeter}>
                    <span className={shell.midiLabel}>Clock/s</span>
                    <span className={shell.midiValue}>
                      {rateLabel(midi.rates.clockPerSec)}
                    </span>
                  </div>
                  <div className={shell.midiMeter}>
                    <span className={shell.midiLabel}>SPP/s</span>
                    <span className={shell.midiValue}>
                      {rateLabel(midi.rates.sppPerSec)}
                    </span>
                  </div>
                  <div className={shell.midiMeter}>
                    <span className={shell.midiLabel}>PC/s</span>
                    <span className={shell.midiValue}>
                      {rateLabel(midi.rates.pcPerSec)}
                    </span>
                  </div>
                  <div className={shell.midiMeter}>
                    <span className={shell.midiLabel}>Beat→WS</span>
                    <span className={shell.midiValue}>
                      {rateLabel(midi.rates.beatToWsPerSec)}
                    </span>
                  </div>
                </div>
                <div className={shell.midiPorts}>
                  <div className={shell.midiPortRow}>
                    <span className={shell.midiLabel}>Wejście</span>
                    <span className={shell.midiPortValue}>
                      {midi.inputs.find((p) => p.id === midi.config.inputId)
                        ?.name ??
                        midi.config.inputId ??
                        "—"}
                    </span>
                  </div>
                  <div className={shell.midiPortRow}>
                    <span className={shell.midiLabel}>Wyjście</span>
                    <span className={shell.midiPortValue}>
                      {midi.outputs.find((p) => p.id === midi.config.outputId)
                        ?.name ??
                        midi.config.outputId ??
                        "—"}
                    </span>
                  </div>
                  <div className={shell.midiPortRow}>
                    <span className={shell.midiLabel}>Clock OUT</span>
                    <span className={shell.midiPortValue}>
                      {midi.config.clockOutEnabled ? "włączony" : "wyłączony"}
                    </span>
                  </div>
                  <div className={shell.midiActions}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("stagesync:open-preferences", {
                            detail: { tab: "midi" },
                          }),
                        );
                      }}
                    >
                      Preferencje MIDI/Audio…
                    </Button>
                  </div>
                </div>
                {!midi.available ? (
                  <p className={shell.muted}>
                    Brak natywnego MIDI w tym środowisku (Docker / CI). Desktop
                    sidecar ładuje urządzenia hosta.
                  </p>
                ) : null}
              </>
            ) : midiError ? null : (
              <p className={shell.muted}>Wczytywanie…</p>
            )}
          </div>
        </section>

        <section
          className={`${shell.card} ${styles.leftCard}`}
          aria-label="O aplikacji i aktualizacje"
        >
          <div className={shell.cardHead}>
            <h2 className={shell.cardTitle}>O aplikacji &amp; Aktualizacje</h2>
          </div>
          <div className={`${shell.cardBody} ${styles.aboutBody}`}>
            <p className={shell.muted}>
              Wersja <strong>{APP_VERSION}</strong>
            </p>
            <div className={shell.actions}>
              <Button
                variant="ghost"
                onClick={() => void openExternalUrl(DOCS_INSTALL_URL)}
              >
                Pełna instrukcja na GitHubie ↗
              </Button>
              <Button
                variant="ghost"
                onClick={() => void openExternalUrl(DOCS_ISSUES_URL)}
              >
                Zgłoś błąd lub pomysł ↗
              </Button>
            </div>
            <UpdatePanel
              autoCheck={autoCheckUpdate}
              onAutoCheckConsumed={onAutoCheckUpdateConsumed}
            />
          </div>
        </section>
      </div>

      <div className={styles.right}>
        <section className={`${shell.card} ${styles.logCard}`} aria-label="Logi">
          <div className={shell.cardHead}>
            <h2 className={shell.cardTitle}>Logi</h2>
            <div className={shell.actions}>
              <Button
                variant="ghost"
                selected={paused}
                onClick={() => setPaused((v) => !v)}
              >
                {paused ? "Wznów" : "Pauza"}
              </Button>
              <Button
                variant="ghost"
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
                Pobierz paczkę (.zip)
              </Button>
            </div>
          </div>
          {diagError ? (
            <p className={shell.error} role="alert">
              {diagError}
            </p>
          ) : null}
          <pre className={shell.terminal} aria-live="polite">
            {lines.length === 0
              ? "Oczekiwanie na logi…"
              : lines
                  .map(
                    (l) =>
                      `${new Date(l.t).toISOString().slice(11, 19)} [${l.level}] ${l.msg}`,
                  )
                  .join("\n")}
          </pre>
        </section>
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
  const inTauri = isDesktopShell();

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setError(null);
    setHostStatus(null);
    setDesktopStatus(null);
    setDone(false);
    try {
      const [host, desktop] = await Promise.allSettled([
        fetchHostUpdateStatus(),
        inTauri ? checkDesktopUpdate() : Promise.reject(new Error("browser")),
      ]);
      const messages: string[] = [];
      if (host.status === "fulfilled") {
        setHostStatus(host.value);
        // Desktop: sidecar version is informational; GitHub/Watchtower host
        // check is Docker-only and must not surface as a hard red failure.
        if (host.value.error && !inTauri) {
          messages.push(`Host: ${host.value.error}`);
        }
      } else if (!inTauri) {
        messages.push(`Host: ${formatUnknownError(host.reason)}`);
      }
      if (inTauri) {
        if (desktop.status === "fulfilled") setDesktopStatus(desktop.value);
        else messages.push(`Aplikacja: ${formatUnknownError(desktop.reason)}`);
      }
      setError(messages.length ? messages.join(" · ") : null);
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
      {hostStatus ? (
        <div className={styles.updateRow}>
          <span className={shell.muted}>
            {inTauri ? (
              <>Sidecar: {hostStatus.current}</>
            ) : (
              <>
                Host: {hostStatus.current} → {hostStatus.latest ?? "?"}{" "}
                {!hostStatus.updateAvailable && hostStatus.latest && "(aktualny)"}
              </>
            )}
          </span>
          {hostStatus.updateAvailable && !inTauri ? (
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
      {inTauri && hostStatus ? (
        <p className={shell.muted}>
          Sidecar aktualizuje się razem z instalatorem aplikacji (przycisk
          poniżej). Porównanie hosta / Watchtower dotyczy wyłącznie wdrożeń
          Docker — nie jest to błąd aktualizacji desktop.
        </p>
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
        message="Aplikacja zostanie zamknięta i zaktualizowana. Kontynuować?"
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
