import { describe, expect, it } from "vitest";
import {
  APPEARANCE_PROFILE_IDS,
  APPEARANCE_PROFILE_SWATCHES,
  ThemeDefaultIdSchema,
  appearanceFromThemeDefault,
  normalizeAppearanceProfile,
  parseThemeDefaultEnv,
} from "./theme-default.js";

describe("theme-default", () => {
  it("parses profile ids only", () => {
    expect(parseThemeDefaultEnv("")).toBeNull();
    expect(parseThemeDefaultEnv("  ")).toBeNull();
    expect(parseThemeDefaultEnv("DAYLIGHT")).toBe("daylight");
    expect(parseThemeDefaultEnv("booth")).toBe("booth");
    expect(parseThemeDefaultEnv("neon")).toBe("neon");
    expect(parseThemeDefaultEnv("light")).toBeNull();
    expect(parseThemeDefaultEnv("dark-high")).toBeNull();
    expect(parseThemeDefaultEnv("light-high")).toBeNull();
    expect(parseThemeDefaultEnv("nope")).toBeNull();
    expect(ThemeDefaultIdSchema.parse("matrix")).toBe("matrix");
    expect(APPEARANCE_PROFILE_IDS).toHaveLength(5);
  });

  it("maps ids to appearance state", () => {
    expect(appearanceFromThemeDefault("booth")).toEqual({ profile: "booth" });
    expect(appearanceFromThemeDefault("dark")).toEqual({ profile: "booth" });
    expect(appearanceFromThemeDefault("daylight")).toEqual({
      profile: "daylight",
    });
    expect(normalizeAppearanceProfile("midnight")).toBe("midnight");
  });

  it("exposes elevated + primary swatches for every profile", () => {
    for (const id of APPEARANCE_PROFILE_IDS) {
      const swatch = APPEARANCE_PROFILE_SWATCHES[id];
      expect(swatch.elevated).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(swatch.elevatedBorder).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(swatch.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(swatch.elevated).not.toBe(swatch.primary);
    }
    expect(APPEARANCE_PROFILE_SWATCHES.booth.elevated).toBe("#18181b");
    expect(APPEARANCE_PROFILE_SWATCHES.booth.elevatedBorder).toBe("#1e1e22");
    expect(APPEARANCE_PROFILE_SWATCHES.booth.primary).toBe("#fbbf24");
    expect(APPEARANCE_PROFILE_SWATCHES.midnight.primary).toBe("#22d3ee");
  });
});
