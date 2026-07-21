import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLastTimelineProjectId,
  getRecentTimelineProjects,
  LAST_TIMELINE_PROJECT_KEY,
  pushRecentTimelineProject,
  RECENT_TIMELINE_PROJECTS_KEY,
  setLastTimelineProjectId,
} from "./lastTimelineProject.js";

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
  return store;
}

describe("lastTimelineProject", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and reads project id", () => {
    const store = stubStorage();

    expect(getLastTimelineProjectId()).toBeNull();
    setLastTimelineProjectId("abc");
    expect(getLastTimelineProjectId()).toBe("abc");
    expect(store.get(LAST_TIMELINE_PROJECT_KEY)).toBe("abc");
    setLastTimelineProjectId(null);
    expect(getLastTimelineProjectId()).toBeNull();
  });

  it("pushes recent projects to the front and caps length", () => {
    const store = stubStorage();
    pushRecentTimelineProject("a", "Alpha");
    pushRecentTimelineProject("b", "Beta");
    pushRecentTimelineProject("a", "Alpha 2");

    expect(getRecentTimelineProjects()).toEqual([
      { id: "a", name: "Alpha 2" },
      { id: "b", name: "Beta" },
    ]);
    expect(getLastTimelineProjectId()).toBe("a");
    expect(store.get(RECENT_TIMELINE_PROJECTS_KEY)).toContain("Alpha 2");
  });
});
