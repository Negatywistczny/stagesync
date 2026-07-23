import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_METRONOME_PREFS,
  METRONOME_ACCENT_VOLUME_KEY,
  METRONOME_MASTER_GAIN_DB_KEY,
  METRONOME_ON_KEY,
  METRONOME_TIMBRE_KEY,
  clampMetronomeVolume,
  getMetronomeOn,
  getMetronomePrefs,
  masterClickGainLinear,
  setMetronomeOn,
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
      masterGainDb: 0,
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

  it("persists master Click gain and on/off across session", () => {
    expect(getMetronomeOn()).toBe(false);
    setMetronomeOn(true);
    expect(store.get(METRONOME_ON_KEY)).toBe("1");
    expect(getMetronomeOn()).toBe(true);
    setMetronomeOn(false);
    expect(store.has(METRONOME_ON_KEY)).toBe(false);

    setMetronomePrefs({ masterGainDb: -6 });
    expect(store.get(METRONOME_MASTER_GAIN_DB_KEY)).toBe("-6");
    expect(getMetronomePrefs().masterGainDb).toBe(-6);
    expect(masterClickGainLinear()).toBeCloseTo(0.501, 2);
    setMetronomePrefs({ masterGainDb: 0 });
    expect(store.has(METRONOME_MASTER_GAIN_DB_KEY)).toBe(false);
  });

  it("get/set tolerate private-mode throws", () => {
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
    expect(getMetronomePrefs()).toEqual(DEFAULT_METRONOME_PREFS);
    expect(() =>
      setMetronomePrefs({ accentVolume: 50, timbre: "bell" }),
    ).not.toThrow();
  });


  it("invalid timbre keeps current", () => {
    setMetronomePrefs({ timbre: "woodblock" });
    const next = setMetronomePrefs({ timbre: "nope" as never });
    expect(next.timbre).toBe("woodblock");
  });

});
