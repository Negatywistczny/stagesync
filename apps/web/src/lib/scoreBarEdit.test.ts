import { describe, expect, it } from "vitest";
import { createProjectV5Seed, ticksPerBar } from "@stagesync/shared";
import { logicBarFromTicks, ticksFromLogicBar } from "./scoreBarEdit.js";

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
