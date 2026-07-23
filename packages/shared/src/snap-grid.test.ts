import { describe, expect, it } from "vitest";
import { DEFAULT_SNAP_MODE } from "./snap-grid.js";

const M4 = { numerator: 4, denominator: 4 } as const;
const PPQ = 960;

import {
  quantizeTicks,
  snapTicksToBarStart,
  snapTicksToBarStartAlongMeterMap,
  snapTicksToBeatGrid,
  snapTicksToBeatGridAlongMeterMap,
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

  it("snapTicksToBarStartAlongMeterMap walks into 5/8", () => {
    const bar4 = 3840;
    const map = [
      { startTicks: 0, numerator: 4, denominator: 4 },
      { startTicks: bar4 * 2, numerator: 5, denominator: 8 },
    ];
    const mid5 = bar4 * 2 + 1200; // within first 5/8 bar (2400 ticks)
    expect(snapTicksToBarStartAlongMeterMap(mid5, M4, map, PPQ)).toBe(bar4 * 2);
    expect(
      snapTicksToBarStartAlongMeterMap(mid5 + 1, M4, map, PPQ),
    ).toBe(bar4 * 2 + 2400);
  });

  it("snapTicksToBeatGrid quantizes to local beat in 4/4", () => {
    expect(snapTicksToBeatGrid(500, M4, PPQ)).toBe(960);
  });

  it("snapTicksToBeatGridAlongMeterMap snaps within 3/4 after 4/4", () => {
    const bar4 = 3840;
    const map = [
      { startTicks: 0, numerator: 4, denominator: 4 },
      { startTicks: bar4 * 2, numerator: 3, denominator: 4 },
    ];
    const zone = bar4 * 2; // first 3/4 bar: 7680…10560 (beats @ +0,+960,+1920)
    expect(snapTicksToBeatGridAlongMeterMap(zone + 400, M4, map, PPQ)).toBe(
      zone,
    );
    expect(snapTicksToBeatGridAlongMeterMap(zone + 1000, M4, map, PPQ)).toBe(
      zone + 960,
    );
    expect(snapTicksToBeatGridAlongMeterMap(zone + 1900, M4, map, PPQ)).toBe(
      zone + 1920,
    );
  });

  it("snapTicksToBeatGridAlongMeterMap differs from absolute grid when bar start is off-beat", () => {
    // 5/8 bars are 2400 ticks; first 4/4 bar after that starts at 2400 (2400 % 960 ≠ 0).
    const map = [
      { startTicks: 0, numerator: 5, denominator: 8 },
      { startTicks: 2400, numerator: 4, denominator: 4 },
    ];
    const zone = 2400;
    const m44 = { numerator: 4, denominator: 4 } as const;
    const at = zone + 400; // closer to bar start than to beat 2
    const piece = snapTicksToBeatGridAlongMeterMap(at, M4, map, PPQ);
    expect(piece).toBe(zone);
    expect(piece).not.toBe(snapTicksToBeatGrid(at, m44, PPQ)); // absolute → 2880
  });

  it("quantizeTicks beat mode uses meterMap when provided", () => {
    const bar4 = 3840;
    const map = [
      { startTicks: 0, numerator: 4, denominator: 4 },
      { startTicks: bar4 * 2, numerator: 3, denominator: 4 },
    ];
    const zone = bar4 * 2;
    expect(
      quantizeTicks(zone + 1000, "beat", {
        meter: { numerator: 3, denominator: 4 },
        defaultMeter: M4,
        meterMap: map,
        ppq: PPQ,
      }),
    ).toBe(zone + 960);
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

  it.each([
    { ticks: Number.NaN },
    { ticks: 1.5 },
  ] as const)(
    "AlongMeterMap helpers reject non-int ticks ($ticks)",
    ({ ticks }) => {
      expect(() =>
        snapTicksToBarStartAlongMeterMap(ticks, M4, [], PPQ),
      ).toThrow(/ticks must be a finite integer/);
      expect(() =>
        snapTicksToBeatGridAlongMeterMap(ticks, M4, [], PPQ),
      ).toThrow(/ticks must be a finite integer/);
    },
  );

  it.each([
    { parts: 3 as 2 | 4 | 8 | 16, re: /parts must be 2, 4, 8, or 16/ },
    { parts: 32 as 2 | 4 | 8 | 16, re: /parts must be 2, 4, 8, or 16/ },
  ] as const)("snapTicksToSubdivision rejects parts=$parts", ({ parts, re }) => {
    expect(() => snapTicksToSubdivision(0, parts, PPQ)).toThrow(re);
  });

  it("snapTicksToSubdivision rejects PPQ not divisible by parts", () => {
    expect(() => snapTicksToSubdivision(0, 8, 100)).toThrow(
      /PPQ must be divisible by subdivision parts/,
    );
  });

  it.each([
    { ticks: Number.NaN },
    { ticks: 10.5 },
  ] as const)("quantizeTicks rejects non-int ticks ($ticks)", ({ ticks }) => {
    expect(() => quantizeTicks(ticks, "bar", { meter: M4, ppq: PPQ })).toThrow(
      /ticks must be a finite integer/,
    );
  });
});
