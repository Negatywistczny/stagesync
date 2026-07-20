import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import {
  LibrarySchema,
  ProjectSchemaV1,
  ProjectSchemaV2,
  ProjectSchemaV3,
  SetlistSchema,
  createProjectV3Seed,
  defaultSetlist,
  mergePreserveById,
  normalizeSetlist,
  pruneSetlistToLibrary,
  upgradeProjectV1ToV2,
  upgradeProjectV2ToV3,
  type Library,
  type Project,
  type ProjectAsset,
  type PutProjectBody,
  type Setlist,
} from "@stagesync/shared";
import { writeJsonAtomic } from "./atomic-write.js";
import {
  type DataPaths,
  assertSafeProjectId,
  assetFilePath,
  projectAssetsDir,
  projectDir,
  projectFile,
  resolveDataPaths,
} from "./paths.js";

export class StorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export { InvalidProjectIdError } from "./paths.js";

function errCode(err: unknown): string | undefined {
  return err && typeof err === "object" && "code" in err
    ? (err as NodeJS.ErrnoException).code
    : undefined;
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text) as unknown;
}

function isProjectV1(raw: unknown): boolean {
  return (
    raw !== null &&
    typeof raw === "object" &&
    "formatVersion" in raw &&
    (raw as { formatVersion: number }).formatVersion === 1
  );
}

function isProjectV2(raw: unknown): boolean {
  return (
    raw !== null &&
    typeof raw === "object" &&
    "formatVersion" in raw &&
    (raw as { formatVersion: number }).formatVersion === 2
  );
}

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

  async function ensureLibrary(): Promise<Library> {
    try {
      const raw = await readJsonFile(paths.libraryFile);
      return LibrarySchema.parse(raw);
    } catch (err) {
      if (errCode(err) !== "ENOENT") {
        if (err instanceof Error && err.name === "ZodError") {
          throw new StorageError("Invalid library.json shape", err);
        }
        throw new StorageError("Failed to read library.json", err);
      }
    }

    try {
      const raw = await readJsonFile(paths.libraryTemplate);
      const library = LibrarySchema.parse(raw);
      await writeJsonAtomic(paths.libraryFile, library);
      return library;
    } catch (err) {
      throw new StorageError("Failed to seed library from template", err);
    }
  }

  async function saveLibrary(library: Library): Promise<void> {
    await writeJsonAtomic(paths.libraryFile, LibrarySchema.parse(library));
  }

  async function readSetlist(): Promise<Setlist> {
    try {
      const raw = await readJsonFile(paths.setlistFile);
      return SetlistSchema.parse(raw);
    } catch (err) {
      if (errCode(err) === "ENOENT") {
        const seed = SetlistSchema.parse(defaultSetlist());
        await writeJsonAtomic(paths.setlistFile, seed);
        return seed;
      }
      if (err instanceof Error && err.name === "ZodError") {
        throw new StorageError("Invalid setlist.json shape", err);
      }
      throw new StorageError("Failed to read setlist.json", err);
    }
  }

  async function saveSetlist(setlist: Setlist): Promise<void> {
    await writeJsonAtomic(paths.setlistFile, SetlistSchema.parse(setlist));
  }

  async function readProject(id: string): Promise<Project> {
    const safeId = assertSafeProjectId(paths, id);
    try {
      const raw = await readJsonFile(projectFile(paths, safeId));
      if (isProjectV1(raw)) {
        return upgradeProjectV2ToV3(
          upgradeProjectV1ToV2(ProjectSchemaV1.parse(raw)),
        );
      }
      if (isProjectV2(raw)) {
        return upgradeProjectV2ToV3(ProjectSchemaV2.parse(raw));
      }
      return ProjectSchemaV3.parse(raw);
    } catch (err) {
      if (errCode(err) === "ENOENT") {
        throw new NotFoundError(`Project not found: ${safeId}`);
      }
      if (err instanceof Error && err.name === "ZodError") {
        throw new StorageError(`Invalid project.json for ${safeId}`, err);
      }
      throw new StorageError(`Failed to read project ${safeId}`, err);
    }
  }

  async function writeProject(project: Project): Promise<void> {
    const parsed = ProjectSchemaV3.parse(project);
    const dir = projectDir(paths, parsed.id);
    await mkdir(dir, { recursive: true });
    await writeJsonAtomic(projectFile(paths, parsed.id), parsed);
  }

  return {
    paths,

    async getLibrary(): Promise<Library> {
      return ensureLibrary();
    },

    async getSetlist(): Promise<Setlist> {
      return withLibraryLock(() => readSetlist());
    },

    async putSetlist(body: {
      enabled: boolean;
      projectIds: string[];
    }): Promise<Setlist> {
      return withLibraryLock(async () => {
        const library = await ensureLibrary();
        const current = await readSetlist();
        const normalized = normalizeSetlist({
          enabled: body.enabled,
          projectIds: body.projectIds,
          autoAdvance: current.autoAdvance,
        });
        const pruned = pruneSetlistToLibrary(normalized, library);
        const next = SetlistSchema.parse({
          version: 1 as const,
          ...pruned,
        });
        await saveSetlist(next);
        return next;
      });
    },

    async patchSetlistAutoAdvance(enabled: boolean): Promise<Setlist> {
      return withLibraryLock(async () => {
        const current = await readSetlist();
        const next = SetlistSchema.parse({
          ...current,
          autoAdvance: { enabled },
        });
        await saveSetlist(next);
        return next;
      });
    },

    async createProject(name: string): Promise<Project> {
      return withLibraryLock(async () => {
        const id = randomUUID();
        const updatedAt = new Date().toISOString();
        const project = createProjectV3Seed(id, name, updatedAt);
        const library = await ensureLibrary();
        library.projects.push({ id, name, updatedAt });
        await saveLibrary(library);
        await writeProject(project);
        return project;
      });
    },

    async getProject(id: string): Promise<Project> {
      return readProject(id);
    },

    async putProject(id: string, body: PutProjectBody): Promise<Project> {
      return withLibraryLock(async () => {
        const safeId = assertSafeProjectId(paths, id);
        const existing = await readProject(safeId);
        const updatedAt = new Date().toISOString();
        const next = ProjectSchemaV3.parse({
          ...body,
          id: safeId,
          updatedAt,
          assets: mergePreserveById(existing.assets, body.assets),
          audioTracks: mergePreserveById(
            existing.audioTracks,
            body.audioTracks,
          ),
          audioClips: mergePreserveById(existing.audioClips, body.audioClips),
        });
        await writeProject(next);
        const library = await ensureLibrary();
        const entry = library.projects.find((p) => p.id === safeId);
        if (entry) {
          entry.name = next.name;
          entry.updatedAt = updatedAt;
        } else {
          library.projects.push({
            id: safeId,
            name: next.name,
            updatedAt,
          });
        }
        await saveLibrary(library);
        return next;
      });
    },

    async deleteProject(id: string): Promise<void> {
      return withLibraryLock(async () => {
        const safeId = assertSafeProjectId(paths, id);
        const library = await ensureLibrary();
        const idx = library.projects.findIndex((p) => p.id === safeId);

        let onDisk = false;
        try {
          await access(projectFile(paths, safeId), constants.F_OK);
          onDisk = true;
        } catch {
          onDisk = false;
        }

        if (idx === -1 && !onDisk) {
          throw new NotFoundError(`Project not found: ${safeId}`);
        }

        if (idx !== -1) {
          library.projects.splice(idx, 1);
          await saveLibrary(library);
        }

        const setlist = await readSetlist();
        const pruned = pruneSetlistToLibrary(setlist, library);
        if (
          pruned.projectIds.length !== setlist.projectIds.length ||
          pruned.projectIds.some((pid, i) => pid !== setlist.projectIds[i])
        ) {
          await saveSetlist(
            SetlistSchema.parse({ version: 1 as const, ...pruned }),
          );
        }

        if (onDisk) {
          try {
            await rm(projectDir(paths, safeId), { recursive: true, force: true });
          } catch (err) {
            throw new StorageError(`Failed to delete project ${safeId}`, err);
          }
        }
      });
    },

    async addProjectAsset(
      projectId: string,
      asset: ProjectAsset,
      fileBytes: Buffer,
      opts?: { createAudioClip?: boolean },
    ): Promise<Project> {
      return withLibraryLock(async () => {
        const safeId = assertSafeProjectId(paths, projectId);
        const project = await readProject(safeId);
        const assetsDir = projectAssetsDir(paths, safeId);
        await mkdir(assetsDir, { recursive: true });
        const dest = assetFilePath(paths, safeId, asset.storageName);
        await writeFile(dest, fileBytes);

        const assets = [...project.assets, asset];
        let audioTracks = [...project.audioTracks];
        let audioClips = [...project.audioClips];

        if (opts?.createAudioClip !== false && asset.kind === "audio") {
          let track = audioTracks[0];
          if (!track) {
            track = { id: randomUUID(), name: "Audio 1" };
            audioTracks = [track];
          }
          audioClips = [
            ...audioClips,
            {
              id: randomUUID(),
              trackId: track.id,
              assetId: asset.id,
              startTicks: 0,
              lengthTicks: 7680,
            },
          ];
        }

        const next = ProjectSchemaV3.parse({
          ...project,
          updatedAt: new Date().toISOString(),
          assets,
          audioTracks,
          audioClips,
        });
        await writeProject(next);
        return next;
      });
    },

    async deleteProjectAsset(
      projectId: string,
      assetId: string,
    ): Promise<Project> {
      return withLibraryLock(async () => {
        const safeId = assertSafeProjectId(paths, projectId);
        const project = await readProject(safeId);
        const asset = project.assets.find((a) => a.id === assetId);
        if (!asset) {
          throw new NotFoundError(`Asset not found: ${assetId}`);
        }
        try {
          await unlink(assetFilePath(paths, safeId, asset.storageName));
        } catch (err) {
          if (errCode(err) !== "ENOENT") {
            throw new StorageError(`Failed to delete asset file ${assetId}`, err);
          }
        }
        const next = ProjectSchemaV3.parse({
          ...project,
          updatedAt: new Date().toISOString(),
          assets: project.assets.filter((a) => a.id !== assetId),
          audioClips: project.audioClips.filter((c) => c.assetId !== assetId),
        });
        await writeProject(next);
        return next;
      });
    },

    async getAssetFilePath(
      projectId: string,
      assetId: string,
    ): Promise<{ path: string; asset: ProjectAsset }> {
      const project = await readProject(projectId);
      const asset = project.assets.find((a) => a.id === assetId);
      if (!asset) {
        throw new NotFoundError(`Asset not found: ${assetId}`);
      }
      return {
        path: assetFilePath(paths, projectId, asset.storageName),
        asset,
      };
    },
  };
}

export type Stores = ReturnType<typeof createStores>;
