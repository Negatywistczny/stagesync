import { describe, expect, it } from "vitest";
import {
  detectPcmSilenceThresholdMs,
  resolveAudioLeadInDelayMs,
} from "./audioLeadInResolver.js";

function channelWithSignalAt(
  sampleRate: number,
  signalSample: number,
  amplitude = 0.05,
): Float32Array {
  const data = new Float32Array(sampleRate);
  data[signalSample] = amplitude;
  return data;
}

/** Craft MP3-like bytes with Xing/Info at a known index and LAME delay fields. */
function craftXingBytes(opts: {
  tag: "Xing" | "Info";
  delayHigh: number;
  delayLow: number;
}): Uint8Array {
  const headerIdx = 64;
  const bytes = new Uint8Array(headerIdx + 160);
  const enc = new TextEncoder();
  bytes.set(enc.encode(opts.tag), headerIdx);
  bytes[headerIdx + 141] = opts.delayHigh;
  bytes[headerIdx + 142] = opts.delayLow;
  return bytes;
}

describe("audioLeadInResolver", () => {
  it("returns exactly 0 ms for lossless formats (WAV, AIFF, FLAC)", () => {
    const mockChannel = new Float32Array(44100);
    // Even if there is silence, WAV must return 0ms to preserve studio alignment
    expect(
      resolveAudioLeadInDelayMs(
        { channelData: mockChannel, sampleRate: 44100 },
        { formatHint: "wav" },
      ),
    ).toBe(0);
    expect(
      resolveAudioLeadInDelayMs(
        { channelData: mockChannel, sampleRate: 44100 },
        { formatHint: "aiff" },
      ),
    ).toBe(0);
    expect(
      resolveAudioLeadInDelayMs(
        { channelData: mockChannel, sampleRate: 44100 },
        { formatHint: "flac" },
      ),
    ).toBe(0);
    expect(
      resolveAudioLeadInDelayMs(
        { channelData: mockChannel, sampleRate: 44100 },
        { formatHint: "audio/wav" },
      ),
    ).toBe(0);
  });

  it("returns 0 ms for MIME lossless hints (audio/x-wav, audio/flac, aif)", () => {
    const mockChannel = new Float32Array(44100);
    for (const formatHint of ["audio/x-wav", "audio/flac", "aif", "wave"] as const) {
      expect(
        resolveAudioLeadInDelayMs(
          { channelData: mockChannel, sampleRate: 44100 },
          { formatHint },
        ),
      ).toBe(0);
    }
  });

  it("returns ~47.9 ms (2112 samples) default priming delay for AAC / M4A containers", () => {
    const mockChannel = new Float32Array(44100);
    const delay = resolveAudioLeadInDelayMs(
      { channelData: mockChannel, sampleRate: 44100 },
      { formatHint: "m4a" },
    );
    // 2112 / 44100 * 1000 = 47.89 ms -> rounded 47.9 ms
    expect(delay).toBe(47.9);
  });

  it("AAC without rawBytes uses 47.9 ms CoreAudio default", () => {
    const mockChannel = new Float32Array(44100);
    expect(
      resolveAudioLeadInDelayMs(
        { channelData: mockChannel, sampleRate: 44100 },
        { formatHint: "aac" },
      ),
    ).toBe(47.9);
    expect(
      resolveAudioLeadInDelayMs(
        { channelData: mockChannel, sampleRate: 44100 },
        { formatHint: "audio/aac" },
      ),
    ).toBe(47.9);
  });

  it("AAC with iTunSMPB rawBytes parses priming samples", () => {
    const mockChannel = new Float32Array(44100);
    const text = "xxxxiTunSMPB 00000000 00000840 00000000 yyyy";
    const rawBytes = new TextEncoder().encode(text);
    // 0x840 = 2112 samples → 47.9 ms @ 44.1 kHz
    expect(
      resolveAudioLeadInDelayMs(
        { channelData: mockChannel, sampleRate: 44100 },
        { formatHint: "m4a", rawBytes },
      ),
    ).toBe(47.9);

    // Different priming: 0x420 = 1056 samples → 23.9 ms
    const alt = new TextEncoder().encode(
      "meta iTunSMPB\n 00000000 00000420 00000000",
    );
    expect(
      resolveAudioLeadInDelayMs(
        { channelData: mockChannel, sampleRate: 44100 },
        { formatHint: "audio/mp4", rawBytes: alt },
      ),
    ).toBe(23.9);
  });

  it("MP3 with Xing/Info header bytes encodes encoder delay", () => {
    const mockChannel = new Float32Array(44100);
    // delayHigh=0x00, delayLow=0x10 → ((0<<4)|(0x10>>4))+529 = 529+1 = 530
    const xing = craftXingBytes({ tag: "Xing", delayHigh: 0x00, delayLow: 0x10 });
    const xingDelay = resolveAudioLeadInDelayMs(
      { channelData: mockChannel, sampleRate: 44100 },
      { formatHint: "mp3", rawBytes: xing },
    );
    expect(xingDelay).toBe(Math.round((530 / 44100) * 1000 * 10) / 10);

    const info = craftXingBytes({ tag: "Info", delayHigh: 0x01, delayLow: 0x00 });
    // ((1<<4)|(0>>4))+529 = 16+529 = 545
    const infoDelay = resolveAudioLeadInDelayMs(
      { channelData: mockChannel, sampleRate: 44100 },
      { formatHint: "audio/mpeg", rawBytes: info },
    );
    expect(infoDelay).toBe(Math.round((545 / 44100) * 1000 * 10) / 10);
  });

  it("MP3 without rawBytes falls back to PCM silence scan", () => {
    const sampleRate = 44100;
    const channelData = channelWithSignalAt(sampleRate, 1000);
    const delay = resolveAudioLeadInDelayMs(
      { channelData, sampleRate },
      { formatHint: "mp3" },
    );
    expect(delay).toBe(22.7);
  });

  it("unknown format falls back to PCM silence scan", () => {
    const sampleRate = 44100;
    const channelData = channelWithSignalAt(sampleRate, 441);
    expect(
      resolveAudioLeadInDelayMs(
        { channelData, sampleRate },
        { formatHint: "ogg" },
      ),
    ).toBe(10);
    expect(
      resolveAudioLeadInDelayMs({ channelData, sampleRate }, {}),
    ).toBe(10);
  });

  it("uses AudioBuffer-like getChannelData when present", () => {
    const sampleRate = 44100;
    const channelData = channelWithSignalAt(sampleRate, 882);
    const buffer = {
      sampleRate,
      getChannelData: () => channelData,
    };
    expect(
      resolveAudioLeadInDelayMs(buffer, { formatHint: "unknown" }),
    ).toBe(20);
  });

  it("scans PCM silence threshold correctly for MP3 fallback", () => {
    const sampleRate = 44100;
    const mockChannel = new Float32Array(sampleRate);
    // Insert signal at sample 1000 (~22.7ms)
    mockChannel[1000] = 0.05;

    const delay = detectPcmSilenceThresholdMs(mockChannel, sampleRate);
    expect(delay).toBe(22.7);
  });

  it("detectPcmSilenceThresholdMs: all-silence within scan window returns 0", () => {
    const sampleRate = 44100;
    const silent = new Float32Array(sampleRate); // zeros
    expect(detectPcmSilenceThresholdMs(silent, sampleRate)).toBe(0);
  });

  it("detectPcmSilenceThresholdMs respects custom threshold", () => {
    const sampleRate = 44100;
    const data = new Float32Array(sampleRate);
    data[100] = 0.0005; // below default 0.001
    data[200] = 0.002;
    // Default threshold: first hit at sample 200
    expect(detectPcmSilenceThresholdMs(data, sampleRate)).toBe(
      Math.round((200 / sampleRate) * 1000 * 10) / 10,
    );
    // Lower threshold: hits earlier sample 100
    expect(detectPcmSilenceThresholdMs(data, sampleRate, 0.0004)).toBe(
      Math.round((100 / sampleRate) * 1000 * 10) / 10,
    );
  });

  it("handles zero channel data gracefully", () => {
    const mockChannel = new Float32Array(0);
    expect(detectPcmSilenceThresholdMs(mockChannel, 44100)).toBe(0);
  });
});
