import { BEAT_SNAP_FRAC } from "./constants.js";

export function nearestOnsetMs(
  onsetsMs: readonly number[],
  targetMs: number,
): number {
  if (onsetsMs.length === 0) return targetMs;
  let lo = 0;
  let hi = onsetsMs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((onsetsMs[mid] ?? 0) < targetMs) lo = mid + 1;
    else hi = mid;
  }
  const candidates: number[] = [];
  if (lo > 0) candidates.push(onsetsMs[lo - 1]!);
  candidates.push(onsetsMs[lo]!);
  if (lo + 1 < onsetsMs.length) candidates.push(onsetsMs[lo + 1]!);
  let best = targetMs;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const o of candidates) {
    const d = Math.abs(o - targetMs);
    if (d < bestDist) {
      best = o;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Clean phase anchor for beat grid synthesis.
 * Uses earliest detected musical onset (onsetsMs[0]) without artificial heuristics.
 */
export function detectFirstMusicalDownbeatMs(
  _mono: Float32Array,
  _sampleRate: number,
  _hopSize: number,
  onsetsMs: readonly number[],
): number {
  return onsetsMs[0] ?? 0;
}

export function resolveBeatGridPhase(
  onsetsMs: readonly number[],
  phaseAnchorMs: number,
  period: number,
): number {
  if (onsetsMs.length === 0 || !(period > 0)) return Math.max(0, phaseAnchorMs);
  const snapWindow = period * BEAT_SNAP_FRAC;

  if (phaseAnchorMs > 0) {
    const nearAnchor = nearestOnsetMs(onsetsMs, phaseAnchorMs);
    if (Math.abs(nearAnchor - phaseAnchorMs) <= snapWindow * 2.0)
      return nearAnchor;
    return phaseAnchorMs;
  }

  const firstOnset = onsetsMs[0] ?? 0;
  let rawAnchor = firstOnset;
  while (rawAnchor - period >= -snapWindow) {
    rawAnchor -= period;
  }
  return Math.max(0, Math.round(rawAnchor));
}
