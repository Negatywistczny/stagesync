import { useEffect, useState } from "react";
import {
  OPEN_PREFERENCES_EVENT,
  parseOpenPreferencesDetail,
  type PreferencesTab,
} from "../lib/preferencesEvents.js";
import { ServerSettingsModal } from "../shells/ServerSettingsModal.js";

/**
 * Listens for `openPreferences` / Cmd+, events without the full DesktopMenuBridge
 * (Tauri menu sync, audio sink restore). Used by DevPreview layout matrix.
 */
export function PreferencesEventBridge() {
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefsTab, setPrefsTab] = useState<PreferencesTab>("general");

  useEffect(() => {
    function onOpenPrefs(ev: Event) {
      const detail = parseOpenPreferencesDetail(ev);
      if (detail?.tab) setPrefsTab(detail.tab);
      else setPrefsTab("general");
      setPrefsOpen(true);
    }
    function onKey(ev: KeyboardEvent) {
      if (!(ev.metaKey || ev.ctrlKey) || ev.altKey) return;
      if (ev.key !== "," && ev.code !== "Comma") return;
      if (
        ev.target instanceof HTMLElement &&
        (ev.target.isContentEditable ||
          ev.target.tagName === "INPUT" ||
          ev.target.tagName === "TEXTAREA" ||
          ev.target.tagName === "SELECT")
      ) {
        return;
      }
      ev.preventDefault();
      setPrefsTab("general");
      setPrefsOpen(true);
    }
    window.addEventListener(OPEN_PREFERENCES_EVENT, onOpenPrefs);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_PREFERENCES_EVENT, onOpenPrefs);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return prefsOpen ? (
    <ServerSettingsModal
      key={prefsTab}
      initialTab={prefsTab}
      onClose={() => setPrefsOpen(false)}
    />
  ) : null;
}
