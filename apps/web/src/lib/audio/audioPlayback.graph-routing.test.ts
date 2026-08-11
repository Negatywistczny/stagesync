import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectSeed } from "@stagesync/shared";
import {
  busSoloMutesBus,
  ensureAudioBuffered,
  getAudioPlaybackDebugState,
  readHwOutMeterDb,
  syncAudioPlayback,
} from "./audioPlayback.js";
import {
  cleanupAudioPlayback,
  mockAudioContext,
  mockAudioParam,
  mockConnectable,
  projectWithClipUnderPlayhead,
} from "./audioPlayback.test-helpers.js";

describe("audioPlayback — graph routing & buses", () => {
  afterEach(() => {
    cleanupAudioPlayback();
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
    let project = createProjectSeed("p1", "HW", "2026-07-25T00:00:00.000Z");
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
    const before = gainDisconnects.reduce((n, d) => n + d.mock.calls.length, 0);

    // Mute track → graphKey change → stopAll → releaseActiveSource.
    const muted = {
      ...project,
      audioTracks: [{ ...project.audioTracks[0]!, muted: true }],
    };
    syncAudioPlayback(
      "p1",
      { project: muted, playing: true, displayTicks: 0 },
      ctx,
    );

    const after = gainDisconnects.reduce((n, d) => n + d.mock.calls.length, 0);
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
    syncAudioPlayback(
      "p1",
      { project: withBuses, playing: true, displayTicks: 0 },
      ctx,
    );
    expect(getAudioPlaybackDebugState().trackGainLinear["tr-1"]).toBe(1);

    syncAudioPlayback(
      "p1",
      {
        project: { ...withBuses, audioBusses: [] },
        playing: true,
        displayTicks: 0,
      },
      ctx,
    );
    expect(getAudioPlaybackDebugState().activeCount).toBe(1);
    expect(getAudioPlaybackDebugState().trackGainLinear["tr-1"]).toBe(1);
    expect(getAudioPlaybackDebugState().groupBusGainLinear).toEqual({});
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
    syncAudioPlayback(
      "p1",
      { project, playing: true, displayTicks: past },
      ctx,
    );
    expect(getAudioPlaybackDebugState().activeCount).toBe(0);
    expect(source.stop).toHaveBeenCalled();
  });
});
