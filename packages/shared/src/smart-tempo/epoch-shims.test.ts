import { describe, it, expect } from "vitest";
import {
  beatGridToContentEpoch,
  tempoNodesToContentEpoch,
  tempoNodesToFileEpoch,
  ticksAtConstantBpmFromMs,
} from "./epoch-shims.js";
import type { TempoNode } from "./types.js";

describe("epoch-shims", () => {
  it("beatGridToContentEpoch clones beat array", () => {
    const beats = [0, 500, 1000];
    expect(beatGridToContentEpoch(beats, 100)).toEqual(beats);
    expect(beatGridToContentEpoch([], 100)).toEqual([]);
  });

  it("tempoNodesToContentEpoch and tempoNodesToFileEpoch clone tempo nodes", () => {
    const nodes: TempoNode[] = [
      { wallMs: 0, targetTick: 0 },
      { wallMs: 500, targetTick: 960 },
    ];
    expect(tempoNodesToContentEpoch(nodes, 50)).toEqual(nodes);
    expect(tempoNodesToFileEpoch(nodes, 50)).toEqual(nodes);
  });

  it("ticksAtConstantBpmFromMs calculates ticks from milliseconds", () => {
    expect(ticksAtConstantBpmFromMs(1000, 120, 960, 0)).toBe(1920);
    expect(ticksAtConstantBpmFromMs(0, 120, 960, 100)).toBe(100);
    expect(ticksAtConstantBpmFromMs(-50, 120, 960, 0)).toBe(0);
    expect(ticksAtConstantBpmFromMs(1000, 0, 960, 0)).toBe(0);
  });
});
