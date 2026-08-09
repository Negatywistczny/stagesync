import { describe, expect, it } from "vitest";
import {
  computeEnvelopeBins,
  computeWaveformFromAudioBuffer,
  detectFirstTransientMs,
  envelopeBinsToPath,
  peaksToPolylinePoints,
  peaksToWaveformBars,
  resolveInitialAudioStartOffsetMs,
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
    const meta = computeWaveformFromAudioBuffer(
      fakeBuffer([0, 0.5, -1, 0.25, 0]),
      8,
    );
    expect(meta.peaks).toHaveLength(8);
    expect(Math.max(...meta.peaks)).toBeCloseTo(1, 5);
    expect(meta.rms).toBeGreaterThan(0);
  });

  it("peaksToPolylinePoints returns paired coordinates", () => {
    expect(peaksToPolylinePoints([0, 1, 0.5], 100, 40).split(" ")).toHaveLength(
      6,
    );
  });

  it("empty AudioBuffer returns empty peaks", () => {
    const empty = fakeBuffer([]);
    Object.defineProperty(empty, "length", { value: 0 });
    expect(computeWaveformFromAudioBuffer(empty)).toEqual({
      peaks: [],
      rms: 0,
      durationMs: 0,
    });
  });

  it("peaksToWaveformBars scales amplitude and stays within height", () => {
    const bars = peaksToWaveformBars([0, 1, 0.5], 100, 100, 0.8);
    expect(bars).toHaveLength(3);
    expect(bars[1]!.y1).toBeCloseTo(10, 5);
    expect(bars[1]!.y2).toBeCloseTo(90, 5);
    expect(bars[0]!.y2 - bars[0]!.y1).toBeGreaterThanOrEqual(3);
  });

  it("detectFirstTransientMs finds first sample above threshold", () => {
    const samples = new Array(480).fill(0);
    samples[240] = 0.02; // 5 ms @ 48 kHz
    expect(detectFirstTransientMs(fakeBuffer(samples))).toBe(5);
  });

  it("detectFirstTransientMs does not scan multi-hour buffers sample-by-sample", () => {
    const sampleRate = 48_000;
    const length = sampleRate * 3600 * 3; // 3 h
    const data = new Float32Array(length);
    data[sampleRate * 5] = 0.5; // transient @ 5 s
    const buf = {
      duration: length / sampleRate,
      length,
      numberOfChannels: 1,
      sampleRate,
      getChannelData: () => data,
    } as unknown as AudioBuffer;
    const started = performance.now();
    expect(detectFirstTransientMs(buf)).toBe(5000);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it("resolveInitialAudioStartOffsetMs uses pipe+GAP Beat 1 for long intros", () => {
    const sampleRate = 48_000;
    const samples = new Array(sampleRate * 2).fill(0);
    samples[sampleRate] = 0.5; // transient @ 1 s — too late vs ideal 0
    const buf = fakeBuffer(samples);
    Object.defineProperty(buf, "sampleRate", { value: sampleRate });
    expect(
      resolveInitialAudioStartOffsetMs(buf, 33_000, {
        pipeBarCount: 16,
        layoutBpm: 120,
      }),
    ).toBe(0);
  });

  it("resolveInitialAudioStartOffsetMs uses GAP when file is quiet until vocal", () => {
    const samples = new Array(480).fill(0);
    samples[240] = 0.5; // 5 ms — well before a large GAP
    const buf = fakeBuffer(samples);
    expect(resolveInitialAudioStartOffsetMs(buf, 12_500)).toBe(5);
    expect(resolveInitialAudioStartOffsetMs(buf, 0)).toBe(5);
    expect(resolveInitialAudioStartOffsetMs(buf, null)).toBe(5);
  });

  it("resolveInitialAudioStartOffsetMs prefers #GAP when transient is near GAP", () => {
    const sampleRate = 48_000;
    const gapMs = 1000;
    const samples = new Array(Math.ceil(sampleRate * 1.2)).fill(0);
    samples[Math.round(sampleRate * 0.95)] = 0.5; // ~950 ms ≈ GAP
    const buf = fakeBuffer(samples);
    Object.defineProperty(buf, "sampleRate", { value: sampleRate });
    Object.defineProperty(buf, "duration", {
      value: samples.length / sampleRate,
    });
    expect(resolveInitialAudioStartOffsetMs(buf, gapMs)).toBe(gapMs);
  });

  it("computeEnvelopeBins returns one min/max bin per pixel column", () => {
    const samples = Array.from({ length: 1000 }, (_, i) =>
      Math.sin((i / 1000) * Math.PI * 4),
    );
    const bins = computeEnvelopeBins(fakeBuffer(samples), 10);
    expect(bins).toHaveLength(10);
    for (const b of bins) {
      expect(b.min).toBeLessThanOrEqual(b.max);
      expect(Math.abs(b.min)).toBeLessThanOrEqual(1.0001);
      expect(Math.abs(b.max)).toBeLessThanOrEqual(1.0001);
    }
    const peak = Math.max(
      ...bins.map((b) => Math.max(Math.abs(b.min), Math.abs(b.max))),
    );
    expect(peak).toBeCloseTo(1, 2);
  });

  it("envelopeBinsToPath closes a symmetric fill path", () => {
    const path = envelopeBinsToPath(
      [
        { min: -0.5, max: 0.5 },
        { min: -1, max: 1 },
        { min: -0.2, max: 0.2 },
      ],
      100,
      100,
      0.85,
    );
    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith(" Z")).toBe(true);
    expect(path.split(" L ").length).toBeGreaterThan(3);
  });
});
