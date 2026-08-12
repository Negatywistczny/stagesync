// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineDockCallbacks } from "./useTimelineDockCallbacks.js";
import type { Project } from "@stagesync/shared";

describe("useTimelineDockCallbacks", () => {
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
        name: "Wokale",
        gainDb: 0,
        pan: 0,
        muted: false,
      },
    ],
    audioBusses: [
      {
        id: "bus-1",
        name: "Drums Bus",
        gainDb: 0,
        pan: 0,
        muted: false,
      },
    ],
    audioClips: [],
    assets: [],
  };

  it("builds channel strip callbacks and dispatches gain/pan changes", () => {
    const commitDraft = vi.fn();
    const setClipSelection = vi.fn();
    const setTrackSelection = vi.fn();
    const setSelectedBusId = vi.fn();
    const setSelectedHwOutputId = vi.fn();
    const setSoloAudioTrackIds = vi.fn();
    const setSoloBusIds = vi.fn();
    const setContextMenus = vi.fn();
    const setTrackRename = vi.fn();
    const setLoadError = vi.fn();
    const clearTrackHold = vi.fn();
    const clearBusHold = vi.fn();
    const clearHwHold = vi.fn();
    const clearMasterHold = vi.fn();

    const { result } = renderHook(() =>
      useTimelineDockCallbacks({
        draftProject: dummyProject,
        commitDraft,
        state: { playing: false },
        setLoadError,
        onAudioTrackHeaderClick: vi.fn(),
        openAudioTrackContextMenu: vi.fn(),
        onAudioTrackSoloClick: vi.fn(),
        onAudioTrackMuteClick: vi.fn(),
        openTrackRename: vi.fn(),
        setTrackRename,
        setClipSelection,
        setTrackSelection,
        setSelectedBusId,
        setSelectedHwOutputId,
        setSoloAudioTrackIds,
        setSoloBusIds,
        openContextMenu: vi.fn(),
        commitTrackRename: vi.fn(),
        cancelTrackRename: vi.fn(),
      }),
    );

    const strip = result.current.buildChannelStripCallbacks("track-1");
    expect(strip).toBeDefined();

    act(() => {
      strip.onGainChange(3);
    });
    expect(commitDraft).toHaveBeenCalled();

    act(() => {
      strip.onPanChange?.(-0.5);
    });
    expect(commitDraft).toHaveBeenCalled();
  });

  it("adds audio bus and hardware output", () => {
    const commitDraft = vi.fn();
    const setClipSelection = vi.fn();
    const setTrackSelection = vi.fn();
    const setSelectedBusId = vi.fn();
    const setSelectedHwOutputId = vi.fn();
    const setSoloAudioTrackIds = vi.fn();
    const setSoloBusIds = vi.fn();
    const openContextMenu = vi.fn();
    const setTrackRename = vi.fn();
    const setLoadError = vi.fn();

    const { result } = renderHook(() =>
      useTimelineDockCallbacks({
        draftProject: dummyProject,
        commitDraft,
        state: { playing: false },
        setLoadError,
        onAudioTrackHeaderClick: vi.fn(),
        openAudioTrackContextMenu: vi.fn(),
        onAudioTrackSoloClick: vi.fn(),
        onAudioTrackMuteClick: vi.fn(),
        openTrackRename: vi.fn(),
        setTrackRename,
        setClipSelection,
        setTrackSelection,
        setSelectedBusId,
        setSelectedHwOutputId,
        setSoloAudioTrackIds,
        setSoloBusIds,
        openContextMenu,
        commitTrackRename: vi.fn(),
        cancelTrackRename: vi.fn(),
      }),
    );

    act(() => {
      result.current.onAddBus();
    });
    expect(commitDraft).toHaveBeenCalled();

    act(() => {
      result.current.onAddHwOut();
    });
    expect(commitDraft).toHaveBeenCalled();
  });
});
