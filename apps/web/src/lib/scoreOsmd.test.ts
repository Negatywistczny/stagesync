/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  OpenSheetMusicDisplayMock,
  PointF2DMock,
  renderSpy,
  updateGraphicSpy,
} = vi.hoisted(() => {
  const renderSpy = vi.fn();
  const updateGraphicSpy = vi.fn();

  class PointF2DMock {
    constructor(
      public x: number,
      public y: number,
    ) {}
  }

  class OpenSheetMusicDisplayMock {
    EngravingRules = {
      PageBackgroundColor: "",
      RestoreCursorAfterRerender: true,
    };
    Zoom = 1;
    Sheet: {
      SourceMeasures?: unknown[];
      Instruments?: unknown[];
      Transpose?: number;
    } | null = null;
    GraphicSheet: {
      MeasureList?: unknown;
      GetNearestNote?: (
        pos: PointF2DMock,
        max: PointF2DMock,
      ) => {
        sourceNote?: { SourceMeasure?: { MeasureNumber?: number } };
      } | null;
    } | null = null;
    cursors: Array<{
      reset: () => void;
      show: () => void;
      nextMeasure: () => void;
      update: () => void;
      adjustToBackgroundColor?: () => void;
      cursorElement?: HTMLElement | null;
    }> = [];
    cursor: unknown;
    constructor(
      public container: HTMLElement,
      public options: unknown,
    ) {}
    IsReadyToRender = vi.fn(() => false);
    render = renderSpy;
    updateGraphic = updateGraphicSpy;
  }

  return {
    OpenSheetMusicDisplayMock,
    PointF2DMock,
    renderSpy,
    updateGraphicSpy,
  };
});

vi.mock("opensheetmusicdisplay", () => ({
  OpenSheetMusicDisplay: OpenSheetMusicDisplayMock,
  PointF2D: PointF2DMock,
}));

import {
  applyOsmdZoom,
  applyScorePartVisibility,
  applyScoreSheetTranspose,
  clampScoreBar,
  clampScoreOctave,
  createOsmd,
  fetchScoreBlob,
  getMeasureCount,
  goToScoreBar,
  listScoreParts,
  loadScoreHiddenParts,
  loadScoreOctave,
  renderOsmd,
  saveScoreHiddenParts,
  saveScoreOctave,
  scoreBarFromClientPoint,
  scoreInstrumentId,
  scoreOctaveToSemitones,
  scrollCursorIntoView,
} from "./scoreOsmd.js";

function makeOsmd() {
  return createOsmd(document.createElement("div")) as unknown as InstanceType<
    typeof OpenSheetMusicDisplayMock
  >;
}

describe("scoreOsmd", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    renderSpy.mockClear();
    updateGraphicSpy.mockClear();
    memory.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, String(v));
      },
      removeItem: (k: string) => {
        memory.delete(k);
      },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("createOsmd / renderOsmd", () => {
    it("constructs OSMD with cursor options and engraving flags", () => {
      const el = document.createElement("div");
      const osmd = createOsmd(el) as unknown as InstanceType<
        typeof OpenSheetMusicDisplayMock
      >;
      expect(osmd.container).toBe(el);
      expect(osmd.EngravingRules.PageBackgroundColor).toBe("#ffffff");
      expect(osmd.EngravingRules.RestoreCursorAfterRerender).toBe(false);
      expect(osmd.options).toMatchObject({
        backend: "svg",
        followCursor: false,
      });
    });

    it("renderOsmd no-ops until ready, then renders", () => {
      const osmd = makeOsmd();
      renderOsmd(osmd as never);
      expect(renderSpy).not.toHaveBeenCalled();
      osmd.IsReadyToRender.mockReturnValue(true);
      renderOsmd(osmd as never);
      expect(renderSpy).toHaveBeenCalledOnce();
    });
  });

  describe("measure helpers", () => {
    it("getMeasureCount prefers SourceMeasures then MeasureList", () => {
      const osmd = makeOsmd();
      expect(getMeasureCount(osmd as never)).toBe(1);
      osmd.Sheet = { SourceMeasures: [{}, {}, {}] };
      expect(getMeasureCount(osmd as never)).toBe(3);
      osmd.Sheet = null;
      osmd.GraphicSheet = { MeasureList: [{}, {}] };
      expect(getMeasureCount(osmd as never)).toBe(2);
    });

    it("clampScoreBar floors and clamps to measure range", () => {
      const osmd = makeOsmd();
      osmd.Sheet = { SourceMeasures: [{}, {}, {}, {}] };
      expect(clampScoreBar(osmd as never, 0)).toBe(1);
      expect(clampScoreBar(osmd as never, 2.9)).toBe(2);
      expect(clampScoreBar(osmd as never, 99)).toBe(4);
    });
  });

  describe("goToScoreBar / zoom / scroll", () => {
    it("goToScoreBar advances measure cursor and styles element", () => {
      const cursorEl = document.createElement("div");
      const nextMeasure = vi.fn();
      const osmd = makeOsmd();
      osmd.Sheet = { SourceMeasures: [{}, {}, {}, {}] };
      osmd.cursors = [
        {
          reset: vi.fn(),
          show: vi.fn(),
          nextMeasure,
          update: vi.fn(),
          adjustToBackgroundColor: vi.fn(),
          cursorElement: cursorEl,
        },
      ];

      goToScoreBar(osmd as never, 3);
      expect(nextMeasure).toHaveBeenCalledTimes(2);
      expect(cursorEl.style.pointerEvents).toBe("none");
      expect(cursorEl.style.zIndex).toBe("5");
    });

    it("goToScoreBar no-ops without cursors", () => {
      const osmd = makeOsmd();
      osmd.cursors = [];
      expect(() => goToScoreBar(osmd as never, 2)).not.toThrow();
    });

    it("applyOsmdZoom clamps and re-renders when ready", () => {
      const osmd = makeOsmd();
      applyOsmdZoom(osmd as never, 10);
      expect(osmd.Zoom).toBe(0.4);
      osmd.IsReadyToRender.mockReturnValue(true);
      applyOsmdZoom(osmd as never, 300);
      expect(osmd.Zoom).toBe(2.5);
      expect(renderSpy).toHaveBeenCalled();
    });

    it("scrollCursorIntoView scrolls toward cursor", () => {
      const cursorEl = document.createElement("div");
      cursorEl.getBoundingClientRect = () =>
        ({
          top: 200,
          left: 0,
          bottom: 220,
          right: 10,
          width: 10,
          height: 20,
          x: 0,
          y: 200,
          toJSON() {},
        }) as DOMRect;
      const scrollEl = document.createElement("div");
      scrollEl.scrollTop = 0;
      scrollEl.getBoundingClientRect = () =>
        ({
          top: 0,
          left: 0,
          bottom: 100,
          right: 100,
          width: 100,
          height: 100,
          x: 0,
          y: 0,
          toJSON() {},
        }) as DOMRect;
      const scrollTo = vi.fn();
      scrollEl.scrollTo = scrollTo as never;

      const osmd = makeOsmd();
      osmd.cursors = [
        {
          reset: vi.fn(),
          show: vi.fn(),
          nextMeasure: vi.fn(),
          update: vi.fn(),
          cursorElement: cursorEl,
        },
      ];

      scrollCursorIntoView(scrollEl, osmd as never);
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: "smooth" }),
      );
    });
  });

  describe("scoreBarFromClientPoint", () => {
    it("returns null without GraphicSheet", () => {
      const osmd = makeOsmd();
      const container = document.createElement("div");
      expect(scoreBarFromClientPoint(osmd as never, container, 0, 0)).toBeNull();
    });

    it("uses GetNearestNote when available", () => {
      const osmd = makeOsmd();
      osmd.Zoom = 1;
      osmd.GraphicSheet = {
        GetNearestNote: () => ({
          sourceNote: { SourceMeasure: { MeasureNumber: 7 } },
        }),
        MeasureList: [],
      };
      const container = document.createElement("div");
      container.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          right: 100,
          bottom: 100,
          width: 100,
          height: 100,
          x: 0,
          y: 0,
          toJSON() {},
        }) as DOMRect;
      expect(scoreBarFromClientPoint(osmd as never, container, 10, 10)).toBe(7);
    });

    it("falls back to MeasureList hit-test / nearest", () => {
      const osmd = makeOsmd();
      osmd.Zoom = 1;
      osmd.GraphicSheet = {
        GetNearestNote: () => {
          throw new Error("no note");
        },
        MeasureList: [
          [
            {
              MeasureNumber: 2,
              PositionAndShape: {
                AbsolutePosition: { x: 1, y: 1 },
                Size: { width: 2, height: 2 },
              },
            },
          ],
          [
            {
              MeasureNumber: 3,
              PositionAndShape: {
                AbsolutePosition: { x: 20, y: 20 },
                Size: { width: 1, height: 1 },
              },
            },
          ],
        ],
      };
      const container = document.createElement("div");
      container.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          right: 400,
          bottom: 400,
          width: 400,
          height: 400,
          x: 0,
          y: 0,
          toJSON() {},
        }) as DOMRect;
      // scale = 10; measure 2 box: left=10, top=10, right=30, bottom=30
      expect(scoreBarFromClientPoint(osmd as never, container, 15, 15)).toBe(2);
      // outside → nearest
      expect(scoreBarFromClientPoint(osmd as never, container, 5, 5)).toBe(2);
    });
  });

  describe("parts / transpose", () => {
    it("listScoreParts maps instruments", () => {
      const osmd = makeOsmd();
      expect(listScoreParts(osmd as never)).toEqual([]);
      osmd.Sheet = {
        Instruments: [
          { Name: "Piano", IdString: "P1" },
          { PartAbbreviation: "Vl" },
        ],
      };
      expect(listScoreParts(osmd as never)).toEqual([
        { id: "P1::0", label: "Piano", index: 0 },
        { id: "Vl::1", label: "Vl", index: 1 },
      ]);
    });

    it("applyScorePartVisibility keeps at least one part visible", () => {
      const osmd = makeOsmd();
      const voices = [{ Visible: true }];
      osmd.Sheet = {
        Instruments: [
          { Name: "A", IdString: "A", Voices: voices },
          { Name: "B", IdString: "B", Voices: [{ Visible: true }] },
        ],
      };
      applyScorePartVisibility(osmd as never, ["A::0", "B::1"]);
      expect((osmd.Sheet!.Instruments![0] as { Visible: boolean }).Visible).toBe(
        true,
      );
      expect((osmd.Sheet!.Instruments![1] as { Visible: boolean }).Visible).toBe(
        false,
      );
    });

    it("applyScoreSheetTranspose updates and renders", () => {
      const osmd = makeOsmd();
      applyScoreSheetTranspose(osmd as never, 12);
      osmd.Sheet = { Transpose: 0 };
      osmd.IsReadyToRender.mockReturnValue(true);
      applyScoreSheetTranspose(osmd as never, 12);
      expect(osmd.Sheet.Transpose).toBe(12);
      expect(updateGraphicSpy).toHaveBeenCalled();
      expect(renderSpy).toHaveBeenCalled();

      applyScoreSheetTranspose(osmd as never, 12);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it("applyScoreSheetTranspose tolerates updateGraphic failure", () => {
      const osmd = makeOsmd();
      osmd.Sheet = { Transpose: 0 };
      osmd.IsReadyToRender.mockReturnValue(false);
      updateGraphicSpy.mockImplementationOnce(() => {
        throw new Error("old osmd");
      });
      expect(() => applyScoreSheetTranspose(osmd as never, 5)).not.toThrow();
      expect(osmd.Sheet.Transpose).toBe(5);
    });
  });

  describe("localStorage prefs", () => {
    it("round-trips hidden parts and octave", () => {
      expect(loadScoreHiddenParts("p1")).toEqual([]);
      saveScoreHiddenParts("p1", ["A::0"]);
      expect(loadScoreHiddenParts("p1")).toEqual(["A::0"]);
      expect(loadScoreHiddenParts("p2")).toEqual([]);

      expect(loadScoreOctave("p1")).toBe(0);
      saveScoreOctave("p1", 1);
      expect(loadScoreOctave("p1")).toBe(1);
      expect(clampScoreOctave("x")).toBe(0);
      expect(scoreOctaveToSemitones(1)).toBe(12);
      expect(scoreInstrumentId({}, 3)).toBe("part::3");
    });

    it("returns defaults on corrupt storage", () => {
      memory.set("stagesync-score-hidden-parts", "{");
      memory.set("stagesync-score-octave", "{");
      expect(loadScoreHiddenParts("p1")).toEqual([]);
      expect(loadScoreOctave("p1")).toBe(0);
    });
  });

  describe("fetchScoreBlob", () => {
    it("returns blob bytes and throws on HTTP error", async () => {
      const blob = new Blob([new Uint8Array([1, 2])]);
      const ok = await fetchScoreBlob("/x", async () =>
        ({
          ok: true,
          status: 200,
          blob: async () => blob,
        }) as Response,
      );
      expect(ok).toBe(blob);
      await expect(
        fetchScoreBlob("/x", async () =>
          ({
            ok: false,
            status: 500,
            blob: async () => blob,
          }) as Response,
        ),
      ).rejects.toThrow(/HTTP 500/);
    });
  });
});
