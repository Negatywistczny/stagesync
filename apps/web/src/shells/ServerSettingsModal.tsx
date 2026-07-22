import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Slider } from "@stagesync/ui";
import {
  applyAppearance,
  readAppearance,
  setAppearance,
  type AppearanceState,
} from "../lib/appearance.js";
import {
  applyAudioOutputSink,
  getStoredAudioOutputDeviceId,
  listAudioOutputDevices,
  setStoredAudioOutputDeviceId,
} from "../lib/audioOutputPrefs.js";
import {
  AUDIO_LATENCY_MAX_MS,
  AUDIO_LATENCY_MIN_MS,
  clampLatencyCompensationMs,
  getStoredLatencyCompensationMs,
  setStoredLatencyCompensationMs,
} from "../lib/audioLatencyPrefs.js";
import {
  getStoredClockDisplayFormat,
  setStoredClockDisplayFormat,
  type ClockDisplayFormat,
} from "../lib/clockDisplayPrefs.js";
import { getMetronomeAudioContext } from "../lib/metronome.js";
import {
  clampMetronomeVolume,
  getMetronomePrefs,
  METRONOME_VOLUME_MAX,
  METRONOME_VOLUME_MIN,
  setMetronomePrefs,
  type MetronomePrefs,
  type MetronomeTimbre,
} from "../lib/metronomePrefs.js";
import { type PreferencesTab } from "../lib/preferencesEvents.js";
import {
  browseServerPath,
  fetchMidiHostStatus,
  fetchServerSettings,
  postMidiPanic,
  putMidiHostConfig,
  putServerSettings,
  type BrowseResult,
  type MidiHostStatus,
  type ServerSettingsResponse,
  type ServerSettingsValues,
} from "../lib/setlistApi.js";
import { useTransport } from "../transport/useTransport.js";
import { ShellAppearanceFields } from "./ShellAppearanceFields.js";
import { ShellIconButton } from "./ShellIconButton.js";
import styles from "./ServerSettingsModal.module.css";

export type { PreferencesTab };

type Props = {
  onClose: () => void;
  initialTab?: PreferencesTab;
};

type MidiDraft = {
  inputId: string | null;
  outputId: string | null;
  clockOutEnabled: boolean;
};

type PrefsSnapshot = {
  appearance: AppearanceState;
  clockFormat: ClockDisplayFormat;
  sinkId: string;
  latencyCompMs: number;
  metro: MetronomePrefs;
  midi: MidiDraft | null;
};

type SettingsTab = PreferencesTab | "server";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "Ogólne" },
  { id: "audio", label: "Audio" },
  { id: "midi", label: "MIDI" },
  { id: "metronome", label: "Metronom" },
  { id: "server", label: "Serwer" },
];

function readLocalSnapshot(): PrefsSnapshot {
  return {
    appearance: readAppearance(),
    clockFormat: getStoredClockDisplayFormat(),
    sinkId: getStoredAudioOutputDeviceId() ?? "",
    latencyCompMs: getStoredLatencyCompensationMs(),
    metro: getMetronomePrefs(),
    midi: null,
  };
}

function midiDraftEqual(a: MidiDraft | null, b: MidiDraft | null): boolean {
  if (a == null || b == null) return a === b;
  return (
    a.inputId === b.inputId &&
    a.outputId === b.outputId &&
    a.clockOutEnabled === b.clockOutEnabled
  );
}

function prefsEqual(a: PrefsSnapshot, b: PrefsSnapshot): boolean {
  return (
    a.appearance.light === b.appearance.light &&
    a.appearance.highContrast === b.appearance.highContrast &&
    a.clockFormat === b.clockFormat &&
    a.sinkId === b.sinkId &&
    a.latencyCompMs === b.latencyCompMs &&
    a.metro.accentVolume === b.metro.accentVolume &&
    a.metro.beatVolume === b.metro.beatVolume &&
    a.metro.timbre === b.metro.timbre &&
    midiDraftEqual(a.midi, b.midi)
  );
}

function ModalShell({
  title,
  children,
  onDiscard,
}: {
  title: string;
  children: ReactNode;
  onDiscard: () => void;
}) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-label={title}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Odrzuć"
        onClick={onDiscard}
      />
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2>{title}</h2>
          <ShellIconButton label="Odrzuć" onClick={onDiscard}>
            ×
          </ShellIconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ServerSettingsModal({ onClose, initialTab = "general" }: Props) {
  const { latencyMs } = useTransport();
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  const snapshotRef = useRef<PrefsSnapshot>(readLocalSnapshot());
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [draft, setDraft] = useState<PrefsSnapshot>(() => snapshotRef.current);

  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const [midiStatus, setMidiStatus] = useState<MidiHostStatus | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [panicBusy, setPanicBusy] = useState(false);
  const [panicConfirm, setPanicConfirm] = useState(false);
  const [server, setServer] = useState<ServerSettingsValues | null>(null);
  const serverSnap = useRef<ServerSettingsValues | null>(null);
  const [serverMeta, setServerMeta] = useState<ServerSettingsResponse | null>(null);
  const [restartNote, setRestartNote] = useState<string | null>(null);
  const [browseField, setBrowseField] = useState<string | null>(null);
  const [browseData, setBrowseData] = useState<BrowseResult | null>(null);


  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listAudioOutputDevices();
        if (!cancelled) setOutputs(list);
      } catch (err) {
        if (!cancelled) {
          setAudioError(
            err instanceof Error
              ? err.message
              : "Nie udało się listować urządzeń",
          );
        }
      }
    })();
    try {
      setSampleRate(getMetronomeAudioContext().sampleRate);
    } catch {
      setSampleRate(null);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await fetchMidiHostStatus();
        if (cancelled) return;
        setMidiStatus(status);
        const midi: MidiDraft = {
          inputId: status.config.inputId,
          outputId: status.config.outputId,
          clockOutEnabled: status.config.clockOutEnabled,
        };
        snapshotRef.current = { ...snapshotRef.current, midi };
        setDraft((d) => ({ ...d, midi }));
        setMidiError(null);
      } catch (err) {
        if (!cancelled) {
          setMidiError(err instanceof Error ? err.message : "Błąd MIDI");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchServerSettings();
        if (cancelled) return;
        setServerMeta(res);
        serverSnap.current = { ...res.values };
        setServer({ ...res.values });
      } catch (err) {
        if (!cancelled) {
          setMidiError(err instanceof Error ? err.message : "Błąd ustawień serwera");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyAppearance(draft.appearance);
  }, [draft.appearance]);

  const onDiscard = () => {
    applyAppearance(snapshotRef.current.appearance);
    onCloseRef.current();
  };

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      applyAppearance(snapshotRef.current.appearance);
      onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSave = async () => {
    setSaveBusy(true);
    setAudioError(null);
    setMidiError(null);
    try {
      setAppearance(draft.appearance);
      setStoredClockDisplayFormat(draft.clockFormat);
      setStoredLatencyCompensationMs(draft.latencyCompMs);
      setMetronomePrefs(draft.metro);

      const sink = draft.sinkId === "" ? null : draft.sinkId;
      await applyAudioOutputSink(sink);
      setStoredAudioOutputDeviceId(sink);

      if (draft.midi && !midiDraftEqual(draft.midi, snapshotRef.current.midi)) {
        const status = await putMidiHostConfig({
          inputId: draft.midi.inputId,
          outputId: draft.midi.outputId,
          clockOutEnabled: draft.midi.clockOutEnabled,
        });
        setMidiStatus(status);
      }

      if (server && serverDirty) {
        const saved = await putServerSettings(server);
        setServerMeta(saved);
        serverSnap.current = { ...saved.values };
        setServer({ ...saved.values });
        if (saved.restartRequired) {
          setRestartNote(
            saved.message ??
              "Zapisano. Zrestartuj serwer, aby zastosować zmiany sieci / ścieżek / logów.",
          );
          snapshotRef.current = { ...draft };
          return;
        }
      }

      snapshotRef.current = { ...draft };
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nie udało się zapisać";
      if (msg.toLowerCase().includes("midi")) setMidiError(msg);
      else setAudioError(msg);
    } finally {
      setSaveBusy(false);
    }
  };

  const onPanic = async () => {
    setPanicBusy(true);
    setPanicConfirm(false);
    try {
      const result = await postMidiPanic();
      if (result.status) setMidiStatus(result.status);
      setMidiError(null);
      setPanicConfirm(true);
    } catch (err) {
      setMidiError(err instanceof Error ? err.message : "Błąd MIDI Panic");
    } finally {
      setPanicBusy(false);
    }
  };

  const networkLatencyLabel =
    latencyMs != null && Number.isFinite(latencyMs)
      ? `${Math.round(latencyMs)} ms`
      : "—";

  const midiDraft = draft.midi;
  const midiReady = midiStatus != null && midiDraft != null;
  const serverDirty =
    server != null &&
    serverSnap.current != null &&
    JSON.stringify(server) !== JSON.stringify(serverSnap.current);
  const dirty = !prefsEqual(draft, snapshotRef.current) || serverDirty;

  return (
    <ModalShell title="Ustawienia" onDiscard={onDiscard}>
      <div className={styles.tabs} role="tablist" aria-label="Preferencje">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={[styles.tab, tab === t.id ? styles.tabSelected : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" ? (
        <div className={styles.body} role="tabpanel">
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Wygląd</legend>
            <div className={styles.controlStack}>
              <ShellAppearanceFields
                value={draft.appearance}
                onChange={(appearance) =>
                  setDraft((d) => ({ ...d, appearance }))
                }
              />
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Format zegara</legend>
            <div className={styles.controlStack}>
              <label className={styles.radioRow}>
                <input
                  type="radio"
                  name="clock-format"
                  checked={draft.clockFormat === "bbt"}
                  aria-label="BBT Takt.Beat.Tick"
                  onChange={() =>
                    setDraft((d) => ({ ...d, clockFormat: "bbt" }))
                  }
                />
                <span>BBT (Takt.Beat.Tick)</span>
              </label>
              <label className={styles.radioRow}>
                <input
                  type="radio"
                  name="clock-format"
                  checked={draft.clockFormat === "time"}
                  aria-label="MM:SS.ms"
                  onChange={() =>
                    setDraft((d) => ({ ...d, clockFormat: "time" }))
                  }
                />
                <span>MM:SS.ms</span>
              </label>
            </div>
          </fieldset>
        </div>
      ) : null}

      {tab === "audio" ? (
        <div className={styles.body} role="tabpanel">
          {audioError ? (
            <p className={styles.error} role="alert">
              {audioError}
            </p>
          ) : null}

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Urządzenia Wyjściowe</legend>
            <label className={styles.field}>
              <span className={styles.label}>Wyjście audio</span>
              <select
                className={styles.select}
                disabled={saveBusy}
                value={draft.sinkId}
                aria-label="Wyjście audio"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, sinkId: e.target.value }))
                }
              >
                <option value="">Domyślne systemu</option>
                {outputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || d.deviceId}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Parametry Silnika</legend>
            <dl className={styles.infoList}>
              <div className={styles.infoRow}>
                <dt>Sample Rate</dt>
                <dd>
                  {sampleRate != null
                    ? `${Math.round(sampleRate)} Hz`
                    : "—"}
                </dd>
              </div>
              <div className={styles.infoRow}>
                <dt>Latencja sieci</dt>
                <dd>{networkLatencyLabel}</dd>
              </div>
            </dl>

            <label className={styles.field}>
              <span className={styles.label}>
                Kompensacja latencji ({draft.latencyCompMs > 0 ? "+" : ""}
                {draft.latencyCompMs} ms)
              </span>
              <div className={styles.latencyRow}>
                <Slider
                  className={styles.latencySlider}
                  min={AUDIO_LATENCY_MIN_MS}
                  max={AUDIO_LATENCY_MAX_MS}
                  step={1}
                  value={draft.latencyCompMs}
                  aria-label="Kompensacja latencji wyjścia"
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      latencyCompMs: clampLatencyCompensationMs(v),
                    }))
                  }
                />
                <input
                  className={styles.number}
                  type="number"
                  min={AUDIO_LATENCY_MIN_MS}
                  max={AUDIO_LATENCY_MAX_MS}
                  step={1}
                  value={draft.latencyCompMs}
                  aria-label="Kompensacja latencji (ms)"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      latencyCompMs: clampLatencyCompensationMs(
                        Number(e.target.value),
                      ),
                    }))
                  }
                />
              </div>
            </label>
          </fieldset>
        </div>
      ) : null}

      {tab === "midi" ? (
        <div className={styles.body} role="tabpanel">
          {midiError ? (
            <p className={styles.error} role="alert">
              {midiError}
            </p>
          ) : null}
          {midiReady && midiStatus && midiDraft ? (
            <>
              {!midiStatus.available ? (
                <p className={styles.muted}>
                  MIDI niedostępne w tym środowisku.
                </p>
              ) : null}
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Porty MIDI</legend>
                <label className={styles.field}>
                  <span className={styles.label}>Wejście MIDI</span>
                  <select
                    className={styles.select}
                    disabled={saveBusy || !midiStatus.available}
                    value={midiDraft.inputId ?? ""}
                    aria-label="MIDI input"
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((d) =>
                        d.midi
                          ? {
                              ...d,
                              midi: {
                                ...d.midi,
                                inputId: v === "" ? null : v,
                              },
                            }
                          : d,
                      );
                    }}
                  >
                    <option value="">—</option>
                    {midiStatus.inputs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Wyjście MIDI</span>
                  <select
                    className={styles.select}
                    disabled={saveBusy || !midiStatus.available}
                    value={midiDraft.outputId ?? ""}
                    aria-label="MIDI output"
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((d) =>
                        d.midi
                          ? {
                              ...d,
                              midi: {
                                ...d.midi,
                                outputId: v === "" ? null : v,
                              },
                            }
                          : d,
                      );
                    }}
                  >
                    <option value="">—</option>
                    {midiStatus.outputs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={midiDraft.clockOutEnabled}
                    disabled={saveBusy || !midiStatus.available}
                    aria-label="MIDI clock out"
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setDraft((d) =>
                        d.midi
                          ? {
                              ...d,
                              midi: {
                                ...d.midi,
                                clockOutEnabled: checked,
                              },
                            }
                          : d,
                      );
                    }}
                  />
                  <span>Clock OUT</span>
                </label>
              </fieldset>
              <div className={styles.panicBlock}>
                <Button
                  variant="primary"
                  disabled={
                    panicBusy ||
                    saveBusy ||
                    !midiStatus.available ||
                    !midiStatus.config.outputId
                  }
                  loading={panicBusy}
                  onClick={() => {
                    void onPanic();
                  }}
                >
                  MIDI Panic / Reset Controllers
                </Button>
                {panicConfirm ? (
                  <p className={styles.confirm} role="status">
                    Wysłano sygnał Reset
                  </p>
                ) : null}
              </div>
            </>
          ) : midiError ? null : (
            <p className={styles.muted}>Wczytywanie…</p>
          )}
        </div>
      ) : null}

      {tab === "metronome" ? (
        <div className={styles.body} role="tabpanel">
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Głośność</legend>
            <label className={styles.field}>
              <span className={styles.label}>
                Akcent (beat 1) — {draft.metro.accentVolume}%
              </span>
              <div className={styles.latencyRow}>
                <Slider
                  className={styles.latencySlider}
                  min={METRONOME_VOLUME_MIN}
                  max={METRONOME_VOLUME_MAX}
                  step={1}
                  value={draft.metro.accentVolume}
                  aria-label="Głośność akcentu metronomu"
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      metro: {
                        ...d.metro,
                        accentVolume: clampMetronomeVolume(v),
                      },
                    }))
                  }
                />
                <input
                  className={styles.number}
                  type="number"
                  min={METRONOME_VOLUME_MIN}
                  max={METRONOME_VOLUME_MAX}
                  step={1}
                  value={draft.metro.accentVolume}
                  aria-label="Głośność akcentu (%)"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      metro: {
                        ...d.metro,
                        accentVolume: clampMetronomeVolume(
                          Number(e.target.value),
                        ),
                      },
                    }))
                  }
                />
              </div>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                Pozostałe beaty — {draft.metro.beatVolume}%
              </span>
              <div className={styles.latencyRow}>
                <Slider
                  className={styles.latencySlider}
                  min={METRONOME_VOLUME_MIN}
                  max={METRONOME_VOLUME_MAX}
                  step={1}
                  value={draft.metro.beatVolume}
                  aria-label="Głośność pozostałych beatów metronomu"
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      metro: {
                        ...d.metro,
                        beatVolume: clampMetronomeVolume(v),
                      },
                    }))
                  }
                />
                <input
                  className={styles.number}
                  type="number"
                  min={METRONOME_VOLUME_MIN}
                  max={METRONOME_VOLUME_MAX}
                  step={1}
                  value={draft.metro.beatVolume}
                  aria-label="Głośność beatów (%)"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      metro: {
                        ...d.metro,
                        beatVolume: clampMetronomeVolume(
                          Number(e.target.value),
                        ),
                      },
                    }))
                  }
                />
              </div>
            </label>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Dźwięk metronomu</legend>
            <select
              className={styles.select}
              value={draft.metro.timbre}
              aria-label="Dźwięk metronomu"
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  metro: {
                    ...d.metro,
                    timbre: e.target.value as MetronomeTimbre,
                  },
                }))
              }
            >
              <option value="default">Domyślny</option>
              <option value="woodblock">Woodblock</option>
              <option value="bell">Bell</option>
            </select>
          </fieldset>
        </div>
      ) : null}


      {tab === "server" ? (
        <div className={styles.body} role="tabpanel">
          {restartNote ? (
            <p className={styles.restartNote} role="status">{restartNote}</p>
          ) : null}
          {server ? (
            <>
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Sieć &amp; Klienci</legend>
                <label className={styles.field}>
                  <span className={styles.label}>Port HTTP</span>
                  <input className={styles.number} type="number" min={1} max={65535} value={server.PORT || "4000"}
                    onChange={(e) => setServer({ ...server, PORT: e.target.value })} aria-label="Port HTTP" />
                  <span className={styles.muted}>Domyślnie 4000 · wymaga restartu</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Bind host</span>
                  <select className={styles.select} value={server.STAGESYNC_BIND_HOST || "0.0.0.0"}
                    onChange={(e) => setServer({ ...server, STAGESYNC_BIND_HOST: e.target.value })} aria-label="Bind host">
                    <option value="0.0.0.0">0.0.0.0 (LAN)</option>
                    <option value="127.0.0.1">localhost</option>
                  </select>
                </label>
                <label className={styles.checkRow}>
                  <input type="checkbox" checked={Boolean(server.STAGESYNC_DISABLE_MDNS)}
                    onChange={(e) => setServer({ ...server, STAGESYNC_DISABLE_MDNS: e.target.checked })} aria-label="Wyłącz mDNS" />
                  <span>Wyłącz ogłoszenie mDNS</span>
                </label>
              </fieldset>
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Logi &amp; Utrzymanie</legend>
                <label className={styles.field}>
                  <span className={styles.label}>Poziom logów</span>
                  <select className={styles.select} value={server.LOG_LEVEL || "info"}
                    onChange={(e) => setServer({ ...server, LOG_LEVEL: e.target.value })} aria-label="Poziom logów">
                    <option value="info">info</option>
                    <option value="debug">debug</option>
                    <option value="warn">warn</option>
                    <option value="error">error</option>
                  </select>
                </label>
                <label className={styles.checkRow}>
                  <input type="checkbox" checked={!server.STAGESYNC_DISABLE_AUTO_UPDATE}
                    onChange={(e) => setServer({ ...server, STAGESYNC_DISABLE_AUTO_UPDATE: !e.target.checked })} aria-label="Auto-update" />
                  <span>Aktualizacje z Admina</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Kanał aktualizacji</span>
                  <select className={styles.select} value={server.STAGESYNC_UPDATE_CHANNEL || "stable"}
                    onChange={(e) => setServer({ ...server, STAGESYNC_UPDATE_CHANNEL: e.target.value })} aria-label="Kanał">
                    <option value="stable">Stable</option>
                    <option value="beta">Beta</option>
                    <option value="rc">RC</option>
                  </select>
                </label>
              </fieldset>
              <details className={styles.fieldset}>
                <summary className={styles.legend}>▸ Zaawansowane — Ścieżki plików</summary>
                {([
                  ["STAGESYNC_DATA_DIR", "dataDir", serverMeta?.resolved?.dataDir],
                  ["STAGESYNC_BACKUPS_DIR", "backupDir", serverMeta?.resolved?.backupsDir],
                  ["STAGESYNC_ASSETS_DIR", "assetsDir", serverMeta?.resolved?.assetsHint],
                ] as const).map(([key, label, ph]) => (
                  <label key={key} className={styles.field}>
                    <span className={styles.label}>{label}</span>
                    <div className={styles.latencyRow}>
                      <input className={styles.select} style={{ flex: 1 }} type="text" value={String(server[key] ?? "")}
                        placeholder={ph ?? ""} onChange={(e) => setServer({ ...server, [key]: e.target.value })} aria-label={label} />
                      <Button variant="secondary" onClick={() => {
                        setBrowseField(key);
                        void browseServerPath({ path: String(server[key] || ""), mode: "dir" }).then(setBrowseData).catch(() => setBrowseData(null));
                      }}>…</Button>
                    </div>
                  </label>
                ))}
                {browseField && browseData ? (
                  <div className={styles.panicBlock}>
                    <p className={styles.muted}>{browseData.envPath}</p>
                    <div className={styles.latencyRow}>
                      <Button variant="ghost" disabled={!browseData.parent} onClick={() => {
                        if (browseData.parent) void browseServerPath({ path: browseData.parent, mode: "dir" }).then(setBrowseData);
                      }}>W górę</Button>
                      <Button variant="primary" onClick={() => {
                        setServer({ ...server, [browseField]: browseData.envPath });
                        setBrowseField(null);
                        setBrowseData(null);
                      }}>Wybierz</Button>
                      <Button variant="ghost" onClick={() => { setBrowseField(null); setBrowseData(null); }}>Anuluj</Button>
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                      {browseData.entries.filter((e) => e.type === "dir").map((e) => (
                        <li key={e.path}>
                          <button type="button" className={styles.select} style={{ width: "100%", textAlign: "left" }}
                            onClick={() => void browseServerPath({ path: e.path, mode: "dir" }).then(setBrowseData)}>📁 {e.name}</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </details>
            </>
          ) : (
            <p className={styles.muted}>Wczytywanie ustawień serwera…</p>
          )}
        </div>
      ) : null}

      <div className={styles.actions}>
        <Button
          variant="ghost"
          className={dirty ? styles.discardHot : undefined}
          disabled={saveBusy}
          onClick={onDiscard}
        >
          Odrzuć
        </Button>
        <Button
          variant={dirty ? "primary" : "ghost"}
          loading={saveBusy}
          disabled={saveBusy || !dirty}
          onClick={() => {
            void onSave();
          }}
        >
          Zapisz
        </Button>
      </div>
    </ModalShell>
  );
}

/** Alias for openPreferences / DesktopMenuBridge. */
export function PreferencesModal(props: Props) {
  return <ServerSettingsModal {...props} />;
}
