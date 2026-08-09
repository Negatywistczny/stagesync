import { z } from "zod";

/**
 * Named chrome appearance profiles (5.3 Colors & Channels).
 * Applied as `html[data-theme="<id>"]`.
 */
export const AppearanceProfileIdSchema = z.enum([
  "booth",
  "daylight",
  "midnight",
  "matrix",
  "neon",
]);

export type AppearanceProfileId = z.infer<typeof AppearanceProfileIdSchema>;

export const APPEARANCE_PROFILE_IDS = AppearanceProfileIdSchema.options;

/** Polish labels for UI pickers. */
export const APPEARANCE_PROFILE_LABELS: Record<AppearanceProfileId, string> = {
  booth: "Booth Amber",
  daylight: "Daylight",
  midnight: "Midnight Cyan",
  matrix: "Matrix Green",
  neon: "Neon Ember",
};

/**
 * Signature pair for theme pickers (elevated + primary) — mirrors
 * `packages/ui` `--ss-color-elevated` / `--ss-color-primary` per profile.
 * `elevatedBorder` = `--ss-color-border-muted` so the chip stays legible
 * when elevated is close to the active row background (e.g. Daylight).
 * Literal HEX so inactive themes stay visible under the active skin.
 */
export const APPEARANCE_PROFILE_SWATCHES: Record<
  AppearanceProfileId,
  { elevated: string; elevatedBorder: string; primary: string }
> = {
  booth: { elevated: "#18181b", elevatedBorder: "#1e1e22", primary: "#fbbf24" },
  daylight: {
    elevated: "#fafafa",
    elevatedBorder: "#d4d4d8",
    primary: "#b45309",
  },
  midnight: {
    elevated: "#1e293b",
    elevatedBorder: "#1e293b",
    primary: "#22d3ee",
  },
  matrix: {
    elevated: "#0a1f12",
    elevatedBorder: "#14532d",
    primary: "#22c55e",
  },
  neon: { elevated: "#2a0a0a", elevatedBorder: "#450a0a", primary: "#f97316" },
};

/**
 * Host default when a client has no localStorage profile yet
 * (`STAGESYNC_THEME_DEFAULT`). Accepts new profile IDs and legacy
 * dark/light/*-high aliases.
 */
export { AppearanceProfileIdSchema as ThemeDefaultIdSchema };

export type ThemeDefaultId = AppearanceProfileId;

/** @deprecated Use AppearanceProfileId — kept for call-site migration. */
export type ThemeAppearance = { profile: AppearanceProfileId };

const LEGACY_THEME_MAP: Record<string, AppearanceProfileId> = {
  dark: "booth",
  light: "daylight",
  "dark-high": "booth",
  "light-high": "daylight",
};

/** Normalize raw id / legacy alias → profile, or null. */
export function normalizeAppearanceProfile(
  raw: string | undefined | null,
): AppearanceProfileId | null {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!t) return null;
  const legacy = LEGACY_THEME_MAP[t];
  if (legacy) return legacy;
  const parsed = AppearanceProfileIdSchema.safeParse(t);
  return parsed.success ? parsed.data : null;
}

export function appearanceFromThemeDefault(
  id: ThemeDefaultId | string,
): ThemeAppearance {
  const profile = normalizeAppearanceProfile(id) ?? "booth";
  return { profile };
}

/** Empty / unknown → null (clients keep code default booth). */
export function parseThemeDefaultEnv(
  raw: string | undefined | null,
): ThemeDefaultId | null {
  return normalizeAppearanceProfile(raw);
}
