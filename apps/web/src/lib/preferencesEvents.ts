/** Open Preferences modal (Audio / MIDI) from menu or Cmd/Ctrl+, */

export const OPEN_PREFERENCES_EVENT = "stagesync:open-preferences";

export type OpenPreferencesDetail = {
  tab?: "audio" | "midi";
};

export function openPreferences(tab?: "audio" | "midi"): void {
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
  if (tab === "audio" || tab === "midi") return { tab };
  return {};
}
