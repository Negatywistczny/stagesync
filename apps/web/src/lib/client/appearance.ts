import {
  APPEARANCE_PROFILE_LABELS,
  appearanceFromThemeDefault,
  normalizeAppearanceProfile,
  parseThemeDefaultEnv,
  type AppearanceProfileId,
} from "@stagesync/shared";

const PROFILE_KEY = "stagesync-appearance-profile";
/** Legacy keys (pre-5.3 boolean pair). */
const LEGACY_THEME_KEY = "stagesync-theme";
const LEGACY_CONTRAST_KEY = "stagesync-contrast";

/** Fallbacks when `--ss-color-bg` is unset (jsdom / early boot). */
const THEME_COLOR_BY_PROFILE: Record<AppearanceProfileId, string> = {
  booth: "#000000",
  daylight: "#f4f4f5",
  midnight: "#020617",
  matrix: "#000000",
  neon: "#0a0000",
};

export type AppearanceState = {
  profile: AppearanceProfileId;
};

export { APPEARANCE_PROFILE_LABELS };

function readThemeColorHex(fallback: string): string {
  if (typeof getComputedStyle === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--ss-color-bg")
    .trim();
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw)) {
    return raw;
  }
  return fallback;
}

function migrateLegacyProfile(): AppearanceProfileId | null {
  try {
    const theme = localStorage.getItem(LEGACY_THEME_KEY);
    const contrast = localStorage.getItem(LEGACY_CONTRAST_KEY);
    if (theme == null && contrast == null) return null;
    const legacyId =
      theme === "light"
        ? contrast === "high"
          ? "light-high"
          : "light"
        : contrast === "high"
          ? "dark-high"
          : "dark";
    return normalizeAppearanceProfile(legacyId) ?? "booth";
  } catch {
    return null;
  }
}

function clearLegacyKeys(): void {
  try {
    localStorage.removeItem(LEGACY_THEME_KEY);
    localStorage.removeItem(LEGACY_CONTRAST_KEY);
  } catch {
    /* ignore */
  }
}

/** True when the device already chose a theme (host default must not override). */
export function hasStoredAppearance(): boolean {
  try {
    if (localStorage.getItem(PROFILE_KEY) != null) return true;
    return (
      localStorage.getItem(LEGACY_THEME_KEY) != null ||
      localStorage.getItem(LEGACY_CONTRAST_KEY) != null
    );
  } catch {
    return false;
  }
}

export function readAppearance(): AppearanceState {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    const fromStored = normalizeAppearanceProfile(stored);
    if (fromStored) return { profile: fromStored };

    const migrated = migrateLegacyProfile();
    if (migrated) {
      try {
        localStorage.setItem(PROFILE_KEY, migrated);
        clearLegacyKeys();
      } catch {
        /* ignore write */
      }
      return { profile: migrated };
    }
  } catch {
    /* ignore */
  }
  return { profile: "booth" };
}

export function applyAppearance(state: AppearanceState): void {
  const root = document.documentElement;
  const profile = normalizeAppearanceProfile(state.profile) ?? "booth";
  root.setAttribute("data-theme", profile);
  root.removeAttribute("data-contrast");

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const fallback = THEME_COLOR_BY_PROFILE[profile];
    meta.setAttribute("content", readThemeColorHex(fallback));
  }
}

export function setAppearance(
  partial: Partial<AppearanceState> | { profile: AppearanceProfileId },
): AppearanceState {
  const next: AppearanceState = {
    profile:
      normalizeAppearanceProfile(partial.profile) ??
      readAppearance().profile,
  };
  try {
    localStorage.setItem(PROFILE_KEY, next.profile);
    clearLegacyKeys();
  } catch {
    /* ignore */
  }
  applyAppearance(next);
  return next;
}

/**
 * Apply host `themeDefault` only when this device has no stored theme.
 * Does not write localStorage (virgin devices stay unbound to a host choice).
 */
export function applyHostThemeDefault(
  themeDefault: string | undefined | null,
): AppearanceState | null {
  if (hasStoredAppearance()) return null;
  const id = parseThemeDefaultEnv(themeDefault);
  if (!id) return null;
  const state = appearanceFromThemeDefault(id);
  applyAppearance(state);
  return state;
}

/** Fetch health and apply host theme default when localStorage is empty. */
export function bootHostThemeDefault(): void {
  void fetch("/api/health", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return;
      const body = (await res.json()) as { themeDefault?: string };
      applyHostThemeDefault(body.themeDefault);
    })
    .catch(() => {
      /* offline / pre-host */
    });
}

/** Call once at app boot (before paint ideally). */
export function initAppearance(): AppearanceState {
  const state = readAppearance();
  applyAppearance(state);
  return state;
}
