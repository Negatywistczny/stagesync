// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineLanesView } from "./TimelineLanesView.js";
import type { Project } from "@stagesync/shared";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

describe("TimelineLanesView", () => {
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
          id: "f1",
          name: "Verse",
          kind: "section",
          startTicks: 0,
          lengthTicks: 3840,
        },
      ],
    },
    tempoMap: [{ id: "t1", bpm: 120, startTicks: 0 }],
    meterMap: [{ id: "m1", numerator: 4, denominator: 4, startTicks: 0 }],
    keyMap: [],
    akordy: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    cue: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [
      { id: "trk1", name: "Drums", muted: false, color: "#E74C3C" },
    ],
    audioClips: [],
    assets: [],
  };

  const baseProps: any = {
    canvasScrollRef: { current: null },
    canvasInnerWidth: "1200px",
    dockWidthBase: 120,
    markerOverlayRef: { current: null },
    showMidiPlayhead: true,
    playheadPx: 100,
    locatorPx: 150,
    viewSpan: { start: 0, end: 7680 },
    barTicks: 1920,
    effectiveLocatorTicks: 1920,
    locatorLabel: "2.1",
    onLocatorPointerDown: vi.fn(),
    onLocatorPointerMove: vi.fn(),
    onLocatorPointerUp: vi.fn(),
    eyeBtnRef: { current: null },
    eyeOpen: false,
    eyeMenuId: "eye-menu",
    setEyeOpen: vi.fn(),
    touchTier: "desktop",
    beginDockWidthResize: vi.fn(),
    onDockWidthResizePointerMove: vi.fn(),
    endDockWidthResize: vi.fn(),
    effectiveZoomH: 1,
    loopRange: { startTicks: 0, endTicks: 3840 },
    loopOn: true,
    barMarks: [
      { ticks: 0, label: "1" },
      { ticks: 1920, label: "2" },
    ],
    rulerBeatMarks: [{ ticks: 480 }, { ticks: 960 }],
    bindTrackRowsRef: vi.fn(),
    lanesCoordRef: { current: null },
    marqueeBox: null,
    draftProject: dummyProject,
    trackVisibility: {
      forma: true,
      tempo: true,
      metrum: true,
      tonacja: true,
      akordy: true,
      tekst: true,
      melody: false,
      cue: true,
      kotwice: false,
    },
    rowHeightStyle: () => ({ height: 40 }),
    trackSelection: { kind: "none", ids: [], primaryId: null },
    soloAudioTrackIds: [],
    trackRename: null,
    buildChannelStripCallbacks: () => ({}),
    laneHeights: {},
    zoomV: 1,
    uiScale: 1,
    tool: "pointer" as const,
    onTool: vi.fn(),
    isMobilePreview: false,
    laneResizeTrackId: null,
    beginLaneResize: vi.fn(),
    onLaneResizePointerMove: vi.fn(),
    endLaneResize: vi.fn(),
    onLaneResizeDblClick: vi.fn(),
    onAudioTrackHeaderClick: vi.fn(),
    openAudioTrackContextMenu: vi.fn(),
    heldZoom: false,
    audioLaneDropId: null,
    setAudioLaneDropId: vi.fn(),
    onUploadAudioToTrack: vi.fn(),
    openEmptyLaneContextMenu: vi.fn(),
    beginMarquee: vi.fn(),
    beginTouchCanvasNav: vi.fn(),
    heldZoomRef: { current: false },
    onAddAudioTrack: vi.fn(),
    onFormaLanePointerDown: vi.fn(),
    onMapLanePointerDown: vi.fn(),
    onFormaLanePointerMove: vi.fn(),
    onFormaLanePointerUp: vi.fn(),
    beginContentPencilDraw: vi.fn(),
    rawTicksAtClientX: () => 0,
    commitDraft: vi.fn(),
    clearMapSelection: vi.fn(),
    selectLaneClip: vi.fn(),
    draftRef: { current: dummyProject },
    lanesRendererProps: {
      draftProject: dummyProject,
      selectedMapLane: null,
      selectedMapIds: [],
      mapDragPreview: null,
      tempoSegments: [],
      meterSegments: [],
      keySegments: [],
      selectedAnchorId: null,
      viewSpan: { start: 0, end: 7680 },
      barTicks: 1920,
      effectiveZoomH: 1,
      tool: "pointer",
      commitDraft: vi.fn(),
      clearClipSelection: vi.fn(),
      clearMapSelection: vi.fn(),
      setSelectedAnchorId: vi.fn(),
      setInspectorVisible: vi.fn(),
      setSongMetaOpen: vi.fn(),
      setMapSelection: vi.fn(),
      openMapEdit: vi.fn(),
      rawTicksAtClientX: () => 0,
      onMapSegmentPointerDown: vi.fn(),
      onMapSegmentPointerMove: vi.fn(),
      onMapSegmentPointerUp: vi.fn(),
      gestureSession: null,
      gesturePreview: null,
      clipSelection: { items: [], primaryId: null },
      primaryId: null,
      selectedSubsectionIdx: null,
      tapActiveClipId: null,
      openClipContextMenu: vi.fn(),
      selectLaneClip: vi.fn(),
      focusInspectorPanel: vi.fn(),
      onFormaClipPointerDown: vi.fn(),
      onContentClipPointerDown: vi.fn(),
      onFormaClipPointerMove: vi.fn(),
      onFormaClipPointerUp: vi.fn(),
      failedAudioAssetIds: [],
      onAudioClipPointerDown: vi.fn(),
    },
  };

  it("renders ruler, locator and track rows", () => {
    render(<TimelineLanesView {...baseProps} />);

    expect(
      screen.getByRole("slider", { name: "Locator wklejania" }),
    ).toBeTruthy();
    expect(screen.getByText("2.1")).toBeTruthy();
    expect(screen.getByText("Forma")).toBeTruthy();
  });

  it("handles locator pointer down event", () => {
    const onLocatorPointerDown = vi.fn();
    render(
      <TimelineLanesView
        {...baseProps}
        onLocatorPointerDown={onLocatorPointerDown}
      />,
    );

    const locator = screen.getByRole("slider", { name: "Locator wklejania" });
    fireEvent.pointerDown(locator);
    expect(onLocatorPointerDown).toHaveBeenCalledWith(
      expect.anything(),
      "locator",
    );
  });

  it("renders marquee box when marqueeBox prop is provided", () => {
    const marqueeBox = { left: 10, top: 20, width: 100, height: 200 };
    const { container } = render(
      <TimelineLanesView {...baseProps} marqueeBox={marqueeBox} />,
    );

    const boxElem = container.querySelector("[class*='marquee']");
    expect(boxElem).toBeTruthy();
  });

  it("triggers onAddAudioTrack when add track control is clicked", () => {
    const onAddAudioTrack = vi.fn();
    render(
      <TimelineLanesView {...baseProps} onAddAudioTrack={onAddAudioTrack} />,
    );

    const addBtn = screen.getByTitle("Dodaj pustą ścieżkę audio");
    fireEvent.click(addBtn);
    expect(onAddAudioTrack).toHaveBeenCalled();
  });
});
