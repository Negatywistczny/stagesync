/**
 * Advanced Reverse Engineering Script 2: optimize-logic-weights.ts
 * Evaluates:
 *   1. Fixed Global Weights vs Dynamic Genre-Adaptive Weights
 *   2. MP3 Padding Auto-Correction (22.9ms LAME delay removal)
 *   3. Viterbi Emission Likelihood vs Raw Peak Snapping
 */

import fs from "node:fs";
import path from "node:path";
import type {
  AdvancedMeasureFeature,
  TrackProfileData,
} from "./extract-logic-features.js";

const SCRATCH_DIR = path.resolve(
  process.cwd(),
  "../../.gemini/antigravity-ide/brain/92cb53a1-e486-4ccf-becb-91eacb83b093/scratch",
);

async function main() {
  console.log(
    "=========================================================================",
  );
  console.log("🧮 ADVANCED PHASE 2: GENRE ADAPTIVITY & MP3 LATENCY EVALUATION");
  console.log(
    "=========================================================================\n",
  );

  const featPath = path.join(SCRATCH_DIR, "logic_advanced_features.json");
  const profPath = path.join(SCRATCH_DIR, "logic_track_profiles.json");

  if (!fs.existsSync(featPath) || !fs.existsSync(profPath)) {
    console.error("❌ Pre-requisite files missing! Run Phase 1 first.");
    process.exit(1);
  }

  const features: AdvancedMeasureFeature[] = JSON.parse(
    fs.readFileSync(featPath, "utf-8"),
  );
  const profiles: Record<string, TrackProfileData> = JSON.parse(
    fs.readFileSync(profPath, "utf-8"),
  );

  console.log(
    `Loaded ${features.length} features across ${Object.keys(profiles).length} tracks.\n`,
  );

  // Experiment 1: Raw Baseline (No padding correction, fixed weights)
  let rawPerfCount = 0,
    rawAcceptCount = 0,
    rawErrSum = 0;

  // Experiment 2: MP3 Padding Corrected (Subtracting 22.9ms encoder delay)
  let padPerfCount = 0,
    padAcceptCount = 0,
    padErrSum = 0;

  // Experiment 3: Adaptive Spectral Weights + Padding Correction
  let adaptPerfCount = 0,
    adaptAcceptCount = 0,
    adaptErrSum = 0;

  const trackBreakdown: Record<string, Record<string, unknown>> = {};

  for (const tName of Object.keys(profiles)) {
    const tFeats = features.filter((f) => f.trackName === tName);
    const prof = profiles[tName]!;

    let tRawPerf = 0,
      tPadPerf = 0,
      tAdaptPerf = 0;
    let tRawErr = 0,
      tPadErr = 0,
      tAdaptErr = 0;

    for (const f of tFeats) {
      // 1. Raw Offset (Best transient offset vs t_Logic)
      const rawOffset = f.fluxPeakOffsetMs;
      const errRaw = Math.abs(rawOffset);
      rawErrSum += errRaw;
      tRawErr += errRaw;
      if (errRaw <= 15) {
        rawPerfCount++;
        tRawPerf++;
      }
      if (errRaw <= 35) rawAcceptCount++;

      // 2. Padding Corrected Offset (Subtract 22.9ms MP3 encoder delay)
      const padOffset = rawOffset - prof.paddingMs;
      const errPad = Math.abs(padOffset);
      padErrSum += errPad;
      tPadErr += errPad;
      if (errPad <= 15) {
        padPerfCount++;
        tPadPerf++;
      }
      if (errPad <= 35) padAcceptCount++;

      // 3. Adaptive Spectral Weight Offset (Dynamic weights derived from track energy profile)
      const w = prof.adaptiveWeights;
      const sSub = w.wSub * f.subBassEnergyAtLogic;
      const sKick = w.wKick * f.kickEnergyAtLogic;
      const sSnare = w.wSnare * f.snareEnergyAtLogic;
      const sFlux = w.wFlux * f.fluxAtLogic;
      const totW = sSub + sKick + sSnare + sFlux + 1e-6;

      const adaptWeightedOffset =
        (sSub * f.subBassPeakOffsetMs +
          sKick * f.kickPeakOffsetMs +
          sSnare * f.snarePeakOffsetMs +
          sFlux * f.fluxPeakOffsetMs) /
        totW;

      const adaptOffset = adaptWeightedOffset - prof.paddingMs;
      const errAdapt = Math.abs(adaptOffset);
      adaptErrSum += errAdapt;
      tAdaptErr += errAdapt;
      if (errAdapt <= 15) {
        adaptPerfCount++;
        tAdaptPerf++;
      }
      if (errAdapt <= 35) adaptAcceptCount++;
    }

    trackBreakdown[tName] = {
      measures: tFeats.length,
      paddingMs: prof.paddingMs,
      rawPerfPct: Math.round((tRawPerf / tFeats.length) * 1000) / 10,
      padCorrectedPerfPct: Math.round((tPadPerf / tFeats.length) * 1000) / 10,
      adaptivePerfPct: Math.round((tAdaptPerf / tFeats.length) * 1000) / 10,
      rawMeanMs: Math.round((tRawErr / tFeats.length) * 10) / 10,
      padMeanMs: Math.round((tPadErr / tFeats.length) * 10) / 10,
      adaptMeanMs: Math.round((tAdaptErr / tFeats.length) * 10) / 10,
    };
  }

  const total = features.length;
  const summaryReport = {
    timestamp: new Date().toISOString(),
    totalMeasures: total,
    rawBaseline: {
      stagePerfectPct: Math.round((rawPerfCount / total) * 1000) / 10,
      stageAcceptablePct: Math.round((rawAcceptCount / total) * 1000) / 10,
      meanErrorMs: Math.round((rawErrSum / total) * 10) / 10,
    },
    paddingCorrected: {
      stagePerfectPct: Math.round((padPerfCount / total) * 1000) / 10,
      stageAcceptablePct: Math.round((padAcceptCount / total) * 1000) / 10,
      meanErrorMs: Math.round((padErrSum / total) * 10) / 10,
    },
    adaptiveSpectralModel: {
      stagePerfectPct: Math.round((adaptPerfCount / total) * 1000) / 10,
      stageAcceptablePct: Math.round((adaptAcceptCount / total) * 1000) / 10,
      meanErrorMs: Math.round((adaptErrSum / total) * 10) / 10,
    },
    perTrack: trackBreakdown,
  };

  const outPath = path.join(
    SCRATCH_DIR,
    "logic_advanced_optimization_report.json",
  );
  fs.writeFileSync(outPath, JSON.stringify(summaryReport, null, 2));

  console.log(
    "=========================================================================",
  );
  console.log(
    "🏆 COMPARATIVE EVALUATION RESULTS (Logic Pro Reverse Engineering)",
  );
  console.log(
    "=========================================================================",
  );
  console.log(
    `1. Raw Baseline (No Latency Correction) : Stage Perfect (<=15ms) = ${summaryReport.rawBaseline.stagePerfectPct}% | Mean = ${summaryReport.rawBaseline.meanErrorMs} ms`,
  );
  console.log(
    `2. MP3 Padding Corrected (22.9ms Auto-Fix): Stage Perfect (<=15ms) = ${summaryReport.paddingCorrected.stagePerfectPct}% | Mean = ${summaryReport.paddingCorrected.meanErrorMs} ms`,
  );
  console.log(
    `3. Adaptive Spectral Weight Model         : Stage Perfect (<=15ms) = ${summaryReport.adaptiveSpectralModel.stagePerfectPct}% | Mean = ${summaryReport.adaptiveSpectralModel.meanErrorMs} ms`,
  );

  console.log("\n📌 PER-TRACK DETAILED COMPARISON:");
  console.log(
    "-------------------------------------------------------------------------",
  );
  for (const [tName, rawB] of Object.entries(trackBreakdown)) {
    const b = rawB as {
      measures: number;
      rawPerfPct: number;
      rawMeanMs: number;
      padCorrectedPerfPct: number;
      padMeanMs: number;
      adaptivePerfPct: number;
      adaptMeanMs: number;
    };
    console.log(`   📌 ${tName} (${b.measures} bars):`);
    console.log(
      `      • Raw Stage Perfect         : ${b.rawPerfPct}% (Mean: ${b.rawMeanMs}ms)`,
    );
    console.log(
      `      • MP3 Padding Corrected     : ${b.padCorrectedPerfPct}% (Mean: ${b.padMeanMs}ms)`,
    );
    console.log(
      `      • Adaptive Spectral Weight  : ${b.adaptivePerfPct}% (Mean: ${b.adaptMeanMs}ms)`,
    );
  }

  console.log(`\nSaved detailed comparative report to: ${outPath}\n`);
}

main().catch(console.error);
