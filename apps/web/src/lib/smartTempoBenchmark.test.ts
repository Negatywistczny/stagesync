import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { analyzeAudioTempoAsync } from "./audioTempoAnalysis.js";
import { runAudioDrivenSmartTempo } from "@stagesync/shared";

const FIXTURES_DIR = path.resolve(
  __dirname,
  "../../test/fixtures/smart-tempo-train-data",
);

// ---------------------------------------------------------------------------
// Accuracy tiers (bar period error in milliseconds)
// ---------------------------------------------------------------------------
/** 🟢 EXACT: DAW-grade accuracy (bar period error ≤ one sixteenth note at 120 BPM). */
const EXACT_THRESHOLD_MS = 125;
/** 🟡 CLOSE: acceptable rubato drift — usable but not ideal. */
const CLOSE_THRESHOLD_MS = 250;
// 🔴 FAIL: > 250 ms — structural error (≥ half a beat at 120 BPM)

// ---------------------------------------------------------------------------
// Pass criteria
// ---------------------------------------------------------------------------
/** Minimum percentage of 🟢 EXACT bars required to pass. */
const MIN_EXACT_PCT = 85;
/** Maximum percentage of 🔴 FAIL bars allowed. */
const MAX_FAIL_PCT = 10;

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

export function parseRtfReference(rtfPath: string): RefBarPoint[] {
  const content = fs.readFileSync(rtfPath, "utf-8");
  const lines = content.split("\n");
  const points: RefBarPoint[] = [];

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
  it("meets accuracy gates: ≥85% 🟢 EXACT (≤125ms) and ≤10% 🔴 FAIL", async () => {
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
      const { result: analysis } = await analyzeAudioTempoAsync(audioBuf, {
        maxAnalysisSec: 300,
        fullTrackGrid: true,
      });

      const smartRes = runAudioDrivenSmartTempo({
        analysis,
        durationMs: Math.round(audioBuf.duration * 1000),
      });

      let trackExact = 0;
      let trackClose = 0;
      let trackFail = 0;
      let totalErrorMs = 0;

      for (const refPt of points) {
        const targetTick = (refPt.bar - 1) * 1920;
        let estBpmAtBar = smartRes.tempoMap[0]?.bpm ?? analysis.estimatedBpm;
        for (const ev of smartRes.tempoMap) {
          if (ev.startTicks <= targetTick) {
            estBpmAtBar = ev.bpm;
          } else {
            break;
          }
        }

        // Bar period error in milliseconds
        const refBarMs = 240_000 / refPt.bpm;
        const estBarMs = 240_000 / estBpmAtBar;
        const errorMs = Math.abs(estBarMs - refBarMs);
        totalErrorMs += errorMs;

        if (errorMs <= EXACT_THRESHOLD_MS) {
          trackExact++;
        } else if (errorMs <= CLOSE_THRESHOLD_MS) {
          trackClose++;
        } else {
          trackFail++;
        }
      }

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
      });

      totalBars += n;
      exactBars += trackExact;
      closeBars += trackClose;
      failBars += trackFail;
    }

    const exactPct = (exactBars / totalBars) * 100;
    const closePct = (closeBars / totalBars) * 100;
    const failPct = (failBars / totalBars) * 100;

    console.log("\n[SMART TEMPO BENCHMARK SUMMARY]");
    console.log("─".repeat(64));
    console.log(
      `  🟢 EXACT  (≤${EXACT_THRESHOLD_MS}ms) : ${exactBars}/${totalBars} (${exactPct.toFixed(1)}%)  [required ≥${MIN_EXACT_PCT}%]`,
    );
    console.log(
      `  🟡 CLOSE  (${EXACT_THRESHOLD_MS}–${CLOSE_THRESHOLD_MS}ms): ${closeBars}/${totalBars} (${closePct.toFixed(1)}%)`,
    );
    console.log(
      `  🔴 FAIL   (>${CLOSE_THRESHOLD_MS}ms) : ${failBars}/${totalBars} (${failPct.toFixed(1)}%)  [required ≤${MAX_FAIL_PCT}%]`,
    );
    console.log("─".repeat(64));
    for (const s of trackSummaries) {
      console.log(
        `  ${s.name}: 🟢${s.exact} 🟡${s.close} 🔴${s.fail} (avg err ${s.avgErrorMs.toFixed(1)}ms)`,
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
