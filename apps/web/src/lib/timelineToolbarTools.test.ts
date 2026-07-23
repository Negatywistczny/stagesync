import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TOOLBAR_VISIBLE,
  loadToolbarVisibleTools,
  normalizeToolbarVisible,
  saveToolbarVisibleTools,
  toggleToolbarVisibleTool,
  TOOLBAR_TOOLS_STORAGE_KEY,
} from "./timelineToolbarTools.js";

describe("timelineToolbarTools", () => {
  it("normalize keeps stable order, drops unknown, forces pointer", () => {
    expect(normalizeToolbarVisible(["zoom", "bogus", "pencil"])).toEqual([
      "pointer",
      "pencil",
      "zoom",
    ]);
    expect(normalizeToolbarVisible([])).toEqual(["pointer"]);
  });

  it("default visible set is compact live tools", () => {
    expect(DEFAULT_TOOLBAR_VISIBLE).toEqual([
      "pointer",
      "pencil",
      "eraser",
      "scissors",
    ]);
  });

  it("toggle cannot remove pointer; adds/removes others", () => {
    const base = [...DEFAULT_TOOLBAR_VISIBLE];
    expect(toggleToolbarVisibleTool(base, "pointer")).toEqual(base);
    expect(toggleToolbarVisibleTool(base, "join")).toEqual([
      ...base,
      "join",
    ]);
    expect(toggleToolbarVisibleTool([...base, "join"], "join")).toEqual(base);
  });

  it("load/save round-trip via storage", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };
    expect(loadToolbarVisibleTools(storage)).toEqual([
      ...DEFAULT_TOOLBAR_VISIBLE,
    ]);
    saveToolbarVisibleTools(["zoom", "pencil"], storage);
    expect(JSON.parse(store.get(TOOLBAR_TOOLS_STORAGE_KEY)!)).toEqual([
      "pointer",
      "pencil",
      "zoom",
    ]);
    expect(loadToolbarVisibleTools(storage)).toEqual([
      "pointer",
      "pencil",
      "zoom",
    ]);
  });

  it("load tolerates bad JSON and throws", () => {
    expect(
      loadToolbarVisibleTools({
        getItem: () => "not-json",
      }),
    ).toEqual([...DEFAULT_TOOLBAR_VISIBLE]);
    expect(
      loadToolbarVisibleTools({
        getItem: () => '{"nope":true}',
      }),
    ).toEqual([...DEFAULT_TOOLBAR_VISIBLE]);
    expect(
      loadToolbarVisibleTools({
        getItem: () => {
          throw new Error("boom");
        },
      }),
    ).toEqual([...DEFAULT_TOOLBAR_VISIBLE]);
  });

  it("default storage arg uses localStorage when defined", () => {
    const getItem = vi.fn(() =>
      JSON.stringify(["marquee", "pointer", "fade"]),
    );
    vi.stubGlobal("localStorage", { getItem, setItem: vi.fn() });
    expect(loadToolbarVisibleTools()).toEqual([
      "pointer",
      "fade",
      "marquee",
    ]);
    expect(getItem).toHaveBeenCalledWith(TOOLBAR_TOOLS_STORAGE_KEY);
    vi.unstubAllGlobals();
  });

  it("default storage arg is null when localStorage is undefined", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadToolbarVisibleTools()).toEqual([...DEFAULT_TOOLBAR_VISIBLE]);
    vi.unstubAllGlobals();
  });
});
