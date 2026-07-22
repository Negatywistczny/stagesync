import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@stagesync/ui";
import {
  applyAudioOutputSink,
  getStoredAudioOutputDeviceId,
  listAudioOutputDevices,
  setStoredAudioOutputDeviceId,
} from "../lib/audioOutputPrefs.js";
import {
  fetchMidiHostStatus,
  putMidiHostConfig,
  type MidiHostStatus,
} from "../lib/setlistApi.js";
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
  const [tab, setTab] = useState<PreferencesTab>(initialTab);
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [sinkId, setSinkId] = useState<string>(
    () => getStoredAudioOutputDeviceId() ?? "",
  );
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);

  const [midi, setMidi] = useState<MidiHostStatus | null>(null);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [midiBusy, setMidiBusy] = useState(false);

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
