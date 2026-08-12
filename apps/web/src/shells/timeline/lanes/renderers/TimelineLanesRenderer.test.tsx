// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderLaneContent } from "./TimelineLanesRenderer.js";
import type { Project } from "@stagesync/shared";

describe("renderLaneContent", () => {
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
          name: "Intro",
          kind: "section",
          startTicks: 0,
          lengthTicks: 3840,
        },
      ],
    },
    tempoMap: [{ id: "tmp1", bpm: 120, startTicks: 0 }],
    meterMap: [],
    keyMap: [],
    akordy: {
      clips: [{ id: "a1", symbol: "C", startTicks: 0, lengthTicks: 3840 }],
    },
    tekst: { clips: [] },
    melody: { clips: [] },
    cue: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [{ id: "aud1", name: "Audio Track", muted: false }],
    audioClips: [],
    assets: [],
  };

  const baseProps = {
    projectId: "p1",
    failedAudioAssetIds: [],
    gestureSession: null,
    gesturePreview: null,
    clipSelection: {
      items: [{ id: "a1", lane: "akordy" as const }],
      primaryId: "a1",
    },
    primaryId: "a1",
    selectedSubsectionIdx: null,
    selectedAnchorId: null,
    selectedMapLane: null,
    selectedMapIds: [],
    mapDragPreview: null,
    tempoSegments: [],
    meterSegments: [],
    keySegments: [],
    viewSpan: { start: 0, end: 3840 },
    barTicks: 1920,
    effectiveZoomH: 1,
    tool: "pointer" as const,
    tapActiveClipId: null,
    commitDraft: vi.fn(),
    clearClipSelection: vi.fn(),
    clearMapSelection: vi.fn(),
    setSelectedAnchorId: vi.fn(),
    setInspectorVisible: vi.fn(),
    setSongMetaOpen: vi.fn(),
    setMapSelection: vi.fn(),
    openMapEdit: vi.fn(),
    openClipContextMenu: vi.fn(),
    selectLaneClip: vi.fn(),
    focusInspectorPanel: vi.fn(),
    rawTicksAtClientX: vi.fn(),
    onAudioClipPointerDown: vi.fn(),
    onFormaClipPointerDown: vi.fn(),
    onContentClipPointerDown: vi.fn(),
    onFormaClipPointerMove: vi.fn(),
    onFormaClipPointerUp: vi.fn(),
    onMapSegmentPointerDown: vi.fn(),
    onMapSegmentPointerMove: vi.fn(),
    onMapSegmentPointerUp: vi.fn(),
  };

  it("renders content lane clips", () => {
    render(
      <div>
        {renderLaneContent({
          ...baseProps,
          trackId: "akordy",
          draftProject: dummyProject,
        })}
      </div>,
    );

    expect(screen.getByText("C")).toBeTruthy();
  });

  it("renders tempo map lane segments", () => {
    render(
      <div>
        {renderLaneContent({
          ...baseProps,
          trackId: "tempo",
          draftProject: dummyProject,
          tempoSegments: [
            {
              eventId: "tmp1",
              eventStartTicks: 0,
              label: "120 BPM",
              startTicks: 0,
              endTicks: 3840,
              raw: 120,
            } as any,
          ],
        })}
      </div>,
    );

    expect(screen.getByText("120 BPM")).toBeTruthy();
  });
});
