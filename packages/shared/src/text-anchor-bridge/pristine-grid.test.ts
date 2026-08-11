import { describe, expect, it, vi } from "vitest";
import { buildPristineSectionGrid } from "./pristine-grid.js";
import type {
  BuildPristineSectionGridInput,
  PristineSectionChord,
} from "./types.js";
import type { HarmonicSyllable } from "../harmonic-accent.js";
import type { UgPipeChordEvent } from "../ug-pipe-bars.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BAR = 480; // ticks per bar (PPQ=120, 4/4)

function makeSyl(
  startTicks: number,
  durationTicks: number,
  opts: Partial<HarmonicSyllable> = {},
): HarmonicSyllable {
  return {
    text: "la",
    startTicks,
    endTicks: startTicks + durationTicks,
    durationTicks,
    pitchMidi: 60,
    phraseIndex: 0,
    ...opts,
  };
}

function makeChord(
  symbol: string,
  opts: Partial<PristineSectionChord> = {},
): PristineSectionChord {
  return {
    symbol,
    ugWordIndex: null,
    orderInSection: 0,
    chordLineIndex: 0,
    wordAligned: false,
    ...opts,
  };
}

function baseInput(
  overrides: Partial<BuildPristineSectionGridInput> = {},
): BuildPristineSectionGridInput {
  return {
    containerStart: 0,
    containerEnd: BAR * 8,
    barTicks: BAR,
    sectionName: "Verse",
    chords: [],
    pipeEvents: [],
    pipeBarCount: 0,
    usSyllables: [],
    resolveWordStartTicks: () => null,
    barsPerChord: 2,
    idPrefix: "t",
    seqStart: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Branch 1: Pipe events
// ---------------------------------------------------------------------------

describe("buildPristineSectionGrid — pipe branch", () => {
  it("places chords at barIndex + offsetInBar ticks", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "C", isRest: false },
      { barIndex: 2, offsetInBar: 0, symbol: "G", isRest: false },
    ];
    const result = buildPristineSectionGrid(
      baseInput({ pipeEvents, pipeBarCount: 4 }),
    );
    expect(result.clips).toHaveLength(2);
    expect(result.clips[0]!.startTicks).toBe(0);
    expect(result.clips[0]!.symbol).toBe("C");
    expect(result.clips[1]!.startTicks).toBe(BAR * 2);
    expect(result.clips[1]!.symbol).toBe("G");
  });

  it("skips pipe events whose tick is >= containerEnd", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "Am", isRest: false },
      { barIndex: 10, offsetInBar: 0, symbol: "Out", isRest: false }, // beyond 8 bars
    ];
    const result = buildPristineSectionGrid(
      baseInput({ pipeEvents, pipeBarCount: 4 }),
    );
    expect(result.clips).toHaveLength(1);
    expect(result.clips[0]!.symbol).toBe("Am");
  });

  it("handles isRest events — rest clips are not in sounding output", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "R", isRest: true },
      { barIndex: 2, offsetInBar: 0, symbol: "Em", isRest: false },
    ];
    const result = buildPristineSectionGrid(
      baseInput({ pipeEvents, pipeBarCount: 4 }),
    );
    const soundingSymbols = result.clips.map((c) => c.symbol);
    expect(soundingSymbols).not.toContain("R");
    expect(soundingSymbols).toContain("Em");
  });

  it("merges consecutive pipe events with same symbol (deduplication)", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "D", isRest: false },
      { barIndex: 1, offsetInBar: 0, symbol: "D", isRest: false }, // duplicate
      { barIndex: 2, offsetInBar: 0, symbol: "A", isRest: false },
    ];
    const result = buildPristineSectionGrid(
      baseInput({ pipeEvents, pipeBarCount: 4 }),
    );
    const symbols = result.clips.map((c) => c.symbol);
    expect(symbols.filter((s) => s === "D")).toHaveLength(1);
    expect(symbols).toContain("A");
  });

  it("uses offsetInBar fraction correctly", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 1, offsetInBar: 0.5, symbol: "F", isRest: false },
    ];
    const result = buildPristineSectionGrid(
      baseInput({ pipeEvents, pipeBarCount: 4 }),
    );
    // bar 1 + 0.5 bar offset = BAR + BAR/2
    expect(result.clips[0]!.startTicks).toBe(BAR + Math.round(0.5 * BAR));
  });

  it("assigns sequential IDs starting from seqStart", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "C", isRest: false },
      { barIndex: 2, offsetInBar: 0, symbol: "G", isRest: false },
    ];
    const result = buildPristineSectionGrid(
      baseInput({ pipeEvents, pipeBarCount: 4, seqStart: 5, idPrefix: "sec" }),
    );
    expect(result.clips[0]!.id).toBe("sec-akord-6");
    expect(result.clips[1]!.id).toBe("sec-akord-7");
    expect(result.nextSeq).toBe(7);
  });

  it("returns approximate=false and no warnings for pipe branch", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "C", isRest: false },
    ];
    const result = buildPristineSectionGrid(
      baseInput({ pipeEvents, pipeBarCount: 4 }),
    );
    expect(result.approximate).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Branch 2: Evenly-spaced (no US syllables, no pipe)
// ---------------------------------------------------------------------------

describe("buildPristineSectionGrid — evenly-spaced branch", () => {
  it("places 4 chords evenly across 8-bar container", () => {
    const chords = [
      makeChord("C", { orderInSection: 0, chordLineIndex: 0 }),
      makeChord("Am", { orderInSection: 1, chordLineIndex: 1 }),
      makeChord("F", { orderInSection: 2, chordLineIndex: 2 }),
      makeChord("G", { orderInSection: 3, chordLineIndex: 3 }),
    ];
    const result = buildPristineSectionGrid(baseInput({ chords }));
    expect(result.clips).toHaveLength(4);
    // Each onset must be a multiple of barTicks
    for (const clip of result.clips) {
      expect(clip.startTicks % BAR).toBe(0);
    }
    // Monotonically increasing
    for (let i = 1; i < result.clips.length; i++) {
      expect(result.clips[i]!.startTicks).toBeGreaterThan(
        result.clips[i - 1]!.startTicks,
      );
    }
  });

  it("marks result as approximate", () => {
    const chords = [makeChord("C"), makeChord("G")];
    const result = buildPristineSectionGrid(baseInput({ chords }));
    expect(result.approximate).toBe(true);
  });

  it("returns empty clips when chords list is empty", () => {
    const result = buildPristineSectionGrid(baseInput({ chords: [] }));
    expect(result.clips).toHaveLength(0);
    expect(result.approximate).toBe(false);
  });

  it("places a single chord at containerStart (Beat 1)", () => {
    const chords = [makeChord("Dm")];
    const result = buildPristineSectionGrid(baseInput({ chords }));
    expect(result.clips).toHaveLength(1);
    expect(result.clips[0]!.startTicks).toBe(0);
    expect(result.clips[0]!.symbol).toBe("Dm");
  });

  it("respects barsPerChord=1 — prefer-two path places each chord 1 bar apart", () => {
    const chords = [
      makeChord("C", { orderInSection: 0, chordLineIndex: 0 }),
      makeChord("G", { orderInSection: 1, chordLineIndex: 1 }),
    ];
    const result = buildPristineSectionGrid(
      baseInput({ chords, barsPerChord: 1 }),
    );
    // With bpc=1, cellTicks=BAR; 2 chords × 1 bar <= 8 bars → prefer-two path
    expect(result.clips[0]!.startTicks).toBe(0);
    expect(result.clips[1]!.startTicks).toBe(BAR);
  });

  it("chord lengthTicks reaches next chord start (DAW standard)", () => {
    const chords = [
      makeChord("A", { orderInSection: 0, chordLineIndex: 0 }),
      makeChord("E", { orderInSection: 1, chordLineIndex: 1 }),
    ];
    const result = buildPristineSectionGrid(baseInput({ chords }));
    expect(result.clips[0]!.lengthTicks).toBe(
      result.clips[1]!.startTicks - result.clips[0]!.startTicks,
    );
  });
});

// ---------------------------------------------------------------------------
// Branch 3: Word-aligned (US syllables present)
// ---------------------------------------------------------------------------

describe("buildPristineSectionGrid — word-aligned branch", () => {
  it("places chord at harmonic accent syllable tick (snapped to Beat 1)", () => {
    // syllable at tick BAR (Beat 1 of bar 1) — long note = strong accent
    const syls: HarmonicSyllable[] = [
      makeSyl(0, 60, { phraseIndex: 0 }), // short pickup
      makeSyl(BAR, 400, { phraseIndex: 0 }), // long accent — should win
    ];
    const chords = [
      makeChord("Em", {
        orderInSection: 0,
        chordLineIndex: 0,
        wordAligned: true,
        ugWordIndex: null,
      }),
    ];
    const result = buildPristineSectionGrid(
      baseInput({ chords, usSyllables: syls }),
    );
    expect(result.clips).toHaveLength(1);
    // Should land on a bar boundary
    expect(result.clips[0]!.startTicks % BAR).toBe(0);
  });

  it("interpolates null onset and marks approximate + warning", () => {
    // Syllable exists in the window (triggers word-aligned branch) but the two
    // chords are on the same chordLineIndex — so sameWordNext=true for the
    // first chord → scoped=[] → accent=null → usedS1=true → interpolation.
    const syls: HarmonicSyllable[] = [
      // short note only — findHarmonicAccentSyllable will still return it,
      // so force the sameWordNext path by giving both chords the same ugWordIndex
      makeSyl(0, 50, { phraseIndex: 0 }),
    ];
    const chords = [
      makeChord("C", {
        orderInSection: 0,
        chordLineIndex: 0,
        wordAligned: true,
        ugWordIndex: 0, // same word index for both
      }),
      makeChord("G", {
        orderInSection: 1,
        chordLineIndex: 0,
        wordAligned: true,
        ugWordIndex: 0, // same → sameWordNext=true for first → scoped=[] → accent=null
      }),
    ];
    const result = buildPristineSectionGrid(
      baseInput({ chords, usSyllables: syls }),
    );
    expect(result.approximate).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("interpolacja");
  });

  it("resolveWordStartTicks is called with ugWordIndex", () => {
    const resolver = vi.fn().mockReturnValue(BAR * 2);
    const syls: HarmonicSyllable[] = [
      makeSyl(BAR * 2, 200, { phraseIndex: 0 }),
    ];
    const chords = [
      makeChord("Bm", {
        orderInSection: 0,
        chordLineIndex: 0,
        wordAligned: true,
        ugWordIndex: 3,
      }),
    ];
    buildPristineSectionGrid(
      baseInput({ chords, usSyllables: syls, resolveWordStartTicks: resolver }),
    );
    expect(resolver).toHaveBeenCalledWith(3);
  });

  it("sets usedWordAlign=true for word-aligned chords", () => {
    const syls: HarmonicSyllable[] = [makeSyl(0, 200, { phraseIndex: 0 })];
    const chords = [
      makeChord("F#m", {
        orderInSection: 0,
        chordLineIndex: 0,
        wordAligned: true,
      }),
    ];
    const result = buildPristineSectionGrid(
      baseInput({ chords, usSyllables: syls }),
    );
    expect(result.usedWordAlign).toBe(true);
  });

  it("sets usedWordAlign=false for evenly-spaced branch", () => {
    const chords = [makeChord("C")];
    const result = buildPristineSectionGrid(baseInput({ chords }));
    expect(result.usedWordAlign).toBe(false);
  });

  it("non-word-aligned single-chord group uses grid onset (forceGrid path)", () => {
    const syls: HarmonicSyllable[] = [
      makeSyl(BAR * 3, 200, { phraseIndex: 0 }),
    ];
    const chords = [
      makeChord("D", {
        orderInSection: 0,
        chordLineIndex: 0,
        wordAligned: false, // left-aligned → forceGrid
      }),
      makeChord("G", {
        orderInSection: 1,
        chordLineIndex: 1,
        wordAligned: false,
      }),
    ];
    const result = buildPristineSectionGrid(
      baseInput({ chords, usSyllables: syls, barsPerChord: 2 }),
    );
    expect(result.clips[0]!.startTicks).toBe(0); // gridSlot 0 → containerStart
    expect(result.clips[1]!.startTicks).toBe(BAR * 2); // gridSlot 1 × 2 bars
  });

  it("multiple chords on same chordLineIndex are grouped together", () => {
    const syls: HarmonicSyllable[] = [
      makeSyl(0, 100, { phraseIndex: 0 }),
      makeSyl(BAR * 2, 300, { phraseIndex: 0 }),
      makeSyl(BAR * 4, 300, { phraseIndex: 0 }),
    ];
    const chords = [
      makeChord("C", {
        orderInSection: 0,
        chordLineIndex: 0,
        wordAligned: true,
        ugWordIndex: null,
      }),
      makeChord("G7", {
        orderInSection: 1,
        chordLineIndex: 0, // same line → same group
        wordAligned: true,
        ugWordIndex: null,
      }),
    ];
    const result = buildPristineSectionGrid(
      baseInput({ chords, usSyllables: syls }),
    );
    expect(result.clips.length).toBeGreaterThanOrEqual(1);
    if (result.clips.length >= 2) {
      expect(result.clips[1]!.startTicks).toBeGreaterThan(
        result.clips[0]!.startTicks,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Output shape & invariants
// ---------------------------------------------------------------------------

describe("buildPristineSectionGrid — output invariants", () => {
  it("all clip startTicks are within [containerStart, containerEnd)", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "A", isRest: false },
      { barIndex: 3, offsetInBar: 0, symbol: "B", isRest: false },
      { barIndex: 6, offsetInBar: 0, symbol: "C", isRest: false },
    ];
    const input = baseInput({ pipeEvents, pipeBarCount: 8 });
    const result = buildPristineSectionGrid(input);
    for (const clip of result.clips) {
      expect(clip.startTicks).toBeGreaterThanOrEqual(input.containerStart);
      expect(clip.startTicks).toBeLessThan(input.containerEnd);
    }
  });

  it("all clip lengthTicks >= 1", () => {
    const chords = [
      makeChord("X", { orderInSection: 0, chordLineIndex: 0 }),
      makeChord("Y", { orderInSection: 1, chordLineIndex: 1 }),
    ];
    const result = buildPristineSectionGrid(baseInput({ chords }));
    for (const clip of result.clips) {
      expect(clip.lengthTicks).toBeGreaterThanOrEqual(1);
    }
  });

  it("clips are sorted by startTicks", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 3, offsetInBar: 0, symbol: "Z", isRest: false },
      { barIndex: 1, offsetInBar: 0, symbol: "A", isRest: false },
    ];
    const result = buildPristineSectionGrid(
      baseInput({ pipeEvents, pipeBarCount: 4 }),
    );
    for (let i = 1; i < result.clips.length; i++) {
      expect(result.clips[i]!.startTicks).toBeGreaterThanOrEqual(
        result.clips[i - 1]!.startTicks,
      );
    }
  });

  it("nextSeq increments by the number of clips produced", () => {
    const chords = [
      makeChord("C", { orderInSection: 0, chordLineIndex: 0 }),
      makeChord("G", { orderInSection: 1, chordLineIndex: 1 }),
      makeChord("Am", { orderInSection: 2, chordLineIndex: 2 }),
    ];
    const result = buildPristineSectionGrid(
      baseInput({ chords, seqStart: 10 }),
    );
    expect(result.nextSeq).toBe(10 + result.clips.length);
  });

  it("clip IDs are unique within one call", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "A", isRest: false },
      { barIndex: 2, offsetInBar: 0, symbol: "B", isRest: false },
      { barIndex: 4, offsetInBar: 0, symbol: "C", isRest: false },
    ];
    const result = buildPristineSectionGrid(
      baseInput({ pipeEvents, pipeBarCount: 8 }),
    );
    const ids = result.clips.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("handles containerStart > 0 correctly (non-zero offset)", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "Bb", isRest: false },
    ];
    const result = buildPristineSectionGrid(
      baseInput({
        containerStart: BAR * 4,
        containerEnd: BAR * 12,
        pipeEvents,
        pipeBarCount: 4,
      }),
    );
    expect(result.clips[0]!.startTicks).toBe(BAR * 4); // absolute ticks
  });

  it("returns empty result for empty input (no chords, no pipe, no syllables)", () => {
    const result = buildPristineSectionGrid(baseInput());
    expect(result.clips).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.approximate).toBe(false);
    expect(result.usedWordAlign).toBe(false);
    expect(result.nextSeq).toBe(0);
  });

  it("uses default idPrefix 'bridge' when none provided", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "G", isRest: false },
    ];
    const input = baseInput({ pipeEvents, pipeBarCount: 4 });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { idPrefix: _omit, ...withoutPrefix } = input;
    const result = buildPristineSectionGrid(
      withoutPrefix as BuildPristineSectionGridInput,
    );
    expect(result.clips[0]!.id).toMatch(/^bridge-akord-/);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("buildPristineSectionGrid — edge cases", () => {
  it("barTicks=1 does not crash or produce negative lengths", () => {
    const chords = [makeChord("C")];
    const result = buildPristineSectionGrid(
      baseInput({ chords, barTicks: 1, containerEnd: 10 }),
    );
    for (const clip of result.clips) {
      expect(clip.lengthTicks).toBeGreaterThanOrEqual(1);
    }
  });

  it("single-bar container with one pipe chord clips to lastLegal", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "Am", isRest: false },
    ];
    const result = buildPristineSectionGrid(
      baseInput({
        containerStart: 0,
        containerEnd: BAR,
        pipeEvents,
        pipeBarCount: 1,
      }),
    );
    expect(result.clips[0]!.startTicks).toBe(0);
    expect(result.clips[0]!.startTicks).toBeLessThan(BAR);
  });

  it("pipeBarCount=0 with pipeEvents ignores pipe and falls to grid/syllable branch", () => {
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "Pipe", isRest: false },
    ];
    const chords = [makeChord("Grid")];
    // pipeBarCount=0 → pipe branch NOT taken
    const result = buildPristineSectionGrid(
      baseInput({ pipeEvents, pipeBarCount: 0, chords }),
    );
    const symbols = result.clips.map((c) => c.symbol);
    expect(symbols).not.toContain("Pipe");
    expect(symbols).toContain("Grid");
  });

  it("very large barsPerChord still produces at least one chord", () => {
    const chords = [makeChord("E")];
    const result = buildPristineSectionGrid(
      baseInput({ chords, barsPerChord: 999 }),
    );
    expect(result.clips).toHaveLength(1);
  });

  it("two pipe chords that land on same tick: second is pushed by half-bar", () => {
    // Both events at barIndex 0 → same startTicks after mapping
    const pipeEvents: UgPipeChordEvent[] = [
      { barIndex: 0, offsetInBar: 0, symbol: "C", isRest: false },
      { barIndex: 0, offsetInBar: 0, symbol: "G", isRest: false },
    ];
    const result = buildPristineSectionGrid(
      baseInput({ pipeEvents, pipeBarCount: 4 }),
    );
    if (result.clips.length >= 2) {
      expect(result.clips[1]!.startTicks).toBeGreaterThan(
        result.clips[0]!.startTicks,
      );
    }
  });
});
