import { useId, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Input, Select, Slider } from "@stagesync/ui";
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
import { getMetronomeAudioContext, previewMetronomeClick } from "../lib/metronome.js";
import {
  clampMetronomeVolume,
  getMetronomePrefs,
  METRONOME_VOLUME_MAX,
  METRONOME_VOLUME_MIN,
  setMetronomePrefs,
  type MetronomePrefs,
  type MetronomeTimbre,
} from "../lib/metronomePrefs.js";
import {
  getStoredDeviceDisplayName,
  setStoredDeviceDisplayName,
} from "../lib/deviceNamePrefs.js";
import { type PreferencesTab } from "../lib/preferencesEvents.js";
import {
  browseServerPath,
  fetchMidiHostStatus,
  fetchServerSettings,
  postMidiPanic,
  postSystemRestore,
  putMidiHostConfig,
  putServerSettings,
  type BrowseResult,
  type MidiHostStatus,
  type ServerSettingsResponse,
  type ServerSettingsValues,
} from "../lib/setlistApi.js";
import { useTransport } from "../transport/useTransport.js";
import { ShellAppearanceFields } from "./ShellAppearanceFields.js";
import { ChangeServerControl } from "./ChangeServerControl.js";
import { DeviceNameFields } from "./DeviceNameFields.js";
import { ShellConfirmDialog } from "./ShellBlockingDialog.js";
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
  inputChannel: number | null;
  outputChannel: number;
};

type PrefsSnapshot = {
  appearance: AppearanceState;
  clockFormat: ClockDisplayFormat;
  deviceName: string;
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
    deviceName: getStoredDeviceDisplayName() ?? "",
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
    a.clockOutEnabled === b.clockOutEnabled &&
    a.inputChannel === b.inputChannel &&
    a.outputChannel === b.outputChannel
  );
}

function prefsEqual(a: PrefsSnapshot, b: PrefsSnapshot): boolean {
  return (
    a.appearance.light === b.appearance.light &&
    a.appearance.highContrast === b.appearance.highContrast &&
    a.clockFormat === b.clockFormat &&
    a.deviceName === b.deviceName &&
    a.sinkId === b.sinkId &&
    a.latencyCompMs === b.latencyCompMs &&
    a.metro.accentVolume === b.metro.accentVolume &&
    a.metro.beatVolume === b.metro.beatVolume &&
    a.metro.timbre === b.metro.timbre &&
    a.metro.masterGainDb === b.metro.masterGainDb &&
    midiDraftEqual(a.midi, b.midi)
  );
}

function ModalShell({
  title,
  children,
  footer,
  onDiscard,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onDiscard: () => void;
}) {
  const titleId = useId();
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Odrzuć"
        onClick={onDiscard}
      />
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 id={titleId}>{title}</h2>
          <ShellIconButton label="Odrzuć" onClick={onDiscard}>
            ×
          </ShellIconButton>
        </div>
        <div className={styles.scroll}>{children}</div>
        {footer}
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
  const [deviceNameError, setDeviceNameError] = useState<string | null>(null);
  const [panicBusy, setPanicBusy] = useState(false);
  const [panicConfirm, setPanicConfirm] = useState(false);
  const [panicHoldMs, setPanicHoldMs] = useState(0);
  const panicHoldTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panicArmedRef = useRef(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [server, setServer] = useState<ServerSettingsValues | null>(null);
  const serverSnap = useRef<ServerSettingsValues | null>(null);
  const [serverMeta, setServerMeta] = useState<ServerSettingsResponse | null>(null);
  const [restartNote, setRestartNote] = useState<string | null>(null);
  const [browseField, setBrowseField] = useState<string | null>(null);
  const [browseData, setBrowseData] = useState<BrowseResult | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [restoreSelected, setRestoreSelected] = useState<
    { path: string; name: string }[]
  >([]);
  const [pendingRestore, setPendingRestore] = useState<{
    paths: string[];
    label: string;
  } | null>(null);

  const isRestoreBrowse = browseField === "__restore__";
  const browseMode = isRestoreBrowse ? "file" : "dir";
  const restoreBrowseExt = ".bak,.zip";

  function isZipName(name: string): boolean {
    return name.toLowerCase().endsWith(".zip");
  }

  function isBakName(name: string): boolean {
    return name.toLowerCase().endsWith(".bak");
  }

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
          inputChannel: status.config.inputChannel ?? null,
          outputChannel: status.config.outputChannel ?? 0,
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
    setDeviceNameError(null);
    try {
      try {
        setStoredDeviceDisplayName(draft.deviceName);
      } catch (err) {
        setDeviceNameError(
          err instanceof Error ? err.message : "Błąd zapisu nazwy",
        );
        setTab("general");
        return;
      }

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
          inputChannel: draft.midi.inputChannel,
          outputChannel: draft.midi.outputChannel,
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
          snapshotRef.current = {
            ...draft,
            deviceName: getStoredDeviceDisplayName() ?? draft.deviceName,
          };
          return;
        }
      }

      snapshotRef.current = {
        ...draft,
        deviceName: getStoredDeviceDisplayName() ?? draft.deviceName,
      };
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nie udało się zapisać";
      if (msg.toLowerCase().includes("midi")) setMidiError(msg);
      else setAudioError(msg);
    } finally {
      setSaveBusy(false);
    }
  };

  const onPreviewMetronome = async () => {
    setPreviewBusy(true);
    try {
      await previewMetronomeClick(draft.metro, true);
    } catch {
      /* autoplay / audio failure — no fake success */
    } finally {
      setPreviewBusy(false);
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

  const clearPanicHold = () => {
    if (panicHoldTimerRef.current != null) {
      clearInterval(panicHoldTimerRef.current);
      panicHoldTimerRef.current = null;
    }
    setPanicHoldMs(0);
    panicArmedRef.current = false;
  };

  const startPanicHold = () => {
    if (
      panicBusy ||
      saveBusy ||
      !midiStatus?.available ||
      !midiStatus.config.outputId
    ) {
      return;
    }
    clearPanicHold();
    panicArmedRef.current = true;
    const started = Date.now();
    panicHoldTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - started;
      setPanicHoldMs(elapsed);
      if (elapsed >= 1000 && panicArmedRef.current) {
        clearPanicHold();
        void onPanic();
      }
    }, 50);
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
    <ModalShell
      title="Ustawienia"
      onDiscard={onDiscard}
      footer={
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
      }
    >
      <div className={styles.tabs} role="tablist" aria-label="Preferencje">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant="ghost"
            role="tab"
            aria-selected={tab === t.id}
            selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
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
                  aria-label="Format zegara BBT (Takt.Beat)"
                  onChange={() =>
                    setDraft((d) => ({ ...d, clockFormat: "bbt" }))
                  }
                />
                <span>BBT (Takt.Beat)</span>
              </label>
              <label className={styles.radioRow}>
                <input
                  type="radio"
                  name="clock-format"
                  checked={draft.clockFormat === "time"}
                  aria-label="Format zegara MM:SS.ms"
                  onChange={() =>
                    setDraft((d) => ({ ...d, clockFormat: "time" }))
                  }
                />
                <span>MM:SS.ms</span>
              </label>
            </div>
          </fieldset>

          <DeviceNameFields
            value={draft.deviceName}
            onChange={(deviceName) => {
              setDeviceNameError(null);
              setDraft((d) => ({ ...d, deviceName }));
            }}
            error={deviceNameError}
          />
          <ChangeServerControl entryPath="/admin" />
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
              <Select
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
              </Select>
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
              <div className={styles.panicBlock}>
                <Button
                  variant="secondary"
                  className={styles.panicBtn}
                  disabled={
                    panicBusy ||
                    saveBusy ||
                    !midiStatus.available ||
                    !midiStatus.config.outputId
                  }
                  loading={panicBusy}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    startPanicHold();
                  }}
                  onPointerUp={() => clearPanicHold()}
                  onPointerLeave={() => clearPanicHold()}
                  onPointerCancel={() => clearPanicHold()}
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  {panicHoldMs > 0
                    ? `Przytrzymaj… ${Math.min(100, Math.round((panicHoldMs / 1000) * 100))}%`
                    : "MIDI Panic / Reset Controllers"}
                </Button>
                {panicConfirm ? (
                  <p className={styles.confirm} role="status">
                    Wysłano sygnał Reset
                  </p>
                ) : (
                  <p className={styles.muted}>
                    Przytrzymaj ~1 s — awaryjne wyciszenie nut i Reset Controllers
                    na wszystkich kanałach wyjścia MIDI (bez PIN-u).
                  </p>
                )}
              </div>
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Porty MIDI</legend>
                <label className={styles.field}>
                  <span className={styles.label}>Wejście MIDI</span>
                  <Select
                    disabled={saveBusy || !midiStatus.available}
                    value={midiDraft.inputId ?? ""}
                    aria-label="Wejście MIDI"
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
                  </Select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Wyjście MIDI</span>
                  <Select
                    disabled={saveBusy || !midiStatus.available}
                    value={midiDraft.outputId ?? ""}
                    aria-label="Wyjście MIDI"
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
                  </Select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>
                    Kanał wejściowy Program Change
                  </span>
                  <Select
                    disabled={saveBusy || !midiStatus.available}
                    value={
                      midiDraft.inputChannel == null
                        ? ""
                        : String(midiDraft.inputChannel)
                    }
                    aria-label="Kanał wejściowy Program Change"
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((d) =>
                        d.midi
                          ? {
                              ...d,
                              midi: {
                                ...d.midi,
                                inputChannel: v === "" ? null : Number(v),
                              },
                            }
                          : d,
                      );
                    }}
                  >
                    <option value="">Omni (wszystkie kanały)</option>
                    {Array.from({ length: 16 }, (_, i) => (
                      <option key={i} value={String(i)}>
                        Kanał {i + 1}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>
                    Kanał wyjściowy Program Change
                  </span>
                  <Select
                    disabled={saveBusy || !midiStatus.available}
                    value={String(midiDraft.outputChannel)}
                    aria-label="Kanał wyjściowy Program Change"
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDraft((d) =>
                        d.midi
                          ? {
                              ...d,
                              midi: {
                                ...d.midi,
                                outputChannel: v,
                              },
                            }
                          : d,
                      );
                    }}
                  >
                    {Array.from({ length: 16 }, (_, i) => (
                      <option key={i} value={String(i)}>
                        Kanał {i + 1}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={midiDraft.clockOutEnabled}
                    disabled={saveBusy || !midiStatus.available}
                    aria-label="MIDI Clock OUT"
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
            <div className={styles.timbreRow}>
              <Select
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
              </Select>
              <Button
                type="button"
                variant="secondary"
                loading={previewBusy}
                disabled={previewBusy || saveBusy}
                aria-label="Odsłuch kliknięcia metronomu"
                onClick={() => {
                  void onPreviewMetronome();
                }}
              >
                Odsłuch
              </Button>
            </div>
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
                  <Select value={server.STAGESYNC_BIND_HOST || "0.0.0.0"}
                    onChange={(e) => setServer({ ...server, STAGESYNC_BIND_HOST: e.target.value })} aria-label="Host nasłuchu">
                    <option value="0.0.0.0">0.0.0.0 (LAN)</option>
                    <option value="127.0.0.1">localhost</option>
                  </Select>
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
                  <Select value={server.LOG_LEVEL || "info"}
                    onChange={(e) => setServer({ ...server, LOG_LEVEL: e.target.value })} aria-label="Poziom logów">
                    <option value="info">info</option>
                    <option value="debug">debug</option>
                    <option value="warn">warn</option>
                    <option value="error">error</option>
                  </Select>
                </label>
                <label className={styles.checkRow}>
                  <input type="checkbox" checked={!server.STAGESYNC_DISABLE_AUTO_UPDATE}
                    onChange={(e) => setServer({ ...server, STAGESYNC_DISABLE_AUTO_UPDATE: !e.target.checked })} aria-label="Aktualizacje automatyczne" />
                  <span>Aktualizacje z Admina</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Kanał aktualizacji</span>
                  <Select value={server.STAGESYNC_UPDATE_CHANNEL || "stable"}
                    onChange={(e) => setServer({ ...server, STAGESYNC_UPDATE_CHANNEL: e.target.value })} aria-label="Kanał">
                    <option value="stable">Stable</option>
                    <option value="beta">Beta</option>
                    <option value="rc">RC</option>
                  </Select>
                </label>
              </fieldset>
              <details className={styles.fieldset}>
                <summary className={styles.legend}>Zaawansowane — Ścieżki plików</summary>
                {([
                  ["STAGESYNC_DATA_DIR", "dataDir", serverMeta?.resolved?.dataDir],
                  ["STAGESYNC_BACKUPS_DIR", "backupDir", serverMeta?.resolved?.backupsDir],
                  ["STAGESYNC_ASSETS_DIR", "assetsDir", serverMeta?.resolved?.assetsHint],
                ] as const).map(([key, label, ph]) => (
                  <label key={key} className={styles.field}>
                    <span className={styles.label}>{label}</span>
                    <div className={styles.latencyRow}>
                      <Input style={{ flex: 1 }} type="text" value={String(server[key] ?? "")}
                        placeholder={ph ?? ""} onChange={(e) => setServer({ ...server, [key]: e.target.value })} aria-label={label} />
                      <Button
                        variant="secondary"
                        aria-label={`Przeglądaj katalog — ${label}`}
                        onClick={() => {
                        setBrowseField(key);
                        setRestoreMsg(null);
                        void browseServerPath({ path: String(server[key] || ""), mode: "dir" }).then(setBrowseData).catch(() => setBrowseData(null));
                      }}>…</Button>
                    </div>
                  </label>
                ))}
                <div className={styles.field}>
                  <span className={styles.label}>Przywróć z kopii</span>
                  <p className={styles.muted}>
                    Wybierz plik <code>.bak</code> (shadow backup), kilka plików
                    <code>.bak</code>, albo archiwum <code>.zip</code> z drzewem
                    danych / kopiami. Host nadpisze pliki w katalogu danych
                    (najpierw zrobi kopię <code>pre-restore</code>).
                  </p>
                  <div className={styles.latencyRow}>
                    <Button
                      variant="secondary"
                      disabled={restoreBusy}
                      aria-label="Przywróć z pliku .bak lub .zip"
                      onClick={() => {
                        setBrowseField("__restore__");
                        setRestoreMsg(null);
                        setRestoreSelected([]);
                        const start =
                          serverMeta?.resolved?.backupsDir ||
                          serverMeta?.resolved?.dataDir ||
                          String(server.STAGESYNC_BACKUPS_DIR || server.STAGESYNC_DATA_DIR || "");
                        void browseServerPath({
                          path: start,
                          mode: "file",
                          ext: restoreBrowseExt,
                        })
                          .then(setBrowseData)
                          .catch((err) => {
                            setBrowseData(null);
                            setRestoreMsg(
                              err instanceof Error
                                ? err.message
                                : "Nie udało się otworzyć przeglądarki plików",
                            );
                          });
                      }}
                    >
                      Przywróć…
                    </Button>
                  </div>
                  {restoreMsg ? (
                    <p className={styles.muted} role="status">
                      {restoreMsg}
                    </p>
                  ) : null}
                </div>
                {browseField && browseData ? (
                  <div className={styles.panicBlock}>
                    <p className={styles.muted}>{browseData.envPath}</p>
                    <div className={styles.latencyRow}>
                      <Button variant="ghost" disabled={!browseData.parent} onClick={() => {
                        if (browseData.parent) {
                          void browseServerPath({
                            path: browseData.parent,
                            mode: browseMode,
                            ext: isRestoreBrowse ? restoreBrowseExt : undefined,
                          }).then((next) => {
                            setBrowseData(next);
                            if (isRestoreBrowse) setRestoreSelected([]);
                          });
                        }
                      }}>W górę</Button>
                      {!isRestoreBrowse ? (
                        <Button variant="primary" onClick={() => {
                          setServer({ ...server, [browseField]: browseData.envPath });
                          setBrowseField(null);
                          setBrowseData(null);
                        }}>Wybierz</Button>
                      ) : (
                        <>
                          <Button
                            variant="primary"
                            disabled={restoreSelected.length === 0 || restoreBusy}
                            onClick={() => {
                              const n = restoreSelected.length;
                              setPendingRestore({
                                paths: restoreSelected.map((s) => s.path),
                                label:
                                  n === 1
                                    ? restoreSelected[0]!.name
                                    : `${n} plików .bak`,
                              });
                            }}
                          >
                            Przywróć zaznaczone
                            {restoreSelected.length > 0
                              ? ` (${restoreSelected.length})`
                              : ""}
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={restoreBusy}
                            onClick={() => {
                              const baks = browseData.entries.filter(
                                (e) => e.type === "file" && isBakName(e.name),
                              );
                              if (baks.length === 0) {
                                setRestoreMsg(
                                  "W tym katalogu nie ma plików .bak do przywrócenia",
                                );
                                return;
                              }
                              setPendingRestore({
                                paths: baks.map((e) => e.path),
                                label: `wszystkie .bak w katalogu (${baks.length})`,
                              });
                            }}
                          >
                            Przywróć katalog (.bak)
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" onClick={() => {
                        setBrowseField(null);
                        setBrowseData(null);
                        setRestoreSelected([]);
                      }}>Anuluj</Button>
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                      {browseData.entries
                        .filter((e) =>
                          isRestoreBrowse ? e.type === "dir" || e.type === "file" : e.type === "dir",
                        )
                        .map((e) => {
                          const selected =
                            isRestoreBrowse &&
                            e.type === "file" &&
                            isBakName(e.name) &&
                            restoreSelected.some((s) => s.path === e.path);
                          return (
                        <li key={e.path}>
                          <button type="button" className={styles.select} style={{
                            width: "100%",
                            textAlign: "left",
                            ...(selected
                              ? { outline: "2px solid var(--ss-color-primary)" }
                              : {}),
                          }}
                            onClick={() => {
                              if (e.type === "dir") {
                                void browseServerPath({
                                  path: e.path,
                                  mode: browseMode,
                                  ext: isRestoreBrowse ? restoreBrowseExt : undefined,
                                }).then((next) => {
                                  setBrowseData(next);
                                  if (isRestoreBrowse) setRestoreSelected([]);
                                });
                                return;
                              }
                              if (isZipName(e.name)) {
                                setPendingRestore({
                                  paths: [e.path],
                                  label: e.name,
                                });
                                setBrowseField(null);
                                setBrowseData(null);
                                setRestoreSelected([]);
                                return;
                              }
                              if (isBakName(e.name)) {
                                setRestoreSelected((prev) => {
                                  const exists = prev.some((s) => s.path === e.path);
                                  if (exists) {
                                    return prev.filter((s) => s.path !== e.path);
                                  }
                                  return [...prev, { path: e.path, name: e.name }];
                                });
                                return;
                              }
                            }}
                          >
                            {e.type === "dir"
                              ? "📁"
                              : isZipName(e.name)
                                ? "📦"
                                : selected
                                  ? "☑"
                                  : "☐"}{" "}
                            {e.name}
                          </button>
                        </li>
                          );
                        })}
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

      <ShellConfirmDialog
        open={pendingRestore != null}
        title="Przywróć kopię zapasową"
        message={
          pendingRestore
            ? `Nadpisać bieżące pliki zawartością „${pendingRestore.label}”? To destrukcyjna operacja (host zrobi najpierw kopię pre-restore dla każdego nadpisanego pliku).`
            : ""
        }
        confirmLabel="Przywróć"
        onConfirm={() => {
          const pending = pendingRestore;
          setPendingRestore(null);
          if (!pending) return;
          setRestoreBusy(true);
          setRestoreMsg(null);
          setBrowseField(null);
          setBrowseData(null);
          setRestoreSelected([]);
          const payload =
            pending.paths.length === 1
              ? pending.paths[0]!
              : pending.paths;
          void postSystemRestore(payload)
            .then((res) => {
              setRestoreMsg(
                res.message ??
                  (res.count && res.count > 1
                    ? `Przywrócono ${res.count} plików`
                    : `Przywrócono: ${res.targetPath ?? ""}`),
              );
            })
            .catch((err) => {
              setRestoreMsg(
                err instanceof Error ? err.message : "Nie udało się przywrócić",
              );
            })
            .finally(() => setRestoreBusy(false));
        }}
        onCancel={() => setPendingRestore(null)}
      />
    </ModalShell>
  );
}

/** Alias for openPreferences / DesktopMenuBridge. */
export function PreferencesModal(props: Props) {
  return <ServerSettingsModal {...props} />;
}
