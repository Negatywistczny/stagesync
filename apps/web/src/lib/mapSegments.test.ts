import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import { computeFormaViewSpan } from "./formaCanvas.js";
import {
  keyMapSegments,
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

  it("tempoMapSegments returns synthetic default when tempoMap empty", () => {
    const project = {
      ...createProjectV5Seed("id", "Demo", "2026-07-20T00:00:00.000Z"),
      tempoMap: [],
    };
    expect(tempoMapSegments(project, { start: 0, end: 100 })).toEqual([
      {
        startTicks: 0,
        endTicks: 100,
        label: "120 BPM",
        eventId: "tempo-default",
        eventStartTicks: 0,
      },
    ]);
    expect(tempoMapSegments(project, { start: 10, end: 10 })).toEqual([]);
  });

  it("tempoMapSegments skips events wholly outside span", () => {
    const project = {
      ...createProjectV5Seed("id", "Demo", "2026-07-20T00:00:00.000Z"),
      tempoMap: [
        { id: "early", startTicks: -1000, bpm: 90 },
        { id: "late", startTicks: 10_000, bpm: 140 },
        { id: "in", startTicks: 100, bpm: 110 },
      ],
    };
    const segments = tempoMapSegments(project, { start: 0, end: 200 });
    expect(segments.map((s) => s.eventId)).toContain("in");
    expect(segments.map((s) => s.eventId)).not.toContain("late");
  });

  it("segmentStylePx uses true proportional width (no paint floor)", () => {
    const seg = {
      startTicks: 0,
      endTicks: 240,
      label: "120",
      eventId: "t0",
      eventStartTicks: 0,
    };
    expect(
      segmentStylePx(seg, { start: 0, end: 3840 * 8 }, 3840, 12).width,
    ).toBe("0.75px");
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

  it("meterMapSegments default fill and leading gap", () => {
    const base = createProjectV5Seed("id", "Demo", "2026-07-20T00:00:00.000Z");
    const empty = { ...base, meterMap: [] };
    expect(meterMapSegments(empty, { start: 0, end: 50 })).toEqual([
      {
        startTicks: 0,
        endTicks: 50,
        label: "4/4",
        eventId: "meter-default",
        eventStartTicks: 0,
      },
    ]);
    expect(meterMapSegments(empty, { start: 5, end: 5 })).toEqual([]);

    const gapped = {
      ...base,
      meterMap: [{ id: "m1", startTicks: 1000, numerator: 3, denominator: 4 }],
    };
    const segs = meterMapSegments(gapped, { start: 0, end: 2000 });
    expect(segs[0]).toMatchObject({
      eventId: "meter-default",
      endTicks: 1000,
      label: "4/4",
    });
    expect(segs[1]?.eventId).toBe("m1");
  });

  it("tempoMapSegments fills leading gap before first map event", () => {
    const project = createProjectV5Seed(
      "id",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    project.defaultBpm = 100;
    project.tempoMap = [{ id: "t1", startTicks: 3840, bpm: 140 }];
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

  it("keyMapSegments uses formatKey and empty when no keys", () => {
    const project = createProjectV5Seed(
      "id",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    expect(
      keyMapSegments(
        { ...project, keyMap: undefined },
        { start: 0, end: 100 },
        () => "C",
      ),
    ).toEqual([]);
    expect(
      keyMapSegments(
        { ...project, keyMap: [] },
        { start: 0, end: 100 },
        () => "C",
      ),
    ).toEqual([]);

    const withKeys = {
      ...project,
      keyMap: [
        {
          id: "k0",
          startTicks: 0,
          key: { tonic: "C", mode: "major" as const },
        },
        {
          id: "k1",
          startTicks: 3840,
          key: { tonic: "G", mode: "major" as const },
        },
      ],
    };
    const segs = keyMapSegments(
      withKeys,
      { start: 0, end: 7680 },
      (k) => k.tonic,
    );
    expect(segs).toHaveLength(2);
    expect(segs[0]?.label).toBe("C");
    expect(segs[1]?.label).toBe("G");
  });
});
