import { describe, expect, it } from "vitest";
import { DEFAULT_PPQ } from "./time.js";
import {
  isLegacyCountdownSection,
  legacySongIdToProjectId,
  migrateLegacyDatabase,
  migrateLegacySong,
  parseLegacyMeter,
  type LegacyDatabase,
  type LegacySong,
} from "./legacy-migrate.js";

const FIXED_AT = "2026-07-20T18:00:00.000Z";
const PID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function templateSong(): LegacySong {
  return {
    id: "song-template",
    title: "Template",
    isTemplate: true,
    key: { tonic: "C", mode: "major" },
    tempo: 120,
    markers: [{ id: "mk-end", kind: "END", startAbs: 24 }],
    sections: [
      { id: 0, name: "Countdown", startAbs: 0 },
      { id: 1, name: "Intro", startAbs: 8 },
    ],
    vocal: {
      lines: [
        { id: "vl-cd-2", text: "2", startAbs: 0 },
        { id: "vl-cd-1", text: "1", startAbs: 4 },
        { id: "vl-rest", text: "", startAbs: 8, rest: true },
        { id: "vl-hi", text: "Hello", startAbs: 8 },
      ],
    },
    chords: {
      timeSignature: "4/4",
      clips: [
        { id: "cc-1", chord: "C", startAbs: 8 },
        { id: "cc-2", chord: "Am", startAbs: 12 },
        { id: "cc-3", chord: "F", startAbs: 16 },
        { id: "cc-4", chord: "G", startAbs: 20 },
      ],
    },
    cues: [{ id: "cue-1", startAbs: 16, text: "Lights", lengthBeats: 4 }],
  };
}

describe("legacy-migrate helpers", () => {
  it("detects countdown sections", () => {
    expect(isLegacyCountdownSection({ id: 0, name: "X" })).toBe(true);
    expect(isLegacyCountdownSection({ id: 1, name: "Countdown" })).toBe(true);
    expect(isLegacyCountdownSection({ id: 1, name: "Intro" })).toBe(false);
  });

  it("parses meter strings", () => {
    expect(parseLegacyMeter("5/8")).toEqual({ numerator: 5, denominator: 8 });
    expect(parseLegacyMeter("nope")).toEqual({
      numerator: 4,
      denominator: 4,
    });
  });

  it("builds stable project ids", () => {
    const a = legacySongIdToProjectId("song-1");
    const b = legacySongIdToProjectId("song-1");
    expect(a).toBe(b);
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe("migrateLegacySong", () => {
  it("shifts axis so Intro lands at tick 0; CD is negative", () => {
    const { project, shiftQuarters } = migrateLegacySong(templateSong(), {
      projectId: PID,
      updatedAt: FIXED_AT,
    });
    expect(shiftQuarters).toBe(8);
    const cd = project.forma.clips.find((c) => c.kind === "countdown");
    const intro = project.forma.clips.find((c) => c.name === "Intro");
    expect(cd?.startTicks).toBe(-8 * DEFAULT_PPQ);
    expect(cd?.lengthTicks).toBe(8 * DEFAULT_PPQ);
    expect(intro?.startTicks).toBe(0);
    expect(intro?.lengthTicks).toBe(16 * DEFAULT_PPQ); // 8→24 END
  });

  it("maps chords / tekst / cue after shift", () => {
    const { project } = migrateLegacySong(templateSong(), {
      projectId: PID,
      updatedAt: FIXED_AT,
    });
    expect(project.akordy.clips[0]?.symbol).toBe("C");
    expect(project.akordy.clips[0]?.startTicks).toBe(0);
    expect(project.tekst.clips.some((c) => c.text === "Hello")).toBe(true);
    expect(project.tekst.clips.every((c) => c.id !== "vl-rest")).toBe(true);
    expect(project.tekst.clips.every((c) => !/^vl-cd-/i.test(c.id))).toBe(true);
    expect(project.cue.clips[0]?.label).toBe("Lights");
    expect(project.cue.clips[0]?.startTicks).toBe(8 * DEFAULT_PPQ);
    expect(project.isTemplate).toBe(true);
  });

  it("dense Money-style chords: no overlapping lengths (unsorted + sub-bar onsets)", () => {
    const song: LegacySong = {
      id: "money",
      title: "Money, Money",
      tempo: 120,
      markers: [{ id: "mk-end", kind: "END", startAbs: 24 }],
      sections: [
        { id: 0, name: "Countdown", startAbs: 0 },
        { id: 1, name: "Verse", startAbs: 8 },
      ],
      chords: {
        timeSignature: "4/4",
        // Unsorted + two chords sharing one bar (beats 1 and 3)
        clips: [
          { id: "c-f", chord: "F", startAbs: 10 },
          { id: "c-am", chord: "Am", startAbs: 8 },
          { id: "c-g", chord: "G", startAbs: 14 },
          { id: "c-c", chord: "C", startAbs: 12 },
        ],
      },
    };
    const { project } = migrateLegacySong(song, {
      projectId: PID,
      updatedAt: FIXED_AT,
    });
    const chords = [...project.akordy.clips].sort(
      (a, b) => a.startTicks - b.startTicks,
    );
    expect(chords.map((c) => c.symbol)).toEqual(["Am", "F", "C", "G"]);
    for (let i = 0; i < chords.length; i++) {
      const end = chords[i]!.startTicks + chords[i]!.lengthTicks;
      if (i + 1 < chords.length) {
        expect(end).toBeLessThanOrEqual(chords[i + 1]!.startTicks);
      }
    }
    // Am@0 → F@2 quarters → length 2*ppq, not full bar
    expect(chords[0]!.lengthTicks).toBe(2 * DEFAULT_PPQ);
  });

  it("defaults Forma subsections to v4 4-bar offsets on dense sections", () => {
    const song: LegacySong = {
      id: "dense-form",
      title: "Dense Form",
      tempo: 120,
      markers: [{ id: "mk-end", kind: "END", startAbs: 56 }],
      sections: [
        { id: 0, name: "Countdown", startAbs: 0 },
        { id: 1, name: "Verse", startAbs: 8 },
      ],
      chords: { timeSignature: "4/4", clips: [] },
    };
    const { project } = migrateLegacySong(song, {
      projectId: PID,
      updatedAt: FIXED_AT,
    });
    const cd = project.forma.clips.find((c) => c.kind === "countdown");
    const verse = project.forma.clips.find((c) => c.name === "Verse");
    const bar = 4 * DEFAULT_PPQ;
    const chunk4 = 4 * bar;
    // Verse: 8→56 = 48 beats = 12 bars → interiors at 4 and 8 bars
    expect(verse?.lengthTicks).toBe(12 * bar);
    expect(verse?.subsections).toEqual([chunk4, 2 * chunk4]);
    expect(cd?.subsections).toBeUndefined();
  });

  it("maps legacy subsections when present; does not overwrite", () => {
    const song: LegacySong = {
      id: "with-subs",
      title: "With Subs",
      tempo: 120,
      markers: [{ id: "mk-end", kind: "END", startAbs: 40 }],
      sections: [
        { id: 0, name: "Countdown", startAbs: 0 },
        {
          id: 1,
          name: "Verse",
          startAbs: 8,
          subsections: [{ startAbs: 8 }, { startAbs: 12 }, { startAbs: 24 }],
        },
      ],
      chords: { timeSignature: "4/4", clips: [] },
    };
    const { project } = migrateLegacySong(song, {
      projectId: PID,
      updatedAt: FIXED_AT,
    });
    const verse = project.forma.clips.find((c) => c.name === "Verse");
    // Relative: 12-8=4 beats, 24-8=16 beats
    expect(verse?.subsections).toEqual([4 * DEFAULT_PPQ, 16 * DEFAULT_PPQ]);
  });

  it("fails fast on empty Forma when schema would be invalid", () => {
    // Empty sections → empty forma.clips — ProjectSchema requires clips array but allows empty.
    // Force invalid with bad id:
    expect(() =>
      migrateLegacySong(
        { id: "x", title: "Bad", sections: [{ id: 1, name: "A", startAbs: 0 }] },
        { projectId: "", updatedAt: FIXED_AT },
      ),
    ).toThrow(/ProjectSchema/);
  });
  it("maps year, coverUrl, MusicXML asset, and audio tracks/clips", () => {
    const song: LegacySong = {
      ...templateSong(),
      year: 1978,
      artist: "ABBA",
      genre: "Pop",
      coverUrl:
        "https://resources.tidal.com/images/example/1280x1280.jpg",
      musicxmlFile: "halo-tu-londyn.mxl",
      audioFile: "guide.wav",
      stems: ["drums.wav", "bass.mp3"],
    };
    const { project, pendingAssets } = migrateLegacySong(song, {
      projectId: PID,
      updatedAt: FIXED_AT,
    });
    expect(project.year).toBe(1978);
    expect(project.artist).toBe("ABBA");
    expect(project.coverUrl).toContain("tidal.com");
    expect(project.assets.map((a) => a.kind).sort()).toEqual([
      "audio",
      "audio",
      "audio",
      "musicxml",
    ]);
    expect(
      project.assets.find((a) => a.kind === "musicxml")?.originalName,
    ).toBe("halo-tu-londyn.mxl");
    expect(project.audioTracks).toHaveLength(3);
    expect(project.audioClips).toHaveLength(3);
    expect(project.audioClips.every((c) => c.startTicks === 0)).toBe(true);
    expect(pendingAssets).toHaveLength(4);
    expect(pendingAssets.some((p) => p.kind === "musicxml")).toBe(true);
    expect(pendingAssets.filter((p) => p.kind === "audio")).toHaveLength(3);
  });

  it("maps local cover filename to cover asset (not coverUrl)", () => {
    const song: LegacySong = {
      ...templateSong(),
      coverUrl: "sleeve.png",
    };
    const { project, pendingAssets } = migrateLegacySong(song, {
      projectId: PID,
      updatedAt: FIXED_AT,
    });
    expect(project.coverUrl).toBeUndefined();
    expect(project.assets.some((a) => a.kind === "cover")).toBe(true);
    expect(pendingAssets.some((p) => p.kind === "cover")).toBe(true);
  });

  it("does not zero year when valid", () => {
    const { project } = migrateLegacySong(
      { ...templateSong(), year: 2015 },
      { projectId: PID, updatedAt: FIXED_AT },
    );
    expect(project.year).toBe(2015);
  });
});

describe("migrateLegacyDatabase", () => {
  it("migrates songs + maps setlist ids", () => {
    const db: LegacyDatabase = {
      schemaVersion: 4,
      songs: [templateSong()],
      setlist: { enabled: true, songIds: ["song-template"] },
      settings: { setlistAutoAdvance: true },
    };
    const result = migrateLegacyDatabase(db, {
      updatedAt: FIXED_AT,
      idForSong: () => PID,
    });
    expect(result.projects).toHaveLength(1);
    expect(result.setlist.enabled).toBe(true);
    expect(result.setlist.projectIds).toEqual([PID]);
    expect(result.setlist.autoAdvance.enabled).toBe(true);
  });

  it("throws when songs[] missing", () => {
    expect(() => migrateLegacyDatabase({})).toThrow(/no songs/);
  });
});
