import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectSeed } from "@stagesync/shared";
import {
  ensureAudioBuffered,
  fireCueSampleGo,
  getAudioPlaybackDebugState,
  panicCueSamples,
  readHwOutMeterDb,
  readTrackMeterDb,
  stopAudioPlayback,
  syncAudioPlayback,
} from "./audioPlayback.js";
import {
  cleanupAudioPlayback,
  mockAudioContext,
  projectWithClipUnderPlayhead,
} from "./audioPlayback.test-helpers.js";

describe("audioPlayback — cue samples & metering", () => {
  afterEach(() => {
    cleanupAudioPlayback();
  });

  it("cue sample GO starts one-shot; panic clears; playPostStop survives stop", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 1, sampleRate: 48000 };
    const makeSource = () => ({
      buffer: null as unknown,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    });
    const sources: ReturnType<typeof makeSource>[] = [];
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => {
        const s = makeSource();
        sources.push(s);
        return s;
      }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    let project = createProjectSeed("p1", "Cue", "2026-07-25T00:00:00.000Z");
    project = {
      ...project,
      assets: [
        {
          id: "hit",
          storageName: "hit.wav",
          originalName: "hit.wav",
          kind: "audio",
          mimeType: "audio/wav",
          sizeBytes: 8,
        },
      ],
      cue: {
        clips: [
          {
            id: "cue-1",
            startTicks: 0,
            lengthTicks: 960,
            label: "Hit",
            sample: {
              assetId: "hit",
              mode: "one-shot",
              quantization: "immediate",
              playPostStop: true,
            },
          },
        ],
      },
    };

    await ensureAudioBuffered("p1", project, 0, ctx);
    expect(fireCueSampleGo("p1", project, "cue-1", 0, ctx)).toBe(true);
    expect(getAudioPlaybackDebugState().activeCueCount).toBe(1);
    expect(sources[0]?.start).toHaveBeenCalled();

    stopAudioPlayback();
    expect(getAudioPlaybackDebugState().activeCueCount).toBe(1);

    panicCueSamples();
    expect(getAudioPlaybackDebugState().activeCueCount).toBe(0);
    expect(sources[0]?.stop).toHaveBeenCalled();
  });

  it("readTrackMeterDb returns floor without bus; live peaks after sync", async () => {
    expect(readTrackMeterDb("ghost").l).toBeLessThanOrEqual(-59.9);
    expect(readHwOutMeterDb("missing-hw").l).toBeLessThanOrEqual(-59.9);

    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    const source = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
      buffer: null as AudioBuffer | null,
    };
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => source),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const project = projectWithClipUnderPlayhead();
    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
    const meter = readTrackMeterDb("tr-1");
    expect(meter).toHaveProperty("l");
    expect(meter).toHaveProperty("r");
  });

  it("cue GO next-beat defers start; choke stops prior one-shot", async () => {
    vi.useFakeTimers();
    const timeouts: Array<{ fn: () => void; ms: number }> = [];
    vi.stubGlobal("window", {
      setTimeout: (fn: () => void, ms: number) => {
        timeouts.push({ fn, ms });
        return 0;
      },
    });
    const fakeBuf = { duration: 1, numberOfChannels: 1, sampleRate: 48000 };
    const makeSource = () => ({
      buffer: null as unknown,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    });
    const sources: ReturnType<typeof makeSource>[] = [];
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => {
        const s = makeSource();
        sources.push(s);
        return s;
      }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    let project = createProjectSeed("p1", "Cue", "2026-07-25T00:00:00.000Z");
    project = {
      ...project,
      assets: [
        {
          id: "hit",
          storageName: "hit.wav",
          originalName: "hit.wav",
          kind: "audio",
          mimeType: "audio/wav",
          sizeBytes: 8,
        },
      ],
      cue: {
        clips: [
          {
            id: "cue-beat",
            startTicks: 0,
            lengthTicks: 960,
            label: "Hit",
            sample: {
              assetId: "hit",
              mode: "one-shot",
              quantization: "next-beat",
            },
          },
          {
            id: "cue-choke",
            startTicks: 0,
            lengthTicks: 960,
            label: "Choke",
            sample: {
              assetId: "hit",
              mode: "one-shot",
              quantization: "immediate",
              polyphony: "choke",
            },
          },
        ],
      },
    };
    await ensureAudioBuffered("p1", project, 0, ctx);

    expect(fireCueSampleGo("p1", project, "cue-beat", 100, ctx)).toBe(true);
    expect(sources).toHaveLength(0);
    expect(timeouts.length).toBeGreaterThan(0);
    timeouts[0]!.fn();
    expect(sources[0]?.start).toHaveBeenCalled();

    expect(fireCueSampleGo("p1", project, "cue-choke", 0, ctx)).toBe(true);
    expect(fireCueSampleGo("p1", project, "cue-choke", 0, ctx)).toBe(true);
    expect(sources[1]?.stop).toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
