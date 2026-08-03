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
} from "./memoryPressure.js";

const FRAME_SIZE = 1024;
const BASE_HOP_SIZE = 512;
const ONSET_THRESHOLD = 0.02;
const MIN_BPM = 60;
const MAX_BPM = 200;

/** First N seconds scanned for onset / BPM detection (UI path). */
export const DEFAULT_MAX_ANALYSIS_SEC = 30;
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
    Math.max(120, durationSec, gapSec + barSec * 32),
  );
  return {
    maxAnalysisSec,
    downsample: Math.max(3, DEFAULT_DOWNSAMPLE - 2),
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
  if (hops <= 4_000) return BASE_HOP_SIZE;
  if (hops <= 8_000) return BASE_HOP_SIZE * 2;
  return BASE_HOP_SIZE * 4;
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
    if (i - lastHop < minGapHops) {
      if (cur > (flux[lastHop] ?? 0) && onsets.length > 0) {
        onsets[onsets.length - 1] = Math.round(
          ((i * hopSize + FRAME_SIZE / 2) / sampleRate) * 1000,
        );
        lastHop = i;
      }
      continue;
    }
    if (onsets.length >= maxOnsets) break;
    onsets.push(
      Math.round(((i * hopSize + FRAME_SIZE / 2) / sampleRate) * 1000),
    );
    lastHop = i;
  }
  return trimOnsets(onsets, maxOnsets);
}

/**
 * Autocorrelation peak-picking on onset strength → BPM in [MIN_BPM, MAX_BPM].
 * Prefers the peak nearest `seedHint` when several octave candidates score well.
 */
export function estimateBpmFromOnsetStrength(
  flux: Float32Array,
  sampleRate: number,
  hopSize: number,
  seedHint?: number,
): number {
  if (flux.length < 8) return 0;
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
  if (maxLag <= minLag) return 0;

  type Peak = { lag: number; score: number; bpm: number };
  const peaks: Peak[] = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let norm = 0;
    const n = flux.length - lag;
    for (let i = 0; i < n; i++) {
      const a = centered[i] ?? 0;
      const b = centered[i + lag] ?? 0;
      corr += a * b;
      norm += a * a;
    }
    if (norm < 1e-12) continue;
    const score = corr / norm;
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
  if (peaks.length === 0) return 0;

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
      let norm = 0;
      const n = flux.length - L;
      for (let i = 0; i < n; i++) {
        const a = centered[i] ?? 0;
        const b = centered[i + L] ?? 0;
        corr += a * b;
        norm += a * a;
      }
      const s = norm < 1e-12 ? 0 : corr / norm;
      if (slot === "y0") y0 = s;
      else y2 = s;
    }
    const denom = 2 * (2 * scoreAtLag - y0 - y2);
    let delta = 0;
    if (Math.abs(denom) > 1e-12) {
      delta = (y0 - y2) / denom;
      delta = Math.max(-0.5, Math.min(0.5, delta));
    }
    const refinedLag = lag + delta;
    return (60 * sampleRate) / (refinedLag * hopSize);
  };

  const top = peaks.slice(0, 8);
  if (top.length === 0) return 0;

  type Cand = { bpm: number; score: number; lag: number };
  const cands: Cand[] = [];
  for (const p of top) {
    const refined = refineLagBpm(p.lag, p.score);
    cands.push({ bpm: refined, score: p.score, lag: p.lag });
    for (const factor of [0.5, 2] as const) {
      const bpm = refined * factor;
      if (bpm < MIN_BPM || bpm > MAX_BPM) continue;
      // Octave mates keep most of the lag score; musical prior decides.
      cands.push({ bpm, score: p.score * 0.9, lag: p.lag });
    }
  }

  /** Soft prior: prefer pop/dance musical octave (~110–135), not half-time. */
  const musicalPrior = (bpm: number): number => {
    const center = 121;
    const diff = bpm - center;
    const gauss = Math.exp(-0.5 * (diff / 15) ** 2);
    return Math.max(0.45, gauss);
  };

  let best = cands[0]!;
  let bestMetric = -Infinity;
  for (const c of cands) {
    let metric = c.score * musicalPrior(c.bpm);
    // Optional soft hint (pipe ~120). Must not dominate — never snap to hint.
    if (seedHint != null && seedHint > 0) {
      const dist = Math.abs(c.bpm - seedHint) / seedHint;
      if (dist <= 0.2) metric *= 1 - dist * 0.2;
    }
    if (metric > bestMetric) {
      best = c;
      bestMetric = metric;
    }
  }

  return Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, best.bpm)) * 100) / 100;
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
  return Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)) * 100) / 100;
}

/**
 * Prefer audio-derived BPM. `seedBpm` is only an octave / weak-confidence hint
 * (e.g. UltraStar header) — it must **not** replace a confident audio peak with
 * an editorial pipe+GAP formula (that invented ~113 BPM instead of Adapt).
 *
 * Half-time ACF peaks (~60–75) are folded to the musical octave when a seed is
 * near 2× or when the doubled value sits in the common pop range (~110–160).
 */
export function reconcileEstimatedBpm(
  estimated: number,
  seedBpm: number | undefined,
  onsetCount: number,
): number {
  const fallback = seedBpm != null && seedBpm > 0 ? seedBpm : 120;
  if (!(estimated > 0)) return fallback;

  const normalizeToSeed = (bpm: number): number | null => {
    if (!(seedBpm != null && seedBpm > 0)) return null;
    for (const factor of [1, 0.5, 2] as const) {
      const candidate = bpm * factor;
      const ratio = candidate / seedBpm;
      if (ratio >= 1 / 1.2 && ratio <= 1.2) {
        // Same octave: keep the audio peak. Cross-octave: use the hint as
        // octave center (not 2× a half-time peak → e.g. 64×2=128 vs true ~123).
        return factor === 1 ? bpm : seedBpm;
      }
    }
    return null;
  };

  /** Fold obvious half/double-time ACF errors using audio evidence only. */
  const preferMusicalOctave = (bpm: number): number => {
    if (bpm >= 55 && bpm < 80) {
      const doubled = bpm * 2;
      // Only fold into the tight pop band — avoid landing on US-metro ~127.5
      // from a blind 64×2 when true Adapt is ~122–124.
      if (doubled >= 115 && doubled <= 130) return doubled;
    }
    if (bpm > 160 && bpm <= MAX_BPM) {
      const halved = bpm / 2;
      if (halved >= 100 && halved <= 140) return halved;
    }
    return bpm;
  };

  const lowConfidence =
    onsetCount < 4 ||
    (onsetCount === 0 && (estimated === 120 || estimated === 0));

  if (lowConfidence) {
    return Math.round(fallback * 100) / 100;
  }

  if (!(seedBpm != null && seedBpm > 0)) {
    return Math.round(preferMusicalOctave(estimated) * 100) / 100;
  }

  const normalized = normalizeToSeed(estimated);
  // Keep audio (octave-folded toward hint if needed) — never overwrite with seed.
  if (normalized != null) {
    return Math.round(normalized * 100) / 100;
  }

  // Audio and hint disagree even after octave fold — still kill half-time peaks.
  return Math.round(preferMusicalOctave(estimated) * 100) / 100;
}

/**
 * Lightweight BPM from downsampled energy flux + autocorrelation.
 */
function quickEstimateBpmFromEnergy(
  mono: Float32Array,
  sampleRate: number,
  seedHint?: number,
): number {
  const hopSize = Math.max(BASE_HOP_SIZE * 2, effectiveHopSize(mono.length));
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
const BEAT_SNAP_FRAC = 0.28;

function resolveBeatGridPhase(
  onsetsMs: readonly number[],
  phaseAnchorMs: number,
  period: number,
): number {
  let start = Math.max(0, phaseAnchorMs);
  if (onsetsMs.length === 0) return start;
  const snapWindow = period * BEAT_SNAP_FRAC;
  const nearAnchor = nearestOnsetMs(onsetsMs, start);
  if (Math.abs(nearAnchor - start) <= snapWindow) return nearAnchor;
  if (phaseAnchorMs <= 0) return onsetsMs[0]!;
  return start;
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
 * Tighter than the old 0.7–1.35 band so a dense 8th-note cluster cannot
 * yank the tracker into double-time in one hop.
 */
const LOCAL_PERIOD_STEP_LO = 0.85;
const LOCAL_PERIOD_STEP_HI = 1.2;
/**
 * Hard gate vs stable quarter-note reference (median IBI + period hint).
 * Rejects half-beat / double-time snaps from subdivision onsets.
 */
const STABLE_PERIOD_STEP_LO = 0.78;
const STABLE_PERIOD_STEP_HI = 1.28;

/**
 * Ellis-style beat path with a **variable local period** driven by onsets.
 * Soft `periodHint` seeds the first layer / octave clamp only — each step
 * advances from `prev.t + prev.localPeriod`, not a fixed global `period0`.
 * Period updates use a long median IBI window and reject double-time hops
 * relative to that stable reference (dense fills must not accelerate Adapt).
 */
function buildBeatGridViterbi(
  onsetsMs: readonly number[],
  estimatedBpm: number,
  gridDurationMs: number,
  maxBeats: number,
  phaseAnchorMs: number,
): number[] | null {
  if (onsetsMs.length < 4) return null;
  const periodHint = 60_000 / estimatedBpm;
  const t0 = resolveBeatGridPhase(onsetsMs, phaseAnchorMs, periodHint);
  const minPeriod = periodHint * 0.72;
  const maxPeriod = periodHint * 1.38;
  const nBeats = Math.min(
    maxBeats,
    Math.max(2, Math.floor(gridDurationMs / minPeriod) + 1),
  );
  const bins = 9;
  const half = Math.floor(bins / 2);
  const scoreAt = (t: number, localPeriod: number): number => {
    if (onsetsMs.length === 0) return 0;
    const nearest = nearestOnsetMs(onsetsMs, t);
    const dist = Math.abs(nearest - t);
    const win = localPeriod * BEAT_SNAP_FRAC;
    if (dist >= win) return 0;
    return 1 - dist / win;
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
    const t = t0 + ((b - half) / half) * periodHint * BEAT_SNAP_FRAC;
    if (t < 0 || t > gridDurationMs) continue;
    prev.push({
      t,
      localPeriod: periodHint,
      score: scoreAt(t, periodHint),
      prevIdx: -1,
      recentIbis: [],
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
      // Blend hint so a briefly corrupted local period cannot redefine "stable".
      const stableRef = 0.55 * recentMed + 0.45 * periodHint;
      for (let b = 0; b < bins; b++) {
        const t =
          center + ((b - half) / half) * p.localPeriod * BEAT_SNAP_FRAC;
        if (t < 0 || t > gridDurationMs) continue;
        const dt = t - p.t;
        if (
          dt < stableRef * STABLE_PERIOD_STEP_LO ||
          dt > stableRef * STABLE_PERIOD_STEP_HI
        ) {
          continue;
        }
        if (
          dt < p.localPeriod * LOCAL_PERIOD_STEP_LO ||
          dt > p.localPeriod * LOCAL_PERIOD_STEP_HI
        ) {
          continue;
        }
        const tempoPen =
          ((dt - p.localPeriod) / p.localPeriod) ** 2 +
          ((dt - stableRef) / stableRef) ** 2 * 0.65;
        const nextRecent = [...p.recentIbis, dt];
        if (nextRecent.length > LOCAL_PERIOD_IBI_WINDOW) {
          nextRecent.shift();
        }
        const med = medianOfPositive(nextRecent);
        // Strong inertia: mostly keep local, gently pull toward median IBI.
        let newLocal = 0.72 * p.localPeriod + 0.22 * med + 0.06 * dt;
        newLocal = Math.max(minPeriod, Math.min(maxPeriod, newLocal));
        const s = p.score + scoreAt(t, newLocal) - tempoPen * 1.25;
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
    path.push(Math.round(cell.t));
    idx = cell.prevIdx;
    if (idx < 0 && li > 0) break;
  }
  path.reverse();
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
): number[] {
  if (!(gridDurationMs > 0) || !(estimatedBpm > 0)) return [];
  const viterbi = buildBeatGridViterbi(
    onsetsMs,
    estimatedBpm,
    gridDurationMs,
    maxBeats,
    phaseAnchorMs,
  );
  if (viterbi) return viterbi;

  const periodHint = 60_000 / estimatedBpm;
  const minPeriod = periodHint * 0.72;
  const maxPeriod = periodHint * 1.38;
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
      const stableRef = 0.55 * stable + 0.45 * periodHint;
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
): Promise<number[]> {
  throwIfAborted(signal);
  const sync = buildBeatGrid(
    onsetsMs,
    estimatedBpm,
    gridDurationMs,
    maxBeats,
    phaseAnchorMs,
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

function analyzeFromMono(
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
  let rawEstimate = 0;
  if (skipOnsets) {
    rawEstimate = quickEstimateBpmFromEnergy(mono, sampleRate, seedBpm);
  } else {
    const flux = computeOnsetStrengthEnvelope(mono, hopSize);
    onsetsMs = pickOnsetsFromFlux(flux, sampleRate, hopSize);
    rawEstimate = estimateBpmFromOnsetStrength(
      flux,
      sampleRate,
      hopSize,
      seedBpm,
    );
    if (!(rawEstimate > 0)) {
      rawEstimate = estimateBpmFromOnsets(onsetsMs);
    }
    // Onset IBI in the musical octave beats a half/double-time ACF peak.
    const onsetBpm = estimateBpmFromOnsets(onsetsMs);
    if (
      onsetBpm >= 100 &&
      onsetBpm <= 140 &&
      (rawEstimate < 90 || rawEstimate > 150)
    ) {
      rawEstimate = onsetBpm;
    }
    if (!(rawEstimate > 0)) {
      rawEstimate = quickEstimateBpmFromEnergy(mono, sampleRate, seedBpm);
    }
  }
  const periodHintBpm = reconcileEstimatedBpm(
    rawEstimate,
    seedBpm,
    onsetsMs.length,
  );
  const phaseAnchor = onsetsMs[0] ?? 0;
  let beatMs = buildBeatGrid(
    onsetsMs,
    periodHintBpm,
    gridDurationMs,
    maxBeats,
    phaseAnchor,
  );
  beatMs = selfConsistentScaleBeatGrid(beatMs, onsetsMs);
  const ibiBpm = medianBpmFromBeatMs(beatMs);
  const estimatedBpm = ibiBpm > 0 ? ibiBpm : periodHintBpm;
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

async function analyzeFromMonoAsync(
  mono: Float32Array,
  sampleRate: number,
  bufferDurationMs: number,
  maxAnalysisSec: number,
  skipOnsets: boolean,
  seedBpm: number | undefined,
  fullTrackGrid: boolean,
  signal?: AbortSignal,
  onProgress?: (ratio: number) => void,
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
  let onsetsMs: number[] = [];
  let rawEstimate = 0;
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
    let prevEnergy = 0;
    let hopsSinceYield = 0;
    const fluxLen = Math.max(1, asyncFlux.length);
    for (let fi = 0, i = 0; fi < asyncFlux.length; fi++, i += hopSize) {
      throwIfAborted(signal);
      let energy = 0;
      for (let j = 0; j < FRAME_SIZE; j++) {
        const v = mono[i + j] ?? 0;
        energy += v * v;
      }
      energy = Math.sqrt(energy / FRAME_SIZE);
      asyncFlux[fi] = Math.max(0, energy - prevEnergy);
      prevEnergy = energy * 0.85 + prevEnergy * 0.15;
      hopsSinceYield += 1;
      if (hopsSinceYield >= ONSET_CHUNK_HOPS) {
        hopsSinceYield = 0;
        report(0.05 + (0.8 * (fi + 1)) / fluxLen);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    report(0.88);
    onsetsMs = pickOnsetsFromFlux(asyncFlux, sampleRate, hopSize);
    throwIfAborted(signal);
    rawEstimate = estimateBpmFromOnsetStrength(
      asyncFlux,
      sampleRate,
      hopSize,
      seedBpm,
    );
    if (!(rawEstimate > 0)) {
      rawEstimate = estimateBpmFromOnsets(onsetsMs);
    }
    const onsetBpm = estimateBpmFromOnsets(onsetsMs);
    if (
      onsetBpm >= 100 &&
      onsetBpm <= 140 &&
      (rawEstimate < 90 || rawEstimate > 150)
    ) {
      rawEstimate = onsetBpm;
    }
    if (!(rawEstimate > 0)) {
      rawEstimate = quickEstimateBpmFromEnergy(mono, sampleRate, seedBpm);
    }
    report(0.94);
  }
  const periodHintBpm = reconcileEstimatedBpm(
    rawEstimate,
    seedBpm,
    onsetsMs.length,
  );
  const phaseAnchor = onsetsMs[0] ?? 0;
  let beatMs = await buildBeatGridAsync(
    onsetsMs,
    periodHintBpm,
    gridDurationMs,
    maxBeats,
    signal,
    phaseAnchor,
  );
  beatMs = selfConsistentScaleBeatGrid(beatMs, onsetsMs);
  const ibiBpm = medianBpmFromBeatMs(beatMs);
  const estimatedBpm = ibiBpm > 0 ? ibiBpm : periodHintBpm;
  report(1);
  return { onsetsMs, beatMs, estimatedBpm };
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

  if (import.meta.env?.DEV && winner?.result) {
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
