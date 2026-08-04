/**
 * Generator script to create Smart Tempo benchmark accuracy dataset JSON.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { analyzeAudioTempoAsync } from "./audioTempoAnalysis.js";
import { runAudioDrivenSmartTempo, ticksToMsAlongTempoMap, type TempoMapProject } from "@stagesync/shared";

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  "apps/web/test/fixtures/smart-tempo-train-data",
);

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
    const cleanLine = line
      .replace(/\\[a-z0-9]+/gi, "")
      .replace(/[{}\\]/g, "")
      .trim();
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

function loadAudioBufferFromMp3(mp3Path: string): AudioBuffer {
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

export type BarDataPoint = {
  trackName: string;
  bar: number;
  timeSec: number;
  refBpm: number;
  estBpm: number;
  refBarMs: number;
  estBarMs: number;
  errorMs: number;
  tier: "exact" | "close" | "fail";
};

export type TrackBenchmarkDataset = {
  id: string;
  name: string;
  artist: string;
  durationSec: number;
  barsCount: number;
  exactPct: number;
  closePct: number;
  failPct: number;
  avgErrorMs: number;
  medianErrorMs: number;
  p95ErrorMs: number;
  bars: BarDataPoint[];
};

async function main() {
  const files = fs.readdirSync(FIXTURES_DIR);
  const rtfFiles = files.filter((f) => f.endsWith(".rtf")).sort();

  const allTracks: TrackBenchmarkDataset[] = [];

  for (const rtfFile of rtfFiles) {
    const baseName = rtfFile.replace(/\.rtf$/, "");
    const mp3File = files.find(
      (f) =>
        f.endsWith(".mp3") &&
        f.toLowerCase().includes(baseName.toLowerCase().slice(0, 8)),
    );
    if (!mp3File) continue;

    const rtfPath = path.join(FIXTURES_DIR, rtfFile);
    const mp3Path = path.join(FIXTURES_DIR, mp3File);
    const points = parseRtfReference(rtfPath);
    const audioBuf = loadAudioBufferFromMp3(mp3Path);
    const { result: analysis } = await analyzeAudioTempoAsync(audioBuf, {
      maxAnalysisSec: 300,
      fullTrackGrid: true,
    });

    const smartRes = runAudioDrivenSmartTempo({
      analysis,
      durationMs: Math.round(audioBuf.duration * 1000),
      audioStartOffsetMs: 0,
    });

    const barPoints: BarDataPoint[] = [];
    const ppq = 960;
    const barTicks = 4 * ppq;
    const benchProject: TempoMapProject = {
      defaultBpm: smartRes.seedBpm,
      defaultMeter: { numerator: 4, denominator: 4 },
      tempoMap: smartRes.tempoMap,
      meterMap: [{ id: "m0", startTicks: 0, numerator: 4, denominator: 4 }],
      ppq,
    };
    const bar1Pt = points.find((p) => p.bar === 1) ?? points[0];
    const refT0Ms = bar1Pt?.timecodeMs ?? 0;

    for (const refPt of points) {
      const targetTick = (refPt.bar - 1) * barTicks;
      const estMs = ticksToMsAlongTempoMap(0, targetTick, benchProject);
      const refMs = refPt.timecodeMs - refT0Ms;
      const estBpmAtBar = smartRes.tempoMap[0]?.bpm ?? analysis.estimatedBpm;

      const refBarMs = 240_000 / refPt.bpm;
      const estBarMs = 240_000 / estBpmAtBar;
      const timeSec = estMs / 1000;

      const errorMs = Math.round(Math.abs(estMs - refMs) * 10) / 10;

      const tier: "exact" | "close" | "fail" =
        errorMs <= 60 ? "exact" : errorMs <= 125 ? "close" : "fail";

      barPoints.push({
        trackName: baseName,
        bar: refPt.bar,
        timeSec: Math.round(timeSec * 10) / 10,
        refBpm: Math.round(refPt.bpm * 100) / 100,
        estBpm: Math.round(estBpmAtBar * 100) / 100,
        refBarMs: Math.round(refBarMs * 10) / 10,
        estBarMs: Math.round(estBarMs * 10) / 10,
        errorMs,
        tier,
      });
    }

    const n = barPoints.length;
    const sortedErrors = barPoints.map((b) => b.errorMs).sort((a, b) => a - b);
    const exactCount = barPoints.filter((b) => b.tier === "exact").length;
    const closeCount = barPoints.filter((b) => b.tier === "close").length;
    const failCount = barPoints.filter((b) => b.tier === "fail").length;
    const sumErr = sortedErrors.reduce((a, b) => a + b, 0);

    const medianErrorMs = sortedErrors[Math.floor(n / 2)] ?? 0;
    const p95ErrorMs = sortedErrors[Math.floor(n * 0.95)] ?? 0;

    let artist = "Logic Pro Benchmark";
    if (baseName.includes("Billie")) artist = "Michael Jackson";
    else if (baseName.includes("Survive")) artist = "Gloria Gaynor";
    else if (baseName.includes("Teen Spirit")) artist = "Nirvana";
    else if (baseName.includes("Winner")) artist = "ABBA";

    allTracks.push({
      id: baseName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name: baseName,
      artist,
      durationSec: Math.round(audioBuf.duration),
      barsCount: n,
      exactPct: Math.round((exactCount / n) * 1000) / 10,
      closePct: Math.round((closeCount / n) * 1000) / 10,
      failPct: Math.round((failCount / n) * 1000) / 10,
      avgErrorMs: Math.round((sumErr / n) * 10) / 10,
      medianErrorMs: Math.round(medianErrorMs * 10) / 10,
      p95ErrorMs: Math.round(p95ErrorMs * 10) / 10,
      bars: barPoints,
    });
  }

  const outPath = path.resolve(
    process.cwd(),
    "apps/web/src/lib/smartTempoBenchmarkData.json",
  );
  fs.writeFileSync(outPath, JSON.stringify(allTracks, null, 2));
  console.log(`Saved benchmark dataset to ${outPath}`);
}

main().catch(console.error);
