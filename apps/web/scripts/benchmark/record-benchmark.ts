/**
 * scripts/record-benchmark.ts — Smart Tempo Benchmark Snapshot Recorder CLI
 * Runs accuracy analysis on train data, extracts Git commit, and appends a snapshot
 * to apps/web/src/lib/audio/smartTempoBenchmarkHistory.json for regression tracking.
 * Computes both DAW Grade (60ms/125ms) and Stage-Ready Grade (15ms/35ms) metrics.
 *
 * Usage:
 *   npx tsx scripts/record-benchmark.ts --note "Opis nowych zmian w Viterbi"
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { runAudioDrivenSmartTempo } from "@stagesync/shared";
import { analyzeAudioTempoAsync } from "../../src/lib/audio/audioTempoAnalysis.js";

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  "apps/web/test/fixtures/smart-tempo-train-data",
);
const HISTORY_FILE = path.resolve(
  process.cwd(),
  "apps/web/src/lib/audio/smartTempoBenchmarkHistory.json",
);
const DATASET_FILE = path.resolve(
  process.cwd(),
  "apps/web/src/lib/audio/smartTempoBenchmarkData.json",
);

export type StageTier = "stage-perfect" | "stage-acceptable" | "stage-unusable";
export type DawTier = "exact" | "close" | "fail";

export type BenchmarkHistoryEntry = {
  id: string;
  timestamp: string;
  gitCommit: string;
  note: string;
  summary: {
    totalMeasures: number;
    exactPct: number;
    closePct: number;
    failPct: number;
    meanMs: number;
    medianMs: number;
    p95Ms: number;
    dawGrade: {
      exactPct: number;
      closePct: number;
      failPct: number;
    };
    stageGrade: {
      perfectPct: number;
      acceptablePct: number;
      unusablePct: number;
    };
  };
  perSong: Record<
    string,
    {
      exactPct: number;
      meanMs: number;
      stageGrade: {
        perfectPct: number;
        acceptablePct: number;
        unusablePct: number;
      };
    }
  >;
};

function parseTimecodeToMs(tc: string): number {
  const parts = tc.trim().split(":");
  if (parts.length >= 3) {
    const hrs = parseInt(parts[0]!, 10);
    const mins = parseInt(parts[1]!, 10);
    const secs = parseInt(parts[2]!, 10);
    let extraMs = 0;
    if (parts[3]) {
      const val = parseFloat(parts[3]);
      extraMs = (val / 25) * 1000;
    }
    const totalMs = (hrs * 3600 + mins * 60 + secs) * 1000 + extraMs;
    return totalMs - 3_600_000;
  }
  return 0;
}

function parseRtfReference(rtfPath: string) {
  const content = fs.readFileSync(rtfPath, "utf-8");
  const lines = content.split("\n");
  const points: { bar: number; beat: number; bpm: number; timecodeMs: number }[] = [];

  for (const line of lines) {
    const cleanLine = line
      .replace(/\\tab\s?/g, "\t")
      .replace(/\\[a-z0-9]+\s?/gi, "")
      .replace(/[{}]/g, "")
      .replace(/\\$/g, "")
      .trim();
    const parts = cleanLine
      .split("\t")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const firstCol = parts[0]!;
      const barMatch = firstCol.match(/^(\d+)(?:\s+(\d+))?/);
      if (barMatch) {
        const barNum = parseInt(barMatch[1]!, 10);
        const beatNum = barMatch[2] ? parseInt(barMatch[2]!, 10) : 1;
        const bpmStr = parts[1]!.replace(",", ".");
        const bpmVal = parseFloat(bpmStr);
        const tc = parts[2] ?? "";
        const timecodeMs = tc ? parseTimecodeToMs(tc) : 0;
        if (!isNaN(barNum) && !isNaN(bpmVal) && bpmVal > 40 && bpmVal < 250) {
          points.push({ bar: barNum, beat: beatNum, bpm: bpmVal, timecodeMs });
        }
      }
    }
  }
  return points;
}

function loadAudioBufferFromMp3(mp3Path: string): AudioBuffer {
  const tmpWav = path.join(
    process.cwd(),
    `node_modules/.cache/temp_rec_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`,
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

function getGitCommitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function parseCliNote(): string {
  const args = process.argv.slice(2);
  const noteIdx = args.indexOf("--note");
  if (noteIdx !== -1 && args[noteIdx + 1]) {
    return args[noteIdx + 1]!;
  }
  return "Benchmark Snapshot Run";
}

async function recordBenchmark() {
  const note = parseCliNote();
  const gitCommit = getGitCommitHash();
  const now = new Date();
  const timestamp = now.toISOString();

  console.log(`\n🚀 Recording Smart Tempo Benchmark Snapshot (Dual-Tier)...`);
  console.log(`📌 Commit: ${gitCommit} | Note: "${note}"\n`);

  const files = fs.readdirSync(FIXTURES_DIR);
  const rtfFiles = files.filter((f) => f.endsWith(".rtf")).sort();

  const allBarErrors: number[] = [];
  const perSong: BenchmarkHistoryEntry["perSong"] = {};
  const datasetOutput: Array<{
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
    dawGrade: { exactPct: number; closePct: number; failPct: number };
    stageGrade: { perfectPct: number; acceptablePct: number; unusablePct: number };
    bars: Array<{
      trackName: string;
      bar: number;
      timeSec: number;
      refBpm: number;
      estBpm: number;
      refBarMs: number;
      estBarMs: number;
      errorMs: number;
      tier: DawTier;
      stageTier: StageTier;
    }>;
  }> = [];

  let totalExactCount = 0;
  let totalCloseCount = 0;
  let totalFailCount = 0;

  let totalStagePerfectCount = 0;
  let totalStageAcceptableCount = 0;
  let totalStageUnusableCount = 0;

  const trackArg = process.argv
    .find((a) => a.startsWith("--track="))
    ?.split("=")[1]
    ?.replace(/^["']|["']$/g, "")
    .trim();

  for (const rtfFile of rtfFiles) {
    const baseName = rtfFile.replace(/\.rtf$/, "");
    const mp3File = files.find(
      (f) =>
        f.endsWith(".mp3") &&
        f.toLowerCase().includes(baseName.toLowerCase().slice(0, 8)),
    );
    if (!mp3File) continue;

    console.log(`Analyzing: ${baseName}...`);
    const rtfPath = path.join(FIXTURES_DIR, rtfFile);
    const mp3Path = path.join(FIXTURES_DIR, mp3File);
    const points = parseRtfReference(rtfPath);
    const audioBuf = loadAudioBufferFromMp3(mp3Path);

    const shouldTraceTrack = Boolean(
      trackArg && baseName.toLowerCase().includes(trackArg.toLowerCase()),
    );

    const { result: analysis } = await analyzeAudioTempoAsync(audioBuf, {
      maxAnalysisSec: 300,
      downsample: 2,
      fullTrackGrid: true,
      enableTrace: shouldTraceTrack,
      timeoutMs: 60_000,
    });

    const smartRes = runAudioDrivenSmartTempo({
      analysis,
      durationMs: Math.round(audioBuf.duration * 1000),
    });

    const songBarErrors: number[] = [];
    const barPoints: Array<{
      trackName: string;
      bar: number;
      timeSec: number;
      refBpm: number;
      estBpm: number;
      refBarMs: number;
      estBarMs: number;
      errorMs: number;
      tier: DawTier;
      stageTier: StageTier;
    }> = [];
    // Enforce Bar 1 Downbeat Alignment (ADR 0002)
    const firstMusicalOnsetMs = analysis.beatMs[0] ?? analysis.onsetsMs[0] ?? 0;
    const shiftMs = (points[0]?.timecodeMs ?? 0) - firstMusicalOnsetMs;
    const alignedBeatMs = analysis.beatMs.map((t: number) => t + shiftMs);
    console.log(
      `   [BAR 1 DOWNBEAT ALIGNMENT] ${baseName}: pts[0].timecodeMs=${points[0]?.timecodeMs ?? 0}, firstMusicalOnsetMs=${firstMusicalOnsetMs.toFixed(1)} -> shiftMs=${shiftMs.toFixed(1)}`,
    );

    let cumMs = 0;
    for (let i = 0; i < points.length; i++) {
      const refPt = points[i]!;
      const targetTick = (refPt.bar - 1) * 1920;
      let estBpmAtBar = smartRes.tempoMap[0]?.bpm ?? analysis.estimatedBpm;
      for (const ev of smartRes.tempoMap) {
        if (ev.startTicks <= targetTick) {
          estBpmAtBar = ev.bpm;
        } else {
          break;
        }
      }

      const refBarMs = 240_000 / refPt.bpm;
      const estBarMs = 240_000 / estBpmAtBar;

      const targetIdx = (refPt.bar - 1) * 4 + (refPt.beat - 1);
      const estBarTimeMs =
        alignedBeatMs[targetIdx] ??
        (alignedBeatMs[alignedBeatMs.length - 1] ?? 0) +
        (targetIdx - Math.max(0, alignedBeatMs.length - 1)) * (60_000 / estBpmAtBar);

      // Absolute timeline position error: difference between estimated bar timestamp and reference timestamp
      const errorMsRaw = Math.abs(estBarTimeMs - refPt.timecodeMs);
      const timeSec =
        refPt.timecodeMs > 0
          ? Math.round((refPt.timecodeMs / 1000) * 10) / 10
          : Math.round((cumMs / 1000) * 10) / 10;
      cumMs += refBarMs;

      // Round errorMs BEFORE computing tiers to guarantee written value matches tier
      const errorMs = Math.round(errorMsRaw * 10) / 10;

      songBarErrors.push(errorMs);
      allBarErrors.push(errorMs);

      const tier: DawTier =
        errorMs <= 60 ? "exact" : errorMs <= 125 ? "close" : "fail";
      const stageTier: StageTier =
        errorMs <= 15
          ? "stage-perfect"
          : errorMs <= 35
            ? "stage-acceptable"
            : "stage-unusable";

      if (tier === "exact") totalExactCount++;
      else if (tier === "close") totalCloseCount++;
      else totalFailCount++;

      if (stageTier === "stage-perfect") totalStagePerfectCount++;
      else if (stageTier === "stage-acceptable") totalStageAcceptableCount++;
      else totalStageUnusableCount++;

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
        stageTier,
      });
    }

    if (shouldTraceTrack) {
      console.log(`\n================================================================================`);
      console.log(`🔍 EXPLAINABLE DSP DECISION TRACE: ${baseName}`);
      console.log(`================================================================================`);

      console.log(`\n--- [INTRO PHASING TRACE: Beats 0..16] ---`);
      for (let beatIdx = 0; beatIdx <= 16; beatIdx += 4) {
        const traceLayer = analysis.viterbiTrace?.find((vt) => vt.beatIdx === beatIdx);
        if (traceLayer) {
          console.log(`\n[BeatIdx ${beatIdx} (Bar ${beatIdx / 4 + 1})] Selected DSP: ${traceLayer.selectedMs.toFixed(1)} ms`);
          traceLayer.candidates.slice(0, 5).forEach((cand, cIdx) => {
            const statusTag = cand.status === "WINNER" ? "🟢 [WINNER]" : "🔴 [REJECTED]";
            const reasonMsg = cand.rejectReason ? ` -> ${cand.rejectReason}` : "";
            console.log(`   ${statusTag} #${cIdx + 1} @ ${cand.tMs.toFixed(1)} ms | RawScore: ${cand.rawScore.toFixed(2)}, TotalScore: ${cand.totalScore.toFixed(2)}${reasonMsg}`);
          });
        }
      }

      console.log(`\n--- [FAILING BARS TRACE (DAW FAIL > 60 ms)] ---`);
      const failingBars = barPoints.filter((bp) => bp.tier === "fail").slice(0, 5);
      if (failingBars.length === 0) {
        console.log(`✅ Brak taktów przekraczających 60 ms w tym utworze!`);
      } else {
        for (const bp of failingBars) {
          const targetIdx = (bp.bar - 1) * 4;
          const refPt = points.find((p) => p.bar === bp.bar);
          const refMs = refPt?.timecodeMs ?? 0;
          const estMs = alignedBeatMs[targetIdx] ?? 0;
          console.log(`\n[Bar ${bp.bar}] Ref RTF: ${refMs.toFixed(1)} ms | Selected DSP: ${estMs.toFixed(1)} ms | Error: ${bp.errorMs.toFixed(1)} ms (DAW FAIL)`);
          const traceLayer = analysis.viterbiTrace?.find((vt) => vt.beatIdx === targetIdx);
          if (traceLayer && traceLayer.candidates.length > 0) {
            console.log(`   Oceniani kandydaci Viterbiego (layer beatIdx ${targetIdx}):`);
            traceLayer.candidates.slice(0, 5).forEach((cand, cIdx) => {
              const statusTag = cand.status === "WINNER" ? "🟢 [WINNER]" : "🔴 [REJECTED]";
              const reasonMsg = cand.rejectReason ? ` -> ${cand.rejectReason}` : "";
              console.log(`      ${statusTag} #${cIdx + 1} @ ${cand.tMs.toFixed(1)} ms | RawScore: ${cand.rawScore.toFixed(2)}, TotalScore: ${cand.totalScore.toFixed(2)}${reasonMsg}`);
            });
          } else {
            console.log(`   (Brak rejestracji kandydatów dla beatIdx ${targetIdx})`);
          }
        }
      }
      console.log(`================================================================================\n`);
    }

    const songExactCount = barPoints.filter((b) => b.tier === "exact").length;
    const songCloseCount = barPoints.filter((b) => b.tier === "close").length;
    const songFailCount = barPoints.filter((b) => b.tier === "fail").length;

    const songStagePerfCount = barPoints.filter((b) => b.stageTier === "stage-perfect").length;
    const songStageAccCount = barPoints.filter((b) => b.stageTier === "stage-acceptable").length;
    const songStageUnuCount = barPoints.filter((b) => b.stageTier === "stage-unusable").length;

    const songSum = songBarErrors.reduce((a, b) => a + b, 0);
    const songExactPct = Math.round((songExactCount / points.length) * 1000) / 10;
    const songMeanMs = Math.round((songSum / points.length) * 10) / 10;

    const songDawGrade = {
      exactPct: songExactPct,
      closePct: Math.round((songCloseCount / points.length) * 1000) / 10,
      failPct: Math.round((songFailCount / points.length) * 1000) / 10,
    };
    const songStageGrade = {
      perfectPct: Math.round((songStagePerfCount / points.length) * 1000) / 10,
      acceptablePct: Math.round((songStageAccCount / points.length) * 1000) / 10,
      unusablePct: Math.round((songStageUnuCount / points.length) * 1000) / 10,
    };

    perSong[baseName] = {
      exactPct: songExactPct,
      meanMs: songMeanMs,
      stageGrade: songStageGrade,
    };

    const sortedSongErr = songBarErrors.slice().sort((a, b) => a - b);
    let artist = "Logic Pro Benchmark";
    if (baseName.includes("Billie")) artist = "Michael Jackson";
    else if (baseName.includes("Survive")) artist = "Gloria Gaynor";
    else if (baseName.includes("Teen Spirit")) artist = "Nirvana";
    else if (baseName.includes("Winner")) artist = "ABBA";

    datasetOutput.push({
      id: baseName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name: baseName,
      artist,
      durationSec: Math.round(audioBuf.duration),
      barsCount: points.length,
      exactPct: songExactPct,
      closePct: songDawGrade.closePct,
      failPct: songDawGrade.failPct,
      avgErrorMs: songMeanMs,
      medianErrorMs: Math.round((sortedSongErr[Math.floor(points.length / 2)] ?? 0) * 10) / 10,
      p95ErrorMs: Math.round((sortedSongErr[Math.floor(points.length * 0.95)] ?? 0) * 10) / 10,
      dawGrade: songDawGrade,
      stageGrade: songStageGrade,
      bars: barPoints,
    });
  }

  const totalMeasures = allBarErrors.length;
  const sortedAll = allBarErrors.slice().sort((a, b) => a - b);
  const totalSumMs = allBarErrors.reduce((a, b) => a + b, 0);

  const exactPct = Math.round((totalExactCount / totalMeasures) * 1000) / 10;
  const closePct = Math.round((totalCloseCount / totalMeasures) * 1000) / 10;
  const failPct = Math.round((totalFailCount / totalMeasures) * 1000) / 10;

  const perfectPct = Math.round((totalStagePerfectCount / totalMeasures) * 1000) / 10;
  const acceptablePct = Math.round((totalStageAcceptableCount / totalMeasures) * 1000) / 10;
  const unusablePct = Math.round((totalStageUnusableCount / totalMeasures) * 1000) / 10;

  const meanMs = Math.round((totalSumMs / totalMeasures) * 10) / 10;
  const medianMs = Math.round((sortedAll[Math.floor(totalMeasures * 0.5)] ?? 0) * 10) / 10;
  const p95Ms = Math.round((sortedAll[Math.floor(totalMeasures * 0.95)] ?? 0) * 10) / 10;

  const runId = `run-${now.toISOString().slice(0, 10)}-${now.toTimeString().slice(0, 8).replace(/:/g, "")}`;

  const entry: BenchmarkHistoryEntry = {
    id: runId,
    timestamp,
    gitCommit,
    note,
    summary: {
      totalMeasures,
      exactPct,
      closePct,
      failPct,
      meanMs,
      medianMs,
      p95Ms,
      dawGrade: {
        exactPct,
        closePct,
        failPct,
      },
      stageGrade: {
        perfectPct,
        acceptablePct,
        unusablePct,
      },
    },
    perSong,
  };

  // Read existing history
  let history: BenchmarkHistoryEntry[] = [];
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    } catch {
      history = [];
    }
  }

  history.push(entry);
  // codeql[js/file-system-race] Protected internal benchmark history snapshot write
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), { encoding: "utf8", mode: 0o600 });
  // codeql[js/file-system-race] Protected internal benchmark dataset write
  fs.writeFileSync(DATASET_FILE, JSON.stringify(datasetOutput, null, 2), { encoding: "utf8", mode: 0o600 });

  console.log(`\n✅ Snapshot successfully recorded!`);
  console.log(`   ID: ${entry.id}`);
  console.log(`   🎛️ DAW Grade:   Exact (≤60ms): ${entry.summary.dawGrade.exactPct}% | Close: ${entry.summary.dawGrade.closePct}% | Fail: ${entry.summary.dawGrade.failPct}%`);
  console.log(`   🎤 Stage Grade: Perfect (≤15ms): ${entry.summary.stageGrade.perfectPct}% | Acceptable (15-35ms): ${entry.summary.stageGrade.acceptablePct}% | Unusable (>35ms): ${entry.summary.stageGrade.unusablePct}%`);
  console.log(`   📈 Mean Error:  ${entry.summary.meanMs} ms | Median: ${entry.summary.medianMs} ms\n`);
}

recordBenchmark().catch(console.error);
