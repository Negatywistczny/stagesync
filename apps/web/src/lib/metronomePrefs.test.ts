import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_METRONOME_PREFS,
  METRONOME_ACCENT_VOLUME_KEY,
  METRONOME_TIMBRE_KEY,
  clampMetronomeVolume,
  getMetronomePrefs,
  setMetronomePrefs,
} from "./metronomePrefs.js";

describe("metronomePrefs", () => {
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

  it("clamps volume 0…100", () => {
    expect(clampMetronomeVolume(-10)).toBe(0);
    expect(clampMetronomeVolume(150)).toBe(100);
    expect(clampMetronomeVolume(33.6)).toBe(34);
    expect(clampMetronomeVolume(Number.NaN)).toBe(
      DEFAULT_METRONOME_PREFS.accentVolume,
    );
  });

  it("stores accent / beat / timbre with safe defaults", () => {
    expect(getMetronomePrefs()).toEqual(DEFAULT_METRONOME_PREFS);
    const next = setMetronomePrefs({
      accentVolume: 80,
      beatVolume: 40,
      timbre: "woodblock",
    });
    expect(next).toEqual({
      accentVolume: 80,
      beatVolume: 40,
      timbre: "woodblock",
    });
    expect(store.get(METRONOME_ACCENT_VOLUME_KEY)).toBe("80");
    expect(store.get(METRONOME_TIMBRE_KEY)).toBe("woodblock");
    expect(getMetronomePrefs()).toEqual(next);

    setMetronomePrefs({
      accentVolume: 100,
      beatVolume: 100,
      timbre: "default",
    });
    expect(store.has(METRONOME_ACCENT_VOLUME_KEY)).toBe(false);
    expect(store.has(METRONOME_TIMBRE_KEY)).toBe(false);
  });
});
