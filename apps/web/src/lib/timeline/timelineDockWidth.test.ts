import { describe, expect, it, vi } from "vitest";
import {
  clampDockWidth,
  DEFAULT_DOCK_WIDTH_PX,
  DOCK_WIDTH_KEY,
  dockWidthEffective,
  loadDockWidth,
  MAX_DOCK_WIDTH_PX,
  MIN_DOCK_WIDTH_PX,
  saveDockWidth,
} from "./timelineDockWidth.js";

describe("timelineDockWidth", () => {
  it("clamps to min/max", () => {
    expect(clampDockWidth(10)).toBe(MIN_DOCK_WIDTH_PX);
    expect(clampDockWidth(999)).toBe(MAX_DOCK_WIDTH_PX);
    expect(clampDockWidth(160.4)).toBe(160);
    expect(clampDockWidth(Number.NaN)).toBe(DEFAULT_DOCK_WIDTH_PX);
  });

  it("dockWidthEffective applies UI scale", () => {
    expect(dockWidthEffective(120, 1)).toBe(120);
    expect(dockWidthEffective(120, 1.25)).toBe(150);
  });

  it("load/save round-trip via storage", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };
    expect(loadDockWidth(storage)).toBe(DEFAULT_DOCK_WIDTH_PX);
    saveDockWidth(200, storage);
    expect(store.get(DOCK_WIDTH_KEY)).toBe("200");
    expect(loadDockWidth(storage)).toBe(200);
  });

  it("load clamps and tolerates bad JSON", () => {
    const storage = {
      getItem: () => "9999",
      setItem: () => {},
    };
    expect(loadDockWidth(storage)).toBe(MAX_DOCK_WIDTH_PX);
    expect(
      loadDockWidth({
        getItem: () => {
          throw new Error("boom");
        },
      }),
    ).toBe(DEFAULT_DOCK_WIDTH_PX);
  });

  it("default storage arg uses localStorage when defined", () => {
    const getItem = vi.fn(() => "180");
    vi.stubGlobal("localStorage", { getItem, setItem: vi.fn() });
    expect(loadDockWidth()).toBe(180);
    expect(getItem).toHaveBeenCalledWith(DOCK_WIDTH_KEY);
    vi.unstubAllGlobals();
  });

  it("default storage arg is null when localStorage is undefined", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadDockWidth()).toBe(DEFAULT_DOCK_WIDTH_PX);
    vi.unstubAllGlobals();
  });
});
