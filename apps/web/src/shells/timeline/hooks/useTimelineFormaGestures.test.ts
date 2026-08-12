// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineFormaGestures } from "./useTimelineFormaGestures.js";
import { EMPTY_CLIP_SELECTION } from "@lib/timeline/timelineSelection.js";
import type { Project } from "@stagesync/shared";

function createTestProject(): Project {
  return {
    id: "p1",
    name: "Forma Gestures Test",
    formatVersion: 6,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: {
      clips: [
        {
          id: "c1",
          name: "Verse",
          kind: "section",
          startTicks: 0,
          lengthTicks: 3840,
        },
        {
          id: "c2",
          name: "Chorus",
          kind: "section",
          startTicks: 3840,
          lengthTicks: 3840,
        },
      ],
    },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [] },
    cue: { clips: [] },
    tekst: {
      clips: [
        {
          id: "t1",
          text: "Test",
          startTicks: 0,
          lengthTicks: 1920,
          blocks: [
            { id: "tb1", startTicks: 0, lengthTicks: 1920, text: "Test" },
          ],
        },
      ],
    },
    melody: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [
      { id: "trk1", name: "Vocals", gainDb: 0, pan: 0, muted: false },
    ],
    audioClips: [
      {
        id: "ac1",
        trackId: "trk1",
        startTicks: 0,
        lengthTicks: 3840,
        assetId: "a1",
        trimInMs: 0,
      },
    ],
    assets: [],
  };
}

describe("useTimelineFormaGestures", () => {
  let draftProject: Project;
  let commitDraft: any;
  let setClipSelection: any;

  beforeEach(() => {
    draftProject = createTestProject();
    commitDraft = vi.fn();
    setClipSelection = vi.fn();
  });

  it("initializes gesture session as null and responds to beginFormaGesture", () => {
    const rawTicksAtClientX = vi.fn().mockReturnValue(1920);
    const draftRef = { current: draftProject };

    const { result } = renderHook(() =>
      useTimelineFormaGestures({
        draftRef,
        draftProject,
        commitDraft,
        rawTicksAtClientX,
        tool: "pointer",
        gesturePolicy: { pencilDraw: true, clipDragResize: true },
        setTouchAlertOpen: vi.fn(),
        clipSelection: EMPTY_CLIP_SELECTION,
        setClipSelection,
        clearClipSelection: vi.fn(),
        selectLaneClip: vi.fn(),
        selectedClipId: null,
        clearMapSelection: vi.fn(),
        setSelectedAnchorId: vi.fn(),
        setSongMetaOpen: vi.fn(),
        setSelectedSubsectionIdx: vi.fn(),
        deleteSelectedFormaClip: vi.fn(),
        beginMarquee: vi.fn(),
        beginTouchCanvasNav: vi.fn(),
        heldZoomRef: { current: false },
        zoomHRef: { current: 1 },
        effectiveZoomH: 1,
        soloAudioTrackIds: [],
        setSoloAudioTrackIds: vi.fn(),
        soloHoldRef: { current: [] },
        setCanvasNotice: vi.fn(),
        canvasNoticeTimerRef: { current: null },
      }),
    );

    expect(result.current.gestureSession).toBeNull();
    expect(result.current.gesturePreview).toBeNull();

    const mockSession: any = {
      kind: "move",
      clipId: "c1",
      originClipStart: 0,
      originClipLength: 3840,
      pointerStartTicks: 0,
    };
    const mockPreview: any = {
      kind: "move",
      clipId: "c1",
      startTicks: 0,
      lengthTicks: 3840,
    };

    act(() => {
      result.current.beginFormaGesture(mockSession, mockPreview);
    });

    expect(result.current.gestureSession).not.toBeNull();
    expect(result.current.gestureSession?.kind).toBe("move");
  });

  it("updates gesture preview and ends gesture cleanly", () => {
    const rawTicksAtClientX = vi.fn().mockReturnValue(1920);
    const draftRef = { current: draftProject };

    const { result } = renderHook(() =>
      useTimelineFormaGestures({
        draftRef,
        draftProject,
        commitDraft,
        rawTicksAtClientX,
        tool: "pointer",
        gesturePolicy: { pencilDraw: true, clipDragResize: true },
        setTouchAlertOpen: vi.fn(),
        clipSelection: EMPTY_CLIP_SELECTION,
        setClipSelection,
        clearClipSelection: vi.fn(),
        selectLaneClip: vi.fn(),
        selectedClipId: null,
        clearMapSelection: vi.fn(),
        setSelectedAnchorId: vi.fn(),
        setSongMetaOpen: vi.fn(),
        setSelectedSubsectionIdx: vi.fn(),
        deleteSelectedFormaClip: vi.fn(),
        beginMarquee: vi.fn(),
        beginTouchCanvasNav: vi.fn(),
        heldZoomRef: { current: false },
        zoomHRef: { current: 1 },
        effectiveZoomH: 1,
        soloAudioTrackIds: [],
        setSoloAudioTrackIds: vi.fn(),
        soloHoldRef: { current: [] },
        setCanvasNotice: vi.fn(),
        canvasNoticeTimerRef: { current: null },
      }),
    );

    const mockSession: any = {
      kind: "resize-right",
      clipId: "c1",
      originClipStart: 0,
      originClipLength: 3840,
      pointerStartTicks: 0,
    };
    const mockPreview: any = {
      kind: "resize-right",
      clipId: "c1",
      startTicks: 0,
      lengthTicks: 3840,
    };

    act(() => {
      result.current.beginFormaGesture(mockSession, mockPreview);
    });

    act(() => {
      result.current.updateFormaGesturePreview(3840, false, false, 100, 100);
    });

    expect(result.current.gesturePreview).not.toBeNull();

    act(() => {
      result.current.endFormaGesture(false, false);
    });

    expect(result.current.gestureSession).toBeNull();
    expect(commitDraft).toHaveBeenCalled();
  });
});
