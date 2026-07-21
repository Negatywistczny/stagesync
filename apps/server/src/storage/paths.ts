import { resolve, sep } from "node:path";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ProjectIdSchema } from "@stagesync/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Monorepo root (apps/server/src/storage → ../../../../). */
export const REPO_ROOT = join(__dirname, "../../../..");

export type DataPaths = {
  dataDir: string;
  libraryFile: string;
  libraryTemplate: string;
  setlistFile: string;
  projectsDir: string;
};

export function resolveDataPaths(dataDir = defaultDataDir()): DataPaths {
  return {
    dataDir,
    libraryFile: join(dataDir, "library", "library.json"),
    libraryTemplate: join(REPO_ROOT, "data/library/library.template.json"),
    setlistFile: join(dataDir, "library", "setlist.json"),
    projectsDir: join(dataDir, "projects"),
  };
}

/**
 * Resolve the data root used at runtime.
 *
 * Priority:
 * 1. `STAGESYNC_DATA_DIR` env — explicit override (Docker, CI, custom installs).
 * 2. Dev mode (`STAGESYNC_REPO_DEV=1`) — keep data under repo `data/` so
 *    developers don't accidentally write to ~/Documents.
 * 3. Desktop / user host — `~/Documents/StageSync` (MuseScore-style; macOS + Win).
 * 4. Fallback — repo `data/` (no HOME detected; server-less environments).
 */
export function defaultDataDir(): string {
  if (process.env.STAGESYNC_DATA_DIR) return process.env.STAGESYNC_DATA_DIR;
  if (process.env.STAGESYNC_REPO_DEV) return join(REPO_ROOT, "data");
  const home = process.env.HOME ?? process.env.USERPROFILE ?? null;
  if (home) return join(home, "Documents", "StageSync");
  return join(REPO_ROOT, "data");
}

export class InvalidProjectIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidProjectIdError";
  }
}

/** Validates UUID and ensures resolved path stays under projectsDir. */
export function assertSafeProjectId(paths: DataPaths, rawId: string): string {
  const id = ProjectIdSchema.parse(rawId);
  const root = resolve(paths.projectsDir);
  const dir = resolve(root, id);
  if (dir !== root && !dir.startsWith(root + sep)) {
    throw new InvalidProjectIdError(`Invalid project id: ${rawId}`);
  }
  return id;
}

export function projectDir(paths: DataPaths, id: string): string {
  const safeId = assertSafeProjectId(paths, id);
  return join(paths.projectsDir, safeId);
}

export function projectFile(paths: DataPaths, id: string): string {
  return join(projectDir(paths, id), "project.json");
}

export function projectAssetsDir(paths: DataPaths, id: string): string {
  return join(projectDir(paths, id), "assets");
}

export function assetFilePath(
  paths: DataPaths,
  projectId: string,
  storageName: string,
): string {
  if (
    !storageName ||
    storageName.includes("..") ||
    storageName.includes("/") ||
    storageName.includes("\\")
  ) {
    throw new InvalidProjectIdError(`Invalid asset storage name: ${storageName}`);
  }
  const root = resolve(projectAssetsDir(paths, projectId));
  const file = resolve(root, storageName);
  if (file !== root && !file.startsWith(root + sep)) {
    throw new InvalidProjectIdError(`Invalid asset path: ${storageName}`);
  }
  return file;
}
