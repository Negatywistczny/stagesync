// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineMapPointerHandlers } from "./useTimelineMapPointerHandlers.js";
import type { Project } from "@stagesync/shared";

describe("useTimelineMapPointerHandlers", () => {
  const dummyProject: Project = {
    id: "p1",
    name: "Song",
    formatVersion: 6,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: { clips: [] },
    tempoMap: [
      { id: "t-1", startTicks: 0, bpm: 120 },
      { id: "t-2", startTicks: 3840, bpm: 140 },
    ],
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

  it("handles map segment pointer down and click to edit", () => {
    const draftRef = { current: dummyProject };
    const commitDraft = vi.fn();
    const rawTicksAtClientX = vi.fn().mockReturnValue(100);
    const heldZoomRef = { current: false };
    const gesturePolicy = { mapEdit: true };
    const setTouchAlertOpen = vi.fn();
    const setMapSelection = vi.fn();
    const setPrimaryMapId = vi.fn();
    const clearMapSelection = vi.fn();
    const openMapEdit = vi.fn();
    const beginTouchCanvasNav = vi.fn();

    const { result } = renderHook(() =>
      useTimelineMapPointerHandlers({
        draftRef,
        draftProject: dummyProject,
        commitDraft,
        rawTicksAtClientX,
        tool: "pointer",
        heldZoomRef,
        gesturePolicy,
        setTouchAlertOpen,
        selectedMapLane: null,
        selectedMapIds: [],
        primaryMapId: null,
        setMapSelection,
        setPrimaryMapId,
        clearMapSelection,
        openMapEdit,
        beginTouchCanvasNav,
      }),
    );

    const mockBtn = document.createElement("button");
    mockBtn.setPointerCapture = vi.fn();
    mockBtn.releasePointerCapture = vi.fn();
    mockBtn.hasPointerCapture = vi.fn().mockReturnValue(true);

    const downEv = {
      button: 0,
      pointerType: "mouse",
      pointerId: 1,
      clientX: 50,
      currentTarget: mockBtn,
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLButtonElement>;

    act(() => {
      result.current.onMapSegmentPointerDown(downEv, "tempo", {
        eventId: "t-2",
        eventStartTicks: 3840,
        label: "140",
      });
    });

    const upEv = {
      pointerId: 1,
      currentTarget: mockBtn,
    } as unknown as React.PointerEvent<HTMLButtonElement>;

    act(() => {
      result.current.onMapSegmentPointerUp(upEv);
    });

    expect(openMapEdit).toHaveBeenCalledWith("tempo", 3840);
  });
});
