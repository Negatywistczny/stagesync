import { describe, expect, it } from "vitest";
import {
  APPEARANCE_PROFILE_IDS,
  ThemeDefaultIdSchema,
  appearanceFromThemeDefault,
  normalizeAppearanceProfile,
  parseThemeDefaultEnv,
} from "./theme-default.js";

describe("theme-default", () => {
  it("parses profile ids and legacy aliases", () => {
    expect(parseThemeDefaultEnv("")).toBeNull();
    expect(parseThemeDefaultEnv("  ")).toBeNull();
    expect(parseThemeDefaultEnv("DAYLIGHT")).toBe("daylight");
    expect(parseThemeDefaultEnv("booth")).toBe("booth");
    expect(parseThemeDefaultEnv("neon")).toBe("neon");
    expect(parseThemeDefaultEnv("light")).toBe("daylight");
    expect(parseThemeDefaultEnv("dark-high")).toBe("booth");
    expect(parseThemeDefaultEnv("light-high")).toBe("daylight");
    expect(parseThemeDefaultEnv("nope")).toBeNull();
    expect(ThemeDefaultIdSchema.parse("matrix")).toBe("matrix");
    expect(APPEARANCE_PROFILE_IDS).toHaveLength(5);
  });

  it("maps ids to appearance state", () => {
    expect(appearanceFromThemeDefault("booth")).toEqual({ profile: "booth" });
    expect(appearanceFromThemeDefault("dark")).toEqual({ profile: "booth" });
    expect(appearanceFromThemeDefault("light")).toEqual({
      profile: "daylight",
    });
    expect(normalizeAppearanceProfile("midnight")).toBe("midnight");
  });
});
