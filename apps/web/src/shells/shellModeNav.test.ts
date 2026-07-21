import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLastTimelineProjectId,
  LAST_TIMELINE_PROJECT_KEY,
  setLastTimelineProjectId,
} from "../lib/lastTimelineProject.js";
import { buildShellModeNavItems } from "./shellModeNavItems.js";

describe("buildShellModeNavItems", () => {
  it("marks active mode as non-link", () => {
    const items = buildShellModeNavItems("admin", "proj-1");
    expect(items.find((i) => i.id === "admin")).toEqual({
      id: "admin",
      label: "Admin",
      href: null,
    });
    expect(items.find((i) => i.id === "timeline")?.href).toBe(
      "/timeline/proj-1",
    );
    expect(items.find((i) => i.id === "client")?.href).toBe("/client");
  });

  it("disables Timeline without project id", () => {
    const items = buildShellModeNavItems("client", null);
    expect(items.find((i) => i.id === "timeline")?.href).toBeNull();
    expect(items.find((i) => i.id === "client")?.href).toBeNull();
    expect(items.find((i) => i.id === "admin")?.href).toBe("/admin");
  });
});

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
