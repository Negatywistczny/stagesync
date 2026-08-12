// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineMapLaneRenderer } from "./TimelineMapLaneRenderer.js";
import type { Project } from "@stagesync/shared";

if (typeof Element.prototype.setPointerCapture !== "function") {
  Element.prototype.setPointerCapture = vi.fn();
}
if (typeof Element.prototype.releasePointerCapture !== "function") {
  Element.prototype.releasePointerCapture = vi.fn();
}

describe("TimelineMapLaneRenderer", () => {
  const dummyProject: Project = {
    id: "p1",
    name: "Song",
    formatVersion: 6,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: { clips: [] },
    tempoMap: [{ id: "t1", bpm: 120, startTicks: 0 }],
    meterMap: [{ id: "m1", numerator: 4, denominator: 4, startTicks: 0 }],
    keyMap: [{ id: "k1", key: { tonic: "C", mode: "major" }, startTicks: 0 }],
    akordy: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    cue: { clips: [] },
    scoreBarMap: {
      anchors: [{ id: "anc1", logicBar: 1, scoreBar: 1 }],
    },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };

  const baseProps = {
    selectedMapLane: null,
    selectedMapIds: [],
    mapDragPreview: null,
    tempoSegments: [
      {
        id: "t1",
        eventId: "t1",
        eventStartTicks: 0,
        label: "120 BPM",
        startTicks: 0,
        endTicks: 3840,
        raw: 120,
      } as any,
    ],
    meterSegments: [
      {
        id: "m1",
        eventId: "m1",
        eventStartTicks: 0,
        label: "4/4",
        startTicks: 0,
        endTicks: 3840,
        raw: { numerator: 4, denominator: 4 },
      } as any,
    ],
    keySegments: [
      {
        id: "k1",
        eventId: "k1",
        eventStartTicks: 0,
        label: "C dur",
        startTicks: 0,
        endTicks: 3840,
        raw: { tonic: "C", scale: "major" },
      } as any,
    ],
    selectedAnchorId: null,
    viewSpan: { start: 0, end: 7680 },
    barTicks: 1920,
    effectiveZoomH: 1,
    tool: "pointer" as const,
    commitDraft: vi.fn(),
    clearClipSelection: vi.fn(),
    clearMapSelection: vi.fn(),
    setSelectedAnchorId: vi.fn(),
    setInspectorVisible: vi.fn(),
    setSongMetaOpen: vi.fn(),
    setMapSelection: vi.fn(),
    openMapEdit: vi.fn(),
    rawTicksAtClientX: vi.fn(),
    onMapSegmentPointerDown: vi.fn(),
    onMapSegmentPointerMove: vi.fn(),
    onMapSegmentPointerUp: vi.fn(),
  };

  it("renders tempo segments and handles double click to open map edit", () => {
    const openMapEdit = vi.fn();
    render(
      <TimelineMapLaneRenderer
        {...baseProps}
        trackId="tempo"
        draftProject={dummyProject}
        openMapEdit={openMapEdit}
      />,
    );

    const segBtn = screen.getByText("120 BPM");
    expect(segBtn).toBeTruthy();

    fireEvent.doubleClick(segBtn);
    expect(openMapEdit).toHaveBeenCalledWith("tempo", 0);
  });

  it("renders metrum segments", () => {
    render(
      <TimelineMapLaneRenderer
        {...baseProps}
        trackId="metrum"
        draftProject={dummyProject}
      />,
    );

    expect(screen.getByText("4/4")).toBeTruthy();
  });

  it("renders tonacja segments", () => {
    render(
      <TimelineMapLaneRenderer
        {...baseProps}
        trackId="tonacja"
        draftProject={dummyProject}
      />,
    );

    expect(screen.getByText("C dur")).toBeTruthy();
  });

  it("renders kotwice anchors and handles click", () => {
    const setSelectedAnchorId = vi.fn();
    const setInspectorVisible = vi.fn();
    const clearClipSelection = vi.fn();
    const clearMapSelection = vi.fn();

    render(
      <TimelineMapLaneRenderer
        {...baseProps}
        trackId="kotwice"
        draftProject={dummyProject}
        setSelectedAnchorId={setSelectedAnchorId}
        setInspectorVisible={setInspectorVisible}
        clearClipSelection={clearClipSelection}
        clearMapSelection={clearMapSelection}
      />,
    );

    const anchorBtn = screen.getByRole("button", { name: /1 → 1/i });
    expect(anchorBtn).toBeTruthy();

    fireEvent.pointerDown(anchorBtn, { button: 0 });
    expect(clearClipSelection).toHaveBeenCalled();
    expect(clearMapSelection).toHaveBeenCalled();
    expect(setSelectedAnchorId).toHaveBeenCalledWith("anc1");
    expect(setInspectorVisible).toHaveBeenCalledWith(true);
  });
});
