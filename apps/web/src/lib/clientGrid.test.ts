import { describe, expect, it } from "vitest";
import {
  createProjectV5Seed,
  DEFAULT_PPQ,
  type Project,
} from "@stagesync/shared";
import {
  buildGridLiveContext,
  compressBarChordsToProgression,
  cycleTotalBars,
  detectCycleLength,
  progressionForBarChords,
  resolveActiveSubsection,
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
});
