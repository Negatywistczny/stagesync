import { describe, expect, it } from "vitest";
import {
  applyUgImportToProject,
  canonicalizePolishH,
  clipsFromOnsets,
  importUgText,
  reflowUgImportSectionBars,
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
    expect(result.akordy.clips.some((c) => c.symbol === "Am7(b5)")).toBe(true);
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

  it("honors barsPerLine > 1 and contentFloorTicks", () => {
    const result = importUgText("[C]one line\n[G]two", {
      barsPerLine: 2,
      contentFloorTicks: 960,
      idPrefix: "custom",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.barsPerLine).toBe(2);
    expect(result.tekst.clips[0]!.startTicks).toBe(960);
    expect(result.tekst.clips[0]!.lengthTicks).toBe(7680);
    expect(result.tekst.clips[0]!.id.startsWith("custom-tekst-")).toBe(true);
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

  it("builds Forma sections from blank lines and Verse/Chorus headers", () => {
    const sample = `[Verse]
C G
hello world

[Chorus]
Am F
sing along`;
    const result = importUgText(sample);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.formaMusic.clips.map((c) => c.name)).toEqual([
      "Verse",
      "Chorus",
    ]);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0]!.lyricLines).toBe(1);
    expect(result.tekst.clips.every((c) => c.sourceSection)).toBe(true);
    expect(result.tekst.clips[0]!.sourceSection).toBe("Verse");
    expect(result.tekst.clips[1]!.sourceSection).toBe("Chorus");
    expect(result.formaMusic.clips[0]!.startTicks).toBe(0);
    expect(result.formaMusic.clips[1]!.startTicks).toBeGreaterThan(0);
  });

  it("names anonymous blank-separated blocks Sekcja N", () => {
    const result = importUgText("[C]one\n\n[G]two");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.formaMusic.clips.map((c) => c.name)).toEqual([
      "Sekcja 1",
      "Sekcja 2",
    ]);
  });

  it("applyUgImportToProject keeps countdown and replaces music Forma", () => {
    const result = importUgText("[Verse]\n[C]hi");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const project = {
      id: "p1",
      name: "P",
      ppq: 960,
      tempoMap: [{ tick: 0, bpm: 120 }],
      meterMap: [{ tick: 0, numerator: 4, denominator: 4 }],
      forma: {
        clips: [
          {
            id: "cd",
            name: "CD",
            startTicks: -3840,
            lengthTicks: 3840,
            kind: "countdown" as const,
          },
          {
            id: "old",
            name: "Old",
            startTicks: 0,
            lengthTicks: 3840,
            kind: "section" as const,
          },
        ],
      },
      tekst: { clips: [] },
      akordy: { clips: [] },
      cue: { clips: [] },
      score: { clips: [] },
    };
    const next = applyUgImportToProject(project as never, result);
    expect(next.forma.clips.some((c) => c.kind === "countdown")).toBe(true);
    expect(next.forma.clips.some((c) => c.name === "Old")).toBe(false);
    expect(next.forma.clips.some((c) => c.name === "Verse")).toBe(true);
    expect(next.tekst.clips.length).toBeGreaterThan(0);
  });

  it("reflowUgImportSectionBars fails on meter change mismatch", () => {
    const result = importUgText("[Verse]\n[C]hi\n\n[Chorus]\n[G]yo");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const badMeter = reflowUgImportSectionBars(result, [4, 4], {
      meter: { numerator: 3, denominator: 4 },
    });
    expect(badMeter.ok).toBe(true);
    if (!badMeter.ok) return;
    expect(badMeter.formaMusic.clips[0]!.lengthTicks).toBe(4 * 2880);
  });

  it("reflowUgImportSectionBars stretches Forma and scales content", () => {
    const result = importUgText("[Verse]\n[C]hi\n\n[Chorus]\n[G]yo");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const reflowed = reflowUgImportSectionBars(result, [8, 4]);
    expect(reflowed.ok).toBe(true);
    if (!reflowed.ok) return;
    expect(reflowed.formaMusic.clips[0]!.lengthTicks).toBe(8 * 3840);
    expect(reflowed.formaMusic.clips[1]!.lengthTicks).toBe(4 * 3840);
    expect(reflowed.formaMusic.clips[1]!.startTicks).toBe(8 * 3840);
    expect(reflowed.sections.map((s) => s.estimatedBars)).toEqual([8, 4]);
  });

  it("rejects invalid CHORD_TOKEN slash-bass and nested parens", () => {
    const slash = importUgText("C//G\nlyric");
    expect(slash.ok).toBe(true);
    if (!slash.ok) return;
    expect(slash.akordy.clips).toEqual([]);

    const nested = importUgText("((Am7))\nline");
    expect(nested.ok).toBe(true);
    if (!nested.ok) return;
    expect(nested.akordy.clips).toEqual([]);
  });

  it("barsPerLine > 1 spans multiple bars per lyric line", () => {
    const sample = `C G
hello world`;
    const result = importUgText(sample, { barsPerLine: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.barsPerLine).toBe(2);
    expect(result.tekst.clips[0]!.lengthTicks).toBe(2 * 3840);
    expect(result.akordy.clips).toHaveLength(2);
    expect(result.akordy.clips[0]!.startTicks).toBe(0);
  });

  it("applyUgImportToProject merges countdown and replaces lanes", () => {
    const result = importUgText("[Verse]\n[C]hi\n\n[Chorus]\n[G]yo");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const project = {
      id: "p1",
      name: "P",
      ppq: 960,
      tempoMap: [{ tick: 0, bpm: 120 }],
      meterMap: [{ tick: 0, numerator: 4, denominator: 4 }],
      forma: {
        clips: [
          {
            id: "cd",
            name: "CD",
            startTicks: -3840,
            lengthTicks: 3840,
            kind: "countdown" as const,
          },
          {
            id: "keep-section",
            name: "Legacy",
            startTicks: 0,
            lengthTicks: 3840,
            kind: "section" as const,
          },
        ],
      },
      tekst: {
        clips: [
          {
            id: "old-t",
            startTicks: 0,
            lengthTicks: 3840,
            text: "old lyric",
          },
        ],
      },
      akordy: {
        clips: [
          {
            id: "old-a",
            startTicks: 0,
            lengthTicks: 3840,
            symbol: "Dm",
          },
        ],
      },
      cue: { clips: [] },
      score: { clips: [] },
    };
    const next = applyUgImportToProject(project as never, result);
    expect(next.forma.clips.some((c) => c.kind === "countdown")).toBe(true);
    expect(next.forma.clips.some((c) => c.name === "Legacy")).toBe(false);
    expect(next.forma.clips.map((c) => c.name)).toEqual([
      "CD",
      "Verse",
      "Chorus",
    ]);
    expect(next.tekst.clips.some((c) => c.text === "old lyric")).toBe(false);
    expect(next.akordy.clips.some((c) => c.symbol === "Dm")).toBe(false);
    expect(next.akordy.clips.some((c) => c.symbol === "C")).toBe(true);
  });
});

describe("clipsFromOnsets", () => {
  it("builds lengths to next onset and optional sourceLineId", () => {
    expect(clipsFromOnsets([], [], 100, "line", 0)).toEqual({
      clips: [],
      nextSeq: 0,
    });
    const { clips, nextSeq } = clipsFromOnsets(
      ["C", "G"],
      [0, 960],
      3840,
      "L1",
      3,
      "  line-a  ",
    );
    expect(nextSeq).toBe(5);
    expect(clips).toEqual([
      {
        id: "L1-akord-4",
        startTicks: 0,
        lengthTicks: 960,
        symbol: "C",
        sourceLineId: "line-a",
      },
      {
        id: "L1-akord-5",
        startTicks: 960,
        lengthTicks: 2880,
        symbol: "G",
        sourceLineId: "line-a",
      },
    ]);
  });
});

describe("canonicalizePolishH", () => {
  it("maps Polish H roots and slash bass to Western B", () => {
    expect(canonicalizePolishH("H")).toBe("B");
    expect(canonicalizePolishH("Hm7")).toBe("Bm7");
    expect(canonicalizePolishH("C/H")).toBe("C/B");
  });

  it("leaves Western spellings unchanged", () => {
    expect(canonicalizePolishH("Am7")).toBe("Am7");
    expect(canonicalizePolishH("Bb")).toBe("Bb");
  });
});
