/**
 * MultiPassTempoSolver — shared constants.
 */

import type { TimeSignature } from "../time.js";

export const TEMPO_SOLVER_HIGH_WEIGHT = 0.85;
export const TEMPO_SOLVER_SECTION_WEIGHT = 1.0;
export const TEMPO_SOLVER_CHORD_WEIGHT = 0.85;
export const TEMPO_SOLVER_SYLLABLE_WEIGHT = 0.3;
export const TEMPO_SOLVER_PRUNE_DELTA_BPM = 0;
/**
 * Soft bound for emitted BPM vs seed (±). Exact (ms→tick) segments may still
 * exceed this when wall-clock forces it (e.g. pipe Intro @ GAP vs metro seed).
 */
export const TEMPO_SOLVER_MAX_STEP_RATIO = 0.08;
/**
 * When Pass-1 seed diverges more than this fraction from UltraStar metronome,
 * use the file metronome as seed SSOT (Forma pristineBars sizing).
 */
export const TEMPO_SOLVER_SEED_METRO_MAX_RATIO = 0.15;
/** Pickup / anacrusis must not exceed this many bars before section Beat 1. */
export const TEMPO_SOLVER_ANACRUSIS_MAX_BARS = 1;

/**
 * Absolute BPM band for Pass-1 seed and tick↔ms tempo segments.
 * Floor stays low enough for slow ballads (Pass 1 must not bump 45 → 60).
 */
export const TEMPO_MAP_MIN_BPM = 40;
export const TEMPO_MAP_MAX_BPM = 320;

export const DEFAULT_METER: TimeSignature = { numerator: 4, denominator: 4 };

