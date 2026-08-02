import { Select, Slider } from "@stagesync/ui";
import {
  AUDIO_LATENCY_MAX_MS,
  AUDIO_LATENCY_MIN_MS,
  clampLatencyCompensationMs,
} from "../../../lib/audioLatencyPrefs.js";
import styles from "../../ServerSettingsModal.module.css";

interface AudioSettingsTabProps {
  audioError: string | null;
  saveBusy: boolean;
  sinkId: string;
  onSinkIdChange: (sinkId: string) => void;
  outputs: MediaDeviceInfo[];
  sampleRate: number | null;
  maxChannelCount: number | null;
  networkLatencyLabel: string;
  latencyCompMs: number;
  onLatencyCompMsChange: (ms: number) => void;
}

export function AudioSettingsTab({
  audioError,
  saveBusy,
  sinkId,
  onSinkIdChange,
  outputs,
  sampleRate,
  maxChannelCount,
  networkLatencyLabel,
  latencyCompMs,
  onLatencyCompMsChange,
}: AudioSettingsTabProps) {
  return (
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
            value={sinkId}
            aria-label="Wyjście audio"
            onChange={(e) => onSinkIdChange(e.target.value)}
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
            <dt>Kanały wyjścia</dt>
            <dd>
              {maxChannelCount != null ? `${maxChannelCount}` : "—"}
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
              onValueChange={(v) => onLatencyCompMsChange(clampLatencyCompensationMs(v))}
            />
            <input
              className={styles.number}
              type="number"
              min={AUDIO_LATENCY_MIN_MS}
              max={AUDIO_LATENCY_MAX_MS}
              step={1}
              value={latencyCompMs}
              aria-label="Kompensacja latencji (ms)"
              onChange={(e) =>
                onLatencyCompMsChange(clampLatencyCompensationMs(Number(e.target.value)))
              }
            />
          </div>
        </label>
      </fieldset>
    </div>
  );
}
