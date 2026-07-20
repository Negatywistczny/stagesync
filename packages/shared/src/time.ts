/**
 * Pure time helpers for StageSync.
 *
 * Canonical engine timebase: integer ticks + fixed PPQ.
 * BBT is display/API only — see docs/adr/0002-timebase-ssot.md.
 * Never mutate inputs — return new values only.
 *
 * Axis math always uses floorDiv + euclidMod (never raw `%` / trunc) so
 * negative pre-roll ticks stay correct.
 */

export const DEFAULT_PPQ = 960;

export type TimeSignature = {
  numerator: number;
  denominator: number;
};

/** Bar 0-based; beat is local meter beat 1..numerator; tick within that beat. */
export type Bbt = {
  bar: number;
  beat: number;
  tick: number;
};

/** Floor division toward −∞ (not trunc). */
function floorDiv(n: number, d: number): number {
  return Math.floor(n / d);
}

/** Euclidean remainder in [0, d). */
function euclidMod(n: number, d: number): number {
  return ((n % d) + d) % d;
}

function ticksPerBeat(ts: TimeSignature, ppq: number): number {
  return (ppq * 4) / ts.denominator;
}

/**
 * Local meter beat length in ticks: PPQ * 4 / denominator.
 *
 * @example
 * localTicksPerBeat({ numerator: 4, denominator: 4 }) // 960
 * localTicksPerBeat({ numerator: 5, denominator: 8 }) // 480
 */
export function localTicksPerBeat(
  ts: TimeSignature,
  ppq: number = DEFAULT_PPQ,
): number {
  assertValidTimeSignature(ts, ppq);
  return ticksPerBeat(ts, ppq);
}

/**
 * Musical ticks advanced per wall-clock millisecond at the given BPM.
 * Float only in this conversion; callers floor to integer position ticks.
 */
export function ticksPerMs(
  bpm: number,
  ts: TimeSignature,
  ppq: number = DEFAULT_PPQ,
): number {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new RangeError("bpm must be a finite number > 0");
  }
  const perBeat = localTicksPerBeat(ts, ppq);
  const msPerBeat = 60_000 / bpm;
  return perBeat / msPerBeat;
}

/**
 * Elapsed wall time → integer tick delta (floor toward −∞ for negative elapsed).
 */
export function elapsedToTicks(
  elapsedMs: number,
  bpm: number,
  ts: TimeSignature,
  ppq: number = DEFAULT_PPQ,
): number {
  if (!Number.isFinite(elapsedMs)) {
    throw new RangeError("elapsedMs must be finite");
  }
  return Math.floor(elapsedMs * ticksPerMs(bpm, ts, ppq));
}

/**
 * Integer tick delta → wall-clock milliseconds (float; inverse of ticksPerMs).
 * Pure — no Date.now(). Callers schedule audio from transport ticks.
 */
export function ticksToMs(
  ticks: number,
  bpm: number,
  ts: TimeSignature,
  ppq: number = DEFAULT_PPQ,
): number {
  if (!Number.isFinite(ticks)) {
    throw new RangeError("ticks must be finite");
  }
  return ticks / ticksPerMs(bpm, ts, ppq);
}

/**
 * Validates a time signature for the given PPQ.
 * Throws when numerator/denominator are invalid or ticks-per-bar is not an integer.
 */
export function assertValidTimeSignature(
  ts: TimeSignature,
  ppq: number = DEFAULT_PPQ,
): void {
  if (
    !Number.isFinite(ts.numerator) ||
    !Number.isFinite(ts.denominator) ||
    !Number.isInteger(ts.numerator) ||
    !Number.isInteger(ts.denominator) ||
    ts.numerator <= 0 ||
    ts.denominator <= 0 ||
    !Number.isFinite(ppq) ||
    !Number.isInteger(ppq) ||
    ppq <= 0
  ) {
    throw new RangeError("Invalid time signature or PPQ");
  }
  const perBeat = ticksPerBeat(ts, ppq);
  const perBar = ts.numerator * perBeat;
  if (!Number.isInteger(perBeat) || !Number.isInteger(perBar)) {
    throw new RangeError(
      "ticksPerBar must be an integer for the given PPQ and meter",
    );
  }
}

/**
 * Ticks in one bar: numerator * (PPQ * 4 / denominator).
 * Throws when the result is not an integer.
 *
 * @example
 * ticksPerBar({ numerator: 4, denominator: 4 }) // 3840
 * ticksPerBar({ numerator: 5, denominator: 8 }) // 2400
 */
export function ticksPerBar(
  ts: TimeSignature,
  ppq: number = DEFAULT_PPQ,
): number {
  assertValidTimeSignature(ts, ppq);
  return ts.numerator * ticksPerBeat(ts, ppq);
}

/**
 * Converts integer position ticks to BBT (bar 0-based; beat 1..numerator).
 * Supports negative ticks (pre-roll).
 *
 * @example
 * // 5/8, PPQ 960: one local beat = 480 ticks
 * ticksToBbt(480, { numerator: 5, denominator: 8 })
 * // → { bar: 0, beat: 2, tick: 0 }
 *
 * // Pre-roll: last tick of display bar 0 (math bar −1) in 4/4
 * ticksToBbt(-1, { numerator: 4, denominator: 4 })
 * // → { bar: -1, beat: 4, tick: 959 }
 */
export function ticksToBbt(
  ticks: number,
  ts: TimeSignature,
  ppq: number = DEFAULT_PPQ,
): Bbt {
  if (!Number.isFinite(ticks) || !Number.isInteger(ticks)) {
    throw new RangeError("ticks must be a finite integer");
  }
  const perBar = ticksPerBar(ts, ppq);
  const perBeat = ticksPerBeat(ts, ppq);
  const bar = floorDiv(ticks, perBar);
  const offsetInBar = euclidMod(ticks, perBar);
  const beatIndex0 = floorDiv(offsetInBar, perBeat);
  const tick = euclidMod(offsetInBar, perBeat);
  return { bar, beat: beatIndex0 + 1, tick };
}

/**
 * Converts BBT to integer ticks. Round-trips with ticksToBbt, including bar < 0.
 *
 * @example
 * bbtToTicks(0, 2, 0, { numerator: 5, denominator: 8 }) // 480
 * bbtToTicks(-1, 4, 959, { numerator: 4, denominator: 4 }) // -1
 */
export function bbtToTicks(
  bar: number,
  beat: number,
  tick: number,
  ts: TimeSignature,
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
  const perBar = ticksPerBar(ts, ppq);
  const perBeat = ticksPerBeat(ts, ppq);
  if (beat < 1 || beat > ts.numerator) {
    throw new RangeError(
      `beat must be between 1 and ${ts.numerator}, got ${beat}`,
    );
  }
  if (tick < 0 || tick >= perBeat) {
    throw new RangeError(
      `tick must be between 0 and ${perBeat - 1}, got ${tick}`,
    );
  }
  return bar * perBar + (beat - 1) * perBeat + tick;
}

/**
 * Math bar (0-based) → display bar (1-based; pre-roll ≤ 0).
 *
 * @example
 * toDisplayBar(0) // 1  — song start
 * toDisplayBar(-1) // 0 — count-in / pre-roll
 */
export function toDisplayBar(bar: number): number {
  return bar + 1;
}

/**
 * Display bar (1-based) → math bar (0-based).
 *
 * @example
 * fromDisplayBar(1) // 0
 * fromDisplayBar(0) // -1
 */
export function fromDisplayBar(displayBar: number): number {
  return displayBar - 1;
}

/** Integer quarter notes → ticks (for future 4.x migrator). */
export function quartersToTicks(
  quarters: number,
  ppq: number = DEFAULT_PPQ,
): number {
  if (
    !Number.isFinite(quarters) ||
    !Number.isInteger(quarters) ||
    !Number.isFinite(ppq) ||
    !Number.isInteger(ppq) ||
    ppq <= 0
  ) {
    throw new RangeError("quarters and ppq must be finite integers; ppq > 0");
  }
  return quarters * ppq;
}

/**
 * Legacy 4.x `startAbs` (float quarter notes) → integer ticks.
 * Single ACL rounding rule for the migrator ([ADR 0002](../../docs/adr/0002-timebase-ssot.md)).
 */
export function absBeatToTicks(
  absBeat: number,
  ppq: number = DEFAULT_PPQ,
): number {
  if (!Number.isFinite(absBeat)) {
    throw new RangeError("absBeat must be finite");
  }
  if (!Number.isFinite(ppq) || !Number.isInteger(ppq) || ppq <= 0) {
    throw new RangeError("ppq must be a positive integer");
  }
  return Math.round(absBeat * ppq);
}

/** Ticks → integer quarter notes (floor toward −∞). */
export function ticksToQuarters(
  ticks: number,
  ppq: number = DEFAULT_PPQ,
): number {
  if (
    !Number.isFinite(ticks) ||
    !Number.isInteger(ticks) ||
    !Number.isFinite(ppq) ||
    !Number.isInteger(ppq) ||
    ppq <= 0
  ) {
    throw new RangeError("ticks and ppq must be finite integers; ppq > 0");
  }
  return floorDiv(ticks, ppq);
}
