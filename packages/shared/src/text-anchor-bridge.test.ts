import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createProjectSeed } from "./project-seed.js";
import { ProjectSchema } from "./schema.js";
import {
  TEXT_ANCHOR_WEAK_ALIGN,
  alignWordSequences,
  applyUsUgBridgeToProject,
  barsPerChordForSection,
  bridgeUsUgFromTexts,
  bridgeUsUgImport,
  freezeFormaContainers,
  mapOnsetsIntoContainer,
  fitOnsetsInContainer,
  enforceMinChordGap,
  isUgBridgeNoiseLine,
  normalizeLyricToken,
  parseChordProLyricLine,
  parseUgBridgeSections,
  quantizeChordOnsets,
  sectionLengthBarsFromUg,
  structuralBarOffsetsForChordLines,
  suggestGridBpmFromUsUgTexts,
  timedWordsFromUltrastar,
  tokenizeLyrics,
} from "./text-anchor-bridge.js";
import {
  importUltrastarText,
} from "./ultrastar-import.js";
import { US_UG_BACKING_CLIP_ID, suggestBeat1MsFromPipeAndGap } from "./smart-tempo.js";
import { secondsToTicks } from "./tempo-map.js";
import { DEFAULT_PPQ } from "./time.js";
import { isTickOnBarOrHalf } from "./tempo-map-solver.js";

const FIX = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "us-ug");

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
    expect(quantizeChordOnsets([end + 50], start, end, BAR)).toEqual([
      end - 1,
    ]);
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
    const fit = fitOnsetsInContainer(
      [0, 10, 20, 30, 40],
      start,
      end,
      BAR,
    );
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
    const collapsed = [start, start + BAR / 2, start + BAR / 2, start + 2 * BAR];
    const out = enforceMinChordGap(collapsed, start, end, BAR / 2);
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out[2]! - out[1]!).toBeGreaterThanOrEqual(BAR / 2);
    expect(new Set(out).size).toBe(out.length);
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

describe("golden fixtures US+UG", () => {
  it("demo-simple: Forma names from UG, chords from syllable ms via TempoMap", () => {
    const { us, ug } = loadPair("demo-simple");
    const bridged = bridgeUsUgFromTexts(us, ug, { idPrefix: "fx" });
    expect(bridged.ok).toBe(true);
    if (!bridged.ok) return;

    expect(bridged.alignScore).toBeGreaterThanOrEqual(TEXT_ANCHOR_WEAK_ALIGN);
    expect(bridged.sections.map((s) => s.name)).toEqual(["Verse", "Chorus"]);
    expect(bridged.formaMusic.clips.map((c) => c.name)).toEqual([
      "Verse",
      "Chorus",
    ]);
    // Forma must not use lyric lines as names
    expect(bridged.formaMusic.clips.some((c) => /hello/i.test(c.name))).toBe(
      false,
    );

    const usParsed = importUltrastarText(us);
    expect(usParsed.ok).toBe(true);
    if (!usParsed.ok) return;
    const words = timedWordsFromUltrastar(usParsed);
    expect(words.map((w) => w.norm)).toEqual([
      "hello",
      "world",
      "chorus",
      "line",
    ]);

    expect(bridged.akordy.clips.map((c) => c.symbol)).toEqual([
      "C",
      "G",
      "Am",
      "F",
    ]);
    // No half-bar crush at section starts — gaps are ≥ 0 (ordered) and not
    // forced onto Beat 1/3 grid.
    const onsets = bridged.akordy.clips.map((c) => c.startTicks);
    for (let i = 1; i < onsets.length; i++) {
      expect(onsets[i]!).toBeGreaterThan(onsets[i - 1]!);
    }

    // Contiguous Forma from solver layout
    const verse = bridged.formaMusic.clips[0]!;
    const chorus = bridged.formaMusic.clips[1]!;
    expect(verse.lengthTicks).toBeGreaterThan(0);
    expect(verse.lengthTicks % 3840).toBe(0);
    expect(chorus.startTicks).toBe(verse.startTicks + verse.lengthTicks);
    expect(bridged.tempoMap.length).toBeGreaterThanOrEqual(1);
  });

  it("verse-chorus: multi-section align + Project Zod apply", () => {
    const { us, ug } = loadPair("verse-chorus");
    const bridged = bridgeUsUgFromTexts(us, ug, { idPrefix: "vc" });
    expect(bridged.ok).toBe(true);
    if (!bridged.ok) return;
    expect(bridged.alignScore).toBeGreaterThanOrEqual(0.7);
    expect(bridged.sections.map((s) => s.name)).toEqual([
      "Verse",
      "Chorus",
      "Zwrotka 2",
    ]);

    const seed = createProjectSeed(
      "p-bridge",
      "Bridge Test",
      "2026-08-02T12:00:00.000Z",
    );
    const applied = applyUsUgBridgeToProject(seed, bridged);
    expect(() => ProjectSchema.parse(applied)).not.toThrow();
    expect(applied.forma.clips.some((c) => c.kind === "countdown")).toBe(true);
    expect(
      applied.forma.clips.filter((c) => c.kind === "section").map((c) => c.name),
    ).toEqual(["Verse", "Chorus", "Zwrotka 2"]);
    expect(applied.tekst.clips.length).toBeGreaterThan(0);
    expect(applied.akordy.clips.length).toBeGreaterThan(0);
    expect(applied.defaultBpm).toBe(bridged.metronomeBpm);
  });

  it("with-solo: instrumental Default Grid between vocal sections", () => {
    const { us, ug } = loadPair("with-solo");
    const bridged = bridgeUsUgFromTexts(us, ug, { idPrefix: "solo" });
    expect(bridged.ok).toBe(true);
    if (!bridged.ok) return;

    expect(bridged.sections.map((s) => s.name)).toEqual([
      "Intro",
      "Solo",
      "Chorus",
    ]);
    const solo = bridged.sections.find((s) => s.name === "Solo");
    expect(solo).toBeDefined();
    expect(solo!.anchored).toBe(false);
    // Instrumental without pipe: Form length from fallback (not chords×N);
    // surplus chords that cannot fit are dropped.
    expect(solo!.chordCount).toBeGreaterThanOrEqual(1);
    expect(bridged.approximate).toBe(true);
    expect(
      bridged.warnings.some(
        (w) => /Solo/i.test(w) || /bez wokalu/i.test(w),
      ),
    ).toBe(true);

    const soloClips = bridged.akordy.clips.filter(
      (c) =>
        c.startTicks >= solo!.startTicks &&
        c.startTicks < solo!.startTicks + solo!.lengthTicks,
    );
    expect(soloClips.length).toBe(solo!.chordCount);
    // Even spacing inside solo window
    const gaps = soloClips.slice(1).map((c, i) => c.startTicks - soloClips[i]!.startTicks);
    expect(gaps.every((g) => g > 0)).toBe(true);
  });

  it("tolerates noisy UG preamble, blank lines in Verse, and |chord| Intro", () => {
    const ug = `[Intro] / [Chorus] and [Bridge]
Transpose -5 to D + capo 4
  D                D    F#7
  1 + 2 + 3 + 4 +

[Intro]
| [G] | [G] [B7] | [Em] | [Em] [E7/G#] |
| [Am] | % | [D] | % |

[Verse]
              [G]
I don't wanna talk
                   [D/F#]
About things we've gone through

               [G]
I've played all my cards
                       [D/F#]
And that's what you've done too

[Chorus]
                    [G]
The winner takes it all
    [B7]             [Em]
The loser standing small
`;
    const us = `#BPM:339.36
#GAP:35140
: 0 6 25 I 
: 7 6 27 don’t 
: 14 3 29 wan
: 18 2 30 na 
: 22 9 22 talk 
- 33
: 88 5 22 A
: 94 6 23 bout 
: 104 6 25 things 
: 112 7 27 we’ve 
: 121 4 27 go
: 126 5 25 ~ne 
: 133 16 25 through 
- 151
: 358 4 25 I’ve 
: 363 6 27 played 
: 373 19 29 all 
: 393 4 30 my 
: 401 7 22 cards 
- 410
: 448 5 22 And 
: 454 5 23 that’s 
: 460 4 25 what 
: 466 4 27 you’ve 
* 472 8 27 done, 
: 482 19 25 too 
- 503
: 707 3 25 The 
: 712 3 25 win
* 716 4 35 ner 
: 722 7 35 takes 
: 731 2 34 it 
: 735 20 34 all 
- 757
: 794 3 22 The 
: 798 4 22 lo
: 804 4 32 ser’s 
: 813 6 32 stan
: 820 4 30 ding 
: 827 19 30 small 
- 848
E`;
    const secs = parseUgBridgeSections(ug);
    expect(secs.map((s) => s.name)).toEqual(["Intro", "Verse", "Chorus"]);
    expect(secs.some((s) => /^Sekcja/.test(s.name))).toBe(false);
    expect(secs[0]!.words).toHaveLength(0);
    expect(secs[0]!.pipeBarCount).toBe(8);
    expect(secs[1]!.words.map((w) => w.norm)).toContain("cards");

    const bridged = bridgeUsUgFromTexts(us, ug, { idPrefix: "abba" });
    expect(bridged.ok).toBe(true);
    if (!bridged.ok) return;
    expect(bridged.sections.map((s) => s.name)).toEqual([
      "Intro",
      "Verse",
      "Chorus",
    ]);
    expect(bridged.warnings.some((w) => /Sekcja 1/i.test(w))).toBe(false);
    const intro = bridged.sections[0]!;
    const verse = bridged.sections[1]!;
    expect(intro.anchored).toBe(false);
    expect(intro.startTicks).toBe(0);
    expect(intro.lengthTicks).toBeGreaterThan(1000);
    // Pipe Intro absorbs pickup up to Verse barline (contiguous at freeze time)
    expect(intro.startTicks + intro.lengthTicks).toBe(verse.startTicks);
    expect(verse.anchored).toBe(true);
    // Forma length from UltraStar section walls
    expect(verse.lengthTicks % 3840).toBe(0);
    expect(verse.startTicks + verse.lengthTicks).toBeLessThanOrEqual(
      bridged.sections[2]!.startTicks,
    );
    expect(bridged.warnings.some((w) => /nachodzi/i.test(w))).toBe(false);
    expect(bridged.alignScore).toBeGreaterThanOrEqual(0.6);
    // Pipe intro: no Default Grid warning when |takt| present
    expect(bridged.warnings.some((w) => /Default Grid/i.test(w))).toBe(false);
    // Sequential Forma: Verse → Chorus contiguous (no US shove)
    expect(verse.startTicks + verse.lengthTicks).toBe(
      bridged.sections[2]!.startTicks,
    );
  });

  it("winner-intro-vc: MultiPass seed, pristine Forma, syllable chords, align-first sourceSection", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const bridged = bridgeUsUgFromTexts(us, ug, { idPrefix: "winner" });
    expect(bridged.ok).toBe(true);
    if (!bridged.ok) return;

    const BAR = 3840;

    expect(bridged.suggestedGridBpm).toBe(120);
    expect(bridged.ultrastarMetronomeBpm).toBeCloseTo(84.84, 1);
    // Seed SSOT = UltraStar metro when Pass-1/pipe seed diverges >±15%
    expect(bridged.seedBpm).toBeCloseTo(bridged.ultrastarMetronomeBpm, 1);
    expect(bridged.metronomeBpm).toBeCloseTo(bridged.seedBpm, 5);
    expect(bridged.tempoMap.length).toBeGreaterThanOrEqual(1);
    expect(bridged.tempoMap[0]!.startTicks).toBe(0);
    // Sparse map: one BPM band per Forma section (walls exact) — not per-syllable kinks
    expect(bridged.tempoMap.length).toBeLessThanOrEqual(8);

    const [intro, verse, chorus] = bridged.formaMusic.clips;
    expect(bridged.sections.map((s) => s.name)).toEqual([
      "Intro",
      "Verse",
      "Chorus",
    ]);

    // S3: pipe Intro extended for anacrusis pickup; Verse contiguous @ bar 18 (1-indexed)
    expect(intro!.startTicks).toBe(0);
    expect(intro!.lengthTicks).toBe(17 * BAR);
    expect(verse!.startTicks).toBe(17 * BAR);
    // Vocal Forma from UltraStar walls (+ Intro anacrusis absorb)
    expect(verse!.lengthTicks).toBe(16 * BAR);
    expect(chorus!.startTicks).toBe(verse!.startTicks + verse!.lengthTicks);
    expect(intro!.lengthTicks % BAR).toBe(0);
    expect(chorus!.lengthTicks % BAR).toBe(0);
    expect(bridged.warnings.some((w) => /nachodzi/i.test(w))).toBe(false);

    // Sparse map: section-wall BPM bands — not per-syllable kinks
    expect(bridged.tempoMap.length).toBeGreaterThanOrEqual(1);

    const introChords = bridged.akordy.clips.filter(
      (c) => c.startTicks < verse!.startTicks,
    );
    expect(introChords.map((c) => c.symbol)).toEqual([
      "G",
      "B7",
      "Em",
      "E7/G#",
      "Am",
      "D",
      "G",
      "B7",
      "Em",
      "E7/G#",
      "Am",
      "D",
    ]);
    // Pipe: each cell = 1 bar (mid-cell offsetInBar OK)
    for (const c of introChords) {
      const local = c.startTicks - intro!.startTicks;
      expect(local % (BAR / 2)).toBe(0);
    }

    // Align-first: Verse lyrics stay Verse (not geometric Chorus affinity)
    const firstLine = bridged.tekst.clips[0]!;
    expect(firstLine.sourceSection).toBe("Verse");
    // Pickup lands inside extended Intro timeline (no empty bar between Intro and Verse)
    expect(firstLine.startTicks).toBeGreaterThan(intro!.startTicks);
    expect(firstLine.startTicks).toBeLessThan(verse!.startTicks);

    const though = bridged.tekst.clips.find((c) => /Though/i.test(c.text));
    expect(though?.sourceSection).toBe("Verse");

    const winnerLine = bridged.tekst.clips.find((c) =>
      /winner takes/i.test(c.text),
    );
    expect(winnerLine).toBeTruthy();
    expect(winnerLine!.sourceSection).toBe("Chorus");

    // Verse: chords from syllable ms via map — land on Beat 1/3 via TempoMap
    const verseChords = bridged.akordy.clips.filter(
      (c) =>
        c.startTicks >= verse!.startTicks &&
        c.startTicks < verse!.startTicks + verse!.lengthTicks,
    );
    expect(verseChords.map((c) => c.symbol)).toEqual([
      "G",
      "D/F#",
      "Am/E",
      "D",
      "G",
      "D/F#",
      "Am/E",
      "D",
    ]);
    // Forma covers all Verse chords (no overflow into empty timeline)
    expect(verse!.lengthTicks).toBeGreaterThanOrEqual(8 * BAR);
    for (const c of verseChords) {
      expect(c.startTicks).toBeGreaterThanOrEqual(verse!.startTicks);
      expect(c.startTicks).toBeLessThan(verse!.startTicks + verse!.lengthTicks);
      expect(
        isTickOnBarOrHalf(c.startTicks, BAR, verse!.startTicks),
      ).toBe(true);
    }
    // First Verse chord on Forma Beat 1 (map bends audio to barline)
    expect(verseChords[0]!.startTicks).toBe(verse!.startTicks);
    for (let i = 1; i < verseChords.length; i++) {
      const gap = verseChords[i]!.startTicks - verseChords[i - 1]!.startTicks;
      expect(gap).toBeGreaterThan(0);
      expect(verseChords[i - 1]!.lengthTicks).toBe(gap);
    }
    expect(
      verseChords[verseChords.length - 1]!.startTicks +
        verseChords[verseChords.length - 1]!.lengthTicks,
    ).toBe(verse!.startTicks + verse!.lengthTicks);

    // Chorus: syllable-anchored, ordered, lengths to next / Forma wall
    const chorusChords = bridged.akordy.clips.filter(
      (c) =>
        c.startTicks >= chorus!.startTicks &&
        c.startTicks < chorus!.startTicks + chorus!.lengthTicks,
    );
    expect(chorusChords.map((c) => c.symbol)).toEqual([
      "G",
      "B7",
      "Em",
      "E7/G#",
      "Am",
      "D",
    ]);
    for (let i = 1; i < chorusChords.length; i++) {
      expect(chorusChords[i]!.startTicks).toBeGreaterThan(
        chorusChords[i - 1]!.startTicks,
      );
    }
    expect(
      chorusChords[chorusChords.length - 1]!.startTicks +
        chorusChords[chorusChords.length - 1]!.lengthTicks,
    ).toBe(chorus!.startTicks + chorus!.lengthTicks);

    const applied = applyUsUgBridgeToProject(
      createProjectSeed("w1", "Winner", "2026-08-03T00:00:00.000Z"),
      bridged,
    );
    expect(() => ProjectSchema.parse(applied)).not.toThrow();
    expect(applied.defaultBpm).toBeCloseTo(bridged.seedBpm, 5);
    expect(applied.tempoMap.length).toBeGreaterThanOrEqual(1);
    expect(applied.tekst.clips[0]!.sourceSection).toBe("Verse");
    expect(
      applied.tekst.clips.find((c) => /winner takes/i.test(c.text))
        ?.sourceSection,
    ).toBe("Chorus");
  });

  it("winner-intro-vc: Forma walls at pipe bars; vocal Forma from UltraStar walls", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const bridged = bridgeUsUgFromTexts(us, ug, {
      idPrefix: "winner120",
      gridBpm: 120,
    });
    expect(bridged.ok).toBe(true);
    if (!bridged.ok) return;

    const BAR = 3840;
    const verse = bridged.formaMusic.clips.find((c) => c.name === "Verse")!;
    expect(verse.startTicks).toBe(17 * BAR);
    expect(verse.lengthTicks).toBe(16 * BAR);

    const verseChords = bridged.akordy.clips.filter(
      (c) =>
        c.startTicks >= verse.startTicks &&
        c.startTicks < verse.startTicks + verse.lengthTicks,
    );
    expect(verseChords).toHaveLength(8);
    expect(verseChords[0]!.symbol).toBe("G");
    // First Verse chord on Forma Beat 1
    expect(verseChords[0]!.startTicks).toBe(verse.startTicks);
    expect(verseChords[1]!.symbol).toBe("D/F#");
    for (let i = 1; i < verseChords.length; i++) {
      expect(verseChords[i]!.startTicks).toBeGreaterThan(
        verseChords[i - 1]!.startTicks,
      );
      const gap = verseChords[i]!.startTicks - verseChords[i - 1]!.startTicks;
      expect(gap).toBe(verseChords[i - 1]!.lengthTicks);
      // Fill density from Forma span / chord count (often 2 bars when span÷n)
      expect(gap).toBeGreaterThan(0);
      expect(gap % BAR).toBe(0);
    }

    const chorus = bridged.formaMusic.clips.find((c) => c.name === "Chorus")!;
    expect(chorus.startTicks).toBe(verse.startTicks + verse.lengthTicks);
    // Last section: US vocal span @ seed (not chords×2)
    expect(chorus.lengthTicks % BAR).toBe(0);
    expect(chorus.lengthTicks / BAR).toBeGreaterThanOrEqual(4);
    expect(chorus.lengthTicks / BAR).toBeLessThanOrEqual(8);
    const chorusChords = bridged.akordy.clips.filter(
      (c) =>
        c.startTicks >= chorus.startTicks &&
        c.startTicks < chorus.startTicks + chorus.lengthTicks,
    );
    expect(chorusChords.length).toBe(6);
    for (let i = 1; i < chorusChords.length; i++) {
      expect(chorusChords[i]!.startTicks).toBeGreaterThan(
        chorusChords[i - 1]!.startTicks,
      );
    }
    expect(bridged.warnings.some((w) => /nachodzi/i.test(w))).toBe(false);
  });

  it("winner-intro-vc: seed falls back to US metro when pipe seed diverges >±15%", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const bridged = bridgeUsUgFromTexts(us, ug, {
      idPrefix: "winner120",
      gridBpm: 120,
    });
    expect(bridged.ok).toBe(true);
    if (!bridged.ok) return;

    const BAR = 3840;
    expect(bridged.ultrastarMetronomeBpm).toBeCloseTo(84.84, 1);
    expect(bridged.suggestedGridBpm).toBe(120);
    expect(bridged.seedBpm).toBeCloseTo(bridged.ultrastarMetronomeBpm, 1);
    expect(bridged.metronomeBpm).toBeCloseTo(bridged.seedBpm, 5);

    const [intro, verse, chorus] = bridged.formaMusic.clips;
    expect(intro!.startTicks).toBe(0);
    expect(intro!.lengthTicks).toBe(17 * BAR);
    expect(verse!.startTicks).toBe(17 * BAR);
    expect(verse!.lengthTicks % BAR).toBe(0);
    expect(chorus!.startTicks).toBe(verse!.startTicks + verse!.lengthTicks);
    expect(bridged.warnings.some((w) => /nachodzi/i.test(w))).toBe(false);
  });

  it("S1: three chords from syllables / structural — ordered, no half-bar crush", () => {
    const us = `#TITLE:X
#ARTIST:Y
#BPM:480
#GAP:0
: 0 4 0 Hel
: 4 4 0 lo 
- 10
: 20 4 0 world 
- 30
E
`;
    const ug = `[Verse]
[C]Hello [G]missing [Am]world
`;
    const bridged = bridgeUsUgFromTexts(us, ug, { idPrefix: "s1" });
    expect(bridged.ok).toBe(true);
    if (!bridged.ok) return;
    expect(bridged.akordy.clips.length).toBeGreaterThanOrEqual(1);
    expect(bridged.akordy.clips[0]!.symbol).toBe("C");
    const onsets = bridged.akordy.clips.map((c) => c.startTicks);
    // Ordered when multiple chords fit the Forma wall
    for (let i = 1; i < onsets.length; i++) {
      expect(onsets[i]!).toBeGreaterThanOrEqual(onsets[i - 1]!);
    }
  });

  it("S2: Solo without US syllables uses even grid (no accent crash)", () => {
    const { us, ug } = loadPair("with-solo");
    const bridged = bridgeUsUgFromTexts(us, ug, { idPrefix: "s2" });
    expect(bridged.ok).toBe(true);
    if (!bridged.ok) return;
    const solo = bridged.sections.find((s) => s.name === "Solo")!;
    expect(solo.anchored).toBe(false);
    expect(solo.chordCount).toBeGreaterThanOrEqual(1);
    const soloClips = bridged.akordy.clips.filter(
      (c) =>
        c.startTicks >= solo.startTicks &&
        c.startTicks < solo.startTicks + solo.lengthTicks,
    );
    expect(soloClips.length).toBe(solo.chordCount);
  });

  it("S3: dual [G][D]word → first from syllable, second structural bar (no half-bar crush)", () => {
    const us = `#TITLE:X
#ARTIST:Y
#BPM:480
#GAP:0
: 0 8 0 word 
- 16
E
`;
    const ug = `[Verse]
[G][D]word
`;
    const r = parseChordProLyricLine("[G][D]word");
    expect(r.chords).toEqual([
      { symbol: "G", wordIndex: 0 },
      { symbol: "D", wordIndex: 0 },
    ]);

    const bridged = bridgeUsUgFromTexts(us, ug, { idPrefix: "s3" });
    expect(bridged.ok).toBe(true);
    if (!bridged.ok) return;
    expect(bridged.akordy.clips.map((c) => c.symbol)).toEqual(["G", "D"]);
    const [g, d] = bridged.akordy.clips;
    const BAR = 3840;
    expect(d!.startTicks).toBeGreaterThan(g!.startTicks);
    // No half-bar densify: when Forma has ≥2 bars, structural offset is 1 bar
    const formaBars = bridged.formaMusic.clips[0]!.lengthTicks / BAR;
    if (formaBars >= 2) {
      expect(d!.startTicks - g!.startTicks).toBeGreaterThanOrEqual(BAR);
    }
  });

  it("dual-layer: never copies Intro pipe harmony into a differently chorded Chorus", () => {
    const us = `#TITLE:X
#ARTIST:Y
#BPM:480
#GAP:8000
: 0 4 0 Hel
: 4 4 0 lo 
- 10
: 64 4 0 Cho
: 68 4 0 rus 
- 80
E
`;
    const ug = `[Intro]
| C | % | G | % |

[Verse]
[C]Hello

[Chorus]
[Am]Chorus
[F]Line
`;
    const bridged = bridgeUsUgFromTexts(us, ug, { idPrefix: "nox" });
    expect(bridged.ok).toBe(true);
    if (!bridged.ok) return;
    const chorus = bridged.formaMusic.clips.find((c) => c.name === "Chorus")!;
    const intro = bridged.formaMusic.clips.find((c) => c.name === "Intro")!;
    const introSyms = bridged.akordy.clips
      .filter((c) => c.startTicks < intro.startTicks + intro.lengthTicks)
      .map((c) => c.symbol);
    const chorusSyms = bridged.akordy.clips
      .filter((c) => c.startTicks >= chorus.startTicks)
      .map((c) => c.symbol);
    expect(introSyms).toEqual(["C", "G"]);
    expect(chorusSyms).toEqual(["Am", "F"]);
    expect(chorusSyms.some((s) => introSyms.includes(s))).toBe(false);
  });
});

describe("isUgBridgeNoiseLine", () => {
  it("flags transpose / beat grid / multi-header blurbs", () => {
    expect(isUgBridgeNoiseLine("[Intro] / [Chorus] and [Bridge]")).toBe(true);
    expect(isUgBridgeNoiseLine("Transpose -5 to D + capo 4")).toBe(true);
    expect(isUgBridgeNoiseLine("1 + 2 + 3 + 4 +")).toBe(true);
    expect(isUgBridgeNoiseLine("| [G] | [Am] |")).toBe(false);
    expect(isUgBridgeNoiseLine("I don't wanna talk")).toBe(false);
  });
});

describe("bridgeUsUgImport API", () => {
  it("rejects empty UG", () => {
    const us = importUltrastarText(loadPair("demo-simple").us);
    expect(us.ok).toBe(true);
    if (!us.ok) return;
    const r = bridgeUsUgImport(us, "   ");
    expect(r.ok).toBe(false);
  });

  it("uses audio analysis as tempo SSOT (not US seed BPM)", () => {
    const pair = loadPair("demo-simple");
    const us = importUltrastarText(pair.us);
    expect(us.ok).toBe(true);
    if (!us.ok) return;
    const beatMs = Array.from({ length: 33 }, (_, i) => i * 500);
    const r = bridgeUsUgImport(us, pair.ug, {
      smartTempoAudio: {
        assetId: "a1",
        durationMs: 20_000,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: 0,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.seedBpm).toBe(120);
    expect(r.tempoMap.length).toBeGreaterThan(0);
    expect(r.tempoMap[0]!.startTicks).toBe(0);
    expect(r.tempoNodes.length).toBeGreaterThan(0);
    // Constant grid → Logic-like sparse map (not one event per beat).
    expect(r.tempoMap.length).toBeLessThanOrEqual(beatMs.length / 2);
    expect(r.warnings.some((w) => /eksperymentalny/i.test(w))).toBe(false);
  });

  it("audio SSOT: draft nodes without user edit do not override audio map", () => {
    const BAR = 3840;
    const pair = loadPair("demo-simple");
    const us = importUltrastarText(pair.us);
    expect(us.ok).toBe(true);
    if (!us.ok) return;
    const beatMs = Array.from({ length: 33 }, (_, i) => i * 500);
    const sparseNodes = [
      { wallMs: 0, targetTick: 0 },
      { wallMs: 4000, targetTick: BAR },
      { wallMs: 8000, targetTick: BAR * 2 },
    ];
    const r = bridgeUsUgImport(us, pair.ug, {
      smartTempoAudio: {
        assetId: "a1",
        durationMs: 20_000,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: 0,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
      draftTempoNodes: sparseNodes,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Auto draft markers must not replace audio-driven sparse map.
    expect(r.seedBpm).toBe(120);
    expect(r.tempoMap[0]!.bpm).toBeCloseTo(120, 0);

    const edited = bridgeUsUgImport(us, pair.ug, {
      smartTempoAudio: {
        assetId: "a1",
        durationMs: 20_000,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: 0,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
      draftTempoNodes: sparseNodes,
      draftTempoNodesUserEdited: true,
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.tempoMap.length).toBeLessThanOrEqual(sparseNodes.length + 2);
  });

  it("winner-intro-vc with audio: Forma from words (pickup in Intro, Chorus on winner)", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 180_000;
    const gapMs = usImport.gapMs;
    expect(gapMs).toBe(33_000);
    // Editorial Beat 1 for pipe 16 + GAP @ 120 → 0 (pickup at 16.5 bars).
    const offsetMs = suggestBeat1MsFromPipeAndGap({
      gapMs,
      pipeBarCount: 16,
      layoutBpm: 120,
      transientMs: 2_000, // ignore late transient (>½ bar from ideal)
    });
    expect(offsetMs).toBe(0);
    const beatMs = Array.from({ length: 360 }, (_, i) => i * 500);

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-audio",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: offsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const BAR = 3840;
    const intro = r.formaMusic.clips.find((c) => c.name === "Intro")!;
    const verse = r.formaMusic.clips.find((c) => c.name === "Verse")!;
    const chorus = r.formaMusic.clips.find((c) => c.name === "Chorus")!;
    expect(intro.startTicks).toBe(0);
    // Pipe Intro absorbs anacrusis → Verse Forma on barline after pickup.
    expect(verse.startTicks).toBe(17 * BAR);
    expect(intro.lengthTicks).toBe(verse.startTicks);
    expect(verse.lengthTicks % BAR).toBe(0);
    expect(verse.lengthTicks).toBeGreaterThanOrEqual(8 * BAR);
    expect(chorus.startTicks).toBe(verse.startTicks + verse.lengthTicks);

    // Pickup in last Intro bar; Verse downbeat = Forma Verse
    const firstVocal = r.tekst.clips[0]!;
    expect(firstVocal.startTicks).toBeGreaterThanOrEqual(verse.startTicks - BAR);
    expect(firstVocal.startTicks).toBeLessThan(verse.startTicks);

    const about = r.tekst.clips.find((c) => /About/i.test(c.text));
    expect(about).toBeTruthy();
    const dfSharp = r.akordy.clips.find((c) => c.symbol === "D/F#");
    expect(dfSharp).toBeTruthy();
    // D/F# lands on / near the aligned “About” word (not a fixed bar index).
    expect(Math.abs(dfSharp!.startTicks - about!.startTicks)).toBeLessThan(
      2 * BAR,
    );

    const winnerLine = r.tekst.clips.find((c) => /winner takes/i.test(c.text));
    expect(winnerLine).toBeTruthy();
    expect(winnerLine!.sourceSection).toBe("Chorus");
    // Chorus Forma covers the Chorus lyric (not leftover Verse lines).
    expect(winnerLine!.startTicks).toBeGreaterThanOrEqual(
      chorus.startTicks - BAR,
    );
    expect(winnerLine!.startTicks).toBeLessThan(
      chorus.startTicks + chorus.lengthTicks,
    );

    expect(r.seedBpm).toBeCloseTo(120, 0);
    expect(r.tempoMap.every((ev) => ev.bpm >= 60 && ev.bpm <= 200)).toBe(true);

    const applied = applyUsUgBridgeToProject(
      createProjectSeed("w-audio", "Winner", "2026-08-03T00:00:00.000Z"),
      r,
      {
        smartTempoAudio: {
          assetId: "a1",
          durationMs,
          peaks: [0.1, 0.5],
          audioStartOffsetMs: offsetMs,
        },
      },
    );
    const clip = applied.audioClips.find((c) => c.id === US_UG_BACKING_CLIP_ID);
    expect(clip?.startTicks).toBe(0);
    expect(clip?.trimInMs).toBeUndefined();
    expect(() => ProjectSchema.parse(applied)).not.toThrow();
  });

  it("winner-style SingStar GAP: TempoMap seed follows audio, not pipe+GAP formula", () => {
    // Live Winner: #GAP 35140 → naive pipe formula 112.69. That formula must
    // NOT become Adapt tempo — audio estimatedBpm is SSOT (even if currently
    // imperfect). Pipe/GAP remains for Beat 1 / Forma only.
    const us = `#TITLE:The Winner Takes It All
#ARTIST:ABBA
#BPM:339.36
#GAP:35140
: 0 6 25 I 
: 7 6 27 don’t 
- 33
E
`;
    const { ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;
    expect(usImport.gapMs).toBe(35140);

    const audioBpm = 122.5;
    const period = 60_000 / audioBpm;
    const beatMs = Array.from({ length: 400 }, (_, i) =>
      Math.round(i * period),
    );
    const offsetMs = suggestBeat1MsFromPipeAndGap({
      gapMs: 35140,
      pipeBarCount: 16,
      layoutBpm: 120,
    });
    expect(offsetMs).toBeGreaterThan(1000);

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-gap35",
      smartTempoAudio: {
        assetId: "a1",
        durationMs: 240_000,
        peaks: [0.1],
        audioStartOffsetMs: offsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: audioBpm,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.seedBpm).toBeCloseTo(audioBpm, 0);
    expect(r.tempoMap[0]!.bpm).toBeGreaterThanOrEqual(118);
    // Pipe formula alone would be ~112.69 — must not win
    expect(r.seedBpm).not.toBeCloseTo(112.69, 0);
  });

  it("long-track Smart Tempo stays sparse and validates as Project (no orphan template)", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 240_000;
    const bpm = 120;
    const period = 60_000 / bpm;
    const beatCount = Math.ceil(durationMs / period) + 1;
    const beatMs = Array.from({ length: beatCount }, (_, i) =>
      Math.round(i * period),
    );
    const offsetMs = usImport.gapMs;

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "dense-map",
      smartTempoAudio: {
        assetId: "local-pending",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: offsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: bpm,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // Logic-like sparse map from a long constant beat grid (not one event/beat).
    expect(beatMs.length).toBeGreaterThan(256);
    expect(r.tempoMap.length).toBeGreaterThan(0);
    expect(r.tempoMap.length).toBeLessThan(128);
    expect(r.tempoMap.length).toBeLessThanOrEqual(2048);

    const applied = applyUsUgBridgeToProject(
      createProjectSeed("dense", "Winner", "2026-08-03T00:00:00.000Z"),
      r,
      {
        smartTempoAudio: {
          assetId: "local-pending",
          durationMs,
          peaks: [0.1, 0.5],
          audioStartOffsetMs: offsetMs,
        },
      },
    );

    // Bridged content — not bare Countdown+Intro seed.
    expect(applied.forma.clips.some((c) => c.name === "Verse")).toBe(true);
    expect(applied.forma.clips.some((c) => c.name === "Chorus")).toBe(true);
    expect(applied.tekst.clips.length).toBeGreaterThan(0);
    expect(applied.akordy.clips.length).toBeGreaterThan(0);
    expect(applied.tempoMap.length).toBe(r.tempoMap.length);
    // Synthetic wizard id must not place a stub clip before real upload.
    expect(
      applied.audioClips.some((c) => c.id === US_UG_BACKING_CLIP_ID),
    ).toBe(false);

    expect(() => ProjectSchema.parse(applied)).not.toThrow();

    const withRealAsset = applyUsUgBridgeToProject(applied, r, {
      smartTempoAudio: {
        assetId: "asset-real-1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: offsetMs,
      },
    });
    expect(
      withRealAsset.audioClips.some((c) => c.id === US_UG_BACKING_CLIP_ID),
    ).toBe(true);
    const realClip = withRealAsset.audioClips.find(
      (c) => c.id === US_UG_BACKING_CLIP_ID,
    );
    expect(realClip?.trimInMs).toBe(offsetMs);
    expect(() => ProjectSchema.parse(withRealAsset)).not.toThrow();
  });

  it("winner-intro-vc with ~120 BPM audio (content-epoch): text near tick 0, Forma follows words", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const bpm =
      suggestGridBpmFromUsUgTexts(us, ug) ??
      usImport.ultrastarMetronomeBpm;
    expect(bpm).toBeCloseTo(120, 0);
    const period = 60_000 / bpm;
    const durationMs = 180_000;
    const offsetMs = usImport.gapMs;
    const beatCount = Math.min(512, Math.ceil(durationMs / period) + 1);
    const beatMs = Array.from({ length: beatCount }, (_, i) =>
      Math.round(i * period),
    );

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-pipe-audio",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: offsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: bpm,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const BAR = 3840;
    expect(r.seedBpm).toBeCloseTo(bpm, 0);
    const verse = r.formaMusic.clips.find((c) => c.name === "Verse")!;
    const chorus = r.formaMusic.clips.find((c) => c.name === "Chorus")!;

    const firstVocal = r.tekst.clips[0]!;
    // Content-epoch: first US note @ #GAP → near tick 0 (Beat 1)
    expect(firstVocal.startTicks).toBeLessThan(BAR);
    // Forma Verse starts on/after pickup barline near the vocal.
    expect(verse.startTicks).toBeLessThanOrEqual(BAR);
    expect(firstVocal.startTicks).toBeLessThanOrEqual(verse.startTicks);
    expect(chorus.startTicks).toBe(verse.startTicks + verse.lengthTicks);

    const winnerLine = r.tekst.clips.find((c) => /winner takes/i.test(c.text));
    expect(winnerLine).toBeTruthy();
    expect(winnerLine!.startTicks).toBeGreaterThanOrEqual(
      chorus.startTicks - BAR,
    );
  });

  it("winner-intro-vc: dynamic BPM map — Forma still follows word links", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 180_000;
    const offsetMs = usImport.gapMs;
    // Mild tempo drift around 120 BPM — map must stay dynamic
    let t = 0;
    const beatMs: number[] = [0];
    for (let i = 1; i < 400 && t < durationMs; i++) {
      const period = 500 + Math.round(12 * Math.sin(i / 7));
      t += period;
      beatMs.push(t);
    }

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-dyn",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: offsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 118,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const BAR = 3840;
    const verse = r.formaMusic.clips.find((c) => c.name === "Verse")!;
    const chorus = r.formaMusic.clips.find((c) => c.name === "Chorus")!;

    expect(r.tempoMap.length).toBeGreaterThan(1);
    const bpms = r.tempoMap.map((e) => e.bpm);
    expect(Math.max(...bpms) - Math.min(...bpms)).toBeGreaterThan(1);

    const firstVocal = r.tekst.clips[0]!;
    expect(firstVocal.startTicks).toBeLessThan(BAR);
    expect(chorus.startTicks).toBe(verse.startTicks + verse.lengthTicks);

    // Content-epoch: Beat 1 → tick 0 on the map
    expect(
      secondsToTicks(0, r.tempoMap, r.seedBpm, { numerator: 4, denominator: 4 }, DEFAULT_PPQ),
    ).toBe(0);
  });

  it("winner-intro-vc: Beat 1 at file start — pickup before Verse Forma", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 180_000;
    const gapMs = usImport.gapMs;
    const beatMs = Array.from({ length: 360 }, (_, i) => i * 500);

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-intro-music",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: 0,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const BAR = 3840;
    const intro = r.formaMusic.clips.find((c) => c.name === "Intro")!;
    const verse = r.formaMusic.clips.find((c) => c.name === "Verse")!;
    const chorus = r.formaMusic.clips.find((c) => c.name === "Chorus")!;
    expect(verse.startTicks).toBe(17 * BAR);
    expect(intro.lengthTicks).toBe(verse.startTicks);
    expect(chorus.startTicks).toBe(verse.startTicks + verse.lengthTicks);

    const firstVocal = r.tekst.clips[0]!;
    const gapTicks = Math.round((gapMs / 1000) * (120 / 60) * 960);
    expect(firstVocal.startTicks).toBeGreaterThanOrEqual(gapTicks - BAR);
    expect(firstVocal.startTicks).toBeLessThanOrEqual(gapTicks + BAR);
    expect(firstVocal.startTicks).toBeLessThan(verse.startTicks);
    expect(firstVocal.startTicks).toBeGreaterThanOrEqual(verse.startTicks - BAR);
  });

  it("winner-intro-vc: does not rewrite Audio Start Offset via chord↔syllable lock", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 180_000;
    const lateOffsetMs = 2_000;
    const beatMs = Array.from({ length: 400 }, (_, i) => lateOffsetMs + i * 500);

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-align",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: lateOffsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // Text = US wall-clock; Adapt offset stays as provided (no chord lock rewrite).
    expect(r.smartTempoAudio?.audioStartOffsetMs).toBe(lateOffsetMs);

    const chorus = r.formaMusic.clips.find((c) => c.name === "Chorus")!;
    const winnerLine = r.tekst.clips.find((c) => /winner takes/i.test(c.text));
    expect(winnerLine).toBeTruthy();
    expect(winnerLine!.startTicks).toBeGreaterThanOrEqual(
      chorus.startTicks - 3840,
    );
  });

  it("Smart Tempo seed ignores UltraStar metro when audio analysis is present", () => {
    const { ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(
      `#TITLE:T\n#ARTIST:A\n#BPM:480\n#GAP:33000\n: 0 4 0 I \n: 5 4 0 don’t \n- 20\n: 40 4 0 The \n: 45 4 0 win \nE\n`,
    );
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;
    const beatMs = Array.from({ length: 200 }, (_, i) => i * 500);
    const r = bridgeUsUgImport(usImport, ug, {
      smartTempoAudio: {
        assetId: "a1",
        durationMs: 100_000,
        peaks: [0.1],
        audioStartOffsetMs: 0,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.seedBpm).toBeCloseTo(120, 0);
    expect(r.ultrastarMetronomeBpm).toBe(120);
    expect(r.formaMusic.clips.length).toBeGreaterThanOrEqual(2);
  });

  it("winner-intro-vc: manual Audio Start Offset is not overwritten by chord lock", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 180_000;
    // Without the user-edit flag, lock would shift 3000 → 1000 (−1 bar @ 120).
    const manualOffsetMs = 3_000;
    const beatMs = Array.from(
      { length: 400 },
      (_, i) => manualOffsetMs + i * 500,
    );

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-manual-offset",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: manualOffsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
      audioStartOffsetUserEdited: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.smartTempoAudio?.audioStartOffsetMs).toBe(manualOffsetMs);
  });

  it("tekst keeps exact US wall-clock (no snap to audio beat grid)", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 180_000;
    const offsetMs = usImport.gapMs;
    // Audio grid deliberately off US 120 BPM (500ms) so snap would skew vocals.
    const beatMs = Array.from({ length: 400 }, (_, i) => i * 480);

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-nosnap",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: offsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 125,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const first = r.tekst.clips[0]!;
    const blocks = first.blocks ?? [];
    expect(blocks.length).toBeGreaterThan(1);

    // First US note @ #GAP → content-epoch tick ~0 (exact ms, not nearest 480ms beat).
    expect(first.startTicks).toBeLessThan(200);

    // Second syllable: US beat spacing @ place BPM must survive (not collapse to one grid beat).
    const b0 = blocks[0]!;
    const b1 = blocks[1]!;
    expect(b1.startTicks).toBeGreaterThan(b0.startTicks);
    // At ~120 place BPM one US beat ≈ 960 ticks; allow map warp but reject snap-collapse.
    expect(b1.startTicks - b0.startTicks).toBeGreaterThan(200);
  });

  it("warns experimental when no audio", () => {
    const pair = loadPair("demo-simple");
    const us = importUltrastarText(pair.us);
    expect(us.ok).toBe(true);
    if (!us.ok) return;
    const r = bridgeUsUgImport(us, pair.ug);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings.some((w) => /eksperymentalny/i.test(w))).toBe(true);
  });
});
