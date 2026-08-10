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

const V5_PACK_SAMPLE = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../docs/examples/v5/library.pack.sample.stagesync.json",
);

describe("looksLikeZipBytes", () => {
  it("detects ZIP local file header", () => {
    expect(looksLikeZipBytes(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(
      true,
    );
  });

  it("detects empty / central ZIP signatures and ArrayBuffer input", () => {
    expect(looksLikeZipBytes(new Uint8Array([0x50, 0x4b, 0x05, 0x06]))).toBe(
      true,
    );
    expect(looksLikeZipBytes(new Uint8Array([0x50, 0x4b, 0x07, 0x08]))).toBe(
      true,
    );
    const ab = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer;
    expect(looksLikeZipBytes(ab)).toBe(true);
  });

  it("rejects short buffers and non-ZIP prefixes", () => {
    expect(looksLikeZipBytes(new Uint8Array([0x50, 0x4b, 0x03]))).toBe(false);
    expect(looksLikeZipBytes(new Uint8Array([]))).toBe(false);
    expect(looksLikeZipBytes(new Uint8Array([0x50, 0x4b, 0x01, 0x02]))).toBe(
      false,
    );
  });

  it("rejects JSON text", () => {
    const enc = new TextEncoder().encode('{"projects":[]}');
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

  it("rejects songs[] (4.x) as unknown", () => {
    const r = detectLibraryImportFormat({
      schemaVersion: 4,
      songs: [{ id: "s1" }],
    });
    expect(r.format).toBe("unknown");
    if (r.format === "unknown") {
      expect(r.reason).toMatch(/tylko pakiet v5/);
    }
  });

  it("prefers projects over songs when both present", () => {
    expect(detectLibraryImportFormat({ projects: [{}], songs: [{}] })).toEqual({
      format: "v5-pack",
    });
  });

  it("returns unknown with Polish reason", () => {
    const r = detectLibraryImportFormat({ foo: 1 });
    expect(r.format).toBe("unknown");
    if (r.format === "unknown") {
      expect(r.reason).toMatch(/projects|pakiet v5/);
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

  it("rejects songs[] (4.x) format", () => {
    expect(() =>
      normalizeLibraryImport({
        schemaVersion: 4,
        songs: [{ id: "s1" }],
      }),
    ).toThrow(/tylko pakiet v5/);
  });

  it("normalizes docs/examples v5 pack sample", () => {
    const raw = JSON.parse(readFileSync(V5_PACK_SAMPLE, "utf8")) as unknown;
    expect(detectLibraryImportFormat(raw)).toEqual({ format: "v5-pack" });
    const result = normalizeLibraryImport(raw);
    expect(result.format).toBe("v5-pack");
    expect(result.projects.length).toBeGreaterThanOrEqual(1);
    const first = result.projects[0] as {
      formatVersion: number;
      name: string;
    };
    expect(first.formatVersion).toBeGreaterThanOrEqual(5);
    expect(typeof first.name).toBe("string");
  });

  it("throws on unknown format", () => {
    expect(() => normalizeLibraryImport({})).toThrow(
      /Nieznany format|pakiet v5/,
    );
  });
});

describe("ZIP_IMPORT_UNSUPPORTED_PL", () => {
  it("is a non-empty Polish message", () => {
    expect(ZIP_IMPORT_UNSUPPORTED_PL).toMatch(/ZIP/);
    expect(ZIP_IMPORT_UNSUPPORTED_PL.length).toBeGreaterThan(20);
    expect(ZIP_IMPORT_UNSUPPORTED_PL).not.toMatch(/legacy|database\.json/i);
  });
});
