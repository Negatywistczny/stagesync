import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCORE_ANCHORS,
  normalizeAnchors,
  normalizeMap,
  songBarToScoreBar,
} from "./score-bar-map.js";

describe("score-bar-map", () => {
  it("identity when empty", () => {
    expect(songBarToScoreBar(5, { anchors: [] })).toBe(5);
    expect(normalizeMap({ anchors: [] })).toBeNull();
  });

  it("maps from first anchor onward", () => {
    const map = {
      anchors: [
        { id: "a", logicBar: 3, scoreBar: 1 },
        { id: "b", logicBar: 27, scoreBar: 1 },
      ],
    };
    expect(songBarToScoreBar(1, map)).toBe(1);
    expect(songBarToScoreBar(3, map)).toBe(1);
    expect(songBarToScoreBar(5, map)).toBe(3);
    expect(songBarToScoreBar(27, map)).toBe(1);
    expect(songBarToScoreBar(30, map)).toBe(4);
  });

  it("normalizeAnchors drops duplicate logicBar and sorts", () => {
    const anchors = normalizeAnchors({
      anchors: [
        { id: "b", logicBar: 10, scoreBar: 2 },
        { id: "a", logicBar: 3, scoreBar: 1 },
        { id: "dup", logicBar: 3, scoreBar: 9 },
      ],
    });
    expect(anchors.map((a) => a.logicBar)).toEqual([3, 10]);
    expect(anchors[0]!.scoreBar).toBe(1);
  });

  it("DEFAULT_SCORE_ANCHORS hint matches v4 countdown→1", () => {
    expect(DEFAULT_SCORE_ANCHORS[0]).toEqual({ logicBar: 3, scoreBar: 1 });
  });
});
