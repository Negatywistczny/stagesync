import { useEffect, useState, type ReactNode } from "react";
import { Button, Slider } from "@stagesync/ui";
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
import { getMetronomeAudioContext } from "../lib/metronome.js";
import {
  fetchMidiHostStatus,
  postMidiPanic,
  putMidiHostConfig,
  type MidiHostStatus,
} from "../lib/setlistApi.js";
import { useTransport } from "../transport/useTransport.js";
import { ShellIconButton } from "./ShellIconButton.js";
import styles from "./PreferencesModal.module.css";

export type PreferencesTab = "audio" | "midi";

type Props = {
  onClose: () => void;
  initialTab?: PreferencesTab;
};

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-label={title}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Zamknij"
        onClick={onClose}
      />
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2>{title}</h2>
          <ShellIconButton label="Zamknij" onClick={onClose}>
            ×
          </ShellIconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PreferencesModal({ onClose, initialTab = "audio" }: Props) {
  const { latencyMs } = useTransport();
  const [tab, setTab] = useState<PreferencesTab>(initialTab);
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [sinkId, setSinkId] = useState<string>(
    () => getStoredAudioOutputDeviceId() ?? "",
  );
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const [latencyCompMs, setLatencyCompMs] = useState(
    () => getStoredLatencyCompensationMs(),
  );
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);

  const [midi, setMidi] = useState<MidiHostStatus | null>(null);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [midiBusy, setMidiBusy] = useState(false);
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
            err instanceof Error ? err.message : "Nie udało się listować urządzeń",
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
        if (!cancelled) setMidi(status);
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

  const applyMidi = async (patch: {
    inputId?: string | null;
    outputId?: string | null;
    clockOutEnabled?: boolean;
  }) => {
    setMidiBusy(true);
    try {
      const status = await putMidiHostConfig(patch);
      setMidi(status);
      setMidiError(null);
    } catch (err) {
      setMidiError(err instanceof Error ? err.message : "Błąd MIDI");
    } finally {
      setMidiBusy(false);
    }
  };

  const onSinkChange = async (next: string) => {
    setAudioBusy(true);
    setAudioError(null);
    try {
      const id = next === "" ? null : next;
      await applyAudioOutputSink(id);
      setStoredAudioOutputDeviceId(id);
      setSinkId(next);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "Błąd audio");
    } finally {
      setAudioBusy(false);
    }
  };

  const onLatencyChange = (next: number) => {
    const clamped = clampLatencyCompensationMs(next);
    setLatencyCompMs(clamped);
    setStoredLatencyCompensationMs(clamped);
  };

  const onPanic = async () => {
    setPanicBusy(true);
    setPanicConfirm(false);
    try {
      const result = await postMidiPanic();
      if (result.status) setMidi(result.status);
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

  return (
    <ModalShell title="Preferencje" onClose={onClose}>
      <div className={styles.tabs} role="tablist" aria-label="Preferencje">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "audio"}
          className={[styles.tab, tab === "audio" ? styles.tabSelected : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setTab("audio")}
        >
          Audio
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "midi"}
          className={[styles.tab, tab === "midi" ? styles.tabSelected : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setTab("midi")}
        >
          MIDI
        </button>
      </div>

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
                disabled={audioBusy}
                value={sinkId}
                aria-label="Wyjście audio"
                onChange={(e) => {
                  void onSinkChange(e.target.value);
                }}
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
                Kompensacja latencji ({latencyCompMs > 0 ? "+" : ""}
                {latencyCompMs} ms)
              </span>
              <div className={styles.latencyRow}>
                <Slider
                  className={styles.latencySlider}
                  min={AUDIO_LATENCY_MIN_MS}
                  max={AUDIO_LATENCY_MAX_MS}
                  step={1}
                  value={latencyCompMs}
                  aria-label="Kompensacja latencji wyjścia"
                  onValueChange={onLatencyChange}
                />
                <input
                  className={styles.number}
                  type="number"
                  min={AUDIO_LATENCY_MIN_MS}
                  max={AUDIO_LATENCY_MAX_MS}
                  step={1}
                  value={latencyCompMs}
                  aria-label="Kompensacja latencji (ms)"
                  onChange={(e) => {
                    onLatencyChange(Number(e.target.value));
                  }}
                />
              </div>
            </label>
          </fieldset>
        </div>
      ) : (
        <div className={styles.body} role="tabpanel">
          {midiError ? (
            <p className={styles.error} role="alert">
              {midiError}
            </p>
          ) : null}
          {midi ? (
            <>
              {!midi.available ? (
                <p className={styles.muted}>
                  MIDI niedostępne w tym środowisku.
                </p>
              ) : null}
              <label className={styles.field}>
                <span className={styles.label}>Wejście MIDI</span>
                <select
                  className={styles.select}
                  disabled={midiBusy || !midi.available}
                  value={midi.config.inputId ?? ""}
                  aria-label="MIDI input"
                  onChange={(e) => {
                    const v = e.target.value;
                    void applyMidi({ inputId: v === "" ? null : v });
                  }}
                >
                  <option value="">—</option>
                  {midi.inputs.map((p) => (
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
                  disabled={midiBusy || !midi.available}
                  value={midi.config.outputId ?? ""}
                  aria-label="MIDI output"
                  onChange={(e) => {
                    const v = e.target.value;
                    void applyMidi({ outputId: v === "" ? null : v });
                  }}
                >
                  <option value="">—</option>
                  {midi.outputs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={midi.config.clockOutEnabled}
                  disabled={midiBusy || !midi.available}
                  aria-label="MIDI clock out"
                  onChange={(e) => {
                    void applyMidi({ clockOutEnabled: e.target.checked });
                  }}
                />
                <span>Clock OUT</span>
              </label>
              <div className={styles.panicBlock}>
                <Button
                  variant="primary"
                  disabled={
                    panicBusy ||
                    midiBusy ||
                    !midi.available ||
                    !midi.config.outputId
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
      )}

      <div className={styles.actions}>
        <Button variant="primary" onClick={onClose}>
          Zamknij
        </Button>
      </div>
    </ModalShell>
  );
}
