// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineContextMenus } from "./useTimelineContextMenus.js";
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
    forma: {
      clips: [
        {
          id: "c1",
          name: "Intro",
          kind: "section" as const,
          startTicks: 0,
          lengthTicks: 3840,
        },
      ],
    },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [] },
    cue: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };
}

describe("useTimelineContextMenus", () => {
  it("opens clip context menu with items", () => {
    const project = createTestProject();
    const openContextMenu = vi.fn();

    const { result } = renderHook(() =>
      useTimelineContextMenus({
        isMobilePreview: false,
        setTouchAlertOpen: vi.fn(),
        clearMapSelection: vi.fn(),
        clipSelectionRef: { current: { items: [], primaryId: null } },
        setClipSelection: vi.fn(),
        setSelectedSubsectionIdx: vi.fn(),
        setSelectedAnchorId: vi.fn(),
        setSongMetaOpen: vi.fn(),
        setInspectorVisible: vi.fn(),
        selectLaneClip: vi.fn(),
        clipboardRef: { current: null },
        rawTicksAtClientX: () => 100,
        draftRef: { current: project },
        commitDraft: vi.fn(),
        copyClipSelection: vi.fn(() => true),
        deleteSelectedFormaClip: vi.fn(),
        duplicateClipSelection: vi.fn(),
        pasteClipClipboard: vi.fn(),
        focusInspectorPanel: vi.fn(),
        openContextMenu,
        laneImportTrackIdRef: { current: null },
        laneImportStartTicksRef: { current: null },
        laneAudioFileRef: { current: null },
        locatorTicks: 0,
      }),
    );

    act(() => {
      result.current.openClipContextMenu({
        clientX: 200,
        clientY: 200,
        lane: "forma",
        clipId: "c1",
        canSplit: true,
        selectionLane: "forma",
      });
    });

    expect(openContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 200,
        y: 200,
      }),
    );
  });

  it("opens empty lane context menu", () => {
    const project = createTestProject();
    const openContextMenu = vi.fn();

    const { result } = renderHook(() =>
      useTimelineContextMenus({
        isMobilePreview: false,
        setTouchAlertOpen: vi.fn(),
        clearMapSelection: vi.fn(),
        clipSelectionRef: { current: { items: [], primaryId: null } },
        setClipSelection: vi.fn(),
        setSelectedSubsectionIdx: vi.fn(),
        setSelectedAnchorId: vi.fn(),
        setSongMetaOpen: vi.fn(),
        setInspectorVisible: vi.fn(),
        selectLaneClip: vi.fn(),
        clipboardRef: { current: null },
        rawTicksAtClientX: () => 100,
        draftRef: { current: project },
        commitDraft: vi.fn(),
        copyClipSelection: vi.fn(() => true),
        deleteSelectedFormaClip: vi.fn(),
        duplicateClipSelection: vi.fn(),
        pasteClipClipboard: vi.fn(),
        focusInspectorPanel: vi.fn(),
        openContextMenu,
        laneImportTrackIdRef: { current: null },
        laneImportStartTicksRef: { current: null },
        laneAudioFileRef: { current: null },
        locatorTicks: 0,
      }),
    );

    act(() => {
      result.current.openEmptyLaneContextMenu({
        clientX: 100,
        clientY: 100,
        laneKind: "forma",
      });
    });

    expect(openContextMenu).toHaveBeenCalled();
  });

  it("shows touch alert when in mobile preview mode", () => {
    const setTouchAlertOpen = vi.fn();

    const { result } = renderHook(() =>
      useTimelineContextMenus({
        isMobilePreview: true,
        setTouchAlertOpen,
        clearMapSelection: vi.fn(),
        clipSelectionRef: { current: { items: [], primaryId: null } },
        setClipSelection: vi.fn(),
        setSelectedSubsectionIdx: vi.fn(),
        setSelectedAnchorId: vi.fn(),
        setSongMetaOpen: vi.fn(),
        setInspectorVisible: vi.fn(),
        selectLaneClip: vi.fn(),
        clipboardRef: { current: null },
        rawTicksAtClientX: () => 100,
        draftRef: { current: createTestProject() },
        commitDraft: vi.fn(),
        copyClipSelection: vi.fn(() => true),
        deleteSelectedFormaClip: vi.fn(),
        duplicateClipSelection: vi.fn(),
        pasteClipClipboard: vi.fn(),
        focusInspectorPanel: vi.fn(),
        openContextMenu: vi.fn(),
        laneImportTrackIdRef: { current: null },
        laneImportStartTicksRef: { current: null },
        laneAudioFileRef: { current: null },
        locatorTicks: 0,
      }),
    );

    act(() => {
      result.current.openClipContextMenu({
        clientX: 100,
        clientY: 100,
        lane: "forma",
        clipId: "c1",
        canSplit: true,
        selectionLane: "forma",
      });
    });

    expect(setTouchAlertOpen).toHaveBeenCalledWith(true);
  });
});
