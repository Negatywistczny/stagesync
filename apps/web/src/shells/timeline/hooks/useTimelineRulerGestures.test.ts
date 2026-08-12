// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineRulerGestures } from "./useTimelineRulerGestures.js";
import type { Project } from "@stagesync/shared";

describe("useTimelineRulerGestures", () => {
  const dummyProject: Project = {
    id: "p1",
    name: "Song",
    formatVersion: 6,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: {
      clips: [
        {
          id: "sec-1",
          name: "Verse",
          kind: "section",
          startTicks: 0,
          lengthTicks: 3840,
        },
      ],
    },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    cue: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };

  it("handles loop toggling and locator nudging", () => {
    const draftRef = { current: dummyProject };
    const seek = vi.fn().mockResolvedValue(undefined);
    const setLoop = vi.fn().mockResolvedValue(undefined);
    const setLocatorTicks = vi.fn();
    const rawTicksAtClientX = vi.fn().mockReturnValue(960);

    const { result } = renderHook(() =>
      useTimelineRulerGestures({
        draftRef,
        draftProject: dummyProject,
        state: { loop: { enabled: false, startTicks: 0, endTicks: 3840 } },
        locatorTicks: 960,
        seek,
        setLoop,
        setLocatorTicks,
        markerOverlayRef: { current: null },
        lanesCoordRef: { current: null },
        viewSpanRef: { current: { start: 0, end: 3840 } },
        barTicksRef: { current: 3840 },
        zoomHRef: { current: 1 },
        rawTicksAtClientX,
      }),
    );

    act(() => {
      result.current.onLoopToggle();
    });

    expect(setLoop).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );

    act(() => {
      result.current.nudgeLocator(1);
    });

    expect(setLocatorTicks).toHaveBeenCalled();
  });
});
