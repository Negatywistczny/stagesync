/**
 * M9: committed 4.x fixtures migrate via shared migrator (same path as CLI dry-run).
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  detectLibraryImportFormat,
  migrateLegacyDatabase,
  normalizeLibraryImport,
  type LegacyDatabase,
} from "@stagesync/shared";

const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

function loadJson(rel: string): unknown {
  return JSON.parse(readFileSync(join(REPO_ROOT, rel), "utf8")) as unknown;
}

describe("migrate-legacy fixtures (M9)", () => {
  it("migrates database.sample.json", () => {
    const raw = loadJson("docs/examples/legacy/database.sample.json");
    expect(detectLibraryImportFormat(raw)).toEqual({
      format: "legacy-database",
    });
    const result = migrateLegacyDatabase(raw as LegacyDatabase, {
      updatedAt: "2026-07-20T18:00:00.000Z",
    });
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]!.project.name).toBe("Template");
    expect(result.projects[0]!.project.formatVersion).toBe(5);
    expect(result.projects[0]!.project.forma.clips.length).toBeGreaterThan(0);
  });

  it("migrates database.typical.json (maps, cues, setlist, artist)", () => {
    const raw = loadJson("docs/examples/legacy/database.typical.json");
    const result = migrateLegacyDatabase(raw as LegacyDatabase, {
      updatedAt: "2026-07-20T18:00:00.000Z",
    });
    expect(result.projects.length).toBe(2);
    const money = result.projects.find(
      (p) => p.project.name === "Money, Money, Money",
    );
    expect(money).toBeDefined();
    expect(money!.project.artist).toBe("ABBA");
    expect(money!.project.cue.clips.length).toBeGreaterThanOrEqual(1);
    expect(money!.project.tempoMap.length).toBeGreaterThanOrEqual(1);
    expect(money!.project.meterMap.some((m) => m.numerator === 5)).toBe(true);
    expect(result.setlist.enabled).toBe(true);
    expect(result.setlist.projectIds).toHaveLength(2);
  });

  it("normalizeLibraryImport matches migrator song count on typical", () => {
    const raw = loadJson("docs/examples/legacy/database.typical.json");
    const viaNorm = normalizeLibraryImport(raw, {
      updatedAt: "2026-07-20T18:00:00.000Z",
    });
    const viaMig = migrateLegacyDatabase(raw as LegacyDatabase, {
      updatedAt: "2026-07-20T18:00:00.000Z",
    });
    expect(viaNorm.format).toBe("legacy-database");
    expect(viaNorm.projects).toHaveLength(viaMig.projects.length);
  });

  it("loads v5 pack fixture", () => {
    const raw = loadJson(
      "docs/examples/v5/library.pack.sample.stagesync.json",
    );
    expect(detectLibraryImportFormat(raw)).toEqual({ format: "v5-pack" });
    const result = normalizeLibraryImport(raw);
    expect(result.format).toBe("v5-pack");
    expect(result.projects).toHaveLength(1);
    expect((result.projects[0] as { name: string }).name).toBe("Pack Sample");
  });
});
