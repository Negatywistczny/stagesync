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

  it("scopes to selected Forma ranges and keeps outside sections", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = {
      ...p,
      forma: {
        clips: [
          ...p.forma.clips.filter((c) => c.kind === "countdown"),
          {
            id: "keep",
            name: "Keep",
            kind: "section" as const,
            startTicks: 0,
            lengthTicks: 1920,
          },
          {
            id: "replace",
            name: "Replace",
            kind: "section" as const,
            startTicks: 3840,
            lengthTicks: 3840,
          },
        ],
      },
      tekst: {
        clips: [
          {
            id: "t1",
            startTicks: 3840,
            lengthTicks: 1920,
            text: "Scoped",
          },
          {
            id: "t2",
            startTicks: 0,
            lengthTicks: 1920,
            text: "Outside",
          },
        ],
      },
    };
    const next = wandContentToForma(p, "tekst", {
      ranges: [{ startTicks: 3840, endTicks: 7680 }],
    });
    const sections = next.forma.clips.filter((c) => c.kind === "section");
    expect(sections.some((c) => c.id === "keep" || c.name === "Keep")).toBe(
      true,
    );
    expect(sections.some((c) => c.name.includes("Scoped"))).toBe(true);
    expect(sections.some((c) => c.name.includes("Outside"))).toBe(false);
  });
});
