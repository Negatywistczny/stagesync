import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  detectLibraryImportFormat,
  looksLikeZipBytes,
  normalizeLibraryImport,
  ZIP_IMPORT_UNSUPPORTED_PL,
} from "./library-import.js";

const REPO_EXAMPLES = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../docs/examples/legacy/database.sample.json",
);

describe("looksLikeZipBytes", () => {
  it("detects ZIP local file header", () => {
    expect(looksLikeZipBytes(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(
      true,
    );
  });

  it("rejects JSON text", () => {
    const enc = new TextEncoder().encode('{"songs":[]}');
    expect(looksLikeZipBytes(enc)).toBe(false);
  });
});

describe("detectLibraryImportFormat", () => {
  it("detects v5 pack", () => {
    expect(
      detectLibraryImportFormat({
        stagesyncExportVersion: 3,
        projects: [{ name: "A" }],
      }),
    ).toEqual({ format: "v5-pack" });
    expect(detectLibraryImportFormat({ projects: [] })).toEqual({
      format: "v5-pack",
    });
  });

  it("detects legacy database.json", () => {
    expect(
      detectLibraryImportFormat({ schemaVersion: 4, songs: [{ id: "s1" }] }),
    ).toEqual({ format: "legacy-database" });
  });

  it("prefers projects over songs when both present", () => {
    expect(
      detectLibraryImportFormat({ projects: [{}], songs: [{}] }),
    ).toEqual({ format: "v5-pack" });
  });

  it("returns unknown with Polish reason", () => {
    const r = detectLibraryImportFormat({ foo: 1 });
    expect(r.format).toBe("unknown");
    if (r.format === "unknown") {
      expect(r.reason).toMatch(/projects|songs/);
    }
  });
});

describe("normalizeLibraryImport", () => {
  it("passes through v5 pack projects", () => {
    const projects = [{ name: "Demo", formatVersion: 5 }];
    const result = normalizeLibraryImport({
      stagesyncExportVersion: 3,
      projects,
    });
    expect(result.format).toBe("v5-pack");
    expect(result.projects).toBe(projects);
    expect(result.warnings).toEqual([]);
  });

  it("rejects empty v5 pack", () => {
    expect(() => normalizeLibraryImport({ projects: [] })).toThrow(/puste/);
  });

  it("migrates docs/examples legacy fixture", () => {
    const raw = JSON.parse(readFileSync(REPO_EXAMPLES, "utf8")) as unknown;
    expect(detectLibraryImportFormat(raw)).toEqual({
      format: "legacy-database",
    });
    const result = normalizeLibraryImport(raw, {
      updatedAt: "2026-07-20T18:00:00.000Z",
    });
    expect(result.format).toBe("legacy-database");
    expect(result.projects.length).toBeGreaterThanOrEqual(1);
    const first = result.projects[0] as {
      formatVersion: number;
      name: string;
      forma: { clips: unknown[] };
    };
    expect(first.formatVersion).toBe(5);
    expect(first.name).toBe("Template");
    expect(first.forma.clips.length).toBeGreaterThan(0);
  });

  it("throws on unknown format", () => {
    expect(() => normalizeLibraryImport({})).toThrow(/Nieznany format/);
  });
});

describe("ZIP_IMPORT_UNSUPPORTED_PL", () => {
  it("is a non-empty Polish message", () => {
    expect(ZIP_IMPORT_UNSUPPORTED_PL).toMatch(/ZIP/);
    expect(ZIP_IMPORT_UNSUPPORTED_PL.length).toBeGreaterThan(20);
  });
});
