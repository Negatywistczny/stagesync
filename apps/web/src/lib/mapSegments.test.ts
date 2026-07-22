import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import { computeFormaViewSpan } from "./formaCanvas.js";
import {
  meterMapSegments,
  segmentStylePx,
  tempoMapSegments,
} from "./mapSegments.js";

describe("mapSegments", () => {
  it("tempoMapSegments covers span with default when map empty at start", () => {
    const project = createProjectV5Seed(
      "id",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    const span = computeFormaViewSpan(project.forma.clips);
    const segments = tempoMapSegments(project, span);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0]?.label).toContain("120");
  });

  it("segmentStylePx uses true proportional width (no paint floor)", () => {
    const seg = {
      startTicks: 0,
      endTicks: 240,
      label: "120",
      eventId: "t0",
      eventStartTicks: 0,
    };
    // 240/3840 * 12 = 0.75px
    expect(segmentStylePx(seg, { start: 0, end: 3840 * 8 }, 3840, 12).width).toBe(
      "0.75px",
    );
  });

  it("meterMapSegments splits at meter change", () => {
    const project = createProjectV5Seed(
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

  it("tempoMapSegments fills leading gap before first map event", () => {
    const project = createProjectV5Seed(
      "id",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    project.defaultBpm = 100;
    project.tempoMap = [
      { id: "t1", startTicks: 3840, bpm: 140 },
    ];
    const span = { start: 0, end: 7680 };
    const segments = tempoMapSegments(project, span);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      startTicks: 0,
      endTicks: 3840,
      label: "100 BPM",
      eventId: "tempo-default",
    });
    expect(segments[1]).toMatchObject({
      startTicks: 3840,
      endTicks: 7680,
      label: "140 BPM",
      eventId: "t1",
    });
  });
});
