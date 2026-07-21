import { describe, expect, it } from "vitest";
import {
  CLIP_EDGE_HIT_PX,
  CONTENT_DEFAULT_SNAP_MODE,
  contentSnapModeFromModifiers,
  hitTestAudioClipZone,
  hitTestClipZone,
  PENCIL_DRAG_THRESHOLD_PX,
  resolvePencilRangeTicks,
  snapModeFromModifiers,
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
  it("Forma default snap is bar; content default is beat", () => {
    expect(snapModeFromModifiers(false, false)).toBe("bar");
    expect(CONTENT_DEFAULT_SNAP_MODE).toBe("beat");
    expect(contentSnapModeFromModifiers(false, false)).toBe("beat");
    expect(contentSnapModeFromModifiers(true, false)).toBe("off");
  });

  it("hitTestAudioClipZone uses top corners for Smart fades", () => {
    expect(hitTestAudioClipZone(2, 4, 120, 40, true, true)).toBe("fade-in");
    expect(hitTestAudioClipZone(118, 4, 120, 40, true, true)).toBe("fade-out");
    expect(hitTestAudioClipZone(2, 30, 120, 40, true, true)).toBe("start");
    expect(hitTestAudioClipZone(2, 4, 120, 40, true, false)).toBe("start");
  });
});
