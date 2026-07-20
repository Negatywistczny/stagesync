import { describe, expect, it } from "vitest";
import { createProjectV3Seed } from "@stagesync/shared";
import { computeFormaViewSpan } from "./formaCanvas.js";
import { meterMapSegments, tempoMapSegments } from "./mapSegments.js";

describe("mapSegments", () => {
  it("tempoMapSegments covers span with default when map empty at start", () => {
    const project = createProjectV3Seed(
      "id",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    const span = computeFormaViewSpan(project.forma.clips);
    const segments = tempoMapSegments(project, span);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0]?.label).toContain("120");
  });

  it("meterMapSegments splits at meter change", () => {
    const project = createProjectV3Seed(
      "id",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    project.meterMap = [
      { id: "m0", startTicks: 0, numerator: 4, denominator: 4 },
      { id: "m1", startTicks: 7680, numerator: 3, denominator: 4 },
    ];
    const span = { start: 0, end: 7680 * 2 };
    const segments = meterMapSegments(project, span);
    expect(segments).toHaveLength(2);
    expect(segments[0]?.label).toBe("4/4");
    expect(segments[1]?.label).toBe("3/4");
    expect(segments[0]?.endTicks).toBe(7680);
    expect(segments[1]?.startTicks).toBe(7680);
  });
});
