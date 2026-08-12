// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineAudioTrackInteractions } from "./useTimelineAudioTrackInteractions.js";
import type { Project } from "@stagesync/shared";

describe("useTimelineAudioTrackInteractions", () => {
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
        name: "Vocals",
        gainDb: 0,
        pan: 0,
        muted: false,
      },
    ],
    audioClips: [],
    assets: [],
  };

  it("handles audio track solo and mute toggles", () => {
    const commitDraft = vi.fn();
    const setTrackSelection = vi.fn();
    const setClipSelection = vi.fn();
    const setSelectedBusId = vi.fn();
    const setSelectedHwOutputId = vi.fn();
    const setInspectorVisible = vi.fn();
    const setSoloAudioTrackIds = vi.fn();
    const setSoloBusIds = vi.fn();
    const setTrackVisibility = vi.fn();
    const setTrackRename = vi.fn();
    const setTouchAlertOpen = vi.fn();
    const openContextMenu = vi.fn();
    const onDuplicateAudioTrack = vi.fn();
    const onRemoveAudioTrack = vi.fn();

    const { result } = renderHook(() =>
      useTimelineAudioTrackInteractions({
        draftProject: dummyProject,
        commitDraft,
        trackSelection: { ids: ["track-1"], primaryId: "track-1" },
        setTrackSelection,
        setClipSelection,
        setSelectedBusId,
        setSelectedHwOutputId,
        setInspectorVisible,
        setSoloAudioTrackIds,
        setSoloBusIds,
        setTrackVisibility,
        trackRename: null,
        setTrackRename,
        isMobilePreview: false,
        setTouchAlertOpen,
        openContextMenu,
        onDuplicateAudioTrack,
        onRemoveAudioTrack,
      }),
    );

    const mockEvent = {
      altKey: false,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.onAudioTrackSoloClick(mockEvent, "track-1");
    });

    expect(setSoloAudioTrackIds).toHaveBeenCalled();

    act(() => {
      result.current.onAudioTrackMuteClick(mockEvent, "track-1");
    });

    expect(commitDraft).toHaveBeenCalled();
  });
});
