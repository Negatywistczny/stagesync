import { describe, expect, it } from "vitest";
import {
  clampScoreOctave,
  scoreInstrumentId,
  scoreOctaveToSemitones,
} from "./scoreOsmd.js";

describe("scoreOsmd parts/octave helpers", () => {
  it("builds stable part ids", () => {
    expect(scoreInstrumentId({ Name: "Violin" }, 0)).toBe("Violin::0");
    expect(scoreInstrumentId({ PartAbbreviation: "Vl" }, 2)).toBe("Vl::2");
  });

  it("clamps score octave to -1..1", () => {
    expect(clampScoreOctave(-9)).toBe(-1);
    expect(clampScoreOctave(0)).toBe(0);
    expect(clampScoreOctave(3)).toBe(1);
    expect(scoreOctaveToSemitones(-1)).toBe(-12);
    expect(scoreOctaveToSemitones(1)).toBe(12);
  });
});
