/**
 * Auto-detect + normalize Admin/CLI library import payloads.
 *
 * Supports:
 * - v5 pack: `{ projects: [...] }` or `{ stagesyncExportVersion: 3, projects }`
 * - Legacy 4.x monolith: `database.json` with `songs[]`
 *
 * ZIP / binary `.stagesync` archives: detect early — not supported (MVP JSON).
 */

import {
  migrateLegacyDatabase,
  type LegacyDatabase,
} from "./legacy-migrate.js";

export type LibraryImportFormat = "v5-pack" | "legacy-database";

export type DetectLibraryImportResult =
  | { format: LibraryImportFormat }
  | { format: "unknown"; reason: string };

export type NormalizeLibraryImportResult = {
  format: LibraryImportFormat;
  /** Project-shaped objects ready for server Zod + createProject. */
  projects: unknown[];
  warnings: string[];
};

/** PK\x03\x04 / PK\x05\x06 / PK\x07\x08 — ZIP local/central/empty. */
export function looksLikeZipBytes(bytes: ArrayBuffer | Uint8Array): boolean {
  const u8 =
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8.length < 4) return false;
  return u8[0] === 0x50 && u8[1] === 0x4b && (u8[2] === 0x03 || u8[2] === 0x05 || u8[2] === 0x07);
}

export const ZIP_IMPORT_UNSUPPORTED_PL =
  "Import archiwum ZIP / .stagesync nie jest jeszcze obsługiwany. Użyj pliku JSON: pakietu v5 (.stagesync.json) albo legacy database.json.";

/**
 * Detect library import format from parsed JSON.
 *
 * Rules (first match wins):
 * 1. object + `projects` is array → v5-pack
 * 2. object + `songs` is array → legacy-database
 * 3. else → unknown
 */
export function detectLibraryImportFormat(
  raw: unknown,
): DetectLibraryImportResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      format: "unknown",
      reason:
        "Oczekiwano obiektu JSON: pakiet v5 ({ projects }) lub legacy database.json ({ songs }).",
    };
  }
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.projects)) {
    return { format: "v5-pack" };
  }
  if (Array.isArray(obj.songs)) {
    return { format: "legacy-database" };
  }
  return {
    format: "unknown",
    reason:
      "Nieznany format: brak tablicy projects (v5) ani songs (legacy database.json).",
  };
}

/**
 * Detect format and produce a list of project payloads for `/api/library/import`.
 * Legacy DBs are migrated via `migrateLegacyDatabase` (fail fast if none succeed).
 */
export function normalizeLibraryImport(
  raw: unknown,
  options?: { updatedAt?: string },
): NormalizeLibraryImportResult {
  const detected = detectLibraryImportFormat(raw);
  if (detected.format === "unknown") {
    throw new Error(detected.reason);
  }

  if (detected.format === "v5-pack") {
    const projects = (raw as { projects: unknown[] }).projects;
    if (projects.length === 0) {
      throw new Error("Pakiet v5 nie zawiera żadnych projektów (projects[] puste).");
    }
    if (projects.length > 1024) {
      throw new Error("Pakiet v5 zawiera zbyt wiele projektów (max 1024).");
    }
    return { format: "v5-pack", projects, warnings: [] };
  }

  const migrated = migrateLegacyDatabase(raw as LegacyDatabase, {
    updatedAt: options?.updatedAt,
  });
  if (migrated.projects.length > 1024) {
    throw new Error("Legacy database zawiera zbyt wiele utworów (max 1024).");
  }
  return {
    format: "legacy-database",
    projects: migrated.projects.map((r) => r.project),
    warnings: migrated.warnings,
  };
}
