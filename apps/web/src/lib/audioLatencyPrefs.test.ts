import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  AUDIO_LATENCY_STORAGE_KEY,
  clampLatencyCompensationMs,
  getStoredLatencyCompensationMs,
  setStoredLatencyCompensationMs,
} from "./audioLatencyPrefs.js";

describe("audioLatencyPrefs", () => {
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clamps to -100…+500", () => {
    expect(clampLatencyCompensationMs(-200)).toBe(-100);
    expect(clampLatencyCompensationMs(600)).toBe(500);
    expect(clampLatencyCompensationMs(12.6)).toBe(13);
    expect(clampLatencyCompensationMs(Number.NaN)).toBe(0);
  });

  it("stores and clears compensation ms", () => {
    expect(getStoredLatencyCompensationMs()).toBe(0);
    setStoredLatencyCompensationMs(120);
    expect(getStoredLatencyCompensationMs()).toBe(120);
    expect(store.get(AUDIO_LATENCY_STORAGE_KEY)).toBe("120");
    setStoredLatencyCompensationMs(0);
    expect(getStoredLatencyCompensationMs()).toBe(0);
    expect(store.has(AUDIO_LATENCY_STORAGE_KEY)).toBe(false);
  });
});
