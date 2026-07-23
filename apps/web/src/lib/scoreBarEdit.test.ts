import { describe, expect, it } from "vitest";
import { createProjectV5Seed, ticksPerBar } from "@stagesync/shared";
import {
  logicBarFromTicks,
  moveScoreAnchor,
  scoreAnchors,
  ticksFromLogicBar,
} from "./scoreBarEdit.js";

describe("ticksFromLogicBar / logicBarFromTicks meter walk", () => {
  it("round-trips with constant 4/4", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    for (const bar of [1, 2, 5, 17]) {
      const ticks = ticksFromLogicBar(p, bar);
      expect(logicBarFromTicks(p, ticks)).toBe(bar);
    }
  });

  it("accounts for mid-song meter change", () => {
    const base = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    const bar4_4 = ticksPerBar(base.defaultMeter, base.ppq);
    const p = {
      ...base,
      meterMap: [
        {
          id: "m0",
          startTicks: 0,
          numerator: 4,
          denominator: 4,
        },
        {
          id: "m1",
          startTicks: bar4_4 * 2,
          numerator: 5,
          denominator: 8,
        },
      ],
    };
    const bar5_8 = ticksPerBar(
      { numerator: 5, denominator: 8 },
      p.ppq,
    );
    // logic bar 3 = after two 4/4 bars
    expect(ticksFromLogicBar(p, 3)).toBe(bar4_4 * 2);
    // logic bar 4 = after two 4/4 + one 5/8
    expect(ticksFromLogicBar(p, 4)).toBe(bar4_4 * 2 + bar5_8);
    expect(logicBarFromTicks(p, bar4_4 * 2 + bar5_8)).toBe(4);
  });
});

describe("moveScoreAnchor (#477)", () => {
  it("moves an anchor to a free logic bar", () => {
    const base = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    const p = {
      ...base,
      scoreBarMap: {
        anchors: [
          { id: "a1", logicBar: 1, scoreBar: 1 },
          { id: "a2", logicBar: 3, scoreBar: 2 },
        ],
      },
    };
    const toBar2 = ticksFromLogicBar(p, 2);
    const next = moveScoreAnchor(p, "a1", toBar2);
    const anchors = scoreAnchors(next);
    expect(anchors.find((a) => a.id === "a1")?.logicBar).toBe(2);
    expect(anchors.find((a) => a.id === "a2")?.logicBar).toBe(3);
    expect(anchors).toHaveLength(2);
  });

  it("no-ops when target logic bar is occupied (does not drop peer)", () => {
    const base = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    const p = {
      ...base,
      scoreBarMap: {
        anchors: [
          { id: "a1", logicBar: 1, scoreBar: 1 },
          { id: "a2", logicBar: 3, scoreBar: 2 },
        ],
      },
    };
    const toBar3 = ticksFromLogicBar(p, 3);
    const next = moveScoreAnchor(p, "a1", toBar3);
    expect(next).toBe(p);
    const anchors = scoreAnchors(next);
    expect(anchors.find((a) => a.id === "a1")?.logicBar).toBe(1);
    expect(anchors.find((a) => a.id === "a2")?.logicBar).toBe(3);
    expect(anchors).toHaveLength(2);
  });
});
