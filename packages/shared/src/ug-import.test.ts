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
    // Two lyric lines → two bars of timeline
    expect(result.tekst.clips).toHaveLength(2);
    expect(result.tekst.clips[0]!.startTicks).toBe(0);
    expect(result.tekst.clips[0]!.lengthTicks).toBe(bar);
    expect(result.tekst.clips[1]!.startTicks).toBe(bar);

    const chords = [...result.akordy.clips].sort(
      (a, b) => a.startTicks - b.startTicks,
    );
    expect(chords.map((c) => c.symbol)).toEqual(["Am", "F", "C", "G"]);
    // Am + F share bar 0; C + G share bar 1
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
});
