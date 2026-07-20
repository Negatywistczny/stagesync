import { describe, expect, it } from "vitest";
import {
  TRACKS,
  defaultTrackVisibility,
  isCoreTrackVisible,
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
});
