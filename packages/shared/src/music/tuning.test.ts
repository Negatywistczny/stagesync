import { describe, expect, it } from "vitest";
import {
  CONCERT_PITCH_COSMIC_HZ,
  CONCERT_PITCH_STANDARD_HZ,
  TUNING_PRESETS,
  getTuningDescriptor,
  isCosmicTuning,
} from "./tuning.js";

describe("Concert Pitch & Cosmic Tuning (432 Hz) Easter Egg", () => {
  it("defines standard constants correctly", () => {
    expect(CONCERT_PITCH_STANDARD_HZ).toBe(440);
    expect(CONCERT_PITCH_COSMIC_HZ).toBe(432);
    expect(TUNING_PRESETS).toHaveLength(4);
  });

  it("identifies 432 Hz as cosmic tuning", () => {
    expect(isCosmicTuning(432)).toBe(true);
    expect(isCosmicTuning(432.0)).toBe(true);
    expect(isCosmicTuning(440)).toBe(false);
    expect(isCosmicTuning(442)).toBe(false);
  });

  it("returns rich descriptor for 432 Hz cosmic pitch with UFO lore", () => {
    const cosmic = getTuningDescriptor(432);
    expect(cosmic.isCosmic).toBe(true);
    expect(cosmic.name).toContain("🛸");
    expect(cosmic.description.toLowerCase()).toContain("harmonic resonance");
  });

  it("returns standard descriptor for 440 Hz concert pitch", () => {
    const std = getTuningDescriptor(440);
    expect(std.isCosmic).toBe(false);
    expect(std.name).toContain("ISO 16");
  });

  it("handles custom arbitrary frequencies gracefully", () => {
    const custom = getTuningDescriptor(438.5);
    expect(custom.freqHz).toBe(438.5);
    expect(custom.isCosmic).toBe(false);
    expect(custom.name).toBe("Custom Pitch (438.5 Hz)");
  });
});
