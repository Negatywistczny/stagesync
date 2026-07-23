import { describe, expect, it } from "vitest";
import {
  formatChordForDisplay,
  formatHybridPolishB,
} from "./chord-display.js";

describe("chord-display", () => {
  it("symbols by default", () => {
    expect(formatChordForDisplay("Cmaj7")).toBe("CΔ7");
    expect(formatChordForDisplay("Am7b5")).toBe("Aø7");
  });

  it("literalQuality keeps file spelling", () => {
    expect(formatChordForDisplay("Cmaj7", { literalQuality: true })).toBe(
      "Cmaj7",
    );
  });

  it("hybridPolishB: B→H, Bb stays", () => {
    expect(formatHybridPolishB("B")).toBe("H");
    expect(formatHybridPolishB("Bb")).toBe("Bb");
    expect(formatHybridPolishB("F/B")).toBe("F/H");
    expect(formatHybridPolishB("bm7")).toBe("bm7");
    expect(formatHybridPolishB("F/b")).toBe("F/b");
    expect(formatChordForDisplay("Bmaj7", { hybridPolishB: true })).toBe(
      "HΔ7",
    );
  });

  it("complex qualities and slash for Client display (#478)", () => {
    expect(formatChordForDisplay("Edim")).toBe("E°");
    expect(formatChordForDisplay("G/A")).toBe("G/A");
    expect(formatChordForDisplay("G/B", { hybridPolishB: true })).toBe("G/H");
    expect(formatChordForDisplay("Edim", { literalQuality: true })).toBe(
      "Edim",
    );
  });
});
