import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, rm } from "node:fs/promises";
import {
  ProjectSchema,
  SetlistSchema,
  createProjectV6Seed,
  ensureFormaSubsections,
  mergePreserveById,
  nextMidiProgramId,
  pruneSetlistToLibrary,
  type Library,
  type Project,
  type PutProjectBody,
  type Setlist,
} from "@stagesync/shared";
import { writeJsonAtomic } from "./atomic-write.js";
import { shadowBackup } from "./shadow-backup.js";
import {
  type DataPaths,
  assertSafeProjectId,
  projectDir,
  projectFile,
} from "./paths.js";
import {
  ConflictError,
  NotFoundError,
  StorageError,
  errCode,
} from "./errors.js";
import {
  libraryEntryFromProject,
  needsSchemaRewrite,
  readJsonFile,
  upgradeToV6,
} from "./project-migrations.js";
import { saveLibrary } from "./library-store.js";
import { saveSetlist } from "./setlist-store.js";

export async function readProjectRaw(
  paths: DataPaths,
  id: string,
): Promise<unknown> {
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

export async function readProject(
  paths: DataPaths,
  id: string,
): Promise<Project> {
  const safeId = assertSafeProjectId(paths, id);
  try {
    const raw = await readJsonFile(projectFile(paths, safeId));
    return upgradeToV6(raw);
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

export async function writeProject(
  paths: DataPaths,
  project: Project,
): Promise<void> {
  const parsed = ProjectSchema.parse(ensureFormaSubsections(project));
  const dir = projectDir(paths, parsed.id);
  await mkdir(dir, { recursive: true });
  await writeJsonAtomic(projectFile(paths, parsed.id), parsed);
}

export async function migrateProjectOnDisk(
  paths: DataPaths,
  id: string,
  opts: { onBackup?: (bakPath: string) => void } | undefined,
  ensureLibrary: () => Promise<Library>,
): Promise<boolean> {
  const safeId = assertSafeProjectId(paths, id);
  const file = projectFile(paths, safeId);
  const raw = await readProjectRaw(paths, safeId);
  if (!needsSchemaRewrite(raw)) {
    // Validate shape on boot; leave v6 files untouched.
    upgradeToV6(raw);
    return false;
  }
  const upgraded = upgradeToV6(raw);
  const bak = await shadowBackup(file, "schema");
  if (bak) opts?.onBackup?.(bak);
  await writeProject(paths, upgraded);
  const library = await ensureLibrary();
  const entryIdx = library.projects.findIndex((p) => p.id === safeId);
  const entry = libraryEntryFromProject(upgraded);
  if (entryIdx >= 0) {
    library.projects[entryIdx] = entry;
  } else {
    library.projects.push(entry);
  }
  await saveLibrary(paths, library);
  return true;
}

export async function createProject(
  paths: DataPaths,
  name: string,
  opts: { fromTemplateId?: string; isTemplate?: boolean } | undefined,
  ensureLibrary: () => Promise<Library>,
): Promise<Project> {
  const id = randomUUID();
  const updatedAt = new Date().toISOString();
  const library = await ensureLibrary();
  const isTemplate = opts?.isTemplate === true;

  let project: Project;
  if (opts?.fromTemplateId) {
    const tpl = await readProject(paths, opts.fromTemplateId);
    if (tpl.isTemplate !== true) {
      throw new StorageError("fromTemplateId must point to a template");
    }
    const pc = nextMidiProgramId(library.projects);
    if (pc == null) {
      throw new StorageError("No free MIDI Program Change (0–127)");
    }
    project = ProjectSchema.parse({
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
    project = createProjectV6Seed(id, name, updatedAt, {
      isTemplate: true,
    });
  } else {
    const pc = nextMidiProgramId(library.projects) ?? 0;
    project = createProjectV6Seed(id, name, updatedAt, {
      midiProgramId: pc,
    });
  }

  library.projects.push(libraryEntryFromProject(project));
  await saveLibrary(paths, library);
  await writeProject(paths, project);
  return project;
}

export async function putProject(
  paths: DataPaths,
  id: string,
  body: PutProjectBody,
  ensureLibrary: () => Promise<Library>,
): Promise<Project> {
  const safeId = assertSafeProjectId(paths, id);
  const existing = await readProject(paths, safeId);
  if (body.updatedAt !== existing.updatedAt) {
    throw new ConflictError(`Project ${safeId} was modified (stale updatedAt)`);
  }
  const updatedAt = new Date().toISOString();
  // Assets: union-preserve — concurrent upload must not vanish if PUT
  // omits a freshly written asset id. Tracks/clips: client is SSOT (delete
  // must stick on Save); do not re-merge deleted rows from disk.
  const next = ProjectSchema.parse({
    ...body,
    id: safeId,
    updatedAt,
    assets: mergePreserveById(existing.assets, body.assets),
    audioTracks: body.audioTracks,
    audioClips: body.audioClips,
  });
  await writeProject(paths, next);
  const library = await ensureLibrary();
  const entryIdx = library.projects.findIndex((p) => p.id === safeId);
  const entry = libraryEntryFromProject(next);
  if (entryIdx >= 0) {
    library.projects[entryIdx] = entry;
  } else {
    library.projects.push(entry);
  }
  await saveLibrary(paths, library);
  return next;
}

export async function batchMidiProgramIds(
  paths: DataPaths,
  assignments: { id: string; midiProgramId: number }[],
  ensureLibrary: () => Promise<Library>,
): Promise<Library> {
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
    const project = await readProject(paths, a.id);
    if (project.isTemplate === true) {
      throw new StorageError(`Cannot assign PC to template ${a.id}`);
    }
    const next = ProjectSchema.parse({
      ...project,
      midiProgramId: a.midiProgramId,
      updatedAt: new Date().toISOString(),
    });
    await writeProject(paths, next);
    const idx = library.projects.findIndex((p) => p.id === a.id);
    if (idx >= 0) {
      library.projects[idx] = libraryEntryFromProject(next);
    }
    used.set(a.midiProgramId, a.id);
  }
  await saveLibrary(paths, library);
  return library;
}

export async function deleteProject(
  paths: DataPaths,
  id: string,
  ensureLibrary: () => Promise<Library>,
  readSetlist: () => Promise<Setlist>,
): Promise<void> {
  const safeId = assertSafeProjectId(paths, id);
  const library = await ensureLibrary();
  const idx = library.projects.findIndex((p) => p.id === safeId);

  let onDisk = false;
  try {
    await access(projectFile(paths, safeId), constants.F_OK);
    onDisk = true;
  } catch {
    /* missing on disk */
  }

  if (idx === -1 && !onDisk) {
    throw new NotFoundError(`Project not found: ${safeId}`);
  }

  if (idx !== -1) {
    library.projects.splice(idx, 1);
    await saveLibrary(paths, library);
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
      paths,
      SetlistSchema.parse({ version: 1 as const, ...pruned }),
    );
  }

  if (onDisk) {
    try {
      await rm(projectDir(paths, safeId), {
        recursive: true,
        force: true,
      });
    } catch (err) {
      throw new StorageError(`Failed to delete project ${safeId}`, err);
    }
  }
}
