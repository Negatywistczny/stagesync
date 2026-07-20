import { describe, expect, it } from "vitest";
import { createProjectV5Seed, type Project } from "@stagesync/shared";
import {
  buildGridLiveContext,
  compressBarChordsToProgression,
  detectCycleLength,
  progressionForBarChords,
} from "./clientGrid.js";
import { pencilAkordyClick } from "./akordyEdit.js";

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
            lengthTicks: 3840,
          },
          {
            id: "a2",
            symbol: "F",
            startTicks: 3840,
            lengthTicks: 3840,
          },
        ],
      },
    };
    const ctx = buildGridLiveContext(p, 100);
    expect(ctx.cycle.length).toBeGreaterThanOrEqual(1);
    expect(ctx.cycle.some((s) => s.active && s.symbol === "Am")).toBe(true);
    const ctx2 = buildGridLiveContext(p, 4000);
    expect(ctx2.cycle.some((s) => s.active && s.symbol === "F")).toBe(true);
  });
});
