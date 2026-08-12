// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelinePanelState } from "./useTimelinePanelState.js";

describe("useTimelinePanelState", () => {
  it("handles clip selection and focuses inspector", () => {
    const setInspectorVisible = vi.fn();
    const setSongMetaOpen = vi.fn();
    const setClipSelection = vi.fn();
    const clearClipSelection = vi.fn();
    const clearMapSelection = vi.fn();
    const setTrackSelection = vi.fn();
    const setSelectedAnchorId = vi.fn();
    const setSelectedSubsectionIdx = vi.fn();
    const setSelectedMapLane = vi.fn();
    const setSelectedMapIds = vi.fn();
    const setPrimaryMapId = vi.fn();

    const { result } = renderHook(() =>
      useTimelinePanelState({
        touchTier: "desktop",
        setInspectorVisible,
        setSongMetaOpen,
        setClipSelection,
        clearClipSelection,
        clearMapSelection,
        setTrackSelection,
        setSelectedAnchorId,
        setSelectedSubsectionIdx,
        setSelectedMapLane,
        setSelectedMapIds,
        setPrimaryMapId,
      }),
    );

    act(() => {
      result.current.selectLaneClip("forma", "forma-1");
    });

    expect(setClipSelection).toHaveBeenCalled();
    expect(setInspectorVisible).toHaveBeenCalledWith(true);

    act(() => {
      result.current.toggleInspectorPanel();
    });

    expect(setInspectorVisible).toHaveBeenCalled();
  });

  it("handles map selection", () => {
    const setInspectorVisible = vi.fn();
    const setSongMetaOpen = vi.fn();
    const setClipSelection = vi.fn();
    const clearClipSelection = vi.fn();
    const clearMapSelection = vi.fn();
    const setTrackSelection = vi.fn();
    const setSelectedAnchorId = vi.fn();
    const setSelectedSubsectionIdx = vi.fn();
    const setSelectedMapLane = vi.fn();
    const setSelectedMapIds = vi.fn();
    const setPrimaryMapId = vi.fn();

    const { result } = renderHook(() =>
      useTimelinePanelState({
        touchTier: "desktop",
        setInspectorVisible,
        setSongMetaOpen,
        setClipSelection,
        clearClipSelection,
        clearMapSelection,
        setTrackSelection,
        setSelectedAnchorId,
        setSelectedSubsectionIdx,
        setSelectedMapLane,
        setSelectedMapIds,
        setPrimaryMapId,
      }),
    );

    act(() => {
      result.current.setMapSelection("tempo", ["t-1", "t-2"], "t-1");
    });

    expect(setSelectedMapLane).toHaveBeenCalledWith("tempo");
    expect(setSelectedMapIds).toHaveBeenCalledWith(["t-1", "t-2"]);
    expect(setPrimaryMapId).toHaveBeenCalledWith("t-1");
    expect(setInspectorVisible).toHaveBeenCalledWith(true);
  });
});
