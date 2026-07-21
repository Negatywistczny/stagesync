import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLastTimelineProjectId,
  LAST_TIMELINE_PROJECT_KEY,
  setLastTimelineProjectId,
} from "./lastTimelineProject.js";

describe("lastTimelineProject", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and reads project id", () => {
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

    expect(getLastTimelineProjectId()).toBeNull();
    setLastTimelineProjectId("abc");
    expect(getLastTimelineProjectId()).toBe("abc");
    expect(store.get(LAST_TIMELINE_PROJECT_KEY)).toBe("abc");
    setLastTimelineProjectId(null);
    expect(getLastTimelineProjectId()).toBeNull();
  });
});
