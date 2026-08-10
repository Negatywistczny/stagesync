import { DEFAULT_PPQ } from "../time.js";
import type { TempoNode } from "./types.js";

/**
 * @deprecated File-absolute grid is SSOT — identity for API compatibility.
 */
export function beatGridToContentEpoch(
  beatMs: readonly number[],
  _audioStartOffsetMs: number,
): number[] {
  void _audioStartOffsetMs;
  return beatMs.length > 0 ? [...beatMs] : [];
}

/** @deprecated Identity — nodes stay file-absolute. */
export function tempoNodesToContentEpoch(
  nodes: readonly TempoNode[],
  _audioStartOffsetMs: number,
): TempoNode[] {
  void _audioStartOffsetMs;
  return nodes.map((n) => ({ ...n }));
}

/** @deprecated Identity — nodes stay file-absolute. */
export function tempoNodesToFileEpoch(
  nodes: readonly TempoNode[],
  _audioStartOffsetMs: number,
): TempoNode[] {
  void _audioStartOffsetMs;
  return nodes.map((n) => ({ ...n }));
}

/** Ticks at constant BPM from file ms 0 (PPQ quarters). */
export function ticksAtConstantBpmFromMs(
  ms: number,
  bpm: number,
  ppq: number = DEFAULT_PPQ,
  floorTicks: number = 0,
): number {
  if (!(ms > 0) || !(bpm > 0)) return floorTicks;
  return floorTicks + Math.round((ms / 1000) * (bpm / 60) * ppq);
}
