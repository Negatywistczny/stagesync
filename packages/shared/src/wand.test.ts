import { describe, expect, it } from "vitest";
import { DEFAULT_PPQ, ticksPerBar } from "./time.js";
import { createProjectV5Seed } from "./project-seed.js";
import { placeContentFromForma, wandContentToForma } from "./wand.js";
import type { Project } from "./schema.js";

const BAR = ticksPerBar({ numerator: 4, denominator: 4 }, DEFAULT_PPQ); // 3840

function barSpansFromStarts(
  starts: number[],
  secStart: number,
  secEnd: number,
): number[] {
  const abs = [...starts, secEnd];
  return abs.slice(0, -1).map((s, i) => (abs[i + 1]! - s) / BAR);
}

function sectionProject(
  bars: number,
  lines: string[],
  opts?: { subsections?: number[] },
): Project {
  let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
  const intro = p.forma.clips.find((c) => c.name === "Intro")!;
  const subsections = opts?.subsections;
  p = {
    ...p,
    forma: {
      clips: p.forma.clips.map((c) =>
        c.id === intro.id
          ? {
              ...c,
              lengthTicks: bars * BAR,
              ...(subsections ? { subsections } : {}),
            }
          : c,
      ),
    },
    tekst: {
      clips: lines.map((text, i) => ({
        id: `t${i + 1}`,
        startTicks: intro.startTicks,
        lengthTicks: BAR,
        text,
      })),
    },
  };
  return p;
}

function withVerse(p: Project): Project {
  const intro = p.forma.clips.find((c) => c.name === "Intro")!;
  return {
    ...p,
    forma: {
      clips: [
        ...p.forma.clips.filter((c) => c.id !== intro.id),
        { ...intro, lengthTicks: 2 * BAR },
        {
          id: "forma-verse",
          name: "Verse",
          kind: "section" as const,
          startTicks: intro.startTicks + 2 * BAR,
          lengthTicks: 4 * BAR,
        },
      ],
    },
  };
}

describe("placeContentFromForma", () => {
  it("8 bars / 4 lines → A even 2 bars", () => {
    const p = sectionProject(8, ["a", "b", "c", "d"]);
    const formaBefore = structuredClone(p.forma);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.project.forma).toEqual(formaBefore);
    const starts = result.project.tekst.clips
      .map((c) => c.startTicks)
      .sort((a, b) => a - b);
    expect(starts).toEqual([
      intro.startTicks,
      intro.startTicks + 2 * BAR,
      intro.startTicks + 4 * BAR,
      intro.startTicks + 6 * BAR,
    ]);
    expect(result.approximate).toBeFalsy();
  });

  it("7 bars / 4 lines → B remainder at end (1+2+2+2)", () => {
    const p = sectionProject(7, ["a", "b", "c", "d"]);
    const formaBefore = structuredClone(p.forma);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.project.forma).toEqual(formaBefore);
    expect(result.approximate).toBe(true);
    const starts = result.project.tekst.clips
      .map((c) => c.startTicks)
      .sort((a, b) => a - b);
    const spans = barSpansFromStarts(
      starts,
      intro.startTicks,
      intro.startTicks + 7 * BAR,
    );
    expect(spans).toEqual([1, 2, 2, 2]);
  });

  it("n > bars → D fractional", () => {
    const p = sectionProject(4, ["1", "2", "3", "4", "5", "6", "7", "8"]);
    const formaBefore = structuredClone(p.forma);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.project.forma).toEqual(formaBefore);
    const starts = result.project.tekst.clips
      .map((c) => c.startTicks)
      .sort((a, b) => a - b);
    expect(starts[0]).toBe(intro.startTicks);
    expect(starts[1]).toBe(intro.startTicks + BAR / 2);
    expect(starts).toHaveLength(8);
  });

  it("F when base≤1 and text weight disparity", () => {
    const p = sectionProject(8, [
      "Hi",
      "Yo",
      "This is a much longer phrase here",
      "Ok",
      "Go",
      "Another longer singing line now",
    ]);
    const formaBefore = structuredClone(p.forma);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.project.forma).toEqual(formaBefore);
    expect(result.approximate).toBe(true);
    const starts = result.project.tekst.clips
      .map((c) => c.startTicks)
      .sort((a, b) => a - b);
    const spans = barSpansFromStarts(
      starts,
      intro.startTicks,
      intro.startTicks + 8 * BAR,
    );
    expect(spans[2]!).toBeGreaterThan(spans[0]!);
    expect(spans[2]!).toBeGreaterThan(spans[1]!);
    expect(spans[5]!).toBeGreaterThan(spans[3]!);
    expect(spans[5]!).toBeGreaterThan(spans[4]!);
    const sum = spans.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 8)).toBeLessThan(0.05);
  });

  it("content/gap subsections → C (4+1+4+1)", () => {
    // Relative tick offsets: 4 bars, 5 bars, 9 bars into section
    const p = sectionProject(10, ["a", "b", "c", "d"], {
      subsections: [4 * BAR, 5 * BAR, 9 * BAR],
    });
    const formaBefore = structuredClone(p.forma);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.project.forma).toEqual(formaBefore);
    const starts = result.project.tekst.clips
      .map((c) => c.startTicks)
      .sort((a, b) => a - b);
    // Two lines in first content [0..4), two in second [5..9)
    expect(starts).toEqual([
      intro.startTicks,
      intro.startTicks + 2 * BAR,
      intro.startTicks + 5 * BAR,
      intro.startTicks + 7 * BAR,
    ]);
  });

  it("Forma identity unchanged across modes", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const intro0 = p.forma.clips.find((c) => c.name === "Intro")!;
    p = {
      ...p,
      forma: {
        clips: p.forma.clips.map((c) =>
          c.id === intro0.id ? { ...c, lengthTicks: 4 * BAR } : c,
        ),
      },
      tekst: {
        clips: [
          { id: "t1", startTicks: 0, lengthTicks: BAR, text: "One" },
          { id: "t2", startTicks: 0, lengthTicks: BAR, text: "Two" },
        ],
      },
      akordy: {
        clips: [
          { id: "a1", startTicks: 0, lengthTicks: BAR, symbol: "Am" },
          { id: "a2", startTicks: 0, lengthTicks: BAR, symbol: "F" },
        ],
      },
    };
    const formaBefore = structuredClone(p.forma);
    for (const mode of ["tekst", "akordy", "both"] as const) {
      const result = placeContentFromForma(p, mode);
      expect(result.ok).toBe(true);
      expect(result.project.forma).toEqual(formaBefore);
    }
  });

  it("chord path never uses F (weighted text would be F for Tekst)", () => {
    let p = sectionProject(8, [
      "Hi",
      "Yo",
      "This is a much longer phrase here",
      "Ok",
      "Go",
      "Another longer singing line now",
    ]);
    // Same count of chords; no vocals affinity → full-section A/B/D/E only
    p = {
      ...p,
      tekst: { clips: [] },
      akordy: {
        clips: ["C", "G", "Am", "F", "Dm", "E"].map((symbol, i) => ({
          id: `a${i + 1}`,
          startTicks: 0,
          lengthTicks: BAR,
          symbol,
        })),
      },
    };
    const formaBefore = structuredClone(p.forma);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const result = placeContentFromForma(p, "akordy");
    expect(result.ok).toBe(true);
    expect(result.project.forma).toEqual(formaBefore);
    // 8 bars / 6 chords → B (not F): base=1, extra=2 → [1,1,1,1,2,2]
    const starts = result.project.akordy.clips
      .map((c) => c.startTicks)
      .sort((a, b) => a - b);
    const spans = barSpansFromStarts(
      starts,
      intro.startTicks,
      intro.startTicks + 8 * BAR,
    );
    expect(spans).toEqual([1, 1, 1, 1, 2, 2]);
  });

  it("leaves Countdown and digit clips alone", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const cd = p.forma.clips.find((c) => c.kind === "countdown")!;
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "vl-cd-2",
            startTicks: cd.startTicks,
            lengthTicks: BAR,
            text: "2",
          },
          { id: "t1", startTicks: 0, lengthTicks: BAR, text: "Hello" },
        ],
      },
    };
    const formaBefore = structuredClone(p.forma);
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.project.forma).toEqual(formaBefore);
    const digit = result.project.tekst.clips.find((c) => c.id === "vl-cd-2")!;
    expect(digit.startTicks).toBe(cd.startTicks);
  });

  it("scopes placement to selected Forma section ids", () => {
    let p = withVerse(
      createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z"),
    );
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const verse = p.forma.clips.find((c) => c.name === "Verse")!;
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "ti",
            startTicks: intro.startTicks,
            lengthTicks: BAR,
            text: "Intro line",
          },
          {
            id: "tv",
            startTicks: verse.startTicks + BAR,
            lengthTicks: BAR,
            text: "Verse line",
          },
        ],
      },
    };
    const formaBefore = structuredClone(p.forma);
    const introStartBefore = p.tekst.clips.find((c) => c.id === "ti")!
      .startTicks;
    const result = placeContentFromForma(p, "tekst", {
      sectionIds: [verse.id],
    });
    expect(result.ok).toBe(true);
    expect(result.project.forma).toEqual(formaBefore);
    const introLine = result.project.tekst.clips.find((c) => c.id === "ti")!;
    const verseLine = result.project.tekst.clips.find((c) => c.id === "tv")!;
    expect(introLine.startTicks).toBe(introStartBefore);
    expect(verseLine.startTicks).toBe(verse.startTicks);
  });

  it("membership prefers sourceSection over startTicks", () => {
    let p = withVerse(
      createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z"),
    );
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const verse = p.forma.clips.find((c) => c.name === "Verse")!;
    // Lines sit in Intro abs range but declare Verse via sourceSection
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "t1",
            startTicks: intro.startTicks,
            lengthTicks: BAR,
            text: "a",
            sourceSection: "Verse",
          },
          {
            id: "t2",
            startTicks: intro.startTicks + 10,
            lengthTicks: BAR,
            text: "b",
            sourceSection: "Verse",
          },
        ],
      },
    };
    const result = placeContentFromForma(p, "tekst", {
      sectionIds: [verse.id],
    });
    expect(result.ok).toBe(true);
    const starts = result.project.tekst.clips
      .map((c) => c.startTicks)
      .sort((a, b) => a - b);
    expect(starts).toEqual([verse.startTicks, verse.startTicks + 2 * BAR]);
  });

  it("places Akordy across Forma without mutating Forma", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const intro0 = p.forma.clips.find((c) => c.name === "Intro")!;
    p = {
      ...p,
      forma: {
        clips: p.forma.clips.map((c) =>
          c.id === intro0.id ? { ...c, lengthTicks: 4 * BAR } : c,
        ),
      },
      akordy: {
        clips: [
          { id: "a1", startTicks: 0, lengthTicks: BAR, symbol: "C" },
          { id: "a2", startTicks: 0, lengthTicks: BAR, symbol: "G" },
        ],
      },
    };
    const formaBefore = structuredClone(p.forma);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const result = placeContentFromForma(p, "akordy");
    expect(result.ok).toBe(true);
    expect(result.project.forma).toEqual(formaBefore);
    const starts = result.project.akordy.clips
      .map((c) => c.startTicks)
      .sort((a, b) => a - b);
    expect(starts).toEqual([intro.startTicks, intro.startTicks + 2 * BAR]);
  });

  it("fails when Forma has no music sections", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = {
      ...p,
      forma: {
        clips: p.forma.clips.filter((c) => c.kind === "countdown"),
      },
      tekst: {
        clips: [{ id: "t1", startTicks: 0, lengthTicks: BAR, text: "Hi" }],
      },
      akordy: {
        clips: [{ id: "a1", startTicks: 0, lengthTicks: BAR, symbol: "C" }],
      },
    };
    expect(placeContentFromForma(p, "tekst").ok).toBe(false);
    expect(placeContentFromForma(p, "tekst").message).toMatch(/Brak sekcji/);
    expect(placeContentFromForma(p, "akordy").ok).toBe(false);
    expect(placeContentFromForma(p, "akordy").message).toMatch(/Brak sekcji/);
  });

  it("fails when Tekst has no sung lines", () => {
    let p = sectionProject(4, []);
    p = {
      ...p,
      tekst: {
        clips: [
          { id: "empty", startTicks: 0, lengthTicks: BAR, text: "  " },
          {
            id: "digit-pre",
            startTicks: -BAR,
            lengthTicks: BAR,
            text: "2",
          },
          {
            id: "vl-cd-9",
            startTicks: 0,
            lengthTicks: BAR,
            text: "sung-but-cd-id",
          },
        ],
      },
    };
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Brak linii Tekstu/);
  });

  it("fails when Akordy lane is empty", () => {
    const p = sectionProject(4, ["a"]);
    const result = placeContentFromForma(p, "akordy");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Brak clipów Akordów/);
  });

  it("fails when selected sections have no matching lines", () => {
    const p = withVerse(sectionProject(4, ["only-intro"]));
    const verse = p.forma.clips.find((c) => c.name === "Verse")!;
    const result = placeContentFromForma(p, "tekst", {
      sectionIds: [verse.id],
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/zaznaczonych sekcjach/);
  });

  it("fails when selected sections have no matching chords", () => {
    let p = withVerse(sectionProject(4, []));
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const verse = p.forma.clips.find((c) => c.name === "Verse")!;
    p = {
      ...p,
      akordy: {
        clips: [
          {
            id: "a1",
            startTicks: intro.startTicks,
            lengthTicks: BAR,
            symbol: "C",
          },
        ],
      },
    };
    const result = placeContentFromForma(p, "akordy", {
      sectionIds: [verse.id],
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/zaznaczonych sekcjach/);
  });

  it("ignores empty sectionIds entries (whole song)", () => {
    const p = sectionProject(4, ["a", "b"]);
    const result = placeContentFromForma(p, "tekst", { sectionIds: ["", ""] });
    expect(result.ok).toBe(true);
    expect(result.placed).toBe(2);
  });

  it("F via short trailing line weight", () => {
    const p = sectionProject(8, [
      "wordy line alpha",
      "wordy line beta",
      "wordy line gamma",
      "wordy line delta",
      "wordy line epsilon",
      "x",
    ]);
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.approximate).toBe(true);
  });

  it("single sung line uses layer E across section", () => {
    const p = sectionProject(4, ["solo"]);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.project.tekst.clips[0]!.startTicks).toBe(intro.startTicks);
  });

  it("chord D when more chords than bars", () => {
    let p = sectionProject(2, []);
    p = {
      ...p,
      akordy: {
        clips: ["C", "G", "Am", "F", "Dm"].map((symbol, i) => ({
          id: `a${i}`,
          startTicks: 0,
          lengthTicks: BAR,
          symbol,
        })),
      },
    };
    const result = placeContentFromForma(p, "akordy");
    expect(result.ok).toBe(true);
    expect(result.project.akordy.clips).toHaveLength(5);
  });

  it("chord A even split", () => {
    let p = sectionProject(4, []);
    p = {
      ...p,
      akordy: {
        clips: ["C", "G", "Am", "F"].map((symbol, i) => ({
          id: `a${i}`,
          startTicks: 0,
          lengthTicks: BAR,
          symbol,
        })),
      },
    };
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const result = placeContentFromForma(p, "akordy");
    expect(result.ok).toBe(true);
    const starts = result.project.akordy.clips
      .map((c) => c.startTicks)
      .sort((a, b) => a - b);
    expect(starts).toEqual([
      intro.startTicks,
      intro.startTicks + BAR,
      intro.startTicks + 2 * BAR,
      intro.startTicks + 3 * BAR,
    ]);
  });

  it("single chord uses layer E", () => {
    let p = sectionProject(4, []);
    p = {
      ...p,
      akordy: {
        clips: [{ id: "a1", startTicks: 10, lengthTicks: BAR, symbol: "C" }],
      },
    };
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const result = placeContentFromForma(p, "akordy");
    expect(result.ok).toBe(true);
    expect(result.project.akordy.clips[0]!.startTicks).toBe(intro.startTicks);
  });

  it("membership falls through to last section past end", () => {
    let p = withVerse(sectionProject(2, []));
    const verse = p.forma.clips.find((c) => c.name === "Verse")!;
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "t-past",
            startTicks: verse.startTicks + verse.lengthTicks + BAR,
            lengthTicks: BAR,
            text: "after",
          },
        ],
      },
    };
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.project.tekst.clips[0]!.startTicks).toBe(verse.startTicks);
  });

  it("near next-section boundary prefers the next section", () => {
    let p = withVerse(sectionProject(4, []));
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const verse = p.forma.clips.find((c) => c.name === "Verse")!;
    // Last bar of Intro → treated as belonging to Verse
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "t-boundary",
            startTicks: verse.startTicks - BAR / 2,
            lengthTicks: BAR,
            text: "edge",
          },
        ],
      },
    };
    const result = placeContentFromForma(p, "tekst", {
      sectionIds: [verse.id],
    });
    expect(result.ok).toBe(true);
    expect(result.project.tekst.clips[0]!.startTicks).toBe(verse.startTicks);
    void intro;
  });

  it("content/gap with consecutive gaps still places when ≥2 content spans", () => {
    // gap,gap,content,content — alternating=false but content.length≥2
    const p = sectionProject(12, ["a", "b", "c", "d"], {
      subsections: [1 * BAR, 2 * BAR, 6 * BAR],
    });
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.placed).toBe(4);
  });

  it("content/gap redistributes zero counts across uneven spans", () => {
    // Wide + narrow content: 2 lines → one span would floor to 0 without donor
    const p = sectionProject(12, ["a", "b"], {
      subsections: [9 * BAR, 10 * BAR],
    });
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.placed).toBe(2);
    const starts = result.project.tekst.clips
      .map((c) => c.startTicks)
      .sort((a, b) => a - b);
    expect(starts[0]).not.toBe(starts[1]);
  });

  it("content/gap single-line chunk uses layer E", () => {
    const p = sectionProject(10, ["a", "b"], {
      subsections: [4 * BAR, 5 * BAR, 9 * BAR],
    });
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.placed).toBe(2);
  });

  it("empty sections still walk placeSectionContent (no-op)", () => {
    const p = withVerse(sectionProject(4, ["intro-only"]));
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.placed).toBe(1);
  });

  it("akordy membership via sourceLineId → vocal sourceSection", () => {
    let p = withVerse(sectionProject(4, []));
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const verse = p.forma.clips.find((c) => c.name === "Verse")!;
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "line-v",
            startTicks: intro.startTicks,
            lengthTicks: BAR,
            text: "verse lyric",
            sourceSection: "Verse",
          },
        ],
      },
      akordy: {
        clips: [
          {
            id: "a1",
            startTicks: intro.startTicks,
            lengthTicks: BAR,
            symbol: "Am",
            sourceLineId: "line-v",
          },
          {
            id: "a2",
            startTicks: intro.startTicks + 10,
            lengthTicks: BAR,
            symbol: "F",
            sourceLineId: "line-v",
          },
        ],
      },
    };
    const result = placeContentFromForma(p, "akordy", {
      sectionIds: [verse.id],
    });
    expect(result.ok).toBe(true);
    expect(result.placed).toBe(2);
    expect(
      result.project.akordy.clips.every((c) => c.startTicks >= verse.startTicks),
    ).toBe(true);
  });

  it("akordy membership via sourceLineId without sourceSection uses line ticks", () => {
    let p = withVerse(sectionProject(4, []));
    const verse = p.forma.clips.find((c) => c.name === "Verse")!;
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "line-v",
            startTicks: verse.startTicks + BAR,
            lengthTicks: BAR,
            text: "verse lyric",
          },
        ],
      },
      akordy: {
        clips: [
          {
            id: "a1",
            startTicks: 0,
            lengthTicks: BAR,
            symbol: "C",
            sourceLineId: "line-v",
          },
        ],
      },
    };
    const result = placeContentFromForma(p, "akordy", {
      sectionIds: [verse.id],
    });
    expect(result.ok).toBe(true);
    expect(result.project.akordy.clips[0]!.startTicks).toBe(
      verse.startTicks + BAR,
    );
  });

  it("akordy places along vocal spans when sourceLineId tags match", () => {
    let p = sectionProject(8, []);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "l1",
            startTicks: intro.startTicks,
            lengthTicks: 4 * BAR,
            text: "first",
            sourceSection: "Intro",
          },
          {
            id: "l2",
            startTicks: intro.startTicks + 4 * BAR,
            lengthTicks: 4 * BAR,
            text: "second",
            sourceSection: "Intro",
          },
        ],
      },
      akordy: {
        clips: [
          {
            id: "a1",
            startTicks: 0,
            lengthTicks: BAR,
            symbol: "C",
            sourceLineId: "l1",
          },
          {
            id: "a2",
            startTicks: 0,
            lengthTicks: BAR,
            symbol: "G",
            sourceLineId: "l1",
          },
          {
            id: "a3",
            startTicks: 0,
            lengthTicks: BAR,
            symbol: "Am",
            sourceLineId: "l2",
          },
        ],
      },
    };
    const result = placeContentFromForma(p, "akordy");
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/po wersach/);
    const byId = Object.fromEntries(
      result.project.akordy.clips.map((c) => [c.id, c.startTicks]),
    );
    expect(byId.a1).toBe(intro.startTicks);
    expect(byId.a3).toBeGreaterThanOrEqual(intro.startTicks + 4 * BAR);
  });

  it("akordy packs by bar clusters when count matches vocal spans", () => {
    let p = sectionProject(8, []);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "l1",
            startTicks: intro.startTicks,
            lengthTicks: BAR,
            text: "one",
          },
          {
            id: "l2",
            startTicks: intro.startTicks + 4 * BAR,
            lengthTicks: BAR,
            text: "two",
          },
        ],
      },
      akordy: {
        clips: [
          {
            id: "a1",
            startTicks: intro.startTicks,
            lengthTicks: BAR,
            symbol: "C",
          },
          {
            id: "a2",
            startTicks: intro.startTicks + 4 * BAR,
            lengthTicks: BAR,
            symbol: "G",
          },
        ],
      },
    };
    const result = placeContentFromForma(p, "akordy");
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/po wersach/);
  });

  it("akordy content/gap approximate B under layer C", () => {
    // 5-bar + 4-bar content pockets; 2 chords in 5 bars → layer B
    let p = sectionProject(10, [], {
      subsections: [5 * BAR, 6 * BAR],
    });
    p = {
      ...p,
      akordy: {
        clips: ["C", "G", "Am"].map((symbol, i) => ({
          id: `a${i}`,
          startTicks: 0,
          lengthTicks: BAR,
          symbol,
        })),
      },
    };
    const result = placeContentFromForma(p, "akordy");
    expect(result.ok).toBe(true);
    expect(result.approximate).toBe(true);
  });

  it("both mode keeps Tekst when Akordy fails", () => {
    const p = sectionProject(4, ["a", "b"]);
    const result = placeContentFromForma(p, "both");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Tekst OK/);
    expect(result.project.tekst.clips[0]!.startTicks).toBeDefined();
    expect(result.project.akordy.clips).toHaveLength(0);
  });

  it("both mode places Tekst and Akordy together", () => {
    let p = sectionProject(4, ["a", "b"]);
    p = {
      ...p,
      akordy: {
        clips: [
          { id: "a1", startTicks: 0, lengthTicks: BAR, symbol: "C" },
          { id: "a2", startTicks: 0, lengthTicks: BAR, symbol: "G" },
        ],
      },
    };
    const result = placeContentFromForma(p, "both");
    expect(result.ok).toBe(true);
    expect(result.placed).toBe(4);
    expect(result.message).toMatch(/Tekst \+ Akordy/);
  });

  it("wandContentToForma returns placed project only", () => {
    const p = sectionProject(4, ["a", "b"]);
    const project = wandContentToForma(p, "tekst");
    expect(project.tekst.clips).toHaveLength(2);
    expect(project.forma).toEqual(p.forma);
  });

  it("clamps crowded onsets inside a short content span", () => {
    // Many lines forced into a 2-bar content pocket → onset clamp paths
    const p = sectionProject(8, ["1", "2", "3", "4", "5", "6", "7", "8"], {
      subsections: [2 * BAR, 3 * BAR, 5 * BAR],
    });
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.placed).toBe(8);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const starts = result.project.tekst.clips.map((c) => c.startTicks);
    expect(Math.max(...starts)).toBeLessThan(
      intro.startTicks + intro.lengthTicks,
    );
  });

  it("skips countdown digit akordy ids in membership", () => {
    let p = sectionProject(4, []);
    p = {
      ...p,
      akordy: {
        clips: [
          {
            id: "vl-cd-chord",
            startTicks: 0,
            lengthTicks: BAR,
            symbol: "2",
          },
          { id: "a1", startTicks: 0, lengthTicks: BAR, symbol: "C" },
        ],
      },
    };
    const result = placeContentFromForma(p, "akordy");
    expect(result.ok).toBe(true);
    expect(result.placed).toBe(1);
  });

  it("unknown sourceSection falls back to startTicks membership", () => {
    let p = sectionProject(4, []);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "t1",
            startTicks: intro.startTicks,
            lengthTicks: BAR,
            text: "hi",
            sourceSection: "DoesNotExist",
          },
        ],
      },
    };
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.project.tekst.clips[0]!.startTicks).toBe(intro.startTicks);
  });

  it("clamps onsets that snap past spanEnd − beat", () => {
    // 1-bar section / 8 lines → fractional D; last onsets exceed maxStart
    const p = sectionProject(1, ["1", "2", "3", "4", "5", "6", "7", "8"]);
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.placed).toBe(8);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const maxStart = intro.startTicks + intro.lengthTicks - BAR / 4;
    for (const c of result.project.tekst.clips) {
      expect(c.startTicks).toBeLessThanOrEqual(maxStart);
    }
  });

  it("fails when sung lines sit before the first Forma section", () => {
    let p = sectionProject(4, []);
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "t-early",
            startTicks: -2 * BAR,
            lengthTicks: BAR,
            text: "pre-roll lyric",
          },
        ],
      },
    };
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Brak linii do rozmieszczenia");
  });

  it("fails when chords sit before the first Forma section", () => {
    let p = sectionProject(4, []);
    p = {
      ...p,
      akordy: {
        clips: [
          {
            id: "a-early",
            startTicks: -2 * BAR,
            lengthTicks: BAR,
            symbol: "C",
          },
        ],
      },
    };
    const result = placeContentFromForma(p, "akordy");
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Brak clipów do rozmieszczenia");
  });
});
