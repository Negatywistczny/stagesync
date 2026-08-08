import { describe, expect, it } from "vitest";
import {
  detectPcmSilenceThresholdMs,
  resolveAudioLeadInDelayMs,
} from "./audioLeadInResolver.js";

describe("audioLeadInResolver", () => {
  it("returns exactly 0 ms for lossless formats (WAV, AIFF, FLAC)", () => {
    const mockChannel = new Float32Array(44100);
    // Even if there is silence, WAV must return 0ms to preserve studio alignment
    expect(resolveAudioLeadInDelayMs({ channelData: mockChannel, sampleRate: 44100 }, { formatHint: "wav" })).toBe(0);
    expect(resolveAudioLeadInDelayMs({ channelData: mockChannel, sampleRate: 44100 }, { formatHint: "aiff" })).toBe(0);
    expect(resolveAudioLeadInDelayMs({ channelData: mockChannel, sampleRate: 44100 }, { formatHint: "flac" })).toBe(0);
    expect(resolveAudioLeadInDelayMs({ channelData: mockChannel, sampleRate: 44100 }, { formatHint: "audio/wav" })).toBe(0);
  });

  it("returns ~47.9 ms (2112 samples) default priming delay for AAC / M4A containers", () => {
    const mockChannel = new Float32Array(44100);
    const delay = resolveAudioLeadInDelayMs(
      { channelData: mockChannel, sampleRate: 44100 },
      { formatHint: "m4a" }
    );
    // 2112 / 44100 * 1000 = 47.89 ms -> rounded 47.9 ms
    expect(delay).toBe(47.9);
  });

  it("scans PCM silence threshold correctly for MP3 fallback", () => {
    const sampleRate = 44100;
    const mockChannel = new Float32Array(sampleRate);
    // Insert signal at sample 1000 (~22.7ms)
    mockChannel[1000] = 0.05;

    const delay = detectPcmSilenceThresholdMs(mockChannel, sampleRate);
    expect(delay).toBe(22.7);
  });

  it("handles zero channel data gracefully", () => {
    const mockChannel = new Float32Array(0);
    expect(detectPcmSilenceThresholdMs(mockChannel, 44100)).toBe(0);
  });
});
