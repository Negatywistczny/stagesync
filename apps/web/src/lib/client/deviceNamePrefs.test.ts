import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredDeviceDisplayName,
  DEVICE_DISPLAY_NAME_CHANGED_EVENT,
  getStoredDeviceDisplayName,
  normalizeDeviceDisplayName,
  setStoredDeviceDisplayName,
} from "./deviceNamePrefs.js";

describe("deviceNamePrefs", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
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
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes whitespace and length", () => {
    expect(normalizeDeviceDisplayName("  Ania   ")).toBe("Ania");
    expect(normalizeDeviceDisplayName("A".repeat(50)).length).toBe(40);
  });

  it("round-trips storage", () => {
    expect(getStoredDeviceDisplayName()).toBeNull();
    expect(setStoredDeviceDisplayName("  Pad 1 ")).toBe("Pad 1");
    expect(getStoredDeviceDisplayName()).toBe("Pad 1");
    clearStoredDeviceDisplayName();
    expect(getStoredDeviceDisplayName()).toBeNull();
  });

  it("rejects empty name", () => {
    expect(() => setStoredDeviceDisplayName("   ")).toThrow(/pusta/);
  });

  it("dispatches change event when window is present", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    setStoredDeviceDisplayName("Ada");
    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: DEVICE_DISPLAY_NAME_CHANGED_EVENT,
      }),
    );
  });

  it("clear dispatches null name and tolerates storage throws", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    setStoredDeviceDisplayName("Ada");
    clearStoredDeviceDisplayName();
    expect(dispatchEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: DEVICE_DISPLAY_NAME_CHANGED_EVENT,
        detail: { name: null },
      }),
    );

    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("quota");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("quota");
      },
      clear: () => undefined,
    });
    expect(getStoredDeviceDisplayName()).toBeNull();
    expect(setStoredDeviceDisplayName("Bolek")).toBe("Bolek");
    expect(() => clearStoredDeviceDisplayName()).not.toThrow();
  });
});
