import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  CLOCK_DISPLAY_STORAGE_KEY,
  formatClockDisplay,
  formatMmSsMs,
  getStoredClockDisplayFormat,
  setStoredClockDisplayFormat,
} from "./clockDisplayPrefs.js";

const TS_4_4 = { numerator: 4, denominator: 4 } as const;

describe("clockDisplayPrefs", () => {
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

  it("defaults to bbt and stores time", () => {
    expect(getStoredClockDisplayFormat()).toBe("bbt");
    setStoredClockDisplayFormat("time");
    expect(getStoredClockDisplayFormat()).toBe("time");
    expect(store.get(CLOCK_DISPLAY_STORAGE_KEY)).toBe("time");
    setStoredClockDisplayFormat("bbt");
    expect(getStoredClockDisplayFormat()).toBe("bbt");
    expect(store.has(CLOCK_DISPLAY_STORAGE_KEY)).toBe(false);
  });

  it("formats MM:SS.mmm including negative", () => {
    expect(formatMmSsMs(0)).toBe("00:00.000");
    expect(formatMmSsMs(12_345)).toBe("00:12.345");
    expect(formatMmSsMs(65_001)).toBe("01:05.001");
    expect(formatMmSsMs(-500)).toBe("-00:00.500");
  });

  it("formats BBT with tick and time projection", () => {
    expect(
      formatClockDisplay({
        ticks: 0,
        bpm: 120,
        timeSignature: TS_4_4,
        ppq: 960,
        format: "bbt",
      }),
    ).toBe("1.1.0");

    expect(
      formatClockDisplay({
        ticks: 960,
        bpm: 120,
        timeSignature: TS_4_4,
        ppq: 960,
        format: "time",
      }),
    ).toBe("00:00.500");
  });

  it("get/set tolerate private-mode localStorage throws", () => {
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
    expect(getStoredClockDisplayFormat()).toBe("bbt");
    expect(() => setStoredClockDisplayFormat("time")).not.toThrow();
  });

});
