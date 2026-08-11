import { describe, expect, it } from "vitest";
import {
  ceilTicksToBar,
  isUgPipeBarLine,
  parseUgPipeBars,
  quantizeTicksToBar,
  quantizeTicksToBarOrHalf,
  sectionStartFromVocalTicks,
} from "./ug-pipe-bars.js";

describe("isUgPipeBarLine", () => {
  it("accepts Winner-style intro rows", () => {
    expect(isUgPipeBarLine("| G | G B7 | Em | Em E7/G# |")).toBe(true);
    expect(isUgPipeBarLine("| Am | % | D | % |")).toBe(true);
    expect(isUgPipeBarLine("| [G] | [G] [B7] | [Em] | [Em] [E7/G#] |")).toBe(
      true,
    );
  });

  it("rejects lyrics and noise", () => {
    expect(isUgPipeBarLine("I don't wanna talk")).toBe(false);
    expect(isUgPipeBarLine("[G]Hello world")).toBe(false);
    expect(isUgPipeBarLine("1 + 2 + 3 + 4 +")).toBe(false);
  });
});

describe("parseUgPipeBars", () => {
  it("expands Winner Intro grid: half-bars and % repeats", () => {
    const lines = [
      "| G | G B7 | Em | Em E7/G# |",
      "| Am | % | D | % |",
      "| G | G B7 | Em | Em E7/G# |",
      "| Am | % | D | % |",
    ];
    const { events, barCount } = parseUgPipeBars(lines);
    expect(barCount).toBe(16);
    // Raw events keep per-cell symbols (`| G | G B7 |` → G, G, B7); merge is at place time.
    expect(events.filter((e) => !e.isRest).map((e) => e.symbol)).toEqual([
      "G",
      "G",
      "B7",
      "Em",
      "Em",
      "E7/G#",
      "Am",
      "Am",
      "D",
      "D",
      "G",
      "G",
      "B7",
      "Em",
      "Em",
      "E7/G#",
      "Am",
      "Am",
      "D",
      "D",
    ]);
    // | G | G B7 | → G @0, G @0 of bar 1, B7 @0.5 of bar 1
    expect(events[0]).toMatchObject({
      barIndex: 0,
      offsetInBar: 0,
      symbol: "G",
    });
    expect(events[1]).toMatchObject({
      barIndex: 1,
      offsetInBar: 0,
      symbol: "G",
    });
    expect(events[2]).toMatchObject({
      barIndex: 1,
      offsetInBar: 0.5,
      symbol: "B7",
    });
    // | Am | % | → Am on bars 4 and 5
    const amEvents = events.filter((e) => e.symbol === "Am");
    expect(amEvents[0]?.barIndex).toBe(4);
    expect(amEvents[1]?.barIndex).toBe(5);
  });

  it("treats N.C. as rest cell", () => {
    const { events, barCount } = parseUgPipeBars(["| G | N.C. | Am |"]);
    expect(barCount).toBe(3);
    expect(events.some((e) => e.isRest && e.barIndex === 1)).toBe(true);
  });
});

describe("quantize / sectionStartFromVocalTicks", () => {
  const BAR = 3840;

  it("snaps to bar or half-bar", () => {
    expect(quantizeTicksToBarOrHalf(0, BAR)).toBe(0);
    expect(quantizeTicksToBarOrHalf(BAR + 100, BAR)).toBe(BAR);
    expect(quantizeTicksToBarOrHalf(BAR + BAR / 2 + 50, BAR)).toBe(
      BAR + BAR / 2,
    );
  });

  it("snaps to Beat 1 only", () => {
    expect(quantizeTicksToBar(BAR + BAR / 2 + 50, BAR)).toBe(BAR * 2);
    expect(quantizeTicksToBar(BAR + BAR / 2 - 50, BAR)).toBe(BAR);
  });

  it("maps pickups forward to the next barline", () => {
    // bar 17 beat 3 → Verse at bar 18
    const pickup = 16 * BAR + BAR / 2; // 17.3.0 in 1-based = bar index 16, beat 3
    expect(sectionStartFromVocalTicks(pickup, BAR)).toBe(17 * BAR);
    expect(sectionStartFromVocalTicks(17 * BAR, BAR)).toBe(17 * BAR);
    expect(sectionStartFromVocalTicks(17 * BAR + 50, BAR)).toBe(17 * BAR);
  });

  it("ceils to bar", () => {
    expect(ceilTicksToBar(100, BAR)).toBe(BAR);
    expect(ceilTicksToBar(BAR, BAR)).toBe(BAR);
  });
});
