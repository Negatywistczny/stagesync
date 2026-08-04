/**
 * Diagnostic CLI Script: inspect-logic-onsets.ts
 * Analyzes phase shift (\Delta t) between Logic Pro reference timecodes (t_Logic)
 * and physical audio transient/energy peaks (PCM samples).
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  "apps/web/test/fixtures/smart-tempo-train-data"
);

const SCRATCH_DIR = path.resolve(
  process.cwd(),
  "../../.gemini/antigravity-ide/brain/92cb53a1-e486-4ccf-becb-91eacb83b093/scratch"
);

// Biquad IIR Filter coefficients generator (Direct Form I / II)
function createBandpassFilter(centerFreq: number, q: number, sampleRate: number) {
  const w0 = (2 * Math.PI * centerFreq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;

  // Normalized coefficients
  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  return {
    processSample(x: number): number {
      const y = nb0 * x + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      return y;
    },
    reset() {
      x1 = 0; x2 = 0; y1 = 0; y2 = 0;
    }
  };
}

function parseTimecodeToMs(tc: string): number {
  const parts = tc.trim().split(":");
  if (parts.length >= 3) {
    const hrs = parseInt(parts[0]!, 10) - 1;
    const mins = parseInt(parts[1]!, 10);
    const secs = parseInt(parts[2]!, 10);
    let extraMs = 0;
    if (parts[3]) {
      const val = parseFloat(parts[3]);
      extraMs = (val / 25) * 1000;
    }
    return (hrs * 3600 + mins * 60 + secs) * 1000 + extraMs;
  }
  return 0;
}

function parseRtfReference(rtfPath: string) {
  const content = fs.readFileSync(rtfPath, "utf-8");
  const lines = content.split("\n");
  const points: { bar: number; bpm: number; timecodeMs: number }[] = [];

  for (const line of lines) {
    const cleanLine = line.replace(/\\$/g, "").trim();
    const parts = cleanLine
      .split("\t")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const firstCol = parts[0]!;
      const barMatch = firstCol.match(/^(\d+)/);
      if (barMatch) {
        const barNum = parseInt(barMatch[1]!, 10);
        const bpmStr = parts[1]!.replace(",", ".");
        const bpmVal = parseFloat(bpmStr);
        const tc = parts[2] ?? "";
        const timecodeMs = tc ? parseTimecodeToMs(tc) : 0;
        if (!isNaN(barNum) && !isNaN(bpmVal) && bpmVal > 40 && bpmVal < 250) {
          points.push({ bar: barNum, bpm: bpmVal, timecodeMs });
        }
      }
    }
  }
  return points;
}

function loadAudioSamples(mp3Path: string): { samples: Float32Array; sampleRate: number } {
  const tmpWav = path.join(
    process.cwd(),
    `node_modules/.cache/temp_inspect_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`
  );
  fs.mkdirSync(path.dirname(tmpWav), { recursive: true });
  try {
    execSync(`afconvert -f WAVE -d LEF32@44100 -c 1 "${mp3Path}" "${tmpWav}"`, { stdio: "ignore" });
  } catch {
    execSync(`ffmpeg -y -i "${mp3Path}" -ar 44100 -ac 1 -f f32le "${tmpWav}"`, { stdio: "ignore" });
  }
  const buf = fs.readFileSync(tmpWav);
  try {
    fs.unlinkSync(tmpWav);
  } catch {
    // ignore
  }

  const headerOffset = buf.toString("ascii", 0, 4) === "RIFF" ? 44 : 0;
  const dataBuf = buf.subarray(headerOffset);
  const floatData = new Float32Array(
    dataBuf.buffer,
    dataBuf.byteOffset,
    Math.floor(dataBuf.byteLength / 4)
  );

  return { samples: floatData, sampleRate: 44100 };
}

type InspectionResult = {
  trackName: string;
  bar: number;
  tLogicMs: number;
  lowPeakMs: number;
  midPeakMs: number;
  fluxPeakMs: number;
  deltaLowMs: number;
  deltaMidMs: number;
  deltaFluxMs: number;
  bestDeltaMs: number;
};

async function main() {
  console.log("=========================================================================");
  console.log("🔍 INSPECT LOGIC ONSETS — Phase Shift & Transient Analysis Probe");
  console.log("=========================================================================\n");

  const files = fs.readdirSync(FIXTURES_DIR);
  const rtfFiles = files.filter((f) => f.endsWith(".rtf")).sort();

  const allInspectionResults: InspectionResult[] = [];
  const trackSummaries: Record<string, any> = {};

  for (const rtfFile of rtfFiles) {
    const baseName = rtfFile.replace(/\.rtf$/, "");
    const mp3File = files.find(
      (f) =>
        f.endsWith(".mp3") &&
        f.toLowerCase().includes(baseName.toLowerCase().slice(0, 8))
    );
    if (!mp3File) continue;

    console.log(`🎵 Processing Track: ${baseName}...`);
    const rtfPath = path.join(FIXTURES_DIR, rtfFile);
    const mp3Path = path.join(FIXTURES_DIR, mp3File);

    const refPoints = parseRtfReference(rtfPath);
    const { samples, sampleRate } = loadAudioSamples(mp3Path);

    // Pre-filter entire audio signal into Low (20-150Hz) and Mid (1-4kHz)
    const lowFilter = createBandpassFilter(85, 1.2, sampleRate);
    const midFilter = createBandpassFilter(2500, 1.0, sampleRate);

    const lowFiltered = new Float32Array(samples.length);
    const midFiltered = new Float32Array(samples.length);

    for (let i = 0; i < samples.length; i++) {
      lowFiltered[i] = Math.abs(lowFilter.processSample(samples[i]!));
      midFiltered[i] = Math.abs(midFilter.processSample(samples[i]!));
    }

    // Compute Spectral Flux (diff of envelope over 1ms windows = ~44 samples)
    const hopSize = 44; // ~1 ms
    const envLength = Math.floor(samples.length / hopSize);
    const lowEnv = new Float32Array(envLength);
    const midEnv = new Float32Array(envLength);
    const fluxEnv = new Float32Array(envLength);

    for (let h = 0; h < envLength; h++) {
      let lSum = 0;
      let mSum = 0;
      const start = h * hopSize;
      for (let s = 0; s < hopSize; s++) {
        const idx = start + s;
        if (idx < samples.length) {
          lSum += lowFiltered[idx]!;
          mSum += midFiltered[idx]!;
        }
      }
      lowEnv[h] = lSum / hopSize;
      midEnv[h] = mSum / hopSize;
      if (h > 0) {
        const dL = Math.max(0, lowEnv[h]! - lowEnv[h - 1]!);
        const dM = Math.max(0, midEnv[h]! - midEnv[h - 1]!);
        fluxEnv[h] = dL * 1.5 + dM; // weighted spectral flux onset strength
      }
    }

    const trackDeltasLow: number[] = [];
    const trackDeltasMid: number[] = [];
    const trackDeltasFlux: number[] = [];
    const trackDeltasBest: number[] = [];

    const windowMs = 80; // +/- 80 ms search window
    const windowSamples = Math.round((windowMs / 1000) * sampleRate);

    for (const pt of refPoints) {
      const tLogicMs = pt.timecodeMs;
      const centerSample = Math.round((tLogicMs / 1000) * sampleRate);

      const startSample = Math.max(0, centerSample - windowSamples);
      const endSample = Math.min(samples.length - 1, centerSample + windowSamples);

      if (startSample >= endSample) continue;

      // Find Low Band Peak (Kick)
      let maxLowVal = -1;
      let maxLowSample = centerSample;
      for (let s = startSample; s <= endSample; s++) {
        if (lowFiltered[s]! > maxLowVal) {
          maxLowVal = lowFiltered[s]!;
          maxLowSample = s;
        }
      }

      // Find Mid Band Peak (Snare/Hat)
      let maxMidVal = -1;
      let maxMidSample = centerSample;
      for (let s = startSample; s <= endSample; s++) {
        if (midFiltered[s]! > maxMidVal) {
          maxMidVal = midFiltered[s]!;
          maxMidSample = s;
        }
      }

      // Find Flux Peak (Transient attack)
      const startHop = Math.max(0, Math.floor(startSample / hopSize));
      const endHop = Math.min(envLength - 1, Math.floor(endSample / hopSize));
      let maxFluxVal = -1;
      let maxFluxHop = Math.floor(centerSample / hopSize);
      for (let h = startHop; h <= endHop; h++) {
        if (fluxEnv[h]! > maxFluxVal) {
          maxFluxVal = fluxEnv[h]!;
          maxFluxHop = h;
        }
      }
      const maxFluxSample = maxFluxHop * hopSize;

      const lowPeakMs = (maxLowSample / sampleRate) * 1000;
      const midPeakMs = (maxMidSample / sampleRate) * 1000;
      const fluxPeakMs = (maxFluxSample / sampleRate) * 1000;

      // Delta t = t_Logic - t_transient_max (positive = Logic is later than transient)
      const deltaLowMs = Math.round((tLogicMs - lowPeakMs) * 10) / 10;
      const deltaMidMs = Math.round((tLogicMs - midPeakMs) * 10) / 10;
      const deltaFluxMs = Math.round((tLogicMs - fluxPeakMs) * 10) / 10;

      // Best delta is closest transient (Low or Flux)
      const bestTransientMs = Math.abs(deltaLowMs) <= Math.abs(deltaFluxMs) ? lowPeakMs : fluxPeakMs;
      const bestDeltaMs = Math.round((tLogicMs - bestTransientMs) * 10) / 10;

      trackDeltasLow.push(deltaLowMs);
      trackDeltasMid.push(deltaMidMs);
      trackDeltasFlux.push(deltaFluxMs);
      trackDeltasBest.push(bestDeltaMs);

      allInspectionResults.push({
        trackName: baseName,
        bar: pt.bar,
        tLogicMs: Math.round(tLogicMs * 10) / 10,
        lowPeakMs: Math.round(lowPeakMs * 10) / 10,
        midPeakMs: Math.round(midPeakMs * 10) / 10,
        fluxPeakMs: Math.round(fluxPeakMs * 10) / 10,
        deltaLowMs,
        deltaMidMs,
        deltaFluxMs,
        bestDeltaMs,
      });
    }

    // Helper statistics computation
    const calcStats = (arr: number[]) => {
      if (arr.length === 0) return { mean: 0, std: 0, min: 0, max: 0 };
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
      const std = Math.sqrt(variance);
      const absArr = arr.map(x => Math.abs(x)).sort((a, b) => a - b);
      return {
        mean: Math.round(mean * 10) / 10,
        std: Math.round(std * 10) / 10,
        p50Abs: Math.round(absArr[Math.floor(arr.length * 0.5)]! * 10) / 10,
        p95Abs: Math.round(absArr[Math.floor(arr.length * 0.95)]! * 10) / 10,
        within5msPct: Math.round((arr.filter(x => Math.abs(x) <= 5).length / arr.length) * 1000) / 10,
        within10msPct: Math.round((arr.filter(x => Math.abs(x) <= 10).length / arr.length) * 1000) / 10,
        within15msPct: Math.round((arr.filter(x => Math.abs(x) <= 15).length / arr.length) * 1000) / 10,
        within30msPct: Math.round((arr.filter(x => Math.abs(x) <= 30).length / arr.length) * 1000) / 10,
      };
    };

    trackSummaries[baseName] = {
      measures: refPoints.length,
      lowBand: calcStats(trackDeltasLow),
      midBand: calcStats(trackDeltasMid),
      fluxBand: calcStats(trackDeltasFlux),
      bestBand: calcStats(trackDeltasBest),
    };
  }

  // Global aggregate statistics
  const allBestDeltas = allInspectionResults.map((r) => r.bestDeltaMs);
  const allLowDeltas = allInspectionResults.map((r) => r.deltaLowMs);
  const allFluxDeltas = allInspectionResults.map((r) => r.deltaFluxMs);

  const calcGlobalStats = (arr: number[]) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length);
    const absSorted = arr.map(x => Math.abs(x)).sort((a, b) => a - b);
    return {
      total: arr.length,
      meanMs: Math.round(mean * 10) / 10,
      stdMs: Math.round(std * 10) / 10,
      medianAbsMs: Math.round(absSorted[Math.floor(arr.length * 0.5)]! * 10) / 10,
      p95AbsMs: Math.round(absSorted[Math.floor(arr.length * 0.95)]! * 10) / 10,
      within5msPct: Math.round((arr.filter(x => Math.abs(x) <= 5).length / arr.length) * 1000) / 10,
      within10msPct: Math.round((arr.filter(x => Math.abs(x) <= 10).length / arr.length) * 1000) / 10,
      within15msPct: Math.round((arr.filter(x => Math.abs(x) <= 15).length / arr.length) * 1000) / 10,
      within30msPct: Math.round((arr.filter(x => Math.abs(x) <= 30).length / arr.length) * 1000) / 10,
      greater30msPct: Math.round((arr.filter(x => Math.abs(x) > 30).length / arr.length) * 1000) / 10,
    };
  };

  const globalReport = {
    timestamp: new Date().toISOString(),
    totalMeasures: allInspectionResults.length,
    globalStats: {
      lowBandKick: calcGlobalStats(allLowDeltas),
      spectralFlux: calcGlobalStats(allFluxDeltas),
      bestTransient: calcGlobalStats(allBestDeltas),
    },
    perTrack: trackSummaries,
    details: allInspectionResults,
  };

  // Ensure scratch dir exists and save report
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outPath = path.join(SCRATCH_DIR, "logic_onset_inspection_report.json");
  fs.writeFileSync(outPath, JSON.stringify(globalReport, null, 2));

  // Console output
  console.log("\n=========================================================================");
  console.log("📊 INSPEXION REPORT SUMMARY (349 Logic Pro Measures vs Audio PCM)");
  console.log("=========================================================================");
  console.log(`Saved full detailed analysis to: ${outPath}\n`);

  console.log("🌐 GLOBAL PHASE SHIFT SUMMARY (Δt = t_Logic - t_transient):");
  console.log("-------------------------------------------------------------------------");
  console.log(`  • Low Band (20-150Hz Kick)  : Mean Δt = ${globalReport.globalStats.lowBandKick.meanMs} ms | σ = ${globalReport.globalStats.lowBandKick.stdMs} ms | Median |Δt| = ${globalReport.globalStats.lowBandKick.medianAbsMs} ms`);
  console.log(`  • Spectral Flux (Attack)    : Mean Δt = ${globalReport.globalStats.spectralFlux.meanMs} ms | σ = ${globalReport.globalStats.spectralFlux.stdMs} ms | Median |Δt| = ${globalReport.globalStats.spectralFlux.medianAbsMs} ms`);
  console.log(`  • Best Combined Transient   : Mean Δt = ${globalReport.globalStats.bestTransient.meanMs} ms | σ = ${globalReport.globalStats.bestTransient.stdMs} ms | Median |Δt| = ${globalReport.globalStats.bestTransient.medianAbsMs} ms`);

  console.log("\n🎯 PROXIMITY DISTRIBUTION TO LOGIC PRO MARKERS (Best Transient):");
  console.log("-------------------------------------------------------------------------");
  console.log(`  🟢 ≤ 5 ms   (Exact Peak Lock)   : ${globalReport.globalStats.bestTransient.within5msPct}%`);
  console.log(`  🟢 ≤ 10 ms  (Stage Tight)       : ${globalReport.globalStats.bestTransient.within10msPct}%`);
  console.log(`  🟡 ≤ 15 ms  (Stage-Ready Limit) : ${globalReport.globalStats.bestTransient.within15msPct}%`);
  console.log(`  🟡 ≤ 30 ms  (Micro-Rubato Zone) : ${globalReport.globalStats.bestTransient.within30msPct}%`);
  console.log(`  🔴 > 30 ms  (Large Phase Shift) : ${globalReport.globalStats.bestTransient.greater30msPct}%`);

  console.log("\n🎵 PER-TRACK DETAILED BREAKDOWN:");
  console.log("-------------------------------------------------------------------------");
  for (const [trackName, summary] of Object.entries(trackSummaries)) {
    console.log(`\n📌 ${trackName} (${summary.measures} bars):`);
    console.log(`   Low-Band Kick  : Mean Δt = ${summary.lowBand.mean}ms (σ=${summary.lowBand.std}ms) | ≤15ms: ${summary.lowBand.within15msPct}%`);
    console.log(`   Spectral Flux  : Mean Δt = ${summary.fluxBand.mean}ms (σ=${summary.fluxBand.std}ms) | ≤15ms: ${summary.fluxBand.within15msPct}%`);
    console.log(`   Best Transient : Mean Δt = ${summary.bestBand.mean}ms (σ=${summary.bestBand.std}ms) | ≤15ms: ${summary.bestBand.within15msPct}%`);
  }

  console.log("\n=========================================================================");
}

main().catch(console.error);
