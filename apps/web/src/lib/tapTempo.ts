/**
 * Tap tempo — update project tempo map from successive taps (α8 MVP).
 */

import type { Project } from "@stagesync/shared";

const MAX_INTERVALS = 8;
/** Align with Zod BPM edge (#93): 20–400. */
const MIN_BPM = 20;
const MAX_BPM = 400;

export type TapTempoState = {
  tapsMs: number[];
};

export function createTapTempoState(): TapTempoState {
  return { tapsMs: [] };
}

/**
 * Record a tap at wall-clock `nowMs`. Returns new state + optional BPM.
 */
export function recordTap(
  state: TapTempoState,
  nowMs: number,
): { state: TapTempoState; bpm: number | null } {
  const taps = [...state.tapsMs, nowMs];
  while (taps.length > MAX_INTERVALS + 1) taps.shift();

  if (taps.length < 2) {
    return { state: { tapsMs: taps }, bpm: null };
  }

  const intervals: number[] = [];
  for (let i = 1; i < taps.length; i++) {
    intervals.push(taps[i]! - taps[i - 1]!);
  }
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (avg <= 0) return { state: { tapsMs: taps }, bpm: null };
  let bpm = Math.round(60_000 / avg);
  bpm = Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
  return { state: { tapsMs: taps }, bpm };
}

/** Write BPM into tempo map at `atTicks` (replace nearest / insert). */
export function applyTapBpm(
  project: Project,
  atTicks: number,
  bpm: number,
): Project {
  const events = [...project.tempoMap];
  const existing = events.find((e) => e.startTicks === atTicks);
  if (existing) {
    return {
      ...project,
      tempoMap: events.map((e) =>
        e.id === existing.id ? { ...e, bpm } : e,
      ),
    };
  }
  // Update default-ish first event if tapping near song start with single map
  if (events.length === 1 && Math.abs(events[0]!.startTicks - atTicks) < 1) {
    return {
      ...project,
      tempoMap: [{ ...events[0]!, bpm }],
    };
  }
  return {
    ...project,
    tempoMap: [
      ...events,
      {
        id: `tempo-tap-${crypto.randomUUID()}`,
        startTicks: atTicks,
        bpm,
      },
    ].sort((a, b) => a.startTicks - b.startTicks),
  };
}
