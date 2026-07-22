import { describe, expect, it } from "vitest";
import { DEFAULT_PPQ, ticksPerBar } from "./time.js";
import { createProjectV5Seed } from "./project-seed.js";
import { placeContentFromForma } from "./wand.js";
import type { Project } from "./schema.js";

const BAR = ticksPerBar({ numerator: 4, denominator: 4 }, DEFAULT_PPQ); // 3840

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
  it("places Tekst evenly across a Forma section without mutating Forma", () => {
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
          { id: "t1", startTicks: 0, lengthTicks: BAR, text: "Line one" },
          { id: "t2", startTicks: 0, lengthTicks: BAR, text: "Line two" },
        ],
      },
    };
    const formaBefore = structuredClone(p.forma);
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const result = placeContentFromForma(p, "tekst");
    expect(result.ok).toBe(true);
    expect(result.placed).toBe(2);
    expect(result.project.forma).toEqual(formaBefore);

    const starts = result.project.tekst.clips
      .map((c) => c.startTicks)
      .sort((a, b) => a - b);
    expect(starts).toEqual([intro.startTicks, intro.startTicks + 2 * BAR]);
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

  it("both mode runs Tekst then Akordy and keeps Forma identical", () => {
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
    const result = placeContentFromForma(p, "both");
    expect(result.ok).toBe(true);
    expect(result.project.forma).toEqual(formaBefore);
    expect(result.placed).toBeGreaterThanOrEqual(4);
  });
});
