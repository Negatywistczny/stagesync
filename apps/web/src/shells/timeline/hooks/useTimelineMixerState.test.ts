// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineMixerState } from "./useTimelineMixerState.js";
import type { Project } from "@stagesync/shared";

function createTestProject(): Project {
  return {
    id: "p1",
    name: "Test Song",
    formatVersion: 6 as const,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: { clips: [] },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [] },
    cue: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [
      { id: "t1", name: "Drums", muted: false, gainDb: 0, pan: 0 },
      { id: "t2", name: "Bass", muted: false, gainDb: 0, pan: 0 },
    ],
    audioClips: [],
    assets: [],
  };
}

describe("useTimelineMixerState", () => {
  it("initializes default state correctly", () => {
    const project = createTestProject();
    const commitDraft = vi.fn();
    const setClipSelection = vi.fn();
    const setTrackSelection = vi.fn();
    const setInspectorVisible = vi.fn();
    const setEyeOpen = vi.fn();
    const setTrackVisibility = vi.fn();
    const setSoloAudioTrackIds = vi.fn();
    const setTouchAlertOpen = vi.fn();
    const setLoadError = vi.fn();
    const openContextMenu = vi.fn();

    const { result } = renderHook(() =>
      useTimelineMixerState({
        draftProject: project,
        commitDraft,
        setClipSelection,
        trackSelection: { ids: ["t1"], primaryId: "t1" },
        setTrackSelection,
        setInspectorVisible,
        setEyeOpen,
        setTrackVisibility,
        soloAudioTrackIds: [],
        setSoloAudioTrackIds,
        isMobilePreview: false,
        setTouchAlertOpen,
        setLoadError,
        openContextMenu,
        playing: false,
      }),
    );

    expect(result.current.soloBusIds).toEqual([]);
    expect(result.current.selectedBusId).toBeNull();
    expect(result.current.selectedHwOutputId).toBeNull();
  });

  it("handles onAddAudioTrack", () => {
    const project = createTestProject();
    const commitDraft = vi.fn();
    const setClipSelection = vi.fn();
    const setTrackSelection = vi.fn();
    const setInspectorVisible = vi.fn();
    const setEyeOpen = vi.fn();
    const setTrackVisibility = vi.fn();
    const setSoloAudioTrackIds = vi.fn();
    const setTouchAlertOpen = vi.fn();
    const setLoadError = vi.fn();
    const openContextMenu = vi.fn();

    const { result } = renderHook(() =>
      useTimelineMixerState({
        draftProject: project,
        commitDraft,
        setClipSelection,
        trackSelection: { ids: [], primaryId: null },
        setTrackSelection,
        setInspectorVisible,
        setEyeOpen,
        setTrackVisibility,
        soloAudioTrackIds: [],
        setSoloAudioTrackIds,
        isMobilePreview: false,
        setTouchAlertOpen,
        setLoadError,
        openContextMenu,
        playing: false,
      }),
    );

    act(() => {
      result.current.onAddAudioTrack();
    });

    expect(commitDraft).toHaveBeenCalled();
    expect(setInspectorVisible).toHaveBeenCalledWith(true);
  });
});
