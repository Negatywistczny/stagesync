import type { TempoEvent } from "../schema.js";
import type { TimeSignature } from "../time.js";

export type SmartTempoAudioRef = {
  assetId: string;
  durationMs: number;
  peaks: number[];
  /**
   * File-ms lock for musical Beat 1 (usually UltraStar `#GAP` or first transient).
   * TempoMap is content-epoch: Beat 1 → tick 0. Backing clip uses `trimInMs` so
   * leading silence stays in the file but is not audible from timeline tick 0.
   */
  audioStartOffsetMs?: number;
  /** Audio-detected BPM from Smart Tempo analysis. */
  estimatedBpm?: number;
  /** Pre-built tempo map from runAudioDrivenSmartTempo. */
  tempoMap?: readonly { id?: string; startTicks: number; bpm: number }[];
  /** Pre-built tempo nodes from runAudioDrivenSmartTempo. */
  tempoNodes?: readonly TempoNode[];
  /** Full audio analysis result (onsets, beats, estimatedBpm). */
  analysis?: AudioAnalysisResult;
};

/** Optional Viterbi decision trace (Explainable DSP / benchmark tooling). */
export type ViterbiBeatTraceCandidate = {
  tMs: number;
  rawScore: number;
  tempoPen: number;
  totalScore: number;
  status: "WINNER" | "REJECTED";
  rejectReason?: string;
};

export type ViterbiBeatTrace = {
  beatIdx: number;
  selectedMs: number;
  candidates: readonly ViterbiBeatTraceCandidate[];
};

/** Precomputed audio analysis (pure data — no AudioBuffer). Produced in apps/web. */
export type AudioAnalysisResult = {
  /** Detected transient / onset times (ms from audio file start). */
  onsetsMs: readonly number[];
  /** Beat grid positions (ms from audio file start, dense). */
  beatMs: readonly number[];
  /** Global BPM estimate from inter-onset / beat intervals. */
  estimatedBpm: number;
  /** Optional per-beat Viterbi trace when analysis runs with tracing enabled. */
  viterbiTrace?: readonly ViterbiBeatTrace[];
};

/** Tempo Node = file wall-clock ms ↔ musical tick (tick 0 ≈ file start). */
export type TempoNode = {
  wallMs: number;
  targetTick: number;
};

export type DriftGateResult =
  | { action: "ignore"; deltaMs: number }
  | { action: "node"; deltaMs: number; wallMs: number; targetTick: number }
  | {
      action: "ramp";
      deltaMs: number;
      start: TempoNode;
      end: TempoNode;
    };

export type ApplyDriftGateOptions = {
  seedBpm: number;
  meter?: TimeSignature;
  ppq?: number;
  /** When true, gradual drift between two observations → ramp pair. */
  gradual?: boolean;
};

export type AudioSmartTempoInput = {
  analysis: AudioAnalysisResult;
  durationMs: number;
  audioStartOffsetMs?: number;
  meter?: TimeSignature;
  ppq?: number;
  floorTicks?: number;
  idPrefix?: string;
  fallbackBpm?: number;
};

export type AudioSmartTempoResult = {
  seedBpm: number;
  tempoMap: TempoEvent[];
  tempoNodes: TempoNode[];
  beatMs: readonly number[];
  warnings: string[];
};

export type UgFormaSectionInput = {
  name: string;
  pipeBarCount: number;
  chordCount: number;
  /** Structural bar offsets from UG chord layout within a frozen Forma span. */
  structuralBars: number;
  vocalAnchored: boolean;
  /** First aligned vocal ms — anacrusis pickup gap after pipe Intro. */
  vocalStartMs?: number | null;
};

export type LayoutFormaFromUgBarCountsOpts = {
  /** Pipe+GAP editorial BPM for pickup bar before vocal sections. */
  layoutBpm?: number;
  meter?: TimeSignature;
  ppq?: number;
};

export type SparsifyTempoNodesOptions = {
  seedBpm: number;
  meter?: TimeSignature;
  ppq?: number;
  /** Emit when |smoothedΔBPM| ≥ this (default {@link SMART_TEMPO_SPARSE_MIN_BPM_DELTA}). */
  minBpmDelta?: number;
  /** Median window in beats (default {@link SMART_TEMPO_SPARSE_WINDOW_BEATS}). */
  windowBeats?: number;
  /** Min bars between nodes (default {@link SMART_TEMPO_SPARSE_MIN_BAR_GAP}). */
  minBarGap?: number;
  /** Reject smoothed jumps larger than this vs last kept (default {@link SMART_TEMPO_SPARSE_MAX_BPM_STEP}). */
  maxBpmStep?: number;
};

export type AlignedWordFormaSection = {
  name: string;
  /** Instrumental pipe length; ignored for sections with words. */
  pipeBarCount: number;
  /** Structural bar count from UG layout / pristine section bars. */
  structuralBars?: number;
  /** First aligned UG↔US word tick on the audio TempoMap (null = no lyrics). */
  firstWordTicks: number | null;
  /** Last aligned word tick (inclusive onset); used when no following section. */
  lastWordTicks: number | null;
};

export type PlaceUsUgBackingAudioOpts = {
  assetId: string;
  durationMs: number;
  waveformPeaks?: number[];
  waveformRms?: number;
  /**
   * Beat 1 / Audio Start Offset (file ms). Applied as `trimInMs` so leading
   * silence is not audible from timeline tick 0 (tempo map is content-epoch).
   */
  audioStartOffsetMs?: number;
  startTicks?: number;
};
