import { describe, expect, it } from "vitest";
import {
  createProjectV2Seed,
  createProjectV3Seed,
  createProjectV4Seed,
  createProjectV5Seed,
  createDefaultTemplateProject,
  DEFAULT_TEMPLATE_PROJECT_ID,
  upgradeProjectV1ToV2,
  upgradeProjectV2ToV3,
  upgradeProjectV3ToV4,
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
    expect(p.isTemplate).toBe(true);
    expect(p.midiProgramId).toBeUndefined();
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
  it("createProjectSeed aliases createProjectV5Seed", () => {
    const p = createProjectSeed("id", "N", "2026-07-20T00:00:00.000Z");
    expect(p.formatVersion).toBe(5);
    expect(p.midiProgramId).toBe(0);
  });

  it("createProjectV5Seed accepts explicit midiProgramId", () => {
    const p = createProjectV5Seed("id", "N", "2026-07-20T00:00:00.000Z", {
      midiProgramId: 7,
    });
    expect(p.midiProgramId).toBe(7);
  });

  it("nextMidiProgramId skips used ids and templates", () => {
    expect(
      nextMidiProgramId([
        { midiProgramId: 0 },
        { midiProgramId: 1, isTemplate: true },
        { midiProgramId: 2 },
      ]),
    ).toBe(1);
    const full = Array.from({ length: 128 }, (_, i) => ({ midiProgramId: i }));
    expect(nextMidiProgramId(full)).toBeNull();
  });
});
