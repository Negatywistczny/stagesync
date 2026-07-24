import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  allowAudioPlayback,
  assetFileUrl,
  clearAudioBufferCache,
  ensureAudioBuffered,
  getAudioPlaybackDebugState,
  getFailedAudioAssetIds,
  isAudioAssetDecodeFailed,
  loadAudioBuffer,
  restartAudioPlayback,
  resumeAndSyncAudioPlayback,
  stopAudioPlayback,
  suppressAudioPlayback,
  syncAudioPlayback,
} from "./audioPlayback.js";
import * as metronome from "./metronome.js";

function mockAudioParam(value = 1) {
  return {
    value,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
}

function mockConnectable() {
  return { connect: vi.fn(), disconnect: vi.fn() };
}

/** Minimal WebAudio graph stubs for sync / bus wiring. */
function mockAudioContext(
  overrides: Record<string, unknown> = {},
): AudioContext {
  return {
    state: "running",
    currentTime: 0,
    destination: {},
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

function projectWithClipUnderPlayhead() {
  const project = createProjectV5Seed("p1", "Test", "2026-07-22T00:00:00.000Z");
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

describe("audioPlayback helpers", () => {
  afterEach(() => {
    allowAudioPlayback();
    stopAudioPlayback();
    clearAudioBufferCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("builds asset file URL", () => {
    expect(assetFileUrl("proj/1", "a b")).toBe(
      "/api/projects/proj%2F1/assets/a%20b/file",
    );
  });

  it("suppress blocks re-schedule while playing flag still true (#352)", () => {
    const ctx = mockAudioContext({
      createBufferSource: vi.fn(() => {
        throw new Error("must not schedule while suppressed");
      }),
    });

    suppressAudioPlayback();
    expect(getAudioPlaybackDebugState().suppressed).toBe(true);

    const project = createProjectV5Seed("p1", "Test", "2026-07-22T00:00:00.000Z");
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 0 },
      ctx,
    );

    expect(getAudioPlaybackDebugState().activeCount).toBe(0);
    expect(ctx.createBufferSource).not.toHaveBeenCalled();

    allowAudioPlayback();
    expect(getAudioPlaybackDebugState().suppressed).toBe(false);
  });

  it("stopAudioPlayback clears active sources and bumps epoch", () => {
    const before = getAudioPlaybackDebugState().stopEpoch;
    stopAudioPlayback();
    const after = getAudioPlaybackDebugState();
    expect(after.activeCount).toBe(0);
    expect(after.stopEpoch).toBeGreaterThan(before);
  });

  it("sync with playing false does not schedule", () => {
    const ctx = mockAudioContext({
      createBufferSource: vi.fn(() => {
        throw new Error("must not schedule when paused");
      }),
    });

    const project = createProjectV5Seed("p1", "Test", "2026-07-22T00:00:00.000Z");
    syncAudioPlayback(
      "p1",
      { project, playing: false, displayTicks: 480 },
      ctx,
    );
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    expect(getAudioPlaybackDebugState().activeCount).toBe(0);
  });

  it("ensureAudioBuffered decodes clips under playhead (#365)", async () => {
    const fakeBuf = { duration: 1 } as AudioBuffer;
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const project = projectWithClipUnderPlayhead();
    const result = await ensureAudioBuffered("p1", project, 0, ctx);
    expect(result.ready).toBe(true);
    expect(result.failedAssetIds).toEqual([]);
    expect(ctx.decodeAudioData).toHaveBeenCalledOnce();
  });

  it("ensureAudioBuffered marks decode failures (#365)", async () => {
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => {
        throw new Error("bad wav");
      }),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const project = projectWithClipUnderPlayhead();
    const result = await ensureAudioBuffered("p1", project, 0, ctx);
    expect(result.ready).toBe(false);
    expect(result.failedAssetIds).toEqual(["asset-1"]);
    expect(isAudioAssetDecodeFailed("p1", "asset-1")).toBe(true);
    expect(getFailedAudioAssetIds("p1")).toEqual(["asset-1"]);
  });

  it("clearAudioBufferCache drops failed markers for project", async () => {
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => {
        throw new Error("bad");
      }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        arrayBuffer: async () => new ArrayBuffer(0),
      })),
    );
    const project = projectWithClipUnderPlayhead();
    await ensureAudioBuffered("p1", project, 0, ctx);
    expect(getFailedAudioAssetIds("p1")).toEqual(["asset-1"]);
    clearAudioBufferCache("p1");
    expect(getFailedAudioAssetIds("p1")).toEqual([]);
  });

  it("schedules fade ramps and loop window on BufferSource", async () => {
    const fakeBuf = { duration: 2, numberOfChannels: 2 } as AudioBuffer;
    const fadeParam = mockAudioParam(1);
    const source = {
      buffer: null as AudioBuffer | null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    const fadeGainNode = {
      gain: fadeParam,
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    const busGains: unknown[] = [];
    const ctx = mockAudioContext({
      currentTime: 10,
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => {
        const node = {
          gain: mockAudioParam(1),
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        busGains.push(node);
        // Master(1) + stereo track (gain, L, R, route) = 5; then fade + level.
        if (busGains.length === 6) return fadeGainNode;
        return node;
      }),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const project = {
      ...projectWithClipUnderPlayhead(),
      assets: [
        {
          id: "asset-1",
          storageName: "kick.wav",
          originalName: "kick.wav",
          kind: "audio" as const,
          mimeType: "audio/wav",
          sizeBytes: 100,
          durationMs: 2000,
        },
      ],
      audioClips: [
        {
          id: "clip-1",
          trackId: "tr-1",
          assetId: "asset-1",
          startTicks: 0,
          lengthTicks: 1920,
          muted: false,
          gainDb: 0,
          trimInMs: 100,
          trimOutMs: 200,
          fadeInMs: 200,
          fadeOutMs: 100,
          loop: true,
        },
      ],
    };

    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 0 },
      ctx,
    );

    expect(source.loop).toBe(true);
    expect(source.loopStart).toBeCloseTo(0.1, 5);
    expect(source.loopEnd).toBeCloseTo(1.8, 5);
    expect(fadeParam.setValueAtTime).toHaveBeenCalled();
    expect(fadeParam.linearRampToValueAtTime).toHaveBeenCalled();
    expect(source.start).toHaveBeenCalledOnce();
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
    // Default stereo track → True Balance (splitter + merger), not StereoPanner.
    expect(ctx.createChannelSplitter).toHaveBeenCalled();
    expect(ctx.createChannelMerger).toHaveBeenCalled();
    expect(ctx.createStereoPanner).not.toHaveBeenCalled();
  });

  it("mono track uses StereoPanner; stereo file gets −3 dB downmix", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
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

    const project = {
      ...projectWithClipUnderPlayhead(),
      audioTracks: [
        {
          id: "tr-1",
          name: "A1",
          muted: false,
          gainDb: 0,
          channelMode: "mono" as const,
        },
      ],
    };

    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 0 },
      ctx,
    );

    expect(ctx.createStereoPanner).toHaveBeenCalled();
    // Master meter split + stereo→mono downmix splitter.
    expect(ctx.createChannelSplitter).toHaveBeenCalled();
    expect(
      (ctx.createChannelSplitter as ReturnType<typeof vi.fn>).mock.calls
        .length,
    ).toBeGreaterThanOrEqual(2);
    expect(source.start).toHaveBeenCalledOnce();
  });

  it("restartAudioPlayback re-arms graph after stop", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 1, sampleRate: 48000 };
    const source = {
      buffer: null as unknown,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
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
    stopAudioPlayback();
    allowAudioPlayback();
    restartAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 0 },
      ctx,
    );
    expect(source.start).toHaveBeenCalled();
  });

  it("late decode after clearAudioBufferCache does not re-pollute cache", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    let finishDecode: (buf: AudioBuffer) => void = () => {};
    const decodePromise = new Promise<AudioBuffer>((resolve) => {
      finishDecode = resolve;
    });
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(() => decodePromise),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const loadPromise = loadAudioBuffer("p1", "asset-1", ctx);
    clearAudioBufferCache("p1");
    finishDecode(fakeBuf);
    await expect(loadPromise).resolves.toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false })),
    );
    clearAudioBufferCache("p1");
    await expect(loadAudioBuffer("p1", "asset-1", ctx)).resolves.toBeNull();
  });

  it("resumeAndSync skips start when suppressed during AudioContext resume", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    let finishResume: () => void = () => {};
    const resumePromise = new Promise<void>((resolve) => {
      finishResume = resolve;
    });
    const ctx = mockAudioContext({
      state: "running",
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => source),
    });
    vi.spyOn(metronome, "getMetronomeAudioContext").mockReturnValue(ctx);
    vi.spyOn(metronome, "resumeMetronomeAudio").mockImplementation(
      () => resumePromise,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const project = projectWithClipUnderPlayhead();
    await ensureAudioBuffered("p1", project, 0, ctx);
    const pending = resumeAndSyncAudioPlayback("p1", {
      project,
      playing: true,
      displayTicks: 0,
    });
    suppressAudioPlayback();
    finishResume();
    await pending;
    expect(source.start).not.toHaveBeenCalled();
  });

  it("restartAudioPlayback is a no-op while suppressed", async () => {
    const source = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    const ctx = mockAudioContext({
      createBufferSource: vi.fn(() => source),
      decodeAudioData: vi.fn(async () => ({
        duration: 1,
        numberOfChannels: 2,
      })),
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
    suppressAudioPlayback();
    restartAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 0 },
      ctx,
    );
    expect(source.start).not.toHaveBeenCalled();
  });

  it("stereo bus gain forces explicit 2-ch upmix for mono files", async () => {
    const fakeMono = { duration: 1, numberOfChannels: 1 } as AudioBuffer;
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeMono),
      createBufferSource: vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      })),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );
    const project = {
      ...projectWithClipUnderPlayhead(),
      audioTracks: [
        {
          id: "tr-1",
          name: "Stereo",
          muted: false,
          gainDb: 0,
          channelMode: "stereo" as const,
        },
      ],
    };
    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    const gains = (ctx.createGain as ReturnType<typeof vi.fn>).mock.results.map(
      (r) => r.value as { channelCount?: number; channelCountMode?: string },
    );
    // Master gain is [0]; stereo track input gain is [1].
    expect(gains[1]?.channelCount).toBe(2);
    expect(gains[1]?.channelCountMode).toBe("explicit");
  });

  it("clip gainDb change updates level live without stopping source", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    const levelParams: ReturnType<typeof mockAudioParam>[] = [];
    let gainCount = 0;
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => {
        gainCount += 1;
        const param = mockAudioParam(1);
        // Master(1) + stereo (4) + fade(6) + level(7)
        if (gainCount === 7) levelParams.push(param);
        return {
          ...mockConnectable(),
          gain: param,
        };
      }),
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
    expect(source.start).toHaveBeenCalledOnce();
    expect(levelParams[0]?.value).toBeCloseTo(1, 5);

    const quieter = structuredClone(project);
    quieter.audioClips[0]!.gainDb = -6;
    syncAudioPlayback(
      "p1",
      { project: quieter, playing: true, displayTicks: 10 },
      ctx,
    );
    expect(source.stop).not.toHaveBeenCalled();
    expect(levelParams[0]?.value).toBeCloseTo(10 ** (-6 / 20), 5);
  });

  it("cold buffer seek starts clip after decode completes", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    let finishDecode: (buf: AudioBuffer) => void = () => {};
    const decodePromise = new Promise<AudioBuffer>((resolve) => {
      finishDecode = resolve;
    });
    const source = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(() => decodePromise),
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
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    expect(source.start).not.toHaveBeenCalled();
    finishDecode(fakeBuf);
    await vi.waitFor(() => {
      expect(source.start).toHaveBeenCalledOnce();
    });
  });

  it("fade-out zone start anchors setValueAtTime below unity", async () => {
    const fakeBuf = { duration: 2, numberOfChannels: 2 } as AudioBuffer;
    const fadeParam = mockAudioParam(1);
    const source = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    let gainCount = 0;
    const ctx = mockAudioContext({
      currentTime: 10,
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => {
        gainCount += 1;
        if (gainCount === 6) {
          return { ...mockConnectable(), gain: fadeParam };
        }
        return { ...mockConnectable(), gain: mockAudioParam(1) };
      }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );
    const project = {
      ...projectWithClipUnderPlayhead(),
      assets: [
        {
          id: "asset-1",
          storageName: "kick.wav",
          originalName: "kick.wav",
          kind: "audio" as const,
          mimeType: "audio/wav",
          sizeBytes: 100,
          durationMs: 2000,
        },
      ],
      audioClips: [
        {
          id: "clip-1",
          trackId: "tr-1",
          assetId: "asset-1",
          startTicks: 0,
          // 2s @ 120 BPM / ppq 960 → covers fade-out zone of 500ms.
          lengthTicks: 3840,
          muted: false,
          gainDb: 0,
          fadeInMs: 0,
          fadeOutMs: 500,
        },
      ],
    };
    await ensureAudioBuffered("p1", project, 0, ctx);
    // ~1.75s into clip (fade-out 500ms on 2s → envelope 0.5).
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 3360 },
      ctx,
    );
    expect(fadeParam.setValueAtTime).toHaveBeenCalled();
    const initial = fadeParam.setValueAtTime.mock.calls[0]![0] as number;
    expect(initial).toBeLessThan(1);
    expect(initial).toBeGreaterThanOrEqual(0);
  });
});
