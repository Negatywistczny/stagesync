import { describe, expect, it } from "vitest";
import {
  computeWaveformFromAudioBuffer,
  peaksToPolylinePoints,
} from "./waveformPeaks.js";

function fakeBuffer(samples: number[]): AudioBuffer {
  const length = samples.length;
  const data = new Float32Array(samples);
  return {
    duration: length / 48000,
    length,
    numberOfChannels: 1,
    sampleRate: 48000,
    getChannelData: () => data,
    copyFromChannel: () => undefined,
    copyToChannel: () => undefined,
  } as unknown as AudioBuffer;
}

describe("waveformPeaks", () => {
  it("computes normalized peaks and rms", () => {
    const meta = computeWaveformFromAudioBuffer(fakeBuffer([0, 0.5, -1, 0.25, 0]), 8);
    expect(meta.peaks).toHaveLength(8);
    expect(Math.max(...meta.peaks)).toBeCloseTo(1, 5);
    expect(meta.rms).toBeGreaterThan(0);
  });

  it("peaksToPolylinePoints returns paired coordinates", () => {
    expect(peaksToPolylinePoints([0, 1, 0.5], 100, 40).split(" ")).toHaveLength(6);
  });
});
