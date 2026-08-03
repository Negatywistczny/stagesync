/**
 * Imperative peak-meter paint bus — rAF writes targets + ballistics → DOM,
 * without React setState every frame (Mixer strip re-render stutter).
 */

import {
  advanceMeterBallistics,
  linearPeakToMeterDb,
  meterDbPeakBand,
  meterDbToUnit,
  METER_DB_MIN,
} from "@stagesync/shared";

const FLOOR = linearPeakToMeterDb(0);

export type MeterPaintColumn = {
  dim: HTMLElement;
  track: HTMLElement;
  /** Optional `role=meter` root for aria-valuenow (L / mono). */
  root?: HTMLElement;
};

const columns = new Map<string, MeterPaintColumn>();
const targets = new Map<string, number>();
const display = new Map<string, number>();

export function meterPaintKey(
  kind: "track" | "bus" | "hw" | "master" | "click",
  id: string,
  ch: "l" | "r" = "l",
): string {
  return `${kind}:${id}:${ch}`;
}

export function registerMeterColumn(
  key: string,
  column: MeterPaintColumn,
): () => void {
  columns.set(key, column);
  const db = display.get(key) ?? targets.get(key) ?? FLOOR;
  paintColumn(column, db);
  return () => {
    if (columns.get(key) === column) columns.delete(key);
  };
}

/** Publish raw analyser peaks for this frame (before {@link tickMeterPaint}). */
export function setMeterPaintTarget(key: string, db: number): void {
  targets.set(key, Number.isFinite(db) ? db : FLOOR);
}

export function clearMeterPaintTargets(keys?: readonly string[]): void {
  if (!keys) {
    targets.clear();
    display.clear();
    for (const [key, col] of columns) {
      display.set(key, FLOOR);
      paintColumn(col, FLOOR);
    }
    return;
  }
  for (const key of keys) {
    targets.set(key, FLOOR);
    display.set(key, FLOOR);
    const col = columns.get(key);
    if (col) paintColumn(col, FLOOR);
  }
}

/**
 * Advance ballistics for all registered columns and write DOM.
 * Call once per mixer rAF after publishing targets.
 */
export function tickMeterPaint(dtSec: number): void {
  for (const [key, col] of columns) {
    const target = targets.get(key) ?? FLOOR;
    const prev = display.get(key) ?? FLOOR;
    const next = advanceMeterBallistics(prev, target, dtSec);
    display.set(key, next);
    paintColumn(col, next);
  }
}

function paintColumn(col: MeterPaintColumn, db: number): void {
  const unit = meterDbToUnit(db);
  const dimPct = Math.round((1 - unit) * 1000) / 10;
  col.dim.style.height = `${dimPct}%`;
  col.track.dataset.band = meterDbPeakBand(db);
  if (col.root) {
    col.root.setAttribute("aria-valuenow", String(Math.round(db)));
  }
}

/** Test helper — current ballistic display for a key. */
export function readMeterPaintDisplay(key: string): number {
  return display.get(key) ?? METER_DB_MIN;
}
