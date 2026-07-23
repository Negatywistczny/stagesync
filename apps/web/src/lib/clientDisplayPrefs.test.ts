import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadClientDisplayPrefs,
  setFormNotesEdit,
  setGridAnimations,
  setHybridPolishB,
  setInstrumentPitch,
  setInstrumentPitchManual,
  setLiteralQuality,
  setSectionNamesPolish,
} from "./clientDisplayPrefs.js";

describe("clientDisplayPrefs", () => {
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

  it("loads defaults then reflects setters", () => {
    expect(loadClientDisplayPrefs()).toMatchObject({
      hybridPolishB: false,
      literalQuality: false,
      gridAnimations: true,
      formNotesEdit: false,
      sectionNamesPolish: false,
      instrumentPitch: "concert",
      instrumentPitchManual: 0,
    });

    setHybridPolishB(true);
    setLiteralQuality(true);
    setGridAnimations(false);
    setFormNotesEdit(true);
    setSectionNamesPolish(true);
    setInstrumentPitch("bb");
    setInstrumentPitchManual(3);

    expect(loadClientDisplayPrefs()).toEqual({
      hybridPolishB: true,
      literalQuality: true,
      gridAnimations: false,
      formNotesEdit: true,
      sectionNamesPolish: true,
      instrumentPitch: "bb",
      instrumentPitchManual: 3,
    });
  });

  it("ignores invalid instrument pitch mode", () => {
    store.set("stagesync-instrument-pitch", "nope");
    expect(loadClientDisplayPrefs().instrumentPitch).toBe("concert");
  });
});
