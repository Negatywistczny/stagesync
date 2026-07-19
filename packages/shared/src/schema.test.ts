import { describe, expect, it } from "vitest";
import {
  CreateProjectBodySchema,
  LibrarySchema,
  ProjectSchema,
  UpdateProjectBodySchema,
} from "./schema.js";

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

describe("ProjectSchema", () => {
  it("parses a minimal v5 project", () => {
    const raw = {
      id: "abc",
      name: "Song",
      formatVersion: 1,
      updatedAt: "2026-07-19T12:00:00.000Z",
    };
    expect(ProjectSchema.parse(raw)).toEqual(raw);
  });

  it("rejects missing formatVersion", () => {
    expect(() =>
      ProjectSchema.parse({
        id: "abc",
        name: "Song",
        updatedAt: "2026-07-19T12:00:00.000Z",
      }),
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      ProjectSchema.parse({
        id: "abc",
        name: "",
        formatVersion: 1,
        updatedAt: "2026-07-19T12:00:00.000Z",
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

describe("UpdateProjectBodySchema", () => {
  it("allows empty object or optional name", () => {
    expect(UpdateProjectBodySchema.parse({})).toEqual({});
    expect(UpdateProjectBodySchema.parse({ name: "Renamed" })).toEqual({
      name: "Renamed",
    });
  });

  it("rejects empty name when provided", () => {
    expect(() => UpdateProjectBodySchema.parse({ name: "" })).toThrow();
  });
});
