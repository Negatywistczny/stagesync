// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineSelectionState } from "./useTimelineSelectionState.js";
import type { Project } from "@stagesync/shared";

describe("useTimelineSelectionState", () => {
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
          id: "forma-1",
          name: "Zwrotka",
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
    audioClips: [
      {
        id: "audio-clip-1",
        trackId: "track-1",
        assetId: "asset-1",
        startTicks: 0,
        lengthTicks: 3840,
        startOffsetMs: 0,
      },
    ],
    assets: [],
  };

  it("selects and clears clips correctly", () => {
    const draftRef = { current: dummyProject };
    const commitDraft = vi.fn();
    const setSongMetaOpen = vi.fn();
    const setLocatorTicks = vi.fn();
    const setLoop = vi.fn();
    const setSoloBusIds = vi.fn();
    const setSoloAudioTrackIds = vi.fn();

    const { result } = renderHook(() =>
      useTimelineSelectionState({
        draftRef,
        commitDraft,
        setSongMetaOpen,
        setLocatorTicks,
        setLoop,
        snapMode: "bar",
        displayTicks: 0,
        setSoloBusIds,
        setSoloAudioTrackIds,
      }),
    );

    act(() => {
      result.current.selectAllClips();
    });

    expect(result.current.clipSelection.items.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearClipSelection();
    });

    expect(result.current.clipSelection.items.length).toBe(0);
  });

  it("copies and pastes clip selection", () => {
    const draftRef = { current: dummyProject };
    const commitDraft = vi.fn();
    const setSongMetaOpen = vi.fn();
    const setLocatorTicks = vi.fn();
    const setLoop = vi.fn();
    const setSoloBusIds = vi.fn();
    const setSoloAudioTrackIds = vi.fn();

    const { result } = renderHook(() =>
      useTimelineSelectionState({
        draftRef,
        commitDraft,
        setSongMetaOpen,
        setLocatorTicks,
        setLoop,
        snapMode: "bar",
        displayTicks: 3840,
        setSoloBusIds,
        setSoloAudioTrackIds,
      }),
    );

    act(() => {
      result.current.setClipSelection({
        items: [{ lane: "forma", id: "forma-1" }],
        primaryId: "forma-1",
      });
    });

    act(() => {
      const copied = result.current.copyClipSelection();
      expect(copied).toBe(true);
    });

    expect(result.current.clipboardRef.current).not.toBeNull();

    act(() => {
      const pasted = result.current.pasteClipClipboard();
      expect(pasted).toBe(true);
    });

    expect(commitDraft).toHaveBeenCalled();
  });
});
