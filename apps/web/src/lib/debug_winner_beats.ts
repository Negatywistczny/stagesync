import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { analyzeAudioTempoAsync } from "./audioTempoAnalysis.js";

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

async function debugBeats() {
  const files = fs.readdirSync(FIXTURES_DIR);
  const rtfFile = files.find(f => f.toLowerCase().includes("survive") && f.endsWith(".rtf"))!;
  const mp3File = files.find(f => f.toLowerCase().includes("survive") && f.endsWith(".mp3"))!;

  const rtfContent = fs.readFileSync(path.join(FIXTURES_DIR, rtfFile), "utf-8");
  const lines = rtfContent.split("\n").map(l => l.replace(/\\[a-z0-9]+/gi, "").replace(/[{}\\]/g, "").trim()).filter(Boolean);

  console.log("=== LOGIC PRO RTF FIRST 10 LINES ===");
  for (const l of lines.slice(0, 15)) {
    console.log("  ", l);
  }

  const mp3Path = path.join(FIXTURES_DIR, mp3File);
  const audioBuf = loadAudioBufferFromMp3(mp3Path);
  const { result: analysis } = await analyzeAudioTempoAsync(audioBuf, { maxAnalysisSec: 300, fullTrackGrid: true });

  console.log("\n=== DETECTED BEATMS FIRST 20 BEATS ===");
  for (let i = 0; i < 20; i++) {
    console.log(`  Beat ${i}: ${analysis.beatMs[i]?.toFixed(1)} ms`);
  }
}

debugBeats().catch(console.error);
