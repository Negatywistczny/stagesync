/**
 * Pure time helpers for StageSync.
 * Absolute beat positions use floating-point absBeat (0-based).
 * Never mutate inputs — return new values only.
 */

export type TimeSignature = {
  numerator: number;
  denominator: number;
};

/**
 * Converts an absolute beat position to a musical bar index (0-based)
 * and beat-within-bar (0-based, fractional).
 *
 * @example absBeatToBarBeat(5.5, { numerator: 5, denominator: 8 })
 * // → { bar: 1, beatInBar: 0.5 }  (5 beats per bar in 5/8)
 */
export function absBeatToBarBeat(
  absBeat: number,
  timeSignature: TimeSignature,
): { bar: number; beatInBar: number } {
  const beatsPerBar = timeSignature.numerator;
  if (!Number.isFinite(absBeat) || beatsPerBar <= 0) {
    throw new RangeError("Invalid absBeat or time signature");
  }
  const bar = Math.floor(absBeat / beatsPerBar);
  const beatInBar = absBeat - bar * beatsPerBar;
  return { bar, beatInBar };
}

/**
 * Converts bar + beat-within-bar to absolute beat position.
 */
export function barBeatToAbsBeat(
  bar: number,
  beatInBar: number,
  timeSignature: TimeSignature,
): number {
  const beatsPerBar = timeSignature.numerator;
  if (beatsPerBar <= 0) {
    throw new RangeError("Invalid time signature");
  }
  return bar * beatsPerBar + beatInBar;
}
