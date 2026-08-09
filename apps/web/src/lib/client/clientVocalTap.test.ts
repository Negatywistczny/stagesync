import { describe, expect, it } from "vitest";
import {
  createProjectV6Seed,
  withWholeLineTekstBlocks,
} from "@stagesync/shared";
import {
  applyVocalTap,
  vocalTapMarkTicks,
  vocalTapQueue,
} from "./clientVocalTap.js";

describe("clientVocalTap", () => {
  it("vocalTapMarkTicks uses display while playing, locator when paused", () => {
    expect(vocalTapMarkTicks(true, 5000, 0)).toBe(5000);
    expect(vocalTapMarkTicks(false, 5000, 1200)).toBe(1200);
  });

  it("queues non-empty tekst clips on/after content floor", () => {
    const base = createProjectV6Seed("p", "S", "2026-07-23T00:00:00.000Z");
    const project = {
      ...base,
      tekst: {
        clips: [
          withWholeLineTekstBlocks({
            id: "t-empty",
            text: "   ",
            startTicks: 0,
            lengthTicks: 960,
          }),
          withWholeLineTekstBlocks({
            id: "t-late",
            text: "two",
            startTicks: 3840,
            lengthTicks: 960,
          }),
          withWholeLineTekstBlocks({
            id: "t-early",
            text: "one",
            startTicks: 0,
            lengthTicks: 960,
          }),
          withWholeLineTekstBlocks({
            id: "t-preroll",
            text: "skip",
            startTicks: -1000,
            lengthTicks: 960,
          }),
        ],
      },
    };
    const queue = vocalTapQueue(project);
    expect(queue.map((c) => c.id)).toEqual(["t-early", "t-late"]);
  });

  it("applyVocalTap moves clip start and shifts blocks", () => {
    const base = createProjectV6Seed("p", "S", "2026-07-23T00:00:00.000Z");
    const project = {
      ...base,
      tekst: {
        clips: [
          {
            id: "line",
            text: "hi",
            startTicks: 0,
            lengthTicks: 1920,
            blocks: [
              { id: "b0", startTicks: 0, lengthTicks: 960, text: "h" },
              { id: "b1", startTicks: 960, lengthTicks: 960, text: "i" },
            ],
          },
        ],
      },
    };
    const moved = applyVocalTap(project, "line", 5000, 4000);
    expect(moved.tekst.clips[0]!.startTicks).toBe(5000);
    expect(moved.tekst.clips[0]!.lengthTicks).toBe(1920);
    expect(moved.tekst.clips[0]!.blocks.map((b) => b.startTicks)).toEqual([
      5000, 5960,
    ]);

    const clamped = applyVocalTap(project, "line", 100, 2000);
    expect(clamped.tekst.clips[0]!.startTicks).toBe(2000);
    expect(clamped.tekst.clips[0]!.blocks[0]!.startTicks).toBe(2000);
  });

  it("non-finite minStartTicks falls back to floor", () => {
    const base = createProjectV6Seed("p", "S", "2026-07-23T00:00:00.000Z");
    const project = {
      ...base,
      tekst: {
        clips: [
          withWholeLineTekstBlocks({
            id: "line",
            text: "hi",
            startTicks: 0,
            lengthTicks: 1920,
          }),
        ],
      },
    };
    const moved = applyVocalTap(project, "line", 3000, Number.NaN);
    expect(moved.tekst.clips[0]!.startTicks).toBe(3000);
    expect(moved.tekst.clips[0]!.blocks[0]!.startTicks).toBe(3000);
  });
});
