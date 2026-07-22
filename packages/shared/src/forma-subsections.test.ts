import { describe, expect, it } from "vitest";
import { DEFAULT_PPQ, ticksPerBar } from "./time.js";
import { createProjectV5Seed } from "./project-seed.js";
import {
  defaultSubsections4Bar,
  ensureFormaSubsections,
  normalizeSubsectionOffsets,
  subsectionMaxChunkTicks,
} from "./forma-subsections.js";
import type { Project } from "./schema.js";

const BAR = ticksPerBar({ numerator: 4, denominator: 4 }, DEFAULT_PPQ); // 3840
const CHUNK4 = 4 * BAR;

describe("forma-subsections", () => {
  it("normalizeSubsectionOffsets drops 0 / length / duplicates", () => {
    expect(
      normalizeSubsectionOffsets([0, BAR, BAR, CHUNK4, 2 * CHUNK4], 2 * CHUNK4),
    ).toEqual([BAR, CHUNK4]);
  });

  it("defaultSubsections4Bar matches v4 4-bar fill (relative offsets)", () => {
    expect(defaultSubsections4Bar(CHUNK4, CHUNK4)).toEqual([]);
    expect(defaultSubsections4Bar(2 * CHUNK4, CHUNK4)).toEqual([CHUNK4]);
    expect(defaultSubsections4Bar(8 * BAR, CHUNK4)).toEqual([CHUNK4]);
    expect(defaultSubsections4Bar(12 * BAR, CHUNK4)).toEqual([
      CHUNK4,
      2 * CHUNK4,
    ]);
    // Last span shorter than 4 bars still gets prior boundaries
    expect(defaultSubsections4Bar(10 * BAR, CHUNK4)).toEqual([
      CHUNK4,
      2 * CHUNK4,
    ]);
  });

  it("defaultSubsections4Bar caps at 64 boundaries for huge lengthTicks", () => {
    const huge = 10_000 * CHUNK4;
    const out = defaultSubsections4Bar(huge, CHUNK4);
    expect(out).toHaveLength(64);
    expect(out[0]).toBe(CHUNK4);
    expect(out[63]).toBe(64 * CHUNK4);
  });

  it("ensureFormaSubsections fills empty sections; skips Countdown + existing", () => {
    const seed = createProjectV5Seed(
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      "Test",
      "2026-07-21T00:00:00.000Z",
    );
    const project: Project = {
      ...seed,
      forma: {
        clips: [
          seed.forma.clips[0]!, // countdown
          {
            id: "forma-verse",
            name: "Verse",
            kind: "section",
            startTicks: 0,
            lengthTicks: 12 * BAR,
          },
          {
            id: "forma-bridge",
            name: "Bridge",
            kind: "section",
            startTicks: 12 * BAR,
            lengthTicks: 8 * BAR,
            subsections: [2 * BAR], // custom scissors — must keep
          },
        ],
      },
    };

    const next = ensureFormaSubsections(project);
    const cd = next.forma.clips.find((c) => c.kind === "countdown");
    const verse = next.forma.clips.find((c) => c.id === "forma-verse");
    const bridge = next.forma.clips.find((c) => c.id === "forma-bridge");

    expect(cd?.subsections).toBeUndefined();
    expect(verse?.subsections).toEqual([CHUNK4, 2 * CHUNK4]);
    expect(bridge?.subsections).toEqual([2 * BAR]);
    expect(subsectionMaxChunkTicks(next, 0)).toBe(CHUNK4);
  });

  it("ensureFormaSubsections is a no-op when nothing to fill", () => {
    const seed = createProjectV5Seed(
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      "Short",
      "2026-07-21T00:00:00.000Z",
    );
    // Seed Intro is 2 bars — no interior 4-bar splits
    expect(ensureFormaSubsections(seed)).toBe(seed);
  });
});
