import { describe, expect, it, vi } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  clampScoreZoom,
  scoreBarFromDisplayTicks,
  seekTicksFromScoreBar,
} from "./scorePlayhead.js";

const map = {
  anchors: [
    { id: "a", logicBar: 3, scoreBar: 1 },
    { id: "b", logicBar: 27, scoreBar: 1 },
  ],
};

function projectWithMap() {
  return {
    ...createProjectV5Seed("p", "Song", "2026-07-22T00:00:00.000Z"),
    scoreBarMap: map,
  };
}

describe("scorePlayhead", () => {
  it("maps displayTicks → MusicXML scoreBar via kotwice", () => {
    const project = projectWithMap();
    // bar 5 start = 4 completed bars @ 4/4 PPQ 960
    const ticks = 4 * 4 * 960;
    expect(scoreBarFromDisplayTicks(project, ticks)).toBe(3);
  });

  it("seek from score bar 16 sends ticks at mapped song-bar start", () => {
    const project = projectWithMap();
    const seek = seekTicksFromScoreBar(project, 16, 0);
    // earliest: song 18 → 17 bars
    expect(seek).toBe(17 * 4 * 960);
  });

  it("seek near late playhead picks reset segment", () => {
    const project = projectWithMap();
    const lateTicks = 28 * 4 * 960;
    const seek = seekTicksFromScoreBar(project, 1, lateTicks);
    expect(seek).toBe(26 * 4 * 960); // song bar 27
  });

  it("clampScoreZoom bounds", () => {
    expect(clampScoreZoom(40)).toBe(50);
    expect(clampScoreZoom(250)).toBe(200);
    expect(clampScoreZoom(125.4)).toBe(125);
  });
});

describe("score seek wiring", () => {
  it("click measure 16 calls seek with precise ticks", async () => {
    const project = projectWithMap();
    const seek = vi.fn(async (_ticks: number) => undefined);
    const ticks = seekTicksFromScoreBar(project, 16, 0);
    await seek(ticks);
    expect(seek).toHaveBeenCalledWith(17 * 4 * 960);
  });
});
