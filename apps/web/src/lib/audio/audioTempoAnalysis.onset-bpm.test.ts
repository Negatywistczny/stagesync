import { describe, expect, it } from "vitest";
import { estimateBpmFromOnsetStrength } from "./audio-tempo-analysis/bpm-acf.js";
import { computeOnsetStrengthEnvelope } from "./audio-tempo-analysis/onset-envelope.js";

/** Synthetic click train at `bpm` for pure onset/ACF checks (no AudioBuffer). */
function makeClickMono(bpm: number, beats: number, sampleRate = 44_100): Float32Array {
  const beatSec = 60 / bpm;
  const length = Math.ceil(beats * beatSec * sampleRate);
  const mono = new Float32Array(length);
  for (let b = 0; b < beats; b++) {
    const idx = Math.floor(b * beatSec * sampleRate);
    for (let k = 0; k < 48 && idx + k < length; k++) {
      mono[idx + k] = Math.max(mono[idx + k] ?? 0, 1 - k / 48);
    }
  }
  return mono;
}

describe("onset envelope + ACF (synthetic Float32)", () => {
  it("computeOnsetStrengthEnvelope yields peaks near click hops", () => {
    const sampleRate = 44_100;
    const hop = 256;
    const mono = makeClickMono(120, 8, sampleRate);
    const flux = computeOnsetStrengthEnvelope(mono, hop);
    expect(flux.length).toBeGreaterThan(8);
    const peakHops = [...flux]
      .map((v, i) => ({ v, i }))
      .filter((x) => x.v > 0.05)
      .map((x) => x.i);
    expect(peakHops.length).toBeGreaterThanOrEqual(4);
  });

  it("estimateBpmFromOnsetStrength recovers 120 BPM click train", () => {
    const sampleRate = 44_100;
    const hop = 256;
    const mono = makeClickMono(120, 32, sampleRate);
    const flux = computeOnsetStrengthEnvelope(mono, hop);
    const bpm = estimateBpmFromOnsetStrength(flux, sampleRate, hop, 120);
    expect(bpm).toBeGreaterThan(110);
    expect(bpm).toBeLessThan(130);
  });
});
