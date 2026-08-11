import { useEffect, type MutableRefObject, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router";
import {
  DESKTOP_MENU_EVENT,
  parseDesktopMenuDetail,
} from "@lib/client/desktopMenuEvents.js";
import { openSongImport } from "@lib/client/songImportEvents.js";
import {
  currentTimelineProjectId,
  downloadLibraryExport,
  listTemplateIds,
} from "@lib/client/desktopFileMenu.js";
import {
  getLastTimelineProjectId,
} from "@lib/client/lastTimelineProject.js";
import {
  quitDesktopApp,
  toggleAppFullscreen,
} from "@lib/client/desktopBridge.js";
import { shouldAllowNativeTextClipboard } from "@lib/client/isEditableKeyboardTarget.js";
import { getTimelineNavUrl } from "@lib/shell-operator/operatorNavRoutes.js";
import { downloadDiagnosticsExport } from "@lib/shell-operator/setlistApi.js";
import type { PreferencesTab } from "@lib/client/preferencesEvents.js";
import type { NamePromptState } from "./namePrompt.js";

export function useDesktopMenuActions({
  alertError,
  fileBusy,
  setFileBusy,
  goSetlistNeighbor,
  locationPathname,
  navigate,
  onClient,
  onTimeline,
  onTransportPlay,
  onTransportStop,
  setQrOpen,
  setRestartError,
  setRestartOpen,
  setPrefsTab,
  setPrefsOpen,
  setNamePrompt,
  importInputRef,
}: {
  alertError: (err: unknown, fallback: string) => void;
  fileBusy: boolean;
  setFileBusy: Dispatch<SetStateAction<boolean>>;
  goSetlistNeighbor: (direction: "prev" | "next") => Promise<void>;
  locationPathname: string;
  navigate: ReturnType<typeof useNavigate>;
  onClient: boolean;
  onTimeline: boolean;
  onTransportPlay: () => Promise<void>;
  onTransportStop: () => Promise<void>;
  setQrOpen: Dispatch<SetStateAction<boolean>>;
  setRestartError: Dispatch<SetStateAction<string | null>>;
  setRestartOpen: Dispatch<SetStateAction<boolean>>;
  setPrefsTab: Dispatch<SetStateAction<PreferencesTab>>;
  setPrefsOpen: Dispatch<SetStateAction<boolean>>;
  setNamePrompt: Dispatch<SetStateAction<NamePromptState | null>>;
  importInputRef: MutableRefObject<HTMLInputElement | null>;
}) {
  useEffect(() => {
    function onMenu(ev: Event) {
      const detail = parseDesktopMenuDetail(ev);
      if (!detail) return;
      switch (detail.action) {
        case "transport-play":
          void onTransportPlay();
          break;
        case "transport-stop":
          void onTransportStop();
          break;
        case "transport-prev":
          void goSetlistNeighbor("prev");
          break;
        case "transport-next":
          void goSetlistNeighbor("next");
          break;
        case "host-qr":
          setQrOpen(true);
          break;
        case "host-restart":
          setRestartError(null);
          setRestartOpen(true);
          break;
        case "diagnostics-export":
          void downloadDiagnosticsExport().catch(() => {
            /* menu is best-effort */
          });
          break;
        case "preferences":
          setPrefsTab("general");
          setPrefsOpen(true);
          break;
        case "appearance":
          // Client handles in-shell; Timeline → openPreferences in TimelineShell.
          if (!onTimeline && !onClient) {
            setPrefsTab("general");
            setPrefsOpen(true);
          }
          break;
        case "file-new":
          setNamePrompt({
            kind: "new-song",
            title: "Nowy utwór",
            defaultValue: "Nowy utwór",
          });
          break;
        case "file-new-template":
          setNamePrompt({
            kind: "new-template",
            title: "Nowy wzór",
            defaultValue: `Wzór ${new Date().toLocaleTimeString("pl")}`,
          });
          break;
        case "file-new-from-template":
          void (async () => {
            try {
              const templates = await listTemplateIds();
              if (templates.length === 0) {
                window.alert(
                  "Brak wzorów w bibliotece. Utwórz wzór (Plik → Nowy → Wzór).",
                );
                return;
              }
              if (templates.length === 1) {
                const only = templates[0]!;
                setNamePrompt({
                  kind: "new-from-template",
                  title: `Nowy utwór z wzoru „${only.name}”`,
                  defaultValue: `Utwór ${new Date().toLocaleTimeString("pl")}`,
                  templateId: only.id,
                });
                return;
              }
              navigate("/admin?section=songs&action=from-template");
            } catch (err) {
              alertError(err, "Nie udało się wczytać wzorów");
            }
          })();
          break;
        case "file-open":
          navigate("/admin?section=songs");
          break;
        case "file-save-as": {
          const sourceId =
            currentTimelineProjectId(locationPathname) ??
            getLastTimelineProjectId();
          if (!sourceId) {
            window.alert("Brak projektu do zapisania jako…");
            break;
          }
          setNamePrompt({
            kind: "save-as",
            title: "Zapisz jako…",
            defaultValue: "Kopia projektu",
            sourceId,
          });
          break;
        }
        case "file-import":
          importInputRef.current?.click();
          break;
        case "file-import-song":
          if (onTimeline) {
            openSongImport({});
          } else {
            navigate("/admin?section=songs&action=import");
          }
          break;
        case "file-export":
          if (fileBusy) break;
          setFileBusy(true);
          void downloadLibraryExport()
            .catch((err) => alertError(err, "Eksport nie powiódł się"))
            .finally(() => setFileBusy(false));
          break;
        case "edit-cut":
        case "edit-copy":
        case "edit-paste":
          // TimelineShell handles clip clipboard; elsewhere yield to OS text.
          if (
            !onTimeline &&
            shouldAllowNativeTextClipboard(document.activeElement)
          ) {
            const cmd =
              detail.action === "edit-cut"
                ? "cut"
                : detail.action === "edit-copy"
                  ? "copy"
                  : "paste";
            try {
              document.execCommand(cmd);
            } catch {
              /* best-effort */
            }
          }
          break;
        case "edit-select-all":
          try {
            document.execCommand("selectAll");
          } catch {
            /* best-effort */
          }
          break;
        case "view-fullscreen":
          void toggleAppFullscreen().catch(() => {
            /* menu is best-effort */
          });
          break;
        case "check-updates":
          navigate("/admin?section=host&action=check-update");
          break;
        case "app-quit":
          void quitDesktopApp().catch(() => {
            /* best-effort */
          });
          break;
        default:
          if (detail.action.startsWith("navigate:")) {
            const dest = detail.action.slice("navigate:".length);
            if (dest === "/timeline") {
              navigate(getTimelineNavUrl());
            } else {
              navigate(dest);
            }
          }
          break;
      }
    }
    window.addEventListener(DESKTOP_MENU_EVENT, onMenu);
    return () => window.removeEventListener(DESKTOP_MENU_EVENT, onMenu);
  }, [
    alertError,
    fileBusy,
    goSetlistNeighbor,
    importInputRef,
    locationPathname,
    navigate,
    onClient,
    onTimeline,
    onTransportPlay,
    onTransportStop,
    setFileBusy,
    setNamePrompt,
    setPrefsOpen,
    setPrefsTab,
    setQrOpen,
    setRestartError,
    setRestartOpen,
  ]);

}
