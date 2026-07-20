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
    expect(formatChordForDisplay("Bmaj7", { hybridPolishB: true })).toBe(
      "HΔ7",
    );
  });
});
