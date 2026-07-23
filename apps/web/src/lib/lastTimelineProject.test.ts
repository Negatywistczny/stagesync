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

  const ID_A = "00000000-0000-4000-8000-00000000000a";
  const ID_B = "00000000-0000-4000-8000-00000000000b";

  it("persists and reads project id", () => {
    const store = stubStorage();

    expect(getLastTimelineProjectId()).toBeNull();
    setLastTimelineProjectId(ID_A);
    expect(getLastTimelineProjectId()).toBe(ID_A);
    expect(store.get(LAST_TIMELINE_PROJECT_KEY)).toBe(ID_A);
    setLastTimelineProjectId(null);
    expect(getLastTimelineProjectId()).toBeNull();
  });

  it("rejects non-uuid last project ids", () => {
    const store = stubStorage();
    setLastTimelineProjectId("abc");
    expect(getLastTimelineProjectId()).toBeNull();
    expect(store.has(LAST_TIMELINE_PROJECT_KEY)).toBe(false);
    store.set(LAST_TIMELINE_PROJECT_KEY, "not-a-uuid");
    expect(getLastTimelineProjectId()).toBeNull();
    expect(store.has(LAST_TIMELINE_PROJECT_KEY)).toBe(false);
  });

  it("pushes recent projects to the front and caps length", () => {
    const store = stubStorage();
    pushRecentTimelineProject(ID_A, "Alpha");
    pushRecentTimelineProject(ID_B, "Beta");
    pushRecentTimelineProject(ID_A, "Alpha 2");

    expect(getRecentTimelineProjects()).toEqual([
      { id: ID_A, name: "Alpha 2" },
      { id: ID_B, name: "Beta" },
    ]);
    expect(getLastTimelineProjectId()).toBe(ID_A);
    expect(store.get(RECENT_TIMELINE_PROJECTS_KEY)).toContain("Alpha 2");
  });

  it("tolerates private-mode throws and invalid payloads", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    });
    expect(getLastTimelineProjectId()).toBeNull();
    expect(() => setLastTimelineProjectId("00000000-0000-4000-8000-000000000001")).not.toThrow();
    expect(getRecentTimelineProjects()).toEqual([]);
    // Returns in-memory list even when persist throws
    expect(
      pushRecentTimelineProject("00000000-0000-4000-8000-000000000001", "A"),
    ).toEqual([
      { id: "00000000-0000-4000-8000-000000000001", name: "A" },
    ]);
  });

  it("clears invalid last id and skips bad recent JSON entries", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
    store.set(LAST_TIMELINE_PROJECT_KEY, "not-a-uuid");
    expect(getLastTimelineProjectId()).toBeNull();
    store.set(RECENT_TIMELINE_PROJECTS_KEY, "{bad");
    expect(getRecentTimelineProjects()).toEqual([]);
    store.set(
      RECENT_TIMELINE_PROJECTS_KEY,
      JSON.stringify([
        null,
        { id: 1 },
        { id: "bad" },
        { id: "00000000-0000-4000-8000-000000000002", name: "  " },
        { id: "00000000-0000-4000-8000-000000000003", name: "Ok" },
      ]),
    );
    const recent = getRecentTimelineProjects();
    expect(recent.some((r) => r.id.endsWith("0003"))).toBe(true);
  });

});
