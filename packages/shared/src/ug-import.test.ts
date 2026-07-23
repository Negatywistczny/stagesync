import { describe, expect, it } from "vitest";
import {
  importUgText,
  sealAkordyLengths,
  chordOnsetsInBar,
} from "./ug-import.js";

describe("importUgText", () => {
  it("parses ChordPro-lite lyrics with bracket chords", () => {
    const result = importUgText("[C]Hello [G]world\n[Am]Line two");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tekst.clips.length).toBeGreaterThanOrEqual(1);
    expect(result.akordy.clips.some((c) => c.symbol === "C")).toBe(true);
    expect(result.akordy.clips.some((c) => c.symbol === "G")).toBe(true);
  });

  it("accepts altered chord tokens like Am7b5 and C7b9", () => {
    const result = importUgText("[Am7b5]line\n[C7b9]more [G7#9]end");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akordy.clips.some((c) => c.symbol === "Am7b5")).toBe(true);
    expect(result.akordy.clips.some((c) => c.symbol === "C7b9")).toBe(true);
    expect(result.akordy.clips.some((c) => c.symbol === "G7#9")).toBe(true);
  });

  it("accepts complex + Polish H chords; stores H as B (#478)", () => {
    const result = importUgText("Edim G/A G/H Cmaj7 D7 C7sus4\nlyrics here");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akordy.clips.map((c) => c.symbol)).toEqual([
      "Edim",
      "G/A",
      "G/B",
      "Cmaj7",
      "D7",
      "C7sus4",
    ]);
  });

  it("chord-only line with only G/H is not dropped as lyrics", () => {
    const result = importUgText("G/H\ntekst");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akordy.clips.some((c) => c.symbol === "G/B")).toBe(true);
    expect(result.tekst.clips.some((c) => c.text === "tekst")).toBe(true);
  });

  it("bracket [Hdim] canonicalizes to Bdim", () => {
    const result = importUgText("[Hdim]line");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akordy.clips.some((c) => c.symbol === "Bdim")).toBe(true);
  });

  it("returns Polish message for empty / broken input", () => {
    expect(importUgText("").ok).toBe(false);
    expect(importUgText("   ").ok).toBe(false);
    const broken = importUgText("\u0001\u0002binary");
    expect(broken.ok).toBe(false);
    if (broken.ok) return;
    expect(broken.message.length).toBeGreaterThan(0);
  });

  it("rejects chordless gibberish without lyrics markers", () => {
    const r = importUgText("{title: x}");
    expect(r.ok).toBe(false);
  });

  it("Money-style: chord line + lyric = one bar, no overlapping lengths", () => {
    const sample = `Am          F
Money, money, money
C           G
Must be funny`;
    const result = importUgText(sample);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const bar = 3840; // 4/4 @ ppq 960
    expect(result.tekst.clips).toHaveLength(2);
    expect(result.tekst.clips[0]!.startTicks).toBe(0);
    expect(result.tekst.clips[0]!.lengthTicks).toBe(bar);
    expect(result.tekst.clips[1]!.startTicks).toBe(bar);

    const chords = [...result.akordy.clips].sort(
      (a, b) => a.startTicks - b.startTicks,
    );
    expect(chords.map((c) => c.symbol)).toEqual(["Am", "F", "C", "G"]);
    expect(chords[0]!.startTicks).toBe(0);
    expect(chords[1]!.startTicks).toBeGreaterThan(0);
    expect(chords[1]!.startTicks).toBeLessThan(bar);
    expect(chords[2]!.startTicks).toBe(bar);

    for (let i = 0; i < chords.length; i++) {
      const end = chords[i]!.startTicks + chords[i]!.lengthTicks;
      if (i + 1 < chords.length) {
        expect(end).toBeLessThanOrEqual(chords[i + 1]!.startTicks);
      }
    }
  });

  it("sealAkordyLengths removes overlaps", () => {
    const sealed = sealAkordyLengths([
      { id: "a", startTicks: 0, lengthTicks: 3840, symbol: "Am" },
      { id: "b", startTicks: 1920, lengthTicks: 3840, symbol: "F" },
    ]);
    expect(sealed[0]!.lengthTicks).toBe(1920);
    expect(sealed[1]!.startTicks).toBe(1920);
  });

  it("chordOnsetsInBar keeps unique increasing onsets for dense lines", () => {
    const onsets = chordOnsetsInBar(5, 0, 3840, 4, 960);
    expect(onsets).toHaveLength(5);
    for (let i = 1; i < onsets.length; i++) {
      expect(onsets[i]!).toBeGreaterThan(onsets[i - 1]!);
    }
  });

  it("chordOnsetsInBar packs when many chords crowd a short bar", () => {
    const onsets = chordOnsetsInBar(40, 0, 200, 4, 50);
    expect(onsets).toHaveLength(40);
    for (let i = 1; i < onsets.length; i++) {
      expect(onsets[i]!).toBeGreaterThan(onsets[i - 1]!);
    }
  });

  it("chordOnsetsInBar first-pass packs duplicate beat indices", () => {
    // chordCount > barTicks → floor spacing collapses to duplicate onsets
    const onsets = chordOnsetsInBar(10, 0, 5, 4, 1);
    expect(onsets).toHaveLength(10);
    for (let i = 1; i < onsets.length; i++) {
      expect(onsets[i]!).toBeGreaterThan(onsets[i - 1]!);
    }
  });

  it("chordOnsetsInBar re-packs after clamping past bar end", () => {
    const onsets = chordOnsetsInBar(4, 0, 50, 4, 100);
    expect(onsets).toHaveLength(4);
    for (let i = 1; i < onsets.length; i++) {
      expect(onsets[i]!).toBeGreaterThan(onsets[i - 1]!);
    }
  });

  it("rejects non-string, oversized, and invalid-meter inputs", () => {
    expect(importUgText(null as unknown as string).ok).toBe(false);
    const huge = importUgText("x".repeat(524_289));
    expect(huge.ok).toBe(false);
    if (!huge.ok) expect(huge.message).toMatch(/za długi/);
    const badMeter = importUgText("C\nhello", {
      meter: { numerator: 0, denominator: 4 },
    });
    expect(badMeter.ok).toBe(false);
    if (!badMeter.ok) expect(badMeter.message).toMatch(/Nie udało się sparsować/);
  });

  it("skips invalid lone brackets; pending chords flush at EOF", () => {
    const skip = importUgText("[notachord]\n[C][G]");
    expect(skip.ok).toBe(true);
    if (!skip.ok) return;
    expect(skip.akordy.clips.map((c) => c.symbol)).toEqual(["C", "G"]);
    expect(skip.tekst.clips).toEqual([]);
  });

  it("imports lyric-only lines and chord+lyric without pending", () => {
    const lyric = importUgText("only words here");
    expect(lyric.ok).toBe(true);
    if (!lyric.ok) return;
    expect(lyric.tekst.clips[0]!.text).toBe("only words here");
    expect(lyric.akordy.clips).toEqual([]);

    const mixed = importUgText("[C]Hello there");
    expect(mixed.ok).toBe(true);
  });

  it("fails schema validation when a lyric exceeds max length", () => {
    const r = importUgText(`[C]${"A".repeat(2001)}`);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/walidacji schematu/);
  });
});
