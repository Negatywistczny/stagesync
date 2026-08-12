// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTimelineCanvasDerived } from "./useTimelineCanvasDerived.js";
import type { Project } from "@stagesync/shared";

function createTestProject(): Project {
  return {
    id: "p1",
    name: "Test Project",
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
    tempoMap: [{ id: "t1", startTicks: 0, bpm: 120 }],
    meterMap: [{ id: "m1", startTicks: 0, numerator: 4, denominator: 4 }],
    keyMap: [{ id: "k1", startTicks: 0, key: { tonic: "C", mode: "major" } }],
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

describe("useTimelineCanvasDerived", () => {
  it("computes viewSpan, barTicks, and canvas width correctly for a project", () => {
    const draftProject = createTestProject();
    const viewSpanRef = { current: { start: 0, end: 0 } };
    const barTicksRef = { current: 0 };
    const effectiveLocatorTicksRef = { current: 0 };

    const { result } = renderHook(() =>
      useTimelineCanvasDerived({
        draftProject,
        gesturePreview: null,
        gestureSessionRef: { current: null },
        effectiveZoomH: 1,
        displayTicks: 1920,
        locatorTicks: 960,
        tool: "pointer",
        tapLineIndex: 0,
        state: {
          playing: false,
          timeSignature: { numerator: 4, denominator: 4 },
          ppq: 960,
          loop: null,
        },
        loopDraft: null,
        mapDragPreview: null,
        viewSpanRef,
        barTicksRef,
        effectiveLocatorTicksRef,
      }),
    );

    expect(result.current.barTicks).toBe(3840);
    expect(result.current.viewSpan).toBeDefined();
    expect(result.current.canvasWidthPx).toBeGreaterThan(0);
    expect(result.current.locatorLabel).toBe("1.2");
    expect(result.current.loopOn).toBe(false);
    expect(result.current.tempoSegments.length).toBeGreaterThan(0);
    expect(result.current.meterSegments.length).toBeGreaterThan(0);
    expect(result.current.keySegments.length).toBeGreaterThan(0);
  });

  it("handles preview countdown-length gesture and map drag preview", () => {
    const draftProject = createTestProject();
    const viewSpanRef = { current: { start: 0, end: 0 } };
    const barTicksRef = { current: 0 };
    const effectiveLocatorTicksRef = { current: 0 };

    const { result } = renderHook(() =>
      useTimelineCanvasDerived({
        draftProject,
        gesturePreview: {
          kind: "countdown-length",
          clipId: "c1",
          startTicks: 0,
          lengthTicks: 7680,
        },
        gestureSessionRef: { current: null },
        effectiveZoomH: 1,
        displayTicks: 0,
        locatorTicks: 0,
        tool: "tap",
        tapLineIndex: 0,
        state: {
          playing: true,
          timeSignature: { numerator: 4, denominator: 4 },
          ppq: 960,
          loop: { enabled: true, startTicks: 0, endTicks: 3840 },
        },
        loopDraft: null,
        mapDragPreview: {
          lane: "tempo",
          moveIds: ["t1"],
          deltaTicks: 480,
        },
        viewSpanRef,
        barTicksRef,
        effectiveLocatorTicksRef,
      }),
    );

    expect(result.current.loopOn).toBe(true);
    expect(result.current.mapPreviewProject).toBeDefined();
    expect(result.current.tempoSegments.length).toBeGreaterThan(0);
  });
});
