// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineMixerCallbacks } from "./useTimelineMixerCallbacks.js";
import type { Project } from "@stagesync/shared";

describe("useTimelineMixerCallbacks", () => {
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
    audioBusses: [
      {
        id: "bus-1",
        name: "Instruments Bus",
        gainDb: 0,
        pan: 0,
        muted: false,
      },
    ],
    audioClips: [],
    assets: [],
  };

  it("builds channel strip callbacks and handles gain/pan/color changes", () => {
    const commitDraft = vi.fn();
    const setClipSelection = vi.fn();
    const setTrackSelection = vi.fn();
    const setSelectedBusId = vi.fn();
    const setSelectedHwOutputId = vi.fn();
    const setSoloBusIds = vi.fn();
    const setSoloAudioTrackIds = vi.fn();
    const setLoadError = vi.fn();
    const onAudioTrackHeaderClick = vi.fn();
    const openAudioTrackContextMenu = vi.fn();
    const onAudioTrackSoloClick = vi.fn();
    const onAudioTrackMuteClick = vi.fn();
    const openTrackRename = vi.fn();
    const setTrackRename = vi.fn();
    const commitTrackRename = vi.fn();
    const cancelTrackRename = vi.fn();
    const openBusContextMenu = vi.fn();
    const openBusRename = vi.fn();
    const setBusRename = vi.fn();
    const commitBusRename = vi.fn();

    const { result } = renderHook(() =>
      useTimelineMixerCallbacks({
        draftProject: dummyProject,
        commitDraft,
        playing: false,
        setClipSelection,
        setTrackSelection,
        setSelectedBusId,
        setSelectedHwOutputId,
        setSoloBusIds,
        setSoloAudioTrackIds,
        setLoadError,
        onAudioTrackHeaderClick,
        openAudioTrackContextMenu,
        onAudioTrackSoloClick,
        onAudioTrackMuteClick,
        openTrackRename,
        setTrackRename,
        commitTrackRename,
        cancelTrackRename,
        openBusContextMenu,
        openBusRename,
        setBusRename,
        commitBusRename,
      }),
    );

    const strip = result.current.buildChannelStripCallbacks("track-1");
    expect(strip).toBeDefined();

    act(() => {
      strip.onGainChange(-3);
    });
    expect(commitDraft).toHaveBeenCalled();

    act(() => {
      strip.onPanChange(0.25);
    });
    expect(commitDraft).toHaveBeenCalled();

    act(() => {
      strip.onColorChange("#ff0000");
    });
    expect(commitDraft).toHaveBeenCalled();
  });

  it("builds master and bus callbacks", () => {
    const commitDraft = vi.fn();
    const setClipSelection = vi.fn();
    const setTrackSelection = vi.fn();
    const setSelectedBusId = vi.fn();
    const setSelectedHwOutputId = vi.fn();
    const setSoloBusIds = vi.fn();
    const setSoloAudioTrackIds = vi.fn();
    const setLoadError = vi.fn();
    const onAudioTrackHeaderClick = vi.fn();
    const openAudioTrackContextMenu = vi.fn();
    const onAudioTrackSoloClick = vi.fn();
    const onAudioTrackMuteClick = vi.fn();
    const openTrackRename = vi.fn();
    const setTrackRename = vi.fn();
    const commitTrackRename = vi.fn();
    const cancelTrackRename = vi.fn();
    const openBusContextMenu = vi.fn();
    const openBusRename = vi.fn();
    const setBusRename = vi.fn();
    const commitBusRename = vi.fn();

    const { result } = renderHook(() =>
      useTimelineMixerCallbacks({
        draftProject: dummyProject,
        commitDraft,
        playing: false,
        setClipSelection,
        setTrackSelection,
        setSelectedBusId,
        setSelectedHwOutputId,
        setSoloBusIds,
        setSoloAudioTrackIds,
        setLoadError,
        onAudioTrackHeaderClick,
        openAudioTrackContextMenu,
        onAudioTrackSoloClick,
        onAudioTrackMuteClick,
        openTrackRename,
        setTrackRename,
        commitTrackRename,
        cancelTrackRename,
        openBusContextMenu,
        openBusRename,
        setBusRename,
        commitBusRename,
      }),
    );

    const master = result.current.buildMasterStripCallbacks();
    act(() => {
      master.onGainChange(-1);
    });
    expect(commitDraft).toHaveBeenCalled();

    const bus = result.current.buildBusCallbacks("bus-1");
    act(() => {
      bus.onGainChange(-2);
    });
    expect(commitDraft).toHaveBeenCalled();
  });
});
