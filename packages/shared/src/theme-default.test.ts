import { describe, expect, it } from "vitest";
import {
  ThemeDefaultIdSchema,
  appearanceFromThemeDefault,
  parseThemeDefaultEnv,
} from "./theme-default.js";

describe("theme-default", () => {
  it("parses known env values and rejects junk", () => {
    expect(parseThemeDefaultEnv("")).toBeNull();
    expect(parseThemeDefaultEnv("  ")).toBeNull();
    expect(parseThemeDefaultEnv("LIGHT")).toBe("light");
    expect(parseThemeDefaultEnv("dark-high")).toBe("dark-high");
    expect(parseThemeDefaultEnv("nope")).toBeNull();
    expect(ThemeDefaultIdSchema.parse("light-high")).toBe("light-high");
  });

  it("maps ids to appearance flags", () => {
    expect(appearanceFromThemeDefault("dark")).toEqual({
      light: false,
      highContrast: false,
    });
    expect(appearanceFromThemeDefault("light")).toEqual({
      light: true,
      highContrast: false,
    });
    expect(appearanceFromThemeDefault("dark-high")).toEqual({
      light: false,
      highContrast: true,
    });
    expect(appearanceFromThemeDefault("light-high")).toEqual({
      light: true,
      highContrast: true,
    });
  });
});
