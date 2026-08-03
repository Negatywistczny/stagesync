/**
 * Vertical VU / peak meter (−60…+6 dB).
 * LED zones: green &lt; −12 dB, yellow −12…0, red &gt; 0 (fixed to track height).
 * Live levels paint via {@link registerMeterColumn} (ballistics outside React).
 */

import { useEffect, useRef, type RefObject } from "react";
import {
  meterDbPeakBand,
  meterDbToUnit,
  METER_DB_MAX,
  METER_DB_MIN,
} from "@stagesync/shared";
import { registerMeterColumn } from "./meterPaint.js";
import styles from "./PeakMeter.module.css";

export type PeakMeterProps = {
  /** Peak level in dB (METER_DB_MIN…METER_DB_MAX). Static / SSR / tests. */
  db: number;
  /** Optional second channel (Stereo Out R / stereo track). */
  dbR?: number;
  /**
   * Live paint keys (`meterPaintKey(...)`). When set, DOM updates come from
   * the mixer rAF bus — `db` / `dbR` are initial only.
   */
  paintKeyL?: string;
  paintKeyR?: string;
  /** Show L/R under dual bars (Stereo Out). Default true when dual. */
  showChannelLabels?: boolean;
  className?: string;
  "aria-label"?: string;
};

function MeterColumn({
  db,
  label,
  paintKey,
  rootRef,
}: {
  db: number;
  label?: string;
  paintKey?: string;
  rootRef?: RefObject<HTMLDivElement | null>;
}) {
  const dimRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const unit = meterDbToUnit(db);
  const band = meterDbPeakBand(db);
  const dimPct = Math.round((1 - unit) * 1000) / 10;

  useEffect(() => {
    if (!paintKey) return;
    const dim = dimRef.current;
    const track = trackRef.current;
    if (!dim || !track) return;
    return registerMeterColumn(paintKey, {
      dim,
      track,
      root: rootRef?.current ?? undefined,
    });
  }, [paintKey, rootRef]);

  return (
    <div className={styles.column} aria-hidden={label ? undefined : true}>
      <div
        ref={trackRef}
        className={styles.track}
        data-band={band}
      >
        <div className={styles.leds} aria-hidden />
        <div
          ref={dimRef}
          className={styles.dim}
          style={paintKey ? undefined : { height: `${dimPct}%` }}
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
  paintKeyL,
  paintKeyR,
  showChannelLabels,
  className,
  "aria-label": ariaLabel = "Poziom",
}: PeakMeterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dual = dbR != null || paintKeyR != null;
  const labels = dual && showChannelLabels !== false;
  return (
    <div
      ref={rootRef}
      className={[styles.root, dual ? styles.dual : "", className]
        .filter(Boolean)
        .join(" ")}
      role="meter"
      aria-label={ariaLabel}
      aria-valuemin={METER_DB_MIN}
      aria-valuemax={METER_DB_MAX}
      aria-valuenow={Math.round(db)}
    >
      <MeterColumn
        db={db}
        label={labels ? "L" : undefined}
        paintKey={paintKeyL}
        rootRef={rootRef}
      />
      {dual ? (
        <MeterColumn
          db={dbR ?? METER_DB_MIN}
          label={labels ? "R" : undefined}
          paintKey={paintKeyR}
        />
      ) : null}
    </div>
  );
}
