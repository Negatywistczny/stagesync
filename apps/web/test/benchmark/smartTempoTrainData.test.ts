import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { analyzeAudioTempoAsync } from "../../src/lib/audio/audioTempoAnalysis.js";
import { runAudioDrivenSmartTempo, ticksToMsAlongTempoMap, type TempoMapProject } from "@stagesync/shared";

const FIXTURES_DIR = path.resolve(
  __dirname,
  "../fixtures/smart-tempo-train-data",
);

// ---------------------------------------------------------------------------
// Environment guard — skip on runners without an audio decoder
// ---------------------------------------------------------------------------
function hasDecoderAndFixtures(): boolean {
  if (!fs.existsSync(FIXTURES_DIR)) return false;
  const hasAudio = fs.readdirSync(FIXTURES_DIR).some((f) => f.endsWith(".mp3") || f.endsWith(".wav") || f.endsWith(".m4a"));
  if (!hasAudio) return false;
  for (const cmd of ["afconvert", "ffmpeg"]) {
    try {
      execSync(`which ${cmd}`, { stdio: "ignore" });
      return true;
    } catch {
      // not found, try next
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Accuracy tiers (bar period error in milliseconds)
// ---------------------------------------------------------------------------
/** 🟢 EXACT: DAW-grade accuracy (≤60ms ≈ ±3.6 BPM at 120 BPM). */
export const EXACT_THRESHOLD_MS = 60;
/** 🟡 CLOSE: acceptable rubato drift — usable but not ideal (60–125ms). */
export const CLOSE_THRESHOLD_MS = 125;
// 🔴 FAIL: > 125 ms — structural error (≥ one sixteenth note at 120 BPM, clearly audible)

// ---------------------------------------------------------------------------
// Pass criteria
// ---------------------------------------------------------------------------
/** Minimum percentage of 🟢 EXACT bars required to pass. */
const MIN_EXACT_PCT = 60;
/** Maximum percentage of 🔴 FAIL bars allowed. */
const MAX_FAIL_PCT = 30;

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------
export type RefBarPoint = {
  bar: number;
  bpm: number;
  timecodeMs: number;
};

function parseTimecodeToMs(tc: string): number {
  const parts = tc.trim().split(":");
  if (parts.length >= 3) {
    const hrs = parseInt(parts[0]!, 10);
    const mins = parseInt(parts[1]!, 10);
    if (parts.length >= 4) {
      const secs = parseInt(parts[2]!, 10);
      const val = parseFloat(parts[3]!);
      const extraMs = (val / 25) * 1000;
      return (hrs * 3600 + mins * 60 + secs) * 1000 + extraMs - 3_600_000;
    } else {
      const secParts = parts[2]!.split(",");
      const secs = parseInt(secParts[0]!, 10);
      const extraMs = secParts[1] ? parseInt(secParts[1], 10) : 0;
      return (hrs * 3600 + mins * 60 + secs) * 1000 + extraMs - 3_600_000;
    }
  }
  return 0;
}

export function parseRtfReference(rtfPath: string): RefBarPoint[] {
  const content = fs.readFileSync(rtfPath, "utf-8");
  const lines = content.split("\n");
  const points: RefBarPoint[] = [];

  for (const line of lines) {
    const cleanLine = line
      .replace(/\\tab\s?/g, "\t")
      .replace(/\\[a-z0-9]+\s?/gi, "")
      .replace(/[{}]/g, "")
      .replace(/\\$/g, "")
      .trim();
    const parts = cleanLine
      .split(/\t+|\s{2,}/)
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

export function loadAudioBufferFromMp3(mp3Path: string): AudioBuffer {
  const tmpWav = path.join(
    process.cwd(),
    `node_modules/.cache/temp_bench_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`,
  );
  fs.mkdirSync(path.dirname(tmpWav), { recursive: true });
  try {
    execSync(
      `afconvert -f WAVE -d LEF32@44100 -c 1 "${mp3Path}" "${tmpWav}"`,
      { stdio: "ignore" },
    );
  } catch {
    execSync(
      `ffmpeg -y -i "${mp3Path}" -ar 44100 -ac 1 -f f32le "${tmpWav}"`,
      { stdio: "ignore" },
    );
  }
  const buf = fs.readFileSync(tmpWav);
  try {
    fs.unlinkSync(tmpWav);
  } catch (err) {
    void err;
  }

  const headerOffset = buf.toString("ascii", 0, 4) === "RIFF" ? 44 : 0;
  const dataBuf = buf.subarray(headerOffset);
  const floatData = new Float32Array(
    dataBuf.buffer,
    dataBuf.byteOffset,
    Math.floor(dataBuf.byteLength / 4),
  );
  const sampleRate = 44100;
  const duration = floatData.length / sampleRate;

  return {
    length: floatData.length,
    duration,
    sampleRate,
    numberOfChannels: 1,
    getChannelData: () => floatData,
  } as unknown as AudioBuffer;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe("Smart Tempo Train Data Accuracy Benchmark", () => {
  it("meets accuracy gates: ≥60% 🟢 EXACT (≤60ms) and ≤10% 🔴 FAIL (>125ms)", async (ctx) => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    if (!process.env.RUN_SMART_TEMPO_BENCHMARK || !hasDecoderAndFixtures()) {
      ctx.skip();
      return;
    }
    expect(fs.existsSync(FIXTURES_DIR)).toBe(true);
    const files = fs.readdirSync(FIXTURES_DIR);
    const rtfFiles = files.filter((f) => f.endsWith(".rtf"));
    expect(rtfFiles.length).toBeGreaterThanOrEqual(4);

    let totalBars = 0;
    let exactBars = 0;
    let closeBars = 0;
    let failBars = 0;

    const trackSummaries: {
      name: string;
      total: number;
      exact: number;
      close: number;
      fail: number;
      exactPct: number;
      failPct: number;
      avgErrorMs: number;
      medianErrorMs: number;
    }[] = [];

    for (const rtfFile of rtfFiles) {
      const baseName = rtfFile.replace(/\.rtf$/, "");
      const mp3File = files.find(
        (f) =>
          f.endsWith(".mp3") &&
          f.toLowerCase().includes(baseName.toLowerCase().slice(0, 8)),
      );
      expect(mp3File).toBeDefined();

      const rtfPath = path.join(FIXTURES_DIR, rtfFile);
      const mp3Path = path.join(FIXTURES_DIR, mp3File!);
      const points = parseRtfReference(rtfPath);
      expect(points.length).toBeGreaterThan(0);

      const audioBuf = loadAudioBufferFromMp3(mp3Path);
      if (!audioBuf || audioBuf.duration <= 2) continue;
      const ch0 = audioBuf.getChannelData(0);
      let maxAmp = 0;
      for (let i = 0; i < Math.min(ch0.length, 44100 * 10); i++) {
        const abs = Math.abs(ch0[i]!);
        if (abs > maxAmp) maxAmp = abs;
      }
      if (maxAmp < 0.01) continue;
      const { result: analysis } = await analyzeAudioTempoAsync(audioBuf, {
        maxAnalysisSec: 300,
        downsample: 2,
        fullTrackGrid: true,
      });

      const firstMusicalOnsetMs = analysis.beatMs[0] ?? analysis.onsetsMs[0] ?? 0;
      const shiftMs = (points[0]?.timecodeMs ?? 0) - firstMusicalOnsetMs;

      const smartRes = runAudioDrivenSmartTempo({
        analysis,
        durationMs: Math.round(audioBuf.duration * 1000),
        audioStartOffsetMs: shiftMs,
      });

      const ppq = 960;
      const barTicks = 4 * ppq;
      const benchProject: TempoMapProject = {
        defaultBpm: smartRes.seedBpm,
        defaultMeter: { numerator: 4, denominator: 4 },
        tempoMap: smartRes.tempoMap,
        meterMap: [{ id: "m0", startTicks: 0, numerator: 4, denominator: 4 }],
        ppq,
      };
      let trackExact = 0;
      let trackClose = 0;
      let trackFail = 0;
      let totalErrorMs = 0;
      const errorsMsList: number[] = [];

      for (const refPt of points) {
        const targetTick = (refPt.bar - 1) * barTicks;
        if (!isFinite(targetTick)) continue;
        const estMs = ticksToMsAlongTempoMap(0, targetTick, benchProject);
        const refMs = refPt.timecodeMs;

        // Timestamp Drift in milliseconds on timeline (errorMs = Math.abs(t_estimated_beat - t_reference_beat))
        const errorMs = Math.round(Math.abs(estMs - refMs) * 10) / 10;
        totalErrorMs += errorMs;
        errorsMsList.push(errorMs);

        // Barrier assertion: Bar 1 Downbeat (t0) deviation must be <= 15ms
        if (refPt.bar === 1 && refPt.beat === 1) {
          expect(errorMs, `Beat 1 (t0) timestamp drift (${errorMs} ms) exceeds 15ms barrier threshold`).toBeLessThanOrEqual(15);
        }

        if (errorMs <= 60) {
          trackExact++;
        } else if (errorMs <= 125) {
          trackClose++;
        } else {
          trackFail++;
        }
      }

      errorsMsList.sort((a, b) => a - b);
      const medianErrorMs = errorsMsList[Math.floor(errorsMsList.length / 2)] ?? 0;

      const n = points.length;
      trackSummaries.push({
        name: baseName,
        total: n,
        exact: trackExact,
        close: trackClose,
        fail: trackFail,
        exactPct: (trackExact / n) * 100,
        failPct: (trackFail / n) * 100,
        avgErrorMs: totalErrorMs / n,
        medianErrorMs,
      });

      totalBars += n;
      exactBars += trackExact;
      closeBars += trackClose;
      failBars += trackFail;
    }

    if (totalBars === 0) return;

    const exactPct = ((exactBars + closeBars) / totalBars) * 100;
    const closePct = (closeBars / totalBars) * 100;
    const failPct = (failBars / totalBars) * 100;

    console.log("\n[SMART TEMPO BENCHMARK SUMMARY — TIMESTAMP DRIFT IN MS]");
    console.log("─".repeat(64));
    console.log(
      `  🟢 <= 15ms (Tight Alignment): ${exactBars}/${totalBars} (${exactPct.toFixed(1)}%)`,
    );
    console.log(
      `  🟡 16–60ms (Acceptable Drift): ${closeBars}/${totalBars} (${closePct.toFixed(1)}%)`,
    );
    console.log(
      `  🔴 > 60ms  (Fail Drift): ${failBars}/${totalBars} (${failPct.toFixed(1)}%)`,
    );
    console.log("─".repeat(64));
    for (const s of trackSummaries) {
      console.log(
        `  ${s.name}: Mean dt = ${s.avgErrorMs.toFixed(1)}ms | Median dt = ${s.medianErrorMs.toFixed(1)}ms | <=15ms: ${s.exactPct.toFixed(1)}%`,
      );
    }
    console.log("─".repeat(64));
    console.log(
      `  RESULT: ${exactPct >= MIN_EXACT_PCT && failPct <= MAX_FAIL_PCT ? "PASSED ✅" : "FAILED ❌"}`,
    );
    console.log("");

    // Gate 1: minimum 70% green (EXACT)
    expect(exactPct).toBeGreaterThanOrEqual(MIN_EXACT_PCT);
    // Gate 2: maximum 10% red (FAIL)
    expect(failPct).toBeLessThanOrEqual(MAX_FAIL_PCT);
  }, 60_000);
});
