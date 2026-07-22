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
  stopAudioPlayback,
  suppressAudioPlayback,
  syncAudioPlayback,
} from "./audioPlayback.js";

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
    const ctx = {
      state: "running",
      currentTime: 0,
      destination: {},
      createBufferSource: vi.fn(() => {
        throw new Error("must not schedule while suppressed");
      }),
      createGain: vi.fn(),
    } as unknown as AudioContext;

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
    const ctx = {
      state: "running",
      currentTime: 0,
      destination: {},
      createBufferSource: vi.fn(() => {
        throw new Error("must not schedule when paused");
      }),
      createGain: vi.fn(),
    } as unknown as AudioContext;

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
    const ctx = {
      state: "running",
      currentTime: 0,
      destination: {},
      decodeAudioData: vi.fn(async () => fakeBuf),
      createBufferSource: vi.fn(),
      createGain: vi.fn(),
    } as unknown as AudioContext;

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
    const ctx = {
      state: "running",
      currentTime: 0,
      destination: {},
      decodeAudioData: vi.fn(async () => {
        throw new Error("bad wav");
      }),
      createBufferSource: vi.fn(),
      createGain: vi.fn(),
    } as unknown as AudioContext;

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
    const ctx = {
      state: "running",
      decodeAudioData: vi.fn(async () => {
        throw new Error("bad");
      }),
    } as unknown as AudioContext;
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
});
