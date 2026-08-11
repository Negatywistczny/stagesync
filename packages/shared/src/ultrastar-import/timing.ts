/**
 * UltraStar / USDX import — beat↔ms↔ticks and editorial grid BPM.
 */

import { DEFAULT_PPQ, type TimeSignature } from "../time.js";

/**
 * Metronome (quarter) BPM from UltraStar `#BPM` header (×4).
 */
export function ultrastarHeaderBpmToMetronome(headerBpm: number): number {
  if (!Number.isFinite(headerBpm) || headerBpm <= 0) {
    throw new RangeError("UltraStar #BPM must be finite > 0");
  }
  let bpm = headerBpm / 4;
  while (bpm >= 145) {
    bpm = bpm / 2;
  }
  return Math.round(bpm * 100) / 100;
}

/**
 * USDX wall-clock ms: `GAP + beat × 60000 / (BPM_header × 4)`.
 */
export function ultrastarBeatToMs(
  beat: number,
  gapMs: number,
  headerBpm: number,
): number {
  if (!Number.isFinite(headerBpm) || headerBpm <= 0) {
    throw new RangeError("UltraStar #BPM must be finite > 0");
  }
  return gapMs + (beat * 60_000) / (headerBpm * 4);
}

/**
 * Ticks spanned by one UltraStar beat at the *file* metronome (header/4).
 * Prefer {@link ultrastarBeatToMs} + `secondsToTicks` when placing on an
 * editorial grid BPM that differs from the file metronome.
 */
export function ticksPerUltrastarBeat(ppq: number = DEFAULT_PPQ): number {
  return ppq / 16;
}

export function ultrastarBeatToTicks(
  beat: number,
  gapTicks: number,
  ppq: number = DEFAULT_PPQ,
): number {
  return gapTicks + Math.round(beat * ticksPerUltrastarBeat(ppq));
}

/**
 * Suggest editorial grid BPM so the first vocal lands ~`pipeBarCount + pickup`
 * bars after Beat 1 (pickup in the last Intro bar; Verse on the next line).
 *
 * `firstVocalMs` is file-absolute (UltraStar `#GAP`). Pass `beat1Ms` (Audio
 * Start Offset / editorial Beat 1) so pre-roll silence is not counted as
 * musical bars — otherwise SingStar-style GAP (~35s) with Beat 1 ~2–3s yields
 * a systematically low seed (~113 instead of ~120–123 like Logic Adapt).
 *
 * Returns null when inputs are unusable.
 */
export function suggestGridBpmFromPipeAndFirstVocal(opts: {
  pipeBarCount: number;
  firstVocalMs: number;
  /** File ms of Beat 1 / content epoch (default 0 = assume song starts at 0). */
  beat1Ms?: number;
  meter?: TimeSignature;
  /** Extra bars after pipe for a typical anacrusis (default 0.5). */
  pickupBars?: number;
}): number | null {
  const { pipeBarCount, firstVocalMs } = opts;
  if (
    !Number.isFinite(pipeBarCount) ||
    pipeBarCount < 1 ||
    !Number.isFinite(firstVocalMs) ||
    firstVocalMs <= 0
  ) {
    return null;
  }
  const beat1 = Math.max(0, Math.round(opts.beat1Ms ?? 0));
  const contentMs = firstVocalMs - beat1;
  if (!(contentMs > 0)) return null;
  const meter = opts.meter ?? { numerator: 4, denominator: 4 };
  const pickup = opts.pickupBars ?? 0.5;
  const targetBars = pipeBarCount + pickup;
  const quartersPerBar = (meter.numerator * 4) / meter.denominator;
  const seconds = contentMs / 1000;
  let bpm = (targetBars * quartersPerBar * 60) / seconds;
  while (bpm >= 145) {
    bpm = bpm / 2;
  }
  if (!Number.isFinite(bpm) || bpm < 40 || bpm > 300) return null;
  return Math.round(bpm * 100) / 100;
}
