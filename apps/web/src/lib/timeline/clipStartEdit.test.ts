import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  clampBeatForProject,
  clipStartBarBeat,
  formatStartBarBeat,
  moveClipStartKeepLength,
  parseStartBarBeat,
  ticksFromDisplayBarBeat,
} from "./clipStartEdit.js";

describe("clipStartEdit", () => {
  const project = createProjectV5Seed(
    "p",
    "S",
    "2026-07-23T00:00:00.000Z",
  );

  it("converts ticks ↔ display bar.beat", () => {
    expect(clipStartBarBeat(project, 0)).toEqual({ bar: 1, beat: 1 });
    expect(formatStartBarBeat(project, 960)).toBe("1.2");
    expect(ticksFromDisplayBarBeat(project, 1, 2)).toBe(960);
    expect(ticksFromDisplayBarBeat(project, 2, 1)).toBe(3840);
  });

  it("moveClipStartKeepLength preserves lengthTicks", () => {
    const clips = [
      { id: "a", startTicks: 0, lengthTicks: 1920 },
      { id: "b", startTicks: 3840, lengthTicks: 960 },
    ];
    const next = moveClipStartKeepLength(project, clips, "a", 2, 1);
    expect(next[0]).toEqual({ id: "a", startTicks: 3840, lengthTicks: 1920 });
    expect(next[1]).toEqual(clips[1]);
  });

  it("parseStartBarBeat accepts . : , separators", () => {
    expect(parseStartBarBeat("3.2")).toEqual({ bar: 3, beat: 2 });
    expect(parseStartBarBeat(" 4 : 1 ")).toEqual({ bar: 4, beat: 1 });
    expect(parseStartBarBeat("1,3")).toEqual({ bar: 1, beat: 3 });
    expect(parseStartBarBeat("0.1")).toBeNull();
    expect(parseStartBarBeat("abc")).toBeNull();
  });

  it("clampBeatForProject respects meter numerator", () => {
    expect(clampBeatForProject(project, 1, 9)).toBe(4);
    expect(clampBeatForProject(project, 1, 0)).toBe(1);
  });
});
