import { describe, expect, it } from "vitest";
import {
  alignWordSequences,
  normalizeLyricToken,
  normalizeTekstBlockTimings,
  quantizeChordOnsets,
  tokenizeLyrics,
} from "./text-anchor-bridge.js";

describe("text-anchor-bridge pure helpers", () => {
  it("normalizeLyricToken + tokenizeLyrics", () => {
    expect(normalizeLyricToken("Café!")).toBe("cafe");
    expect(tokenizeLyrics("  One  two-three  ").map((t) => t.norm)).toEqual([
      "one",
      "twothree",
    ]);
  });

  it("alignWordSequences matches identical norms", () => {
    const r = alignWordSequences(["a", "b", "c"], ["a", "b", "c"]);
    expect(r.matches).toBe(3);
    expect(r.score).toBe(1);
    expect(r.mapAtoB).toEqual([0, 1, 2]);
  });

  it("quantizeChordOnsets stays inside section window", () => {
    const bar = 1920;
    const q = quantizeChordOnsets([100, 5000], 0, 4 * bar, bar, "bar");
    expect(q[0]).toBeGreaterThanOrEqual(0);
    expect(q[0]).toBeLessThan(4 * bar);
    expect(q[1]).toBeLessThan(4 * bar);
  });

  it("normalizeTekstBlockTimings untangles inverted onsets", () => {
    const out = normalizeTekstBlockTimings(
      [
        { id: "b2", text: "b", startTicks: 20, lengthTicks: 5 },
        { id: "b1", text: "a", startTicks: 10, lengthTicks: 5 },
      ],
      0,
      100,
    );
    expect(out.map((b) => b.id)).toEqual(["b1", "b2"]);
    expect(out[1]!.startTicks).toBeGreaterThanOrEqual(out[0]!.startTicks + 1);
  });
});
