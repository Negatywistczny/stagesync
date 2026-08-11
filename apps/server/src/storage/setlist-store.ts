import {
  SetlistSchema,
  defaultSetlist,
  normalizeSetlist,
  pruneSetlistToLibrary,
  type Library,
  type Setlist,
  type SetlistItem,
} from "@stagesync/shared";
import { writeJsonAtomic } from "./atomic-write.js";
import { type DataPaths } from "./paths.js";
import { StorageError, errCode } from "./errors.js";
import { readJsonFile } from "./project-migrations.js";

export async function readSetlist(paths: DataPaths): Promise<Setlist> {
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

export async function saveSetlist(
  paths: DataPaths,
  setlist: Setlist,
): Promise<void> {
  await writeJsonAtomic(paths.setlistFile, SetlistSchema.parse(setlist));
}

export async function putSetlist(
  paths: DataPaths,
  body: {
    enabled: boolean;
    items?: SetlistItem[];
    projectIds?: string[];
    timeBudgetMinutes?: number;
  },
  ensureLibrary: () => Promise<Library>,
): Promise<Setlist> {
  const library = await ensureLibrary();
  const current = await readSetlist(paths);
  const normalized = normalizeSetlist({
    enabled: body.enabled,
    items: body.items,
    projectIds: body.projectIds,
    autoAdvance: current.autoAdvance,
    timeBudgetMinutes: body.timeBudgetMinutes ?? current.timeBudgetMinutes,
  });
  const pruned = pruneSetlistToLibrary(normalized, library);
  const next = SetlistSchema.parse({
    version: 1 as const,
    ...pruned,
  });
  await saveSetlist(paths, next);
  return next;
}

export async function patchSetlistAutoAdvance(
  paths: DataPaths,
  enabled: boolean,
): Promise<Setlist> {
  const current = await readSetlist(paths);
  const next = SetlistSchema.parse({
    ...current,
    autoAdvance: { enabled },
  });
  await saveSetlist(paths, next);
  return next;
}
