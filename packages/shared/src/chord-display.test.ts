import { describe, expect, it } from "vitest";
import {
  chordLiteralToSymbolDisplay,
  formatChordForDisplay,
  formatChordParts,
  formatHybridPolishB,
  formatMusicalAccidentals,
  parseAndFormat,
  parseAndFormatParts,
  resolveChordNameParts,
  splitChordSuperscript,
  toLiteralStorage,
} from "./chord-display.js";

describe("toLiteralStorage", () => {
  it("normalizes PO matrix to ASCII literal", () => {
    expect(toLiteralStorage("CM")).toBe("C");
    expect(toLiteralStorage("Cmaj")).toBe("C");
    expect(toLiteralStorage("Cmin")).toBe("Cm");
    expect(toLiteralStorage("C-")).toBe("Cm");
    expect(toLiteralStorage("C+")).toBe("Caug");
    expect(toLiteralStorage("Am7b5")).toBe("Am7(b5)");
    expect(toLiteralStorage("Am7b5")).toBe("Am7(b5)");
    expect(toLiteralStorage("Ab4")).toBe("Absus4");
    expect(toLiteralStorage("Hdim7/F")).toBe("Bdim7/F");
    expect(toLiteralStorage("Csus2sus4")).toBe("Csus2/4");
    expect(toLiteralStorage("Calt")).toBe("C7alt");
    expect(toLiteralStorage("D9(ommit3)")).toBe("D9(omit3)");
    expect(toLiteralStorage("C°(maj7)")).toBe("Cdim(maj7)");
    expect(toLiteralStorage("D(omit3)")).toBe("D5");
    expect(toLiteralStorage("D(no3)")).toBe("D5");
  });

  it("is idempotent for already-normalized strings", () => {
    for (const s of [
      "C",
      "Cm",
      "Caug",
      "Cmaj7",
      "Am7(b5)",
      "Absus4",
      "Csus2/4",
      "C7alt",
      "D9(omit3)",
      "Cdim(maj7)",
      "Bdim7/F",
      "C6/9",
    ]) {
      expect(toLiteralStorage(s)).toBe(s);
    }
  });

  it("does not treat 6/9 or sus2/4 as slash bass", () => {
    expect(toLiteralStorage("C6/9")).toBe("C6/9");
    expect(toLiteralStorage("Csus2/4")).toBe("Csus2/4");
  });
});

describe("formatChordParts / resolveChordNameParts symbolic", () => {
  it("baseline is root only; maj family → Δ", () => {
    expect(formatChordParts("Cmaj7")).toEqual({
      root: "C",
      sup: "Δ7",
      bass: "",
      plain: "Cmaj7",
    });
    expect(formatChordParts("Cmaj7").plain).toContain("maj");
  });

  it("dim / dim7 / half-dim / maj13 / minor9", () => {
    expect(formatChordParts("Edim")).toMatchObject({ root: "E", sup: "°" });
    expect(formatChordParts("Edim7")).toMatchObject({ root: "E", sup: "°7" });
    expect(formatChordParts("Am7(b5)/Eb")).toEqual({
      root: "A",
      sup: "ø7",
      bass: "/E♭",
      plain: "Am7(♭5)/E♭",
    });
    expect(formatChordParts("F#maj13(#11)")).toEqual({
      root: "F♯",
      sup: "Δ13(♯11)",
      bass: "",
      plain: "F♯maj13(♯11)",
    });
    expect(formatChordParts("Bm9")).toMatchObject({
      root: "B",
      sup: "−9",
    });
  });

  it("C6/9 is not a bass slash", () => {
    expect(formatChordParts("C6/9")).toEqual({
      root: "C",
      sup: "6/9",
      bass: "",
      plain: "C6/9",
    });
  });

  it("resolveChordNameParts aliases formatChordParts", () => {
    expect(resolveChordNameParts("Cmaj7")).toEqual(formatChordParts("Cmaj7"));
    expect(parseAndFormatParts("Edim")).toEqual(formatChordParts("Edim"));
  });

  it("hybridPolishB on root and bass", () => {
    expect(formatChordParts("G/B", { hybridPolishB: true })).toEqual({
      root: "G",
      sup: "",
      bass: "/H",
      plain: "G/H",
    });
  });

  it("strips incomplete trailing bass slash mid-edit", () => {
    expect(toLiteralStorage("C#m7/")).toBe("C#m7");
    expect(formatChordParts("C#m7/")).toEqual({
      root: "C♯",
      sup: "−7",
      bass: "",
      plain: "C♯m7",
    });
    expect(formatChordParts("C6/9").sup).toBe("6/9");
  });
});

describe("formatChordParts literalQuality", () => {
  it("keeps maj/dim/m words in superscript without scenic glyphs", () => {
    expect(formatChordParts("Cmaj7", { literalQuality: true })).toEqual({
      root: "C",
      sup: "maj7",
      bass: "",
      plain: "Cmaj7",
    });
    expect(formatChordParts("Edim7", { literalQuality: true })).toMatchObject({
      root: "E",
      sup: "dim7",
    });
    expect(
      formatChordParts("Am7(b5)", { literalQuality: true }),
    ).toMatchObject({
      root: "A",
      sup: "m7(♭5)",
    });
  });
});

describe("greediness (longest-match first)", () => {
  it("prefers sus2/4, maj13, m7(b5), omit3", () => {
    expect(toLiteralStorage("Csus2sus4")).toBe("Csus2/4");
    expect(formatChordParts("Csus2/4").sup).toBe("sus2/4");
    expect(formatChordParts("F#maj13(#11)").sup).toBe("Δ13(♯11)");
    expect(toLiteralStorage("Am7b5")).toBe("Am7(b5)");
    expect(formatChordParts("Am7(b5)").sup).toBe("ø7");
    expect(toLiteralStorage("D9(ommit3)")).toBe("D9(omit3)");
    expect(formatChordParts("D9(omit3)", { literalQuality: true }).sup).toBe(
      "9(omit3)",
    );
  });

  it("Abmaj7(#11) drops 7 in symbolic Δ(♯11)", () => {
    expect(formatChordParts("Abmaj7(#11)/C#")).toEqual({
      root: "A♭",
      sup: "Δ(♯11)",
      bass: "/C♯",
      plain: "A♭maj7(♯11)/C♯",
    });
  });

  it("dim(maj7) and m(maj7) longest-match", () => {
    expect(toLiteralStorage("C°(maj7)")).toBe("Cdim(maj7)");
    expect(formatChordParts("Cdim(maj7)")).toMatchObject({
      root: "C",
      sup: "°Δ7",
    });
    expect(formatChordParts("C#m(maj7)")).toMatchObject({
      root: "C♯",
      sup: "mΔ",
    });
  });
});

describe("formatHybridPolishB / formatMusicalAccidentals", () => {
  it("hybridPolishB: B→H, Bb stays", () => {
    expect(formatHybridPolishB("B")).toBe("H");
    expect(formatHybridPolishB("Bb")).toBe("Bb");
    expect(formatHybridPolishB("F/B")).toBe("F/H");
    expect(formatHybridPolishB("bm7")).toBe("bm7");
    expect(formatHybridPolishB("F/b")).toBe("F/b");
    expect(formatHybridPolishB("")).toBe("");
    expect(formatHybridPolishB("Bmaj7")).toBe("Hmaj7");
    expect(formatHybridPolishB("B#")).toBe("H#");
    expect(formatChordForDisplay("Bmaj7", { hybridPolishB: true })).toBe(
      "HΔ7",
    );
  });

  it("formatMusicalAccidentals on notes and numbers (#11 → ♯11)", () => {
    expect(formatMusicalAccidentals("Bb")).toBe("B♭");
    expect(formatMusicalAccidentals("F#")).toBe("F♯");
    expect(formatMusicalAccidentals("Em7b5/Bb")).toBe("Em7♭5/B♭");
    expect(formatMusicalAccidentals("maj13(#11)")).toBe("maj13(♯11)");
    expect(formatMusicalAccidentals("m7(b5)")).toBe("m7(♭5)");
  });
});

describe("passthrough empties and bar numbers", () => {
  it("handles empty, dash, digits", () => {
    expect(toLiteralStorage("")).toBe("");
    expect(toLiteralStorage("—")).toBe("—");
    expect(toLiteralStorage("12")).toBe("12");
    expect(formatChordForDisplay("  ")).toBe("");
    expect(formatChordParts("Caug")).toMatchObject({ root: "C", sup: "+" });
  });
});

describe("splitChordSuperscript / chordLiteralToSymbolDisplay", () => {
  it("mirrors root as deprecated base and formats symbolic quality", () => {
    expect(splitChordSuperscript("Am7/G")).toEqual({
      root: "A",
      base: "A",
      sup: "m7",
      bass: "/G",
    });
    expect(chordLiteralToSymbolDisplay("Cmaj7")).toBe("CΔ7");
    expect(chordLiteralToSymbolDisplay("")).toBe("");
    expect(chordLiteralToSymbolDisplay("—")).toBe("—");
  });
});

describe("parseAndFormat", () => {
  it("joins formatted parts including bass and empty", () => {
    expect(parseAndFormat("")).toBe("");
    const maj = formatChordParts("Cmaj7");
    expect(parseAndFormat("Cmaj7")).toBe(`${maj.root}${maj.sup}${maj.bass}`);
    expect(parseAndFormat("G/B", { hybridPolishB: true })).toBe("G/H");
    expect(parseAndFormat("Am", { literalQuality: true })).toBe("Am");
  });
});
