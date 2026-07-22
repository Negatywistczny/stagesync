import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  LibrarySchema,
  ProjectSchemaV1,
  ProjectSchemaV2,
  ProjectSchemaV3,
  ProjectSchemaV4,
  ProjectSchemaV5,
  SetlistSchema,
  createProjectV5Seed,
  createDefaultTemplateProject,
  defaultSetlist,
  ensureFormaSubsections,
  mergePreserveById,
  nextMidiProgramId,
  normalizeSetlist,
  pruneSetlistToLibrary,
  upgradeProjectV1ToV2,
  upgradeProjectV2ToV3,
  upgradeProjectV3ToV4,
  upgradeProjectV4ToV5,
  type Library,
  type LibraryProjectEntry,
  type Project,
  type ProjectAsset,
  type PutProjectBody,
  type Setlist,
  type SetlistItem,
} from "@stagesync/shared";
import { writeJsonAtomic } from "./atomic-write.js";
import { shadowBackup } from "./shadow-backup.js";
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

/** OCC conflict — client's base `updatedAt` does not match disk. */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
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

function isProjectV3(raw: unknown): boolean {
  return (
    raw !== null &&
    typeof raw === "object" &&
    "formatVersion" in raw &&
    (raw as { formatVersion: number }).formatVersion === 3
  );
}

function isProjectV4(raw: unknown): boolean {
  return (
    raw !== null &&
    typeof raw === "object" &&
    "formatVersion" in raw &&
    (raw as { formatVersion: number }).formatVersion === 4
  );
}

function libraryEntryFromProject(project: Project): LibraryProjectEntry {
  return {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    ...(project.isTemplate === true
      ? { isTemplate: true }
      : project.midiProgramId != null
        ? { midiProgramId: project.midiProgramId }
        : {}),
    ...(project.artist ? { artist: project.artist } : {}),
    ...(project.genre ? { genre: project.genre } : {}),
    hasMusicXml: project.assets.some((a) => a.kind === "musicxml"),
  };
}

function upgradeToV5(raw: unknown): Project {
  let project: Project;
  if (isProjectV1(raw)) {
    project = upgradeProjectV4ToV5(
      upgradeProjectV3ToV4(
        upgradeProjectV2ToV3(upgradeProjectV1ToV2(ProjectSchemaV1.parse(raw))),
      ),
    );
  } else if (isProjectV2(raw)) {
    project = upgradeProjectV4ToV5(
      upgradeProjectV3ToV4(upgradeProjectV2ToV3(ProjectSchemaV2.parse(raw))),
    );
  } else if (isProjectV3(raw)) {
    project = upgradeProjectV4ToV5(
      upgradeProjectV3ToV4(ProjectSchemaV3.parse(raw)),
    );
  } else if (isProjectV4(raw)) {
    project = upgradeProjectV4ToV5(ProjectSchemaV4.parse(raw));
  } else {
    project = ProjectSchemaV5.parse(raw);
  }
  // Migrated / early-α projects often lack Forma subsections — recompute v4 4-bar.
  return ensureFormaSubsections(project);
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

  async function materializeSeedProjects(library: Library): Promise<void> {
    for (const entry of library.projects) {
      const dest = projectFile(paths, entry.id);
      try {
        await access(dest, constants.F_OK);
        continue;
      } catch (err) {
        if (errCode(err) !== "ENOENT") {
          throw new StorageError(
            `Failed to check project file for ${entry.id}`,
            err,
          );
        }
      }

      const seedPath = join(paths.seedProjectsDir, entry.id, "project.json");
      try {
        const raw = await readJsonFile(seedPath);
        await writeProject(upgradeToV5(raw));
      } catch (err) {
        if (errCode(err) === "ENOENT") continue;
        throw new StorageError(
          `Failed to materialize seed project ${entry.id}`,
          err,
        );
      }
    }
  }

  async function ensureDefaultTemplate(library: Library): Promise<Library> {
    const hasTemplate = library.projects.some((p) => p.isTemplate === true);
    if (hasTemplate) {
      await materializeSeedProjects(library);
      return library;
    }

    const updatedAt = new Date().toISOString();
    const project = createDefaultTemplateProject(updatedAt);
    await writeProject(project);
    const next: Library = {
      ...library,
      projects: [...library.projects, libraryEntryFromProject(project)],
    };
    await saveLibrary(next);
    return next;
  }

  async function ensureLibrary(): Promise<Library> {
    let library: Library;
    try {
      const raw = await readJsonFile(paths.libraryFile);
      library = LibrarySchema.parse(raw);
    } catch (err) {
      if (errCode(err) !== "ENOENT") {
        if (err instanceof Error && err.name === "ZodError") {
          throw new StorageError("Invalid library.json shape", err);
        }
        throw new StorageError("Failed to read library.json", err);
      }

      try {
        const raw = await readJsonFile(paths.libraryTemplate);
        library = LibrarySchema.parse(raw);
        await writeJsonAtomic(paths.libraryFile, library);
      } catch (seedErr) {
        throw new StorageError("Failed to seed library from template", seedErr);
      }
    }

    return ensureDefaultTemplate(library);
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

  async function readProjectRaw(id: string): Promise<unknown> {
    const safeId = assertSafeProjectId(paths, id);
    try {
      return await readJsonFile(projectFile(paths, safeId));
    } catch (err) {
      if (errCode(err) === "ENOENT") {
        throw new NotFoundError(`Project not found: ${safeId}`);
      }
      throw new StorageError(`Failed to read project ${safeId}`, err);
    }
  }

  async function readProject(id: string): Promise<Project> {
    const safeId = assertSafeProjectId(paths, id);
    try {
      const raw = await readJsonFile(projectFile(paths, safeId));
      return upgradeToV5(raw);
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
    const parsed = ProjectSchemaV5.parse(ensureFormaSubsections(project));
    const dir = projectDir(paths, parsed.id);
    await mkdir(dir, { recursive: true });
    await writeJsonAtomic(projectFile(paths, parsed.id), parsed);
  }

  function needsSchemaRewrite(raw: unknown): boolean {
    if (raw === null || typeof raw !== "object") return true;
    const fv = (raw as { formatVersion?: unknown }).formatVersion;
    return fv !== 5;
  }

  return {
    paths,

    async getLibrary(): Promise<Library> {
      return ensureLibrary();
    },

    async getSetlist(): Promise<Setlist> {
      return withLibraryLock(() => readSetlist());
    },

    /**
     * Upgrade on-disk project to v5 when `formatVersion !== 5`.
     * Shadow-backs up before overwrite. Returns true if rewritten.
     */
    async migrateProjectOnDisk(
      id: string,
      opts?: { onBackup?: (bakPath: string) => void },
    ): Promise<boolean> {
      return withLibraryLock(async () => {
        const safeId = assertSafeProjectId(paths, id);
        const file = projectFile(paths, safeId);
        const raw = await readProjectRaw(safeId);
        if (!needsSchemaRewrite(raw)) {
          // Validate shape on boot; leave v5 files untouched.
          upgradeToV5(raw);
          return false;
        }
        const upgraded = upgradeToV5(raw);
        const bak = await shadowBackup(file, "schema");
        if (bak) opts?.onBackup?.(bak);
        await writeProject(upgraded);
        const library = await ensureLibrary();
        const entryIdx = library.projects.findIndex((p) => p.id === safeId);
        const entry = libraryEntryFromProject(upgraded);
        if (entryIdx >= 0) {
          library.projects[entryIdx] = entry;
        } else {
          library.projects.push(entry);
        }
        await saveLibrary(library);
        return true;
      });
    },

    async putSetlist(body: {
      enabled: boolean;
      items?: SetlistItem[];
      projectIds?: string[];
      timeBudgetMinutes?: number;
    }): Promise<Setlist> {
      return withLibraryLock(async () => {
        const library = await ensureLibrary();
        const current = await readSetlist();
        const normalized = normalizeSetlist({
          enabled: body.enabled,
          items: body.items,
          projectIds: body.projectIds,
          autoAdvance: current.autoAdvance,
          timeBudgetMinutes:
            body.timeBudgetMinutes ?? current.timeBudgetMinutes,
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

    async createProject(
      name: string,
      opts?: { fromTemplateId?: string; isTemplate?: boolean },
    ): Promise<Project> {
      return withLibraryLock(async () => {
        const id = randomUUID();
        const updatedAt = new Date().toISOString();
        const library = await ensureLibrary();
        const isTemplate = opts?.isTemplate === true;

        let project: Project;
        if (opts?.fromTemplateId) {
          const tpl = await readProject(opts.fromTemplateId);
          if (tpl.isTemplate !== true) {
            throw new StorageError("fromTemplateId must point to a template");
          }
          const pc = nextMidiProgramId(library.projects);
          if (pc == null) {
            throw new StorageError("No free MIDI Program Change (0–127)");
          }
          project = ProjectSchemaV5.parse({
            ...tpl,
            id,
            name,
            updatedAt,
            isTemplate: undefined,
            midiProgramId: pc,
            assets: [],
            audioTracks: [],
            audioClips: [],
          });
        } else if (isTemplate) {
          project = createProjectV5Seed(id, name, updatedAt, {
            isTemplate: true,
          });
        } else {
          const pc = nextMidiProgramId(library.projects) ?? 0;
          project = createProjectV5Seed(id, name, updatedAt, {
            midiProgramId: pc,
          });
        }

        library.projects.push(libraryEntryFromProject(project));
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
        if (body.updatedAt !== existing.updatedAt) {
          throw new ConflictError(
            `Project ${safeId} was modified (stale updatedAt)`,
          );
        }
        const updatedAt = new Date().toISOString();
        const next = ProjectSchemaV5.parse({
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
        const entryIdx = library.projects.findIndex((p) => p.id === safeId);
        const entry = libraryEntryFromProject(next);
        if (entryIdx >= 0) {
          library.projects[entryIdx] = entry;
        } else {
          library.projects.push(entry);
        }
        await saveLibrary(library);
        return next;
      });
    },

    async batchMidiProgramIds(
      assignments: { id: string; midiProgramId: number }[],
    ): Promise<Library> {
      return withLibraryLock(async () => {
        const library = await ensureLibrary();
        const used = new Map<number, string>();
        for (const p of library.projects) {
          if (p.isTemplate === true || p.midiProgramId == null) continue;
          used.set(p.midiProgramId, p.id);
        }
        for (const a of assignments) {
          const owner = used.get(a.midiProgramId);
          if (owner && owner !== a.id) {
            throw new StorageError(
              `MIDI PC ${a.midiProgramId} already used by ${owner}`,
            );
          }
        }
        for (const a of assignments) {
          const project = await readProject(a.id);
          if (project.isTemplate === true) {
            throw new StorageError(`Cannot assign PC to template ${a.id}`);
          }
          const next = ProjectSchemaV5.parse({
            ...project,
            midiProgramId: a.midiProgramId,
            updatedAt: new Date().toISOString(),
          });
          await writeProject(next);
          const idx = library.projects.findIndex((p) => p.id === a.id);
          if (idx >= 0) {
            library.projects[idx] = libraryEntryFromProject(next);
          }
          used.set(a.midiProgramId, a.id);
        }
        await saveLibrary(library);
        return library;
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
          pruned.items.length !== setlist.items.length ||
          pruned.items.some((item, i) => {
            const prev = setlist.items[i];
            if (!prev || prev.type !== item.type) return true;
            if (item.type === "project" && prev.type === "project") {
              return item.projectId !== prev.projectId;
            }
            if (item.type === "break" && prev.type === "break") {
              return (
                item.id !== prev.id ||
                item.durationMinutes !== prev.durationMinutes ||
                item.label !== prev.label
              );
            }
            return true;
          })
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
      opts?: { createAudioClip?: boolean; audioTrackId?: string },
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
          let track =
            (opts?.audioTrackId
              ? audioTracks.find((t) => t.id === opts.audioTrackId)
              : undefined) ?? audioTracks[0];
          if (!track) {
            track = { id: randomUUID(), name: "Audio 1" };
            audioTracks = [track];
          }
          // Append after clips on the target track so re-uploads do not stack.
          const startTicks = audioClips
            .filter((c) => c.trackId === track.id)
            .reduce(
              (max, c) => Math.max(max, c.startTicks + c.lengthTicks),
              0,
            );
          audioClips = [
            ...audioClips,
            {
              id: randomUUID(),
              trackId: track.id,
              assetId: asset.id,
              startTicks,
              lengthTicks: 7680,
            },
          ];
        }

        const next = ProjectSchemaV5.parse({
          ...project,
          updatedAt: new Date().toISOString(),
          assets,
          audioTracks,
          audioClips,
        });
        await writeProject(next);
        const library = await ensureLibrary();
        const idx = library.projects.findIndex((p) => p.id === safeId);
        if (idx >= 0) {
          library.projects[idx] = libraryEntryFromProject(next);
          await saveLibrary(library);
        }
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
        const next = ProjectSchemaV5.parse({
          ...project,
          updatedAt: new Date().toISOString(),
          assets: project.assets.filter((a) => a.id !== assetId),
          audioClips: project.audioClips.filter((c) => c.assetId !== assetId),
        });
        await writeProject(next);
        const library = await ensureLibrary();
        const idx = library.projects.findIndex((p) => p.id === safeId);
        if (idx >= 0) {
          library.projects[idx] = libraryEntryFromProject(next);
          await saveLibrary(library);
        }
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
