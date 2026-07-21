/** localStorage key for last opened Timeline project (native OS menu). */
export const LAST_TIMELINE_PROJECT_KEY = "stagesync:lastTimelineProjectId";

export function getLastTimelineProjectId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(LAST_TIMELINE_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function setLastTimelineProjectId(id: string | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (id) {
      localStorage.setItem(LAST_TIMELINE_PROJECT_KEY, id);
    } else {
      localStorage.removeItem(LAST_TIMELINE_PROJECT_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}
