// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineTrackActions } from "./useTimelineTrackActions.js";
import type { Project } from "@stagesync/shared";

describe("useTimelineTrackActions", () => {
  const dummyProject: Project = {
    id: "p1",
    name: "Song",
    formatVersion: 6,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: { clips: [] },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    cue: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [
      {
        id: "track-1",
        name: "Main Track",
        gainDb: 0,
        pan: 0,
        muted: false,
      },
    ],
    audioHardwareOutputs: [
      {
        id: "hw-1",
        name: "IEM 1-2",
        channelMode: "stereo",
        channelOffset: 0,
        gainDb: 0,
        muted: false,
      },
    ],
    audioClips: [],
    assets: [],
  };

  it("handles track addition, duplication, and removal", () => {
    const commitDraft = vi.fn();
    const setClipSelection = vi.fn();
    const setTrackSelection = vi.fn();
    const setInspectorVisible = vi.fn();
    const setEyeOpen = vi.fn();
    const setTrackVisibility = vi.fn();
    const setSoloAudioTrackIds = vi.fn();
    const setTrackRename = vi.fn();
    const setSelectedBusId = vi.fn();
    const setSelectedHwOutputId = vi.fn();
    const setTouchAlertOpen = vi.fn();
    const setLoadError = vi.fn();
    const openContextMenu = vi.fn();

    const { result } = renderHook(() =>
      useTimelineTrackActions({
        draftProject: dummyProject,
        commitDraft,
        setClipSelection,
        setTrackSelection,
        setInspectorVisible,
        setEyeOpen,
        setTrackVisibility,
        setSoloAudioTrackIds,
        setTrackRename,
        setSelectedBusId,
        setSelectedHwOutputId,
        isMobilePreview: false,
        setTouchAlertOpen,
        setLoadError,
        openContextMenu,
      }),
    );

    act(() => {
      result.current.onAddAudioTrack();
    });
    expect(commitDraft).toHaveBeenCalled();

    act(() => {
      result.current.onDuplicateAudioTrack("track-1");
    });
    expect(commitDraft).toHaveBeenCalled();

    act(() => {
      result.current.onRemoveAudioTrack("track-1");
    });
    expect(commitDraft).toHaveBeenCalled();
  });

  it("handles hardware output gain and mute toggle", () => {
    const commitDraft = vi.fn();
    const setClipSelection = vi.fn();
    const setTrackSelection = vi.fn();
    const setInspectorVisible = vi.fn();
    const setEyeOpen = vi.fn();
    const setTrackVisibility = vi.fn();
    const setSoloAudioTrackIds = vi.fn();
    const setTrackRename = vi.fn();
    const setSelectedBusId = vi.fn();
    const setSelectedHwOutputId = vi.fn();
    const setTouchAlertOpen = vi.fn();
    const setLoadError = vi.fn();
    const openContextMenu = vi.fn();

    const { result } = renderHook(() =>
      useTimelineTrackActions({
        draftProject: dummyProject,
        commitDraft,
        setClipSelection,
        setTrackSelection,
        setInspectorVisible,
        setEyeOpen,
        setTrackVisibility,
        setSoloAudioTrackIds,
        setTrackRename,
        setSelectedBusId,
        setSelectedHwOutputId,
        isMobilePreview: false,
        setTouchAlertOpen,
        setLoadError,
        openContextMenu,
      }),
    );

    act(() => {
      result.current.onHwGainChange("hw-1", -6);
    });
    expect(commitDraft).toHaveBeenCalled();

    act(() => {
      result.current.onHwMuteToggle("hw-1");
    });
    expect(commitDraft).toHaveBeenCalled();
  });
});
