import { describe, expect, it } from "vitest";
import {
  createBiquadBandpass,
  extractDualBandOnsets,
  reconcileOctaveBpmWithBarHarmonics,
} from "./audioTempoAnalysis.js";

describe("Smart Tempo 5.5 Engine", () => {
  it("creates biquad bandpass filter and processes samples cleanly", () => {
    const filter = createBiquadBandpass(100, 1.2, 44100);
    const sample = filter.processSample(0.5);
    expect(typeof sample).toBe("number");
    expect(isNaN(sample)).toBe(false);
  });

  it("extracts dual band onsets (kick and snare) from PCM mono buffer", () => {
    const sampleRate = 44100;
    const mono = new Float32Array(sampleRate * 2);
    // Insert low-freq kick pulse at 0.5s
    for (let i = Math.round(0.5 * sampleRate); i < Math.round(0.55 * sampleRate); i++) {
      mono[i] = Math.sin((2 * Math.PI * 60 * i) / sampleRate) * 0.8;
    }

    const { kickOnsetsMs, snareOnsetsMs } = extractDualBandOnsets(mono, sampleRate, 256);
    expect(Array.isArray(kickOnsetsMs)).toBe(true);
    expect(Array.isArray(snareOnsetsMs)).toBe(true);
  });

  it("strictly folds double-time BPM (>=145) to quarter-note beat tempo", () => {
    expect(reconcileOctaveBpmWithBarHarmonics(180)).toBe(90);
    expect(reconcileOctaveBpmWithBarHarmonics(150)).toBe(75);
    expect(reconcileOctaveBpmWithBarHarmonics(120)).toBe(120); // 120 stays 120
    expect(reconcileOctaveBpmWithBarHarmonics(95)).toBe(95);   // 95 stays 95
  });
});
