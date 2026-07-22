import { describe, expect, it } from "vitest";
import {
  applyInstrumentPitchToChord,
  resolveInstrumentPitchOffset,
  resolveTranspose,
  transposeChord,
} from "./transpose.js";

describe("transpose / instrument pitch", () => {
  it("resolves C / Bb / Eb / manual offsets", () => {
    expect(resolveInstrumentPitchOffset("concert")).toBe(0);
    expect(resolveInstrumentPitchOffset("bb")).toBe(2);
    expect(resolveInstrumentPitchOffset("eb")).toBe(9);
    expect(resolveInstrumentPitchOffset("manual", 3)).toBe(3);
    expect(resolveInstrumentPitchOffset("manual", 99)).toBe(6);
  });

  it("transposes chords with circle spelling", () => {
    expect(transposeChord("C", 2, { targetKey: "D" })).toBe("D");
    expect(transposeChord("Am7/G", 2, { targetKey: "D" })).toBe("Bm7/A");
  });

  it("Bb instrument pitch lifts C→D under C major key", () => {
    const key = { tonic: "C", mode: "major" as const };
    expect(applyInstrumentPitchToChord("C", "bb", 0, key)).toBe("D");
    expect(applyInstrumentPitchToChord("F", "bb", 0, key)).toBe("G");
    expect(applyInstrumentPitchToChord("C", "concert", 0, key)).toBe("C");
    expect(applyInstrumentPitchToChord("3", "bb", 0, key)).toBe("3");
  });

  it("resolveTranspose maps C+2 → D", () => {
    const r = resolveTranspose({ tonic: "C", mode: "major" }, 2);
    expect(r.targetKey).toBe("D");
    expect(r.semitones).toBe(2);
  });
});
