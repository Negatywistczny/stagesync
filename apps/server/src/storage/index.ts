import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, readFile, rm } from "node:fs/promises";
import {
  LibrarySchema,
  ProjectSchema,
  type Library,
  type Project,
} from "@stagesync/shared";
import { writeJsonAtomic } from "./atomic-write.js";
import {
  type DataPaths,
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

function errCode(err: unknown): string | undefined {
  return err && typeof err === "object" && "code" in err
    ? (err as NodeJS.ErrnoException).code
    : undefined;
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text) as unknown;
}

export function createStores(dataDir?: string) {
  const paths: DataPaths = resolveDataPaths(dataDir);

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
    try {
      const raw = await readJsonFile(projectFile(paths, id));
      return ProjectSchema.parse(raw);
    } catch (err) {
      if (errCode(err) === "ENOENT") {
        throw new NotFoundError(`Project not found: ${id}`);
      }
      if (err instanceof Error && err.name === "ZodError") {
        throw new StorageError(`Invalid project.json for ${id}`, err);
      }
      throw new StorageError(`Failed to read project ${id}`, err);
    }
  }

  async function writeProject(project: Project): Promise<void> {
    const parsed = ProjectSchema.parse(project);
    await writeJsonAtomic(projectFile(paths, parsed.id), parsed);
  }

  return {
    paths,

    async getLibrary(): Promise<Library> {
      return ensureLibrary();
    },

    async createProject(name: string): Promise<Project> {
      const id = randomUUID();
      const updatedAt = new Date().toISOString();
      const project: Project = {
        id,
        name,
        formatVersion: 1,
        updatedAt,
      };
      await writeProject(project);
      const library = await ensureLibrary();
      library.projects.push({ id, name, updatedAt });
      await saveLibrary(library);
      return project;
    },

    async getProject(id: string): Promise<Project> {
      return readProject(id);
    },

    async updateProject(
      id: string,
      patch: { name?: string },
    ): Promise<Project> {
      const current = await readProject(id);
      const updatedAt = new Date().toISOString();
      const next: Project = {
        ...current,
        name: patch.name ?? current.name,
        updatedAt,
      };
      await writeProject(next);

      const library = await ensureLibrary();
      const entry = library.projects.find((p) => p.id === id);
      if (!entry) {
        library.projects.push({
          id: next.id,
          name: next.name,
          updatedAt: next.updatedAt,
        });
      } else {
        entry.name = next.name;
        entry.updatedAt = next.updatedAt;
      }
      await saveLibrary(library);
      return next;
    },

    async deleteProject(id: string): Promise<void> {
      const library = await ensureLibrary();
      const idx = library.projects.findIndex((p) => p.id === id);

      let onDisk = false;
      try {
        await access(projectFile(paths, id), constants.F_OK);
        onDisk = true;
      } catch {
        onDisk = false;
      }

      if (idx === -1 && !onDisk) {
        throw new NotFoundError(`Project not found: ${id}`);
      }

      if (onDisk) {
        try {
          await rm(projectDir(paths, id), { recursive: true, force: true });
        } catch (err) {
          throw new StorageError(`Failed to delete project ${id}`, err);
        }
      }

      if (idx !== -1) {
        library.projects.splice(idx, 1);
        await saveLibrary(library);
      }
    },
  };
}

export type Stores = ReturnType<typeof createStores>;
