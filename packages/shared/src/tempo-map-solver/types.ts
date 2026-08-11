/**
 * MultiPassTempoSolver — public types.
 */

import type { TempoEvent } from "../project/schema.js";
import type { TimeSignature } from "../time-tempo/time.js";
export type TempoAnchorKind =
  "section" | "phrase" | "chord" | "syllable" | "instrumental";

export type TempoSolverAnchor = {
  /** Wall-clock ms from song timeline origin (same basis as UltraStar GAP+beats). */
  ms: number;
  sectionIndex: number;
  kind: TempoAnchorKind;
  weight: number;
  /** Optional UG bar count hint for this section (pipe / structure). */
  ugBarsHint?: number;
  /**
   * Structural bar index within the section (0 = section Beat 1).
   * Resolved to targetTick after Forma layout.
   */
  barOffset?: number;
  /**
   * Absolute target tick (same space as Forma walls). When set, overrides
   * barOffset. Solver matches secondsToTicks(ms) ≈ targetTick.
   */
  targetTick?: number;
};

export type TempoSolverSectionPlan = {
  sectionIndex: number;
  name: string;
  /** First non-anacrusis vocal ms (section Beat 1 wall-clock). */
  startMs: number;
  endMs: number;
  pristineBars: number;
  fromPipe: boolean;
  /** Beat-1 tick after layout (filled by solver). */
  startTicks: number;
  lengthTicks: number;
};

export type MultiPassTempoSolverInput = {
  anchors: readonly TempoSolverAnchor[];
  sections: readonly {
    name: string;
    pipeBarCount: number;
    chordCount: number;
    /**
     * Forma length in bars (pipe / UltraStar section walls / lyric fallback).
     * When set for vocal sections, wins over raw US ms span sizing.
     * Chords never define length — they only fill the container.
     */
    structuralBars?: number;
    /** Min/max ms of US words aligned into this section (empty = instrumental). */
    vocalMsRange: { startMs: number; endMs: number } | null;
  }[];
  meter?: TimeSignature;
  ppq?: number;
  /** Fallback when Pass 1 cannot compute seed (e.g. UltraStar metro). */
  fallbackBpm: number;
  /**
   * UltraStar file metronome (header/4). When Pass-1 seed diverges by more
   * than {@link TEMPO_SOLVER_SEED_METRO_MAX_RATIO}, this becomes seed SSOT.
   */
  referenceMetronomeBpm?: number;
  /**
   * Pipe+GAP editorial BPM for anacrusis bar gaps (Intro→vocal section).
   * When set, pickup detection uses this instead of seed after metro fallback.
   */
  layoutBpm?: number;
  contentFloorTicks?: number;
  idPrefix?: string;
  /** Smart Tempo: backing audio duration (ms) — caps map / warns on overflow. */
  audioDurationMs?: number;
  /** Smart Tempo: trim before Beat 1 on waveform (ms) — metronome grid only. */
  audioStartOffsetMs?: number;
};

export type MultiPassTempoSolverResult = {
  seedBpm: number;
  tempoMap: TempoEvent[];
  sections: TempoSolverSectionPlan[];
  warnings: string[];
  /** Explicit Tempo Nodes (wallMs ↔ targetTick) emitted for Beat Mapper. */
  tempoNodes: { wallMs: number; targetTick: number }[];
};

export type AnacrusisGapInput = {
  sections: readonly {
    pipeBarCount: number;
    vocalMsRange: { startMs: number; endMs: number } | null;
  }[];
  plans: readonly Pick<
    TempoSolverSectionPlan,
    "fromPipe" | "pristineBars" | "startMs"
  >[];
  layoutBpm: number;
  meter?: TimeSignature;
  ppq?: number;
};

export type MsTickAnchor = {
  ms: number;
  targetTick: number;
};
