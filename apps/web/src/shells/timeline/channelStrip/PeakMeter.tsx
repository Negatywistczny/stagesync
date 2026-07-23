/**
 * Vertical VU / peak meter (−60…+6 dB) from live analyser peaks.
 * LED zones: green &lt; −6 dB, yellow −6…0, red &gt; 0 (fixed to track height).
 */

import {
  meterDbPeakBand,
  meterDbToUnit,
  METER_DB_MAX,
  METER_DB_MIN,
} from "@stagesync/shared";
import styles from "./PeakMeter.module.css";

export type PeakMeterProps = {
  /** Peak level in dB (METER_DB_MIN…METER_DB_MAX). */
  db: number;
  /** Optional second channel (Stereo Out R / stereo track). */
  dbR?: number;
  /** Show L/R under dual bars (Stereo Out). Default true when dual. */
  showChannelLabels?: boolean;
  className?: string;
  "aria-label"?: string;
};

function MeterColumn({ db, label }: { db: number; label?: string }) {
  const unit = meterDbToUnit(db);
  const band = meterDbPeakBand(db);
  const dimPct = Math.round((1 - unit) * 1000) / 10;
  return (
    <div className={styles.column} aria-hidden={label ? undefined : true}>
      <div className={styles.track} data-band={band}>
        <div className={styles.leds} aria-hidden />
        <div
          className={styles.dim}
          style={{ height: `${dimPct}%` }}
          aria-hidden
        />
      </div>
      {label ? <span className={styles.chLabel}>{label}</span> : null}
    </div>
  );
}

export function PeakMeter({
  db,
  dbR,
  showChannelLabels,
  className,
  "aria-label": ariaLabel = "Poziom",
}: PeakMeterProps) {
  const dual = dbR != null;
  const labels = dual && showChannelLabels !== false;
  return (
    <div
      className={[styles.root, dual ? styles.dual : "", className]
        .filter(Boolean)
        .join(" ")}
      role="meter"
      aria-label={ariaLabel}
      aria-valuemin={METER_DB_MIN}
      aria-valuemax={METER_DB_MAX}
      aria-valuenow={Math.round(db)}
    >
      <MeterColumn db={db} label={labels ? "L" : undefined} />
      {dual ? <MeterColumn db={dbR} label={labels ? "R" : undefined} /> : null}
    </div>
  );
}
