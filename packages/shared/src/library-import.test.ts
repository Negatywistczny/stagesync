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

  it("rejects null, arrays, and non-objects as unknown", () => {
    for (const raw of [null, [], 42, "x"]) {
      const r = detectLibraryImportFormat(raw);
      expect(r.format).toBe("unknown");
      if (r.format === "unknown") {
        expect(r.reason).toMatch(/Oczekiwano obiektu JSON/);
      }
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

  it("rejects v5 pack with more than 1024 projects", () => {
    const projects = Array.from({ length: 1025 }, (_, i) => ({
      name: `P${i}`,
      formatVersion: 5,
    }));
    expect(() =>
      normalizeLibraryImport({
        stagesyncExportVersion: 3,
        projects,
      }),
    ).toThrow(/max 1024/);
  });

  it("rejects legacy database with more than 1024 migrated songs", () => {
    const template = {
      id: "song-1",
      title: "T",
      formatVersion: 4,
      key: { tonic: "C", mode: "major" },
      tempo: 120,
      markers: [{ id: "mk-end", kind: "END", startAbs: 8 }],
      sections: [
        { id: 0, name: "Countdown", startAbs: 0 },
        { id: 1, name: "Verse", startAbs: 4 },
      ],
      vocal: { lines: [] },
      chords: { clips: [] },
    };
    const songs = Array.from({ length: 1025 }, (_, i) => ({
      ...template,
      id: `song-${i}`,
      title: `Song ${i}`,
    }));
    expect(() =>
      normalizeLibraryImport(
        {
          schemaVersion: 4,
          songFormatMigrationRev: 8,
          songs,
        },
        { updatedAt: "2026-07-20T18:00:00.000Z" },
      ),
    ).toThrow(/max 1024/);
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

  it("migrates docs/examples typical legacy fixture", () => {
    const typical = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../docs/examples/legacy/database.typical.json",
    );
    const raw = JSON.parse(readFileSync(typical, "utf8")) as unknown;
    const result = normalizeLibraryImport(raw, {
      updatedAt: "2026-07-20T18:00:00.000Z",
    });
    expect(result.format).toBe("legacy-database");
    expect(result.projects).toHaveLength(2);
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
