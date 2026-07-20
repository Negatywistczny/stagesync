import { describe, expect, it } from "vitest";
import {
  CreateProjectBodySchema,
  LibrarySchema,
  ProjectSchema,
  ProjectSchemaV2,
  PutProjectBodySchema,
} from "./schema.js";
import { createProjectV2Seed } from "./project-seed.js";

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

describe("ProjectSchemaV2", () => {
  it("parses a v2 project seed", () => {
    const raw = createProjectV2Seed(
      "abc",
      "Song",
      "2026-07-19T12:00:00.000Z",
    );
    expect(ProjectSchema.parse(raw)).toEqual(raw);
  });

  it("rejects unknown keys (strict)", () => {
    const raw = {
      ...createProjectV2Seed("abc", "Song", "2026-07-19T12:00:00.000Z"),
      legacyField: true,
    };
    expect(() => ProjectSchemaV2.parse(raw)).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      ProjectSchema.parse({
        ...createProjectV2Seed("abc", "X", "2026-07-19T12:00:00.000Z"),
        name: "",
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
});

describe("PutProjectBodySchema", () => {
  it("parses full v2 body without id/updatedAt", () => {
    const full = createProjectV2Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const { id, updatedAt, ...body } = full;
    void id;
    void updatedAt;
    expect(PutProjectBodySchema.parse(body).name).toBe("Song");
  });

  it("rejects unknown keys", () => {
    const full = createProjectV2Seed("abc", "Song", "2026-07-19T12:00:00.000Z");
    const { id, updatedAt, ...body } = full;
    void id;
    void updatedAt;
    expect(() =>
      PutProjectBodySchema.parse({ ...body, extra: 1 }),
    ).toThrow();
  });
});
