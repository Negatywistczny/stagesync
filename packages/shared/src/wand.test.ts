import { describe, expect, it } from "vitest";
import { createProjectV5Seed, wandContentToForma } from "@stagesync/shared";

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
});
