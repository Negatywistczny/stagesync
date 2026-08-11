import {
  BEAT_ONSET_BLEND,
  BEAT_SNAP_FRAC,
  LOCAL_PERIOD_IBI_WINDOW,
  LOCAL_PERIOD_STEP_HI,
  LOCAL_PERIOD_STEP_LO,
  PERIOD_HINT_CLAMP_HI,
  PERIOD_HINT_CLAMP_LO,
  PERIOD_HINT_STABLE_WEIGHT,
  STABLE_PERIOD_STEP_HI,
  STABLE_PERIOD_STEP_LO,
} from "./constants.js";
import { nearestOnsetMs, resolveBeatGridPhase } from "./downbeat-detect.js";
import { medianOfPositive, throwIfAborted } from "./helpers.js";
import type { ViterbiBeatTrace, WindowedBpmPoint } from "./types.js";

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
    const firstSpike = spikeOnsetsMs.find(
      (s) =>
        s >= startMs + periodHint * 3.0 && s <= startMs + periodHint * 48.0,
    );
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
    if (!windowedMap || windowedMap.length === 0) return rawPeriodHint;
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

  const initialLocalPeriod = estimateInitialLocalPeriod(
    onsetsMs,
    rawPeriodHint,
    spikeOnsetsMs,
  );
  const periodHint =
    initialLocalPeriod > 0 ? initialLocalPeriod : rawPeriodHint;
  console.log(
    `[SMART TEMPO DIAGNOSTICS] buildBeatGridViterbi -> initialLocalPeriod: ${initialLocalPeriod.toFixed(1)} ms (${(60_000 / initialLocalPeriod).toFixed(2)} BPM), rawPeriodHint: ${rawPeriodHint.toFixed(1)} ms (${estimatedBpm.toFixed(2)} BPM)`,
  );
  const t0 = resolveBeatGridPhase(onsetsMs, phaseAnchorMs, initialLocalPeriod);
  const minPeriod = rawPeriodHint * PERIOD_HINT_CLAMP_LO;
  const maxPeriod = rawPeriodHint * PERIOD_HINT_CLAMP_HI;
  const nBeats = Math.min(
    maxBeats,
    Math.max(2, Math.floor(gridDurationMs / minPeriod) + 1),
  );
  const bins = 9;
  const half = Math.floor(bins / 2);
  const scoreAt = (
    t: number,
    localPeriod: number,
    beatIdx: number = 0,
  ): number => {
    if (onsetsMs.length === 0) return 0;
    const nearest = nearestOnsetMs(onsetsMs, t);
    const dist = Math.abs(nearest - t);
    const isDownbeat = beatIdx % 4 === 0;
    const win = isDownbeat ? localPeriod * 0.1 : localPeriod * BEAT_SNAP_FRAC;
    if (dist >= win) return 0;
    const relDiff = dist / localPeriod;
    if (relDiff >= 0.25 && relDiff <= 0.78) {
      return 0;
    }
    const phaseOffset = Math.abs((t - t0) % localPeriod);
    const downbeatBonus =
      isDownbeat ||
      phaseOffset <= win ||
      Math.abs(phaseOffset - localPeriod) <= win
        ? 0.5
        : 0;
    const nearestSpike =
      spikeOnsetsMs && spikeOnsetsMs.length > 0
        ? nearestOnsetMs(spikeOnsetsMs, t)
        : -1;
    const isEnergySpike = nearestSpike >= 0 && Math.abs(nearestSpike - t) <= 45;
    const onsetBonus = dist <= 25 ? 5.0 * (1 - dist / 25) : 0;
    const spikeBonus = isEnergySpike ? (isDownbeat ? 36.0 : 8.0) : 0;

    return 1 - dist / win + downbeatBonus + onsetBonus + spikeBonus;
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
        let t = center + ((b - half) / half) * p.localPeriod * BEAT_SNAP_FRAC;
        const nearOnset = nearestOnsetMs(onsetsMs, t);
        if (Math.abs(nearOnset - t) <= p.localPeriod * BEAT_SNAP_FRAC) {
          t = nearOnset;
        }
        candidateTimes.push(t);
      }
      for (const t of candidateTimes) {
        if (t < 0 || t > gridDurationMs + p.localPeriod * 0.1) continue;
        const dt = t - p.t;
        const stepLo = beat < 16 ? 0.9 : STABLE_PERIOD_STEP_LO;
        const stepHi = beat < 16 ? 1.1 : STABLE_PERIOD_STEP_HI;
        if (dt < stableRef * stepLo || dt > stableRef * stepHi) {
          continue;
        }
        const candNearSpike =
          spikeOnsetsMs && spikeOnsetsMs.length > 0
            ? nearestOnsetMs(spikeOnsetsMs, t)
            : -1;
        const isSpikeCand =
          beat % 4 === 0 &&
          candNearSpike >= 0 &&
          Math.abs(candNearSpike - t) <= 30;
        const localStepLo = isSpikeCand ? 0.78 : LOCAL_PERIOD_STEP_LO;
        if (
          dt < p.localPeriod * localStepLo ||
          dt > p.localPeriod * LOCAL_PERIOD_STEP_HI
        ) {
          continue;
        }
        const periodRatio = dt / stableRef;
        const shrinkPen =
          periodRatio < 0.85 ? 12.0 * (0.85 - periodRatio) ** 2 : 0;
        const isTempoShift =
          Math.abs(dt - p.localPeriod) / p.localPeriod >= 0.045 &&
          Math.abs(dt - rawPeriodHint) / rawPeriodHint <= 0.03;
        const resetRecent = isSpikeCand && isTempoShift;
        const nextRecent = resetRecent
          ? [dt, dt, dt, dt]
          : [...p.recentIbis, dt];
        if (!resetRecent && nextRecent.length > LOCAL_PERIOD_IBI_WINDOW) {
          nextRecent.shift();
        }
        const med = medianOfPositive(nextRecent);
        const tempoRef = med > 0 ? med : stableRef;
        const localHint = getPeriodHintAt(t);
        const globalPen = ((dt - localHint) / localHint) ** 2;
        const tempoPen =
          ((dt - p.localPeriod) / p.localPeriod) ** 2 +
          ((dt - tempoRef) / tempoRef) ** 2 * 2.0 +
          globalPen * 1.5 +
          shrinkPen;
        const candNearOnset = nearestOnsetMs(onsetsMs, t);
        const hasOnset = Math.abs(candNearOnset - t) <= 30;
        let newLocal = resetRecent
          ? 0.5 * dt + 0.5 * p.localPeriod
          : hasOnset
            ? 0.25 * rawPeriodHint + 0.5 * med + 0.25 * p.localPeriod
            : 0.75 * p.localPeriod + 0.25 * med;
        newLocal = Math.max(minPeriod, Math.min(maxPeriod, newLocal));
        const s = p.score + scoreAt(t, newLocal, beat) - tempoPen * 2.5;
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

    if (beat <= 3) {
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
          score: c.score.toFixed(4),
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
    if (onsetsMs.length > 0 && Math.abs(nearest - expected) < snapWindow) {
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

export async function buildBeatGridAsync(
  onsetsMs: readonly number[],
  estimatedBpm: number,
  gridDurationMs: number,
  maxBeats: number,
  signal?: AbortSignal,
  phaseAnchorMs: number = 0,
  enableTrace?: boolean,
  outTraceContainer?: { trace?: ViterbiBeatTrace[] },
  spikeOnsetsMs?: readonly number[],
): Promise<number[]> {
  throwIfAborted(signal);
  const sync = buildBeatGrid(
    onsetsMs,
    estimatedBpm,
    gridDurationMs,
    maxBeats,
    phaseAnchorMs,
    undefined,
    enableTrace,
    outTraceContainer,
    spikeOnsetsMs,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  throwIfAborted(signal);
  return sync;
}
