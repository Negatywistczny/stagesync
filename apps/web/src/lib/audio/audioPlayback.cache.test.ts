import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assetFileUrl,
  busSoloMutesBus,
  clearAudioBufferCache,
  estimateAudioBufferBytes,
  getAudioBufferCacheEntries,
  getAudioBufferCacheStats,
  getAudioBufferInflightCount,
  getFailedAudioAssetIds,
  isAudioAssetDecodeFailed,
  shouldSoftStopPastSongEnd,
} from "./audioPlayback.js";
import { createProjectSeed, projectEndTicks } from "@stagesync/shared";

describe("audioPlayback cache helpers (split)", () => {
  afterEach(() => {
    clearAudioBufferCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("assetFileUrl encodes project and asset ids", () => {
    expect(assetFileUrl("p 1", "a/b")).toBe(
      "/api/projects/p%201/assets/a%2Fb/file",
    );
  });

  it("estimateAudioBufferBytes uses float32 channel×frames", () => {
    const buf = {
      numberOfChannels: 2,
      length: 1000,
      duration: 1000 / 48_000,
    } as AudioBuffer;
    expect(estimateAudioBufferBytes(buf)).toBe(8000);
  });

  it("clear + stats: empty after clear; failed markers drop with project clear", () => {
    expect(getAudioBufferCacheStats()).toMatchObject({
      entries: 0,
      approxBytes: 0,
      maxEntries: 8,
    });
    expect(getAudioBufferCacheEntries()).toEqual([]);
    expect(getAudioBufferInflightCount()).toBe(0);
    expect(getFailedAudioAssetIds("p1")).toEqual([]);
    expect(isAudioAssetDecodeFailed("p1", "x")).toBe(false);

    clearAudioBufferCache("p1");
    clearAudioBufferCache();
    expect(getAudioBufferCacheStats().entries).toBe(0);
  });

  it("busSoloMutesBus: track solo wins over bus solo", () => {
    expect(busSoloMutesBus("bus-b", undefined, ["bus-a"])).toBe(true);
    expect(busSoloMutesBus("bus-a", undefined, ["bus-a"])).toBe(false);
    expect(busSoloMutesBus("bus-b", ["tr-1"], ["bus-a"])).toBe(false);
    expect(busSoloMutesBus("bus-b", [], ["bus-a"])).toBe(true);
    expect(busSoloMutesBus("bus-b", undefined, undefined)).toBe(false);
  });

  it("shouldSoftStopPastSongEnd respects loopEnabled", () => {
    const project = createProjectSeed({ name: "soft-stop" });
    const end = projectEndTicks(project);
    expect(
      shouldSoftStopPastSongEnd({
        project,
        playing: true,
        displayTicks: end,
      }),
    ).toBe(true);
    expect(
      shouldSoftStopPastSongEnd({
        project,
        playing: true,
        displayTicks: end,
        loopEnabled: true,
      }),
    ).toBe(false);
    expect(
      shouldSoftStopPastSongEnd({
        project,
        playing: true,
        displayTicks: end - 1,
      }),
    ).toBe(false);
  });
});
