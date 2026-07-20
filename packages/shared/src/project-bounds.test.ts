import { describe, expect, it } from "vitest";
import {
  emptyProjectEndTicks,
  projectEndTicks,
} from "./project-bounds.js";
import { createProjectV5Seed } from "./project-seed.js";
import { DEFAULT_PPQ } from "./time.js";

describe("projectEndTicks", () => {
  it("returns max forma clip end for seeded project", () => {
    const p = createProjectV5Seed("a", "Song", "2026-07-20T00:00:00.000Z");
    // Intro: 0 + 7680
    expect(projectEndTicks(p)).toBe(7680);
  });

  it("falls back to 2 bars when no positive forma end", () => {
    const p = createProjectV5Seed("a", "Empty", "2026-07-20T00:00:00.000Z");
    p.forma.clips = [];
    expect(projectEndTicks(p)).toBe(
      emptyProjectEndTicks({
        ppq: DEFAULT_PPQ,
        defaultMeter: { numerator: 4, denominator: 4 },
      }),
    );
    expect(projectEndTicks(p)).toBe(2 * 4 * DEFAULT_PPQ);
  });
});
