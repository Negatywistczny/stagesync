import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectSeed, projectEndTicks } from "@stagesync/shared";
import {
  allowAudioPlayback,
  clearAudioBufferCache,
  ensureAudioBuffered,
  getAudioPlaybackDebugState,
  loadAudioBuffer,
  restartAudioPlayback,
  resumeAndSyncAudioPlayback,
  shouldSoftStopPastSongEnd,
  stopAudioPlayback,
  suppressAudioPlayback,
  syncAudioPlayback,
} from "./audioPlayback.js";
import * as metronome from "./metronome.js";
import {
  cleanupAudioPlayback,
  mockAudioContext,
  mockAudioParam,
  mockConnectable,
  projectWithClipUnderPlayhead,
} from "./audioPlayback.test-helpers.js";

describe("audioPlayback — sync engine", () => {
  afterEach(() => {
    cleanupAudioPlayback();
  });

  it("suppress blocks re-schedule while playing flag still true (#352)", () => {
    const ctx = mockAudioContext({
      createBufferSource: vi.fn(() => {
        throw new Error("must not schedule while suppressed");
      }),
    });

    suppressAudioPlayback();
    expect(getAudioPlaybackDebugState().suppressed).toBe(true);

    const project = createProjectSeed("p1", "Test", "2026-07-22T00:00:00.000Z");
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);

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
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
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
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    expect(source2.start).toHaveBeenCalledOnce();
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
  });

  it("WA-MEM-02: stop assigns empty buffer to release decoded PCM", async () => {
    const fakeBuf = { duration: 1, numberOfChannels: 2 } as AudioBuffer;
    const emptyBuf = { duration: 0, numberOfChannels: 1 } as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
      context: null as AudioContext | null,
    };
    const ctx = mockAudioContext({
      decodeAudioData: vi.fn(async () => fakeBuf),
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
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);
    expect(source.buffer).toBe(fakeBuf);

    stopAudioPlayback();
    expect(source.stop).toHaveBeenCalled();
    expect(source.buffer).not.toBe(fakeBuf);
    expect(source.buffer).toEqual(emptyBuf);
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

    const project = createProjectSeed("p1", "Test", "2026-07-22T00:00:00.000Z");
    syncAudioPlayback(
      "p1",
      { project, playing: false, displayTicks: 480 },
      ctx,
    );
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    expect(getAudioPlaybackDebugState().activeCount).toBe(0);
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
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);

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
    syncAudioPlayback("p1", { project, playing: true, displayTicks: 0 }, ctx);

    expect(ctx.createStereoPanner).toHaveBeenCalled();
    // Master meter split + stereo→mono downmix splitter.
    expect(ctx.createChannelSplitter).toHaveBeenCalled();
    expect(
      (ctx.createChannelSplitter as ReturnType<typeof vi.fn>).mock.calls.length,
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
    const cancelsAfterFirst =
      masterParam.cancelScheduledValues.mock.calls.length;
    expect(cancelsAfterFirst).toBeGreaterThan(0);

    // Same master gain on later ticks must not cancel/re-ramp.
    syncAudioPlayback("p1", { project, playing: false, displayTicks: 0 }, ctx);
    syncAudioPlayback("p1", { project, playing: false, displayTicks: 0 }, ctx);
    expect(masterParam.cancelScheduledValues.mock.calls.length).toBe(
      cancelsAfterFirst,
    );
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
    syncAudioPlayback(
      "p1",
      { project: muted, playing: true, displayTicks: 0 },
      ctx,
    );
    expect(getAudioPlaybackDebugState().activeCount).toBe(0);

    const unmuted = {
      ...project,
      audioTracks: [{ ...project.audioTracks[0]!, muted: false }],
    };
    syncAudioPlayback(
      "p1",
      { project: unmuted, playing: true, displayTicks: 0 },
      ctx,
    );
    expect(sources).toHaveLength(2);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);

    // Old source's ended must not clear the new voice (clipId collision bug).
    staleEnded!();
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);

    // Sync must not re-start another BufferSource for a still-active clip.
    const startsBefore = sources.length;
    syncAudioPlayback(
      "p1",
      { project: unmuted, playing: true, displayTicks: 10 },
      ctx,
    );
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

    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 1920 },
      ctx,
    );
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 2880 },
      ctx,
    );
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
    expect(sources).toHaveLength(4);
    expect(sources[1]!.stop).toHaveBeenCalled();
    expect(sources[2]!.stop).toHaveBeenCalled();
    expect(sources[3]!.stop).not.toHaveBeenCalled();

    // Small tick advance (no seek jump) must not start another voice.
    const n = sources.length;
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 2890 },
      ctx,
    );
    expect(sources).toHaveLength(n);
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
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

    const withoutClip = {
      ...project,
      audioClips: [] as typeof project.audioClips,
    };
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

    const withoutClip = {
      ...project,
      audioClips: [] as typeof project.audioClips,
    };
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

  it("loop wrap (backward jump) stops active sources so clip at exclusive end does not ring", async () => {
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

    // Simulate playback near end of short loop: ticks = 400 (< SEEK_JUMP_TICKS)
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 400, loopEnabled: true },
      ctx,
    );
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);

    // Wrap: ticks jump backward to 0 (loop restart)
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: 0, loopEnabled: true },
      ctx,
    );
    // First source must have been stopped (loop wrap tear-down)
    expect(sources[0]!.stop).toHaveBeenCalled();
    // A new source may have been started for the clip at tick 0
    expect(getAudioPlaybackDebugState().activeCount).toBeLessThanOrEqual(1);
  });
});
