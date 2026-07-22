import { describe, expect, it } from "vitest";
import {
  countdownDigitLabels,
  createProjectV5Seed,
  isCountdownDigitClipId,
  migrateLegacySong,
  scrubCountdownDigitClips,
  syntheticCountdownDisplayFromProject,
  syntheticCountdownTekstClips,
} from "./index.js";

describe("countdown-content", () => {
  it("countdownDigitLabels counts down by barOffset", () => {
    expect(countdownDigitLabels(2)).toEqual([
      { barOffset: 0, label: "2" },
      { barOffset: 1, label: "1" },
    ]);
    expect(countdownDigitLabels(0)).toEqual([]);
  });

  it("countdownDigitLabels caps at 32 bars", () => {
    const labels = countdownDigitLabels(100);
    expect(labels).toHaveLength(32);
    expect(labels[0]).toEqual({ barOffset: 0, label: "32" });
    expect(labels[31]).toEqual({ barOffset: 31, label: "1" });
  });

  it("syntheticCountdownTekstClips maps labels into CD span ticks", () => {
    const clips = syntheticCountdownTekstClips(-7680, 2, 3840);
    expect(clips).toEqual([
      { id: "vl-cd-2", text: "2", startTicks: -7680, lengthTicks: 3840 },
      { id: "vl-cd-1", text: "1", startTicks: -3840, lengthTicks: 3840 },
    ]);
  });

  it("isCountdownDigitClipId matches vl-cd-*", () => {
    expect(isCountdownDigitClipId("vl-cd-1")).toBe(true);
    expect(isCountdownDigitClipId("vl-3")).toBe(false);
  });

  it("scrubCountdownDigitClips drops spilled digits without rewriting", () => {
    const seed = createProjectV5Seed("id", "Demo", "2026-07-20T00:00:00.000Z");
    const dirty = {
      ...seed,
      tekst: {
        clips: [
          {
            id: "vl-cd-1",
            text: "1",
            startTicks: -3840,
            lengthTicks: 25920, // spilled ~6.75 bars into song
          },
          {
            id: "vl-hi",
            text: "Hello",
            startTicks: 0,
            lengthTicks: 3840,
          },
        ],
      },
      akordy: {
        clips: [
          {
            id: "bad-in-cd",
            symbol: "2",
            startTicks: -3840,
            lengthTicks: 960,
          },
          {
            id: "ok",
            symbol: "G",
            startTicks: 0,
            lengthTicks: 960,
          },
        ],
      },
    };
    const next = scrubCountdownDigitClips(dirty);
    expect(next.tekst.clips.every((c) => !isCountdownDigitClipId(c.id))).toBe(
      true,
    );
    expect(next.tekst.clips.find((c) => c.id === "vl-hi")?.startTicks).toBe(0);
    expect(next.akordy.clips.map((c) => c.id)).toEqual(["ok"]);
    // Digits are display-only — not persisted after scrub.
    expect(next.tekst.clips.filter((c) => c.text === "1" || c.text === "2")).toEqual(
      [],
    );
  });

  it("syntheticCountdownDisplayFromProject derives from Forma CD length", () => {
    const seed = createProjectV5Seed("id", "Demo", "2026-07-20T00:00:00.000Z");
    const { tekst, akordy } = syntheticCountdownDisplayFromProject(seed);
    expect(tekst.map((c) => c.text)).toEqual(["2", "1"]);
    expect(akordy.map((c) => c.symbol)).toEqual(["2", "1"]);
    expect(tekst.every((c) => c.startTicks + c.lengthTicks <= 0)).toBe(true);
  });
});

describe("migrateLegacySong countdown digits", () => {
  it("does not persist digit clips; CD length still correct when rest skipped", () => {
    const { project } = migrateLegacySong(
      {
        id: "song-money",
        title: "Money",
        tempo: 120,
        markers: [{ id: "mk-end", kind: "END", startAbs: 40 }],
        sections: [
          { id: 0, name: "Countdown", startAbs: 0 },
          { id: 1, name: "Intro", startAbs: 8 },
        ],
        vocal: {
          lines: [
            { id: "vl-cd-2", text: "2", startAbs: 0 },
            { id: "vl-cd-1", text: "1", startAbs: 4 },
            { id: "vl-rest", text: "", startAbs: 8, rest: true },
            // Gap before first lyric — old migrator stretched "1" here
            { id: "vl-hi", text: "I work all night", startAbs: 31 },
          ],
        },
        chords: { timeSignature: "4/4", clips: [] },
      },
      {
        projectId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        updatedAt: "2026-07-20T18:00:00.000Z",
      },
    );
    expect(project.tekst.clips.every((c) => !isCountdownDigitClipId(c.id))).toBe(
      true,
    );
    expect(project.tekst.clips.find((c) => c.id === "vl-hi")?.text).toBe(
      "I work all night",
    );
    const cd = project.forma.clips.find((c) => c.kind === "countdown");
    expect(cd?.startTicks).toBe(-7680);
    expect(cd?.lengthTicks).toBe(7680);
    const synth = syntheticCountdownDisplayFromProject(project);
    expect(synth.tekst.map((c) => [c.text, c.startTicks, c.lengthTicks])).toEqual([
      ["2", -7680, 3840],
      ["1", -3840, 3840],
    ]);
  });
});
