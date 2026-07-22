/**
 * BBT conversion that walks meterMap bar-by-bar (not “current meter from tick 0”).
 * Pure — clock from caller. See ADR 0002.
 */

import {
  DEFAULT_PPQ,
  bbtToTicks,
  ticksPerBar,
  ticksToBbt,
  type Bbt,
  type TimeSignature,
} from "./time.js";

export type MeterMapEvent = {
  startTicks: number;
  numerator: number;
  denominator: number;
};

const MAX_BARS = 100_000;

export function resolveMeterAtTicks(
  positionTicks: number,
  defaultMeter: TimeSignature,
  meterMap: readonly MeterMapEvent[],
): TimeSignature {
  const sorted = [...meterMap].sort((a, b) => a.startTicks - b.startTicks);
  let active: MeterMapEvent | null = null;
  for (const ev of sorted) {
    if (ev.startTicks <= positionTicks) active = ev;
    else break;
  }
  if (active) {
    return { numerator: active.numerator, denominator: active.denominator };
  }
  return { ...defaultMeter };
}

/**
 * Ticks → BBT using successive bar lengths from meterMap.
 * Pre-roll (ticks &lt; 0) uses defaultMeter only (Countdown is typically constant meter).
 */
export function ticksToBbtAlongMeterMap(
  ticks: number,
  defaultMeter: TimeSignature,
  meterMap: readonly MeterMapEvent[],
  ppq: number = DEFAULT_PPQ,
): Bbt {
  if (!Number.isFinite(ticks) || !Number.isInteger(ticks)) {
    throw new RangeError("ticks must be a finite integer");
  }
  if (ticks < 0) {
    return ticksToBbt(ticks, defaultMeter, ppq);
  }

  let cursor = 0;
  let bar = 0;
  while (bar < MAX_BARS) {
    const meter = resolveMeterAtTicks(cursor, defaultMeter, meterMap);
    const perBar = ticksPerBar(meter, ppq);
    if (cursor + perBar > ticks) {
      const local = ticksToBbt(ticks - cursor, meter, ppq);
      return { bar: bar + local.bar, beat: local.beat, tick: local.tick };
    }
    cursor += perBar;
    bar += 1;
  }
  throw new RangeError("ticksToBbtAlongMeterMap exceeded max bars");
}

/**
 * BBT → ticks walking meterMap. Round-trips with ticksToBbtAlongMeterMap for
 * positions that land on valid beats of the active meter.
 */
export function bbtToTicksAlongMeterMap(
  bar: number,
  beat: number,
  tick: number,
  defaultMeter: TimeSignature,
  meterMap: readonly MeterMapEvent[],
  ppq: number = DEFAULT_PPQ,
): number {
  if (
    !Number.isFinite(bar) ||
    !Number.isFinite(beat) ||
    !Number.isFinite(tick) ||
    !Number.isInteger(bar) ||
    !Number.isInteger(beat) ||
    !Number.isInteger(tick)
  ) {
    throw new RangeError("bar, beat, and tick must be finite integers");
  }
  if (bar < 0) {
    return bbtToTicks(bar, beat, tick, defaultMeter, ppq);
  }

  let ticks = 0;
  for (let b = 0; b < bar; b += 1) {
    const meter = resolveMeterAtTicks(ticks, defaultMeter, meterMap);
    ticks += ticksPerBar(meter, ppq);
  }
  const meter = resolveMeterAtTicks(ticks, defaultMeter, meterMap);
  return ticks + bbtToTicks(0, beat, tick, meter, ppq);
}
