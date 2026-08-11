import {
  BASE_HOP_SIZE,
  MAX_BPM,
  MIN_BPM,
  ONSET_PERIOD_HIST_BIN_MS,
  ONSET_PERIOD_HIST_MIN_COUNT,
  ONSET_SUBDIVISION_RATIO,
  RECONCILE_COMPETITOR_ACF_REL,
  RECONCILE_COMPETITOR_SEED_REL,
  RECONCILE_SEED_REL_TOL,
} from "./constants.js";
import { estimateBpmFromOnsetStrength } from "./bpm-acf.js";
import { nearestOnsetMs } from "./downbeat-detect.js";
import { acfHopSize, effectiveHopSize } from "./helpers.js";
import {
  computeOnsetStrengthEnvelope,
  pickOnsetsFromFlux,
} from "./onset-envelope.js";
import type { AcfEstimateResult } from "./types.js";

export function estimateBpmFromOnsets(onsetsMs: readonly number[]): number {
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
  console.log(
    `[SMART TEMPO DIAGNOSTICS] estimateBpmFromOnsets (IBI) -> Mediana IBI: ${median.toFixed(1)} ms, Wyliczone surowe BPM: ${finalBpm.toFixed(2)}`,
  );
  return finalBpm;
}

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
  const binCount =
    Math.floor((maxPeriod - minPeriod) / ONSET_PERIOD_HIST_BIN_MS) + 1;
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
  console.log(
    `[SMART TEMPO DIAGNOSTICS] estimateBpmFromOnsetPeriodHistogram -> okres ${medianPeriod.toFixed(1)} ms → ${finalBpm.toFixed(2)} BPM (n=${bestCount})`,
  );
  return finalBpm;
}

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
    console.log(
      `[SMART TEMPO DIAGNOSTICS] reconcileEstimatedBpm -> acfBpm: ${estimated?.toFixed(2) ?? "brak"}, seedBpm (sugestia): ${seedBpm ? seedBpm.toFixed(2) : "brak"}, ostateczny wynik: ${fallback.toFixed(2)} (powód: brak ACF → seed/fallback)`,
    );
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

  console.log(
    `[SMART TEMPO DIAGNOSTICS] reconcileEstimatedBpm -> acfBpm: ${estimated.toFixed(2)}, seedBpm (sugestia): ${seedBpm ? seedBpm.toFixed(2) : "brak"}, comps: [${(competingBpms ?? []).map((b) => b.toFixed(2)).join(", ")}], ostateczny wynik: ${finalResult.toFixed(2)} (powód: ${reason})`,
  );
  return finalResult;
}

/**
 * Lightweight BPM from downsampled energy flux + autocorrelation.
 */
export function quickEstimateBpmFromEnergy(
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
  if (
    histBpm >= 55 &&
    histBpm < 80 &&
    doubled >= MIN_BPM &&
    doubled <= MAX_BPM
  ) {
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

export function estimateBpmFromBarHarmonics(
  onsetsMs: readonly number[],
): number {
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
    const startOnsets = strongOnsets
      .filter((t) => t <= (strongOnsets[0] ?? 0) + 12_000)
      .slice(0, 8);

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
        subScore *= 1 + (maxMatchedBar - 20) * 0.05;
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
  console.log(
    `[SMART TEMPO DIAGNOSTICS] barHarmonics best candidate -> bestP: ${bestP.toFixed(1)} ms (${bpm.toFixed(2)} BPM)`,
  );
  return Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)) * 100) / 100;
}

/**
 * Merge ACF / consecutive-IBI / pairwise-histogram evidence into a raw BPM
 * plus competitor list for reconcile. Consecutive IBI that looks like a
 * subdivision of the histogram mode is not treated as the beat tempo.
 */
export function refineRawBpmWithOnsetEvidence(
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
  console.log(
    `[SMART TEMPO DIAGNOSTICS] estimateBpmFromBarHarmonics -> ${barBpm > 0 ? barBpm.toFixed(2) + " BPM" : "brak"}`,
  );
  if (barBpm > 0) {
    if (estimate > 0 && Math.abs(barBpm - estimate) / estimate <= 0.15) {
      competitors.push(barBpm);
    }
  }

  const histRaw = estimateBpmFromOnsetPeriodHistogram(onsetsMs);
  const histBpm = foldHistogramBpmToMusicalOctave(histRaw, estimate, seedBpm);
  if (histRaw > 0 && histBpm > 0 && Math.abs(histBpm - histRaw) >= 0.5) {
    console.log(
      `[SMART TEMPO DIAGNOSTICS] histogram octave fold: ${histRaw.toFixed(2)} → ${histBpm.toFixed(2)} (acf=${estimate.toFixed(2)}, seed=${seedBpm != null && seedBpm > 0 ? seedBpm.toFixed(2) : "brak"})`,
    );
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
  if (
    adjBpm > 0 &&
    estimate > 0 &&
    Math.abs(adjBpm - estimate) / estimate <= 0.05
  ) {
    console.log(
      `[SMART TEMPO DIAGNOSTICS] IBI median refinement: ${estimate.toFixed(2)} → ${adjBpm.toFixed(2)} BPM`,
    );
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
