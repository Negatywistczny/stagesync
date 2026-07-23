import { describe, expect, it } from "vitest";
import { MIDDLE_ELLIPSIS, truncateMiddle } from "./truncateMiddle.js";

/** Unit width = character count (monospace stub). */
const measure = (s: string) => s.length;

describe("truncateMiddle", () => {
  it("returns full text when it fits", () => {
    expect(truncateMiddle("Backing Vox 1", 20, measure)).toBe("Backing Vox 1");
  });

  it("returns empty when maxWidth is non-positive", () => {
    expect(truncateMiddle("Backing Vox 1", 0, measure)).toBe("");
    expect(truncateMiddle("Backing Vox 1", -1, measure)).toBe("");
  });

  it("middle-truncates with prefix preference", () => {
    // "Backing Vox 1" = 13; budget 12 → keep 11 + … → "Backin…Vox 1"
    // (doc example "Backing…Vox 1" is the same style with proportional fonts)
    const out = truncateMiddle("Backing Vox 1", 12, measure);
    expect(out).toBe(`Backin${MIDDLE_ELLIPSIS}Vox 1`);
    expect(measure(out)).toBeLessThanOrEqual(12);
    expect(out.startsWith("Back")).toBe(true);
    expect(out.endsWith("Vox 1")).toBe(true);
  });

  it("shrinks further when width is tighter", () => {
    const out = truncateMiddle("Backing Vox 1", 8, measure);
    expect(measure(out)).toBeLessThanOrEqual(8);
    expect(out).toContain(MIDDLE_ELLIPSIS);
  });

  it("falls back to ellipsis-only when nothing else fits", () => {
    expect(truncateMiddle("Hello", 1, measure)).toBe(MIDDLE_ELLIPSIS);
  });

  it("accepts a custom ellipsis", () => {
    const out = truncateMiddle("ABCDEFGH", 6, measure, "..");
    expect(out).toContain("..");
    expect(measure(out)).toBeLessThanOrEqual(6);
  });
});
