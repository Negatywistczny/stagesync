import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectV5Seed, projectEndTicks } from "@stagesync/shared";
import {
  allowAudioPlayback,
  assetFileUrl,
  busSoloMutesBus,
  clearAudioBufferCache,
  ensureAudioBuffered,
  fireCueSampleGo,
  getAudioPlaybackDebugState,
  getFailedAudioAssetIds,
  isAudioAssetDecodeFailed,
  loadAudioBuffer,
  panicCueSamples,
  readHwOutMeterDb,
  readTrackMeterDb,
  restartAudioPlayback,
  resumeAndSyncAudioPlayback,
  shouldSoftStopPastSongEnd,
  stopAudioPlayback,
  suppressAudioPlayback,
  syncAudioPlayback,
} from "./audioPlayback.js";
import * as metronome from "./metronome.js";

function mockAudioParam(value = 1) {
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

function mockConnectable() {
  return { connect: vi.fn(), disconnect: vi.fn() };
}

/** Minimal WebAudio graph stubs for sync / bus wiring. */
function mockAudioContext(
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

  it("BUG-05: soft-stops WebAudio past song end while server still playing", async () => {
    const fakeBuf = { duration: 10, numberOfChannels: 2 } as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
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
    const endTicks = projectEndTicks(project);
    // Extend clip through song end so a source is active until soft-stop.
    project.audioClips[0] = {
      ...project.audioClips[0]!,
      lengthTicks: endTicks,
    };

    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 0 },
      ctx,
    );
    expect(source.start).toHaveBeenCalledOnce();
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);

    // Server still `playing` during pause-at-end / auto-advance I/O.
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: endTicks },
      ctx,
    );
    expect(source.stop).toHaveBeenCalled();
    expect(getAudioPlaybackDebugState().activeCount).toBe(0);
    expect(getAudioPlaybackDebugState().suppressed).toBe(false);

    // Soft-stop must not latch suppress — seek/home before pause can resume.
    const source2 = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    (ctx.createBufferSource as ReturnType<typeof vi.fn>).mockImplementation(
      () => source2,
    );
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 0 },
      ctx,
    );
    expect(source2.start).toHaveBeenCalledOnce();
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
  });

  it("WA-MEM-02: stop assigns empty buffer to release decoded PCM", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    const emptyBuf = { duration: 0, numberOfChannels: 1 } as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
      context: null as AudioContext | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBuffer: vi.fn(() => emptyBuf),
      createBufferSource: vi.fn(() => {
        source.context = ctx;
        return source;
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
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 0 },
      ctx,
    );
    expect(source.buffer).toBe(fakeBuf);
    stopAudioPlayback();
    expect(source.stop).toHaveBeenCalled();
    expect(source.buffer).toBe(emptyBuf);
    expect(ctx.createBuffer).toHaveBeenCalled();
  });

  it("BUG-05: song-end soft-stop respects loopEnabled", () => {
    const project = projectWithClipUnderPlayhead();
    const endTicks = projectEndTicks(project);
    expect(
      shouldSoftStopPastSongEnd({
        project,
        playing: true,
        displayTicks: endTicks,
      }),
    ).toBe(true);
    expect(
      shouldSoftStopPastSongEnd({
        project,
        playing: true,
        displayTicks: endTicks,
        loopEnabled: true,
      }),
    ).toBe(false);
    expect(
      shouldSoftStopPastSongEnd({
        project,
        playing: true,
        displayTicks: endTicks - 1,
      }),
    ).toBe(false);
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

  it("DEF-BUG-04: track solo wins — bus solo does not mute destination bus", async () => {
    expect(busSoloMutesBus("bus-b", undefined, ["bus-a"])).toBe(true);
    expect(busSoloMutesBus("bus-a", undefined, ["bus-a"])).toBe(false);
    expect(busSoloMutesBus("bus-b", ["tr-1"], ["bus-a"])).toBe(false);
    expect(busSoloMutesBus("bus-b", [], ["bus-a"])).toBe(true);

    const fakeBuf = { duration: 10, numberOfChannels: 2 } as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
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

    const base = projectWithClipUnderPlayhead();
    const project = {
      ...base,
      audioBusses: [
        { id: "bus-a", name: "Bus A", gainDb: 0 },
        { id: "bus-b", name: "Bus B", gainDb: 0 },
      ],
      audioTracks: [
        {
          ...base.audioTracks[0]!,
          output: { kind: "bus" as const, busId: "bus-b" },
        },
      ],
    };

    await ensureAudioBuffered("p1", project, 0, ctx);

    // Bus-only solo on bus-a: destination bus-b is muted.
    syncAudioPlayback(
      "p1",
      {
        project,
        playing: true,
        displayTicks: 0,
        soloBusIds: ["bus-a"],
      },
      ctx,
    );
    expect(getAudioPlaybackDebugState().groupBusGainLinear["bus-b"]).toBe(0);
    expect(getAudioPlaybackDebugState().activeCount).toBe(0);

    // Cross-solo: track on bus-b + bus-a solo — track wins, bus-b stays audible.
    syncAudioPlayback(
      "p1",
      {
        project,
        playing: true,
        displayTicks: 0,
        soloTrackIds: ["tr-1"],
        soloBusIds: ["bus-a"],
      },
      ctx,
    );
    expect(getAudioPlaybackDebugState().groupBusGainLinear["bus-b"]).toBe(1);
    expect(getAudioPlaybackDebugState().groupBusGainLinear["bus-a"]).toBe(1);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
    expect(source.start).toHaveBeenCalled();
  });

  it("fader apply dezippers GainNode (no instant .value while graph live)", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    const trackGainParams: ReturnType<typeof mockAudioParam>[] = [];
    let gainCount = 0;
    const ctx = mockAudioContext({
      currentTime: 1.5,
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => {
        gainCount += 1;
        const param = mockAudioParam(1);
        // Master(1) + mono track gain(2) …
        if (gainCount === 2) trackGainParams.push(param);
        return { ...mockConnectable(), gain: param };
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
    const gainParam = trackGainParams[0]!;
    gainParam.linearRampToValueAtTime.mockClear();
    gainParam.setValueAtTime.mockClear();
    gainParam.cancelScheduledValues.mockClear();

    suppressAudioPlayback();
    const quieter = structuredClone(project);
    quieter.audioTracks[0]!.gainDb = -6;
    syncAudioPlayback(
      "p1",
      { project: quieter, playing: true, displayTicks: 0 },
      ctx,
    );

    expect(gainParam.cancelScheduledValues).toHaveBeenCalled();
    expect(gainParam.setValueAtTime).toHaveBeenCalled();
    expect(gainParam.linearRampToValueAtTime).toHaveBeenCalledWith(
      expect.closeTo(10 ** (-6 / 20), 5),
      expect.closeTo(1.5 + 0.012, 5),
    );
  });

  it("track output rewire skips disconnect when destination unchanged", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    const routeDisconnects: ReturnType<typeof vi.fn>[] = [];
    let gainCount = 0;
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => {
        gainCount += 1;
        const node = { ...mockConnectable(), gain: mockAudioParam(1) };
        // Mono: gain(2), route(3) after master(1)
        if (gainCount === 3) routeDisconnects.push(node.disconnect);
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
    const project = projectWithClipUnderPlayhead();
    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    const routeDisconnect = routeDisconnects[0]!;
    routeDisconnect.mockClear();

    syncAudioPlayback("p1", { project, playing: true, displayTicks: 10 }, ctx);
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 20 }, ctx);
    expect(routeDisconnect).not.toHaveBeenCalled();
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

    let project = createProjectV5Seed("p1", "Cue", "2026-07-25T00:00:00.000Z");
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
    expect(Number.isFinite(readTrackMeterDb("tr-1").l)).toBe(true);
  });

  it("advancing playhead past clip end releases active source", async () => {
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
    const clip = project.audioClips[0]!;
    const past = clip.startTicks + clip.lengthTicks + 5000;
    syncAudioPlayback("p1", { project, playing: true, displayTicks: past }, ctx);
    expect(getAudioPlaybackDebugState().activeCount).toBe(0);
    expect(source.stop).toHaveBeenCalled();
  });

  it("routes track output to hardware out bus (ensureHwOutBus)", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    const hwConnects: Array<{ node: unknown; args: unknown[] }> = [];
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
      createChannelMerger: vi.fn(() => {
        const node = {
          connect: vi.fn((...args: unknown[]) => {
            hwConnects.push({ node, args });
          }),
          disconnect: vi.fn(),
        };
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
    let project = createProjectV5Seed("p1", "HW", "2026-07-25T00:00:00.000Z");
    project = {
      ...project,
      audioHardwareOutputs: [
        {
          id: "hw-1",
          name: "Out 1",
          channelMode: "stereo",
          channelOffset: 0,
        },
      ],
      assets: [
        {
          id: "asset-1",
          storageName: "kick.wav",
          originalName: "kick.wav",
          kind: "audio",
          mimeType: "audio/wav",
          sizeBytes: 100,
          durationMs: 1000,
        },
      ],
      audioTracks: [
        {
          id: "tr-1",
          name: "Track",
          output: { kind: "hw_out", hwOutputId: "hw-1" },
        },
      ],
      audioClips: [
        {
          id: "clip-1",
          trackId: "tr-1",
          assetId: "asset-1",
          startTicks: 0,
          lengthTicks: 3840,
          muted: false,
          gainDb: 0,
        },
      ],
    };
    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    expect(readHwOutMeterDb("hw-1").l).toBeLessThanOrEqual(0);
    expect(hwConnects.length).toBeGreaterThan(0);
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

    let project = createProjectV5Seed("p1", "Cue", "2026-07-25T00:00:00.000Z");
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

  it("adding empty buses does not restart voices or raise track gain", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
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

    let project = projectWithClipUnderPlayhead();
    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);

    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
    expect(getAudioPlaybackDebugState().trackGainLinear["tr-1"]).toBe(1);
    const startsBefore = (ctx.createBufferSource as ReturnType<typeof vi.fn>)
      .mock.calls.length;
    source.stop.mockClear();

    for (let i = 0; i < 3; i++) {
      project = {
        ...project,
        audioBusses: [
          ...(project.audioBusses ?? []),
          { id: `bus-${i}`, name: `Bus ${i + 1}`, gainDb: 0 },
        ],
      };
      syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    }

    // Empty buses must not rebuild the clip graph (no stop / re-start).
    expect(source.stop).not.toHaveBeenCalled();
    expect(
      (ctx.createBufferSource as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(startsBefore);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
    expect(getAudioPlaybackDebugState().trackGainLinear["tr-1"]).toBe(1);
    // Group buses exist at unity but carry no track sends.
    expect(getAudioPlaybackDebugState().groupBusGainLinear["bus-0"]).toBe(1);
    expect(getAudioPlaybackDebugState().groupBusGainLinear["bus-2"]).toBe(1);
  });

  it("releaseActiveSource still detaches levelGain if source.disconnect throws", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 1 } as AudioBuffer;
    const gainDisconnects: ReturnType<typeof vi.fn>[] = [];
    const source = {
      buffer: null as AudioBuffer | null,
      context: { sampleRate: 44100 } as BaseAudioContext,
      connect: vi.fn(),
      disconnect: vi.fn(() => {
        throw new DOMException("already disconnected", "InvalidAccessError");
      }),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => {
        const disconnect = vi.fn();
        gainDisconnects.push(disconnect);
        return { connect: vi.fn(), disconnect, gain: mockAudioParam(1) };
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
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
    const before = gainDisconnects.reduce(
      (n, d) => n + d.mock.calls.length,
      0,
    );

    // Mute track → graphKey change → stopAll → releaseActiveSource.
    const muted = {
      ...project,
      audioTracks: [{ ...project.audioTracks[0]!, muted: true }],
    };
    syncAudioPlayback("p1", { project: muted, playing: true, displayTicks: 0 }, ctx);

    const after = gainDisconnects.reduce(
      (n, d) => n + d.mock.calls.length,
      0,
    );
    // fadeGain + levelGain (at least) must disconnect even though source threw.
    expect(after).toBeGreaterThan(before);
    expect(getAudioPlaybackDebugState().activeCount).toBe(0);
  });

  it("removing empty buses keeps track gain at unity", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
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

    const base = projectWithClipUnderPlayhead();
    const withBuses = {
      ...base,
      audioBusses: [
        { id: "bus-a", name: "Bus A", gainDb: 0 },
        { id: "bus-b", name: "Bus B", gainDb: 0 },
      ],
    };
    await ensureAudioBuffered("p1", withBuses, 0, ctx);
    syncAudioPlayback("p1", { project: withBuses, playing: true, displayTicks: 0 }, ctx);
    expect(getAudioPlaybackDebugState().trackGainLinear["tr-1"]).toBe(1);

    syncAudioPlayback(
      "p1",
      { project: { ...withBuses, audioBusses: [] }, playing: true, displayTicks: 0 },
      ctx,
    );
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
    expect(getAudioPlaybackDebugState().trackGainLinear["tr-1"]).toBe(1);
    expect(getAudioPlaybackDebugState().groupBusGainLinear).toEqual({});
  });

  it("stale BufferSource ended does not drop a replacement voice for the same clip", async () => {
    const fakeBuf = { duration: 2, numberOfChannels: 2 } as AudioBuffer;
    const sources: Array<{
      buffer: AudioBuffer | null;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      onended: (() => void) | null;
      context: BaseAudioContext;
    }> = [];
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => {
        const source = {
          buffer: null as AudioBuffer | null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          onended: null as (() => void) | null,
          context: { sampleRate: 44100 } as BaseAudioContext,
        };
        sources.push(source);
        return source;
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
    expect(sources).toHaveLength(1);
    const staleEnded = sources[0]!.onended;
    expect(staleEnded).toEqual(expect.any(Function));

    // Graph rebuild (mute) stops voice 1 and starts voice 2 for the same clip.
    const muted = {
      ...project,
      audioTracks: [{ ...project.audioTracks[0]!, muted: true }],
    };
    syncAudioPlayback("p1", { project: muted, playing: true, displayTicks: 0 }, ctx);
    expect(getAudioPlaybackDebugState().activeCount).toBe(0);

    const unmuted = {
      ...project,
      audioTracks: [{ ...project.audioTracks[0]!, muted: false }],
    };
    syncAudioPlayback("p1", { project: unmuted, playing: true, displayTicks: 0 }, ctx);
    expect(sources).toHaveLength(2);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);

    // Old source's ended must not clear the new voice (clipId collision bug).
    staleEnded!();
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);

    // Sync must not re-start another BufferSource for a still-active clip.
    const startsBefore = sources.length;
    syncAudioPlayback("p1", { project: unmuted, playing: true, displayTicks: 10 }, ctx);
    expect(sources).toHaveLength(startsBefore);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
  });

  it("seek while playing tears down prior voice and does not stack overlaps", async () => {
    // Long clip so playhead stays inside after large seeks (> SEEK_JUMP_TICKS).
    const fakeBuf = { duration: 10, numberOfChannels: 2 } as AudioBuffer;
    const sources: Array<{
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      onended: (() => void) | null;
      context: BaseAudioContext;
      buffer: AudioBuffer | null;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => {
        const source = {
          buffer: null as AudioBuffer | null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          onended: null as (() => void) | null,
          context: { sampleRate: 44100 } as BaseAudioContext,
        };
        sources.push(source);
        return source;
      }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const seed = projectWithClipUnderPlayhead();
    const project = {
      ...seed,
      assets: [
        {
          ...seed.assets[0]!,
          durationMs: 10_000,
        },
      ],
      audioClips: [
        {
          ...seed.audioClips[0]!,
          lengthTicks: 960 * 16,
        },
      ],
    };
    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    expect(sources).toHaveLength(1);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
    const first = sources[0]!;
    const staleEnded = first.onended;

    // Scrub jump while playing — prior BufferSource must stop before reschedule.
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 960 }, ctx);
    expect(first.stop).toHaveBeenCalled();
    expect(first.onended).toBeNull();
    expect(sources).toHaveLength(2);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);

    // Late ended from the torn-down voice must not drop the post-seek voice
    // (would re-schedule on next tick → stacked overlapping playback).
    staleEnded?.();
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);

    syncAudioPlayback("p1", { project, playing: true, displayTicks: 1920 }, ctx);
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 2880 }, ctx);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
    expect(sources).toHaveLength(4);
    expect(sources[1]!.stop).toHaveBeenCalled();
    expect(sources[2]!.stop).toHaveBeenCalled();
    expect(sources[3]!.stop).not.toHaveBeenCalled();

    // Small tick advance (no seek jump) must not start another voice.
    const n = sources.length;
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 2890 }, ctx);
    expect(sources).toHaveLength(n);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
  });

  it("dezipper skips re-ramp when the same target is already scheduled", () => {
    const gains: ReturnType<typeof mockAudioParam>[] = [];
    const ctx = mockAudioContext({
      createGain: vi.fn(() => {
        const g = mockAudioParam(1);
        gains.push(g);
        return { ...mockConnectable(), gain: g };
      }),
    });

    const project = {
      ...projectWithClipUnderPlayhead(),
      masterGainDb: -6,
    };
    syncAudioPlayback("p1", { project, playing: false, displayTicks: 0 }, ctx);
    expect(gains.length).toBeGreaterThan(0);
    // Master is the first GainNode in ensureMasterBus.
    const masterParam = gains[0]!;
    const cancelsAfterFirst = masterParam.cancelScheduledValues.mock.calls.length;
    expect(cancelsAfterFirst).toBeGreaterThan(0);

    // Same master gain on later ticks must not cancel/re-ramp.
    syncAudioPlayback("p1", { project, playing: false, displayTicks: 0 }, ctx);
    syncAudioPlayback("p1", { project, playing: false, displayTicks: 0 }, ctx);
    expect(masterParam.cancelScheduledValues.mock.calls.length).toBe(
      cancelsAfterFirst,
    );
  });

  it("deleting clip while playing mutes gains and releases voice", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    const fadeParam = mockAudioParam(0.75);
    const levelParam = mockAudioParam(1);
    const source = {
      buffer: null as AudioBuffer | null,
      context: null as AudioContext | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    let gainCount = 0;
    const ctx = mockAudioContext({
      currentTime: 5,
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => {
        source.context = ctx;
        return source;
      }),
      createGain: vi.fn(() => {
        gainCount += 1;
        // Master(1) + stereo track (gain, L, R, route) = 5; fade(6) + level(7)
        if (gainCount === 6) {
          return { ...mockConnectable(), gain: fadeParam };
        }
        if (gainCount === 7) {
          return { ...mockConnectable(), gain: levelParam };
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

    const project = projectWithClipUnderPlayhead();
    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);

    fadeParam.cancelScheduledValues.mockClear();
    fadeParam.setValueAtTime.mockClear();
    levelParam.cancelScheduledValues.mockClear();
    levelParam.setValueAtTime.mockClear();
    source.stop.mockClear();
    source.disconnect.mockClear();

    const withoutClip = { ...project, audioClips: [] as typeof project.audioClips };
    syncAudioPlayback(
      "p1",
      { project: withoutClip, playing: true, displayTicks: 0 },
      ctx,
    );

    expect(source.stop).toHaveBeenCalled();
    expect(source.disconnect).toHaveBeenCalled();
    expect(fadeParam.cancelScheduledValues).toHaveBeenCalledWith(5);
    expect(fadeParam.setValueAtTime).toHaveBeenCalledWith(0, 5);
    expect(levelParam.cancelScheduledValues).toHaveBeenCalledWith(5);
    expect(levelParam.setValueAtTime).toHaveBeenCalledWith(0, 5);
    expect(getAudioPlaybackDebugState().activeCount).toBe(0);
  });

  it("graph change restarts remaining clips after stopEpoch bump", async () => {
    const fakeBuf = { duration: 10, numberOfChannels: 2 } as AudioBuffer;
    const sources: Array<{
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(() => {
        const source = {
          buffer: null as AudioBuffer | null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          onended: null as (() => void) | null,
          context: { sampleRate: 44100, currentTime: 0 } as BaseAudioContext,
        };
        sources.push(source);
        return source;
      }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const base = projectWithClipUnderPlayhead();
    const project = {
      ...base,
      assets: [
        ...base.assets,
        {
          id: "asset-2",
          storageName: "snare.wav",
          originalName: "snare.wav",
          kind: "audio" as const,
          mimeType: "audio/wav",
          sizeBytes: 100,
          durationMs: 10_000,
        },
      ],
      audioClips: [
        base.audioClips[0]!,
        {
          id: "clip-2",
          trackId: "tr-1",
          assetId: "asset-2",
          startTicks: 0,
          lengthTicks: 960 * 16,
          muted: false,
          gainDb: 0,
        },
      ],
    };
    await ensureAudioBuffered("p1", project, 0, ctx);
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    expect(getAudioPlaybackDebugState().activeCount).toBe(2);
    expect(sources).toHaveLength(2);

    const withoutFirst = {
      ...project,
      audioClips: project.audioClips.filter((c) => c.id !== "clip-1"),
    };
    syncAudioPlayback(
      "p1",
      { project: withoutFirst, playing: true, displayTicks: 0 },
      ctx,
    );

    expect(sources[0]!.stop).toHaveBeenCalled();
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
    expect(sources).toHaveLength(3);
    expect(sources[2]!.start).toHaveBeenCalled();
  });

  it("in-flight decode for deleted clip does not start after delete", async () => {
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
      context: { sampleRate: 44100, currentTime: 0 } as BaseAudioContext,
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

    const withoutClip = { ...project, audioClips: [] as typeof project.audioClips };
    syncAudioPlayback(
      "p1",
      { project: withoutClip, playing: true, displayTicks: 0 },
      ctx,
    );
    expect(getAudioPlaybackDebugState().activeCount).toBe(0);

    finishDecode(fakeBuf);
    await vi.waitFor(() => {
      expect(ctx.decodeAudioData).toHaveBeenCalled();
    });
    expect(source.start).not.toHaveBeenCalled();
    expect(getAudioPlaybackDebugState().activeCount).toBe(0);
  });
});
