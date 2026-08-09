import { describe, expect, it } from "vitest";
import {
  DEFAULT_MIXER_ZONE_VISIBILITY,
  loadMixerZoneVisibility,
  MIXER_ZONE_VISIBILITY_KEY,
  saveMixerZoneVisibility,
  toggleMixerZoneVisibility,
} from "./mixerZoneVisibility.js";

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (k: string) => (k in store ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    _store: store,
  };
}

describe("mixerZoneVisibility", () => {
  it("defaults all zones visible", () => {
    expect(loadMixerZoneVisibility(memoryStorage())).toEqual(
      DEFAULT_MIXER_ZONE_VISIBILITY,
    );
    expect(loadMixerZoneVisibility(null)).toEqual(
      DEFAULT_MIXER_ZONE_VISIBILITY,
    );
  });

  it("loads partial prefs and ignores garbage keys", () => {
    const storage = memoryStorage({
      [MIXER_ZONE_VISIBILITY_KEY]: JSON.stringify({
        audio: false,
        bus: true,
        hw: false,
        master: true,
        nope: false,
      }),
    });
    expect(loadMixerZoneVisibility(storage)).toEqual({
      audio: false,
      bus: true,
      hw: false,
      master: true,
    });
  });

  it("returns defaults for invalid JSON", () => {
    expect(
      loadMixerZoneVisibility(
        memoryStorage({ [MIXER_ZONE_VISIBILITY_KEY]: "{" }),
      ),
    ).toEqual(DEFAULT_MIXER_ZONE_VISIBILITY);
  });

  it("round-trips and toggles", () => {
    const storage = memoryStorage();
    const hidden = toggleMixerZoneVisibility(
      DEFAULT_MIXER_ZONE_VISIBILITY,
      "bus",
    );
    expect(hidden.bus).toBe(false);
    saveMixerZoneVisibility(hidden, storage);
    expect(loadMixerZoneVisibility(storage)).toEqual(hidden);
    expect(toggleMixerZoneVisibility(hidden, "bus").bus).toBe(true);
  });
});
