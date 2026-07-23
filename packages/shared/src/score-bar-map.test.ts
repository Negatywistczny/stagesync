import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "./project-seed.js";
import {
  DEFAULT_SCORE_ANCHORS,
  normalizeAnchors,
  normalizeMap,
  scoreBarToSongBar,
  songBarToScoreBar,
  ticksFromScoreBar,
} from "./score-bar-map.js";

const dualResetMap = {
  anchors: [
    { id: "a", logicBar: 3, scoreBar: 1 },
    { id: "b", logicBar: 27, scoreBar: 1 },
  ],
};

describe("score-bar-map", () => {
  it("identity when empty", () => {
    expect(songBarToScoreBar(5, { anchors: [] })).toBe(5);
    expect(scoreBarToSongBar(5, { anchors: [] })).toBe(5);
    expect(normalizeMap({ anchors: [] })).toBeNull();
  });

  it("maps from first anchor onward", () => {
    expect(songBarToScoreBar(1, dualResetMap)).toBe(1);
    expect(songBarToScoreBar(3, dualResetMap)).toBe(1);
    expect(songBarToScoreBar(5, dualResetMap)).toBe(3);
    expect(songBarToScoreBar(27, dualResetMap)).toBe(1);
    expect(songBarToScoreBar(30, dualResetMap)).toBe(4);
  });

  it("scoreBarToSongBar inverts with custom kotwice (earliest segment)", () => {
    expect(scoreBarToSongBar(1, dualResetMap)).toBe(3);
    expect(scoreBarToSongBar(3, dualResetMap)).toBe(5);
    expect(scoreBarToSongBar(4, dualResetMap)).toBe(6);
  });

  it("scoreBarToSongBar prefers nearSongBar on scoreBar reset", () => {
    expect(scoreBarToSongBar(1, dualResetMap, { nearSongBar: 28 })).toBe(27);
    expect(scoreBarToSongBar(4, dualResetMap, { nearSongBar: 28 })).toBe(30);
    expect(scoreBarToSongBar(3, dualResetMap, { nearSongBar: 4 })).toBe(5);
  });

  it("ticksFromScoreBar walks meterMap to song-bar start", () => {
    const project = createProjectV5Seed(
      "p",
      "Song",
      "2026-07-22T00:00:00.000Z",
    );
    const withMap = {
      ...project,
      scoreBarMap: dualResetMap,
    };
    // scoreBar 16 → earliest song bar 3+(16-1)=18 → 17 completed bars @ 4/4 PPQ 960
    const ticks = ticksFromScoreBar(withMap, 16);
    expect(ticks).toBe(17 * 4 * 960);
    expect(songBarToScoreBar(18, dualResetMap)).toBe(16);
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

  it("normalizeAnchors accepts raw array and synthesizes ids", () => {
    const anchors = normalizeAnchors([
      { logicBar: 5, scoreBar: 2 },
      { songBar: 2, scoreBar: 1 },
    ]);
    expect(anchors.map((a) => a.logicBar)).toEqual([2, 5]);
    expect(anchors[0]!.id).toMatch(/^anchor-/);
    expect(normalizeAnchors(null)).toEqual([]);
    expect(normalizeAnchors(undefined)).toEqual([]);
  });

  it("logicBarToScoreBar aliases songBarToScoreBar", async () => {
    const { logicBarToScoreBar } = await import("./score-bar-map.js");
    expect(logicBarToScoreBar(5, dualResetMap)).toBe(
      songBarToScoreBar(5, dualResetMap),
    );
  });
});
