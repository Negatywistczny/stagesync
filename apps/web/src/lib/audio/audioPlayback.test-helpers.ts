import { vi } from "vitest";
import { createProjectSeed, projectEndTicks } from "@stagesync/shared";
import {
  allowAudioPlayback,
  clearAudioBufferCache,
  stopAudioPlayback,
} from "./audioPlayback.js";

export function fakeAudioBuffer(
  approxBytes: number,
  channels = 2,
): AudioBuffer {
  const length = Math.max(1, Math.ceil(approxBytes / (channels * 4)));
  return {
    duration: length / 48_000,
    numberOfChannels: channels,
    length,
  } as AudioBuffer;
}

export function mockAudioParam(value = 1) {
  const param = {
    value,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn((v: number) => {
      param.value = v;
    }),
    linearRampToValueAtTime: vi.fn((v: number) => {
      // Snap for tests — real AudioContext interpolates over GAIN_DEZIPPER_SEC.
      param.value = v;
    }),
    setTargetAtTime: vi.fn((v: number) => {
      param.value = v;
    }),
  };
  return param;
}

export function mockConnectable() {
  return { connect: vi.fn(), disconnect: vi.fn() };
}

/** Minimal WebAudio graph stubs for sync / bus wiring. */
export function mockAudioContext(
  overrides: Record<string, unknown> = {},
): AudioContext {
  const emptyBuf = { duration: 0, numberOfChannels: 1 } as AudioBuffer;
  return {
    state: "running",
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createBuffer: vi.fn(() => emptyBuf),
    createBufferSource: vi.fn(),
    createGain: vi.fn(() => ({
      ...mockConnectable(),
      gain: mockAudioParam(1),
    })),
    createStereoPanner: vi.fn(() => ({
      ...mockConnectable(),
      pan: mockAudioParam(0),
    })),
    createAnalyser: vi.fn(() => ({
      ...mockConnectable(),
      fftSize: 256,
      smoothingTimeConstant: 0.35,
      getFloatTimeDomainData: vi.fn((buf: Float32Array) => {
        buf.fill(0);
      }),
    })),
    createChannelSplitter: vi.fn(() => mockConnectable()),
    createChannelMerger: vi.fn(() => mockConnectable()),
    ...overrides,
  } as unknown as AudioContext;
}

export function projectWithClipUnderPlayhead() {
  const project = createProjectSeed("p1", "Test", "2026-07-22T00:00:00.000Z");
  return {
    ...project,
    assets: [
      {
        id: "asset-1",
        storageName: "kick.wav",
        originalName: "kick.wav",
        kind: "audio" as const,
        mimeType: "audio/wav",
        sizeBytes: 100,
        durationMs: 1000,
      },
    ],
    audioTracks: [
      {
        id: "tr-1",
        name: "A1",
        muted: false,
        gainDb: 0,
      },
    ],
    audioClips: [
      {
        id: "clip-1",
        trackId: "tr-1",
        assetId: "asset-1",
        startTicks: 0,
        lengthTicks: 480,
        muted: false,
        gainDb: 0,
      },
    ],
  };
}

/** Common afterEach cleanup for audioPlayback test files. */
export function cleanupAudioPlayback() {
  allowAudioPlayback();
  stopAudioPlayback();
  clearAudioBufferCache();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
}
