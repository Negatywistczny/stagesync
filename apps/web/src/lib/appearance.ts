const THEME_KEY = "stagesync-theme";
const CONTRAST_KEY = "stagesync-contrast";

export type AppearanceState = {
  light: boolean;
  highContrast: boolean;
};

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
    meta.setAttribute("content", state.light ? "#f4f4f5" : "#000000");
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

/** Call once at app boot (before paint ideally). */
export function initAppearance(): AppearanceState {
  const state = readAppearance();
  applyAppearance(state);
  return state;
}
