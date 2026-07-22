/** Open Preferences modal from menu or Cmd/Ctrl+, */

export const OPEN_PREFERENCES_EVENT = "stagesync:open-preferences";

export type PreferencesTab = "general" | "audio" | "midi" | "metronome";

export type OpenPreferencesDetail = {
  tab?: PreferencesTab;
};

const PREFS_TABS: readonly PreferencesTab[] = [
  "general",
  "audio",
  "midi",
  "metronome",
];

export function isPreferencesTab(value: unknown): value is PreferencesTab {
  return (
    typeof value === "string" &&
    (PREFS_TABS as readonly string[]).includes(value)
  );
}

export function openPreferences(tab?: PreferencesTab): void {
  window.dispatchEvent(
    new CustomEvent(OPEN_PREFERENCES_EVENT, {
      detail: tab ? { tab } : {},
    }),
  );
}

export function parseOpenPreferencesDetail(
  ev: Event,
): OpenPreferencesDetail | null {
  if (!(ev instanceof CustomEvent)) return null;
  const detail = ev.detail;
  if (detail == null) return {};
  if (typeof detail !== "object") return {};
  const tab = (detail as { tab?: unknown }).tab;
  if (isPreferencesTab(tab)) return { tab };
  return {};
}
