import {
  appearanceFromThemeDefault,
  parseThemeDefaultEnv,
} from "@stagesync/shared";

const THEME_KEY = "stagesync-theme";
const CONTRAST_KEY = "stagesync-contrast";

/** Fallbacks when `--ss-color-bg` is unset (jsdom / early boot). */
const THEME_COLOR_LIGHT = "#f4f4f5";
const THEME_COLOR_DARK = "#000000";

export type AppearanceState = {
  light: boolean;
  highContrast: boolean;
};

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

/** True when the device already chose a theme (host default must not override). */
export function hasStoredAppearance(): boolean {
  try {
    return (
      localStorage.getItem(THEME_KEY) != null ||
      localStorage.getItem(CONTRAST_KEY) != null
    );
  } catch {
    return false;
  }
}

export function readAppearance(): AppearanceState {
  try {
    return {
      light: localStorage.getItem(THEME_KEY) === "light",
      highContrast: localStorage.getItem(CONTRAST_KEY) === "high",
    };
  } catch {
    return { light: false, highContrast: false };
  }
}

export function applyAppearance(state: AppearanceState): void {
  const root = document.documentElement;
  if (state.light) root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  if (state.highContrast) root.setAttribute("data-contrast", "high");
  else root.removeAttribute("data-contrast");

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const fallback = state.light ? THEME_COLOR_LIGHT : THEME_COLOR_DARK;
    meta.setAttribute("content", readThemeColorHex(fallback));
  }
}

export function setAppearance(partial: Partial<AppearanceState>): AppearanceState {
  const next = { ...readAppearance(), ...partial };
  try {
    localStorage.setItem(THEME_KEY, next.light ? "light" : "dark");
    localStorage.setItem(CONTRAST_KEY, next.highContrast ? "high" : "normal");
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
