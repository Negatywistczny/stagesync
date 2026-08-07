/**
 * Smart Tempo (5.4.2): audio wall-clock ground truth → granular TempoMap on ticks.
 * No Flex Time / audio warp (ADR 0015) — map follows the recording.
 * UltraStar / UG timings are passive events snapped to the audio grid.
 */

import type {
  AudioClip,
  Project,
  ProjectAsset,
  TempoEvent,
} from "./schema.js";
import { BPM_MAX } from "./schema.js";
import {
  DEFAULT_PPQ,
  localTicksPerBeat,
  ticksPerBar,
  ticksToMs,
  type TimeSignature,
} from "./time.js";
import {
  layoutContiguousFormaPlans,
  tempoEventsFromMsTickAnchors,
  TEMPO_MAP_MIN_BPM,
  type MsTickAnchor,
  type TempoSolverSectionPlan,
} from "./tempo-map-solver.js";
import { secondsToTicksAlongMap, type TempoMapProject } from "./tempo-map.js";
import { sectionStartFromVocalTicks } from "./ug-pipe-bars.js";

/** Min |ΔBPM| to emit a Logic-like sparse tempo node (smoothed local tempo). */
export const SMART_TEMPO_SPARSE_MIN_BPM_DELTA = 0.0;
/** Median window in beats for local tempo (~2 bars in 4/4 — resists IBI blips). */
export const SMART_TEMPO_SPARSE_WINDOW_BEATS = 4;
/** Minimum bars between sparse tempo nodes (Logic ~1–2). */
export const SMART_TEMPO_SPARSE_MIN_BAR_GAP = 1;
/** Cap |ΔBPM| vs previous sparse segment (rejects onset-snap spikes). */
export const SMART_TEMPO_SPARSE_MAX_BPM_STEP = 5;

/** Canonical import backing track — one clip per project on re-import. */
export const US_UG_BACKING_TRACK_NAME = "US+UG Backing";
export const US_UG_BACKING_TRACK_ID = "us-ug-backing-track";
export const US_UG_BACKING_CLIP_ID = "us-ug-backing-clip";

/** Max beats used for Smart Tempo grid / refine (~8 min @ 120 BPM). */
export const SMART_TEMPO_MAX_BEATS = 2048;
/** Max bar-boundary nodes for Beat Mapper UI markers. */
export const SMART_TEMPO_MAX_UI_NODES = 256;
/** Max ms of audio used when synthesizing a fallback beat grid. */
export const SMART_TEMPO_MAX_GRID_MS = 600_000;

/** YouTube video id (11 chars). */
export const YOUTUBE_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

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

/**
 * Extract YouTube video id from UltraStar #VIDEO value or bare id.
 * USDB / UltraStar Deluxe CSV: `a=` (audio) and/or `v=` (video), plus `co=` / `bg=`.
 * Prefer `a=` for audio ingest when both are present.
 */
export function extractYoutubeVideoId(raw: string): string | null {
  let trimmed = raw.trim();
  if (!trimmed) return null;
  // Bound before polynomial URL regexes (ReDoS).
  if (trimmed.length > 2048) trimmed = trimmed.slice(0, 2048);
  if (YOUTUBE_VIDEO_ID_RE.test(trimmed)) return trimmed;

  const usdbPrefixed = [
    /(?:^|[,\s])a=([a-zA-Z0-9_-]{11})(?:$|[,#&\s])/i,
    /(?:^|[,\s])v=([a-zA-Z0-9_-]{11})(?:$|[,#&\s])/i,
  ];
  for (const re of usdbPrefixed) {
    const m = re.exec(trimmed);
    if (m?.[1] && YOUTUBE_VIDEO_ID_RE.test(m[1])) return m[1];
  }

  const csvHead = trimmed.split(",")[0]?.trim() ?? "";
  if (csvHead && YOUTUBE_VIDEO_ID_RE.test(csvHead)) return csvHead;

  const patterns = [
    /(?:youtube\.com\/watch\?[^#]{0,512}v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i,
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
  ];
  for (const re of patterns) {
    const m = re.exec(trimmed);
    if (m?.[1] && YOUTUBE_VIDEO_ID_RE.test(m[1])) return m[1];
  }
  return null;
}

/** Ms spanned by one bar at constant BPM. */
export function msPerBarAtBpm(
  bpm: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq = 480,
): number {
  const barTicks = ticksPerBar(meter, ppq);
  return ticksToMs(barTicks, bpm, meter, ppq);
}

/**
 * Editorial Beat 1 for a long pipe Intro + UltraStar `#GAP`.
 * Places `#GAP` ≈ `pipeBarCount + ½` bars after Beat 1 @ `layoutBpm` so the
 * anacrusis pickup lands in the last Intro bar and Verse Forma @ pipe+1
 * matches the recording (PO layout) — without song-specific constants.
 * Prefers a nearby first transient (±½ bar); otherwise the ideal editorial ms.
 */
export function suggestBeat1MsFromPipeAndGap(opts: {
  gapMs: number;
  pipeBarCount: number;
  layoutBpm: number;
  meter?: TimeSignature;
  ppq?: number;
  transientMs?: number | null;
}): number {
  const gap = Math.max(0, Math.round(opts.gapMs));
  const pipeBars = Math.max(0, Math.trunc(opts.pipeBarCount));
  const bpm = opts.layoutBpm > 0 ? opts.layoutBpm : 120;
  const meter = opts.meter ?? { numerator: 4, denominator: 4 };
  const ppq = opts.ppq ?? DEFAULT_PPQ;
  const transient =
    opts.transientMs != null && Number.isFinite(opts.transientMs)
      ? Math.max(0, Math.round(opts.transientMs))
      : null;

  if (!(gap > 0)) return transient ?? 0;

  if (pipeBars < 12) {
    if (transient == null || transient <= 0 || transient >= gap * 0.85) {
      return gap;
    }
    return transient;
  }

  const barMs = msPerBarAtBpm(bpm, meter, ppq);
  if (!(barMs > 0)) return transient ?? gap;

  const idealBeat1 = Math.max(0, Math.round(gap - (pipeBars + 0.5) * barMs));

  if (transient != null && transient > 0 && transient < gap * 0.85) {
    // Strict half-bar: a full bar late is the −1 vocal drift we must reject.
    if (Math.abs(transient - idealBeat1) < barMs * 0.5) {
      return transient;
    }
  }
  return idealBeat1;
}

/**
 * Snap editorial Beat 1 to the nearest onset within ±¼ beat so the downbeat
 * attack lands on the barline. Earlier snaps trim silence before the attack;
 * later snaps keep pre-roll when the editorial offset sat past the attack
 * (MP3 otherwise leads the grid by a fraction of a beat).
 */
export function snapBeat1MsToOnset(
  beat1Ms: number,
  onsetsMs: readonly number[],
  bpm: number,
): number {
  const beat = Math.max(0, Math.round(beat1Ms));
  if (!(bpm > 0) || onsetsMs.length === 0) return beat;
  const windowMs = (60_000 / bpm) * 0.25;
  let best: number | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const raw of onsetsMs) {
    if (!(raw >= 0) || !Number.isFinite(raw)) continue;
    const o = Math.round(raw);
    const d = Math.abs(o - beat);
    if (d > windowMs) continue;
    // Prefer closer; on ties prefer earlier (attack at/before barline).
    if (d < bestDist || (d === bestDist && (best == null || o < best))) {
      best = o;
      bestDist = d;
    }
  }
  return best ?? beat;
}

/**
 * Nudge Beat 1 so a section's first chord syllable lands near Forma Beat 1
 * (pickup may sit in the previous bar). Corrects small integer-bar drift on
 * long pipe intros — does not snap every lyric to the beat grid.
 *
 * Returns the adjusted `audioStartOffsetMs` (file ms). Decreasing the offset
 * moves vocals/MP3 later on the timeline (more pre-roll kept before trim).
 */
export function alignBeat1ToChordSyllable(opts: {
  audioStartOffsetMs: number;
  /** Wall-clock file ms of the syllable tied to the section's first chord. */
  chordSyllableMs: number;
  formaSectionStartTicks: number;
  pipeBarCount: number;
  seedBpm: number;
  meter?: TimeSignature;
  ppq?: number;
}): number {
  const pipeBars = Math.max(0, Math.trunc(opts.pipeBarCount));
  const offset = Math.max(0, opts.audioStartOffsetMs);
  const chordMs = opts.chordSyllableMs;
  if (!(chordMs > 0) || pipeBars < 12) return offset;
  // Beat 1 at/near GAP: intentional trim of instrumental — do not shove vocals.
  if (offset >= chordMs * 0.85) return offset;

  const meter = opts.meter ?? { numerator: 4, denominator: 4 };
  const ppq = opts.ppq ?? DEFAULT_PPQ;
  const barTicks = ticksPerBar(meter, ppq);
  const barMs = msPerBarAtBpm(opts.seedBpm, meter, ppq);
  if (!(barMs > 0) || barTicks <= 0) return offset;

  const contentMs = Math.max(0, chordMs - offset);
  const observedBars = contentMs / barMs;
  const formaBars = opts.formaSectionStartTicks / barTicks;
  // Pickup center: half a bar before Forma section Beat 1.
  const idealBars = formaBars - 0.5;
  const deltaBars = observedBars - idealBars;
  // Drift Gate style: only correct ~½–2.5 bar structural misalignment.
  if (Math.abs(deltaBars) < 0.5 || Math.abs(deltaBars) > 2.5) return offset;
  const shiftBars = Math.round(deltaBars);
  if (shiftBars === 0) return offset;
  return Math.max(0, Math.round(offset + shiftBars * barMs));
}

/**
 * Drift Gate (≤ 1 bar @ seedBpm): micro-jitter from vocal expression is ignored;
 * larger drift inserts a Tempo Node or ramp between boundaries.
 */
export function evaluateDriftGate(
  observedMs: number,
  expectedMs: number,
  opts: ApplyDriftGateOptions,
): DriftGateResult {
  const meter = opts.meter ?? { numerator: 4, denominator: 4 };
  const ppq = opts.ppq ?? DEFAULT_PPQ;
  const deltaMs = observedMs - expectedMs;
  const threshold = msPerBarAtBpm(opts.seedBpm, meter, ppq);
  if (Math.abs(deltaMs) <= threshold) {
    return { action: "ignore", deltaMs };
  }
  if (opts.gradual) {
    return {
      action: "ramp",
      deltaMs,
      start: { wallMs: expectedMs, targetTick: 0 },
      end: { wallMs: observedMs, targetTick: 0 },
    };
  }
  return {
    action: "node",
    deltaMs,
    wallMs: observedMs,
    targetTick: 0,
  };
}

/**
 * Snap wall-clock ms to the nearest beat on a precomputed audio grid.
 */
export function snapMsToNearestBeat(
  ms: number,
  beatMs: readonly number[],
): number {
  if (beatMs.length === 0) return Math.max(0, ms);
  if (ms <= beatMs[0]!) return beatMs[0]!;
  const last = beatMs[beatMs.length - 1]!;
  if (ms >= last) return last;
  let lo = 0;
  let hi = beatMs.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((beatMs[mid] ?? 0) < ms) lo = mid + 1;
    else hi = mid;
  }
  const a = beatMs[Math.max(0, lo - 1)]!;
  const b = beatMs[lo]!;
  return Math.abs(ms - a) <= Math.abs(ms - b) ? a : b;
}

/**
 * Extend a partial beat grid to cover the full audio duration at ~constant tempo.
 * Required when UI analysis only scans an initial window (e.g. 30 s) but the
 * song / Beat-1 offset (#GAP) extends further.
 */
export function extendBeatGridToDuration(
  beatMs: readonly number[],
  durationMs: number,
  bpm: number,
  maxBeats: number = SMART_TEMPO_MAX_BEATS,
): number[] {
  if (!(durationMs > 0) || !(bpm > 0)) return beatMs.length > 0 ? [...beatMs] : [];
  const period =
    beatMs.length >= 2
      ? (beatMs[beatMs.length - 1]! - beatMs[0]!) / (beatMs.length - 1)
      : 60_000 / bpm;
  if (!(period > 0)) return beatMs.length > 0 ? [...beatMs] : [0];
  const out: number[] = beatMs.length > 0 ? [...beatMs] : [0];
  let t = out[out.length - 1]!;
  while (t + period * 0.5 < durationMs && out.length < maxBeats) {
    t += period;
    out.push(Math.round(t));
  }
  return out;
}

/**
 * Refine a beat grid against onset observations using Drift Gate per beat.
 */
function findOnsetNearExpected(
  onsetsMs: readonly number[],
  expected: number,
  windowMs: number,
): number | null {
  if (onsetsMs.length === 0 || !(windowMs > 0)) return null;
  const minMs = expected - windowMs;
  const maxMs = expected + windowMs;
  let lo = 0;
  let hi = onsetsMs.length - 1;
  let startIdx = onsetsMs.length;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((onsetsMs[mid] ?? 0) >= minMs) {
      startIdx = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  let best: number | null = null;
  let bestDist = windowMs + 1;
  for (let i = startIdx; i < onsetsMs.length; i++) {
    const o = onsetsMs[i]!;
    if (o > maxMs) break;
    const d = Math.abs(o - expected);
    if (d <= windowMs && d < bestDist) {
      best = o;
      bestDist = d;
    }
  }
  return best;
}

export function refineBeatGridWithOnsets(
  beatMs: readonly number[],
  onsetsMs: readonly number[],
  seedBpm: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq: number = DEFAULT_PPQ,
): number[] {
  if (beatMs.length === 0) return [];
  const cappedBeats = beatMs.slice(0, SMART_TEMPO_MAX_BEATS);
  const out: number[] = [cappedBeats[0]!];
  for (let i = 1; i < cappedBeats.length; i++) {
    const expected = cappedBeats[i]!;
    const prev = out[out.length - 1]!;
    const period = expected - (cappedBeats[i - 1] ?? prev);
    const windowMs = period * 0.15;
    const near = findOnsetNearExpected(onsetsMs, expected, windowMs);
    const observed = near ?? expected;
    const gate = evaluateDriftGate(observed, expected, {
      seedBpm,
      meter,
      ppq,
    });
    if (gate.action === "node") {
      out.push(gate.wallMs);
    } else {
      out.push(expected);
    }
  }
  return out;
}

/** Index of the beat closest to `targetMs` on an absolute audio beat grid. */
export function closestBeatIndex(
  beatMs: readonly number[],
  targetMs: number,
): number {
  if (beatMs.length === 0) return 0;
  let best = 0;
  let bestDist = Math.abs((beatMs[0] ?? 0) - targetMs);
  for (let i = 1; i < beatMs.length; i++) {
    const d = Math.abs((beatMs[i] ?? 0) - targetMs);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

/** Piecewise-linear tick at `wallMs` along sorted TempoNodes (extrapolates ends). */
export function interpolateTickAtWallMs(
  nodes: readonly TempoNode[],
  wallMs: number,
): number {
  if (nodes.length === 0) return 0;
  if (nodes.length === 1) return nodes[0]!.targetTick;
  if (wallMs <= nodes[0]!.wallMs) {
    const a = nodes[0]!;
    const b = nodes[1]!;
    const span = b.wallMs - a.wallMs;
    if (span <= 0) return a.targetTick;
    return (
      a.targetTick +
      ((wallMs - a.wallMs) / span) * (b.targetTick - a.targetTick)
    );
  }
  const last = nodes[nodes.length - 1]!;
  if (wallMs >= last.wallMs) {
    const a = nodes[nodes.length - 2]!;
    const b = last;
    const span = b.wallMs - a.wallMs;
    if (span <= 0) return b.targetTick;
    return (
      a.targetTick +
      ((wallMs - a.wallMs) / span) * (b.targetTick - a.targetTick)
    );
  }
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]!;
    const b = nodes[i + 1]!;
    if (wallMs <= b.wallMs) {
      const span = b.wallMs - a.wallMs;
      if (span <= 0) return a.targetTick;
      return (
        a.targetTick +
        ((wallMs - a.wallMs) / span) * (b.targetTick - a.targetTick)
      );
    }
  }
  return last.targetTick;
}

function dedupeTempoNodesByWallMs(nodes: TempoNode[]): TempoNode[] {
  const sorted = nodes
    .slice()
    .sort((a, b) => a.wallMs - b.wallMs || a.targetTick - b.targetTick);
  const out: TempoNode[] = [];
  for (const n of sorted) {
    const last = out[out.length - 1];
    if (last && last.wallMs === n.wallMs) {
      last.targetTick = n.targetTick;
      continue;
    }
    out.push({ ...n });
  }
  return out;
}

/**
 * Median BPM from inter-beat intervals (ignores outliers outside 40–240 BPM).
 * Used as audio seed when the beat grid is trustworthy.
 * After the first median, drops double-time / half-time IBI outliers and
 * recomputes so a brief subdivision cluster cannot inflate the Adapt seed.
 */
export function medianBpmFromBeatMs(beatMs: readonly number[]): number {
  if (beatMs.length < 3) return 0;
  const intervals: number[] = [];
  for (let i = 1; i < beatMs.length; i++) {
    const dt = (beatMs[i] ?? 0) - (beatMs[i - 1] ?? 0);
    if (dt >= 250 && dt <= 1_500) intervals.push(dt);
  }
  if (intervals.length < 2) return 0;
  intervals.sort((a, b) => a - b);
  let median = intervals[Math.floor(intervals.length / 2)]!;
  const robust = intervals.filter(
    (dt) => dt >= median * 0.75 && dt <= median * 1.35,
  );
  if (robust.length >= 2) {
    const sorted = robust.slice().sort((a, b) => a - b);
    median = sorted[Math.floor(sorted.length / 2)]!;
  }
  const bpm = 60_000 / median;
  if (!(bpm >= 40 && bpm <= 300)) return 0;
  return Math.round(bpm * 100) / 100;
}

/**
 * Replace double-time / half-time IBI blips in place so a single dense onset
 * cluster cannot create a multi-BPM Adapt wall when sparse nodes average wall
 * time over 1–2 bars. When a short IBI is followed by a compensating long
 * (classic false 8th-note snap), both sides are restored to the median.
 * Unpaired outliers shift the beat (and all later beats by the same Δ) so
 * subsequent IBIs stay intact — no cascade of new shorts.
 */
export function sanitizeBeatGridIbis(
  beatMs: readonly number[],
  seedBpm: number = 0,
): number[] {
  if (beatMs.length < 3) return beatMs.length > 0 ? [...beatMs] : [];
  const out = beatMs.map((ms) => ms);
  const raw: number[] = [];
  for (let i = 1; i < out.length; i++) {
    const dt = out[i]! - out[i - 1]!;
    if (dt > 0) raw.push(dt);
  }
  if (raw.length === 0) return out;
  const sorted = raw.slice().sort((a, b) => a - b);
  let median = sorted[Math.floor(sorted.length / 2)]!;
  const robust = raw.filter((dt) => dt >= median * 0.75 && dt <= median * 1.35);
  if (robust.length >= 2) {
    const rs = robust.slice().sort((a, b) => a - b);
    median = rs[Math.floor(rs.length / 2)]!;
  }
  if (seedBpm > 0) {
    const seedPeriod = 60_000 / seedBpm;
    if (median < seedPeriod * 0.7 || median > seedPeriod * 1.4) {
      median = seedPeriod;
    }
  }
  const lo = median * 0.78;
  const hi = median * 1.28;

  const shiftFrom = (startIdx: number, delta: number) => {
    if (delta === 0) return;
    for (let j = startIdx; j < out.length; j++) {
      out[j] = out[j]! + delta;
    }
  };

  for (let i = 1; i < out.length - 1; i++) {
    const dt = out[i]! - out[i - 1]!;
    if (dt >= lo && dt <= hi) continue;
    const dtNext = out[i + 1]! - out[i]!;
    const pair = dt + dtNext;
    // False half-beat snap: short then compensating long (or the reverse).
    if (pair >= median * 1.6 && pair <= median * 2.4) {
      out[i] = Math.round(out[i - 1]! + median);
      continue;
    }
    const target = Math.round(out[i - 1]! + median);
    shiftFrom(i, target - out[i]!);
  }
  if (out.length >= 2) {
    const last = out.length - 1;
    const dt = out[last]! - out[last - 1]!;
    if (dt < lo || dt > hi) {
      out[last] = Math.round(out[last - 1]! + median);
    }
  }
  return out;
}

/**
 * Uniformly rescale beat times around the first beat so median IBI matches
 * `targetBpm`. Preserves relative rubato while correcting systematic AC/IBI
 * bias (e.g. analysis ~112 vs seed ~120) **and** half-time grids (~64 → ~128).
 */
export function rescaleBeatGridToBpm(
  beatMs: readonly number[],
  targetBpm: number,
): number[] {
  if (beatMs.length < 2 || !(targetBpm > 0)) {
    return beatMs.length > 0 ? [...beatMs] : [];
  }
  const median = medianBpmFromBeatMs(beatMs);
  if (!(median > 0)) return [...beatMs];
  const rel = Math.abs(median - targetBpm) / targetBpm;
  // Allow ~octave corrections (rel≈0.5) as well as small AC bias (≤25%).
  if (rel < 0.03 || rel > 0.55) return [...beatMs];
  // period_new = period_old * (median / target) → shrink when median is low
  const scale = median / targetBpm;
  const origin = beatMs[0]!;
  return beatMs.map((ms, i) =>
    i === 0 ? ms : Math.round(origin + (ms - origin) * scale),
  );
}

/**
 * Gentle uniform scale around the first beat so the last beat lands nearer a
 * late onset anchor — only within ±~4% (self-consistency, not seed chase).
 */
export function selfConsistentScaleBeatGrid(
  beatMs: readonly number[],
  onsetsMs: readonly number[],
): number[] {
  if (beatMs.length < 4 || onsetsMs.length === 0) {
    return beatMs.length > 0 ? [...beatMs] : [];
  }
  const origin = beatMs[0]!;
  const last = beatMs[beatMs.length - 1]!;
  const span = last - origin;
  if (!(span > 0)) return [...beatMs];

  let nearest = onsetsMs[0]!;
  let bestDist = Math.abs(nearest - last);
  for (let i = 1; i < onsetsMs.length; i++) {
    const o = onsetsMs[i]!;
    const d = Math.abs(o - last);
    if (d < bestDist) {
      bestDist = d;
      nearest = o;
    }
  }
  const observedSpan = nearest - origin;
  if (!(observedSpan > 0)) return [...beatMs];

  const scale = observedSpan / span;
  if (scale < 0.96 || scale > 1.04 || Math.abs(scale - 1) < 0.005) {
    return [...beatMs];
  }
  return beatMs.map((ms, i) =>
    i === 0 ? ms : Math.round(origin + (ms - origin) * scale),
  );
}

/**
 * TempoMap seed from median IBI of the tracked beat grid (Adapt SSOT).
 * Analysis / ACF fills only when median is missing. Editorial pipe+GAP BPM is
 * **not** a tempo lock — `fallbackBpm` only fills when both are empty, and as a
 * soft octave center for half-time (~55–80) fold.
 */
export function preferAudioTempoSeed(
  analysisBpm: number,
  fallbackBpm: number,
  medianBpm: number = 0,
): number {
  const grid = analysisBpm > 0 ? analysisBpm : 0;
  const median = medianBpm > 0 ? medianBpm : 0;
  const fallback = fallbackBpm > 0 ? fallbackBpm : 0;

  let chosen = 120;
  if (grid > 0 && median > 0) {
    const diffPct = Math.abs(grid - median) / median;
    if (diffPct > 0.03 && diffPct < 0.35) {
      chosen = Math.round(median * 100) / 100;
    } else {
      chosen = Math.round(grid * 100) / 100;
    }
  } else if (grid > 0) {
    chosen = Math.round(grid * 100) / 100;
  } else if (median > 0) {
    chosen = Math.round(median * 100) / 100;
  } else if (fallback > 0) {
    chosen = Math.round(fallback * 100) / 100;
  }

  // Half-time (~55–80): soft octave fold via fallback center if sensible, else 2×.
  if (chosen >= 55 && chosen < 80) {
    const doubled = chosen * 2;
    if (fallback > 0) {
      const nearDouble =
        Math.abs(fallback - doubled) / doubled <= 0.2 ||
        (fallback >= chosen * 1.6 && fallback <= chosen * 2.4);
      if (nearDouble) {
        return Math.round(fallback * 100) / 100;
      }
    }
    return Math.round(Math.min(BPM_MAX, doubled) * 100) / 100;
  }
  return chosen;
}

/** @deprecated Use {@link preferAudioTempoSeed} — pipe/GAP must not lock Adapt tempo. */
export function preferEditorialTempoSeed(
  analysisBpm: number,
  lockBpm: number,
  medianBpm: number = 0,
): number {
  return preferAudioTempoSeed(analysisBpm, lockBpm, medianBpm);
}

function instantaneousBpmBetweenNodes(
  a: TempoNode,
  b: TempoNode,
  meter: TimeSignature,
  ppq: number,
): number {
  const tickLen = b.targetTick - a.targetTick;
  const durMs = b.wallMs - a.wallMs;
  if (tickLen <= 0 || durMs <= 1) return 0;
  // quarters / sec * 60 — localTicksPerBeat accounts for meter.
  const beats = tickLen / localTicksPerBeat(meter, ppq);
  if (!(beats > 0)) return 0;
  return (beats * 60_000) / durMs;
}

function medianOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

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

/**
 * Logic-like sparse TempoNodes from a dense beat grid.
 * Smoothed local BPM decides *where* to place nodes; wallMs/targetTick stay
 * exact so ms→tick lock is preserved between anchors (no Flex Time).
 * Also emits at least every ~2 bars (Logic Smart Tempo density) so long
 * steady stretches still track mild rubato instead of one flat seed.
 */
export function sparsifyTempoNodesFromBeatGrid(
  dense: readonly TempoNode[],
  opts: SparsifyTempoNodesOptions,
): TempoNode[] {
  if (dense.length === 0) return [];
  if (dense.length <= 2) return dense.map((n) => ({ ...n }));

  const meter = opts.meter ?? { numerator: 4, denominator: 4 };
  const ppq = opts.ppq ?? DEFAULT_PPQ;
  const minDelta = opts.minBpmDelta ?? SMART_TEMPO_SPARSE_MIN_BPM_DELTA;
  const windowBeats = Math.max(
    2,
    Math.trunc(opts.windowBeats ?? SMART_TEMPO_SPARSE_WINDOW_BEATS),
  );
  const barTicks = ticksPerBar(meter, ppq);
  const minTicks = Math.max(
    1,
    Math.floor((opts.minBarGap ?? SMART_TEMPO_SPARSE_MIN_BAR_GAP) * barTicks),
  );
  /** Force a refresh node even when |ΔBPM| is tiny (Logic ~1–2 bar spacing). */
  const maxQuietTicks = Math.max(minTicks, 1 * barTicks);
  const maxStep = opts.maxBpmStep ?? SMART_TEMPO_SPARSE_MAX_BPM_STEP;
  const seed = opts.seedBpm > 0 ? opts.seedBpm : 120;

  const sorted = dense
    .slice()
    .sort((a, b) => a.targetTick - b.targetTick || a.wallMs - b.wallMs);

  const minAllowedBpm = seed > 0 ? seed * 0.90 : 40;
  const maxAllowedBpm = seed > 0 ? seed * 1.10 : 300;
  const clampBpm = (val: number) => (val > 0 ? Math.min(maxAllowedBpm, Math.max(minAllowedBpm, val)) : seed);

  const firstBpm =
    sorted.length > 1
      ? instantaneousBpmBetweenNodes(sorted[0]!, sorted[1]!, meter, ppq)
      : 0;
  const inst: number[] = [clampBpm(firstBpm)];
  for (let i = 1; i < sorted.length; i++) {
    const bpm = instantaneousBpmBetweenNodes(
      sorted[i - 1]!,
      sorted[i]!,
      meter,
      ppq,
    );
    inst.push(clampBpm(bpm));
  }

  const half = Math.floor(windowBeats / 2);
  const smoothed: number[] = [];
  for (let i = 0; i < inst.length; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(inst.length, i + half + 1);
    smoothed.push(medianOf(inst.slice(lo, hi)));
  }

  const out: TempoNode[] = [{ ...sorted[0]! }];
  let lastBpm = smoothed[0]!;
  for (let i = 1; i < sorted.length - 1; i++) {
    const n = sorted[i]!;
    const originTick = Math.floor(sorted[0]!.targetTick / barTicks) * barTicks;
    const perBeat = localTicksPerBeat(meter, ppq);
    const relTicks = Math.abs(n.targetTick - originTick);
    const modBar = relTicks % barTicks;
    const isBarStart = modBar <= perBeat * 0.5 || barTicks - modBar <= perBeat * 0.5;
    if (!isBarStart) continue;

    const last = out[out.length - 1]!;
    const gapTicks = n.targetTick - last.targetTick;
    if (gapTicks < minTicks) continue;
    const local = smoothed[i]!;
    const delta = Math.abs(local - lastBpm);
    const quietTooLong = gapTicks >= maxQuietTicks;
    // Always reject spikes — quiet refresh must not bypass maxStep (that
    // emitted ±10–15 BPM walls when a single IBI blip survived the median).
    if (delta > maxStep) {
      if (quietTooLong) {
        const cappedBpm = lastBpm + Math.sign(local - lastBpm) * maxStep;
        out.push({ ...n });
        lastBpm = cappedBpm;
        continue;
      }
      continue;
    }
    if (!quietTooLong && delta < minDelta) continue;
    out.push({ ...n });
    lastBpm = local;
  }
  const end = sorted[sorted.length - 1]!;
  if (end.targetTick > out[out.length - 1]!.targetTick) {
    out.push({ ...end });
  } else {
    out[out.length - 1] = { ...end };
  }
  return out;
}

/**
 * Soft-prune consecutive TempoEvents with near-identical BPM (E2).
 */
export function pruneTempoMapByBpmDelta(
  events: readonly TempoEvent[],
  seedBpm: number,
  floorTicks: number,
  idPrefix: string,
  deltaBpm: number = 0.5,
): TempoEvent[] {
  if (events.length === 0) {
    return [{ id: `${idPrefix}-te-1`, startTicks: floorTicks, bpm: seedBpm }];
  }
  const pruned: TempoEvent[] = [];
  for (const ev of events) {
    const last = pruned[pruned.length - 1];
    if (last && ev.startTicks <= last.startTicks) continue;
    if (last && Math.abs(ev.bpm - last.bpm) <= deltaBpm) continue;
    pruned.push({
      id: `${idPrefix}-te-${pruned.length + 1}`,
      startTicks: ev.startTicks,
      bpm: ev.bpm,
    });
  }
  if (pruned.length === 0) {
    pruned.push({
      id: `${idPrefix}-te-1`,
      startTicks: floorTicks,
      bpm: seedBpm,
    });
  } else {
    pruned[0] = { ...pruned[0]!, startTicks: floorTicks };
  }
  return pruned;
}

/**
 * Dense TempoNodes from an audio beat grid (file-absolute wallMs).
 * Content-epoch ticks: Beat 1 (`audioStartOffsetMs`) → `floorTicks` (tick 0).
 * Beats keep relative spacing from the detected grid (dynamic BPM). Leading
 * silence before Beat 1 is omitted from the tick axis (clip trim handles audio).
 */
export function tempoNodesFromBeatGrid(
  beatMs: readonly number[],
  audioStartOffsetMs: number,
  seedBpm: number,
  floorTicks: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq: number = DEFAULT_PPQ,
): TempoNode[] {
  if (beatMs.length === 0) return [];
  const bpm = seedBpm > 0 ? seedBpm : 120;
  const perBeat = localTicksPerBeat(meter, ppq);
  const offset = Math.max(0, audioStartOffsetMs);

  // Prefer beats at/after Beat 1; fall back to full grid if analysis missed it.
  let source = beatMs.filter((ms) => ms >= offset - 1);
  if (source.length < 2) {
    source = beatMs.length > 0 ? [...beatMs] : [offset];
  }

  if (offset > 0) {
    // ── GAP scenario (original logic, unchanged) ──
    if (source[0]! > offset + 1) {
      source = [offset, ...source];
    }
    const originIdx = closestBeatIndex(source, offset);
    const firstBeatTicks = Math.max(0, floorTicks - originIdx * perBeat);
    let nodes: TempoNode[] = source.map((ms, i) => ({
      wallMs: i === originIdx ? offset : Math.max(0, ms),
      targetTick: firstBeatTicks + i * perBeat,
    }));
    nodes = dedupeTempoNodesByWallMs(nodes);



    // Keep pre-roll audio nodes down to wallMs=0 (targetTick=0).
    nodes = nodes.filter(
      (n) => n.wallMs >= -1 && n.targetTick >= -1,
    );
    if (nodes.length === 0) {
      nodes = [{ wallMs: offset, targetTick: floorTicks }];
    } else {
      nodes.push({ wallMs: offset, targetTick: floorTicks });
      nodes = dedupeTempoNodesByWallMs(nodes);
    }

    if (nodes.length === 1) {
      const period = 60_000 / bpm;
      nodes.push({
        wallMs: offset + period,
        targetTick: floorTicks + perBeat,
      });
    }

    if (nodes[0]!.targetTick > 0 && nodes[0]!.wallMs > 0) {
      nodes.unshift({ wallMs: 0, targetTick: 0 });
    }
    return dedupeTempoNodesByWallMs(nodes);
  }

  // ── Standalone audio (offset === 0): wallMs=0 = Bar 1 Beat 1 ──
  let nodes: TempoNode[] = [];

  // Each detected beat in the Viterbi grid corresponds to exactly 1 beat (perBeat ticks),
  // preserving section-level tempo changes (rubato intro, verse/chorus transitions).
  for (let i = 0; i < source.length; i++) {
    const ms = source[i]!;
    const tick = floorTicks + i * perBeat;
    nodes.push({ wallMs: Math.max(0, ms), targetTick: tick });
  }

  nodes = dedupeTempoNodesByWallMs(nodes);

  if (nodes.length === 1) {
    const period = 60_000 / bpm;
    nodes.push({
      wallMs: period,
      targetTick: floorTicks + perBeat,
    });
  }

  if (nodes[0]!.targetTick !== floorTicks) {
    const lift = floorTicks - nodes[0]!.targetTick;
    for (const n of nodes) n.targetTick += lift;
  }

  return dedupeTempoNodesByWallMs(nodes);
}

/**
 * Bar-boundary TempoNodes for Beat Mapper UI (file-absolute, sparser markers).
 */
export function tempoNodesAtBarBoundaries(
  beatMs: readonly number[],
  audioStartOffsetMs: number,
  seedBpm: number,
  floorTicks: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq: number = DEFAULT_PPQ,
): TempoNode[] {
  const dense = tempoNodesFromBeatGrid(
    beatMs,
    audioStartOffsetMs,
    seedBpm,
    floorTicks,
    meter,
    ppq,
  );
  const beatsPerBar = Math.max(
    1,
    Math.round((meter.numerator * 4) / meter.denominator),
  );
  const out: TempoNode[] = [];
  if (dense.length > 0 && dense[0]!.wallMs < (dense[1]?.wallMs ?? 1) - 1) {
    out.push({ ...dense[0]! });
  }
  const firstBeatIdx = dense.findIndex((n) => n.targetTick >= floorTicks);
  const start = firstBeatIdx >= 0 ? firstBeatIdx : 0;
  for (let i = start; i < dense.length; i += beatsPerBar) {
    if (out.length >= SMART_TEMPO_MAX_UI_NODES) break;
    if (out.length > 0 && out[out.length - 1]!.wallMs === dense[i]!.wallMs) continue;
    out.push({ ...dense[i]! });
  }
  const last = dense[dense.length - 1];
  if (
    last &&
    out.length < SMART_TEMPO_MAX_UI_NODES &&
    out[out.length - 1]?.wallMs !== last.wallMs
  ) {
    out.push({ ...last });
  }
  return out;
}

/**
 * Audio-driven Smart Tempo: build TempoMap ONLY from precomputed beat grid.
 * US / UG must not author tempo — they snap to this map downstream.
 */
export function runAudioDrivenSmartTempo(
  input: AudioSmartTempoInput,
): AudioSmartTempoResult {
  const meter = input.meter ?? { numerator: 4, denominator: 4 };
  const ppq = input.ppq ?? DEFAULT_PPQ;
  const floor = input.floorTicks ?? 0;
  const prefix = input.idPrefix ?? "stm";
  const offset = Math.max(0, input.audioStartOffsetMs ?? 0);
  const warnings: string[] = [];

  /** Editorial lock BPM (pipe+GAP) — anchors GAP→ticks like PO structure. */
  const lockBpm =
    input.fallbackBpm != null && input.fallbackBpm > 0
      ? input.fallbackBpm
      : input.analysis.estimatedBpm > 0
        ? input.analysis.estimatedBpm
        : 120;

  const gridBpm =
    input.analysis.estimatedBpm > 0 ? input.analysis.estimatedBpm : lockBpm;

  const cameFromViterbi = input.analysis.beatMs.length > 0;
  let beatMs = input.analysis.beatMs.slice(0, SMART_TEMPO_MAX_BEATS);
  if (beatMs.length === 0 && input.analysis.onsetsMs.length > 0) {
    beatMs = input.analysis.onsetsMs.slice(0, SMART_TEMPO_MAX_BEATS);
    warnings.push(
      "Brak siatki beatów — użyto samych transientów (rzadsza mapa tempa).",
    );
  }
  if (beatMs.length === 0) {
    const barMs = msPerBarAtBpm(lockBpm, meter, ppq);
    const gridMs = Math.min(
      Math.max(1, input.durationMs),
      SMART_TEMPO_MAX_GRID_MS,
    );
    const bars = Math.max(1, Math.ceil(gridMs / barMs));
    const beatCount = Math.min(bars * 4 + 1, SMART_TEMPO_MAX_BEATS);
    beatMs = Array.from({ length: beatCount }, (_, i) =>
      Math.round(i * (barMs / 4)),
    );
    warnings.push(
      "Nie wykryto beatów w audio — mapa tempa z BPM kotwicy (sprawdź Beat Mapper).",
    );
  }

  if (input.durationMs > 0) {
    const lastBeat = beatMs[beatMs.length - 1] ?? 0;
    // Extend at lock BPM when available so a low analysis period does not
    // pad the tail with systematically slow beats.
    const extendBpm = lockBpm > 0 ? lockBpm : gridBpm;
    const needMs = Math.max(
      input.durationMs,
      offset + msPerBarAtBpm(extendBpm, meter, ppq),
    );
    if (lastBeat + msPerBarAtBpm(extendBpm, meter, ppq) * 0.5 < needMs) {
      beatMs = extendBeatGridToDuration(
        beatMs,
        needMs,
        extendBpm,
        SMART_TEMPO_MAX_BEATS,
      );
    }
  }

  if (!cameFromViterbi) {
    const refineBpm = lockBpm > 0 ? lockBpm : gridBpm;
    beatMs = refineBeatGridWithOnsets(
      beatMs,
      input.analysis.onsetsMs,
      refineBpm,
      meter,
      ppq,
    );
    beatMs = selfConsistentScaleBeatGrid(beatMs, input.analysis.onsetsMs);
  }

  // Prefer median IBI from the grid — more stable than a single AC peak.
  const medianBpm = medianBpmFromBeatMs(
    beatMs.filter((ms) => ms >= offset - 1),
  );
  // Adapt SSOT: seed from median IBI (analysis only when median missing).
  // fallbackBpm is a last resort / soft half-time octave — never a pipe+GAP lock.
  const seedBpm = preferAudioTempoSeed(gridBpm, lockBpm, medianBpm);

  // Keep Viterbi beat grid timing as detected from actual audio onsets.

  // Drop double-time IBI blips before sparsify — quiet 1–2 bar nodes would
  // otherwise average a single short interval into a multi-BPM Adapt jump.
  beatMs = sanitizeBeatGridIbis(beatMs, seedBpm);

  const rawDense = tempoNodesFromBeatGrid(
    beatMs,
    offset,
    seedBpm,
    floor,
    meter,
    ppq,
  );
  const denseNodes = rawDense.filter((n, i) => {
    if (i === 0) return true;
    const prev = rawDense[i - 1]!;
    return n.wallMs - prev.wallMs >= 200 || n.targetTick === prev.targetTick;
  });
  const tempoNodes = tempoNodesAtBarBoundaries(
    beatMs,
    offset,
    seedBpm,
    floor,
    meter,
    ppq,
  );
  const tempoMap = tempoMapFromTempoNodes(
    tempoNodes.length > 0 ? tempoNodes : denseNodes,
    seedBpm,
    floor,
    meter,
    ppq,
    prefix,
    {
      audioDurationMs: input.durationMs > 0 ? input.durationMs : undefined,
    },
  );

  const lastWall = beatMs[beatMs.length - 1] ?? 0;
  if (
    input.durationMs > 0 &&
    lastWall > input.durationMs + msPerBarAtBpm(seedBpm, meter, ppq)
  ) {
    warnings.push(
      `Mapa tempa (${Math.round(lastWall / 1000)}s) przekracza długość audio (${Math.round(input.durationMs / 1000)}s).`,
    );
  }

  return {
    seedBpm,
    tempoMap,
    tempoNodes,
    beatMs,
    warnings,
  };
}

/**
 * Layout Forma section walls from UG bar counts only — no US wall-clock sizing.
 * Legacy / no-audio path. Prefer {@link layoutFormaFromAlignedWords} with Smart Tempo.
 */
export function layoutFormaFromUgBarCounts(
  sections: readonly UgFormaSectionInput[],
  floorTicks: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq: number = DEFAULT_PPQ,
  opts?: Pick<LayoutFormaFromUgBarCountsOpts, "layoutBpm">,
): TempoSolverSectionPlan[] {
  const barTicks = ticksPerBar(meter, ppq);
  const layoutBpm =
    opts?.layoutBpm != null &&
    Number.isFinite(opts.layoutBpm) &&
    opts.layoutBpm > 0
      ? opts.layoutBpm
      : 120;
  const plans: TempoSolverSectionPlan[] = [];
  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si]!;
    const fromPipe = sec.pipeBarCount > 0;
    let pristineBars: number;
    if (fromPipe) {
      pristineBars = Math.max(1, sec.pipeBarCount);
    } else {
      // UltraStar walls / lyric fallback via structuralBars — not chord count.
      pristineBars = Math.max(1, sec.structuralBars);
    }
    plans.push({
      sectionIndex: si,
      name: sec.name,
      startMs: sec.vocalStartMs ?? 0,
      endMs: 0,
      pristineBars,
      fromPipe,
      startTicks: 0,
      lengthTicks: 0,
    });
  }
  const solverSections = sections.map((sec) => ({
    pipeBarCount: sec.pipeBarCount,
    vocalMsRange:
      sec.vocalStartMs != null && Number.isFinite(sec.vocalStartMs)
        ? { startMs: sec.vocalStartMs, endMs: sec.vocalStartMs }
        : null,
  }));
  layoutContiguousFormaPlans(
    plans,
    solverSections,
    floorTicks,
    barTicks,
    layoutBpm,
    meter,
    ppq,
  );
  return plans;
}

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

/**
 * Forma walls from UG↔US word links on the audio TempoMap.
 * Vocal section Beat 1 = {@link sectionStartFromVocalTicks}(first word).
 * Wordless / pipe sections take `pipeBarCount` bars at the audio seed grid and
 * absorb anacrusis so the next vocal Forma starts on a barline (no US `#BPM`).
 */
export function layoutFormaFromAlignedWords(
  sections: readonly AlignedWordFormaSection[],
  floorTicks: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq: number = DEFAULT_PPQ,
): TempoSolverSectionPlan[] {
  const barTicks = ticksPerBar(meter, ppq);
  const n = sections.length;
  const beat1Ticks: (number | null)[] = sections.map((sec) => {
    if (sec.firstWordTicks == null || !Number.isFinite(sec.firstWordTicks)) {
      return null;
    }
    return sectionStartFromVocalTicks(sec.firstWordTicks, barTicks);
  });

  const endTicksExclusive: number[] = new Array(n).fill(0);
  for (let si = 0; si < n; si++) {
    let nextVocal: number | null = null;
    for (let j = si + 1; j < n; j++) {
      if (beat1Ticks[j] != null) {
        nextVocal = beat1Ticks[j]!;
        break;
      }
    }
    if (beat1Ticks[si] != null) {
      if (nextVocal != null && nextVocal > beat1Ticks[si]!) {
        endTicksExclusive[si] = nextVocal;
      } else {
        const last = sections[si]!.lastWordTicks;
        const rawEnd =
          last != null && Number.isFinite(last)
            ? Math.max(beat1Ticks[si]! + barTicks, last + 1)
            : beat1Ticks[si]! + barTicks;
        // Snap end up to a barline so Forma lengths stay integer bars.
        const rem = rawEnd % barTicks;
        endTicksExclusive[si] =
          rem === 0 ? rawEnd : rawEnd - rem + barTicks;
      }
    }
  }

  const plans: TempoSolverSectionPlan[] = [];
  let cursor = floorTicks;
  for (let si = 0; si < n; si++) {
    const sec = sections[si]!;
    const fromPipe = sec.pipeBarCount > 0 && beat1Ticks[si] == null;
    let startTicks: number;
    let lengthTicks: number;
    let startMs = 0;

    if (sec.structuralBars != null && sec.structuralBars > 0) {
      startTicks = cursor;
      const pristineBars = Math.max(1, Math.trunc(sec.structuralBars));
      lengthTicks = pristineBars * barTicks;
      cursor += lengthTicks;
      plans.push({
        sectionIndex: si,
        name: sec.name,
        startMs: 0,
        endMs: 0,
        pristineBars,
        fromPipe: sec.pipeBarCount > 0,
        startTicks,
        lengthTicks,
      });
      continue;
    }

    if (beat1Ticks[si] != null) {
      const vocalStart = Math.max(floorTicks, beat1Ticks[si]!);
      if (vocalStart > cursor && si > 0) {
        // Gap before vocal Beat 1 → previous section absorbs (anacrusis / pipe).
        const prev = plans[si - 1]!;
        prev.lengthTicks += vocalStart - cursor;
        prev.pristineBars = Math.max(
          1,
          Math.round(prev.lengthTicks / barTicks),
        );
        cursor = vocalStart;
      }
      startTicks = Math.max(cursor, vocalStart);
      const end = Math.max(startTicks + barTicks, endTicksExclusive[si]!);
      lengthTicks = end - startTicks;
      // Integer bars.
      const bars = Math.max(1, Math.round(lengthTicks / barTicks));
      lengthTicks = bars * barTicks;
      startMs = 0;
    } else {
      startTicks = cursor;
      const pipeBars = Math.max(1, Math.trunc(sec.pipeBarCount) || 1);
      let nextVocal: number | null = null;
      for (let j = si + 1; j < n; j++) {
        if (beat1Ticks[j] != null) {
          nextVocal = beat1Ticks[j]!;
          break;
        }
      }
      // Word-linked boundary wins: pipe ends at next vocal Beat 1 (anacrusis
      // absorbed). Do not force pipeBarCount when content-epoch puts vocals early.
      if (nextVocal != null && nextVocal > startTicks) {
        lengthTicks = nextVocal - startTicks;
      } else if (nextVocal != null && nextVocal <= startTicks) {
        lengthTicks = 0;
      } else {
        lengthTicks = pipeBars * barTicks;
      }
    }

    const pristineBars = Math.max(1, Math.round(lengthTicks / barTicks));
    lengthTicks = pristineBars * barTicks;
    plans.push({
      sectionIndex: si,
      name: sec.name,
      startMs,
      endMs: 0,
      pristineBars,
      fromPipe,
      startTicks,
      lengthTicks,
    });
    cursor = startTicks + lengthTicks;
  }

  // Final pass: ensure contiguous (no gaps/overlaps).
  cursor = floorTicks;
  for (let si = 0; si < plans.length; si++) {
    const p = plans[si]!;
    if (p.startTicks !== cursor) {
      if (p.startTicks > cursor && si > 0) {
        const prev = plans[si - 1]!;
        prev.lengthTicks += p.startTicks - cursor;
        prev.pristineBars = Math.max(
          1,
          Math.round(prev.lengthTicks / barTicks),
        );
        prev.lengthTicks = prev.pristineBars * barTicks;
      }
      p.startTicks = cursor;
    }
    p.pristineBars = Math.max(1, Math.round(p.lengthTicks / barTicks));
    p.lengthTicks = p.pristineBars * barTicks;
    cursor = p.startTicks + p.lengthTicks;
  }
  return plans;
}

/**
 * Filter phrase/syllable anchors when audio ground truth is present — they orient
 * bar counts but must not author TempoMap kinks (Drift Gate).
 */
export function filterAnchorsForSmartTempo<
  T extends { kind: string; ms: number; targetTick?: number; barOffset?: number },
>(anchors: readonly T[]): T[] {
  return anchors.filter(
    (a) =>
      a.kind === "section" ||
      a.kind === "chord" ||
      (a.kind === "phrase" && a.barOffset === 0),
  );
}

/**
 * Build TempoEvent[] from explicit Tempo Nodes (Beat Mapper draft apply).
 */
export function tempoMapFromTempoNodes(
  nodes: readonly TempoNode[],
  seedBpm: number,
  floorTicks: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq = 480,
  idPrefix = "stm",
  opts?: { audioDurationMs?: number },
): TempoEvent[] {
  if (nodes.length === 0) {
    return [{ id: `${idPrefix}-te-1`, startTicks: floorTicks, bpm: seedBpm }];
  }
  let sorted = nodes
    .slice()
    .sort((a, b) => a.targetTick - b.targetTick || a.wallMs - b.wallMs);
  const durationMs = opts?.audioDurationMs;
  if (durationMs != null && durationMs > 0) {
    sorted = sorted.filter((n) => n.wallMs <= durationMs + 1);
    const last = sorted[sorted.length - 1];
    // Extend to audio end by extrapolating ticks at seed BPM — never reuse the
    // last targetTick (that halved the final segment BPM on every import).
    if (last && last.wallMs < durationMs - 1) {
      const spanMs = durationMs - last.wallMs;
      const bpm = seedBpm > 0 ? seedBpm : 120;
      const extraTicks = Math.max(
        1,
        Math.round((spanMs / 1000) * (bpm / 60) * ppq),
      );
      sorted = [
        ...sorted,
        {
          wallMs: durationMs,
          targetTick: last.targetTick + extraTicks,
        },
      ];
    }
  }
  const anchors: MsTickAnchor[] = sorted.map((n) => ({
    ms: n.wallMs,
    targetTick: n.targetTick,
  }));
  const barTicks = ticksPerBar(meter, ppq);
  const raw = tempoEventsFromMsTickAnchors(
    anchors,
    floorTicks,
    seedBpm,
    meter,
    ppq,
    barTicks,
    { soft: false },
  );
  // Safety band around seed (±35%) — clips extreme octave/phase glitches while
  // preserving natural rubato, accelerando, and structural section tempo changes.
  const bandLo = Math.max(
    TEMPO_MAP_MIN_BPM,
    seedBpm > 0 ? seedBpm * 0.65 : TEMPO_MAP_MIN_BPM,
  );
  const bandHi = Math.min(
    BPM_MAX,
    seedBpm > 0 ? seedBpm * 1.45 : BPM_MAX,
  );
  const capped = raw.map((ev) => ({
    startTicks: ev.startTicks,
    bpm: Math.min(bandHi, Math.max(bandLo, ev.bpm)),
  }));

  // ProjectSchema.tempoMap.max(2048) — keep persisted maps within limit.
  const limited = capped.slice(0, SMART_TEMPO_MAX_BEATS);
  const asEvents: TempoEvent[] = limited.map((ev, i) => ({
    id: `${idPrefix}-te-${i + 1}`,
    startTicks: ev.startTicks,
    bpm: ev.bpm,
  }));
  // Do not BPM-prune: sparsify already chose Logic-like 1–2 bar density;
  // prune@0.5 wiped quiet-stretch refresh nodes (bars 3/5/7…).
  const deduped: TempoEvent[] = [];
  for (const ev of asEvents) {
    const last = deduped[deduped.length - 1];
    if (last && ev.startTicks <= last.startTicks) continue;
    deduped.push(ev);
  }
  if (deduped.length === 0) {
    return [{ id: `${idPrefix}-te-1`, startTicks: floorTicks, bpm: seedBpm }];
  }
  deduped[0] = { ...deduped[0]!, startTicks: floorTicks };
  return deduped;
}

/**
 * Tempo Nodes at Forma section Beat 1 walls (legacy solver layout).
 */
export function tempoNodesFromSectionPlans(
  plans: readonly {
    startMs: number;
    startTicks: number;
    lengthTicks: number;
  }[],
): TempoNode[] {
  return plans.map((p) => ({
    wallMs: Math.max(0, p.startMs),
    targetTick: p.startTicks,
  }));
}

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

/**
 * Place or update the single US+UG backing clip @ tick 0.
 * Trims to Beat 1 (`audioStartOffsetMs`); playable length follows TempoMap.
 */
export function placeUsUgBackingAudioClip(
  project: Project,
  opts: PlaceUsUgBackingAudioOpts,
): Project {
  const {
    assetId,
    durationMs,
    waveformPeaks,
    waveformRms,
    audioStartOffsetMs = 0,
    startTicks = 0,
  } = opts;
  if (!assetId || !(durationMs > 0)) return project;

  let assets = project.assets.map((a) => {
    if (a.id !== assetId) return a;
    return {
      ...a,
      durationMs,
      ...(waveformPeaks?.length ? { waveformPeaks } : {}),
      ...(waveformRms != null ? { waveformRms } : {}),
    };
  });

  if (!assets.some((a) => a.id === assetId)) {
    const stub: ProjectAsset = {
      id: assetId,
      storageName: `${assetId}.bin`,
      originalName: "backing",
      kind: "audio",
      mimeType: "audio/mpeg",
      sizeBytes: 0,
      durationMs,
      ...(waveformPeaks?.length ? { waveformPeaks } : {}),
      ...(waveformRms != null ? { waveformRms } : {}),
    };
    assets = [...assets, stub];
  }

  const existingClip = project.audioClips.find((c) => c.assetId === assetId);
  let track = existingClip
    ? project.audioTracks.find((t) => t.id === existingClip.trackId)
    : undefined;
  if (!track) {
    track = project.audioTracks.find(
      (t) => t.id === US_UG_BACKING_TRACK_ID || t.name === US_UG_BACKING_TRACK_NAME,
    );
  }
  if (!track && project.audioTracks.length > 0) {
    track = project.audioTracks[0];
  }
  let audioTracks = project.audioTracks;
  if (!track) {
    track = { id: US_UG_BACKING_TRACK_ID, name: US_UG_BACKING_TRACK_NAME };
    audioTracks = [...audioTracks, track];
  }

  const trimInMs = Math.max(0, Math.min(audioStartOffsetMs, durationMs - 1));
  const playableMs = Math.max(1, durationMs - trimInMs);

  const ctxBpm = project.tempoMap[0]?.bpm ?? project.defaultBpm;
  const meter = project.defaultMeter;
  const ppq = project.ppq;
  const tempoProject: TempoMapProject = {
    defaultBpm: ctxBpm,
    defaultMeter: meter,
    tempoMap: project.tempoMap,
    meterMap: project.meterMap ?? [],
    ppq,
  };
  const lengthTicks = Math.max(
    1,
    secondsToTicksAlongMap(playableMs / 1000, tempoProject),
  );
  const floor = Math.max(0, Math.floor(startTicks));

  const clipPayload: AudioClip = {
    id: existingClip?.id ?? US_UG_BACKING_CLIP_ID,
    trackId: track.id,
    assetId,
    startTicks: floor,
    lengthTicks,
    trimInMs: trimInMs > 0 ? trimInMs : undefined,
    trimOutMs: undefined,
  };
  const otherClips = project.audioClips.filter(
    (c) => c.id !== clipPayload.id && c.assetId !== assetId,
  );
  const audioClips = [...otherClips, clipPayload];

  return { ...project, assets, audioTracks, audioClips };
}

/**
 * Warn when the last tempo node wall-clock exceeds audio duration.
 */
export function audioDurationOverflowWarning(
  lastNodeWallMs: number,
  audioDurationMs: number,
): string | null {
  if (!(audioDurationMs > 0) || lastNodeWallMs <= audioDurationMs) return null;
  return `Mapa tempa kończy się (${Math.round(lastNodeWallMs / 1000)}s) po długości audio (${Math.round(audioDurationMs / 1000)}s) — sprawdź Beat Mapper.`;
}
