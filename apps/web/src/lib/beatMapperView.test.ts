import { describe, expect, it } from "vitest";
import {
  BEAT_MAPPER_DEFAULT_VIEW_WINDOW_MS,
  BEAT_MAPPER_ZOOM_MAX,
  beatMapperWheelPanDelta,
  defaultBeatMapperZoom,
  isBeatMapperHorizontalWheel,
} from "./beatMapperView.js";

describe("defaultBeatMapperZoom", () => {
  it("shows full clip when shorter than default window", () => {
    expect(defaultBeatMapperZoom(15_000)).toBe(1);
  });

  it("frames ~30s at the start for longer tracks", () => {
    expect(defaultBeatMapperZoom(240_000)).toBe(
      240_000 / BEAT_MAPPER_DEFAULT_VIEW_WINDOW_MS,
    );
  });

  it("clamps to max zoom", () => {
    expect(defaultBeatMapperZoom(10_000_000)).toBe(BEAT_MAPPER_ZOOM_MAX);
  });
});

describe("beatMapperWheelPanDelta", () => {
  it("uses deltaY for Shift+wheel when vertical dominates", () => {
    expect(
      beatMapperWheelPanDelta({
        shiftKey: true,
        deltaX: 0,
        deltaY: 48,
      }),
    ).toBe(48);
  });

  it("uses deltaX for Shift+wheel when browser sends horizontal scroll", () => {
    expect(
      beatMapperWheelPanDelta({
        shiftKey: true,
        deltaX: -32,
        deltaY: 0,
      }),
    ).toBe(-32);
  });

  it("prefers deltaX for trackpad horizontal pan without Shift", () => {
    expect(
      beatMapperWheelPanDelta({
        shiftKey: false,
        deltaX: 12,
        deltaY: 2,
      }),
    ).toBe(12);
  });
});

describe("isBeatMapperHorizontalWheel", () => {
  it("treats Shift+vertical wheel as horizontal pan", () => {
    expect(
      isBeatMapperHorizontalWheel({
        shiftKey: true,
        deltaX: 0,
        deltaY: 10,
      }),
    ).toBe(true);
  });
});
