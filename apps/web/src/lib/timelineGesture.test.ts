import { describe, expect, it } from "vitest";
import {
  cursorForHitZone,
  hitTestClipZone,
  snapModeFromModifiers,
  toolAllowsClipHitZones,
  toolIsPencilDraw,
} from "./timelineGesture.js";

describe("timelineGesture", () => {
  it("hit zones only for pointer/smart", () => {
    expect(toolAllowsClipHitZones("pointer")).toBe(true);
    expect(toolAllowsClipHitZones("smart")).toBe(true);
    expect(toolAllowsClipHitZones("pencil")).toBe(false);
    expect(toolIsPencilDraw("pencil")).toBe(true);
  });

  it("hitTestClipZone returns body when zones disabled (pencil)", () => {
    expect(hitTestClipZone(2, 100, false)).toBe("body");
    expect(hitTestClipZone(2, 100, true)).toBe("start");
    expect(hitTestClipZone(50, 100, true)).toBe("body");
    expect(hitTestClipZone(95, 100, true)).toBe("end");
  });

  it("snapModeFromModifiers: Cmd/Ctrl = off", () => {
    expect(snapModeFromModifiers(false, false)).toBe("bar");
    expect(snapModeFromModifiers(true, false)).toBe("off");
    expect(snapModeFromModifiers(false, true)).toBe("off");
  });

  it("cursorForHitZone", () => {
    expect(cursorForHitZone("start", true)).toBe("ew-resize");
    expect(cursorForHitZone("body", false)).toBe("crosshair");
  });
});
