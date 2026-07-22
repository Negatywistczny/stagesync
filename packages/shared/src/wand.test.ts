import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "./project-seed.js";
import { wandContentToForma } from "./wand.js";

describe("wandContentToForma", () => {
  it("builds Forma sections from Tekst clips", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "t1",
            startTicks: 0,
            lengthTicks: 3840,
            text: "Hello",
          },
        ],
      },
    };
    const next = wandContentToForma(p, "tekst");
    const sections = next.forma.clips.filter((c) => c.kind === "section");
    expect(sections.length).toBeGreaterThanOrEqual(1);
    expect(sections.some((c) => c.name.includes("Hello"))).toBe(true);
    expect(next.forma.clips.some((c) => c.kind === "countdown")).toBe(true);
  });

  it("shrinks length when clamping a span that starts before content floor", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    // Seed Countdown ends at 0 → floor 0. Span straddles floor.
    p = {
      ...p,
      tekst: {
        clips: [
          {
            id: "t-straddle",
            startTicks: -1920,
            lengthTicks: 3840,
            text: "Straddle",
          },
        ],
      },
    };
    const next = wandContentToForma(p, "tekst");
    const section = next.forma.clips.find(
      (c) => c.kind === "section" && c.name.includes("Straddle"),
    );
    expect(section).toBeDefined();
    expect(section!.startTicks).toBe(0);
    expect(section!.lengthTicks).toBe(1920);
  });
});
