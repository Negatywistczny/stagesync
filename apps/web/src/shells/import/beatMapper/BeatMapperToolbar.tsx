import { Button, Input } from "@stagesync/ui";
import { IconPause, IconPlay } from "../../icons.js";
import styles from "../BeatMapperPane.module.css";

export type BeatMapperToolbarProps = {
  disabled: boolean;
  playing: boolean;
  hasLocalAudio: boolean;
  audioStartOffsetMs: number;
  gridBpmDisplay: string;
  onTogglePlay: () => void;
  onAudioStartOffsetChange: (ms: number) => void;
  onSetBeat1AtCursor: () => void;
  onGridBpmChange: (raw: string) => void;
};

export function BeatMapperToolbar({
  disabled,
  playing,
  hasLocalAudio,
  audioStartOffsetMs,
  gridBpmDisplay,
  onTogglePlay,
  onAudioStartOffsetChange,
  onSetBeat1AtCursor,
  onGridBpmChange,
}: BeatMapperToolbarProps) {
  return (
    <>
      <div
        className={styles.toolbar}
        role="toolbar"
        aria-label="Beat Mapper"
      >
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || !hasLocalAudio}
          onClick={onTogglePlay}
        >
          <span className={styles.playBtn}>
            {playing ? <IconPause /> : <IconPlay />}
            {playing ? "Pauza" : "Play"}
          </span>
        </Button>
        <span className={styles.toolbarSep} aria-hidden />
        <label className={styles.offsetInline}>
          Audio Start Offset (ms)
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={String(audioStartOffsetMs)}
            disabled={disabled}
            aria-label="Audio Start Offset ms"
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              onAudioStartOffsetChange(
                Number.isFinite(n) && n >= 0 ? n : 0,
              );
            }}
          />
        </label>
        <span className={styles.toolbarSep} aria-hidden />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={onSetBeat1AtCursor}
        >
          Ustaw Beat 1 w miejscu kursora
        </Button>
      </div>
      <div className={styles.metaRow}>
        <label className={styles.bpmField}>
          Tempo
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={40}
            max={300}
            value={gridBpmDisplay}
            aria-label="Tempo siatki (BPM)"
            disabled={disabled}
            onChange={(e) => onGridBpmChange(e.target.value)}
          />
          <span aria-hidden>BPM</span>
        </label>
      </div>
    </>
  );
}
