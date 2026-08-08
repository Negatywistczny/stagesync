import { describe, expect, it } from "vitest";
import {
  withWholeLineTekstBlocks,
  type TekstBlock,
  type TekstClip,
} from "@stagesync/shared";
import {
  joinTekstClips,
  moveTekstClipStart,
  remapTekstClipGeometry,
  shiftTekstBlocks,
  syncSoleTekstBlock,
  tekstBlocksInWindow,
} from "./tekstBlocks.js";

const blocks2: TekstBlock[] = [
  { id: "b0", startTicks: 0, lengthTicks: 1000, text: "a" },
  { id: "b1", startTicks: 1000, lengthTicks: 1000, text: "b" },
  { id: "b2", startTicks: 2000, lengthTicks: 1840, text: "c" },
];

describe("tekstBlocks", () => {
  it("shiftTekstBlocks / moveTekstClipStart apply Δstart", () => {
    expect(shiftTekstBlocks(blocks2, 100).map((b) => b.startTicks)).toEqual([
      100, 1100, 2100,
    ]);
    const clip: TekstClip = {
      id: "t",
      startTicks: 0,
      lengthTicks: 3840,
      text: "x",
      blocks: blocks2,
    };
    const moved = moveTekstClipStart(clip, 500);
    expect(moved.startTicks).toBe(500);
    expect(moved.blocks.map((b) => b.startTicks)).toEqual([500, 1500, 2500]);
    expect(moveTekstClipStart(clip, 0)).toBe(clip);
  });

  it("tekstBlocksInWindow clips overlapping blocks", () => {
    const win = tekstBlocksInWindow(blocks2, 500, 2000);
    expect(win).toEqual([
      { id: "b0", startTicks: 500, lengthTicks: 500, text: "a" },
      { id: "b1", startTicks: 1000, lengthTicks: 1000, text: "b" },
      { id: "b2", startTicks: 2000, lengthTicks: 500, text: "c" },
    ]);
    expect(tekstBlocksInWindow(blocks2, 5000, 100)).toEqual([]);
  });

  it("syncSoleTekstBlock mirrors clip geometry and text", () => {
    const synced = syncSoleTekstBlock({
      id: "t",
      startTicks: 100,
      lengthTicks: 200,
      text: "hi",
      blocks: [{ id: "old", startTicks: 0, lengthTicks: 50, text: "x" }],
    });
    expect(synced.blocks).toEqual([
      { id: "old", startTicks: 100, lengthTicks: 200, text: "hi" },
    ]);
  });

  it("remapTekstClipGeometry: sole sync, move, multi-window", () => {
    const sole = withWholeLineTekstBlocks({
      id: "t",
      startTicks: 0,
      lengthTicks: 3840,
      text: "line",
    });
    const resized = remapTekstClipGeometry(sole, {
      id: "t",
      startTicks: 0,
      lengthTicks: 1920,
      text: "line",
    });
    expect(resized.blocks).toHaveLength(1);
    expect(resized.blocks[0]!).toMatchObject({
      startTicks: 0,
      lengthTicks: 1920,
      text: "line",
    });

    const multi: TekstClip = {
      id: "t",
      startTicks: 0,
      lengthTicks: 3840,
      text: "line",
      blocks: blocks2,
    };
    const moved = remapTekstClipGeometry(multi, {
      id: "t",
      startTicks: 960,
      lengthTicks: 3840,
      text: "line",
    });
    expect(moved.blocks.map((b) => b.startTicks)).toEqual([960, 1960, 2960]);

    const left = remapTekstClipGeometry(multi, {
      id: "t",
      startTicks: 0,
      lengthTicks: 1500,
      text: "line",
    });
    expect(left.blocks.map((b) => b.id)).toEqual(["b0", "b1"]);
    expect(left.blocks[1]!.lengthTicks).toBe(500);

    const right = remapTekstClipGeometry(multi, {
      id: "t-r",
      startTicks: 1500,
      lengthTicks: 2340,
      text: "line",
    });
    expect(right.blocks.map((b) => b.id)).toEqual(["b1", "b2"]);
    expect(right.blocks[0]!.startTicks).toBe(1500);
  });

  it("joinTekstClips concatenates blocks", () => {
    const a = withWholeLineTekstBlocks({
      id: "a",
      startTicks: 0,
      lengthTicks: 1000,
      text: "A",
    });
    const b = withWholeLineTekstBlocks({
      id: "b",
      startTicks: 1000,
      lengthTicks: 1000,
      text: "B",
    });
    const joined = joinTekstClips(a, b);
    expect(joined.id).toBe("a");
    expect(joined.lengthTicks).toBe(2000);
    expect(joined.text).toBe("A");
    expect(joined.blocks).toHaveLength(2);
  });
});
