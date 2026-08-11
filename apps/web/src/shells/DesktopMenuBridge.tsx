import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { ContextMenuProvider } from "@stagesync/ui";
import {
  getLastTimelineProjectId,
  getRecentTimelineProjects,
} from "@lib/client/lastTimelineProject.js";
import { DESKTOP_MENU_EVENT } from "@lib/client/desktopMenuEvents.js";
import {
  createSongAndOpen,
  importLibraryFile,
  saveProjectAs,
} from "@lib/client/desktopFileMenu.js";
import {
  isDesktopShell,
  prepareHostRestart,
  syncNavRecentProjects,
  syncNavTimelineProjectId,
  usesHtmlDesktopTitleBar,
} from "@lib/client/desktopBridge.js";
import { handleDesktopMenuShortcut } from "@lib/client/desktopMenuShortcuts.js";
import { shouldAllowNativeTextClipboard } from "@lib/client/isEditableKeyboardTarget.js";
import { DesktopTitleBar } from "./DesktopTitleBar.js";
import { fetchSetlist, postSystemRestart } from "@lib/shell-operator/setlistApi.js";
import { suppressAudioPlayback } from "@lib/audio/audioPlayback.js";
import { restoreAudioOutputSink } from "@lib/audio/audioOutputPrefs.js";
import {
  OPEN_PREFERENCES_EVENT,
  parseOpenPreferencesDetail,
} from "@lib/client/preferencesEvents.js";
import { useTransport } from "../transport/useTransport.js";
import { ShellPromptDialog } from "./ShellBlockingDialog.js";
import { useOperatorNavShortcuts } from "@lib/shell-operator/operatorNavShortcuts.js";
import {
  ServerSettingsModal,
  type PreferencesTab,
} from "./ServerSettingsModal.js";
import { HostQrModal } from "./desktop/HostQrModal.js";
import { RestartConfirmModal } from "./desktop/RestartConfirmModal.js";
import { useDesktopMenuActions } from "./desktop/useDesktopMenuActions.js";
import type { NamePromptState } from "./desktop/namePrompt.js";
import styles from "./DesktopMenuBridge.module.css";

export type { NamePromptKind, NamePromptState } from "./desktop/namePrompt.js";

export function DesktopMenuBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const showHtmlTitleBar = usesHtmlDesktopTitleBar();

  // Global fallback for Windows Tauri WebView2 where native accelerators are swallowed
  useOperatorNavShortcuts({ pathname: location.pathname });

  useEffect(() => {
    if (!showHtmlTitleBar) return;
    const onKey = (ev: KeyboardEvent) => {
      handleDesktopMenuShortcut(ev);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHtmlTitleBar]);

  const { play, stop, state, commandPending } = useTransport();
  const [qrOpen, setQrOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefsTab, setPrefsTab] = useState<PreferencesTab>("general");
  const [restartPending, setRestartPending] = useState(false);
  const restartPendingRef = useRef(false);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [namePrompt, setNamePrompt] = useState<NamePromptState | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const onTimeline = location.pathname.startsWith("/timeline/");
  const onClient = location.pathname.startsWith("/client");

  useEffect(() => {
    if (!isDesktopShell()) return;
    void syncNavRecentProjects(getRecentTimelineProjects());
    void syncNavTimelineProjectId(getLastTimelineProjectId());
  }, []);

  useEffect(() => {
    void restoreAudioOutputSink();
  }, []);

  const goSetlistNeighbor = useCallback(
    async (direction: "prev" | "next") => {
      if (commandPending) return;
      try {
        const view = await fetchSetlist();
        if (!view.enabled || view.entries.length === 0) return;
        let targetId: string | null = null;
        if (direction === "next") {
          targetId = view.next?.id ?? null;
        } else if (view.currentIndex > 0) {
          targetId = view.entries[view.currentIndex - 1]?.id ?? null;
        }
        if (!targetId) return;
        await play({ projectId: targetId });
        if (location.pathname.startsWith("/timeline")) {
          navigate(`/timeline/${targetId}`);
        }
      } catch {
        /* ignore — menu is best-effort */
      }
    },
    [commandPending, location.pathname, navigate, play],
  );

  const onTransportPlay = useCallback(async () => {
    if (commandPending) return;
    try {
      const projectId =
        state.activeProjectId ??
        (location.pathname.startsWith("/timeline/")
          ? (location.pathname.split("/")[2] ?? null)
          : null);
      await play(projectId ? { projectId } : undefined);
    } catch {
      /* ignore */
    }
  }, [commandPending, location.pathname, play, state.activeProjectId]);

  const onTransportStop = useCallback(async () => {
    if (commandPending) return;
    try {
      suppressAudioPlayback();
      await stop();
    } catch {
      /* ignore */
    }
  }, [commandPending, stop]);

  const onRestartConfirm = useCallback(async () => {
    if (restartPendingRef.current) return;
    restartPendingRef.current = true;
    setRestartPending(true);
    setRestartError(null);
    try {
      await prepareHostRestart();
      await postSystemRestart();
      setRestartOpen(false);
    } catch (err) {
      setRestartError(err instanceof Error ? err.message : "Restart nieudany");
    } finally {
      restartPendingRef.current = false;
      setRestartPending(false);
    }
  }, []);

  const alertError = useCallback((err: unknown, fallback: string) => {
    window.alert(err instanceof Error ? err.message : fallback);
  }, []);

  const confirmNamePrompt = useCallback(
    (raw: string) => {
      const prompt = namePrompt;
      setNamePrompt(null);
      if (!prompt || fileBusy) return;
      const name = raw.trim();
      if (!name) return;
      setFileBusy(true);
      void (async () => {
        try {
          if (prompt.kind === "new-song") {
            const created = await createSongAndOpen(name);
            navigate(`/timeline/${created.id}`);
            return;
          }
          if (prompt.kind === "new-template") {
            await createSongAndOpen(name, { isTemplate: true });
            navigate("/admin?section=songs");
            return;
          }
          if (prompt.kind === "new-from-template" && prompt.templateId) {
            const created = await createSongAndOpen(name, {
              fromTemplateId: prompt.templateId,
            });
            navigate(`/timeline/${created.id}`);
            return;
          }
          if (prompt.kind === "save-as" && prompt.sourceId) {
            const created = await saveProjectAs(prompt.sourceId, name);
            navigate(`/timeline/${created.id}`);
          }
        } catch (err) {
          alertError(err, "Operacja pliku nie powiodła się");
        } finally {
          setFileBusy(false);
        }
      })();
    },
    [alertError, fileBusy, namePrompt, navigate],
  );

  const onImportPicked = useCallback(
    (file: File | null) => {
      if (!file || fileBusy) return;
      setFileBusy(true);
      void (async () => {
        try {
          const result = await importLibraryFile(file);
          const n = result.createdCount;
          window.alert(
            n === 1 ? "Zaimportowano 1 utwór." : `Zaimportowano ${n} utworów.`,
          );
          navigate("/admin?section=songs");
        } catch (err) {
          alertError(err, "Import nie powiódł się");
        } finally {
          setFileBusy(false);
          if (importInputRef.current) importInputRef.current.value = "";
        }
      })();
    },
    [alertError, fileBusy, navigate],
  );

  useDesktopMenuActions({
    alertError,
    fileBusy,
    setFileBusy,
    goSetlistNeighbor,
    locationPathname: location.pathname,
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
  });

  useEffect(() => {
    function onOpenPrefs(ev: Event) {
      if (onClient) {
        window.dispatchEvent(
          new CustomEvent(DESKTOP_MENU_EVENT, {
            detail: { action: "appearance" },
          }),
        );
        return;
      }
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
      if (onClient) {
        window.dispatchEvent(
          new CustomEvent(DESKTOP_MENU_EVENT, {
            detail: { action: "appearance" },
          }),
        );
        return;
      }
      setPrefsTab("general");
      setPrefsOpen(true);
    }
    window.addEventListener(OPEN_PREFERENCES_EVENT, onOpenPrefs);
    window.addEventListener("keydown", onKey);

    // Global intercept to prevent WebView2 native Alt+Left/Right navigation history,
    // which otherwise eats the Alt+Left shortcut used in Timeline (Nudge clip left).
    function preventBrowserHistoryShortcuts(ev: KeyboardEvent) {
      if (ev.altKey && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) {
        ev.preventDefault();
      }
    }
    window.addEventListener("keydown", preventBrowserHistoryShortcuts, {
      capture: true,
    });

    return () => {
      window.removeEventListener(OPEN_PREFERENCES_EVENT, onOpenPrefs);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", preventBrowserHistoryShortcuts, {
        capture: true,
      });
    };
  }, [onClient]);

  useEffect(() => {
    function onContextMenu(ev: MouseEvent) {
      // Keep Inspect/native chrome off app-wide, but allow system Cut/Copy/Paste
      // for editable fields and for an existing text selection.
      if (shouldAllowNativeTextClipboard(ev.target)) return;
      ev.preventDefault();
    }
    window.addEventListener("contextmenu", onContextMenu);
    return () => window.removeEventListener("contextmenu", onContextMenu);
  }, []);

  return (
    <ContextMenuProvider>
      <div className={showHtmlTitleBar ? styles.shellWithTitleBar : undefined}>
        {showHtmlTitleBar ? <DesktopTitleBar /> : null}
        <div className={showHtmlTitleBar ? styles.shellMain : undefined}>
          <Outlet />
        </div>
      </div>
      <input
        ref={importInputRef}
        type="file"
        accept=".json,.stagesync.json,application/json"
        hidden
        aria-hidden
        tabIndex={-1}
        onChange={(e) => onImportPicked(e.target.files?.[0] ?? null)}
      />
      {qrOpen ? <HostQrModal onClose={() => setQrOpen(false)} /> : null}
      {restartOpen ? (
        <RestartConfirmModal
          onClose={() => {
            if (!restartPending) setRestartOpen(false);
          }}
          onConfirm={() => void onRestartConfirm()}
          pending={restartPending}
          error={restartError}
        />
      ) : null}
      {prefsOpen ? (
        <ServerSettingsModal
          key={prefsTab}
          initialTab={prefsTab}
          onClose={() => setPrefsOpen(false)}
        />
      ) : null}
      <ShellPromptDialog
        open={Boolean(namePrompt)}
        title={namePrompt?.title ?? ""}
        label="Nazwa projektu"
        defaultValue={namePrompt?.defaultValue ?? ""}
        confirmLabel={namePrompt?.kind === "save-as" ? "Zapisz" : "Utwórz"}
        onConfirm={confirmNamePrompt}
        onCancel={() => {
          if (!fileBusy) setNamePrompt(null);
        }}
      />
    </ContextMenuProvider>
  );
}
