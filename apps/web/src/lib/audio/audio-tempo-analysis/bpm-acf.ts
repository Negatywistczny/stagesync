import {
  ACF_COMPARABLE_METRIC_RATIO,
  ACF_OCTAVE_MATE_REL,
  ACF_OCTAVE_MATE_SCORE_SCALE,
  ACF_SEED_DIST_WEIGHT,
  ACF_SEED_SOFT_RADIUS,
  MAX_BPM,
  MIN_BPM,
} from "./constants.js";
import { medianOfPositive } from "./helpers.js";
import type {
  AcfEstimateResult,
  AcfPeakCandidate,
  WindowedBpmPoint,
} from "./types.js";

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

/**
 * Computes overlapping 15-second window autocorrelation tempo estimates across the onset envelope.
 * Returns a time-varying sequence of local section BPM points.
 */
export function estimateWindowedBpmMap(
  onsetsMs: readonly number[],
  gridDurationMs: number,
  globalBpm: number,
): WindowedBpmPoint[] {
  const windowMs = 15_000;
  const stepMs = 5_000;
  if (!onsetsMs || onsetsMs.length < 4 || !(globalBpm > 0)) {
    return [{ timeMs: 0, bpm: globalBpm > 0 ? globalBpm : 120 }];
  }
  const points: WindowedBpmPoint[] = [];

  for (let center = 7500; center <= gridDurationMs; center += stepMs) {
    const minT = center - windowMs / 2;
    const maxT = center + windowMs / 2;
    const windowOnsets = onsetsMs.filter((t) => t >= minT && t <= maxT);
    let localBpm = globalBpm;

    if (windowOnsets.length >= 8) {
      const ibis: number[] = [];
      for (let i = 1; i < windowOnsets.length; i++) {
        const dt = windowOnsets[i]! - windowOnsets[i - 1]!;
        if (dt >= 350 && dt <= 650) {
          ibis.push(dt);
        } else if (dt >= 180 && dt < 350) {
          ibis.push(dt * 2);
        }
      }
      if (ibis.length >= 3) {
        const medIbi = medianOfPositive(ibis);
        if (medIbi > 0) {
          const calcBpm = 60_000 / medIbi;
          if (calcBpm >= 100 && calcBpm <= 145) {
            localBpm = calcBpm;
          }
        }
      }
    }
    points.push({ timeMs: center, bpm: localBpm });
  }

  return points.length > 0 ? points : [{ timeMs: 0, bpm: globalBpm }];
}

export function estimateBpmFromOnsetStrengthDetailed(
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

  const minLag = Math.max(
    1,
    Math.round(((60 / MAX_BPM) * sampleRate) / hopSize),
  );
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

  console.log(
    "[SMART TEMPO DIAGNOSTICS] Top 5 szczytów ACF (po prior + seed):",
  );
  console.table(
    scored.slice(0, 5).map((c) => ({
      BPM: c.bpm.toFixed(2),
      "Surowy Score": c.score.toFixed(4),
      Metric: c.metric.toFixed(4),
      OctaveMate: c.octaveMate ? "tak" : "nie",
      Lag: c.lag ?? "—",
    })),
  );

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

  console.log(
    `[SMART TEMPO DIAGNOSTICS] estimateBpmFromOnsetStrength -> wybrany peak ACF: ${finalAcfBpm.toFixed(2)} BPM` +
      (seedHint != null && seedHint > 0
        ? ` (seedHint ${seedHint.toFixed(2)})`
        : "") +
      (competitorBpms.length > 0
        ? `; konkurenci porównywalni: ${competitorBpms.map((b) => b.toFixed(2)).join(", ")}`
        : "; brak porównywalnych konkurentów"),
  );
  return { bpm: finalAcfBpm, competitorBpms };
}
