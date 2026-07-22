import { describe, expect, it } from "vitest";
import { DEFAULT_SNAP_MODE } from "./snap-grid.js";

const M4 = { numerator: 4, denominator: 4 } as const;
const PPQ = 960;

import {
  quantizeTicks,
  snapTicksToBarStart,
  snapTicksToBeatGrid,
  snapTicksToSubdivision,
} from "./snap-grid.js";

describe("snap-grid", () => {
  it("DEFAULT_SNAP_MODE is bar (miara)", () => {
    expect(DEFAULT_SNAP_MODE).toBe("bar");
  });
  it("snapTicksToBarStart ties midpoint to earlier bar", () => {
    const mid = 1920; // middle of bar 0 in 4/4
    expect(snapTicksToBarStart(mid, M4, PPQ)).toBe(0);
    expect(snapTicksToBarStart(mid + 1, M4, PPQ)).toBe(3840);
  });

  it("snapTicksToBeatGrid quantizes to local beat in 4/4", () => {
    expect(snapTicksToBeatGrid(500, M4, PPQ)).toBe(960);
  });

  it("snapTicksToSubdivision quantizes to eighth of quarter", () => {
    expect(snapTicksToSubdivision(500, 8, PPQ)).toBe(480);
  });

  it("quantizeTicks bar mode clamps to content floor", () => {
    const snapped = quantizeTicks(-3840, "bar", {
      meter: M4,
      ppq: PPQ,
      contentFloorTicks: 0,
    });
    expect(snapped).toBe(0);
  });

  it("quantizeTicks off returns input", () => {
    expect(
      quantizeTicks(123, "off", { meter: M4, ppq: PPQ }),
    ).toBe(123);
  });

  it("quantizeTicks subdivision mode", () => {
    expect(
      quantizeTicks(500, { kind: "subdivision", parts: 4 }, { meter: M4, ppq: PPQ }),
    ).toBe(480);
  });

  it("direct snap helpers reject non-finite ticks", () => {
    expect(() => snapTicksToBarStart(Number.NaN, M4, PPQ)).toThrow(RangeError);
    expect(() =>
      snapTicksToBeatGrid(Number.POSITIVE_INFINITY, M4, PPQ),
    ).toThrow(RangeError);
    expect(() => snapTicksToSubdivision(1.5, 4, PPQ)).toThrow(RangeError);
  });
});
