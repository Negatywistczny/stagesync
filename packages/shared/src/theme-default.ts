import { z } from "zod";

/**
 * Host default appearance when a client has no localStorage theme yet
 * (`STAGESYNC_THEME_DEFAULT`).
 */
export const ThemeDefaultIdSchema = z.enum([
  "dark",
  "light",
  "dark-high",
  "light-high",
]);

export type ThemeDefaultId = z.infer<typeof ThemeDefaultIdSchema>;

export type ThemeAppearance = {
  light: boolean;
  highContrast: boolean;
};

export function appearanceFromThemeDefault(
  id: ThemeDefaultId,
): ThemeAppearance {
  switch (id) {
    case "light":
      return { light: true, highContrast: false };
    case "light-high":
      return { light: true, highContrast: true };
    case "dark-high":
      return { light: false, highContrast: true };
    default:
      return { light: false, highContrast: false };
  }
}

/** Empty / unknown → null (clients keep code default dark). */
export function parseThemeDefaultEnv(
  raw: string | undefined | null,
): ThemeDefaultId | null {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!t) return null;
  const parsed = ThemeDefaultIdSchema.safeParse(t);
  return parsed.success ? parsed.data : null;
}
