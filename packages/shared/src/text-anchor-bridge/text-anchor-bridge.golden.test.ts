import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createProjectSeed } from "../project/project-seed.js";
import { ProjectSchema } from "../project/schema.js";
import {
  TEXT_ANCHOR_WEAK_ALIGN,
  applyUsUgBridgeToProject,
  bridgeUsUgFromTexts,
  parseChordProLyricLine,
  parseUgBridgeSections,
  timedWordsFromUltrastar,
} from "./text-anchor-bridge.js";
import { importUltrastarText } from "../import/ultrastar/ultrastar-import.js";
import { isTickOnBarOrHalf } from "../tempo-map-solver/tempo-map-solver.js";

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
      applied.forma.clips
        .filter((c) => c.kind === "section")
        .map((c) => c.name),
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
      bridged.warnings.some((w) => /Solo/i.test(w) || /bez wokalu/i.test(w)),
    ).toBe(true);

    const soloClips = bridged.akordy.clips.filter(
      (c) =>
        c.startTicks >= solo!.startTicks &&
        c.startTicks < solo!.startTicks + solo!.lengthTicks,
    );
    expect(soloClips.length).toBe(solo!.chordCount);
    // Even spacing inside solo window
    const gaps = soloClips
      .slice(1)
      .map((c, i) => c.startTicks - soloClips[i]!.startTicks);
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
      expect(isTickOnBarOrHalf(c.startTicks, BAR, verse!.startTicks)).toBe(
        true,
      );
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
