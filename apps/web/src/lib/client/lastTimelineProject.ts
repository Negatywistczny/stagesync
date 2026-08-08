/** localStorage keys for last / recent Timeline projects (native OS menu Faza B). */

import { ProjectIdSchema } from "@stagesync/shared";

export const LAST_TIMELINE_PROJECT_KEY = "stagesync:lastTimelineProjectId";
export const RECENT_TIMELINE_PROJECTS_KEY = "stagesync:recentTimelineProjects";

export const MAX_RECENT_TIMELINE_PROJECTS = 8;

export type RecentTimelineProject = {
  id: string;
  name: string;
};

function isProjectId(id: string): boolean {
  return ProjectIdSchema.safeParse(id).success;
}

export function getLastTimelineProjectId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_TIMELINE_PROJECT_KEY);
    if (!raw) return null;
    if (!isProjectId(raw)) {
      localStorage.removeItem(LAST_TIMELINE_PROJECT_KEY);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function setLastTimelineProjectId(id: string | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (id && isProjectId(id)) {
      localStorage.setItem(LAST_TIMELINE_PROJECT_KEY, id);
    } else {
      localStorage.removeItem(LAST_TIMELINE_PROJECT_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

function parseRecent(raw: string | null): RecentTimelineProject[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: RecentTimelineProject[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const id = (item as { id?: unknown }).id;
      const name = (item as { name?: unknown }).name;
      if (typeof id !== "string" || !id.trim()) continue;
      const trimmedId = id.trim();
      if (!isProjectId(trimmedId)) continue;
      out.push({
        id: trimmedId,
        name: typeof name === "string" && name.trim() ? name.trim() : trimmedId,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function getRecentTimelineProjects(): RecentTimelineProject[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return parseRecent(localStorage.getItem(RECENT_TIMELINE_PROJECTS_KEY)).slice(
      0,
      MAX_RECENT_TIMELINE_PROJECTS,
    );
  } catch {
    return [];
  }
}

/** Push project to the front of Open Recent; also updates last-id. */
export function pushRecentTimelineProject(
  id: string,
  name: string,
): RecentTimelineProject[] {
  const trimmedId = id.trim();
  if (!trimmedId || !isProjectId(trimmedId)) return getRecentTimelineProjects();
  const entry: RecentTimelineProject = {
    id: trimmedId,
    name: name.trim() || trimmedId,
  };
  const next = [
    entry,
    ...getRecentTimelineProjects().filter((p) => p.id !== trimmedId),
  ].slice(0, MAX_RECENT_TIMELINE_PROJECTS);

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(RECENT_TIMELINE_PROJECTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  setLastTimelineProjectId(trimmedId);
  return next;
}
