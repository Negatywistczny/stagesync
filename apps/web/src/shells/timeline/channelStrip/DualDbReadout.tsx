/**
 * Dual meter readout: Set dB (fader) | Peak Hold (click to clear).
 */

import {
  formatPeakHoldDb,
  type PeakHoldState,
} from "@stagesync/shared";
import styles from "./ChannelStripControls.module.css";

export type DualDbReadoutProps = {
  gainDb: number;
  hold: PeakHoldState;
  /** Stereo Out may pass max(L,R) hold already merged. */
  onGainReset: () => void;
  onHoldClear: () => void;
  gainAriaLabel?: string;
  holdAriaLabel?: string;
};

export function DualDbReadout({
  gainDb,
  hold,
  onGainReset,
  onHoldClear,
  gainAriaLabel = "Poziom fadera",
  holdAriaLabel = "Peak Hold — kliknij aby wyzerować",
}: DualDbReadoutProps) {
  return (
    <div className={styles.dualReadout}>
      <button
        type="button"
        className={styles.gainBox}
        title="Dwuklik — 0.0 dB"
        aria-label={gainAriaLabel}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onGainReset();
        }}
      >
        {gainDb.toFixed(1)}
      </button>
      <button
        type="button"
        className={[
          styles.peakHoldBox,
          hold.clipped ? styles.peakHoldClipped : "",
        ]
          .filter(Boolean)
          .join(" ")}
        title={holdAriaLabel}
        aria-label={holdAriaLabel}
        onClick={(e) => {
          e.stopPropagation();
          onHoldClear();
        }}
      >
        {formatPeakHoldDb(hold.holdDb)}
      </button>
    </div>
  );
}
