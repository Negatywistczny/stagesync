import { Button, Select, Slider } from "@stagesync/ui";
import {
  METRONOME_VOLUME_MAX,
  METRONOME_VOLUME_MIN,
  clampMetronomeVolume,
  type MetronomePrefs,
  type MetronomeTimbre,
} from "../../../lib/metronomePrefs.js";
import styles from "../../ServerSettingsModal.module.css";

interface MetronomeSettingsTabProps {
  metro: MetronomePrefs;
  onMetroChange: (metro: MetronomePrefs) => void;
  previewBusy: boolean;
  saveBusy: boolean;
  onPreviewClick: () => void;
}

export function MetronomeSettingsTab({
  metro,
  onMetroChange,
  previewBusy,
  saveBusy,
  onPreviewClick,
}: MetronomeSettingsTabProps) {
  return (
    <div className={styles.body} role="tabpanel">
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Głośność</legend>
        <label className={styles.field}>
          <span className={styles.label}>
            Akcent (beat 1) — {metro.accentVolume}%
          </span>
          <div className={styles.latencyRow}>
            <Slider
              className={styles.latencySlider}
              min={METRONOME_VOLUME_MIN}
              max={METRONOME_VOLUME_MAX}
              step={1}
              value={metro.accentVolume}
              aria-label="Głośność akcentu metronomu"
              onValueChange={(v) =>
                onMetroChange({
                  ...metro,
                  accentVolume: clampMetronomeVolume(v),
                })
              }
            />
            <input
              className={styles.number}
              type="number"
              min={METRONOME_VOLUME_MIN}
              max={METRONOME_VOLUME_MAX}
              step={1}
              value={metro.accentVolume}
              aria-label="Głośność akcentu (%)"
              onChange={(e) =>
                onMetroChange({
                  ...metro,
                  accentVolume: clampMetronomeVolume(Number(e.target.value)),
                })
              }
            />
          </div>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>
            Pozostałe beaty — {metro.beatVolume}%
          </span>
          <div className={styles.latencyRow}>
            <Slider
              className={styles.latencySlider}
              min={METRONOME_VOLUME_MIN}
              max={METRONOME_VOLUME_MAX}
              step={1}
              value={metro.beatVolume}
              aria-label="Głośność pozostałych beatów metronomu"
              onValueChange={(v) =>
                onMetroChange({
                  ...metro,
                  beatVolume: clampMetronomeVolume(v),
                })
              }
            />
            <input
              className={styles.number}
              type="number"
              min={METRONOME_VOLUME_MIN}
              max={METRONOME_VOLUME_MAX}
              step={1}
              value={metro.beatVolume}
              aria-label="Głośność beatów (%)"
              onChange={(e) =>
                onMetroChange({
                  ...metro,
                  beatVolume: clampMetronomeVolume(Number(e.target.value)),
                })
              }
            />
          </div>
        </label>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Dźwięk metronomu</legend>
        <div className={styles.timbreRow}>
          <Select
            value={metro.timbre}
            aria-label="Dźwięk metronomu"
            onChange={(e) =>
              onMetroChange({
                ...metro,
                timbre: e.target.value as MetronomeTimbre,
              })
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
            onClick={onPreviewClick}
          >
            Odsłuch
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
