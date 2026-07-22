import { describe, expect, it } from "vitest";
import {
  CreateProjectBodySchema,
  LibrarySchema,
  ProjectSchema,
  ProjectSchemaV2,
  ProjectSchemaV3,
  ProjectSchemaV4,
  ProjectSchemaV5,
  PutProjectBodySchema,
} from "./schema.js";
import {
  createProjectV2Seed,
  createProjectV3Seed,
  createProjectV4Seed,
  createProjectV5Seed,
  upgradeProjectV2ToV3,
  upgradeProjectV3ToV4,
  upgradeProjectV4ToV5,
} from "./project-seed.js";

describe("LibrarySchema", () => {
  it("parses a valid catalog", () => {
    const raw = {
      version: 1,
      projects: [
        {
          id: "p1",
          name: "Demo",
          updatedAt: "2026-07-19T12:00:00.000Z",
          midiProgramId: 1,
        },
      ],
    };
    expect(LibrarySchema.parse(raw)).toEqual(raw);
  });

  it("rejects wrong version", () => {
    expect(() =>
      LibrarySchema.parse({ version: 2, projects: [] }),
    ).toThrow();
  });
});

describe("ProjectSchemaV3", () => {
  it("parses a v3 project seed", () => {
    const raw = createProjectV3Seed(
      "abc",
      "Song",
      "2026-07-19T12:00:00.000Z",
    );
    expect(ProjectSchemaV3.parse(raw)).toEqual(raw);
    expect(raw.formatVersion).toBe(3);
  });

  it("upgrades v2 to v3", () => {
    const v2 = createProjectV2Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    expect(ProjectSchemaV2.parse(v2).formatVersion).toBe(2);
    const v3 = upgradeProjectV2ToV3(v2);
    expect(ProjectSchemaV3.parse(v3).audioTracks).toEqual([]);
  });
});

describe("ProjectSchemaV4", () => {
  it("parses a v4 project seed", () => {
    const raw = createProjectV4Seed(
      "abc",
      "Song",
      "2026-07-19T12:00:00.000Z",
    );
    expect(ProjectSchemaV4.parse(raw)).toEqual(raw);
    expect(raw.formatVersion).toBe(4);
  });

  it("upgrades v3 to v4", () => {
    const v3 = createProjectV3Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const v4 = upgradeProjectV3ToV4(v3);
    expect(ProjectSchemaV4.parse(v4).tekst.clips).toEqual([]);
  });
});

describe("ProjectSchemaV5", () => {
  it("parses a v5 project seed", () => {
    const raw = createProjectV5Seed(
      "abc",
      "Song",
      "2026-07-19T12:00:00.000Z",
    );
    expect(ProjectSchema.parse(raw)).toEqual(raw);
    expect(raw.formatVersion).toBe(5);
    expect(raw.keyMap.length).toBeGreaterThan(0);
    expect(raw.midiProgramId).toBe(0);
  });

  it("rejects unknown keys (strict)", () => {
    const raw = {
      ...createProjectV5Seed("abc", "Song", "2026-07-19T12:00:00.000Z"),
      legacyField: true,
    };
    expect(() => ProjectSchemaV5.parse(raw)).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      ProjectSchema.parse({
        ...createProjectV5Seed("abc", "X", "2026-07-19T12:00:00.000Z"),
        name: "",
      }),
    ).toThrow();
  });

  it("upgrades v4 to v5", () => {
    const v4 = createProjectV4Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const v5 = upgradeProjectV4ToV5(v4);
    expect(ProjectSchemaV5.parse(v5).keyMap[0]?.key.tonic).toBe("C");
  });

  it("rejects template with midiProgramId", () => {
    expect(() =>
      ProjectSchemaV5.parse({
        ...createProjectV5Seed("abc", "Tpl", "2026-07-19T12:00:00.000Z", {
          isTemplate: true,
        }),
        midiProgramId: 1,
      }),
    ).toThrow();
  });
});

describe("CreateProjectBodySchema", () => {
  it("requires a non-empty name", () => {
    expect(CreateProjectBodySchema.parse({ name: "New" })).toEqual({
      name: "New",
    });
    expect(() => CreateProjectBodySchema.parse({ name: "" })).toThrow();
    expect(() => CreateProjectBodySchema.parse({})).toThrow();
  });

  it("rejects names longer than 200 chars", () => {
    expect(() =>
      CreateProjectBodySchema.parse({ name: "x".repeat(201) }),
    ).toThrow();
  });
});

describe("PutProjectBodySchema", () => {
  it("parses full v5 body without id (keeps updatedAt for OCC)", () => {
    const full = createProjectV5Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const { id, ...body } = full;
    void id;
    const parsed = PutProjectBodySchema.parse(body);
    expect(parsed.name).toBe("Song");
    expect(parsed.updatedAt).toBe("2026-07-19T12:00:00.000Z");
  });

  it("rejects unknown keys", () => {
    const full = createProjectV5Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const { id, ...body } = full;
    void id;
    expect(() =>
      PutProjectBodySchema.parse({ ...body, extra: 1 }),
    ).toThrow();
  });
});
