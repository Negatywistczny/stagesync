import { describe, expect, it } from "vitest";
import {
  TRACKS,
  audioLaneId,
  audioTrackIdFromLane,
  buildTrackList,
  defaultTrackVisibility,
  ensureAudioTrackVisibility,
  isAudioLaneId,
  isCoreTrackVisible,
  isTrackVisible,
  type CoreTrackId,
} from "./timelineTracks.js";

describe("timelineTracks", () => {
  it("orders special lanes above content (v4 parity)", () => {
    const ids = TRACKS.map((t) => t.id);
    const specialEnd = ids.indexOf("kotwice");
    const contentStart = ids.indexOf("forma");
    expect(specialEnd).toBeGreaterThanOrEqual(0);
    expect(contentStart).toBeGreaterThan(specialEnd);
    for (let i = 0; i <= specialEnd; i++) {
      expect(TRACKS[i]?.group).toBe("special");
    }
    for (let i = contentStart; i < TRACKS.length; i++) {
      expect(TRACKS[i]?.group).toBe("content");
    }
  });

  it("defaultTrackVisibility hides special, shows content", () => {
    const vis = defaultTrackVisibility();
    for (const track of TRACKS) {
      if (track.group === "special") {
        expect(vis[track.id]).toBe(false);
      } else {
        expect(vis[track.id]).toBe(true);
      }
    }
  });

  it("Forma is locked always visible", () => {
    const vis = defaultTrackVisibility();
    vis.forma = false;
    expect(isCoreTrackVisible(vis, "forma")).toBe(true);
  });

  it("matches expected core track sequence", () => {
    const expected: CoreTrackId[] = [
      "tempo",
      "tonacja",
      "metrum",
      "kotwice",
      "forma",
      "tekst",
      "akordy",
      "cue",
    ];
    expect(TRACKS.map((t) => t.id)).toEqual(expected);
  });

  it("buildTrackList appends audio lanes after Cue", () => {
    const list = buildTrackList([
      { id: "at-1", name: "Backing" },
      { id: "at-2", name: "Click" },
    ]);
    expect(list.map((t) => t.id)).toEqual([
      ...TRACKS.map((t) => t.id),
      "audio:at-1",
      "audio:at-2",
    ]);
    expect(list.at(-1)?.group).toBe("audio");
    expect(isAudioLaneId("audio:at-1")).toBe(true);
    expect(audioTrackIdFromLane(audioLaneId("at-1"))).toBe("at-1");
  });

  it("ensureAudioTrackVisibility defaults new audio lanes on", () => {
    const vis = defaultTrackVisibility();
    const next = ensureAudioTrackVisibility(vis, [{ id: "x", name: "A" }]);
    expect(
      isTrackVisible(next, buildTrackList([{ id: "x", name: "A" }])[8]!),
    ).toBe(true);
  });

  it("ensureAudioTrackVisibility drops stale and adds missing", () => {
    const vis = {
      forma: true,
      "audio:old": true,
    };
    const next = ensureAudioTrackVisibility(vis, [{ id: "new", name: "N" }]);
    expect(next["audio:old"]).toBeUndefined();
    expect(next["audio:new"]).toBe(true);
    expect(ensureAudioTrackVisibility(next, [{ id: "new", name: "N" }])).toBe(next);
  });

  it("isCoreTrackVisible respects locked Forma", () => {
    expect(isCoreTrackVisible({ forma: false }, "forma")).toBe(true);
    expect(isCoreTrackVisible({}, "tempo")).toBe(true);
  });


  it("defaultTrackVisibility includes audio lanes", () => {
    const vis = defaultTrackVisibility([{ id: "a1", name: "A" }]);
    expect(vis["audio:a1"]).toBe(true);
  });

});
