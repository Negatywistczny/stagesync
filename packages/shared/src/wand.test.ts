import { describe, expect, it } from "vitest";
import { DEFAULT_PPQ, ticksPerBar } from "./time.js";
import { createProjectV5Seed } from "./project-seed.js";
import { placeContentFromForma } from "./wand.js";
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
});
