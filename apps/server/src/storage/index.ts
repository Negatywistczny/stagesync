import {
  type Library,
  type Project,
  type ProjectAsset,
  type PutProjectBody,
  type Setlist,
  type SetlistItem,
} from "@stagesync/shared";
import { type DataPaths, resolveDataPaths } from "./paths.js";
import { ensureLibrary } from "./library-store.js";
import {
  patchSetlistAutoAdvance,
  putSetlist,
  readSetlist,
} from "./setlist-store.js";
import {
  batchMidiProgramIds,
  createProject,
  deleteProject,
  migrateProjectOnDisk,
  putProject,
  readProject,
  writeProject,
} from "./project-store.js";
import {
  addProjectAsset,
  deleteProjectAsset,
  getAssetFilePath,
} from "./asset-store.js";

export {
  ConflictError,
  NotFoundError,
  StorageError,
  InvalidProjectIdError,
} from "./errors.js";

export function createStores(dataDir?: string) {
  const paths: DataPaths = resolveDataPaths(dataDir);
  let libraryChain: Promise<void> = Promise.resolve();

  function withLibraryLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = libraryChain.then(fn, fn);
    libraryChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  const readProjectFn = (id: string) => readProject(paths, id);
  const writeProjectFn = (project: Project) => writeProject(paths, project);
  const ensureLibraryFn = () =>
    ensureLibrary(paths, writeProjectFn, readProjectFn);
  const readSetlistFn = () => readSetlist(paths);

  return {
    paths,

    async getLibrary(): Promise<Library> {
      return ensureLibraryFn();
    },

    async getSetlist(): Promise<Setlist> {
      return withLibraryLock(readSetlistFn);
    },

    /**
     * Upgrade on-disk project to v6 when `formatVersion !== 6`.
     * Shadow-backs up before overwrite. Returns true if rewritten.
     */
    async migrateProjectOnDisk(
      id: string,
      opts?: { onBackup?: (bakPath: string) => void },
    ): Promise<boolean> {
      return withLibraryLock(() =>
        migrateProjectOnDisk(paths, id, opts, ensureLibraryFn),
      );
    },

    async putSetlist(body: {
      enabled: boolean;
      items?: SetlistItem[];
      projectIds?: string[];
      timeBudgetMinutes?: number;
    }): Promise<Setlist> {
      return withLibraryLock(() => putSetlist(paths, body, ensureLibraryFn));
    },

    async patchSetlistAutoAdvance(enabled: boolean): Promise<Setlist> {
      return withLibraryLock(() => patchSetlistAutoAdvance(paths, enabled));
    },

    async createProject(
      name: string,
      opts?: { fromTemplateId?: string; isTemplate?: boolean },
    ): Promise<Project> {
      return withLibraryLock(() =>
        createProject(paths, name, opts, ensureLibraryFn),
      );
    },

    async getProject(id: string): Promise<Project> {
      return readProjectFn(id);
    },

    async putProject(id: string, body: PutProjectBody): Promise<Project> {
      return withLibraryLock(() =>
        putProject(paths, id, body, ensureLibraryFn),
      );
    },

    async batchMidiProgramIds(
      assignments: { id: string; midiProgramId: number }[],
    ): Promise<Library> {
      return withLibraryLock(() =>
        batchMidiProgramIds(paths, assignments, ensureLibraryFn),
      );
    },

    async deleteProject(id: string): Promise<void> {
      return withLibraryLock(() =>
        deleteProject(paths, id, ensureLibraryFn, readSetlistFn),
      );
    },

    async addProjectAsset(
      projectId: string,
      asset: ProjectAsset,
      fileBytes: Buffer,
      opts?: {
        createAudioClip?: boolean;
        audioTrackId?: string;
        /** When set (e.g. Pencil @ click), place clip here instead of appending. */
        startTicks?: number;
      },
    ): Promise<Project> {
      return withLibraryLock(() =>
        addProjectAsset(
          paths,
          projectId,
          asset,
          fileBytes,
          opts,
          readProjectFn,
          writeProjectFn,
          ensureLibraryFn,
        ),
      );
    },

    async deleteProjectAsset(
      projectId: string,
      assetId: string,
    ): Promise<Project> {
      return withLibraryLock(() =>
        deleteProjectAsset(
          paths,
          projectId,
          assetId,
          readProjectFn,
          writeProjectFn,
          ensureLibraryFn,
        ),
      );
    },

    async getAssetFilePath(
      projectId: string,
      assetId: string,
    ): Promise<{ path: string; asset: ProjectAsset }> {
      return getAssetFilePath(paths, projectId, assetId, readProjectFn);
    },
  };
}

export type Stores = ReturnType<typeof createStores>;
