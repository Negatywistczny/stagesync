import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  allowAudioPlayback,
  assetFileUrl,
  getAudioPlaybackDebugState,
  stopAudioPlayback,
  suppressAudioPlayback,
  syncAudioPlayback,
} from "./audioPlayback.js";

describe("audioPlayback helpers", () => {
  afterEach(() => {
    allowAudioPlayback();
    stopAudioPlayback();
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
});
