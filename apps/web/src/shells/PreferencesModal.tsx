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
  fetchMidiHostStatus,
  postMidiPanic,
  putMidiHostConfig,
  type MidiHostStatus,
} from "../lib/setlistApi.js";
import { useTransport } from "../transport/useTransport.js";
import { ShellAppearanceFields } from "./ShellAppearanceFields.js";
import { ShellIconButton } from "./ShellIconButton.js";
import styles from "./PreferencesModal.module.css";

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

const TABS: { id: PreferencesTab; label: string }[] = [
  { id: "general", label: "Ogólne" },
  { id: "audio", label: "Audio" },
  { id: "midi", label: "MIDI" },
  { id: "metronome", label: "Metronom" },
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

export function PreferencesModal({ onClose, initialTab = "general" }: Props) {
  const { latencyMs } = useTransport();
  const [tab, setTab] = useState<PreferencesTab>(initialTab);

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

  return (
    <ModalShell title="Preferencje" onDiscard={onDiscard}>
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

      <div className={styles.actions}>
        <Button variant="ghost" disabled={saveBusy} onClick={onDiscard}>
          Odrzuć
        </Button>
        <Button
          variant="primary"
          loading={saveBusy}
          disabled={saveBusy}
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
