import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

export function projectDir(paths: DataPaths, id: string): string {
  return join(paths.projectsDir, id);
}

export function projectFile(paths: DataPaths, id: string): string {
  return join(projectDir(paths, id), "project.json");
}
