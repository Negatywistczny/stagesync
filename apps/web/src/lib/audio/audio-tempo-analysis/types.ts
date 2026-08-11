import type { AudioAnalysisResult } from "@stagesync/shared";
import {
  DEFAULT_ANALYSIS_TIMEOUT_MS,
  DEFAULT_DOWNSAMPLE,
  DEFAULT_MAX_ANALYSIS_SEC,
} from "./constants.js";

export type ViterbiBeatTrace = {
  beatIdx: number;
  selectedMs: number;
  candidates: Array<{
    tMs: number;
    rawScore: number;
    tempoPen: number;
    totalScore: number;
    status: "WINNER" | "REJECTED";
    rejectReason?: string;
  }>;
};

export type AnalyzeAudioTempoOptions = {
  maxAnalysisSec?: number;
  downsample?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Fast path: skip heavy onset scan; constant grid from BPM estimate only. */
  skipOnsets?: boolean;
  /**
   * UltraStar / file metronome — seeds beat spacing when autocorrelation is weak
   * or diverges >±15%. Never written to TempoMap directly (audio SSOT downstream).
   */
  seedBpm?: number;
  /** When true, beat grid spans the full decoded buffer (import path). */
  fullTrackGrid?: boolean;
  /** When true, populates decision trace for Explainable DSP debugging. */
  enableTrace?: boolean;
  /** 0…1 progress for UI bars (throttled to whole-percent steps). */
  onProgress?: (ratio: number) => void;
};

/** Recommended options for Beat Mapper re-analysis (bounded window). */
export const UI_TEMPO_ANALYSIS_OPTIONS: AnalyzeAudioTempoOptions = {
  maxAnalysisSec: DEFAULT_MAX_ANALYSIS_SEC,
  downsample: DEFAULT_DOWNSAMPLE,
  timeoutMs: DEFAULT_ANALYSIS_TIMEOUT_MS,
  skipOnsets: true,
  fullTrackGrid: false,
};

/**
 * Import wizard: scan (almost) the full decoded file for onsets/BPM, then build
 * a full-track beat grid. Short windows produced flat IBI → nearly empty TempoMap.
 */
export function buildImportTempoAnalysisOptions(opts?: {
  gapMs?: number | null;
  seedBpm?: number | null;
  /** Decoded buffer duration — prefer full-song onset scan (cap 8 min). */
  durationMs?: number | null;
}): AnalyzeAudioTempoOptions {
  const gapSec = Math.max(0, (opts?.gapMs ?? 0) / 1000);
  const seed = opts?.seedBpm ?? 120;
  const barSec = (60 / Math.max(seed, 40)) * 4;
  const durationSec =
    opts?.durationMs != null && opts.durationMs > 0
      ? opts.durationMs / 1000
      : 0;
  // Prefer the full file (cap 8 min). Floor covers long #GAP intros when
  // duration is not yet known.
  const maxAnalysisSec = Math.min(
    480,
    Math.max(180, durationSec, gapSec + barSec * 32),
  );
  return {
    maxAnalysisSec,
    downsample: Math.max(2, DEFAULT_DOWNSAMPLE - 4),
    // Full-song flux is still light; keep headroom for slower devices.
    timeoutMs: Math.max(DEFAULT_ANALYSIS_TIMEOUT_MS, 20_000),
    skipOnsets: false,
    fullTrackGrid: true,
    ...(opts?.seedBpm != null && opts.seedBpm > 0
      ? { seedBpm: opts.seedBpm }
      : {}),
  };
}

export type AnalyzeAudioTempoOutcome = {
  result: AudioAnalysisResult;
  /** User-facing hint when analysis fell back to defaults. */
  warning?: string;
};

export type WindowedBpmPoint = { timeMs: number; bpm: number };

export type AcfPeakCandidate = {
  bpm: number;
  score: number;
  lag?: number;
  octaveMate?: boolean;
};

export type AcfEstimateResult = {
  bpm: number;
  /** Other real ACF peaks (same scan) for reconcile competition. */
  competitorBpms: number[];
};

export const DEFAULT_RESULT: AudioAnalysisResult = {
  onsetsMs: [],
  beatMs: [],
  estimatedBpm: 120,
};
