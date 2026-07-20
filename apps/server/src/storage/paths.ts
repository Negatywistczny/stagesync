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
  projectsDir: string;
};

export function resolveDataPaths(dataDir = defaultDataDir()): DataPaths {
  return {
    dataDir,
    libraryFile: join(dataDir, "library", "library.json"),
    libraryTemplate: join(REPO_ROOT, "data/library/library.template.json"),
    projectsDir: join(dataDir, "projects"),
  };
}

export function defaultDataDir(): string {
  return process.env.STAGESYNC_DATA_DIR ?? join(REPO_ROOT, "data");
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
