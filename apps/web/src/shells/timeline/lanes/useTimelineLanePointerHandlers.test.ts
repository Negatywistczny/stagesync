import { describe, it, expect, vi } from "vitest";
import { createLanePointerDownHandler } from "./useTimelineLanePointerHandlers.js";
import type { Project } from "@stagesync/shared";

describe("createLanePointerDownHandler", () => {
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
    akordy: {
      clips: [{ id: "a1", symbol: "C", startTicks: 0, lengthTicks: 3840 }],
    },
    tekst: { clips: [] },
    melody: { clips: [] },
    cue: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [{ id: "aud1", name: "Audio 1", muted: false }],
    audioClips: [],
    assets: [],
  };

  it("handles forma lane delegation", () => {
    const onFormaLanePointerDown = vi.fn();
    const handler = createLanePointerDownHandler(
      { id: "forma" },
      {
        tool: "pointer",
        draftProject: dummyProject,
        rawTicksAtClientX: () => 100,
        commitDraft: vi.fn(),
        clearMapSelection: vi.fn(),
        selectLaneClip: vi.fn(),
        beginMarquee: vi.fn(),
        beginTouchCanvasNav: vi.fn(),
        heldZoomRef: { current: false },
        beginContentPencilDraw: vi.fn(),
        onFormaLanePointerDown,
        onMapLanePointerDown: vi.fn(),
        draftRef: { current: dummyProject },
      },
    );

    expect(handler).toBe(onFormaLanePointerDown);
  });

  it("handles scissors split on content lanes", () => {
    const commitDraft = vi.fn();
    const selectLaneClip = vi.fn();
    const clearMapSelection = vi.fn();

    const handler = createLanePointerDownHandler(
      { id: "akordy" },
      {
        tool: "scissors",
        draftProject: dummyProject,
        rawTicksAtClientX: () => 1920,
        commitDraft,
        clearMapSelection,
        selectLaneClip,
        beginMarquee: vi.fn(),
        beginTouchCanvasNav: vi.fn(),
        heldZoomRef: { current: false },
        beginContentPencilDraw: vi.fn(),
        onFormaLanePointerDown: vi.fn(),
        onMapLanePointerDown: vi.fn(),
        draftRef: { current: dummyProject },
      },
    );

    expect(handler).toBeDefined();
    const mockEvent = {
      button: 0,
      clientX: 50,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>;

    handler!(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(clearMapSelection).toHaveBeenCalled();
    expect(selectLaneClip).toHaveBeenCalledWith("akordy", "a1");
    expect(commitDraft).toHaveBeenCalled();
  });
});
