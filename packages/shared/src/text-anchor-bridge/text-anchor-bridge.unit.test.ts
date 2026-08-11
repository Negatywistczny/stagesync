import { describe, expect, it } from "vitest";
import {
  alignWordSequences,
  barsPerChordForSection,
  enforceMinChordGap,
  fitOnsetsInContainer,
  freezeFormaContainers,
  mapOnsetsIntoContainer,
  normalizeLyricToken,
  parseChordProLyricLine,
  parseUgBridgeSections,
  placeChordsWithMinGap,
  quantizeChordOnsets,
  sectionLengthBarsFromUg,
  structuralBarOffsetsForChordLines,
  tokenizeLyrics,
} from "./text-anchor-bridge.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FIX = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "us-ug",
);

function loadPair(name: string): { us: string; ug: string } {
  return {
    us: readFileSync(join(FIX, name, "song.txt"), "utf8"),
    ug: readFileSync(join(FIX, name, "chords.txt"), "utf8"),
  };
}

describe("barsPerChordForSection", () => {
  it("divides evenly or floors — never rounds up past the window", () => {
    expect(barsPerChordForSection(16, 8)).toBe(2);
    expect(barsPerChordForSection(6, 4)).toBe(1);
    expect(barsPerChordForSection(4, 4)).toBe(1);
    expect(barsPerChordForSection(8, 4)).toBe(2);
    expect(barsPerChordForSection(12, 8)).toBe(1);
  });
});

describe("structuralBarOffsetsForChordLines", () => {
  it("assigns N_start + barOffset per UG line — never half-bar crush", () => {
    const offs = structuralBarOffsetsForChordLines([
      { chordLineIndex: 0, orderInSection: 0 },
      { chordLineIndex: 1, orderInSection: 1 },
      { chordLineIndex: 1, orderInSection: 2 },
      { chordLineIndex: 2, orderInSection: 3 },
    ]);
    expect(offs.map((o) => o.barOffset)).toEqual([0, 1, 2, 3]);
  });
});

describe("sectionLengthBarsFromUg / freezeFormaContainers", () => {
  const BAR = 3840;

  it("uses pipe, else lyric lines — chords never define length", () => {
    expect(
      sectionLengthBarsFromUg({
        pipeBarCount: 8,
        chords: [1, 2],
        lyricLineCount: 3,
      }),
    ).toBe(8);
    expect(
      sectionLengthBarsFromUg({
        pipeBarCount: 0,
        chords: Array.from({ length: 8 }),
        lyricLineCount: 8,
      }),
    ).toBe(8);
    expect(
      sectionLengthBarsFromUg({
        pipeBarCount: 0,
        chords: Array.from({ length: 8 }),
        lyricLineCount: 0,
      }),
    ).toBe(1);
    expect(
      sectionLengthBarsFromUg({
        pipeBarCount: 0,
        chords: [],
        lyricLineCount: 4,
      }),
    ).toBe(4);
  });

  it("freezes vocal lengths from UltraStar Beat 1 walls (not chord count)", () => {
    const frozen = freezeFormaContainers({
      ugSections: [
        {
          name: "Intro",
          words: [],
          chords: [],
          pipeBarCount: 16,
          lyricLineCount: 0,
        },
        {
          name: "Verse",
          words: [1],
          chords: Array.from({ length: 8 }),
          pipeBarCount: 0,
          lyricLineCount: 8,
        },
        {
          name: "Chorus",
          words: [1],
          chords: Array.from({ length: 6 }),
          pipeBarCount: 0,
          lyricLineCount: 4,
        },
      ],
      // Verse pickup @ 16.5 → Beat 1 @ 17; Chorus @ 38.5 → Beat 1 @ 39
      sectionUsTicks: [[], [16.5 * BAR], [38.5 * BAR]],
      barTicks: BAR,
      idPrefix: "t",
    });
    const [intro, verse, chorus] = frozen.containers;
    expect(intro!.fromPipe).toBe(true);
    // Pipe 16 + pickup absorb to Verse barline at 17
    expect(intro!.startTicks).toBe(0);
    expect(intro!.lengthTicks).toBe(17 * BAR);
    expect(verse!.startTicks).toBe(17 * BAR);
    // Vocal wall span 17 → 39 = 22 bars (chords fill, not ×2 length)
    expect(verse!.lengthTicks).toBe(22 * BAR);
    expect(chorus!.startTicks).toBe(39 * BAR);
    expect(chorus!.lengthTicks).toBe(4 * BAR); // lyric fallback (no next wall)
    expect(verse!.endTicks).toBe(chorus!.startTicks);
    expect(frozen.warnings.some((w) => /nachodzi/i.test(w))).toBe(false);
    expect(() => {
      (verse as { lengthTicks: number }).lengthTicks = 99;
    }).toThrow();
  });

  it("caps / absorbs instrumental Intro to next US vocal barline", () => {
    const frozen = freezeFormaContainers({
      ugSections: [
        {
          name: "Intro",
          words: [],
          chords: Array.from({ length: 12 }),
          pipeBarCount: 0,
          lyricLineCount: 0,
        },
        {
          name: "Verse",
          words: [1],
          chords: Array.from({ length: 8 }),
          pipeBarCount: 0,
          lyricLineCount: 8,
        },
        {
          name: "Chorus",
          words: [1],
          chords: Array.from({ length: 4 }),
          pipeBarCount: 0,
          lyricLineCount: 2,
        },
      ],
      sectionUsTicks: [[], [16.5 * BAR], [38.5 * BAR]],
      barTicks: BAR,
      idPrefix: "cap",
    });
    expect(frozen.containers[0]!.lengthTicks).toBe(17 * BAR);
    expect(frozen.containers[1]!.startTicks).toBe(17 * BAR);
    expect(frozen.containers[1]!.lengthTicks).toBe(22 * BAR);
    expect(frozen.containers[2]!.startTicks).toBe(39 * BAR);
    expect(frozen.warnings.some((w) => /nachodzi/i.test(w))).toBe(false);
  });

  it("vocal Forma length follows US walls when denser than lyric fallback", () => {
    const frozen = freezeFormaContainers({
      ugSections: [
        {
          name: "Verse",
          words: [1],
          chords: Array.from({ length: 8 }),
          pipeBarCount: 0,
          lyricLineCount: 8,
        },
        {
          name: "Chorus",
          words: [1],
          chords: Array.from({ length: 4 }),
          pipeBarCount: 0,
          lyricLineCount: 2,
        },
      ],
      sectionUsTicks: [[0.5 * BAR], [10.5 * BAR]],
      barTicks: BAR,
      idPrefix: "ov",
    });
    expect(frozen.containers[0]!.startTicks).toBe(0);
    expect(frozen.containers[0]!.lengthTicks).toBe(11 * BAR);
    expect(frozen.containers[1]!.startTicks).toBe(11 * BAR);
    expect(frozen.warnings.some((w) => /nachodzi/i.test(w))).toBe(false);
  });
});

describe("quantizeChordOnsets (section-bounded)", () => {
  const BAR = 3840;
  it("snaps to bar/half and never leaves the section window", () => {
    const start = 10 * BAR;
    const end = 18 * BAR;
    expect(quantizeChordOnsets([start - 100], start, end, BAR)).toEqual([
      start,
    ]);
    expect(quantizeChordOnsets([end + 50], start, end, BAR)).toEqual([end - 1]);
    expect(
      quantizeChordOnsets([start + BAR / 2 + 40], start, end, BAR),
    ).toEqual([start + BAR / 2]);
    const q = quantizeChordOnsets(
      [start - BAR, start + 10, end - 10, end + BAR],
      start,
      end,
      BAR,
    );
    for (const t of q) {
      expect(t).toBeGreaterThanOrEqual(start);
      expect(t).toBeLessThan(end);
    }
  });

  it("mode bar snaps to Beat 1 only (no half-bar 20.3)", () => {
    const start = 10 * BAR;
    const end = 18 * BAR;
    // Mid-bar onset → nearest barline, not Beat 3
    expect(
      quantizeChordOnsets([start + BAR / 2 + 40], start, end, BAR, "bar"),
    ).toEqual([start + BAR]);
    expect(
      quantizeChordOnsets([start + BAR / 2 - 40], start, end, BAR, "bar"),
    ).toEqual([start]);
  });
});

describe("mapOnsetsIntoContainer / fitOnsetsInContainer", () => {
  it("preserves order while fitting wall-clock span into a shorter container", () => {
    const start = 1000;
    const end = 5000;
    const mapped = mapOnsetsIntoContainer([0, 100, 900, 1000], start, end);
    expect(mapped[0]).toBe(start);
    expect(mapped[mapped.length - 1]).toBe(end - 1);
    const fit = fitOnsetsInContainer(mapped, start, end, 3840);
    for (let i = 1; i < fit.length; i++) {
      expect(fit[i]!).toBeGreaterThan(fit[i - 1]!);
    }
    expect(fit.every((t) => t >= start && t < end)).toBe(true);
  });

  it("drops surplus onsets instead of fractional even-pack", () => {
    const BAR = 3840;
    const start = 0;
    const end = 2 * BAR;
    // 5 onsets cannot fit at half-bar gaps in a 2-bar window
    const fit = fitOnsetsInContainer([0, 10, 20, 30, 40], start, end, BAR);
    expect(fit.length).toBeLessThan(5);
    expect(fit.every((t) => t >= start && t < end)).toBe(true);
  });
});

describe("enforceMinChordGap", () => {
  it("keeps B7/Em distinct after same-grid quantize (half-bar gap)", () => {
    const BAR = 3840;
    const start = 0;
    const end = 8 * BAR;
    // G + B7 + Em collapsed onto two points (classic dual chord-above line)
    const collapsed = [
      start,
      start + BAR / 2,
      start + BAR / 2,
      start + 2 * BAR,
    ];
    const out = enforceMinChordGap(collapsed, start, end, BAR / 2);
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out[2]! - out[1]!).toBeGreaterThanOrEqual(BAR / 2);
    expect(new Set(out).size).toBe(out.length);
  });
});

describe("placeChordsWithMinGap", () => {
  it("drops surplus instead of sealing 1-tick crush lengths", () => {
    const BAR = 3840;
    const start = 0;
    const end = 2 * BAR;
    const paired = [
      { startTicks: start, symbol: "C" },
      { startTicks: start, symbol: "G" },
      { startTicks: start, symbol: "Am" },
      { startTicks: start, symbol: "F" },
      { startTicks: start, symbol: "Dm" },
    ];
    const { placed, dropped } = placeChordsWithMinGap(
      paired,
      start,
      end,
      BAR / 2,
    );
    expect(dropped).toBeGreaterThan(0);
    expect(placed.length + dropped).toBe(paired.length);
    for (const p of placed) {
      expect(p.lengthTicks).toBeGreaterThanOrEqual(BAR / 2);
    }
    for (let i = 1; i < placed.length; i++) {
      expect(
        placed[i]!.startTicks - placed[i - 1]!.startTicks,
      ).toBeGreaterThanOrEqual(BAR / 2);
    }
  });

  it("keeps lengthTicks >= 1 for every placed chord", () => {
    const { placed } = placeChordsWithMinGap(
      [
        { startTicks: 0, symbol: "C" },
        { startTicks: 100, symbol: "G" },
      ],
      0,
      3840,
      1,
    );
    expect(placed.every((c) => c.lengthTicks >= 1)).toBe(true);
  });
});

describe("normalizeLyricToken / tokenize", () => {
  it("strips diacritics and punctuation", () => {
    expect(normalizeLyricToken("Café!")).toBe("cafe");
    expect(normalizeLyricToken("It's")).toBe("its");
  });

  it("tokenizes lyric lines", () => {
    expect(tokenizeLyrics("Hello, world!").map((t) => t.norm)).toEqual([
      "hello",
      "world",
    ]);
  });
});

describe("parseChordProLyricLine", () => {
  it("attaches chords to following words", () => {
    const r = parseChordProLyricLine("[C]Hello [G]world");
    expect(r.lyric).toBe("Hello world");
    expect(r.chords).toEqual([
      { symbol: "C", wordIndex: 0 },
      { symbol: "G", wordIndex: 1 },
    ]);
  });
});

describe("parseUgBridgeSections — UG chord-above lyrics", () => {
  it("reads all six Winner chorus chords (incl. Am + D)", () => {
    const secs = parseUgBridgeSections(`[Chorus]
                    G
The winner takes it all
    B7             Em
The loser's standing small
  E7/G#         Am
Beside the victory
                D
That's her destiny
`);
    expect(secs).toHaveLength(1);
    expect(secs[0]!.name).toBe("Chorus");
    expect(secs[0]!.chords.map((c) => c.symbol)).toEqual([
      "G",
      "B7",
      "Em",
      "E7/G#",
      "Am",
      "D",
    ]);
    expect(secs[0]!.chords.every((c) => c.localWordIndex != null)).toBe(true);
  });

  it("reads verse chords from lines above lyrics (not ChordPro brackets)", () => {
    const secs = parseUgBridgeSections(loadPair("winner-intro-vc").ug);
    const verse = secs.find((s) => s.name === "Verse")!;
    expect(verse.chords.map((c) => c.symbol)).toEqual([
      "G",
      "D/F#",
      "Am/E",
      "D",
      "G",
      "D/F#",
      "Am/E",
      "D",
    ]);
    // Each chord anchors to the first word of its lyric line
    expect(verse.chords.map((c) => c.localWordIndex)).toEqual([
      0, 4, 9, 13, 16, 21, 27, 31,
    ]);
    expect(verse.chords.every((c) => c.localWordIndex != null)).toBe(true);
    // Left-aligned chord-only rows → one grid line each, not word-aligned
    expect(verse.chords.map((c) => c.chordLineIndex)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(verse.chords.every((c) => c.wordAligned === false)).toBe(true);
  });

  it("marks indented chorus chord-above lines as word-aligned", () => {
    const secs = parseUgBridgeSections(loadPair("winner-intro-vc").ug);
    const chorus = secs.find((s) => s.name === "Chorus")!;
    expect(chorus.chords.map((c) => c.symbol)).toEqual([
      "G",
      "B7",
      "Em",
      "E7/G#",
      "Am",
      "D",
    ]);
    expect(chorus.chords.map((c) => c.chordLineIndex)).toEqual([
      0, 1, 1, 2, 2, 3,
    ]);
    expect(chorus.chords.every((c) => c.wordAligned)).toBe(true);
  });
});

describe("alignWordSequences", () => {
  it("matches identical sequences perfectly", () => {
    const a = ["i", "hear", "the", "drums"];
    const r = alignWordSequences(a, a);
    expect(r.score).toBe(1);
    expect(r.matches).toBe(4);
    expect(r.mapAtoB).toEqual([0, 1, 2, 3]);
  });

  it("handles insert/delete with partial score", () => {
    const r = alignWordSequences(
      ["i", "hear", "drums"],
      ["i", "hear", "the", "drums"],
    );
    expect(r.matches).toBe(3);
    expect(r.score).toBeGreaterThan(0.5);
  });
});
