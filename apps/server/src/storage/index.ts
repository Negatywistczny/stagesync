import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, rm } from "node:fs/promises";
import {
  LibrarySchema,
  ProjectSchemaV1,
  ProjectSchemaV2,
  createProjectV2Seed,
  upgradeProjectV1ToV2,
  type Library,
  type Project,
  type PutProjectBody,
} from "@stagesync/shared";
import { writeJsonAtomic } from "./atomic-write.js";
import {
  type DataPaths,
  assertSafeProjectId,
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

  async function readProject(id: string): Promise<Project> {
    const safeId = assertSafeProjectId(paths, id);
    try {
      const raw = await readJsonFile(projectFile(paths, safeId));
      if (isProjectV1(raw)) {
        return upgradeProjectV1ToV2(ProjectSchemaV1.parse(raw));
      }
      return ProjectSchemaV2.parse(raw);
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
    const parsed = ProjectSchemaV2.parse(project);
    const dir = projectDir(paths, parsed.id);
    await mkdir(dir, { recursive: true });
    await writeJsonAtomic(projectFile(paths, parsed.id), parsed);
  }

  return {
    paths,

    async getLibrary(): Promise<Library> {
      return ensureLibrary();
    },

    async createProject(name: string): Promise<Project> {
      return withLibraryLock(async () => {
        const id = randomUUID();
        const updatedAt = new Date().toISOString();
        const project = createProjectV2Seed(id, name, updatedAt);
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
        await readProject(safeId);
        const updatedAt = new Date().toISOString();
        const next = ProjectSchemaV2.parse({
          ...body,
          id: safeId,
          updatedAt,
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

        if (onDisk) {
          try {
            await rm(projectDir(paths, safeId), { recursive: true, force: true });
          } catch (err) {
            throw new StorageError(`Failed to delete project ${safeId}`, err);
          }
        }
      });
    },
  };
}

export type Stores = ReturnType<typeof createStores>;
