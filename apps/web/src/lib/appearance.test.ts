import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyAppearance,
  applyHostThemeDefault,
  hasStoredAppearance,
  initAppearance,
  readAppearance,
  setAppearance,
} from "./appearance.js";

describe("appearance", () => {
  const store = new Map<string, string>();
  const rootAttrs = new Map<string, string>();
  let themeMetaContent = "";

  beforeEach(() => {
    store.clear();
    rootAttrs.clear();
    themeMetaContent = "";
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    });
    vi.stubGlobal("document", {
      documentElement: {
        setAttribute: (k: string, v: string) => {
          rootAttrs.set(k, v);
        },
        removeAttribute: (k: string) => {
          rootAttrs.delete(k);
        },
      },
      querySelector: (sel: string) => {
        if (sel === 'meta[name="theme-color"]') {
          return {
            setAttribute: (_k: string, v: string) => {
              themeMetaContent = v;
            },
          };
        }
        return null;
      },
    });
    vi.stubGlobal("getComputedStyle", () => ({
      getPropertyValue: () => "",
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to booth", () => {
    expect(readAppearance()).toEqual({ profile: "booth" });
  });

  it("setAppearance persists and applies DOM attrs", () => {
    const next = setAppearance({ profile: "daylight" });
    expect(next).toEqual({ profile: "daylight" });
    expect(store.get("stagesync-appearance-profile")).toBe("daylight");
    expect(rootAttrs.get("data-theme")).toBe("daylight");
    expect(rootAttrs.has("data-contrast")).toBe(false);
    expect(themeMetaContent).toBe("#f4f4f5");

    setAppearance({ profile: "booth" });
    expect(rootAttrs.get("data-theme")).toBe("booth");
    expect(themeMetaContent).toBe("#000000");
  });

  it("migrates legacy light/high to daylight", () => {
    store.set("stagesync-theme", "light");
    store.set("stagesync-contrast", "high");
    const state = initAppearance();
    expect(state.profile).toBe("daylight");
    expect(store.get("stagesync-appearance-profile")).toBe("daylight");
    expect(store.has("stagesync-theme")).toBe(false);
    expect(rootAttrs.get("data-theme")).toBe("daylight");
  });

  it("migrates legacy dark-high to booth", () => {
    store.set("stagesync-theme", "dark");
    store.set("stagesync-contrast", "high");
    expect(readAppearance().profile).toBe("booth");
  });

  it("applyAppearance clears legacy contrast attr", () => {
    rootAttrs.set("data-contrast", "high");
    applyAppearance({ profile: "midnight" });
    expect(rootAttrs.get("data-theme")).toBe("midnight");
    expect(rootAttrs.has("data-contrast")).toBe(false);
  });

  it("theme-color prefers --ss-color-bg when computed", () => {
    vi.stubGlobal("getComputedStyle", () => ({
      getPropertyValue: (name: string) =>
        name === "--ss-color-bg" ? "#112233" : "",
    }));
    applyAppearance({ profile: "daylight" });
    expect(themeMetaContent).toBe("#112233");
  });

  it("read/set tolerate private-mode localStorage throws", () => {
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
    expect(readAppearance()).toEqual({ profile: "booth" });
    expect(() => setAppearance({ profile: "neon" })).not.toThrow();
  });

  it("applyHostThemeDefault only when localStorage empty", () => {
    expect(hasStoredAppearance()).toBe(false);
    expect(applyHostThemeDefault("light")).toEqual({ profile: "daylight" });
    expect(rootAttrs.get("data-theme")).toBe("daylight");
    expect(hasStoredAppearance()).toBe(false);

    setAppearance({ profile: "booth" });
    expect(applyHostThemeDefault("neon")).toBeNull();
    expect(rootAttrs.get("data-theme")).toBe("booth");
  });

  it("hasStoredAppearance is true after set and false on storage throw", () => {
    expect(hasStoredAppearance()).toBe(false);
    setAppearance({ profile: "matrix" });
    expect(hasStoredAppearance()).toBe(true);

    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    });
    expect(hasStoredAppearance()).toBe(false);
  });
});
