import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { analyzeAudioTempoAsync } from "../../apps/web/src/lib/audio/audioTempoAnalysis.js";

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  "apps/web/test/fixtures/smart-tempo-train-data"
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
    const parts = cleanLine.split("\t").map((p) => p.trim()).filter(Boolean);
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
  try { execSync(`afconvert -f WAVE -d LEF32@44100 -c 1 "${mp3Path}" "${tmpWav}"`, { stdio: "ignore" }); }
  catch { execSync(`ffmpeg -y -i "${mp3Path}" -ar 44100 -ac 1 -f f32le "${tmpWav}"`, { stdio: "ignore" }); }
  const buf = fs.readFileSync(tmpWav);
  try { fs.unlinkSync(tmpWav); } catch {}
  const floatData = new Float32Array(buf.buffer, buf.byteOffset + 44, Math.floor((buf.byteLength - 44) / 4));
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

  let totalBars = 0;
  let exact60Count = 0;
  let close125Count = 0;
  let failCount = 0;
  let sumErr = 0;

  for (const rtfFile of rtfFiles) {
    const baseName = rtfFile.replace(/\.rtf$/, "");
    const mp3File = files.find((f) => f.endsWith(".mp3") && f.toLowerCase().includes(baseName.toLowerCase().slice(0, 8)));
    if (!mp3File) continue;

    const points = parseRtf(path.join(FIXTURES_DIR, rtfFile));
    const audioBuf = loadAudio(path.join(FIXTURES_DIR, mp3File));

    const { result: analysis } = await analyzeAudioTempoAsync(audioBuf, { maxAnalysisSec: 300, fullTrackGrid: true });

    // Align initial downbeat of StageSync beatMs to first reference bar in RTF
    const firstRef = points.find((p) => p.timecodeMs > 0) ?? points[0]!;
    const firstRefBarIdx = (firstRef.bar - 1) * 4;
    const estFirstMs = analysis.beatMs[firstRefBarIdx] ?? analysis.beatMs[0] ?? 0;
    const downbeatShift = firstRef.timecodeMs - estFirstMs;

    const alignedBeats = analysis.beatMs.map((b) => b + downbeatShift);

    let songExact = 0;
    let songErrSum = 0;

    for (const refPt of points) {
      totalBars++;
      const barBeatIdx = (refPt.bar - 1) * 4;
      const estMs = alignedBeats[barBeatIdx] ?? (alignedBeats[alignedBeats.length - 1] ?? 0);
      const err = Math.abs(estMs - refPt.timecodeMs);

      sumErr += err;
      songErrSum += err;

      if (err <= 60) {
        exact60Count++;
        songExact++;
      } else if (err <= 125) {
        close125Count++;
      } else {
        failCount++;
      }
    }

    console.log(`🎵 ${baseName}: Exact <= 60ms = ${songExact}/${points.length} (${((songExact/points.length)*100).toFixed(1)}%), Mean Err = ${(songErrSum/points.length).toFixed(1)} ms`);
  }

  console.log(`\n==========================================`);
  console.log(`TOTAL BARS: ${totalBars}`);
  console.log(`🟢 Exact <= 60ms: ${exact60Count}/${totalBars} (${((exact60Count/totalBars)*100).toFixed(1)}%)`);
  console.log(`🟡 Close 60-125ms: ${close125Count}/${totalBars} (${((close125Count/totalBars)*100).toFixed(1)}%)`);
  console.log(`🔴 Fail > 125ms: ${failCount}/${totalBars} (${((failCount/totalBars)*100).toFixed(1)}%)`);
  console.log(`📈 Mean Error: ${(sumErr/totalBars).toFixed(1)} ms`);
}

main().catch(console.error);
