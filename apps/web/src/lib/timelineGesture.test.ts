import { describe, expect, it } from "vitest";
import { DEFAULT_SNAP_MODE } from "@stagesync/shared";
import {
  CLIP_EDGE_HIT_PX,
  CONTENT_DEFAULT_SNAP_MODE,
  contentSnapModeFromModifiers,
  hitTestAudioClipZone,
  hitTestClipZone,
  PENCIL_DRAG_THRESHOLD_PX,
  resolvePencilRangeTicks,
  setSessionSnapMode,
  snapModeFromModifiers,
  snapModeFromStorageKey,
  snapModeToStorageKey,
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
