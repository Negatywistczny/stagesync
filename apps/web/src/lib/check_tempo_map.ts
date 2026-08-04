import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { analyzeAudioTempoAsync } from "./audioTempoAnalysis.js";
import { runAudioDrivenSmartTempo } from "@stagesync/shared";

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  "apps/web/test/fixtures/smart-tempo-train-data",
);

function loadAudioBufferFromMp3(mp3Path: string): AudioBuffer {
  const tmpWav = path.join(
    process.cwd(),
    `node_modules/.cache/temp_bench_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`,
  );
  fs.mkdirSync(path.dirname(tmpWav), { recursive: true });
  try {
    execSync(`afconvert -f WAVE -d LEF32@44100 -c 1 "${mp3Path}" "${tmpWav}"`, { stdio: "ignore" });
  } catch {
    execSync(`ffmpeg -y -i "${mp3Path}" -ar 44100 -ac 1 -f f32le "${tmpWav}"`, { stdio: "ignore" });
  }
  const buf = fs.readFileSync(tmpWav);
  try { fs.unlinkSync(tmpWav); } catch {}

  const headerOffset = buf.toString("ascii", 0, 4) === "RIFF" ? 44 : 0;
  const dataBuf = buf.subarray(headerOffset);
  const floatData = new Float32Array(dataBuf.buffer, dataBuf.byteOffset, Math.floor(dataBuf.byteLength / 4));

  return {
    sampleRate: 44100,
    length: floatData.length,
    duration: floatData.length / 44100,
    numberOfChannels: 1,
    getChannelData: (ch: number) => (ch === 0 ? floatData : new Float32Array(floatData.length)),
  } as unknown as AudioBuffer;
}

async function runCheck() {
  const files = fs.readdirSync(FIXTURES_DIR);
  const mp3File = files.find((f) => f.endsWith(".mp3") && f.toLowerCase().includes("billie"));
  if (!mp3File) {
    console.error("Billie Jean MP3 not found");
    return;
  }

  const mp3Path = path.join(FIXTURES_DIR, mp3File);
  const audioBuf = loadAudioBufferFromMp3(mp3Path);
  const { result: analysis } = await analyzeAudioTempoAsync(audioBuf, {
    maxAnalysisSec: 300,
    fullTrackGrid: true,
  });

  const smartRes = runAudioDrivenSmartTempo({
    beatMs: analysis.beatMs,
    estimatedBpm: analysis.estimatedBpm,
    durationMs: audioBuf.duration * 1000,
    audioStartOffsetMs: 0,
  });

  console.log(`t0 (first bar start time): ${smartRes.beatMs[0]?.toFixed(2)} ms`);
  console.log("First 5 tempoMap nodes:");
  console.log(
    smartRes.tempoMap.slice(0, 5).map((n) => ({
      startTicks: n.startTicks,
      bpm: n.bpm,
    })),
  );
}

runCheck().catch(console.error);
