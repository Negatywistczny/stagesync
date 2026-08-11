import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import {
  LibrarySchema,
  createDefaultTemplateProject,
  type Library,
  type LibraryProjectEntry,
  type Project,
} from "@stagesync/shared";
import { writeJsonAtomic } from "./atomic-write.js";
import { type DataPaths, projectFile } from "./paths.js";
import { StorageError, errCode } from "./errors.js";
import {
  libraryEntryFromProject,
  readJsonFile,
  upgradeToV6,
} from "./project-migrations.js";

export async function saveLibrary(
  paths: DataPaths,
  library: Library,
): Promise<void> {
  await writeJsonAtomic(paths.libraryFile, LibrarySchema.parse(library));
}

export async function materializeSeedProjects(
  paths: DataPaths,
  library: Library,
  writeProject: (project: Project) => Promise<void>,
): Promise<void> {
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
      await writeProject(upgradeToV6(raw));
    } catch (err) {
      if (errCode(err) === "ENOENT") continue;
      throw new StorageError(
        `Failed to materialize seed project ${entry.id}`,
        err,
      );
    }
  }
}

export async function ensureDefaultTemplate(
  paths: DataPaths,
  library: Library,
  writeProject: (project: Project) => Promise<void>,
): Promise<Library> {
  const hasTemplate = library.projects.some((p) => p.isTemplate === true);
  if (hasTemplate) {
    await materializeSeedProjects(paths, library, writeProject);
    return library;
  }

  const updatedAt = new Date().toISOString();
  const project = createDefaultTemplateProject(updatedAt);
  await writeProject(project);
  const next: Library = {
    ...library,
    projects: [...library.projects, libraryEntryFromProject(project)],
  };
  await saveLibrary(paths, next);
  return next;
}

export async function enrichLibraryCatalogMeta(
  paths: DataPaths,
  library: Library,
  readProject: (id: string) => Promise<Project>,
): Promise<Library> {
  const needsEnrich = library.projects.some((p) => p.defaultBpm == null);
  if (!needsEnrich) return library;

  let dirty = false;
  const projects: LibraryProjectEntry[] = [];
  for (const entry of library.projects) {
    if (entry.defaultBpm != null) {
      projects.push(entry);
      continue;
    }
    try {
      const project = await readProject(entry.id);
      projects.push(libraryEntryFromProject(project));
      dirty = true;
    } catch {
      projects.push(entry);
    }
  }
  if (!dirty) return library;
  const next = LibrarySchema.parse({ ...library, projects });
  await saveLibrary(paths, next);
  return next;
}

export async function ensureLibrary(
  paths: DataPaths,
  writeProject: (project: Project) => Promise<void>,
  readProject: (id: string) => Promise<Project>,
): Promise<Library> {
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

  return enrichLibraryCatalogMeta(
    paths,
    await ensureDefaultTemplate(paths, library, writeProject),
    readProject,
  );
}
