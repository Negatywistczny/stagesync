/**
 * Edit snap / quantize grid for Timeline tools.
 *
 * Storage & transport remain integer ticks ([ADR 0002](../../docs/adr/0002-timebase-ssot.md)).
 * Snap is UI edit policy only ([ADR 0007](../../docs/adr/0007-snap-grid.md)).
 */

import {
  DEFAULT_PPQ,
  localTicksPerBeat,
  ticksPerBar,
  type TimeSignature,
} from "./time.js";

/** Subdivision of a quarter note (Logic-style: 1/8 = eighth of quarter). */
export type SnapSubdivisionParts = 2 | 4 | 8 | 16;

export type SnapMode =
  | "off"
  | "bar"
  | "beat"
  | { kind: "subdivision"; parts: SnapSubdivisionParts };

export type SnapContext = {
  meter: TimeSignature;
  ppq?: number;
  /** Countdown end / content floor — clamp after snap (v4 contentFloorAbs). */
  contentFloorTicks?: number;
};

/** Domyślna kwantyzacja edycji: **miara** (początek taktu). Stała na stałe — picker tylko override. */
export const DEFAULT_SNAP_MODE: SnapMode = "bar";

function floorDiv(n: number, d: number): number {
  return Math.floor(n / d);
}

function resolvePpq(ctx: SnapContext): number {
  return ctx.ppq ?? DEFAULT_PPQ;
}

/**
 * Snap to musical bar **start** @ meter; midpoint tie → earlier barline (v4 snapAbsToBarStart).
 */
export function snapTicksToBarStart(
  ticks: number,
  meter: TimeSignature,
  ppq: number = DEFAULT_PPQ,
): number {
  const perBar = ticksPerBar(meter, ppq);
  const barIndex = floorDiv(ticks, perBar);
  const start = barIndex * perBar;
  const end = start + perBar;
  if (end <= start) return start;
  if (ticks - start <= end - ticks) return start;
  return end;
}

/**
 * Snap to local beat grid (v4 quantizeAbsBeat / beatUnitQuarters).
 */
export function snapTicksToBeatGrid(
  ticks: number,
  meter: TimeSignature,
  ppq: number = DEFAULT_PPQ,
): number {
  const step = localTicksPerBeat(meter, ppq);
  return Math.round(ticks / step) * step;
}

/**
 * Snap to uniform subdivision of a quarter note (PPQ / parts).
 */
export function snapTicksToSubdivision(
  ticks: number,
  parts: SnapSubdivisionParts,
  ppq: number = DEFAULT_PPQ,
): number {
  if (![2, 4, 8, 16].includes(parts)) {
    throw new RangeError("parts must be 2, 4, 8, or 16");
  }
  const step = ppq / parts;
  if (!Number.isInteger(step)) {
    throw new RangeError("PPQ must be divisible by subdivision parts");
  }
  return Math.round(ticks / step) * step;
}

function applyContentFloor(ticks: number, ctx: SnapContext): number {
  const floor = ctx.contentFloorTicks;
  if (floor == null) return ticks;
  return ticks < floor ? floor : ticks;
}

/**
 * Quantize edit position to the active snap mode.
 */
export function quantizeTicks(
  ticks: number,
  mode: SnapMode,
  ctx: SnapContext,
): number {
  if (!Number.isFinite(ticks) || !Number.isInteger(ticks)) {
    throw new RangeError("ticks must be a finite integer");
  }
  const ppq = resolvePpq(ctx);

  let snapped: number;
  switch (mode) {
    case "off":
      snapped = ticks;
      break;
    case "bar":
      snapped = snapTicksToBarStart(ticks, ctx.meter, ppq);
      break;
    case "beat":
      snapped = snapTicksToBeatGrid(ticks, ctx.meter, ppq);
      break;
    default:
      snapped = snapTicksToSubdivision(ticks, mode.parts, ppq);
      break;
  }

  return applyContentFloor(snapped, ctx);
}
