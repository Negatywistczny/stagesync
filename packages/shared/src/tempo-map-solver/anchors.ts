/**
 * MultiPassTempoSolver — (ms, tick) anchors → soft/exact TempoEvent candidates.
 */

import {
  ticksPerBar,
  ticksToMs,
  type TimeSignature,
} from "../time-tempo/time.js";
import {
  TEMPO_MAP_MAX_BPM,
  TEMPO_MAP_MIN_BPM,
  TEMPO_SOLVER_MAX_STEP_RATIO,
} from "./constants.js";
import type {
  MsTickAnchor,
  TempoSolverAnchor,
  TempoSolverSectionPlan,
} from "./types.js";

/** True when tick sits on Beat 1 or Beat 3 of a bar (half-bar grid). */
export function isTickOnBarOrHalf(
  tick: number,
  barTicks: number,
  origin: number = 0,
): boolean {
  if (barTicks <= 0) return false;
  const half = Math.max(1, Math.floor(barTicks / 2));
  const local = tick - origin;
  return local % half === 0;
}

/**
 * Soft clamp toward seed (± {@link TEMPO_SOLVER_MAX_STEP_RATIO}).
 * UltraStar lyric timings are orientational — do not chase them with wild BPM.
 */
export function softClampBpmToSeed(seedBpm: number, next: number): number {
  if (!(seedBpm > 0) || !Number.isFinite(next)) return seedBpm;
  const lo = seedBpm * (1 - TEMPO_SOLVER_MAX_STEP_RATIO);
  const hi = seedBpm * (1 + TEMPO_SOLVER_MAX_STEP_RATIO);
  return Math.round(Math.min(hi, Math.max(lo, next)) * 100) / 100;
}

/** Adjacent step also capped to ± {@link TEMPO_SOLVER_MAX_STEP_RATIO} of seed. */
export function softClampBpmAdjacent(
  seedBpm: number,
  prevBpm: number,
  next: number,
): number {
  const vsSeed = softClampBpmToSeed(seedBpm, next);
  if (!(seedBpm > 0) || !Number.isFinite(prevBpm)) return vsSeed;
  const step = seedBpm * TEMPO_SOLVER_MAX_STEP_RATIO;
  return (
    Math.round(
      Math.min(prevBpm + step, Math.max(prevBpm - step, vsSeed)) * 100,
    ) / 100
  );
}

/**
 * Drop intermediate anchors closer than `minBarGap` bars (keep first/last).
 * Prevents a BPM kink on every approximate UltraStar syllable.
 */
export function thinMsTickAnchors(
  anchors: readonly MsTickAnchor[],
  barTicks: number,
  minBarGap: number = 2,
): MsTickAnchor[] {
  if (anchors.length <= 2) return anchors.slice();
  const minTicks = Math.max(1, Math.floor(minBarGap * barTicks));
  const sorted = anchors
    .slice()
    .sort((a, b) => a.targetTick - b.targetTick || a.ms - b.ms);
  const out: MsTickAnchor[] = [sorted[0]!];
  for (let i = 1; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    if (a.targetTick - out[out.length - 1]!.targetTick >= minTicks) {
      out.push(a);
    }
  }
  const last = sorted[sorted.length - 1]!;
  if (last.targetTick > out[out.length - 1]!.targetTick) out.push(last);
  else out[out.length - 1] = last;
  return out;
}

/**
 * Exact BPM for a tick↔ms span. Soft clamp toward seed happens only in the
 * soft path of {@link tempoEventsFromMsTickAnchors} — never here — so
 * audio-driven / Forma wall maps can follow the recording without ping-ponging
 * between seed ±8% walls on every noisy beat.
 */
function bpmForTickSpan(
  lengthTicks: number,
  durationMs: number,
  meter: TimeSignature,
  ppq: number,
  seedBpm?: number,
): number {
  if (durationMs <= 0 || lengthTicks <= 0) {
    return seedBpm != null && seedBpm > 0 ? seedBpm : 120;
  }
  let lo = TEMPO_MAP_MIN_BPM;
  let hi = TEMPO_MAP_MAX_BPM;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const ms = ticksToMs(lengthTicks, mid, meter, ppq);
    if (ms > durationMs) lo = mid;
    else hi = mid;
  }
  return Math.min(
    TEMPO_MAP_MAX_BPM,
    Math.max(TEMPO_MAP_MIN_BPM, Math.round(((lo + hi) / 2) * 100) / 100),
  );
}

/**
 * Resolve barOffset → absolute targetTick after Forma layout.
 * Anchors that already have targetTick are kept as-is.
 * Never compress structural offsets into a short Forma — caller must expand
 * pristineBars to fit max(barOffset)+1 (see runMultiPassTempoSolver).
 */
export function resolveAnchorTargetTicks(
  anchors: readonly TempoSolverAnchor[],
  sections: readonly TempoSolverSectionPlan[],
  barTicks: number,
): MsTickAnchor[] {
  const out: MsTickAnchor[] = [];
  const seen = new Set<string>();
  for (const a of anchors) {
    let tick = a.targetTick;
    if (tick == null && a.barOffset != null) {
      const plan = sections[a.sectionIndex];
      if (!plan) continue;
      const off = Math.max(0, Math.trunc(a.barOffset));
      const bars = Math.max(1, plan.pristineBars);
      // Safety only: Forma should already be ≥ maxOff+1.
      const clamped = Math.min(off, bars - 1);
      tick = plan.startTicks + clamped * barTicks;
    }
    if (tick == null || !Number.isFinite(tick) || !Number.isFinite(a.ms)) {
      continue;
    }
    const key = `${Math.round(a.ms)}:${Math.round(tick)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ms: a.ms, targetTick: Math.round(tick) });
  }
  out.sort((a, b) => a.targetTick - b.targetTick || a.ms - b.ms);
  return out;
}

/**
 * Soft TempoEvent candidates from (ms, tick) guidance.
 * - `soft: true` (default): clamp to seed ±8% / adjacent ±8%; thin anchors.
 * - `soft: false`: exact segment BPM (Forma section walls → tekst↔MP3 lock).
 */
export function tempoEventsFromMsTickAnchors(
  anchors: readonly MsTickAnchor[],
  floorTicks: number,
  seedBpm: number,
  meter: TimeSignature,
  ppq: number,
  barTicks?: number,
  options?: { soft?: boolean },
): { startTicks: number; bpm: number }[] {
  const soft = options?.soft !== false;
  if (anchors.length === 0) {
    return [{ startTicks: floorTicks, bpm: seedBpm }];
  }
  const bt = barTicks ?? ticksPerBar(meter, ppq);
  const sorted = soft
    ? thinMsTickAnchors(anchors, bt, 2)
    : anchors
        .slice()
        .sort((a, b) => a.targetTick - b.targetTick || a.ms - b.ms);

  const dedup: MsTickAnchor[] = [];
  for (const a of sorted) {
    const last = dedup[dedup.length - 1];
    if (last && last.targetTick === a.targetTick) {
      if (a.ms > last.ms) last.ms = a.ms;
      continue;
    }
    dedup.push({ ...a });
  }

  const out: { startTicks: number; bpm: number }[] = [];
  let prevBpm: number;

  out.push({ startTicks: floorTicks, bpm: seedBpm });
  prevBpm = seedBpm;

  for (let i = 0; i + 1 < dedup.length; i++) {
    const a = dedup[i]!;
    const b = dedup[i + 1]!;
    const tickLen = b.targetTick - a.targetTick;
    const durMs = b.ms - a.ms;
    if (tickLen <= 0) continue;
    const raw =
      a.targetTick === floorTicks
        ? seedBpm
        : durMs > 1
          ? bpmForTickSpan(tickLen, durMs, meter, ppq, seedBpm)
          : seedBpm;
    const bpm = soft ? softClampBpmAdjacent(seedBpm, prevBpm, raw) : raw;
    prevBpm = bpm;
    const last = out[out.length - 1];
    if (last && last.startTicks === a.targetTick) {
      last.bpm = bpm;
    } else if (!last || a.targetTick > last.startTicks) {
      out.push({ startTicks: a.targetTick, bpm });
    }
  }

  return out.length > 0 ? out : [{ startTicks: floorTicks, bpm: seedBpm }];
}
