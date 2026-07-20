import { describe, expect, it } from "vitest";
import {
  CreateProjectBodySchema,
  LibrarySchema,
  ProjectSchema,
  ProjectSchemaV2,
  ProjectSchemaV3,
  ProjectSchemaV4,
  PutProjectBodySchema,
} from "./schema.js";
import {
  createProjectV2Seed,
  createProjectV3Seed,
  createProjectV4Seed,
  upgradeProjectV2ToV3,
  upgradeProjectV3ToV4,
} from "./project-seed.js";

describe("LibrarySchema", () => {
  it("parses a valid catalog", () => {
    const raw = {
      version: 1,
      projects: [
        { id: "p1", name: "Demo", updatedAt: "2026-07-19T12:00:00.000Z" },
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
    expect(ProjectSchema.parse(raw)).toEqual(raw);
    expect(raw.formatVersion).toBe(4);
    expect(raw.tekst.clips).toEqual([]);
    expect(raw.akordy.clips).toEqual([]);
    expect(raw.cue.clips).toEqual([]);
  });

  it("rejects unknown keys (strict)", () => {
    const raw = {
      ...createProjectV4Seed("abc", "Song", "2026-07-19T12:00:00.000Z"),
      legacyField: true,
    };
    expect(() => ProjectSchemaV4.parse(raw)).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      ProjectSchema.parse({
        ...createProjectV4Seed("abc", "X", "2026-07-19T12:00:00.000Z"),
        name: "",
      }),
    ).toThrow();
  });

  it("upgrades v3 to v4", () => {
    const v3 = createProjectV3Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const v4 = upgradeProjectV3ToV4(v3);
    expect(ProjectSchemaV4.parse(v4).tekst.clips).toEqual([]);
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
});

describe("PutProjectBodySchema", () => {
  it("parses full v4 body without id/updatedAt", () => {
    const full = createProjectV4Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const { id, updatedAt, ...body } = full;
    void id;
    void updatedAt;
    expect(PutProjectBodySchema.parse(body).name).toBe("Song");
  });

  it("rejects unknown keys", () => {
    const full = createProjectV4Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const { id, updatedAt, ...body } = full;
    void id;
    void updatedAt;
    expect(() =>
      PutProjectBodySchema.parse({ ...body, extra: 1 }),
    ).toThrow();
  });
});
