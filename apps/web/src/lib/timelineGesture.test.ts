import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SNAP_MODE } from "@stagesync/shared";
import {
  CLIP_EDGE_HIT_PX,
  CONTENT_DEFAULT_SNAP_MODE,
  contentSnapModeFromModifiers,
  cursorForHitZone,
  effectiveTimelineTool,
  getSessionSnapMode,
  hitTestAudioClipZone,
  hitTestClipZone,
  loadSessionSnapModeFromStorage,
  PENCIL_DRAG_THRESHOLD_PX,
  persistSessionSnapMode,
  resolvePencilRangeTicks,
  setSessionSnapMode,
  snapModeFromModifiers,
  snapModeFromPointerEvent,
  snapModeFromStorageKey,
  snapModeToStorageKey,
  cursorForTimelineTool,
  toolAllowsClipHitZones,
  toolIsPencilDraw,
  toolUsesMarqueeGesture,
} from "./timelineGesture.js";

describe("resolvePencilRangeTicks", () => {
  const bar = 3840;

  it("treats tiny dx as 1-bar click", () => {
    const r = resolvePencilRangeTicks(0, 100, {
      barTicks: bar,
      dxPx: PENCIL_DRAG_THRESHOLD_PX - 1,
    });
    expect(r.isClick).toBe(true);
    expect(r.startTicks).toBe(0);
    expect(r.lengthTicks).toBe(bar);
  });

  it("resolves drag span across bars", () => {
    const r = resolvePencilRangeTicks(0, 7680, {
      barTicks: bar,
      dxPx: 40,
    });
    expect(r.isClick).toBe(false);
    expect(r.startTicks).toBe(0);
    expect(r.lengthTicks).toBe(7680);
  });

  it("respects content floor", () => {
    const r = resolvePencilRangeTicks(-100, 3840, {
      barTicks: bar,
      dxPx: 20,
      floorTicks: 0,
    });
    expect(r.startTicks).toBe(0);
    expect(r.lengthTicks).toBe(3840);
  });

  it.each([
    { downTicks: Number.NaN, upTicks: 100, barTicks: bar, dxPx: 40 },
    { downTicks: 0, upTicks: Number.NaN, barTicks: bar, dxPx: 40 },
    { downTicks: 0, upTicks: 100, barTicks: Number.NaN, dxPx: 40 },
    { downTicks: 0, upTicks: 100, barTicks: bar, dxPx: Number.NaN },
    {
      downTicks: Number.POSITIVE_INFINITY,
      upTicks: 100,
      barTicks: bar,
      dxPx: 40,
    },
  ] as const)(
    "falls back to 1-bar click when ticks/dx are non-finite",
    (opts) => {
      const r = resolvePencilRangeTicks(opts.downTicks, opts.upTicks, {
        barTicks: opts.barTicks,
        dxPx: opts.dxPx,
        floorTicks: 0,
      });
      expect(r.isClick).toBe(true);
      expect(r.startTicks).toBe(0);
      if (Number.isFinite(opts.barTicks)) {
        expect(r.lengthTicks).toBe(Math.max(1, Math.floor(opts.barTicks)));
      }
    },
  );
});

describe("snap modes + hit zones", () => {
  it("session default snap is bar; Cmd/Ctrl forces off", () => {
    setSessionSnapMode(DEFAULT_SNAP_MODE);
    expect(snapModeFromModifiers(false, false)).toBe("bar");
    expect(CONTENT_DEFAULT_SNAP_MODE).toBe("beat");
    expect(contentSnapModeFromModifiers(false, false)).toBe("bar");
    expect(contentSnapModeFromModifiers(true, false)).toBe("off");
    expect(
      contentSnapModeFromModifiers(false, false, CONTENT_DEFAULT_SNAP_MODE),
    ).toBe("beat");
  });

  it("session picker beat/subdivision is honored until Cmd-off", () => {
    setSessionSnapMode("beat");
    expect(snapModeFromModifiers(false, false)).toBe("beat");
    setSessionSnapMode({ kind: "subdivision", parts: 4 });
    expect(snapModeFromModifiers(false, false)).toEqual({
      kind: "subdivision",
      parts: 4,
    });
    expect(snapModeFromModifiers(false, true)).toBe("off");
    setSessionSnapMode(DEFAULT_SNAP_MODE);
  });

  it("storage key round-trip", () => {
    expect(snapModeFromStorageKey("bar")).toBe("bar");
    expect(snapModeFromStorageKey("subdivision:8")).toEqual({
      kind: "subdivision",
      parts: 8,
    });
    expect(snapModeToStorageKey({ kind: "subdivision", parts: 2 })).toBe(
      "subdivision:2",
    );
  });

  it("hitTestClipZone uses edge px for resize", () => {
    expect(CLIP_EDGE_HIT_PX).toBeGreaterThanOrEqual(8);
    expect(hitTestClipZone(0, 96, true)).toBe("start");
    expect(hitTestClipZone(95, 96, true)).toBe("end");
    expect(hitTestClipZone(48, 96, true)).toBe("body");
    expect(hitTestClipZone(0, 96, false)).toBe("body");
  });

  it("hitTestAudioClipZone uses top corners for Smart fades", () => {
    expect(hitTestAudioClipZone(2, 4, 120, 40, true, true)).toBe("fade-in");
    expect(hitTestAudioClipZone(118, 4, 120, 40, true, true)).toBe("fade-out");
    expect(hitTestAudioClipZone(2, 30, 120, 40, true, true)).toBe("start");
    expect(hitTestAudioClipZone(2, 4, 120, 40, true, false)).toBe("start");
  });
});

describe("timelineGesture remaining", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("storage load/persist, tools, cursor, pointer snap", () => {
    expect(toolAllowsClipHitZones("pointer")).toBe(true);
    expect(toolAllowsClipHitZones("pencil")).toBe(false);
    expect(toolAllowsClipHitZones("fade")).toBe(false);
    expect(toolIsPencilDraw("pencil")).toBe(true);
    expect(toolIsPencilDraw("eraser")).toBe(false);
    expect(toolUsesMarqueeGesture("marquee")).toBe(true);
    expect(toolUsesMarqueeGesture("zoom")).toBe(true);
    expect(toolUsesMarqueeGesture("eraser")).toBe(false);
    expect(cursorForTimelineTool("scissors")).toBe("col-resize");
    expect(cursorForTimelineTool("gain")).toBe("ns-resize");
    expect(cursorForTimelineTool("zoom")).toBe("zoom-in");
    expect(effectiveTimelineTool("pointer", true, true)).toBe("zoom");
    expect(effectiveTimelineTool("pencil", true, false)).toBe("pencil");
    expect(snapModeFromPointerEvent({ metaKey: true, ctrlKey: false })).toBe("off");
    expect(cursorForHitZone("body", false)).toBe("crosshair");
    expect(cursorForHitZone("fade-in", true)).toBe("col-resize");
    expect(cursorForHitZone("fade-out", true)).toBe("col-resize");
    expect(cursorForHitZone("start", true)).toBe("ew-resize");
    expect(cursorForHitZone("end", true)).toBe("ew-resize");
    expect(cursorForHitZone("body", true)).toBe("grab");
    expect(snapModeToStorageKey("off")).toBe("off");
    expect(snapModeFromStorageKey(null)).toBeNull();
    expect(snapModeFromStorageKey("")).toBeNull();
    expect(snapModeFromStorageKey("nope")).toBeNull();

    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: () => undefined,
      clear: () => undefined,
    });
    persistSessionSnapMode("beat");
    expect(getSessionSnapMode()).toBe("beat");
    expect(store.get("stagesync-timeline-snap-mode")).toBe("beat");
    store.set("stagesync-timeline-snap-mode", "subdivision:16");
    expect(loadSessionSnapModeFromStorage()).toEqual({ kind: "subdivision", parts: 16 });
    store.clear();
    expect(loadSessionSnapModeFromStorage()).toBe(getSessionSnapMode());

    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    });
    expect(loadSessionSnapModeFromStorage()).toBe(getSessionSnapMode());
    persistSessionSnapMode("bar"); // swallows throw
    expect(getSessionSnapMode()).toBe("bar");
  });
});
