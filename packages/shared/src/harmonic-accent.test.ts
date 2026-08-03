import { describe, expect, it } from "vitest";
import {
  findHarmonicAccentSyllable,
  scoreHarmonicAccent,
  syllablesInChordScope,
  type HarmonicSyllable,
} from "./harmonic-accent.js";

function syl(
  text: string,
  start: number,
  duration: number,
  pitch = 60,
  phraseIndex = 0,
): HarmonicSyllable {
  return {
    text,
    startTicks: start,
    endTicks: start + duration,
    durationTicks: duration,
    pitchMidi: pitch,
    phraseIndex,
  };
}

describe("scoreHarmonicAccent", () => {
  it("rewards duration and end-of-scope", () => {
    const long = syl("all", 100, 2000);
    const short = syl("The", 0, 200);
    const longScore = scoreHarmonicAccent(long, {
      prev: short,
      beforePause: true,
      indexInScope: 5,
      scopeLength: 6,
    });
    const shortScore = scoreHarmonicAccent(short, {
      prev: null,
      beforePause: false,
      indexInScope: 0,
      scopeLength: 6,
    });
    expect(longScore).toBeGreaterThan(shortScore);
  });
});

describe("findHarmonicAccentSyllable", () => {
  it("returns null for empty scope", () => {
    expect(findHarmonicAccentSyllable([])).toBeNull();
  });

  it("Winner chorus: first accent is „all”, not „The”", () => {
    // Durations mirror UltraStar beat lengths (×scaled ticks).
    const phrase = [
      syl("The", 0, 300),
      syl("win", 300, 300),
      syl("ner", 600, 400, 70),
      syl("takes", 1000, 700),
      syl("it", 1700, 200),
      syl("all", 1900, 2000),
    ];
    const accent = findHarmonicAccentSyllable(phrase);
    expect(accent?.text).toBe("all");
  });

  it("Winner chorus: „small” wins standing-small scope", () => {
    const phrase = [
      syl("stan", 0, 600),
      syl("ding", 600, 400),
      syl("small", 1000, 1900),
    ];
    expect(findHarmonicAccentSyllable(phrase)?.text).toBe("small");
  });

  it("Verse: first accent „talk”, not later „through” in a wider list", () => {
    const talkLine = [
      syl("I", 0, 500),
      syl("dont", 500, 600),
      syl("wan", 1100, 300),
      syl("na", 1400, 200),
      syl("talk", 1600, 900),
    ];
    expect(findHarmonicAccentSyllable(talkLine)?.text).toBe("talk");
  });

  it("tie-break prefers the earlier syllable at equal score", () => {
    // Identical long notes; short phrase-final must not steal the max.
    const scope = [
      syl("first", 0, 1500, 60),
      syl("second", 1500, 1500, 60),
      syl("tail", 3000, 200, 60),
    ];
    expect(findHarmonicAccentSyllable(scope)?.text).toBe("first");
  });
});

describe("syllablesInChordScope", () => {
  it("filters [start, end) and phrase-bounded open end", () => {
    const all = [
      syl("a", 0, 100, 60, 0),
      syl("b", 100, 100, 60, 0),
      syl("c", 200, 100, 60, 1),
      syl("d", 300, 100, 60, 1),
    ];
    expect(syllablesInChordScope(all, 0, 200).map((s) => s.text)).toEqual([
      "a",
      "b",
    ]);
    expect(syllablesInChordScope(all, 200, null).map((s) => s.text)).toEqual([
      "c",
      "d",
    ]);
  });

  it("sequential phrase scopes do not steal later verse phrases", () => {
    // Winner-like: each chord line maps to one phrase only.
    const all = [
      syl("I", 0, 100, 60, 0),
      syl("talk", 100, 500, 60, 0),
      syl("About", 2000, 100, 60, 1),
      syl("through", 2500, 800, 60, 1),
      syl("Though", 4000, 100, 60, 2),
      syl("me", 4500, 600, 60, 2),
    ];
    const p0 = all.filter((s) => s.phraseIndex === 0);
    const p1 = all.filter((s) => s.phraseIndex === 1);
    expect(findHarmonicAccentSyllable(p0)?.text).toBe("talk");
    expect(findHarmonicAccentSyllable(p1)?.text).toBe("through");
    // Scope limited to phrase 0 must never return „through”
    expect(
      syllablesInChordScope(p0, 0, null).map((s) => s.text),
    ).toEqual(["I", "talk"]);
    expect(
      findHarmonicAccentSyllable(syllablesInChordScope(p0, 0, null))?.text,
    ).toBe("talk");
  });
});
