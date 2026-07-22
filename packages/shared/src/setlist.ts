import type { Library, Setlist } from "./schema.js";

export type SetlistEntry = {
  id: string;
  name: string;
};

export type SetlistView = {
  enabled: boolean;
  projectIds: string[];
  entries: SetlistEntry[];
  currentIndex: number;
  next: SetlistEntry | null;
  autoAdvance: { enabled: boolean };
  warnings: { code: string; message: string; projectIds?: string[] }[];
};

export function defaultSetlist(): Setlist {
  return {
    version: 1,
    enabled: false,
    projectIds: [],
    autoAdvance: { enabled: false },
  };
}

export function normalizeSetlist(raw: {
  enabled?: boolean;
  projectIds?: string[];
  autoAdvance?: { enabled?: boolean };
}): Omit<Setlist, "version"> {
  const seen = new Set<string>();
  const projectIds: string[] = [];
  for (const id of raw.projectIds ?? []) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    projectIds.push(id);
    if (projectIds.length >= 256) break;
  }
  return {
    enabled: Boolean(raw.enabled),
    projectIds,
    autoAdvance: { enabled: Boolean(raw.autoAdvance?.enabled) },
  };
}

export function pruneSetlistToLibrary(
  setlist: Omit<Setlist, "version"> | Setlist,
  library: Library,
): Omit<Setlist, "version"> {
  const known = new Set(library.projects.map((p) => p.id));
  return {
    enabled: setlist.enabled,
    projectIds: setlist.projectIds.filter((id) => known.has(id)),
    autoAdvance: { enabled: setlist.autoAdvance.enabled },
  };
}

export function resolveSetlistNext(
  setlist: Omit<Setlist, "version"> | Setlist,
  library: Library,
  currentProjectId: string | null,
): SetlistEntry | null {
  if (!setlist.enabled || setlist.projectIds.length === 0) return null;
  const byId = new Map(library.projects.map((p) => [p.id, p]));
  const entries: SetlistEntry[] = [];
  for (const id of setlist.projectIds) {
    const p = byId.get(id);
    if (p) entries.push({ id: p.id, name: p.name });
  }
  if (entries.length === 0) return null;

  let currentIndex = -1;
  if (currentProjectId) {
    currentIndex = entries.findIndex((e) => e.id === currentProjectId);
  }
  if (currentIndex >= 0 && currentIndex < entries.length - 1) {
    return entries[currentIndex + 1] ?? null;
  }
  if (currentIndex < 0) {
    return entries[0] ?? null;
  }
  return null;
}

export function buildSetlistView(
  setlist: Setlist,
  library: Library,
  currentProjectId: string | null = null,
): SetlistView {
  const pruned = pruneSetlistToLibrary(setlist, library);
  const byId = new Map(library.projects.map((p) => [p.id, p]));
  const entries: SetlistEntry[] = [];
  const warnings: SetlistView["warnings"] = [];

  for (const id of pruned.projectIds) {
    const p = byId.get(id);
    if (p) entries.push({ id: p.id, name: p.name });
  }

  const missing = setlist.projectIds.filter((id) => !byId.has(id));
  if (missing.length) {
    warnings.push({
      code: "SETLIST_MISSING_PROJECT",
      message: `Pozycje setlisty bez projektu w bibliotece: ${missing.length}.`,
      projectIds: missing,
    });
  }

  let currentIndex = -1;
  if (currentProjectId) {
    currentIndex = entries.findIndex((e) => e.id === currentProjectId);
  }

  const next = resolveSetlistNext(pruned, library, currentProjectId);

  return {
    enabled: pruned.enabled,
    projectIds: entries.map((e) => e.id),
    entries,
    currentIndex,
    next,
    autoAdvance: { enabled: pruned.autoAdvance.enabled },
    warnings,
  };
}
