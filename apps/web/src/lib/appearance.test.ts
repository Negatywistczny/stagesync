import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyAppearance,
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to dark / normal contrast", () => {
    expect(readAppearance()).toEqual({ light: false, highContrast: false });
  });

  it("setAppearance persists and applies DOM attrs", () => {
    const next = setAppearance({ light: true, highContrast: true });
    expect(next).toEqual({ light: true, highContrast: true });
    expect(store.get("stagesync-theme")).toBe("light");
    expect(store.get("stagesync-contrast")).toBe("high");
    expect(rootAttrs.get("data-theme")).toBe("light");
    expect(rootAttrs.get("data-contrast")).toBe("high");
    expect(themeMetaContent).toBe("#f4f4f5");

    setAppearance({ light: false, highContrast: false });
    expect(rootAttrs.has("data-theme")).toBe(false);
    expect(rootAttrs.has("data-contrast")).toBe(false);
    expect(themeMetaContent).toBe("#000000");
  });

  it("initAppearance applies stored prefs", () => {
    store.set("stagesync-theme", "light");
    const state = initAppearance();
    expect(state.light).toBe(true);
    expect(rootAttrs.get("data-theme")).toBe("light");
  });

  it("applyAppearance is idempotent for current state", () => {
    applyAppearance({ light: false, highContrast: false });
    expect(rootAttrs.has("data-theme")).toBe(false);
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
    expect(readAppearance()).toEqual({ light: false, highContrast: false });
    expect(() => setAppearance({ light: true })).not.toThrow();
  });

});
