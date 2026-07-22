/**
 * Pure MIDI clock / SPP helpers (ADR 0002).
 *
 * MIDI clock = 24 PPQN. Domain ticks use fixed PPQ (default 960).
 * SPP (Song Position Pointer) counts in 16th notes (6 MIDI clocks = 1 SPP unit).
 * No wall clock / I/O — callers supply tempo and ticks.
 */

import { DEFAULT_PPQ } from "./time.js";

/** MIDI standard: 24 clocks per quarter note. */
export const MIDI_CLOCK_PPQN = 24;

/** SPP units per quarter note (16th notes). */
export const MIDI_SPP_PER_QUARTER = 4;

/** Domain ticks advanced by one MIDI clock pulse. */
export function ticksPerMidiClock(ppq: number = DEFAULT_PPQ): number {
  if (!Number.isInteger(ppq) || ppq <= 0 || ppq % MIDI_CLOCK_PPQN !== 0) {
    throw new RangeError(
      `ppq must be a positive multiple of ${MIDI_CLOCK_PPQN}`,
    );
  }
  return ppq / MIDI_CLOCK_PPQN;
}

/** Floor domain ticks → MIDI clock index (0-based). */
export function ticksToMidiClockIndex(
  ticks: number,
  ppq: number = DEFAULT_PPQ,
): number {
  if (!Number.isFinite(ticks)) {
    throw new RangeError("ticks must be finite");
  }
  const per = ticksPerMidiClock(ppq);
  return Math.floor(ticks / per);
}

/** MIDI clock index → domain ticks at that pulse. */
export function midiClockIndexToTicks(
  clockIndex: number,
  ppq: number = DEFAULT_PPQ,
): number {
  if (!Number.isInteger(clockIndex)) {
    throw new RangeError("clockIndex must be an integer");
  }
  return clockIndex * ticksPerMidiClock(ppq);
}

/**
 * Song Position Pointer value (0…16383) from domain ticks.
 * Negative / pre-roll ticks → 0.
 */
export function ticksToSpp(ticks: number, ppq: number = DEFAULT_PPQ): number {
  if (!Number.isFinite(ticks)) {
    throw new RangeError("ticks must be finite");
  }
  if (!Number.isInteger(ppq) || ppq <= 0) {
    throw new RangeError("ppq must be a positive integer");
  }
  if (ticks <= 0) return 0;
  const spp = Math.floor((ticks * MIDI_SPP_PER_QUARTER) / ppq);
  return Math.min(16_383, Math.max(0, spp));
}

/** SPP → domain ticks (start of that 16th). */
export function sppToTicks(spp: number, ppq: number = DEFAULT_PPQ): number {
  if (!Number.isInteger(spp) || spp < 0 || spp > 16_383) {
    throw new RangeError("spp must be an integer in 0…16383");
  }
  if (!Number.isInteger(ppq) || ppq <= 0) {
    throw new RangeError("ppq must be a positive integer");
  }
  return Math.floor((spp * ppq) / MIDI_SPP_PER_QUARTER);
}

/** Wall-clock ms between MIDI clock pulses at BPM. */
export function midiClockIntervalMs(bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new RangeError("bpm must be a finite number > 0");
  }
  return 60_000 / (bpm * MIDI_CLOCK_PPQN);
}

/** How many MIDI clocks fit in elapsedMs at BPM (float). */
export function elapsedMsToMidiClocks(elapsedMs: number, bpm: number): number {
  if (!Number.isFinite(elapsedMs)) {
    throw new RangeError("elapsedMs must be finite");
  }
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new RangeError("bpm must be a finite number > 0");
  }
  return (elapsedMs * bpm * MIDI_CLOCK_PPQN) / 60_000;
}
