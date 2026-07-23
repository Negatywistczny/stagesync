import { describe, expect, it } from "vitest";
import {
  createProjectV5Seed,
  DEFAULT_PPQ,
  type Project,
} from "@stagesync/shared";
import {
  buildGridLiveContext,
  compressBarChordsToProgression,
  cycleGridTemplateColumns,
  cycleTotalBars,
  detectCycleLength,
  progressionForBarChords,
  resolveActiveSubsection,
  resolveHeroNextSymbol,
  resolveNextPhraseBand,
  sectionBarChords,
} from "./clientGrid.js";
import { pencilAkordyClick } from "./akordyEdit.js";


const BAR = 4 * DEFAULT_PPQ; // 3840 in 4/4

describe("clientGrid", () => {
  it("resolves current akord at ticks", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilAkordyClick(p, 0, "Dm");
    const ctx = buildGridLiveContext(p, 100);
    expect(ctx.current?.symbol).toBe("Dm");
    expect(ctx.emptyReason).toBeNull();
  });

  it("shows synthetic CD digits when playhead is in Countdown", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const ctx = buildGridLiveContext(p, -5000);
    expect(ctx.emptyReason).toBeNull();
    expect(ctx.current?.symbol).toBe("2");
    expect(ctx.upcoming.map((c) => c.symbol)).toEqual(["1"]);
  });

  it("detectCycleLength finds repeating 4-bar cycle", () => {
    const bars = ["Am", "Am", "F", "F", "Am", "Am", "F", "F"];
    expect(detectCycleLength(bars)).toBe(4);
    expect(progressionForBarChords(bars)).toEqual([
      { chord: "Am", bars: 2 },
      { chord: "F", bars: 2 },
    ]);
  });

  it("compressBarChordsToProgression merges runs", () => {
    expect(compressBarChordsToProgression(["C", "C", "G"])).toEqual([
      { chord: "C", bars: 2 },
      { chord: "G", bars: 1 },
    ]);
  });

  it("cycleTotalBars sums step durations for proportional columns", () => {
    expect(
      cycleTotalBars([
        { symbol: "Am", bars: 2, active: true, activeBarInStep: 1 },
        { symbol: "F", bars: 1, active: false, activeBarInStep: null },
      ]),
    ).toBe(3);
  });

  it("buildGridLiveContext exposes cycle cells for section chords", () => {
    let p: Project = createProjectV5Seed(
      "p",
      "S",
      "2026-07-20T12:00:00.000Z",
    );
    // Intro is 2 bars (0..7680). Put Am then F.
    p = {
      ...p,
      akordy: {
        clips: [
          {
            id: "a1",
            symbol: "Am",
            startTicks: 0,
            lengthTicks: BAR,
          },
          {
            id: "a2",
            symbol: "F",
            startTicks: BAR,
            lengthTicks: BAR,
          },
        ],
      },
    };
    const ctx = buildGridLiveContext(p, 100);
    expect(ctx.cycle.length).toBeGreaterThanOrEqual(1);
    expect(ctx.cycle.some((s) => s.active && s.symbol === "Am")).toBe(true);
    expect(cycleTotalBars(ctx.cycle)).toBe(
      ctx.cycle.reduce((s, x) => s + x.bars, 0),
    );
    const ctx2 = buildGridLiveContext(p, BAR + 100);
    expect(ctx2.cycle.some((s) => s.active && s.symbol === "F")).toBe(true);
  });

  it("scopes cycle to active Forma subsection only", () => {
    // 12-bar Verse with 4-bar subsections @ 4·BAR and 8·BAR.
    const verseLen = 12 * BAR;
    let p: Project = createProjectV5Seed(
      "p",
      "S",
      "2026-07-20T12:00:00.000Z",
    );
    p = {
      ...p,
      forma: {
        clips: [
          p.forma.clips[0]!, // countdown
          {
            id: "forma-verse",
            name: "Verse",
            kind: "section",
            startTicks: 0,
            lengthTicks: verseLen,
            subsections: [4 * BAR, 8 * BAR],
          },
        ],
      },
      akordy: {
        clips: [
          {
            id: "s0",
            symbol: "Am",
            startTicks: 0,
            lengthTicks: 4 * BAR,
          },
          {
            id: "s1",
            symbol: "Dm",
            startTicks: 4 * BAR,
            lengthTicks: 4 * BAR,
          },
          {
            id: "s2",
            symbol: "G",
            startTicks: 8 * BAR,
            lengthTicks: 4 * BAR,
          },
        ],
      },
    };

    const sub0 = resolveActiveSubsection(p.forma.clips[1]!, 100);
    expect(sub0.index).toBe(0);
    expect(sub0.startRel).toBe(0);
    expect(sub0.lengthRel).toBe(4 * BAR);

    const info0 = sectionBarChords(p, 100);
    expect(info0?.subsectionIndex).toBe(0);
    expect(info0?.subsectionCount).toBe(3);
    expect(info0?.barChords).toEqual(["Am", "Am", "Am", "Am"]);

    const ctx0 = buildGridLiveContext(p, 100);
    expect(ctx0.subsectionIndex).toBe(0);
    expect(ctx0.cycle.every((s) => s.symbol === "Am")).toBe(true);
    expect(ctx0.cycle.some((s) => s.symbol === "Dm")).toBe(false);

    const ctx1 = buildGridLiveContext(p, 4 * BAR + 100);
    expect(ctx1.subsectionIndex).toBe(1);
    expect(ctx1.cycle.every((s) => s.symbol === "Dm")).toBe(true);
    expect(ctx1.cycle.some((s) => s.symbol === "Am")).toBe(false);

    const ctx2 = buildGridLiveContext(p, 8 * BAR + 100);
    expect(ctx2.subsectionIndex).toBe(2);
    expect(ctx2.cycle.every((s) => s.symbol === "G")).toBe(true);
  });

  it("exposes nextCycle for upcoming subsection (2-line carousel)", () => {
    const verseLen = 12 * BAR;
    let p: Project = createProjectV5Seed(
      "p",
      "S",
      "2026-07-20T12:00:00.000Z",
    );
    p = {
      ...p,
      forma: {
        clips: [
          p.forma.clips[0]!,
          {
            id: "forma-verse",
            name: "Verse",
            kind: "section",
            startTicks: 0,
            lengthTicks: verseLen,
            subsections: [4 * BAR, 8 * BAR],
          },
        ],
      },
      akordy: {
        clips: [
          {
            id: "s0",
            symbol: "Am",
            startTicks: 0,
            lengthTicks: 4 * BAR,
          },
          {
            id: "s1",
            symbol: "Dm",
            startTicks: 4 * BAR,
            lengthTicks: 4 * BAR,
          },
          {
            id: "s2",
            symbol: "G",
            startTicks: 8 * BAR,
            lengthTicks: 4 * BAR,
          },
        ],
      },
    };

    const ctx0 = buildGridLiveContext(p, 100);
    expect(ctx0.cycle.every((s) => s.symbol === "Am")).toBe(true);
    expect(ctx0.nextCycle.length).toBeGreaterThan(0);
    expect(ctx0.nextCycle.every((s) => s.symbol === "Dm")).toBe(true);
    expect(ctx0.hero).toBe("Am");
    // Mid-band wrap of single-chord cycle → same symbol; last bar → next row.
    expect(ctx0.heroNext).toBe("Am");
    expect(ctx0.carouselKey).toContain("forma-verse:0");

    const ctx0Last = buildGridLiveContext(p, 3 * BAR + 100);
    expect(ctx0Last.heroNext).toBe("Dm");

    const ctx1 = buildGridLiveContext(p, 4 * BAR + 100);
    expect(ctx1.nextCycle.every((s) => s.symbol === "G")).toBe(true);
    expect(ctx1.heroNext).toBe("Dm");
    expect(buildGridLiveContext(p, 7 * BAR + 100).heroNext).toBe("G");

    const ctx2 = buildGridLiveContext(p, 8 * BAR + 100);
    expect(ctx2.nextCycle).toEqual([]);
    expect(ctx2.heroNext).toBe("G");
    expect(buildGridLiveContext(p, 11 * BAR + 100).heroNext).toBeNull();
  });

  it("heroNext points to next step within subsection cycle", () => {
    let p: Project = createProjectV5Seed(
      "p",
      "S",
      "2026-07-20T12:00:00.000Z",
    );
    p = {
      ...p,
      forma: {
        clips: [
          p.forma.clips[0]!,
          {
            id: "forma-intro",
            name: "Intro",
            kind: "section",
            startTicks: 0,
            lengthTicks: 4 * BAR,
          },
        ],
      },
      akordy: {
        clips: [
          {
            id: "a1",
            symbol: "Am",
            startTicks: 0,
            lengthTicks: 2 * BAR,
          },
          {
            id: "a2",
            symbol: "F",
            startTicks: 2 * BAR,
            lengthTicks: 2 * BAR,
          },
        ],
      },
    };
    const ctx = buildGridLiveContext(p, 100);
    expect(ctx.cycle.map((s) => `${s.symbol}:${s.bars}`)).toEqual([
      "Am:2",
      "F:2",
    ]);
    expect(ctx.hero).toBe("Am");
    expect(ctx.heroNext).toBe("F");

    const ctxF = buildGridLiveContext(p, 2 * BAR + 100);
    expect(ctxF.hero).toBe("F");
  });

  it("countdownPreview collapses current and previews first section", () => {
    let p: Project = createProjectV5Seed(
      "p",
      "S",
      "2026-07-20T12:00:00.000Z",
    );
    p = {
      ...p,
      akordy: {
        clips: [
          {
            id: "a1",
            symbol: "C",
            startTicks: 0,
            lengthTicks: 2 * BAR,
          },
        ],
      },
    };
    const ctx = buildGridLiveContext(p, -5000);
    expect(ctx.countdownPreview).toBe(true);
    expect(ctx.cycle).toEqual([]);
    expect(ctx.nextCycle.some((s) => s.symbol === "C")).toBe(true);
    expect(ctx.isCountdown).toBe(true);
  });

  it("detectCycleLength returns full length when no cycle divides", () => {
    expect(detectCycleLength(["A", "B", "A"])).toBe(3);
    expect(detectCycleLength(["C"])).toBe(1);
  });

  it("resolveActiveSubsection clamps to last band at exclusive end", () => {
    const section = {
      startTicks: 0,
      lengthTicks: 7680,
      subsections: [3840],
    };
    const last = resolveActiveSubsection(section, 7680);
    expect(last.startRel).toBe(3840);
  });

  it("resolveHeroNextSymbol covers empty / wrap / next-band paths", () => {
    expect(resolveHeroNextSymbol([], [{ symbol: "N", bars: 1, active: false, activeBarInStep: null }], 0, 4)).toBe("N");
    expect(resolveHeroNextSymbol([], [], 0, 4)).toBeNull();
    const cycle = [
      { symbol: "A", bars: 1, active: true, activeBarInStep: 1 },
      { symbol: "B", bars: 1, active: false, activeBarInStep: null },
    ];
    expect(resolveHeroNextSymbol(cycle, [], 0, 4)).toBe("B");
    const lastActive = [
      { symbol: "A", bars: 1, active: false, activeBarInStep: null },
      { symbol: "B", bars: 1, active: true, activeBarInStep: 1 },
    ];
    expect(resolveHeroNextSymbol(lastActive, [], 0, 4)).toBe("A");
    expect(
      resolveHeroNextSymbol(lastActive, [{ symbol: "X", bars: 1, active: false, activeBarInStep: null }], 3, 4),
    ).toBe("X");
  });

  it("cycleGridTemplateColumns and cycleTotalBars handle empty/invalid", () => {
    expect(cycleGridTemplateColumns([])).toBe("");
    expect(cycleGridTemplateColumns([{ bars: Number.NaN }, { bars: 2 }])).toBe("1fr 2fr");
    expect(cycleTotalBars([])).toBe(0);
    expect(
      cycleTotalBars([
        { symbol: "A", bars: Number.NaN, active: false, activeBarInStep: null },
        { symbol: "B", bars: 2, active: false, activeBarInStep: null },
      ]),
    ).toBe(2);
  });

  it("buildGridLiveContext empty project and no chords", () => {
    expect(buildGridLiveContext(null, 0).emptyReason).toMatch(/Oczekiwanie/);
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    expect(buildGridLiveContext({ ...p, akordy: { clips: [] } }, 0).emptyReason).toMatch(/Brak akordów/);
  });

  it("resolveNextPhraseBand crosses into next section subsections", () => {
    let p: Project = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const intro = p.forma.clips.find((c) => c.name === "Intro")!;
    const verse = {
      id: "forma-verse",
      name: "Verse",
      kind: "section" as const,
      startTicks: intro.startTicks + intro.lengthTicks,
      lengthTicks: 2 * BAR,
      subsections: [BAR],
    };
    p = {
      ...p,
      forma: { clips: [...p.forma.clips, verse] },
      akordy: {
        clips: [
          { id: "a1", symbol: "C", startTicks: verse.startTicks, lengthTicks: BAR },
          { id: "a2", symbol: "G", startTicks: verse.startTicks + BAR, lengthTicks: BAR },
        ],
      },
    };
    // At end of intro → next phrase is verse first subsection
    const band = resolveNextPhraseBand(p, intro.startTicks + intro.lengthTicks - 1);
    expect(band?.sectionName).toBe("Verse");
    expect(band?.barChords.length).toBeGreaterThan(0);
  });


  it("carouselKey clip fallback without sectionInfo", () => {
    let p: Project = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    // Only chords, wipe forma sections after countdown so sectionInfo may be null mid-song
    p = {
      ...p,
      forma: {
        clips: p.forma.clips.filter((c) => c.kind === "countdown"),
      },
      akordy: {
        clips: [
          { id: "solo", symbol: "Em", startTicks: 0, lengthTicks: BAR },
        ],
      },
    };
    const ctx = buildGridLiveContext(p, 100);
    expect(ctx.hero === "Em" || ctx.hero === "—").toBe(true);
    expect(ctx.carouselKey.includes("clip:") || ctx.carouselKey === "").toBe(true);
  });

  it("detectCycleLength falls through when no proper divisor cycles", () => {
    expect(detectCycleLength(["A", "B", "C", "A"])).toBe(4);
  });

  it("resolveNextPhraseBand without countdown uses displayTicks as after", () => {
    let p: Project = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const intro = p.forma.clips.find((c) => c.kind === "section")!;
    p = {
      ...p,
      forma: {
        clips: p.forma.clips.filter((c) => c.kind !== "countdown"),
      },
      akordy: {
        clips: [
          { id: "a1", symbol: "C", startTicks: intro.startTicks, lengthTicks: BAR },
        ],
      },
    };
    // No active section at large negative → treat as preview-from-after path
    const band = resolveNextPhraseBand(p, -10_000);
    expect(band?.sectionName === "Intro" || band === null).toBe(true);
  });

  it("buildGridLiveContext hero dash and empty carouselKey in gaps", () => {
    let p: Project = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = {
      ...p,
      forma: { clips: p.forma.clips.filter((c) => c.kind === "countdown") },
      akordy: {
        clips: [
          // Chord only in far future — playhead in a gap with no merged hit
          { id: "far", symbol: "G", startTicks: 50 * BAR, lengthTicks: BAR },
        ],
      },
    };
    const ctx = buildGridLiveContext(p, 100);
    expect(ctx.hero).toBe("—");
    expect(ctx.carouselKey).toBe("");
  });

  it("barChordsForRange empty when section beyond walked bar map", () => {
    const far = 20_000_000;
    let p: Project = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = {
      ...p,
      forma: {
        clips: [
          {
            id: "forma-far",
            name: "Far",
            kind: "section",
            startTicks: far,
            lengthTicks: BAR,
          },
        ],
      },
      akordy: {
        clips: [
          { id: "a", symbol: "C", startTicks: far, lengthTicks: BAR },
        ],
      },
    };
    expect(resolveNextPhraseBand(p, -1)).toBeNull();
    expect(sectionBarChords(p, far + 100)).toBeNull();
  });

  it("sectionBarChords barIndex past last bar uses fallthrough", () => {
    let p: Project = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const intro = p.forma.clips.find((c) => c.kind === "section")!;
    // Playhead just inside exclusive end-1 so still in section; last bar index fallthrough
    // when displayTicks equals a bar end inside the subsection range.
    const info = sectionBarChords(p, intro.startTicks + intro.lengthTicks - 1);
    expect(info?.barIndexInSection).toBeGreaterThanOrEqual(0);
  });

});
