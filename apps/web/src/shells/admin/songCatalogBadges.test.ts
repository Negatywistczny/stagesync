import { createProjectSeed } from "@stagesync/shared";
import { describe, expect, it } from "vitest";
import { catalogSongBadges, songInspectorMeta } from "./songCatalogBadges.js";

describe("catalogSongBadges", () => {
  it("builds dense BPM / key / duration badges", () => {
    expect(
      catalogSongBadges({
        id: "p1",
        name: "Demo",
        defaultBpm: 112.4,
        keyLabel: "Am",
        durationMs: 125_000,
      }),
    ).toEqual(["112", "Am", "2:05"]);
  });

  it("skips missing fields", () => {
    expect(catalogSongBadges({ id: "p1", name: "Demo" })).toEqual([]);
  });

  it("skips non-finite BPM, blank key, and non-positive duration", () => {
    expect(
      catalogSongBadges({
        id: "p1",
        name: "Demo",
        defaultBpm: Number.NaN,
        keyLabel: "   ",
        durationMs: 0,
      }),
    ).toEqual([]);
    expect(
      catalogSongBadges({
        id: "p1",
        name: "Demo",
        defaultBpm: Number.POSITIVE_INFINITY,
        durationMs: -1,
      }),
    ).toEqual([]);
  });
});

describe("songInspectorMeta", () => {
  it("reads tempo / key / duration from project maps", () => {
    const project = createProjectSeed(
      "00000000-0000-4000-8000-000000000001",
      "Song",
      "2026-07-25T00:00:00.000Z",
    );
    project.defaultBpm = 100;
    project.tempoMap = [{ id: "t0", startTicks: 0, bpm: 100 }];
    project.keyMap = [
      { id: "k0", startTicks: 0, key: { tonic: "G", mode: "minor" } },
    ];
    const meta = songInspectorMeta(project);
    expect(meta.bpm).toBe(100);
    expect(meta.keyLabel).toBe("Gm");
    expect(meta.durationLabel).toMatch(/^\d+:\d{2}$/);
  });
});
