import {
  SETLIST_DEFAULT_TIME_BUDGET_MINUTES,
  type Library,
  type Setlist,
  type SetlistItem,
} from "./schema.js";

/** Estimated duration per song when project length is unknown (UI budget only). */
export const SETLIST_SONG_DURATION_ESTIMATE_MS = Math.round(3.5 * 60 * 1000);

export type SetlistEntry = {
  id: string;
  name: string;
};

export type SetlistViewItem =
  | {
      type: "project";
      projectId: string;
      name: string;
      durationMs: number;
      estimated: boolean;
    }
  | {
      type: "break";
      id: string;
      label: string;
      durationMinutes: number;
      durationMs: number;
    };

export type SetlistView = {
  enabled: boolean;
  items: SetlistViewItem[];
  /** Project ids only (auto-advance / transport neighbors). */
  projectIds: string[];
  entries: SetlistEntry[];
  currentIndex: number;
  next: SetlistEntry | null;
  autoAdvance: { enabled: boolean };
  timeBudgetMinutes: number;
  totalDurationMs: number;
  warnings: { code: string; message: string; projectIds?: string[] }[];
};

export function projectIdsFromItems(items: SetlistItem[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (item.type !== "project") continue;
    if (seen.has(item.projectId)) continue;
    seen.add(item.projectId);
    ids.push(item.projectId);
    if (ids.length >= 256) break;
  }
  return ids;
}

export function itemsFromProjectIds(projectIds: string[]): SetlistItem[] {
  const items: SetlistItem[] = [];
  const seen = new Set<string>();
  for (const projectId of projectIds) {
    if (!projectId || seen.has(projectId)) continue;
    seen.add(projectId);
    items.push({ type: "project", projectId });
    if (items.length >= 256) break;
  }
  return items;
}

export function defaultSetlist(): Setlist {
  return {
    version: 1,
    enabled: false,
    items: [],
    projectIds: [],
    autoAdvance: { enabled: false },
    timeBudgetMinutes: SETLIST_DEFAULT_TIME_BUDGET_MINUTES,
  };
}

export function normalizeSetlist(raw: {
  enabled?: boolean;
  items?: SetlistItem[];
  projectIds?: string[];
  autoAdvance?: { enabled?: boolean };
  timeBudgetMinutes?: number;
}): Omit<Setlist, "version"> {
  let items: SetlistItem[] = [];
  if (raw.items) {
    const seenProjects = new Set<string>();
    const seenBreaks = new Set<string>();
    for (const item of raw.items) {
      if (items.length >= 256) break;
      if (item.type === "project") {
        if (!item.projectId || seenProjects.has(item.projectId)) continue;
        seenProjects.add(item.projectId);
        items.push({ type: "project", projectId: item.projectId });
      } else if (item.type === "break") {
        if (!item.id || seenBreaks.has(item.id)) continue;
        seenBreaks.add(item.id);
        const durationMinutes = Math.min(
          180,
          Math.max(1, Math.trunc(item.durationMinutes)),
        );
        const label =
          typeof item.label === "string" && item.label.trim()
            ? item.label.trim().slice(0, 120)
            : "Przerwa / Zapowiedź";
        items.push({
          type: "break",
          id: item.id,
          label,
          durationMinutes,
        });
      }
    }
  } else {
    items = itemsFromProjectIds(raw.projectIds ?? []);
  }

  const timeBudgetMinutes =
    raw.timeBudgetMinutes != null && Number.isFinite(raw.timeBudgetMinutes)
      ? Math.min(24 * 60, Math.max(1, Math.trunc(raw.timeBudgetMinutes)))
      : SETLIST_DEFAULT_TIME_BUDGET_MINUTES;

  return {
    enabled: Boolean(raw.enabled),
    items,
    projectIds: projectIdsFromItems(items),
    autoAdvance: { enabled: Boolean(raw.autoAdvance?.enabled) },
    timeBudgetMinutes,
  };
}

export function pruneSetlistToLibrary(
  setlist: Omit<Setlist, "version"> | Setlist,
  library: Library,
): Omit<Setlist, "version"> {
  const known = new Set(library.projects.map((p) => p.id));
  const source =
    setlist.items ?? itemsFromProjectIds(setlist.projectIds ?? []);
  const items: SetlistItem[] = [];
  for (const item of source) {
    if (item.type === "break") {
      items.push(item);
      continue;
    }
    if (known.has(item.projectId)) items.push(item);
  }
  return {
    enabled: setlist.enabled,
    items,
    projectIds: projectIdsFromItems(items),
    autoAdvance: { enabled: setlist.autoAdvance.enabled },
    timeBudgetMinutes:
      setlist.timeBudgetMinutes ?? SETLIST_DEFAULT_TIME_BUDGET_MINUTES,
  };
}

export function resolveSetlistNext(
  setlist: Omit<Setlist, "version"> | Setlist,
  library: Library,
  currentProjectId: string | null,
): SetlistEntry | null {
  const projectIds =
    (setlist.projectIds?.length ?? 0) > 0
      ? setlist.projectIds
      : projectIdsFromItems(setlist.items ?? []);
  if (!setlist.enabled || projectIds.length === 0) return null;
  const byId = new Map(library.projects.map((p) => [p.id, p]));
  const entries: SetlistEntry[] = [];
  for (const id of projectIds) {
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

export function formatSetDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function sumSetlistDurationMs(items: SetlistViewItem[]): number {
  return items.reduce((sum, item) => sum + item.durationMs, 0);
}

export function buildSetlistView(
  setlist: Setlist,
  library: Library,
  currentProjectId: string | null = null,
): SetlistView {
  const pruned = pruneSetlistToLibrary(setlist, library);
  const byId = new Map(library.projects.map((p) => [p.id, p]));
  const items: SetlistViewItem[] = [];
  const entries: SetlistEntry[] = [];
  const warnings: SetlistView["warnings"] = [];

  const sourceItems =
    pruned.items.length > 0 || (setlist.items?.length ?? 0) === 0
      ? pruned.items
      : itemsFromProjectIds(pruned.projectIds);

  for (const item of sourceItems) {
    if (item.type === "break") {
      items.push({
        type: "break",
        id: item.id,
        label: item.label,
        durationMinutes: item.durationMinutes,
        durationMs: item.durationMinutes * 60 * 1000,
      });
      continue;
    }
    const p = byId.get(item.projectId);
    if (p) {
      entries.push({ id: p.id, name: p.name });
      items.push({
        type: "project",
        projectId: p.id,
        name: p.name,
        durationMs: SETLIST_SONG_DURATION_ESTIMATE_MS,
        estimated: true,
      });
    }
  }

  const missing = (setlist.items ?? itemsFromProjectIds(setlist.projectIds))
    .filter(
      (item): item is Extract<SetlistItem, { type: "project" }> =>
        item.type === "project",
    )
    .map((item) => item.projectId)
    .filter((id) => !byId.has(id));
  if (missing.length) {
    warnings.push({
      code: "SETLIST_MISSING_PROJECT",
      message: `Pozycje setlisty bez projektu w bibliotece: ${missing.length}.`,
      projectIds: missing.slice(0, 8),
    });
  }

  let currentIndex = -1;
  if (currentProjectId) {
    currentIndex = entries.findIndex((e) => e.id === currentProjectId);
  }

  const next = resolveSetlistNext(pruned, library, currentProjectId);
  const timeBudgetMinutes =
    pruned.timeBudgetMinutes ?? SETLIST_DEFAULT_TIME_BUDGET_MINUTES;

  return {
    enabled: pruned.enabled,
    items,
    projectIds: entries.map((e) => e.id),
    entries,
    currentIndex,
    next,
    autoAdvance: { enabled: pruned.autoAdvance.enabled },
    timeBudgetMinutes,
    totalDurationMs: sumSetlistDurationMs(items),
    warnings,
  };
}
