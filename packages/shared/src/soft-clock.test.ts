import { describe, expect, it } from "vitest";
import { DEFAULT_PPQ } from "./time.js";
import {
  getDisplayTicks,
  wrapDisplayTicks,
  type TransportAnchor,
} from "./soft-clock.js";

const anchor: TransportAnchor = {
  positionTicks: 1000,
  bpm: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  ppq: DEFAULT_PPQ,
};

describe("getDisplayTicks", () => {
  it("returns anchor ticks when not playing", () => {
    expect(getDisplayTicks(anchor, 5000, 1000, false)).toBe(1000);
  });

  it("returns anchor at zero elapsed while playing", () => {
    expect(getDisplayTicks(anchor, 1000, 1000, true)).toBe(1000);
  });

  it("advances by one beat after 500ms at 120 BPM 4/4", () => {
    expect(getDisplayTicks(anchor, 1500, 1000, true)).toBe(1000 + DEFAULT_PPQ);
  });

  it("clamps negative elapsed to zero", () => {
    expect(getDisplayTicks(anchor, 900, 1000, true)).toBe(1000);
  });

  it("falls back when timestamps are non-finite", () => {
    expect(getDisplayTicks(anchor, Number.NaN, 1000, true)).toBe(1000);
    expect(
      getDisplayTicks(anchor, 1500, Number.POSITIVE_INFINITY, true),
    ).toBe(1000);
  });

  it("wraps soft clock into an enabled loop range", () => {
    const loop = {
      enabled: true,
      startTicks: 0,
      endTicks: 1000,
    };
    expect(getDisplayTicks(anchor, 1500, 1000, true, loop)).toBe(
      wrapDisplayTicks(1000 + DEFAULT_PPQ, loop),
    );
  });

  it("advances along optional tempoMaps across a BPM drop", () => {
    const mapped: TransportAnchor = {
      positionTicks: 0,
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      ppq: DEFAULT_PPQ,
      tempoMaps: {
        defaultBpm: 120,
        defaultMeter: { numerator: 4, denominator: 4 },
        tempoMap: [
          { id: "t0", startTicks: 0, bpm: 120 },
          { id: "t1", startTicks: 1920, bpm: 60 },
        ],
        meterMap: [],
        ppq: DEFAULT_PPQ,
      },
    };
    // 2000ms: 1s@120 → 1920; 1s@60 → +960
    expect(getDisplayTicks(mapped, 2000, 0, true)).toBe(2880);
  });
});

describe("wrapDisplayTicks", () => {
  it("returns input when loop disabled or ticks before end", () => {
    expect(wrapDisplayTicks(500, null)).toBe(500);
    expect(
      wrapDisplayTicks(500, { enabled: false, startTicks: 0, endTicks: 100 }),
    ).toBe(500);
    expect(
      wrapDisplayTicks(50, { enabled: true, startTicks: 0, endTicks: 100 }),
    ).toBe(50);
  });

  it("wraps positions at or past exclusive end into the loop", () => {
    const loop = { enabled: true, startTicks: 100, endTicks: 200 };
    expect(wrapDisplayTicks(200, loop)).toBe(100);
    expect(wrapDisplayTicks(250, loop)).toBe(150);
    expect(wrapDisplayTicks(399, loop)).toBe(199);
  });
});
