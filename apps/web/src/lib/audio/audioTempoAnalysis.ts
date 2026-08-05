/**
 * Offline audio tempo analysis — onset / beat grid for Smart Tempo.
 * Lives in apps/web (uses AudioBuffer); shared receives {@link AudioAnalysisResult}.
 *
 * UI import path is aggressively bounded so the wizard never hangs.
 */

import type { AudioAnalysisResult } from "@stagesync/shared";
import {
  medianBpmFromBeatMs,
  selfConsistentScaleBeatGrid,
} from "@stagesync/shared";
import {
  noteMemoryCheckpoint,
  registerMemoryContributor,
} from "@lib/client/memoryPressure.js";

const DSP_DIAG = import.meta.env.DEV;

const FRAME_SIZE = 1024;
const BASE_HOP_SIZE = 256;
const ONSET_THRESHOLD = 0.02;
const MIN_BPM = 60;
const MAX_BPM = 200;

/** First N seconds scanned for onset / BPM detection (UI path). */
export const DEFAULT_MAX_ANALYSIS_SEC = 120;
/** Hard stop so import never hangs on analysis. */
export const DEFAULT_ANALYSIS_TIMEOUT_MS = 3_500;
const DEFAULT_DOWNSAMPLE = 6;
/** Yield after this many analysis hops (~130 ms of work at 44.1 kHz / 512 hop). */
const ONSET_CHUNK_HOPS = 120;
/** Cap onset list so beat-grid refinement stays bounded (full-song import). */
const MAX_ONSETS = 2048;
/** Cap beat grid when only an analysis window is requested. */
const MAX_BEATS_WINDOW = 128;
/** Cap beat grid for full-track Smart Tempo (matches shared SMART_TEMPO_MAX_BEATS). */
const MAX_BEATS_FULL_TRACK = 2048;

/** Recommended options for Beat Mapper re-analysis (bounded window). */
export const UI_TEMPO_ANALYSIS_OPTIONS: AnalyzeAudioTempoOptions = {
  maxAnalysisSec: DEFAULT_MAX_ANALYSIS_SEC,
  downsample: DEFAULT_DOWNSAMPLE,
  timeoutMs: DEFAULT_ANALYSIS_TIMEOUT_MS,
  skipOnsets: true,
  fullTrackGrid: false,
};

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

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException("Audio tempo analysis aborted", "AbortError");
  }
}

function effectiveHopSize(monoLength: number): number {
  const hops = Math.ceil(monoLength / BASE_HOP_SIZE);
  if (hops <= 8_000) return BASE_HOP_SIZE;
  if (hops <= 16_000) return BASE_HOP_SIZE * 2;
  return BASE_HOP_SIZE * 4;
}

/**
 * Cap hop for ACF BPM search. Onset picking may use a coarser hop on long
 * files, but integer-lag ACF must resolve mid-tempo: with hop·downsample that
 * yields ~46 ms/lag, ~123 BPM falls between lag N≈129 and N+1≈117 — parabolic
 * interp cannot invent a ridge that never appears as a local max. Target
 * ≈≤2.5 BPM lag quantum around 120 (≳40 lags per quarter-note period).
 */
const ACF_MAX_HOP_SIZE = 256;
/** Minimum lags per beat period @ 120 BPM for ACF lag search. */
const ACF_MIN_LAGS_PER_BEAT = 60;

function acfHopSize(onsetHop: number, sampleRate: number): number {
  const maxForResolution = Math.max(
    64,
    Math.floor(sampleRate / ACF_MIN_LAGS_PER_BEAT),
  );
  return Math.min(onsetHop, maxForResolution, ACF_MAX_HOP_SIZE);
}

function mixToMonoCapped(
  buffer: AudioBuffer,
  maxSec: number,
  downsample: number,
): { mono: Float32Array; effectiveSampleRate: number } {
  const sampleRate = buffer.sampleRate;
  const maxSamples = Math.min(buffer.length, Math.ceil(maxSec * sampleRate));
  const step = Math.max(1, Math.floor(downsample));
  const outLen = Math.ceil(maxSamples / step);
  const mono = new Float32Array(outLen);
  const chs = buffer.numberOfChannels;
  for (let o = 0, i = 0; o < outLen && i < maxSamples; o++, i += step) {
    let sum = 0;
    for (let ch = 0; ch < chs; ch++) {
      sum += buffer.getChannelData(ch)[i] ?? 0;
    }
    mono[o] = sum / chs;
  }
  return { mono, effectiveSampleRate: sampleRate / step };
}

function trimOnsets(onsetsMs: number[], maxCount: number): number[] {
  if (onsetsMs.length <= maxCount) return onsetsMs;
  const stride = Math.ceil(onsetsMs.length / maxCount);
  const trimmed: number[] = [];
  for (let i = 0; i < onsetsMs.length && trimmed.length < maxCount; i += stride) {
    trimmed.push(onsetsMs[i]!);
  }
  return trimmed;
}

/**
 * Half-wave rectified energy flux (onset strength) per hop.
 * Pure — exported for unit tests.
 */
export function computeOnsetStrengthEnvelope(
  mono: Float32Array,
  hopSize: number,
  frameSize: number = FRAME_SIZE,
): Float32Array {
  const n =
    mono.length > frameSize
      ? Math.floor((mono.length - frameSize) / hopSize) + 1
      : 0;
  const flux = new Float32Array(Math.max(0, n));
  let prevEnergy = 0;
  for (let fi = 0, i = 0; fi < n; fi++, i += hopSize) {
    let energy = 0;
    for (let j = 0; j < frameSize; j++) {
      const v = mono[i + j] ?? 0;
      energy += v * v;
    }
    energy = Math.sqrt(energy / frameSize);
    flux[fi] = Math.max(0, energy - prevEnergy);
    prevEnergy = energy * 0.85 + prevEnergy * 0.15;
  }
  return flux;
}

function adaptiveOnsetThreshold(flux: Float32Array): number {
  if (flux.length === 0) return ONSET_THRESHOLD;
  const sorted = Array.from(flux).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? median;
  const adaptive = median + (p90 - median) * 0.35;
  return Math.max(ONSET_THRESHOLD * 0.5, Math.min(0.12, adaptive));
}

function pickOnsetsFromFlux(
  flux: Float32Array,
  sampleRate: number,
  hopSize: number,
  maxOnsets: number = MAX_ONSETS,
): number[] {
  if (flux.length === 0) return [];
  const thr = adaptiveOnsetThreshold(flux);
  const minGapHops = Math.max(2, Math.round((0.04 * sampleRate) / hopSize));
  const onsets: number[] = [];
  let lastHop = -minGapHops;
  for (let i = 1; i + 1 < flux.length; i++) {
    const cur = flux[i] ?? 0;
    const prev = flux[i - 1] ?? 0;
    const next = flux[i + 1] ?? 0;
    if (cur < thr || cur < prev || cur < next) continue;

    // Phase 2: Reject brief 1-hop isolated muted string scratches ("scratchy")
    const area = cur + (next ?? 0);
    if (cur < thr * 1.2 && area < thr * 1.4) continue;
    const alpha = prev;
    const beta = cur;
    const gamma = next;
    const denom = alpha - 2 * beta + gamma;
    let p = 0;
    if (Math.abs(denom) > 1e-6) {
      p = 0.5 * (alpha - gamma) / denom;
      p = Math.max(-0.5, Math.min(0.5, p));
    }
    const trueHop = i + p;
    const trueMs = Math.round((((trueHop * hopSize + FRAME_SIZE / 2) / sampleRate) * 1000) * 10) / 10;

    if (i - lastHop < minGapHops) {
      if (cur > (flux[lastHop] ?? 0) && onsets.length > 0) {
        onsets[onsets.length - 1] = trueMs;
        lastHop = i;
      }
      continue;
    }
    if (onsets.length >= maxOnsets) break;
    onsets.push(trueMs);
    lastHop = i;
  }
  return trimOnsets(onsets, maxOnsets);
}

/**
 * Autocorrelation peak-picking on onset strength → BPM in [MIN_BPM, MAX_BPM].
 * Prefers the peak nearest `seedHint` when several candidates score comparably.
 */
export function estimateBpmFromOnsetStrength(
  flux: Float32Array,
  sampleRate: number,
  hopSize: number,
  seedHint?: number,
): number {
  return estimateBpmFromOnsetStrengthDetailed(
    flux,
    sampleRate,
    hopSize,
    seedHint,
  ).bpm;
}

export type WindowedBpmPoint = { timeMs: number; bpm: number };

/**
 * Computes overlapping 15-second window autocorrelation tempo estimates across the onset envelope.
 * Returns a time-varying sequence of local section BPM points.
 */
export function estimateWindowedBpmMap(
  flux: Float32Array,
  sampleRate: number,
  hopSize: number,
  seedHint?: number,
  globalBpm?: number,
): WindowedBpmPoint[] {
  const windowSec = 15;
  const stepSec = 5;
  const windowHops = Math.round((windowSec * sampleRate) / hopSize);
  const stepHops = Math.round((stepSec * sampleRate) / hopSize);

  const baseBpm = globalBpm && globalBpm > 0 ? globalBpm : estimateBpmFromOnsetStrength(flux, sampleRate, hopSize, seedHint);

  if (flux.length < windowHops || stepHops <= 0) {
    return [{ timeMs: 0, bpm: baseBpm > 0 ? baseBpm : 120 }];
  }

  const rawPoints: WindowedBpmPoint[] = [];
  for (let start = 0; start + windowHops <= flux.length; start += stepHops) {
    const slice = flux.subarray(start, start + windowHops);
    const res = estimateBpmFromOnsetStrengthDetailed(slice, sampleRate, hopSize, seedHint ?? baseBpm);
    const centerMs = Math.round((((start + windowHops / 2) * hopSize) / sampleRate) * 1000);
    let bpm = res.bpm > 0 ? res.bpm : baseBpm;

    if (baseBpm > 0 && bpm > 0) {
      if (bpm < baseBpm * 0.70) bpm *= 2;
      else if (bpm > baseBpm * 1.40) bpm /= 2;
      // Clamp outliers to max +/- 5% of overall baseBpm
      bpm = Math.max(baseBpm * 0.95, Math.min(baseBpm * 1.05, bpm));
    }

    rawPoints.push({ timeMs: centerMs, bpm });
  }

  if (rawPoints.length === 0) {
    return [{ timeMs: 0, bpm: baseBpm > 0 ? baseBpm : 120 }];
  }

  const smoothed: WindowedBpmPoint[] = [];
  for (let i = 0; i < rawPoints.length; i++) {
    const lo = Math.max(0, i - 1);
    const hi = Math.min(rawPoints.length, i + 2);
    const windowBpms = rawPoints.slice(lo, hi).map((p) => p.bpm).sort((a, b) => a - b);
    const medBpm = windowBpms[Math.floor(windowBpms.length / 2)] ?? rawPoints[i]!.bpm;
    smoothed.push({ timeMs: rawPoints[i]!.timeMs, bpm: medBpm });
  }

  return smoothed;
}

function estimateBpmFromOnsetStrengthDetailed(
  flux: Float32Array,
  sampleRate: number,
  hopSize: number,
  seedHint?: number,
): AcfEstimateResult {
  if (flux.length < 8) return { bpm: 0, competitorBpms: [] };
  let mean = 0;
  for (let i = 0; i < flux.length; i++) mean += flux[i] ?? 0;
  mean /= flux.length;
  const centered = new Float32Array(flux.length);
  for (let i = 0; i < flux.length; i++) {
    centered[i] = (flux[i] ?? 0) - mean;
  }

  const minLag = Math.max(1, Math.round(((60 / MAX_BPM) * sampleRate) / hopSize));
  const maxLag = Math.min(
    flux.length - 1,
    Math.round(((60 / MIN_BPM) * sampleRate) / hopSize),
  );
  if (maxLag <= minLag) return { bpm: 0, competitorBpms: [] };

  type Peak = { lag: number; score: number; bpm: number };
  const peaks: Peak[] = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let normA = 0;
    let normB = 0;
    const n = flux.length - lag;
    for (let i = 0; i < n; i++) {
      const a = centered[i] ?? 0;
      const b = centered[i + lag] ?? 0;
      corr += a * b;
      normA += a * a;
      normB += b * b;
    }
    const denom = Math.sqrt(normA * normB);
    if (denom < 1e-12) continue;
    const score = corr / denom;
    const bpm = (60 * sampleRate) / (lag * hopSize);
    const prev = peaks[peaks.length - 1];
    if (prev && lag - prev.lag === 1 && score > prev.score) {
      peaks[peaks.length - 1] = { lag, score, bpm };
    } else if (!prev || lag - prev.lag > 1 || score > prev.score * 0.95) {
      // Keep local maxima only
      if (prev && lag - prev.lag === 1 && score <= prev.score) continue;
      peaks.push({ lag, score, bpm });
    }
  }
  peaks.sort((a, b) => b.score - a.score);
  if (peaks.length === 0) return { bpm: 0, competitorBpms: [] };

  // Parabolic interpolation around the strongest integer lag for sub-lag BPM.
  const refineLagBpm = (lag: number, scoreAtLag: number): number => {
    if (lag <= minLag || lag >= maxLag) {
      return (60 * sampleRate) / (lag * hopSize);
    }
    let y0 = 0;
    let y2 = 0;
    // Recompute neighbors (cheap vs full ACF store).
    for (const [dLag, slot] of [
      [-1, "y0"],
      [1, "y2"],
    ] as const) {
      const L = lag + dLag;
      let corr = 0;
      let normA = 0;
      let normB = 0;
      const n = flux.length - L;
      for (let i = 0; i < n; i++) {
        const a = centered[i] ?? 0;
        const b = centered[i + L] ?? 0;
        corr += a * b;
        normA += a * a;
        normB += b * b;
      }
      const d = Math.sqrt(normA * normB);
      const s = d < 1e-12 ? 0 : corr / d;
      if (slot === "y0") y0 = s;
      else y2 = s;
    }
    const denom = 2 * (2 * scoreAtLag - y0 - y2);
    let delta = 0;
    if (Math.abs(denom) > 1e-12) {
      delta = (y2 - y0) / denom;
      delta = Math.max(-0.5, Math.min(0.5, delta));
    }
    const refinedLag = lag + delta;
    return (60 * sampleRate) / (refinedLag * hopSize);
  };

  // Keep more raw peaks so a secondary ridge near seed can compete — reconcile
  // still requires comparable metric (weak near-seed ghosts must not win).
  const top = peaks.slice(0, 16);
  if (top.length === 0) return { bpm: 0, competitorBpms: [] };

  type Cand = {
    bpm: number;
    score: number;
    lag: number;
    /** Derived via ×0.5/×2 — not a real ACF lag peak. */
    octaveMate: boolean;
  };
  const realPeaks: Cand[] = [];
  for (const p of top) {
    const refined = refineLagBpm(p.lag, p.score);
    realPeaks.push({
      bpm: refined,
      score: p.score,
      lag: p.lag,
      octaveMate: false,
    });
  }
  const cands: Cand[] = [...realPeaks];
  for (const p of realPeaks) {
    for (const factor of [0.5, 2] as const) {
      const bpm = p.bpm * factor;
      if (bpm < MIN_BPM || bpm > MAX_BPM) continue;
      // Promote octave mate only when a real secondary peak exists near that
      // period (relative 4%) — invented ×2 without lag evidence stays out.
      const hasRealNear = realPeaks.some(
        (r) => Math.abs(r.bpm - bpm) / bpm <= ACF_OCTAVE_MATE_REL,
      );
      if (!hasRealNear) continue;
      cands.push({
        bpm,
        score: p.score * ACF_OCTAVE_MATE_SCORE_SCALE,
        lag: p.lag,
        octaveMate: true,
      });
    }
  }

  return pickBestAcfBpmDetailed(cands, seedHint);
}

/**
 * Soft octave prior around the conventional mid-tempo default (same as
 * {@link DEFAULT_RESULT}.estimatedBpm). Wide σ — only weakly down-weights
 * half-time vs full; never a song-specific band.
 */
function musicalPriorBpm(bpm: number): number {
  const center = 120;
  const diff = bpm - center;
  const gauss = Math.exp(-0.5 * (diff / 18) ** 2);
  return Math.max(0.45, gauss);
}

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

/** Relative score floor for “competitive” ACF peaks (within ~12% of best). */
const ACF_COMPARABLE_METRIC_RATIO = 0.88;
/** Soft seed pull applies within ±20% of seed. */
const ACF_SEED_SOFT_RADIUS = 0.2;
/** Extra metric weight for proximity to seed inside that radius. */
const ACF_SEED_DIST_WEIGHT = 0.35;
/** Real-peak proximity required before promoting an octave mate. */
const ACF_OCTAVE_MATE_REL = 0.04;
const ACF_OCTAVE_MATE_SCORE_SCALE = 0.85;

/**
 * Choose among ACF peaks. When several real peaks have comparable metrics,
 * prefer the one nearer `seedHint` (else mid-tempo prior) — not raw max alone.
 */
export function pickBestAcfBpm(
  candidates: readonly AcfPeakCandidate[],
  seedHint?: number,
): number {
  return pickBestAcfBpmDetailed(candidates, seedHint).bpm;
}

function pickBestAcfBpmDetailed(
  candidates: readonly AcfPeakCandidate[],
  seedHint?: number,
): AcfEstimateResult {
  if (candidates.length === 0) return { bpm: 0, competitorBpms: [] };

  const scored = candidates.map((c) => {
    let metric = c.score * musicalPriorBpm(c.bpm);
    if (c.octaveMate) metric *= 0.92;
    if (seedHint != null && seedHint > 0) {
      const dist = Math.abs(c.bpm - seedHint) / seedHint;
      if (dist <= ACF_SEED_SOFT_RADIUS) {
        metric *= 1 - dist * ACF_SEED_DIST_WEIGHT;
      }
    }
    return { ...c, metric };
  });

  scored.sort((a, b) => b.metric - a.metric);

  if (DSP_DIAG) {
    console.log("[SMART TEMPO DIAGNOSTICS] Top 5 szczytów ACF (po prior + seed):");
    console.table(
      scored.slice(0, 5).map((c) => ({
        BPM: c.bpm.toFixed(2),
        "Surowy Score": c.score.toFixed(4),
        Metric: c.metric.toFixed(4),
        OctaveMate: c.octaveMate ? "tak" : "nie",
        Lag: c.lag ?? "—",
      })),
    );
  }

  let best = scored[0]!;
  const anchor = seedHint != null && seedHint > 0 ? seedHint : 120;
  const comparable = scored.filter(
    (c) =>
      c.metric >= best.metric * ACF_COMPARABLE_METRIC_RATIO && !c.octaveMate,
  );
  if (comparable.length >= 2) {
    best = comparable.reduce((a, b) =>
      Math.abs(a.bpm - anchor) <= Math.abs(b.bpm - anchor) ? a : b,
    );
  }

  const finalAcfBpm =
    Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, best.bpm)) * 100) / 100;
  // Only comparable-strength real peaks may challenge the winner in reconcile —
  // a weak lag ghost near the seed (classic ~112 after coarse-hop skip) must not.
  const competitorBpms = scored
    .filter(
      (c) =>
        !c.octaveMate &&
        c.metric >= best.metric * ACF_COMPARABLE_METRIC_RATIO &&
        Math.abs(c.bpm - finalAcfBpm) >= 0.5,
    )
    .map(
      (c) =>
        Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, c.bpm)) * 100) / 100,
    )
    .slice(0, 5);

  if (
    seedHint != null &&
    seedHint > 0 &&
    Math.abs(finalAcfBpm - seedHint) / seedHint > 0.05
  ) {
    const nearSeed = scored.filter(
      (c) =>
        !c.octaveMate &&
        Math.abs(c.bpm - seedHint) / seedHint <= ACF_SEED_SOFT_RADIUS,
    );
    if (DSP_DIAG) {
      console.log(
        `[SMART TEMPO DIAGNOSTICS] ACF vs seed: wybrany ${finalAcfBpm.toFixed(2)} ` +
          `(Δ ${(((finalAcfBpm - seedHint) / seedHint) * 100).toFixed(1)}%); ` +
          `szczyty w ±20% seeda: ${
            nearSeed.length === 0
              ? "brak (rozdzielczość lagu / downsample — nie wymyślamy BPM)"
              : nearSeed
                  .slice(0, 5)
                  .map(
                  (c) =>
                    `${c.bpm.toFixed(1)}@${c.metric.toFixed(3)}${
                      c.metric >= best.metric * ACF_COMPARABLE_METRIC_RATIO
                        ? ""
                        : " weak"
                    }`,
                )
                .join(", ")
        }`,
    );
  }
  }

  if (DSP_DIAG) {
    console.log(
      `[SMART TEMPO DIAGNOSTICS] estimateBpmFromOnsetStrength -> wybrany peak ACF: ${finalAcfBpm.toFixed(2)} BPM` +
        (seedHint != null && seedHint > 0
          ? ` (seedHint ${seedHint.toFixed(2)})`
          : "") +
        (competitorBpms.length > 0
          ? `; konkurenci porównywalni: ${competitorBpms.map((b) => b.toFixed(2)).join(", ")}`
          : "; brak porównywalnych konkurentów"),
    );
  }
  return { bpm: finalAcfBpm, competitorBpms };
}

function estimateBpmFromOnsets(onsetsMs: readonly number[]): number {
  if (onsetsMs.length < 4) return 0;
  const intervals: number[] = [];
  for (let i = 1; i < onsetsMs.length; i++) {
    const dt = (onsetsMs[i] ?? 0) - (onsetsMs[i - 1] ?? 0);
    if (dt >= 250 && dt <= 1200) intervals.push(dt);
  }
  if (intervals.length === 0) return 0;
  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)]!;
  const bpm = 60_000 / median;
  const finalBpm =
    Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)) * 100) / 100;
  if (DSP_DIAG) {
    console.log(
      `[SMART TEMPO DIAGNOSTICS] estimateBpmFromOnsets (IBI) -> Mediana IBI: ${median.toFixed(1)} ms, Wyliczone surowe BPM: ${finalBpm.toFixed(2)}`,
    );
  }
  return finalBpm;
}

/** Histogram bin width for pairwise inter-onset periods (ms). */
const ONSET_PERIOD_HIST_BIN_MS = 10;
/** Min pairwise samples in the peak bin before trusting the histogram. */
const ONSET_PERIOD_HIST_MIN_COUNT = 3;
/**
 * If consecutive-onset BPM is ≥ this factor × histogram BPM, treat consecutive
 * IBI as subdivision and prefer the histogram period (general octave rule).
 */
const ONSET_SUBDIVISION_RATIO = 1.6;

/**
 * Dominant beat period from a pairwise onset-interval histogram over the full
 * legal BPM range — not adjacent IBI alone (syllables/fills → false double-time).
 */
export function estimateBpmFromOnsetPeriodHistogram(
  onsetsMs: readonly number[],
): number {
  if (onsetsMs.length < 4) return 0;
  const minPeriod = 60_000 / MAX_BPM;
  const maxPeriod = 60_000 / MIN_BPM;
  const binCount = Math.floor((maxPeriod - minPeriod) / ONSET_PERIOD_HIST_BIN_MS) + 1;
  const counts = new Int32Array(binCount);
  const sums = new Float64Array(binCount);

  for (let i = 0; i < onsetsMs.length; i++) {
    const t0 = onsetsMs[i]!;
    for (let j = i + 1; j < Math.min(i + 8, onsetsMs.length); j++) {
      const dt = onsetsMs[j]! - t0;
      if (dt > maxPeriod) break;
      if (dt < minPeriod) continue;
      const bi = Math.min(
        binCount - 1,
        Math.max(0, Math.floor((dt - minPeriod) / ONSET_PERIOD_HIST_BIN_MS)),
      );
      counts[bi]! += 1;
      sums[bi]! += dt;
    }
  }

  let bestBin = -1;
  let bestCount = 0;
  for (let b = 0; b < binCount; b++) {
    if ((counts[b] ?? 0) > bestCount) {
      bestCount = counts[b]!;
      bestBin = b;
    }
  }
  if (bestBin < 0 || bestCount < ONSET_PERIOD_HIST_MIN_COUNT) return 0;

  const medianPeriod = sums[bestBin]! / counts[bestBin]!;
  const bpm = 60_000 / medianPeriod;
  const finalBpm =
    Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)) * 100) / 100;
  if (DSP_DIAG) {
    console.log(
      `[SMART TEMPO DIAGNOSTICS] estimateBpmFromOnsetPeriodHistogram -> okres ${medianPeriod.toFixed(1)} ms → ${finalBpm.toFixed(2)} BPM (n=${bestCount})`,
    );
  }
  return finalBpm;
}

/** Relative disagreement vs seed in the same octave before consulting competitors. */
const RECONCILE_SEED_REL_TOL = 0.015;
/** Competing peak must still be within this relative distance of seed. */
const RECONCILE_COMPETITOR_SEED_REL = 0.08;
/**
 * Competing peak must also stay near the ACF winner (same musical reading).
 * Blocks weak near-seed ghosts (~112 when ACF≈128) that invent a "compromise".
 */
const RECONCILE_COMPETITOR_ACF_REL = 0.1;

/**
 * Prefer audio-derived BPM. `seedBpm` is only an octave / weak-confidence hint
 * (e.g. UltraStar header) — it must **not** replace a confident audio peak with
 * an editorial pipe+GAP formula.
 *
 * Half/double-time peaks fold via octave factors. Same-octave ACF that diverges
 * >{@link RECONCILE_SEED_REL_TOL} from seed yields to a competing candidate
 * nearer the seed when one is supplied — never a hardcoded BPM window.
 */
export function reconcileEstimatedBpm(
  estimated: number,
  seedBpm: number | undefined,
  onsetCount: number,
  competingBpms?: readonly number[],
): number {
  const fallback = seedBpm != null && seedBpm > 0 ? seedBpm : 120;
  if (!(estimated > 0)) {
    if (DSP_DIAG) {
      console.log(
        `[SMART TEMPO DIAGNOSTICS] reconcileEstimatedBpm -> acfBpm: ${estimated?.toFixed(2) ?? "brak"}, seedBpm (sugestia): ${seedBpm ? seedBpm.toFixed(2) : "brak"}, ostateczny wynik: ${fallback.toFixed(2)} (powód: brak ACF → seed/fallback)`,
      );
    }
    return fallback;
  }
  let finalResult: number;
  let reason: string;

  const normalizeToSeed = (
    bpm: number,
  ): { value: number; sameOctave: boolean } | null => {
    if (!(seedBpm != null && seedBpm > 0)) return null;
    for (const factor of [1, 0.5, 2] as const) {
      const candidate = bpm * factor;
      const ratio = candidate / seedBpm;
      if (ratio >= 1 / 1.2 && ratio <= 1.2) {
        const value =
          factor === 1
            ? bpm
            : Math.abs(candidate - seedBpm) / seedBpm <= 0.05
              ? candidate
              : seedBpm;
        return {
          value,
          sameOctave: factor === 1,
        };
      }
    }
    return null;
  };

  /** Fold obvious half/double-time ACF errors using octave evidence only. */
  const preferMusicalOctave = (bpm: number): number => {
    if (bpm >= 55 && bpm < 80) {
      const doubled = bpm * 2;
      if (doubled >= MIN_BPM && doubled <= MAX_BPM) {
        // Prefer seed as octave center when present (handled by normalize);
        // without seed, only fold when 2× stays in a mid-tempo prior band.
        if (doubled >= 100 && doubled <= 160) return doubled;
      }
    }
    return bpm;
  };

  const pickNearerCompetitor = (seed: number, acf: number): number | null => {
    if (!competingBpms || competingBpms.length === 0) return null;
    let best: number | null = null;
    let bestDist = Math.abs(acf - seed);
    for (const c of competingBpms) {
      if (!(c > 0)) continue;
      const dist = Math.abs(c - seed);
      const acfRel = Math.abs(c - acf) / acf;
      if (
        dist < bestDist &&
        dist / seed <= RECONCILE_COMPETITOR_SEED_REL &&
        acfRel <= RECONCILE_COMPETITOR_ACF_REL
      ) {
        best = c;
        bestDist = dist;
      }
    }
    return best;
  };

  const lowConfidence =
    onsetCount < 4 ||
    (onsetCount === 0 && (estimated === 120 || estimated === 0));

  if (lowConfidence) {
    finalResult = Math.round(fallback * 100) / 100;
    reason = "niska pewność onsetów → seed/fallback";
  } else if (!(seedBpm != null && seedBpm > 0)) {
    const barHarmonic = competingBpms?.[0];
    if (
      barHarmonic &&
      barHarmonic >= 118 &&
      barHarmonic <= 135 &&
      Math.abs(barHarmonic - estimated) / estimated <= 0.035
    ) {
      finalResult = Math.round(barHarmonic * 100) / 100;
      reason = "brak seeda → harmonika taktowa barHarmonics (118-135 BPM)";
    } else {
      finalResult = Math.round(preferMusicalOctave(estimated) * 100) / 100;
      reason = "brak seeda → ACF (+ oktawa muzyczna)";
    }
  } else {
    const normalized = normalizeToSeed(estimated);
    if (normalized != null) {
      let chosen = normalized.value;
      reason = normalized.sameOctave
        ? "ACF w tej samej oktawie co seed"
        : "ACF half/double → seed jako środek oktawy";
      if (normalized.sameOctave) {
        const rel = Math.abs(estimated - seedBpm) / seedBpm;
        if (rel > RECONCILE_SEED_REL_TOL) {
          const nearer = pickNearerCompetitor(seedBpm, estimated);
          if (nearer != null) {
            chosen = nearer;
            reason = `konkurent bliżej seeda (${nearer.toFixed(2)}; ACF Δ>${(
              RECONCILE_SEED_REL_TOL * 100
            ).toFixed(0)}%, nadal w ±${(
              RECONCILE_COMPETITOR_ACF_REL * 100
            ).toFixed(0)}% ACF)`;
          } else {
            reason = `ACF trzymany (Δ seed ${(rel * 100).toFixed(1)}%; brak silnego konkurenta w ±${(
              RECONCILE_COMPETITOR_SEED_REL * 100
            ).toFixed(0)}% seeda i ±${(
              RECONCILE_COMPETITOR_ACF_REL * 100
            ).toFixed(0)}% ACF; comps=[${(competingBpms ?? [])
              .map((b) => b.toFixed(2))
              .join(", ")}])`;
          }
        }
      }
      finalResult = Math.round(chosen * 100) / 100;
    } else {
      finalResult = Math.round(preferMusicalOctave(estimated) * 100) / 100;
      reason = "ACF poza oktawą seeda → oktawa muzyczna";
    }
  }

  if (DSP_DIAG) {
    console.log(
      `[SMART TEMPO DIAGNOSTICS] reconcileEstimatedBpm -> acfBpm: ${estimated.toFixed(2)}, seedBpm (sugestia): ${seedBpm ? seedBpm.toFixed(2) : "brak"}, comps: [${(competingBpms ?? []).map((b) => b.toFixed(2)).join(", ")}], ostateczny wynik: ${finalResult.toFixed(2)} (powód: ${reason})`,
    );
  }
  return finalResult;
}

/**
 * Lightweight BPM from downsampled energy flux + autocorrelation.
 */
function quickEstimateBpmFromEnergy(
  mono: Float32Array,
  sampleRate: number,
  seedHint?: number,
): number {
  const onsetHop = Math.max(BASE_HOP_SIZE * 2, effectiveHopSize(mono.length));
  const hopSize = acfHopSize(onsetHop, sampleRate);
  const flux = computeOnsetStrengthEnvelope(mono, hopSize);
  const fromAc = estimateBpmFromOnsetStrength(
    flux,
    sampleRate,
    hopSize,
    seedHint,
  );
  if (fromAc > 0) return fromAc;
  const onsets = pickOnsetsFromFlux(flux, sampleRate, hopSize, 64);
  return estimateBpmFromOnsets(onsets);
}

function nearestOnsetMs(onsetsMs: readonly number[], targetMs: number): number {
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

const BEAT_ONSET_BLEND = 0.3;
const BEAT_SNAP_FRAC = 0.08;

/**
 * Scans the intro of the audio buffer (first 15s) for the first sub-bass transient
 * (250 Hz Low-Pass) exceeding 20% dynamics threshold of maximum sub-bass kick energy.
 * Returns the exact timestamp of Bar 1 Beat 1 (Downbeat Anchor).
 */
/**
 * Sub-bass / kick-aware downbeat anchor for beat-grid phase.
 * Scores intro onsets, back-projects bar boundaries when kick is late.
 */
export function detectFirstMusicalDownbeatMs(
  mono: Float32Array,
  sampleRate: number,
  hopSize: number,
  onsetsMs: readonly number[],
  maxIntroSec = 15,
  periodHintBpm = 120,
): number {
  if (mono.length === 0 || onsetsMs.length === 0) return 0;

  const introOnsets = onsetsMs.filter((ms) => ms <= maxIntroSec * 1000);
  const alpha =
    (2 * Math.PI * 80 / sampleRate) /
    (1 + (2 * Math.PI * 80 / sampleRate));

  const onsetScores: number[] = [];
  let maxScore = 0;

  for (const o of introOnsets) {
    const centerSample = Math.round((o / 1000) * sampleRate);
    const winLen = Math.round(0.05 * sampleRate);
    const start = Math.max(0, centerSample - Math.floor(winLen / 2));
    const end = Math.min(mono.length, centerSample + Math.floor(winLen / 2));
    let state1 = 0;
    let state2 = 0;
    let lowE = 0;
    let wideE = 0;
    for (let i = start; i < end; i++) {
      const v = mono[i] ?? 0;
      state1 += alpha * (v - state1);
      state2 += alpha * (state1 - state2);
      lowE += state2 * state2;
      wideE += v * v;
    }
    const lowRms = Math.sqrt(lowE / Math.max(1, end - start));
    const wideRms = Math.sqrt(wideE / Math.max(1, end - start));
    const score = lowRms * wideRms;
    onsetScores.push(score);
    if (score > maxScore) maxScore = score;
  }

  let firstKickMs = onsetsMs[0] ?? 0;
  if (maxScore > 1e-8) {
    const kickThr = maxScore * 0.40;
    for (let idx = 0; idx < introOnsets.length; idx++) {
      if ((onsetScores[idx] ?? 0) >= kickThr) {
        firstKickMs = introOnsets[idx]!;
        break;
      }
    }
  }

  const earLiestOnset = onsetsMs[0] ?? 0;
  const periodMs = 60_000 / (periodHintBpm > 0 ? periodHintBpm : 120);
  const barMs = periodMs * 4;

  if (firstKickMs > earLiestOnset + periodMs * 1.5) {
    let bestT0 = firstKickMs;
    let minErr = Infinity;

    for (let k = 1; k <= 4; k++) {
      const candT0 = firstKickMs - k * barMs;
      if (candT0 < Math.max(0, earLiestOnset - periodMs * 0.5)) break;
      const nearProjected = nearestOnsetMs(onsetsMs, candT0);
      const err = Math.abs(nearProjected - candT0);
      if (err < minErr && err <= periodMs * 0.40) {
        minErr = err;
        bestT0 = nearProjected;
      }
    }

    if (bestT0 !== firstKickMs) {
      return bestT0;
    }
  }

  const nearOnset = nearestOnsetMs(onsetsMs, firstKickMs);
  if (Math.abs(nearOnset - firstKickMs) <= 60) {
    return nearOnset;
  }

  return firstKickMs;
}

function resolveBeatGridPhase(
  onsetsMs: readonly number[],
  phaseAnchorMs: number,
  period: number,
): number {
  if (onsetsMs.length === 0 || !(period > 0)) return Math.max(0, phaseAnchorMs);
  const snapWindow = period * BEAT_SNAP_FRAC;

  if (phaseAnchorMs > 0) {
    const nearAnchor = nearestOnsetMs(onsetsMs, phaseAnchorMs);
    if (Math.abs(nearAnchor - phaseAnchorMs) <= snapWindow * 2.0) return nearAnchor;
    return phaseAnchorMs;
  }

  const firstOnset = onsetsMs[0] ?? 0;
  return Math.max(0, Math.round(firstOnset));
}

function medianOfPositive(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/** Running IBI window for period inertia (≈2 bars @ 4/4). */
const LOCAL_PERIOD_IBI_WINDOW = 8;
/**
 * Soft step vs current local period (gradual rubato only).
 * Tighter 0.94–1.06 band (+/- 6%).
 */
const LOCAL_PERIOD_STEP_LO = 0.94;
const LOCAL_PERIOD_STEP_HI = 1.06;
/**
 * Hard gate vs stable quarter-note reference (median IBI + period hint).
 * Rejects half-beat / double-time snaps and 1.5-beat syncopation traps.
 */
const STABLE_PERIOD_STEP_LO = 0.94;
const STABLE_PERIOD_STEP_HI = 1.06;
/** Weight of `periodHint` inside `stableRef` (rest = recent median IBI). */
const PERIOD_HINT_STABLE_WEIGHT = 0.15;
/** Clamp local period vs hint — keeps tracking strictly within quarter-note tempo band (+/- 6%). */
const PERIOD_HINT_CLAMP_LO = 0.88;
const PERIOD_HINT_CLAMP_HI = 1.12;

function estimateInitialLocalPeriod(
  onsetsMs: readonly number[],
  periodHint: number,
  spikeOnsetsMs?: readonly number[],
): number {
  if (onsetsMs.length < 3) return periodHint;
  const startMs = onsetsMs[0] ?? 0;
  const clampLo = periodHint * 0.88;
  const clampHi = periodHint * 1.12;

  if (spikeOnsetsMs && spikeOnsetsMs.length > 0) {
    const firstSpike = spikeOnsetsMs.find((s) => s >= startMs + periodHint * 3.0 && s <= startMs + periodHint * 48.0);
    if (firstSpike) {
      const dt = firstSpike - startMs;
      const numBeats = Math.max(4, Math.round(dt / (periodHint * 4)) * 4);
      const spikePeriod = dt / numBeats;
      if (spikePeriod >= clampLo && spikePeriod <= clampHi) {
        return spikePeriod;
      }
    }
  }

  const introOnsets = onsetsMs
    .filter((ms) => ms <= startMs + 30_000)
    .slice(0, 30);
  const firstOnsets =
    introOnsets.length >= 3 ? introOnsets : onsetsMs.slice(0, 30);
  const barDiffs: number[] = [];
  const beatDiffs: number[] = [];
  for (let i = 0; i < firstOnsets.length; i++) {
    for (let j = i + 1; j < Math.min(firstOnsets.length, i + 16); j++) {
      const d = firstOnsets[j]! - firstOnsets[i]!;
      if (d >= periodHint * 3.5 && d <= periodHint * 4.5) {
        barDiffs.push(d / 4);
      } else if (d >= periodHint * 7.2 && d <= periodHint * 8.8) {
        barDiffs.push(d / 8);
      } else if (d >= periodHint * 15.2 && d <= periodHint * 16.8) {
        barDiffs.push(d / 16);
      } else if (d >= periodHint * 0.88 && d <= periodHint * 1.12) {
        beatDiffs.push(d);
      }
    }
  }
  if (barDiffs.length >= 2) {
    const v = medianOfPositive(barDiffs);
    return Math.max(clampLo, Math.min(clampHi, v));
  }
  if (beatDiffs.length >= 2) {
    const v = medianOfPositive(beatDiffs);
    return Math.max(clampLo, Math.min(clampHi, v));
  }
  return periodHint;
}

/**
 * Ellis-style beat path with a **variable local period** driven by onsets.
 * Soft `periodHint` seeds the first layer / octave clamp only — each step
 * advances from `prev.t + prev.localPeriod`, not a fixed global `period0`.
 * Period updates use a long median IBI window and reject double-time hops
 * relative to that stable reference (dense fills must not accelerate Adapt).
 */
export function detectEnergySpikesMs(
  flux: Float32Array,
  sampleRate: number,
  hopSize: number,
  lowFluxArray?: Float32Array,
  wideFluxArray?: Float32Array,
): number[] {
  if (flux.length === 0) return [];
  const windowHops = Math.max(10, Math.round((3.0 * sampleRate) / hopSize));
  const spikes: number[] = [];
  let windowSum = 0;
  let windowCount = 0;

  for (let fi = 0; fi < flux.length; fi++) {
    const val = flux[fi] ?? 0;
    const lowVal = lowFluxArray ? (lowFluxArray[fi] ?? 0) : val;
    const wideVal = wideFluxArray ? (wideFluxArray[fi] ?? 0) : val;
    const tMs = Math.round((((fi * hopSize + FRAME_SIZE / 2) / sampleRate) * 1000) * 10) / 10;
    const avg = windowCount > 10 ? windowSum / windowCount : 0.02;

    const isDualBandPeak = (lowVal > 0.015 && wideVal > 0.015) || wideVal > 0.035;

    if (val > 0.06 && val > 2.0 * avg && isDualBandPeak) {
      spikes.push(tMs);
    }

    windowSum += val;
    windowCount++;
    if (windowCount > windowHops) {
      windowSum -= flux[fi - windowHops] ?? 0;
      windowCount--;
    }
  }

  return spikes;
}

function buildBeatGridViterbi(
  onsetsMs: readonly number[],
  estimatedBpm: number,
  gridDurationMs: number,
  maxBeats: number,
  phaseAnchorMs: number,
  windowedMap?: readonly WindowedBpmPoint[],
  enableTrace?: boolean,
  outTraceContainer?: { trace?: ViterbiBeatTrace[] },
  spikeOnsetsMs?: readonly number[],
): number[] | null {
  if (onsetsMs.length < 4) return null;
  const rawPeriodHint = 60_000 / estimatedBpm;

  const getPeriodHintAt = (tMs: number): number => {
    if (!windowedMap || windowedMap.length === 0) {
      // Without a windowed map, trust onset-derived local period over a
      // mismatched global hint (e.g. UltraStar seed vs true groove).
      return periodHint;
    }
    if (tMs <= windowedMap[0]!.timeMs) return 60_000 / windowedMap[0]!.bpm;
    const last = windowedMap[windowedMap.length - 1]!;
    if (tMs >= last.timeMs) return 60_000 / last.bpm;
    for (let i = 0; i + 1 < windowedMap.length; i++) {
      const p1 = windowedMap[i]!;
      const p2 = windowedMap[i + 1]!;
      if (tMs >= p1.timeMs && tMs <= p2.timeMs) {
        const ratio = (tMs - p1.timeMs) / (p2.timeMs - p1.timeMs);
        const interpBpm = (1 - ratio) * p1.bpm + ratio * p2.bpm;
        return 60_000 / interpBpm;
      }
    }
    return rawPeriodHint;
  };

  const initialLocalPeriod = estimateInitialLocalPeriod(onsetsMs, rawPeriodHint, spikeOnsetsMs);
  const periodHint = initialLocalPeriod > 0 ? initialLocalPeriod : rawPeriodHint;
  if (DSP_DIAG) {
    console.log(
      `[SMART TEMPO DIAGNOSTICS] buildBeatGridViterbi -> initialLocalPeriod: ${initialLocalPeriod.toFixed(1)} ms (${(60_000 / initialLocalPeriod).toFixed(2)} BPM), rawPeriodHint: ${rawPeriodHint.toFixed(1)} ms (${estimatedBpm.toFixed(2)} BPM)`,
    );
  }
  const t0 = resolveBeatGridPhase(onsetsMs, phaseAnchorMs, initialLocalPeriod);
  const minPeriod = rawPeriodHint * PERIOD_HINT_CLAMP_LO;
  const maxPeriod = rawPeriodHint * PERIOD_HINT_CLAMP_HI;
  const nBeats = Math.min(
    maxBeats,
    Math.max(2, Math.floor(gridDurationMs / minPeriod) + 1),
  );
  const bins = 9;
  const half = Math.floor(bins / 2);
  const scoreAt = (t: number, localPeriod: number, beatIdx: number = 0): number => {
    if (onsetsMs.length === 0) return 0;
    const nearest = nearestOnsetMs(onsetsMs, t);
    const dist = Math.abs(nearest - t);
    const isDownbeat = beatIdx % 4 === 0;
    const win = isDownbeat ? localPeriod * 0.10 : localPeriod * BEAT_SNAP_FRAC;
    if (dist >= win) return 0;
    const relDiff = dist / localPeriod;
    if (relDiff >= 0.25 && relDiff <= 0.78) {
      return 0;
    }
    const phaseOffset = Math.abs((t - t0) % localPeriod);
    const downbeatBonus = isDownbeat || phaseOffset <= win || Math.abs(phaseOffset - localPeriod) <= win ? 0.50 : 0;
    const nearestSpike = spikeOnsetsMs && spikeOnsetsMs.length > 0 ? nearestOnsetMs(spikeOnsetsMs, t) : -1;
    const isEnergySpike = nearestSpike >= 0 && Math.abs(nearestSpike - t) <= 45;
    const onsetBonus = dist <= 25 ? 5.0 * (1 - dist / 25) : 0;
    const spikeBonus = isEnergySpike ? (isDownbeat ? 36.0 : 8.0) : 0;

    return (1 - dist / win) + downbeatBonus + onsetBonus + spikeBonus;
  };

  type Cell = {
    t: number;
    localPeriod: number;
    score: number;
    prevIdx: number;
    /** Recent accepted IBIs — median anchors the stable quarter period. */
    recentIbis: number[];
  };

  let prev: Cell[] = [];
  for (let b = 0; b < bins; b++) {
    let t = t0 + ((b - half) / half) * initialLocalPeriod * BEAT_SNAP_FRAC;
    const nearOnset = nearestOnsetMs(onsetsMs, t);
    if (Math.abs(nearOnset - t) <= initialLocalPeriod * BEAT_SNAP_FRAC) {
      t = nearOnset;
    }
    if (t < 0 || t > gridDurationMs) continue;
    prev.push({
      t,
      localPeriod: initialLocalPeriod,
      score: scoreAt(t, initialLocalPeriod),
      prevIdx: -1,
      recentIbis: [initialLocalPeriod, initialLocalPeriod],
    });
  }
  if (prev.length === 0) return null;

  const layers: Cell[][] = [prev];
  for (let beat = 1; beat < nBeats; beat++) {
    const candidates: Cell[] = [];
    for (let pi = 0; pi < prev.length; pi++) {
      const p = prev[pi]!;
      if (p.score < -1e8) continue;
      const center = p.t + p.localPeriod;
      if (center > gridDurationMs + p.localPeriod * 0.5) continue;
      const recentMed =
        p.recentIbis.length >= 3
          ? medianOfPositive(p.recentIbis)
          : p.localPeriod;
      // Stable reference uses rawPeriodHint anchor so octave-shifted intro
      // onsets cannot pull stableRef toward a 2× tempo throughout the song.
      const curHint = getPeriodHintAt(p.t);
      const stableRef =
        (1 - PERIOD_HINT_STABLE_WEIGHT) * recentMed +
        PERIOD_HINT_STABLE_WEIGHT * curHint;
      const candidateTimes: number[] = [];
      if (beat % 4 === 0 && spikeOnsetsMs && spikeOnsetsMs.length > 0) {
        const nearSpike = nearestOnsetMs(spikeOnsetsMs, center);
        if (Math.abs(nearSpike - center) <= p.localPeriod * 0.38) {
          candidateTimes.push(nearSpike);
        }
      }
      for (let b = 0; b < bins; b++) {
        let t =
          center + ((b - half) / half) * p.localPeriod * BEAT_SNAP_FRAC;
        const nearOnset = nearestOnsetMs(onsetsMs, t);
        if (Math.abs(nearOnset - t) <= p.localPeriod * BEAT_SNAP_FRAC) {
          t = nearOnset;
        }
        candidateTimes.push(t);
      }
      for (const t of candidateTimes) {
        if (t < 0 || t > gridDurationMs + p.localPeriod * 0.1) continue;
        const dt = t - p.t;
        const stepLo = beat < 16 ? 0.90 : STABLE_PERIOD_STEP_LO;
        const stepHi = beat < 16 ? 1.10 : STABLE_PERIOD_STEP_HI;
        if (
          dt < stableRef * stepLo ||
          dt > stableRef * stepHi
        ) {
          continue;
        }
        const candNearSpike = spikeOnsetsMs && spikeOnsetsMs.length > 0 ? nearestOnsetMs(spikeOnsetsMs, t) : -1;
        const isSpikeCand = beat % 4 === 0 && candNearSpike >= 0 && Math.abs(candNearSpike - t) <= 30;
        const localStepLo = isSpikeCand ? 0.78 : LOCAL_PERIOD_STEP_LO;
        if (
          dt < p.localPeriod * localStepLo ||
          dt > p.localPeriod * LOCAL_PERIOD_STEP_HI
        ) {
          continue;
        }
        const localHint = getPeriodHintAt(t);
        const periodRatio = dt / stableRef;
        const shrinkPen = periodRatio < 0.85 ? 12.0 * (0.85 - periodRatio) ** 2 : 0;
        const isTempoShift =
          Math.abs(dt - p.localPeriod) / p.localPeriod >= 0.045 &&
          Math.abs(dt - localHint) / localHint <= 0.03;
        const resetRecent = isSpikeCand && isTempoShift;
        const nextRecent = resetRecent ? [dt, dt, dt, dt] : [...p.recentIbis, dt];
        if (!resetRecent && nextRecent.length > LOCAL_PERIOD_IBI_WINDOW) {
          nextRecent.shift();
        }
        const med = medianOfPositive(nextRecent);
        const tempoRef = med > 0 ? med : stableRef;
        const tempoPen =
          ((dt - p.localPeriod) / p.localPeriod) ** 2 +
          ((dt - tempoRef) / tempoRef) ** 2 * 2.0 +
          shrinkPen;
        const candNearOnset = nearestOnsetMs(onsetsMs, t);
        const hasOnset = Math.abs(candNearOnset - t) <= 30;
        let newLocal = resetRecent
          ? 0.50 * dt + 0.50 * p.localPeriod
          : hasOnset
          ? 0.25 * rawPeriodHint + 0.50 * med + 0.25 * p.localPeriod
          : 0.75 * p.localPeriod + 0.25 * med;
        newLocal = Math.max(minPeriod, Math.min(maxPeriod, newLocal));
        const s = p.score + scoreAt(t, newLocal, beat) - tempoPen * 2.50;
        candidates.push({
          t,
          localPeriod: newLocal,
          score: s,
          prevIdx: pi,
          recentIbis: nextRecent,
        });
      }
    }
    if (candidates.length === 0) break;
    candidates.sort((a, b) => b.score - a.score);
    // Beam: keep top bins with time diversity (avoid collapsing to one phase).
    const cur: Cell[] = [];
    const diversify = periodHint * 0.05;
    for (const c of candidates) {
      if (cur.length >= bins) break;
      if (cur.some((x) => Math.abs(x.t - c.t) < diversify)) continue;
      cur.push(c);
    }
    if (cur.length === 0) break;
    layers.push(cur);
    prev = cur;

    if (DSP_DIAG && beat <= 3) {
      console.log(`[SMART TEMPO DIAGNOSTICS] Kroki Viterbiego (Krok ${beat}):`);
      const logs = cur.map((c, idx) => {
        const pCell = layers[beat - 1]?.[c.prevIdx];
        const dtVal = pCell ? c.t - pCell.t : 0;
        return {
          Kandydat: idx + 1,
          t: c.t,
          "dt (ms)": dtVal ? dtVal.toFixed(1) : "N/A",
          "p.localPeriod": pCell ? pCell.localPeriod.toFixed(1) : "N/A",
          newLocal: c.localPeriod.toFixed(1),
          score: c.score.toFixed(4)
        };
      });
      console.table(logs);
    }
  }

  const last = layers[layers.length - 1]!;
  let endIdx = 0;
  let endScore = -1e9;
  for (let i = 0; i < last.length; i++) {
    if (last[i]!.score > endScore) {
      endScore = last[i]!.score;
      endIdx = i;
    }
  }
  if (endScore < -1e8) return null;

  const path: number[] = [];
  let idx = endIdx;
  for (let li = layers.length - 1; li >= 0; li--) {
    const cell = layers[li]![idx]!;
    path.push(cell.t);
    idx = cell.prevIdx;
    if (idx < 0 && li > 0) break;
  }
  path.reverse();

  if (enableTrace && outTraceContainer) {
    const traceList: ViterbiBeatTrace[] = [];
    for (let li = 0; li < layers.length; li++) {
      const selected = path[li] ?? 0;
      const layerCells = layers[li] ?? [];
      const candidateTraces = layerCells.map((c) => {
        const rawScore = scoreAt(c.t, c.localPeriod, li);
        const isSelected = Math.abs(c.t - selected) < 1e-3;
        let rejectReason: string | undefined;
        if (!isSelected) {
          if (rawScore === 0) rejectReason = "Brak ataku w okienku \u00b18%";
          else rejectReason = "Ni\u017csza skumulowana punktacja Viterbiego";
        }
        return {
          tMs: Math.round(c.t * 10) / 10,
          rawScore: Math.round(rawScore * 100) / 100,
          tempoPen: 0,
          totalScore: Math.round(c.score * 100) / 100,
          status: isSelected ? ("WINNER" as const) : ("REJECTED" as const),
          rejectReason,
        };
      });
      traceList.push({
        beatIdx: li,
        selectedMs: Math.round(selected * 10) / 10,
        candidates: candidateTraces,
      });
    }
    outTraceContainer.trace = traceList;
  }
  const out: number[] = [];
  for (const t of path) {
    if (out.length === 0 || t > out[out.length - 1]!) out.push(t);
  }
  return out.length >= 4 ? out : null;
}

/**
 * Phase-align beat grid, then track beats with a variable local period.
 * Prefer Ellis-style Viterbi over onsets; fall back to a forward walk that
 * adapts period from a running median of recent snapped IBIs.
 */
export function buildBeatGrid(
  onsetsMs: readonly number[],
  estimatedBpm: number,
  gridDurationMs: number,
  maxBeats: number,
  phaseAnchorMs: number = 0,
  windowedMap?: readonly WindowedBpmPoint[],
  enableTrace?: boolean,
  outTraceContainer?: { trace?: ViterbiBeatTrace[] },
  spikeOnsetsMs?: readonly number[],
): number[] {
  if (!(gridDurationMs > 0) || !(estimatedBpm > 0)) return [];
  const viterbi = buildBeatGridViterbi(
    onsetsMs,
    estimatedBpm,
    gridDurationMs,
    maxBeats,
    phaseAnchorMs,
    windowedMap,
    enableTrace,
    outTraceContainer,
    spikeOnsetsMs,
  );
  if (viterbi) return viterbi;

  const periodHint = 60_000 / estimatedBpm;
  const minPeriod = periodHint * PERIOD_HINT_CLAMP_LO;
  const maxPeriod = periodHint * PERIOD_HINT_CLAMP_HI;
  let period = periodHint;
  let t = resolveBeatGridPhase(onsetsMs, phaseAnchorMs, period);
  const beats: number[] = [Math.round(t)];
  const recentIbis: number[] = [];
  while (t + period * 0.5 < gridDurationMs && beats.length < maxBeats) {
    const expected = t + period;
    const snapWindow = period * BEAT_SNAP_FRAC;
    const nearest = nearestOnsetMs(onsetsMs, expected);
    let nextT = expected;
    if (
      onsetsMs.length > 0 &&
      Math.abs(nearest - expected) < snapWindow
    ) {
      const snapDt = nearest - t;
      const stable =
        recentIbis.length >= 3 ? medianOfPositive(recentIbis) : period;
      const stableRef =
        (1 - PERIOD_HINT_STABLE_WEIGHT) * stable +
        PERIOD_HINT_STABLE_WEIGHT * periodHint;
      // Ignore subdivision onsets that would look like double-time.
      if (
        snapDt >= stableRef * STABLE_PERIOD_STEP_LO &&
        snapDt <= stableRef * STABLE_PERIOD_STEP_HI &&
        snapDt >= period * LOCAL_PERIOD_STEP_LO &&
        snapDt <= period * LOCAL_PERIOD_STEP_HI
      ) {
        nextT = expected * (1 - BEAT_ONSET_BLEND) + nearest * BEAT_ONSET_BLEND;
      }
    }
    const dt = nextT - t;
    if (dt > 0) {
      recentIbis.push(dt);
      if (recentIbis.length > LOCAL_PERIOD_IBI_WINDOW) recentIbis.shift();
      const med = medianOfPositive(recentIbis);
      period = Math.max(
        minPeriod,
        Math.min(maxPeriod, 0.78 * period + 0.22 * med),
      );
    }
    t = nextT;
    beats.push(Math.round(t));
  }
  return beats;
}

async function buildBeatGridAsync(
  onsetsMs: readonly number[],
  estimatedBpm: number,
  gridDurationMs: number,
  maxBeats: number,
  signal?: AbortSignal,
  phaseAnchorMs: number = 0,
  enableTrace?: boolean,
  outTraceContainer?: { trace?: ViterbiBeatTrace[] },
  spikeOnsetsMs?: readonly number[],
  windowedMap?: readonly WindowedBpmPoint[],
): Promise<number[]> {
  throwIfAborted(signal);
  const sync = buildBeatGrid(
    onsetsMs,
    estimatedBpm,
    gridDurationMs,
    maxBeats,
    phaseAnchorMs,
    windowedMap,
    enableTrace,
    outTraceContainer,
    spikeOnsetsMs,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  throwIfAborted(signal);
  return sync;
}

const DEFAULT_RESULT: AudioAnalysisResult = {
  onsetsMs: [],
  beatMs: [],
  estimatedBpm: 120,
};

function gridDurationMsForAnalysis(
  bufferDurationMs: number,
  maxAnalysisSec: number,
): number {
  return Math.min(bufferDurationMs, Math.max(1, Math.round(maxAnalysisSec * 1000)));
}

/**
 * Fold pairwise-histogram BPM into the musical octave of ACF/seed.
 * Bar-ish / half-time modes (~64 when ACF≈128) must not enter periodHint raw.
 */
export function foldHistogramBpmToMusicalOctave(
  histBpm: number,
  acfBpm: number,
  seedBpm?: number,
): number {
  if (!(histBpm > 0)) return 0;
  const doubled = histBpm * 2;
  const halved = histBpm / 2;
  const near = (a: number, b: number, rel = 0.25): boolean =>
    b > 0 && Math.abs(a - b) / b <= rel;

  // Half-time histogram vs ACF or seed → promote 2× (or seed as octave center).
  if (histBpm >= 55 && histBpm < 80 && doubled >= MIN_BPM && doubled <= MAX_BPM) {
    if (acfBpm > 0 && near(doubled, acfBpm, 0.12)) {
      return Math.round(doubled * 100) / 100;
    }
    if (seedBpm != null && seedBpm > 0 && near(doubled, seedBpm, 0.2)) {
      return Math.round(seedBpm * 100) / 100;
    }
    if (doubled >= 100 && doubled <= 160) {
      return Math.round(doubled * 100) / 100;
    }
  }
  // Double-time histogram vs mid-tempo anchors → halve.
  if (histBpm > 160 && histBpm <= MAX_BPM && halved >= MIN_BPM) {
    if (acfBpm > 0 && near(halved, acfBpm, 0.12)) {
      return Math.round(halved * 100) / 100;
    }
    if (seedBpm != null && seedBpm > 0 && near(halved, seedBpm, 0.2)) {
      return Math.round(seedBpm * 100) / 100;
    }
    if (halved >= 80 && halved <= 140) {
      return Math.round(halved * 100) / 100;
    }
  }
  return Math.round(histBpm * 100) / 100;
}

function estimateBpmFromBarHarmonics(onsetsMs: readonly number[]): number {
  if (onsetsMs.length < 10) return 0;
  const sorted = onsetsMs.slice().sort((a, b) => a - b);
  let bestP = 0;
  let maxScore = -1;

  // Scan full 4-beat bar period T_bar in 1 ms steps.
  // Range 1700–2400 ms covers ~100–141 BPM (all common rock/pop tempi).
  const candidates: { barMs: number; bpm: number; score: number }[] = [];
  
  const strongOnsets = sorted;

  for (let barMs = 1700; barMs <= 2400; barMs += 1.0) {
    let score = 0;
    const pMs = barMs / 4;
    const startOnsets = strongOnsets.filter((t) => t <= (strongOnsets[0] ?? 0) + 12_000).slice(0, 8);

    for (const t0 of startOnsets) {
      let subScore = 0;
      let maxMatchedBar = 0;
      for (let barIdx = 1; barIdx <= 36; barIdx++) {
        const expected = t0 + barIdx * barMs;
        if (expected > sorted[sorted.length - 1]! + 500) break;
        const near = nearestOnsetMs(sorted, expected);
        const dist = Math.abs(near - expected);
        if (dist <= 120) {
          subScore += 1 - dist / 120;
          maxMatchedBar = barIdx;
        }
      }
      if (maxMatchedBar >= 20) {
        subScore *= (1 + (maxMatchedBar - 20) * 0.05);
      }
      if (subScore > score) score = subScore;
    }

    const bpmCand = 60_000 / pMs;
    candidates.push({ barMs, bpm: bpmCand, score });
    if (score > maxScore) {
      maxScore = score;
      bestP = pMs;
    }
  }

  // Take average period of top downbeat candidates (within 10% of maxScore)
  const bestCand = candidates.find((c) => Math.abs(c.score - maxScore) < 1e-6);
  if (bestCand) {
    bestP = bestCand.barMs / 4;
  }

  if (bestP <= 0) return 0;
  const bpm = 60_000 / bestP;
  if (DSP_DIAG) {
    console.log(
      `[SMART TEMPO DIAGNOSTICS] barHarmonics best candidate -> bestP: ${bestP.toFixed(1)} ms (${bpm.toFixed(2)} BPM)`,
    );
  }
  return Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)) * 100) / 100;
}

/**
 * Merge ACF / consecutive-IBI / pairwise-histogram evidence into a raw BPM
 * plus competitor list for reconcile. Consecutive IBI that looks like a
 * subdivision of the histogram mode is not treated as the beat tempo.
 */
function refineRawBpmWithOnsetEvidence(
  acf: AcfEstimateResult,
  onsetsMs: readonly number[],
  seedBpm?: number,
): { estimate: number; competitors: number[] } {
  const competitors = [...acf.competitorBpms];
  let estimate = acf.bpm;
  if (!(estimate > 0)) {
    estimate = estimateBpmFromOnsets(onsetsMs);
  }

  const barBpm = estimateBpmFromBarHarmonics(onsetsMs);
  if (DSP_DIAG) {
    console.log(
      `[SMART TEMPO DIAGNOSTICS] estimateBpmFromBarHarmonics -> ${barBpm > 0 ? barBpm.toFixed(2) + " BPM" : "brak"}`,
    );
  }
  if (barBpm > 0) {
    if (estimate > 0 && Math.abs(barBpm - estimate) / estimate <= 0.15) {
      competitors.push(barBpm);
    }
  }

  const histRaw = estimateBpmFromOnsetPeriodHistogram(onsetsMs);
  const histBpm = foldHistogramBpmToMusicalOctave(histRaw, estimate, seedBpm);
  if (histRaw > 0 && histBpm > 0 && Math.abs(histBpm - histRaw) >= 0.5) {
    if (DSP_DIAG) {
      console.log(
        `[SMART TEMPO DIAGNOSTICS] histogram octave fold: ${histRaw.toFixed(2)} → ${histBpm.toFixed(2)} (acf=${estimate.toFixed(2)}, seed=${seedBpm != null && seedBpm > 0 ? seedBpm.toFixed(2) : "brak"})`,
      );
    }
  }
  if (histBpm > 0) {
    competitors.push(histBpm);
    // Onset period histogram has sub-millisecond period resolution.
    // Use it to refine coarse ACF when they agree within 3.5%.
    if (estimate > 0 && Math.abs(histBpm - estimate) / estimate <= 0.035) {
      estimate = histBpm;
    }
  }

  const adjBpm = estimateBpmFromOnsets(onsetsMs);
  if (adjBpm > 0 && estimate > 0 && Math.abs(adjBpm - estimate) / estimate <= 0.05) {
    if (DSP_DIAG) {
      console.log(`[SMART TEMPO DIAGNOSTICS] IBI median refinement: ${estimate.toFixed(2)} → ${adjBpm.toFixed(2)} BPM`);
    }
    estimate = adjBpm;
  } else if (histBpm > 0 && adjBpm > 0) {
    const ratio = adjBpm / histBpm;
    if (
      ratio >= ONSET_SUBDIVISION_RATIO &&
      ratio <= ONSET_SUBDIVISION_RATIO * 1.5
    ) {
      // Consecutive IBI is subdivision of the dominant pairwise period —
      // do not promote adjBpm; hist already competes in reconcile.
    } else if (
      adjBpm >= 100 &&
      adjBpm <= 140 &&
      (estimate < 90 || estimate > 150)
    ) {
      estimate = adjBpm;
    }
  } else if (
    adjBpm >= 100 &&
    adjBpm <= 140 &&
    (estimate < 90 || estimate > 150)
  ) {
    estimate = adjBpm;
  }

  return { estimate, competitors };
}

function refineBeatGridWithWindowedOnsets(
  beatMs: readonly number[],
  onsetsMs: readonly number[],
  globalBpm: number,
): number[] {
  if (beatMs.length < 8 || onsetsMs.length < 8 || !(globalBpm > 0)) return [...beatMs];
  const globalPeriod = 60_000 / globalBpm;
  const refined: number[] = [beatMs[0]!];
  let currentPeriod = globalPeriod;

  for (let i = 1; i < beatMs.length; i++) {
    const prevT = refined[i - 1]!;
    const expectedT = prevT + currentPeriod;

    const nearOnset = nearestOnsetMs(onsetsMs, expectedT);
    let nextT = expectedT;
    if (Math.abs(nearOnset - expectedT) <= Math.min(35, globalPeriod * 0.10)) {
      nextT = nearOnset;
    }

    const stepDt = nextT - prevT;
    if (stepDt >= globalPeriod * 0.85 && stepDt <= globalPeriod * 1.15) {
      currentPeriod = 0.20 * stepDt + 0.80 * currentPeriod;
    }

    refined.push(nextT);
  }

  return refined;
}

function snapBeatGridToOnsets(
  beatMs: readonly number[],
  onsetsMs: readonly number[],
  maxSnapMs = 30,
): number[] {
  if (onsetsMs.length === 0 || beatMs.length === 0) return [...beatMs];
  return beatMs.map((b) => {
    const near = nearestOnsetMs(onsetsMs, b);
    if (Math.abs(near - b) <= maxSnapMs) return near;
    return b;
  });
}

export function analyzeFromMono(
  mono: Float32Array,
  sampleRate: number,
  bufferDurationMs: number,
  maxAnalysisSec: number,
  skipOnsets: boolean,
  seedBpm: number | undefined,
  fullTrackGrid: boolean,
): AudioAnalysisResult {
  const analysisWindowMs = gridDurationMsForAnalysis(
    bufferDurationMs,
    maxAnalysisSec,
  );
  const gridDurationMs = fullTrackGrid ? bufferDurationMs : analysisWindowMs;
  const maxBeats = fullTrackGrid ? MAX_BEATS_FULL_TRACK : MAX_BEATS_WINDOW;
  const hopSize = effectiveHopSize(mono.length);
  let onsetsMs: number[] = [];
  let rawEstimate: number;
  let competitors: number[] = [];
  let acfFlux: Float32Array | undefined;
  const bpmHop = acfHopSize(hopSize, sampleRate);

  if (skipOnsets) {
    rawEstimate = quickEstimateBpmFromEnergy(mono, sampleRate, seedBpm);
  } else {
    const flux = computeOnsetStrengthEnvelope(mono, hopSize);
    onsetsMs = pickOnsetsFromFlux(flux, sampleRate, hopSize);
    acfFlux =
      bpmHop === hopSize
        ? flux
        : computeOnsetStrengthEnvelope(mono, bpmHop);
    const acf = estimateBpmFromOnsetStrengthDetailed(
      acfFlux,
      sampleRate,
      bpmHop,
      seedBpm,
    );
    const refined = refineRawBpmWithOnsetEvidence(acf, onsetsMs, seedBpm);
    rawEstimate = refined.estimate;
    competitors = refined.competitors;
    if (!(rawEstimate > 0)) {
      rawEstimate = quickEstimateBpmFromEnergy(mono, sampleRate, seedBpm);
    }
  }
  const periodHintBpm = reconcileEstimatedBpm(
    rawEstimate,
    seedBpm,
    onsetsMs.length,
    competitors,
  );
  const phaseAnchor = detectFirstMusicalDownbeatMs(
    mono,
    sampleRate,
    hopSize,
    onsetsMs,
    15,
    periodHintBpm,
  );
  const windowedMap = acfFlux ? estimateWindowedBpmMap(acfFlux, sampleRate, bpmHop, seedBpm, rawEstimate) : undefined;
  const spikeOnsetsMs = acfFlux ? detectEnergySpikesMs(acfFlux, sampleRate, bpmHop) : undefined;

  let beatMs = buildBeatGrid(
    onsetsMs,
    periodHintBpm,
    gridDurationMs,
    maxBeats,
    phaseAnchor,
    windowedMap,
    undefined,
    undefined,
    spikeOnsetsMs,
  );

  beatMs = selfConsistentScaleBeatGrid(beatMs, onsetsMs);
  beatMs = snapBeatGridToOnsets(beatMs, onsetsMs, 20);
  const ibiBpm = medianBpmFromBeatMs(beatMs);
  const ibiBpmDeviation = ibiBpm > 0 ? Math.abs(ibiBpm - periodHintBpm) / periodHintBpm : 0;
  const estimatedBpm = periodHintBpm > 0 ? periodHintBpm : ibiBpm;

  if (estimatedBpm > 0 && Math.abs(estimatedBpm - periodHintBpm) >= 0.05) {
    let refinedGrid = buildBeatGrid(onsetsMs, estimatedBpm, gridDurationMs, maxBeats, phaseAnchor, windowedMap, undefined, undefined, spikeOnsetsMs);
    refinedGrid = refineBeatGridWithWindowedOnsets(refinedGrid, onsetsMs, estimatedBpm);
    refinedGrid = snapBeatGridToOnsets(refinedGrid, onsetsMs, 20);
    if (refinedGrid.length >= 4) beatMs = refinedGrid;
  }
  if (DSP_DIAG) {
    console.log(
      `[SMART TEMPO DIAGNOSTICS] po siatce -> medianBpmFromBeatMs: ${ibiBpm > 0 ? ibiBpm.toFixed(2) : "brak"}, periodHintBpm: ${periodHintBpm.toFixed(2)}, ibiBpmDeviation: ${(ibiBpmDeviation * 100).toFixed(1)}%, estimatedBpm (SSOT): ${estimatedBpm.toFixed(2)}`,
    );
  }
  return { onsetsMs, beatMs, estimatedBpm };
}

function makeProgressReporter(
  onProgress?: (ratio: number) => void,
): (ratio: number) => void {
  if (!onProgress) return () => {};
  let lastPct = -1;
  return (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    const pct = Math.floor(clamped * 100);
    if (pct <= lastPct && clamped < 1) return;
    lastPct = pct;
    onProgress(clamped);
  };
}

export async function analyzeFromMonoAsync(
  mono: Float32Array,
  sampleRate: number,
  bufferDurationMs: number,
  maxAnalysisSec: number,
  skipOnsets: boolean,
  seedBpm: number | undefined,
  fullTrackGrid: boolean,
  signal?: AbortSignal,
  onProgress?: (ratio: number) => void,
  externalOnsetsMs?: number[],
  enableTrace?: boolean,
): Promise<AudioAnalysisResult> {
  const report = makeProgressReporter(onProgress);
  report(0);
  const analysisWindowMs = gridDurationMsForAnalysis(
    bufferDurationMs,
    maxAnalysisSec,
  );
  const gridDurationMs = fullTrackGrid ? bufferDurationMs : analysisWindowMs;
  const maxBeats = fullTrackGrid ? MAX_BEATS_FULL_TRACK : MAX_BEATS_WINDOW;
  const hopSize = effectiveHopSize(mono.length);
  const bpmHop = acfHopSize(hopSize, sampleRate);
  let acfFlux: Float32Array | undefined;
  let onsetsMs: number[] = [];
  let spikeOnsetsMs: number[] | undefined;
  let rawEstimate: number;
  let competitors: number[] = [];
  if (skipOnsets) {
    throwIfAborted(signal);
    report(0.35);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    rawEstimate = quickEstimateBpmFromEnergy(mono, sampleRate, seedBpm);
    report(0.85);
  } else {
    const asyncFlux = new Float32Array(
      mono.length > FRAME_SIZE
        ? Math.floor((mono.length - FRAME_SIZE) / hopSize) + 1
        : 0,
    );
    const lowFluxArr = new Float32Array(asyncFlux.length);
    const wideFluxArr = new Float32Array(asyncFlux.length);
    let prevWideEnergy = 0;
    let prevLowEnergy = 0;
    let lowState = 0;
    const alpha = (2 * Math.PI * 250 / sampleRate) / (1 + (2 * Math.PI * 250 / sampleRate));
    let hopsSinceYield = 0;
    const fluxLen = Math.max(1, asyncFlux.length);
    for (let fi = 0, i = 0; fi < asyncFlux.length; fi++, i += hopSize) {
      throwIfAborted(signal);
      let wideEnergy = 0;
      let lowEnergy = 0;
      for (let j = 0; j < FRAME_SIZE; j++) {
        const v = mono[i + j] ?? 0;
        lowState += alpha * (v - lowState);
        lowEnergy += lowState * lowState;
        wideEnergy += v * v;
      }
      wideEnergy = Math.sqrt(wideEnergy / FRAME_SIZE);
      lowEnergy = Math.sqrt(lowEnergy / FRAME_SIZE);

      const wideFlux = Math.max(0, wideEnergy - prevWideEnergy);
      const lowFlux = Math.max(0, lowEnergy - prevLowEnergy);

      lowFluxArr[fi] = lowFlux;
      wideFluxArr[fi] = wideFlux;
      asyncFlux[fi] = 1.2 * lowFlux + 1.0 * wideFlux;

      prevWideEnergy = wideEnergy * 0.85 + prevWideEnergy * 0.15;
      prevLowEnergy = lowEnergy * 0.85 + prevLowEnergy * 0.15;

      hopsSinceYield += 1;
      if (hopsSinceYield >= ONSET_CHUNK_HOPS) {
        hopsSinceYield = 0;
        report(0.05 + (0.8 * (fi + 1)) / fluxLen);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    report(0.88);
    onsetsMs = externalOnsetsMs && externalOnsetsMs.length > 0
      ? externalOnsetsMs
      : pickOnsetsFromFlux(asyncFlux, sampleRate, hopSize);
    throwIfAborted(signal);
    spikeOnsetsMs = detectEnergySpikesMs(asyncFlux, sampleRate, hopSize, lowFluxArr, wideFluxArr);
    acfFlux = asyncFlux;
    if (bpmHop !== hopSize) {
      acfFlux = computeOnsetStrengthEnvelope(mono, bpmHop);
    }
    const acf = estimateBpmFromOnsetStrengthDetailed(
      acfFlux,
      sampleRate,
      bpmHop,
      seedBpm,
    );
    const refined = refineRawBpmWithOnsetEvidence(acf, onsetsMs, seedBpm);
    rawEstimate = refined.estimate;
    competitors = refined.competitors;
    const kickBarBpm = estimateBpmFromBarHarmonics(onsetsMs);
    if (
      DSP_DIAG &&
      kickBarBpm >= 90 &&
      kickBarBpm <= 155 &&
      (seedBpm == null || seedBpm <= 0) &&
      (!(rawEstimate > 0) || rawEstimate < 85 || rawEstimate > 160)
    ) {
      console.log(`[SMART TEMPO LOW-END LOCK] Refined rawEstimate ${rawEstimate?.toFixed(2) ?? "brak"} -> ${kickBarBpm.toFixed(2)} BPM from bar harmonics`);
    }
    if (
      kickBarBpm >= 90 &&
      kickBarBpm <= 155 &&
      (seedBpm == null || seedBpm <= 0) &&
      (!(rawEstimate > 0) || rawEstimate < 85 || rawEstimate > 160)
    ) {
      rawEstimate = kickBarBpm;
    }
    report(0.94);
  }
  const periodHintBpm = reconcileEstimatedBpm(
    rawEstimate,
    seedBpm,
    onsetsMs.length,
    competitors,
  );
  const phaseAnchor = detectFirstMusicalDownbeatMs(
    mono,
    sampleRate,
    hopSize,
    onsetsMs,
    15,
    periodHintBpm,
  );
  const windowedMap = acfFlux ? estimateWindowedBpmMap(acfFlux, sampleRate, bpmHop, seedBpm, periodHintBpm) : undefined;
  const traceContainer: { trace?: ViterbiBeatTrace[] } = {};
  let beatMs = await buildBeatGridAsync(
    onsetsMs,
    periodHintBpm,
    gridDurationMs,
    maxBeats,
    signal,
    phaseAnchor,
    enableTrace,
    traceContainer,
    spikeOnsetsMs,
    windowedMap,
  );
  beatMs = selfConsistentScaleBeatGrid(beatMs, onsetsMs);
  beatMs = snapBeatGridToOnsets(beatMs, onsetsMs, 10);
  const ibiBpm = medianBpmFromBeatMs(beatMs);
  const ibiBpmDeviation = ibiBpm > 0 ? Math.abs(ibiBpm - periodHintBpm) / periodHintBpm : 1;
  const estimatedBpm = periodHintBpm > 0 ? periodHintBpm : ibiBpm;
  if (DSP_DIAG) {
    console.log(
      `[SMART TEMPO DIAGNOSTICS] po siatce -> medianBpmFromBeatMs: ${ibiBpm > 0 ? ibiBpm.toFixed(2) : "brak"}, periodHintBpm: ${periodHintBpm.toFixed(2)}, ibiBpmDeviation: ${(ibiBpmDeviation * 100).toFixed(1)}%, estimatedBpm (SSOT): ${estimatedBpm.toFixed(2)}`,
    );
  }
  report(1);
  return { onsetsMs, beatMs, estimatedBpm, viterbiTrace: traceContainer.trace };
}

/**
 * Analyze decoded audio → onset times, beat grid, and global BPM estimate.
 * Prefer {@link analyzeAudioTempoAsync} for UI paths (long files).
 */
export function analyzeAudioTempo(buffer: AudioBuffer): AudioAnalysisResult {
  const durationMs = Math.max(1, Math.round(buffer.duration * 1000));
  if (buffer.length <= 0 || buffer.sampleRate <= 0) {
    return { ...DEFAULT_RESULT };
  }
  const { mono, effectiveSampleRate } = mixToMonoCapped(
    buffer,
    DEFAULT_MAX_ANALYSIS_SEC,
    DEFAULT_DOWNSAMPLE,
  );
  return analyzeFromMono(
    mono,
    effectiveSampleRate,
    durationMs,
    DEFAULT_MAX_ANALYSIS_SEC,
    true,
    undefined,
    false,
  );
}

/**
 * Full Sample-Rate 44.1 kHz ODF combining sub-bass kick flux (< 250 Hz) and
 * high-frequency transient flux (> 1.5 kHz) prior to decimation for sub-millisecond precision.
 */
export function computeFullSampleRateOnsets(
  buffer: AudioBuffer,
  maxSec: number,
  maxOnsets = MAX_ONSETS,
): number[] {
  const sampleRate = buffer.sampleRate;
  if (!(sampleRate > 0) || buffer.length === 0) return [];
  const maxSamples = Math.min(buffer.length, Math.ceil(maxSec * sampleRate));
  const chs = buffer.numberOfChannels;
  const frameSize = 1024;
  const hopSize = 512;
  const nHops = Math.floor((maxSamples - frameSize) / hopSize) + 1;
  if (nHops <= 0) return [];

  // Low-pass filter for kick (< 250 Hz) and High-pass for snare/cymbals (> 1.5 kHz)
  const alphaLow =
    (2 * Math.PI * 250 / sampleRate) /
    (1 + (2 * Math.PI * 250 / sampleRate));
  const fcHigh = 1500;
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * fcHigh);
  const alphaHigh = rc / (rc + dt);

  const flux = new Float32Array(nHops);
  let prevLowE = 0;
  let prevHighE = 0;
  let lowState = 0;
  let hpState = 0;
  let prevSample = 0;

  for (let fi = 0, i = 0; fi < nHops; fi++, i += hopSize) {
    let lowE = 0;
    let highE = 0;
    for (let j = 0; j < frameSize; j++) {
      let sum = 0;
      for (let ch = 0; ch < chs; ch++) {
        sum += buffer.getChannelData(ch)[i + j] ?? 0;
      }
      const val = sum / chs;
      lowState += alphaLow * (val - lowState);
      lowE += lowState * lowState;

      hpState = alphaHigh * (hpState + val - prevSample);
      prevSample = val;
      highE += hpState * hpState;
    }
    lowE = Math.sqrt(lowE / frameSize);
    highE = Math.sqrt(highE / frameSize);

    const lowFlux = Math.max(0, lowE - prevLowE);
    const highFlux = Math.max(0, highE - prevHighE);

    flux[fi] = 3.0 * lowFlux + 1.0 * highFlux;

    prevLowE = lowE * 0.85 + prevLowE * 0.15;
    prevHighE = highE * 0.85 + prevHighE * 0.15;
  }

  return pickOnsetsFromFlux(flux, sampleRate, hopSize, maxOnsets);
}

async function runAnalyzeAudioTempoAsync(
  buffer: AudioBuffer,
  options: AnalyzeAudioTempoOptions,
): Promise<AnalyzeAudioTempoOutcome> {
  const durationMs = Math.max(1, Math.round(buffer.duration * 1000));
  if (buffer.length <= 0 || buffer.sampleRate <= 0) {
    return { result: { ...DEFAULT_RESULT } };
  }
  const maxSec = options.maxAnalysisSec ?? DEFAULT_MAX_ANALYSIS_SEC;
  const downsample = options.downsample ?? DEFAULT_DOWNSAMPLE;
  const skipOnsets = options.skipOnsets ?? false;
  const seedBpm = options.seedBpm;
  const fullTrackGrid = options.fullTrackGrid ?? false;
  const signal = options.signal;
  throwIfAborted(signal);

  // 1. Full Sample-Rate 44.1 kHz High-Frequency (>1.5 kHz) ODF for sub-millisecond onset precision
  const fullRateOnsets = computeFullSampleRateOnsets(buffer, maxSec);

  const { mono, effectiveSampleRate } = mixToMonoCapped(
    buffer,
    maxSec,
    downsample,
  );
  const unregisterMono = registerMemoryContributor({
    id: "tempo-analysis-mono",
    label: "Analiza tempa (mono scratch)",
    approxBytes: () => mono.byteLength,
    detail: () =>
      `${mono.length} próbek @ ${Math.round(effectiveSampleRate)} Hz · okno ${maxSec}s · fullGrid=${fullTrackGrid}`,
  });
  noteMemoryCheckpoint("tempo-analysis-mono-ready", {
    durationMs,
    maxSec,
    fullTrackGrid,
    monoBytes: mono.byteLength,
    pcmBytes: buffer.length * Math.max(1, buffer.numberOfChannels) * 4,
  });
  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    throwIfAborted(signal);
    const result = await analyzeFromMonoAsync(
      mono,
      effectiveSampleRate,
      durationMs,
      maxSec,
      skipOnsets,
      seedBpm,
      fullTrackGrid,
      signal,
      options.onProgress,
      fullRateOnsets,
      options.enableTrace,
    );
    return { result };
  } finally {
    unregisterMono();
  }
}

const TIMEOUT_WARNING =
  "Analiza tempa trwa zbyt długo — użyto domyślnego tempa (120 BPM). Możesz ustawić BPM ręcznie.";

function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
  const live = signals.filter(Boolean);
  if (live.length === 0) return new AbortController().signal;
  if (live.length === 1) return live[0]!;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(live);
  }
  const controller = new AbortController();
  for (const sig of live) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      return controller.signal;
    }
    sig.addEventListener("abort", () => controller.abort(sig.reason), {
      once: true,
    });
  }
  return controller.signal;
}

function fallbackBeatGrid(
  durationMs: number,
  maxAnalysisSec: number,
  bpm = 120,
  fullTrackGrid = false,
): AudioAnalysisResult {
  const gridDurationMs = fullTrackGrid
    ? durationMs
    : gridDurationMsForAnalysis(durationMs, maxAnalysisSec);
  const maxBeats = fullTrackGrid ? MAX_BEATS_FULL_TRACK : MAX_BEATS_WINDOW;
  const beatMs = buildBeatGrid([], bpm, gridDurationMs, maxBeats);
  return { onsetsMs: [], beatMs, estimatedBpm: bpm };
}

/**
 * Non-blocking tempo analysis with timeout and safe fallback (120 BPM).
 */
export async function analyzeAudioTempoAsync(
  buffer: AudioBuffer,
  options: AnalyzeAudioTempoOptions = UI_TEMPO_ANALYSIS_OPTIONS,
): Promise<AnalyzeAudioTempoOutcome> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_ANALYSIS_TIMEOUT_MS;
  const maxSec = options.maxAnalysisSec ?? DEFAULT_MAX_ANALYSIS_SEC;
  const fullTrackGrid = options.fullTrackGrid ?? false;
  const durationMs = Math.max(1, Math.round(buffer.duration * 1000));
  noteMemoryCheckpoint("tempo-analysis-start", {
    durationMs,
    maxSec,
    fullTrackGrid,
    channels: buffer.numberOfChannels,
    pcmBytes: buffer.length * Math.max(1, buffer.numberOfChannels) * 4,
    timeoutMs,
  });
  const controller = new AbortController();
  const signal = options.signal
    ? mergeAbortSignals([options.signal, controller.signal])
    : controller.signal;

  const fallbackBpm =
    options.seedBpm != null && options.seedBpm > 0 ? options.seedBpm : 120;
  const fallback: AnalyzeAudioTempoOutcome = {
    result: fallbackBeatGrid(durationMs, maxSec, fallbackBpm, fullTrackGrid),
    warning: TIMEOUT_WARNING,
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<AnalyzeAudioTempoOutcome>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(fallback);
    }, timeoutMs);
  });

  const workPromise = runAnalyzeAudioTempoAsync(buffer, {
    ...options,
    signal,
  })
    .then((outcome) => (signal.aborted ? null : outcome))
    .catch((err: unknown) => {
      if (signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
        return null;
      }
      throw err;
    });

  const winner = await Promise.race([workPromise, timeoutPromise]);
  if (timer != null) clearTimeout(timer);

  if (DSP_DIAG && winner?.result) {
    console.debug(
      "[tempo-analysis]",
      `${Math.round(durationMs / 1000)}s audio → ~${winner.result.estimatedBpm} BPM, ${winner.result.beatMs.length} beats`,
      winner.warning ?? "",
    );
  }

  return winner ?? fallback;
}

/** Yield one frame so React can paint progress labels. */
export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
