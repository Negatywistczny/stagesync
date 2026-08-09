import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { analyzeAudioTempoAsync } from "../../src/lib/audio/audioTempoAnalysis.js";

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

function parseRtf(rtfPath: string) {
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

function loadAudio(mp3Path: string) {
  const tmpWav = path.join(process.cwd(), "node_modules/.cache/temp_dbg.wav");
  try {
    execSync(`afconvert -f WAVE -d LEF32@44100 -c 1 "${mp3Path}" "${tmpWav}"`, {
      stdio: "ignore",
    });
  } catch {
    execSync(`ffmpeg -y -i "${mp3Path}" -ar 44100 -ac 1 -f f32le "${tmpWav}"`, {
      stdio: "ignore",
    });
  }
  const buf = fs.readFileSync(tmpWav);
  try {
    fs.unlinkSync(tmpWav);
  } catch {
    // ignore
  }
  const floatData = new Float32Array(
    buf.buffer,
    buf.byteOffset + 44,
    Math.floor((buf.byteLength - 44) / 4),
  );
  return {
    length: floatData.length,
    duration: floatData.length / 44100,
    sampleRate: 44100,
    numberOfChannels: 1,
    getChannelData: () => floatData,
  } as unknown as AudioBuffer;
}

async function main() {
  const files = fs.readdirSync(FIXTURES_DIR);
  const rtfFiles = files.filter((f) => f.endsWith(".rtf")).sort();

  for (const rtfFile of rtfFiles) {
    const baseName = rtfFile.replace(/\.rtf$/, "");
    const mp3File = files.find(
      (f) =>
        f.endsWith(".mp3") &&
        f.toLowerCase().includes(baseName.toLowerCase().slice(0, 8)),
    );
    if (!mp3File) continue;

    const points = parseRtf(path.join(FIXTURES_DIR, rtfFile));
    const audioBuf = loadAudio(path.join(FIXTURES_DIR, mp3File));

    const { result: analysis } = await analyzeAudioTempoAsync(audioBuf, {
      maxAnalysisSec: 300,
      fullTrackGrid: true,
    });

    console.log(`\n🎵 TRACK: ${baseName}`);
    console.log(
      `   StageSync beatMs[0]: ${analysis.beatMs[0]} ms | total beats: ${analysis.beatMs.length}`,
    );
    console.log(`   Logic Pro First 5 Points:`);
    for (let i = 0; i < Math.min(5, points.length); i++) {
      console.log(
        `     Bar ${points[i]!.bar}: ${points[i]!.timecodeMs} ms (${points[i]!.bpm} BPM)`,
      );
    }

    // Find closest Logic Pro bar matching StageSync beatMs[0]
    let closestBar = points[0]!;
    let minDiff = Infinity;
    for (const pt of points) {
      const diff = Math.abs(pt.timecodeMs - (analysis.beatMs[0] ?? 0));
      if (diff < minDiff) {
        minDiff = diff;
        closestBar = pt;
      }
    }
    console.log(
      `   👉 StageSync beatMs[0] (${analysis.beatMs[0]} ms) matches Logic Pro Bar ${closestBar.bar} (${closestBar.timecodeMs} ms, diff: ${minDiff.toFixed(1)} ms)`,
    );
  }
}

main().catch(console.error);
