/**
 * MultiPassTempoSolver — Pass 2–3 anacrusis + Forma layout helpers.
 */

import {
  DEFAULT_PPQ,
  ticksPerBar,
  ticksToMs,
  type TimeSignature,
} from "../time.js";
import { DEFAULT_METER, TEMPO_SOLVER_ANACRUSIS_MAX_BARS } from "./constants.js";
import type { AnacrusisGapInput, TempoSolverSectionPlan } from "./types.js";

/**
 * Pass 2 — true when syllable onset is pickup before section Beat 1
 * (within {@link TEMPO_SOLVER_ANACRUSIS_MAX_BARS} bars at seedBpm).
 */
export function isAnacrusisMs(
  syllableMs: number,
  sectionBeat1Ms: number,
  seedBpm: number,
  meter: TimeSignature = DEFAULT_METER,
  ppq: number = DEFAULT_PPQ,
): boolean {
  if (syllableMs >= sectionBeat1Ms) return false;
  const barTicks = ticksPerBar(meter, ppq);
  const maxPickupMs = ticksToMs(
    TEMPO_SOLVER_ANACRUSIS_MAX_BARS * barTicks,
    seedBpm,
    meter,
    ppq,
  );
  return sectionBeat1Ms - syllableMs <= maxPickupMs + 1e-6;
}

/**
 * First strong vocal ms for a section: if first syllable is pickup before a
 * later accent, Beat 1 = accent; else vocal range start.
 */
export function sectionBeat1Ms(
  vocalStartMs: number,
  vocalEndMs: number,
  seedBpm: number,
  meter: TimeSignature,
  ppq: number,
  firstAccentMs?: number | null,
): number {
  if (
    firstAccentMs != null &&
    Number.isFinite(firstAccentMs) &&
    firstAccentMs >= vocalStartMs &&
    firstAccentMs <= vocalEndMs &&
    isAnacrusisMs(vocalStartMs, firstAccentMs, seedBpm, meter, ppq)
  ) {
    return firstAccentMs;
  }
  return vocalStartMs;
}

/**
 * Infer section Beat 1 ms from a vocal onset on a constant-BPM bar grid
 * (pickup → next barline; near-downbeat → this barline). Mirrors
 * {@link sectionStartFromVocalTicks} in wall-clock space.
 */
export function sectionBeat1MsFromVocalMs(
  vocalStartMs: number,
  barMs: number,
): number {
  if (!(barMs > 0) || !Number.isFinite(vocalStartMs)) return vocalStartMs;
  const t = Math.max(0, vocalStartMs);
  const rem = t % barMs;
  if (rem <= 1e-6) return t;
  if (rem <= barMs / 8) return t - rem;
  return t - rem + barMs;
}

/**
 * Extra bars on the previous section to absorb an anacrusis pickup before the
 * next Forma Beat 1. New Forma always starts on the strong beat / barline; no
 * empty intermediate GAP bar.
 *
 * When the previous section is pipe / instrumental, extend by 1 bar (pickup
 * lives in that last bar). When the previous section is already a vocal US
 * wall spanning to this Beat 1, length is already correct — do not add another
 * bar (that would insert an empty gap).
 */
export function anacrusisPickupBarsBeforeSection(
  sectionIndex: number,
  input: AnacrusisGapInput,
): number {
  if (sectionIndex <= 0) return 0;
  const meter = input.meter ?? DEFAULT_METER;
  const ppq = input.ppq ?? DEFAULT_PPQ;
  const barTicks = ticksPerBar(meter, ppq);
  const barMs = ticksToMs(barTicks, input.layoutBpm, meter, ppq);
  if (!(barMs > 0)) return 0;

  const prevPlan = input.plans[sectionIndex - 1]!;
  const prevSec = input.sections[sectionIndex - 1]!;
  const currPlan = input.plans[sectionIndex]!;
  const currSec = input.sections[sectionIndex]!;
  if (!currSec.vocalMsRange) return 0;

  const vocalStart = currSec.vocalMsRange.startMs;
  const beat1Ms =
    currPlan.startMs > vocalStart
      ? currPlan.startMs
      : sectionBeat1MsFromVocalMs(vocalStart, barMs);
  if (!isAnacrusisMs(vocalStart, beat1Ms, input.layoutBpm, meter, ppq)) {
    return 0;
  }

  // Vocal→vocal with US walls already ends on this Beat 1.
  const prevIsInstrumental = prevPlan.fromPipe || prevSec.vocalMsRange == null;
  return prevIsInstrumental ? 1 : 0;
}

/** Contiguous Forma tick walls; anacrusis pickup extends the preceding section. */
export function layoutContiguousFormaPlans(
  plans: TempoSolverSectionPlan[],
  sections: AnacrusisGapInput["sections"],
  floorTicks: number,
  barTicks: number,
  layoutBpm: number,
  meter: TimeSignature = DEFAULT_METER,
  ppq: number = DEFAULT_PPQ,
): void {
  const gapInput: AnacrusisGapInput = {
    sections,
    plans,
    layoutBpm,
    meter,
    ppq,
  };
  for (let si = 1; si < plans.length; si++) {
    const extra = anacrusisPickupBarsBeforeSection(si, gapInput);
    if (extra > 0) {
      plans[si - 1]!.pristineBars += extra;
    }
  }
  let cursor = floorTicks;
  for (let si = 0; si < plans.length; si++) {
    const p = plans[si]!;
    p.startTicks = cursor;
    p.lengthTicks = p.pristineBars * barTicks;
    cursor = p.startTicks + p.lengthTicks;
  }
}

export function pristineBarsFromMsSpan(
  startMs: number,
  endMs: number,
  seedBpm: number,
  meter: TimeSignature = DEFAULT_METER,
  ppq: number = DEFAULT_PPQ,
): number {
  const spanMs = Math.max(0, endMs - startMs);
  if (spanMs <= 0) return 1;
  const barTicks = ticksPerBar(meter, ppq);
  const barMs = ticksToMs(barTicks, seedBpm, meter, ppq);
  if (barMs <= 0) return 1;
  // Ceil so Forma never under-covers the vocal wall-clock span.
  return Math.max(1, Math.ceil(spanMs / barMs - 1e-9));
}
