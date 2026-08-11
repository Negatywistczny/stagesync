/**
 * MultiPassTempoSolver — Pass 1 seed BPM + metronome fallback.
 */

import type { TimeSignature } from "../time.js";
import {
  DEFAULT_METER,
  TEMPO_MAP_MAX_BPM,
  TEMPO_MAP_MIN_BPM,
  TEMPO_SOLVER_CHORD_WEIGHT,
  TEMPO_SOLVER_HIGH_WEIGHT,
  TEMPO_SOLVER_SECTION_WEIGHT,
  TEMPO_SOLVER_SEED_METRO_MAX_RATIO,
  TEMPO_SOLVER_SYLLABLE_WEIGHT,
} from "./constants.js";
import type { TempoAnchorKind, TempoSolverAnchor } from "./types.js";

export function weightForTempoAnchorKind(kind: TempoAnchorKind): number {
  switch (kind) {
    case "section":
    case "phrase":
      return TEMPO_SOLVER_SECTION_WEIGHT;
    case "chord":
      return TEMPO_SOLVER_CHORD_WEIGHT;
    case "syllable":
      return TEMPO_SOLVER_SYLLABLE_WEIGHT;
    case "instrumental":
      return 0;
    default:
      return TEMPO_SOLVER_SYLLABLE_WEIGHT;
  }
}

/**
 * Pass 1 — seed BPM from high-confidence section spans with UG bar hints.
 */
export function computeSeedBpmFromAnchors(
  anchors: readonly TempoSolverAnchor[],
  fallbackBpm: number,
  meter: TimeSignature = DEFAULT_METER,
): number {
  const high = anchors
    .filter(
      (a) =>
        a.weight >= TEMPO_SOLVER_HIGH_WEIGHT &&
        a.ugBarsHint != null &&
        a.ugBarsHint > 0,
    )
    .slice()
    .sort((a, b) => a.ms - b.ms || a.sectionIndex - b.sectionIndex);
  const qpb = (meter.numerator * 4) / meter.denominator;
  const bpms: number[] = [];
  for (let i = 0; i + 1 < high.length; i++) {
    const a = high[i]!;
    const b = high[i + 1]!;
    const bars = a.ugBarsHint!;
    const sec = (b.ms - a.ms) / 1000;
    if (sec <= 0.05 || bars < 1) continue;
    const bpm = (bars * qpb * 60) / sec;
    if (
      Number.isFinite(bpm) &&
      bpm >= TEMPO_MAP_MIN_BPM &&
      bpm <= TEMPO_MAP_MAX_BPM
    ) {
      bpms.push(bpm);
    }
  }
  if (bpms.length === 0) {
    const bySec = new Map<number, TempoSolverAnchor[]>();
    for (const a of anchors) {
      if (a.weight < TEMPO_SOLVER_HIGH_WEIGHT) continue;
      const list = bySec.get(a.sectionIndex) ?? [];
      list.push(a);
      bySec.set(a.sectionIndex, list);
    }
    for (const list of bySec.values()) {
      list.sort((x, y) => x.ms - y.ms);
      const first = list[0]!;
      const last = list[list.length - 1]!;
      const bars = first.ugBarsHint ?? 0;
      const sec = (last.ms - first.ms) / 1000;
      if (bars >= 1 && sec > 0.05) {
        const bpm = (bars * qpb * 60) / sec;
        if (
          Number.isFinite(bpm) &&
          bpm >= TEMPO_MAP_MIN_BPM &&
          bpm <= TEMPO_MAP_MAX_BPM
        ) {
          bpms.push(bpm);
        }
      }
    }
  }
  if (bpms.length === 0) {
    return Math.round(fallbackBpm * 100) / 100;
  }
  const avg = bpms.reduce((s, x) => s + x, 0) / bpms.length;
  return Math.round(avg * 100) / 100;
}

/**
 * If Pass-1 seed diverges &gt; ±{@link TEMPO_SOLVER_SEED_METRO_MAX_RATIO} from
 * the UltraStar metronome, the file metronome wins for seed / pristineBars.
 */
export function applySeedMetronomeFallback(
  seedBpm: number,
  referenceMetronomeBpm: number | null | undefined,
): number {
  if (
    referenceMetronomeBpm == null ||
    !Number.isFinite(referenceMetronomeBpm) ||
    referenceMetronomeBpm <= 0
  ) {
    return seedBpm;
  }
  const ratio =
    Math.abs(seedBpm - referenceMetronomeBpm) / referenceMetronomeBpm;
  if (ratio > TEMPO_SOLVER_SEED_METRO_MAX_RATIO) {
    return Math.round(referenceMetronomeBpm * 100) / 100;
  }
  return seedBpm;
}
