/**
 * Edit snap / quantize grid for Timeline tools.
 *
 * Storage & transport remain integer ticks ([ADR 0002](../../docs/adr/0002-timebase-ssot.md)).
 * Snap is UI edit policy only ([ADR 0007](../../docs/adr/0007-snap-grid.md)).
 */

import {
  resolveMeterAtTicks,
  type MeterMapEvent,
} from "./meter-map-bbt.js";
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
  /** When set with meterMap, bar mode walks musical barlines (not meter@tick from 0). */
  defaultMeter?: TimeSignature;
  meterMap?: readonly MeterMapEvent[];
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
 * Nearest musical barline walking meterMap (midpoint → earlier).
 * Pre-roll (ticks &lt; 0) uses constant defaultMeter like {@link snapTicksToBarStart}.
 */
export function snapTicksToBarStartAlongMeterMap(
  ticks: number,
  defaultMeter: TimeSignature,
  meterMap: readonly MeterMapEvent[],
  ppq: number = DEFAULT_PPQ,
): number {
  if (!Number.isFinite(ticks) || !Number.isInteger(ticks)) {
    throw new RangeError("ticks must be a finite integer");
  }
  if (ticks < 0) {
    return snapTicksToBarStart(ticks, defaultMeter, ppq);
  }

  let prev = 0;
  let cursor = 0;
  let guard = 0;
  while (guard < 100_000) {
    const meter = resolveMeterAtTicks(cursor, defaultMeter, meterMap);
    const perBar = ticksPerBar(meter, ppq);
    const next = cursor + perBar;
    if (ticks >= cursor && ticks < next) {
      if (ticks - cursor <= next - ticks) return cursor;
      return next;
    }
    if (ticks === next) return next;
    prev = cursor;
    cursor = next;
    guard += 1;
    if (cursor > ticks + perBar) {
      // Should have returned inside loop; fall back.
      return prev;
    }
  }
  throw new RangeError("snapTicksToBarStartAlongMeterMap exceeded max bars");
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
      snapped =
        ctx.defaultMeter != null && ctx.meterMap != null
          ? snapTicksToBarStartAlongMeterMap(
              ticks,
              ctx.defaultMeter,
              ctx.meterMap,
              ppq,
            )
          : snapTicksToBarStart(ticks, ctx.meter, ppq);
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
