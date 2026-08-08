/**
 * Advanced Reverse Engineering Script 1: extract-logic-features.ts
 * Adaptive Spectral Normalization, MP3 Encoder Padding Auto-Detection,
 * and Multi-Band Energy Envelope Extraction around Logic Pro ground-truth points.
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

// Biquad IIR Bandpass Filter
function createBandpassFilter(centerFreq: number, q: number, sampleRate: number) {
  const w0 = (2 * Math.PI * centerFreq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;

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
    `node_modules/.cache/temp_feat_adv_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`
  );
  fs.mkdirSync(path.dirname(tmpWav), { recursive: true });
  try {
    execSync(`afconvert -f WAVE -d LEF32@44100 -c 1 "${mp3Path}" "${tmpWav}"`, { stdio: "ignore" });
  } catch {
    execSync(`ffmpeg -y -i "${mp3Path}" -ar 44100 -ac 1 -f f32le "${tmpWav}"`, { stdio: "ignore" });
  }
  const buf = fs.readFileSync(tmpWav);
  try { fs.unlinkSync(tmpWav); } catch {
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

// Detect MP3 initial silence padding delay t_pad (samples < -40dB)
function detectMp3SilencePaddingMs(samples: Float32Array, sampleRate: number): number {
  const threshold = 0.01; // -40dB threshold
  for (let i = 0; i < Math.min(samples.length, sampleRate * 5); i++) {
    if (Math.abs(samples[i]!) >= threshold) {
      return Math.round((i / sampleRate) * 1000 * 10) / 10;
    }
  }
  return 0;
}

export type TrackProfileData = {
  trackName: string;
  paddingMs: number;
  avgSubEnergy: number;
  avgKickEnergy: number;
  avgSnareEnergy: number;
  avgFluxEnergy: number;
  adaptiveWeights: {
    wSub: number;
    wKick: number;
    wSnare: number;
    wFlux: number;
  };
};

export type AdvancedMeasureFeature = {
  trackName: string;
  bar: number;
  tLogicMs: number;
  tLogicPadCorrectedMs: number;
  bpm: number;
  subBassPeakOffsetMs: number;
  kickPeakOffsetMs: number;
  snarePeakOffsetMs: number;
  fluxPeakOffsetMs: number;
  subBassEnergyAtLogic: number;
  kickEnergyAtLogic: number;
  snareEnergyAtLogic: number;
  fluxAtLogic: number;
};

async function main() {
  console.log("=========================================================================");
  console.log("🔍 ADVANCED REVERSE ENGINEERING (Adaptive Spectral Normalization & HMM)");
  console.log("=========================================================================\n");

  const files = fs.readdirSync(FIXTURES_DIR);
  const rtfFiles = files.filter((f) => f.endsWith(".rtf")).sort();

  const allFeatures: AdvancedMeasureFeature[] = [];
  const trackProfiles: Record<string, TrackProfileData> = {};

  for (const rtfFile of rtfFiles) {
    const baseName = rtfFile.replace(/\.rtf$/, "");
    const mp3File = files.find(
      (f) => f.endsWith(".mp3") && f.toLowerCase().includes(baseName.toLowerCase().slice(0, 8))
    );
    if (!mp3File) continue;

    console.log(`🎵 Processing Track Profile: ${baseName}...`);
    const points = parseRtfReference(path.join(FIXTURES_DIR, rtfFile));
    const { samples, sampleRate } = loadAudioSamples(path.join(FIXTURES_DIR, mp3File));

    const paddingMs = detectMp3SilencePaddingMs(samples, sampleRate);

    // Filters
    const subFilter = createBandpassFilter(45, 1.2, sampleRate);
    const kickFilter = createBandpassFilter(110, 1.2, sampleRate);
    const snareFilter = createBandpassFilter(1800, 1.0, sampleRate);

    const subFiltered = new Float32Array(samples.length);
    const kickFiltered = new Float32Array(samples.length);
    const snareFiltered = new Float32Array(samples.length);

    let subSum = 0, kickSum = 0, snareSum = 0;
    for (let i = 0; i < samples.length; i++) {
      subFiltered[i] = Math.abs(subFilter.processSample(samples[i]!));
      kickFiltered[i] = Math.abs(kickFilter.processSample(samples[i]!));
      snareFiltered[i] = Math.abs(snareFilter.processSample(samples[i]!));
      subSum += subFiltered[i]!;
      kickSum += kickFiltered[i]!;
      snareSum += snareFiltered[i]!;
    }

    const avgSub = subSum / samples.length;
    const avgKick = kickSum / samples.length;
    const avgSnare = snareSum / samples.length;

    // Hop size ~1ms
    const hopSize = 44;
    const envLen = Math.floor(samples.length / hopSize);
    const fluxEnv = new Float32Array(envLen);
    let fluxSum = 0;

    for (let h = 1; h < envLen; h++) {
      const idx = h * hopSize;
      const prevIdx = (h - 1) * hopSize;
      const dK = Math.max(0, kickFiltered[idx]! - kickFiltered[prevIdx]!);
      const dS = Math.max(0, snareFiltered[idx]! - snareFiltered[prevIdx]!);
      fluxEnv[h] = dK * 1.5 + dS;
      fluxSum += fluxEnv[h]!;
    }
    const avgFlux = fluxSum / envLen;

    // Adaptive Spectral Normalization Weights
    const totalEnergy = avgSub + avgKick + avgSnare + avgFlux + 1e-6;
    const adaptiveWeights = {
      wSub: Math.round((avgSub / totalEnergy) * 100) / 100,
      wKick: Math.round((avgKick / totalEnergy) * 100) / 100,
      wSnare: Math.round((avgSnare / totalEnergy) * 100) / 100,
      wFlux: Math.round((avgFlux / totalEnergy) * 100) / 100,
    };

    trackProfiles[baseName] = {
      trackName: baseName,
      paddingMs,
      avgSubEnergy: Math.round(avgSub * 1000) / 1000,
      avgKickEnergy: Math.round(avgKick * 1000) / 1000,
      avgSnareEnergy: Math.round(avgSnare * 1000) / 1000,
      avgFluxEnergy: Math.round(avgFlux * 1000) / 1000,
      adaptiveWeights,
    };

    console.log(`   Padding: ${paddingMs} ms | Spectral Weights: Sub=${adaptiveWeights.wSub}, Kick=${adaptiveWeights.wKick}, Snare=${adaptiveWeights.wSnare}, Flux=${adaptiveWeights.wFlux}`);

    const windowMs = 100;
    const windowSamples = Math.round((windowMs / 1000) * sampleRate);

    for (const pt of points) {
      const tLogicMs = pt.timecodeMs;
      const tLogicPadCorrectedMs = Math.max(0, tLogicMs - paddingMs);
      const centerSample = Math.round((tLogicMs / 1000) * sampleRate);

      const startSample = Math.max(0, centerSample - windowSamples);
      const endSample = Math.min(samples.length - 1, centerSample + windowSamples);

      if (startSample >= endSample) continue;

      const findPeak = (arr: Float32Array) => {
        let maxV = -1;
        let maxIdx = centerSample;
        for (let s = startSample; s <= endSample; s++) {
          if (arr[s]! > maxV) {
            maxV = arr[s]!;
            maxIdx = s;
          }
        }
        return { maxV, offsetMs: Math.round(((maxIdx - centerSample) / sampleRate) * 1000 * 10) / 10 };
      };

      const subRes = findPeak(subFiltered);
      const kickRes = findPeak(kickFiltered);
      const snareRes = findPeak(snareFiltered);

      const startHop = Math.max(0, Math.floor(startSample / hopSize));
      const endHop = Math.min(envLen - 1, Math.floor(endSample / hopSize));
      let maxFlux = -1;
      let maxFluxHop = Math.floor(centerSample / hopSize);
      for (let h = startHop; h <= endHop; h++) {
        if (fluxEnv[h]! > maxFlux) {
          maxFlux = fluxEnv[h]!;
          maxFluxHop = h;
        }
      }
      const fluxOffsetMs = Math.round(((maxFluxHop * hopSize - centerSample) / sampleRate) * 1000 * 10) / 10;

      allFeatures.push({
        trackName: baseName,
        bar: pt.bar,
        tLogicMs: Math.round(tLogicMs * 10) / 10,
        tLogicPadCorrectedMs: Math.round(tLogicPadCorrectedMs * 10) / 10,
        bpm: pt.bpm,
        subBassPeakOffsetMs: subRes.offsetMs,
        kickPeakOffsetMs: kickRes.offsetMs,
        snarePeakOffsetMs: snareRes.offsetMs,
        fluxPeakOffsetMs: fluxOffsetMs,
        subBassEnergyAtLogic: Math.round(subRes.maxV * 1000) / 1000,
        kickEnergyAtLogic: Math.round(kickRes.maxV * 1000) / 1000,
        snareEnergyAtLogic: Math.round(snareRes.maxV * 1000) / 1000,
        fluxAtLogic: Math.round(maxFlux * 1000) / 1000,
      });
    }
  }

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const outPathFeats = path.join(SCRATCH_DIR, "logic_advanced_features.json");
  const outPathProfiles = path.join(SCRATCH_DIR, "logic_track_profiles.json");

  fs.writeFileSync(outPathFeats, JSON.stringify(allFeatures, null, 2));
  fs.writeFileSync(outPathProfiles, JSON.stringify(trackProfiles, null, 2));

  console.log("\n=========================================================================");
  console.log(`✅ Phase 1 Advanced Complete! Processed ${allFeatures.length} measure points.`);
  console.log(`Saved features to: ${outPathFeats}`);
  console.log(`Saved profiles to: ${outPathProfiles}\n`);
}

main().catch(console.error);
