import { BPM_MAX } from "../schema.js";
import { DEFAULT_PPQ, type TimeSignature } from "../time.js";
import { SMART_TEMPO_MAX_BEATS } from "./constants.js";
import { evaluateDriftGate } from "./drift-gate.js";

/**
 * Snap wall-clock ms to the nearest beat on a precomputed audio grid.
 */
export function snapMsToNearestBeat(
  ms: number,
  beatMs: readonly number[],
): number {
  if (beatMs.length === 0) return Math.max(0, ms);
  if (ms <= beatMs[0]!) return beatMs[0]!;
  const last = beatMs[beatMs.length - 1]!;
  if (ms >= last) return last;
  let lo = 0;
  let hi = beatMs.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((beatMs[mid] ?? 0) < ms) lo = mid + 1;
    else hi = mid;
  }
  const a = beatMs[Math.max(0, lo - 1)]!;
  const b = beatMs[lo]!;
  return Math.abs(ms - a) <= Math.abs(ms - b) ? a : b;
}

/**
 * Extend a partial beat grid to cover the full audio duration at ~constant tempo.
 * Required when UI analysis only scans an initial window (e.g. 30 s) but the
 * song / Beat-1 offset (#GAP) extends further.
 */
export function extendBeatGridToDuration(
  beatMs: readonly number[],
  durationMs: number,
  bpm: number,
  maxBeats: number = SMART_TEMPO_MAX_BEATS,
): number[] {
  if (!(durationMs > 0) || !(bpm > 0))
    return beatMs.length > 0 ? [...beatMs] : [];
  const period =
    beatMs.length >= 2
      ? (beatMs[beatMs.length - 1]! - beatMs[0]!) / (beatMs.length - 1)
      : 60_000 / bpm;
  if (!(period > 0)) return beatMs.length > 0 ? [...beatMs] : [0];
  const out: number[] = beatMs.length > 0 ? [...beatMs] : [0];
  let t = out[out.length - 1]!;
  while (t + period * 0.5 < durationMs && out.length < maxBeats) {
    t += period;
    out.push(Math.round(t));
  }
  return out;
}

/**
 * Refine a beat grid against onset observations using Drift Gate per beat.
 */
function findOnsetNearExpected(
  onsetsMs: readonly number[],
  expected: number,
  windowMs: number,
): number | null {
  if (onsetsMs.length === 0 || !(windowMs > 0)) return null;
  const minMs = expected - windowMs;
  const maxMs = expected + windowMs;
  let lo = 0;
  let hi = onsetsMs.length - 1;
  let startIdx = onsetsMs.length;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((onsetsMs[mid] ?? 0) >= minMs) {
      startIdx = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  let best: number | null = null;
  let bestDist = windowMs + 1;
  for (let i = startIdx; i < onsetsMs.length; i++) {
    const o = onsetsMs[i]!;
    if (o > maxMs) break;
    const d = Math.abs(o - expected);
    if (d <= windowMs && d < bestDist) {
      best = o;
      bestDist = d;
    }
  }
  return best;
}

export function refineBeatGridWithOnsets(
  beatMs: readonly number[],
  onsetsMs: readonly number[],
  seedBpm: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq: number = DEFAULT_PPQ,
): number[] {
  if (beatMs.length === 0) return [];
  const cappedBeats = beatMs.slice(0, SMART_TEMPO_MAX_BEATS);
  const out: number[] = [cappedBeats[0]!];
  for (let i = 1; i < cappedBeats.length; i++) {
    const expected = cappedBeats[i]!;
    const prev = out[out.length - 1]!;
    const period = expected - (cappedBeats[i - 1] ?? prev);
    const windowMs = period * 0.15;
    const near = findOnsetNearExpected(onsetsMs, expected, windowMs);
    const observed = near ?? expected;
    const gate = evaluateDriftGate(observed, expected, {
      seedBpm,
      meter,
      ppq,
    });
    if (gate.action === "node") {
      out.push(gate.wallMs);
    } else {
      out.push(expected);
    }
  }
  return out;
}

/** Index of the beat closest to `targetMs` on an absolute audio beat grid. */
export function closestBeatIndex(
  beatMs: readonly number[],
  targetMs: number,
): number {
  if (beatMs.length === 0) return 0;
  let best = 0;
  let bestDist = Math.abs((beatMs[0] ?? 0) - targetMs);
  for (let i = 1; i < beatMs.length; i++) {
    const d = Math.abs((beatMs[i] ?? 0) - targetMs);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Median BPM from inter-beat intervals (ignores outliers outside 40–240 BPM).
 * Used as audio seed when the beat grid is trustworthy.
 * After the first median, drops double-time / half-time IBI outliers and
 * recomputes so a brief subdivision cluster cannot inflate the Adapt seed.
 */
export function medianBpmFromBeatMs(beatMs: readonly number[]): number {
  if (beatMs.length < 3) return 0;
  const intervals: number[] = [];
  for (let i = 1; i < beatMs.length; i++) {
    const dt = (beatMs[i] ?? 0) - (beatMs[i - 1] ?? 0);
    if (dt >= 250 && dt <= 1_500) intervals.push(dt);
  }
  if (intervals.length < 2) return 0;
  intervals.sort((a, b) => a - b);
  let median = intervals[Math.floor(intervals.length / 2)]!;
  const robust = intervals.filter(
    (dt) => dt >= median * 0.75 && dt <= median * 1.35,
  );
  if (robust.length >= 2) {
    const sorted = robust.slice().sort((a, b) => a - b);
    median = sorted[Math.floor(sorted.length / 2)]!;
  }
  const bpm = 60_000 / median;
  if (!(bpm >= 40 && bpm <= 300)) return 0;
  return Math.round(bpm * 100) / 100;
}

/**
 * Replace double-time / half-time IBI blips in place so a single dense onset
 * cluster cannot create a multi-BPM Adapt wall when sparse nodes average wall
 * time over 1–2 bars. When a short IBI is followed by a compensating long
 * (classic false 8th-note snap), both sides are restored to the median.
 * Unpaired outliers shift the beat (and all later beats by the same Δ) so
 * subsequent IBIs stay intact — no cascade of new shorts.
 */
export function sanitizeBeatGridIbis(
  beatMs: readonly number[],
  seedBpm: number = 0,
): number[] {
  if (beatMs.length < 3) return beatMs.length > 0 ? [...beatMs] : [];
  const out = beatMs.map((ms) => ms);
  const raw: number[] = [];
  for (let i = 1; i < out.length; i++) {
    const dt = out[i]! - out[i - 1]!;
    if (dt > 0) raw.push(dt);
  }
  if (raw.length === 0) return out;
  const sorted = raw.slice().sort((a, b) => a - b);
  let median = sorted[Math.floor(sorted.length / 2)]!;
  const robust = raw.filter((dt) => dt >= median * 0.75 && dt <= median * 1.35);
  if (robust.length >= 2) {
    const rs = robust.slice().sort((a, b) => a - b);
    median = rs[Math.floor(rs.length / 2)]!;
  }
  if (seedBpm > 0) {
    const seedPeriod = 60_000 / seedBpm;
    if (median < seedPeriod * 0.7 || median > seedPeriod * 1.4) {
      median = seedPeriod;
    }
  }
  const lo = median * 0.78;
  const hi = median * 1.28;

  const shiftFrom = (startIdx: number, delta: number) => {
    if (delta === 0) return;
    for (let j = startIdx; j < out.length; j++) {
      out[j] = out[j]! + delta;
    }
  };

  for (let i = 1; i < out.length - 1; i++) {
    const dt = out[i]! - out[i - 1]!;
    if (dt >= lo && dt <= hi) continue;
    const dtNext = out[i + 1]! - out[i]!;
    const pair = dt + dtNext;
    // False half-beat snap: short then compensating long (or the reverse).
    if (pair >= median * 1.6 && pair <= median * 2.4) {
      out[i] = Math.round(out[i - 1]! + median);
      continue;
    }
    const target = Math.round(out[i - 1]! + median);
    shiftFrom(i, target - out[i]!);
  }
  if (out.length >= 2) {
    const last = out.length - 1;
    const dt = out[last]! - out[last - 1]!;
    if (dt < lo || dt > hi) {
      out[last] = Math.round(out[last - 1]! + median);
    }
  }
  return out;
}

/**
 * Uniformly rescale beat times around the first beat so median IBI matches
 * `targetBpm`. Preserves relative rubato while correcting systematic AC/IBI
 * bias (e.g. analysis ~112 vs seed ~120) **and** half-time grids (~64 → ~128).
 */
export function rescaleBeatGridToBpm(
  beatMs: readonly number[],
  targetBpm: number,
): number[] {
  if (beatMs.length < 2 || !(targetBpm > 0)) {
    return beatMs.length > 0 ? [...beatMs] : [];
  }
  const median = medianBpmFromBeatMs(beatMs);
  if (!(median > 0)) return [...beatMs];
  const rel = Math.abs(median - targetBpm) / targetBpm;
  // Allow ~octave corrections (rel≈0.5) as well as small AC bias (≤25%).
  if (rel < 0.03 || rel > 0.55) return [...beatMs];
  // period_new = period_old * (median / target) → shrink when median is low
  const scale = median / targetBpm;
  const origin = beatMs[0]!;
  return beatMs.map((ms, i) =>
    i === 0 ? ms : Math.round(origin + (ms - origin) * scale),
  );
}

/**
 * Gentle uniform scale around the first beat so the last beat lands nearer a
 * late onset anchor — only within ±~4% (self-consistency, not seed chase).
 */
export function selfConsistentScaleBeatGrid(
  beatMs: readonly number[],
  onsetsMs: readonly number[],
): number[] {
  if (beatMs.length < 4 || onsetsMs.length === 0) {
    return beatMs.length > 0 ? [...beatMs] : [];
  }
  const origin = beatMs[0]!;
  const last = beatMs[beatMs.length - 1]!;
  const span = last - origin;
  if (!(span > 0)) return [...beatMs];

  let nearest = onsetsMs[0]!;
  let bestDist = Math.abs(nearest - last);
  for (let i = 1; i < onsetsMs.length; i++) {
    const o = onsetsMs[i]!;
    const d = Math.abs(o - last);
    if (d < bestDist) {
      bestDist = d;
      nearest = o;
    }
  }
  const observedSpan = nearest - origin;
  if (!(observedSpan > 0)) return [...beatMs];

  const scale = observedSpan / span;
  if (scale < 0.96 || scale > 1.04 || Math.abs(scale - 1) < 0.005) {
    return [...beatMs];
  }
  return beatMs.map((ms, i) =>
    i === 0 ? ms : Math.round(origin + (ms - origin) * scale),
  );
}

/**
 * TempoMap seed from median IBI of the tracked beat grid (Adapt SSOT).
 * Analysis / ACF fills only when median is missing. Editorial pipe+GAP BPM is
 * **not** a tempo lock — `fallbackBpm` only fills when both are empty, and as a
 * soft octave center for half-time (~55–80) fold.
 */
export function preferAudioTempoSeed(
  analysisBpm: number,
  fallbackBpm: number,
  medianBpm: number = 0,
): number {
  const grid = analysisBpm > 0 ? analysisBpm : 0;
  const median = medianBpm > 0 ? medianBpm : 0;
  const fallback = fallbackBpm > 0 ? fallbackBpm : 0;

  let chosen = 120;
  if (grid > 0 && median > 0) {
    const diffPct = Math.abs(grid - median) / median;
    if (diffPct > 0.03 && diffPct < 0.35) {
      chosen = Math.round(median * 100) / 100;
    } else {
      chosen = Math.round(grid * 100) / 100;
    }
  } else if (grid > 0) {
    chosen = Math.round(grid * 100) / 100;
  } else if (median > 0) {
    chosen = Math.round(median * 100) / 100;
  } else if (fallback > 0) {
    chosen = Math.round(fallback * 100) / 100;
  }

  // Half-time (~55–80): soft octave fold via fallback center if sensible, else 2×.
  if (chosen >= 55 && chosen < 80) {
    const doubled = chosen * 2;
    if (fallback > 0) {
      const nearDouble =
        Math.abs(fallback - doubled) / doubled <= 0.2 ||
        (fallback >= chosen * 1.6 && fallback <= chosen * 2.4);
      if (nearDouble) {
        return Math.round(fallback * 100) / 100;
      }
    }
    return Math.round(Math.min(BPM_MAX, doubled) * 100) / 100;
  }
  return chosen;
}

/** @deprecated Use {@link preferAudioTempoSeed} — pipe/GAP must not lock Adapt tempo. */
export function preferEditorialTempoSeed(
  analysisBpm: number,
  lockBpm: number,
  medianBpm: number = 0,
): number {
  return preferAudioTempoSeed(analysisBpm, lockBpm, medianBpm);
}
