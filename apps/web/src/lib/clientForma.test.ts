import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import { buildFormaLiveContext } from "./clientForma.js";
import { buildBarCellsForClip } from "./clientBarCells.js";

describe("clientForma / bar cells", () => {
  const project = createProjectV5Seed(
    "id",
    "Demo",
    "2026-07-20T00:00:00.000Z",
  );

  it("buildBarCellsForClip marks past/current within Intro", () => {
    // Intro: 0..7680 (2 bars @ 4/4 PPQ 960)
    const midFirst = 480;
    const cells = buildBarCellsForClip(project, 0, 7680, midFirst);
    expect(cells).toHaveLength(2);
    expect(cells[0]!.current).toBe(true);
    expect(cells[0]!.past).toBe(false);
    expect(cells[0]!.beatProgress).toBeGreaterThan(0);
    expect(cells[1]!.past).toBe(false);
    expect(cells[1]!.current).toBe(false);

    const midSecond = 3840 + 100;
    const cells2 = buildBarCellsForClip(project, 0, 7680, midSecond);
    expect(cells2[0]!.past).toBe(true);
    expect(cells2[1]!.current).toBe(true);
  });

  it("buildFormaLiveContext exposes strip segments and bar-in-section", () => {
    const ctx = buildFormaLiveContext(project, 100);
    expect(ctx).not.toBeNull();
    expect(ctx!.sectionName).toBe("Intro");
    expect(ctx!.barInSection).toBe(1);
    expect(ctx!.beatsPerBar).toBe(4);
    expect(ctx!.segments.some((s) => s.kind === "countdown")).toBe(true);
    expect(ctx!.segments.some((s) => s.active && s.name === "Intro")).toBe(
      true,
    );
  });
});
