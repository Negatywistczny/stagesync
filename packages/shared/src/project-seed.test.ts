import { describe, expect, it } from "vitest";
import {
  createProjectV2Seed,
  createProjectV3Seed,
  createProjectV4Seed,
  createProjectV5Seed,
  createProjectV6Seed,
  createDefaultTemplateProject,
  DEFAULT_TEMPLATE_PROJECT_ID,
  upgradeProjectV1ToV2,
  upgradeProjectV2ToV3,
  upgradeProjectV3ToV4,
  upgradeProjectV4ToV5,
  upgradeProjectV5ToV6,
  createProjectSeed,
  nextMidiProgramId,
} from "./project-seed.js";

describe("createProjectV2Seed", () => {
  it("seeds Countdown at -7680 (2 bars @ PPQ 960)", () => {
    const p = createProjectV2Seed(
      "id-1",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    const cd = p.forma.clips.find((c) => c.kind === "countdown");
    expect(cd?.startTicks).toBe(-7680);
    expect(cd?.lengthTicks).toBe(7680);
    expect(p.forma.clips.find((c) => c.startTicks === 0)?.name).toBe("Intro");
  });
});

describe("createProjectV3Seed", () => {
  it("includes empty assets arrays", () => {
    const p = createProjectV3Seed(
      "id-1",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    expect(p.formatVersion).toBe(3);
    expect(p.assets).toEqual([]);
    expect(p.audioTracks).toEqual([]);
    expect(p.audioClips).toEqual([]);
  });
});

describe("createProjectV4Seed", () => {
  it("includes empty content lanes", () => {
    const p = createProjectV4Seed(
      "id-1",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    expect(p.formatVersion).toBe(4);
    expect(p.tekst.clips).toEqual([]);
    expect(p.akordy.clips).toEqual([]);
    expect(p.cue.clips).toEqual([]);
  });
});

describe("createDefaultTemplateProject", () => {
  it("uses stable id and isTemplate without midiProgramId", () => {
    const p = createDefaultTemplateProject("2026-07-21T00:00:00.000Z");
    expect(p.id).toBe(DEFAULT_TEMPLATE_PROJECT_ID);
    expect(p.name).toBe("Template");
    expect(p.formatVersion).toBe(6);
    expect(p.isTemplate).toBe(true);
    expect(p.midiProgramId).toBeUndefined();
    expect(p.melody).toEqual({ clips: [] });
  });
});

describe("createProjectV5Seed", () => {
  it("includes keyMap and midiProgramId", () => {
    const p = createProjectV5Seed(
      "id-1",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    expect(p.formatVersion).toBe(5);
    expect(p.keyMap[0]?.key).toEqual({ tonic: "C", mode: "major" });
    expect(p.midiProgramId).toBe(0);
  });
});

describe("createProjectV6Seed", () => {
  it("includes empty melody and formatVersion 6", () => {
    const p = createProjectV6Seed(
      "id-1",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    expect(p.formatVersion).toBe(6);
    expect(p.melody).toEqual({ clips: [] });
    expect(p.keyMap[0]?.key).toEqual({ tonic: "C", mode: "major" });
    expect(p.midiProgramId).toBe(0);
  });
});

describe("upgradeProjectV1ToV2", () => {
  it("preserves id and name from v1", () => {
    const v2 = upgradeProjectV1ToV2({
      id: "abc",
      name: "Old",
      updatedAt: "2026-07-19T12:00:00.000Z",
    });
    expect(v2.id).toBe("abc");
    expect(v2.name).toBe("Old");
    expect(v2.formatVersion).toBe(2);
    expect(v2.forma.clips.length).toBeGreaterThan(0);
  });
});

describe("upgradeProjectV2ToV3", () => {
  it("adds empty media arrays", () => {
    const v3 = upgradeProjectV2ToV3(
      createProjectV2Seed("abc", "Old", "2026-07-19T12:00:00.000Z"),
    );
    expect(v3.formatVersion).toBe(3);
    expect(v3.assets).toEqual([]);
  });
});

describe("upgradeProjectV3ToV4", () => {
  it("adds empty content lane arrays", () => {
    const v4 = upgradeProjectV3ToV4(
      createProjectV3Seed("abc", "Old", "2026-07-19T12:00:00.000Z"),
    );
    expect(v4.formatVersion).toBe(4);
    expect(v4.tekst.clips).toEqual([]);
  });
});

describe("createProjectSeed / nextMidiProgramId", () => {
  it("createProjectSeed aliases createProjectV6Seed", () => {
    const p = createProjectSeed("id", "N", "2026-07-20T00:00:00.000Z");
    expect(p.formatVersion).toBe(6);
    expect(p.melody).toEqual({ clips: [] });
    expect(p.midiProgramId).toBe(0);
  });

  it("createProjectV5Seed accepts explicit midiProgramId", () => {
    const p = createProjectV5Seed("id", "N", "2026-07-20T00:00:00.000Z", {
      midiProgramId: 7,
    });
    expect(p.midiProgramId).toBe(7);
  });

  it("nextMidiProgramId skips used ids and templates", () => {
    expect(nextMidiProgramId([])).toBe(0);
    expect(
      nextMidiProgramId([
        { midiProgramId: 0 },
        { midiProgramId: 1, isTemplate: true },
        { midiProgramId: 2 },
      ]),
    ).toBe(1);
    expect(
      nextMidiProgramId([
        { midiProgramId: undefined },
        { isTemplate: true, midiProgramId: 0 },
      ]),
    ).toBe(0);
    const full = Array.from({ length: 128 }, (_, i) => ({ midiProgramId: i }));
    expect(nextMidiProgramId(full)).toBeNull();
  });
});

describe("upgradeProjectV4ToV5", () => {
  it("adds keyMap / empty scoreBarMap and default midiProgramId", () => {
    const v4 = createProjectV4Seed("id", "Song", "2026-07-20T00:00:00.000Z");
    const v5 = upgradeProjectV4ToV5(v4);
    expect(v5.formatVersion).toBe(5);
    expect(v5.keyMap[0]?.key).toEqual({ tonic: "C", mode: "major" });
    expect(v5.scoreBarMap).toEqual({ anchors: [] });
    expect(v5.midiProgramId).toBe(0);
    expect(v5.isTemplate).toBeUndefined();
  });

  it("template upgrade omits midiProgramId; explicit PC is kept for songs", () => {
    const v4 = createProjectV4Seed("id", "Tpl", "2026-07-20T00:00:00.000Z");
    const tpl = upgradeProjectV4ToV5(v4, { isTemplate: true });
    expect(tpl.isTemplate).toBe(true);
    expect(tpl.midiProgramId).toBeUndefined();
    const song = upgradeProjectV4ToV5(v4, { midiProgramId: 42 });
    expect(song.midiProgramId).toBe(42);
    expect(song.isTemplate).toBeUndefined();
  });
});

describe("upgradeProjectV5ToV6", () => {
  it("adds whole-line blocks and empty melody", () => {
    const v5 = {
      ...createProjectV5Seed("id", "Song", "2026-07-20T00:00:00.000Z"),
      tekst: {
        clips: [
          {
            id: "t1",
            startTicks: 0,
            lengthTicks: 960,
            text: "Hi",
          },
        ],
      },
    };
    const v6 = upgradeProjectV5ToV6(v5);
    expect(v6.formatVersion).toBe(6);
    expect(v6.melody).toEqual({ clips: [] });
    expect(v6.tekst.clips[0]?.blocks).toEqual([
      {
        id: "t1-block-0",
        startTicks: 0,
        lengthTicks: 960,
        text: "Hi",
      },
    ]);
  });
});
