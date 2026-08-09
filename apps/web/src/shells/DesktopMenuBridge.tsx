import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Button, ContextMenuProvider } from "@stagesync/ui";
import { renderSVG } from "uqr";
import {
  getLastTimelineProjectId,
  getRecentTimelineProjects,
} from "@lib/client/lastTimelineProject.js";
import {
  DESKTOP_MENU_EVENT,
  parseDesktopMenuDetail,
} from "@lib/client/desktopMenuEvents.js";
import { openSongImport } from "@lib/client/songImportEvents.js";
import {
  createSongAndOpen,
  currentTimelineProjectId,
  downloadLibraryExport,
  importLibraryFile,
  listTemplateIds,
  saveProjectAs,
} from "@lib/client/desktopFileMenu.js";
import {
  isDesktopShell,
  prepareHostRestart,
  quitDesktopApp,
  syncNavRecentProjects,
  syncNavTimelineProjectId,
  toggleAppFullscreen,
  usesHtmlDesktopTitleBar,
} from "@lib/client/desktopBridge.js";
import { handleDesktopMenuShortcut } from "@lib/client/desktopMenuShortcuts.js";
import { shouldAllowNativeTextClipboard } from "@lib/client/isEditableKeyboardTarget.js";
import { getTimelineNavUrl } from "@lib/shell-operator/operatorNavRoutes.js";
import { DesktopTitleBar } from "./DesktopTitleBar.js";
import {
  downloadDiagnosticsExport,
  fetchNetworkInfo,
  fetchSetlist,
  pickPrimaryJoinUrl,
  apkDownloadUrlsFromJoin,
  probeApkAvailable,
  postSystemRestart,
} from "@lib/shell-operator/setlistApi.js";
import { suppressAudioPlayback } from "@lib/audio/audioPlayback.js";
import { restoreAudioOutputSink } from "@lib/audio/audioOutputPrefs.js";
import {
  OPEN_PREFERENCES_EVENT,
  parseOpenPreferencesDetail,
} from "@lib/client/preferencesEvents.js";
import { useTransport } from "../transport/useTransport.js";
import { ShellIconButton } from "./ShellIconButton.js";
import { ShellPromptDialog } from "./ShellBlockingDialog.js";
import { useOperatorNavShortcuts } from "@lib/shell-operator/operatorNavShortcuts.js";
import {
  ServerSettingsModal,
  type PreferencesTab,
} from "./ServerSettingsModal.js";
import { QrWrap } from "./shared/index.js";
import styles from "./DesktopMenuBridge.module.css";

type NamePromptKind =
  | "new-song"
  | "new-template"
  | "new-from-template"
  | "save-as";

type NamePromptState = {
  kind: NamePromptKind;
  title: string;
  defaultValue: string;
  templateId?: string;
  sourceId?: string;
};

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Zamknij"
        onClick={onClose}
      />
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 id={titleId}>{title}</h2>
          <ShellIconButton label="Zamknij" onClick={onClose}>
            ×
          </ShellIconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

function HostQrModal({ onClose }: { onClose: () => void }) {
  type QrMode = "join" | "performer" | "console";
  const [mode, setMode] = useState<QrMode>("join");
  const [urls, setUrls] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [performerUrl, setPerformerUrl] = useState<string | null>(null);
  const [consoleUrl, setConsoleUrl] = useState<string | null>(null);
  const [performerReady, setPerformerReady] = useState(false);
  const [consoleReady, setConsoleReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const info = await fetchNetworkInfo();
        if (cancelled) return;
        const list = info.urls.length > 0 ? info.urls : [];
        setUrls(list);
        const join = pickPrimaryJoinUrl(info) ?? list[0] ?? null;
        setSelected(join);
        const apk = join ? apkDownloadUrlsFromJoin(join) : null;
        if (apk) {
          setPerformerUrl(apk.performer);
          setConsoleUrl(apk.console);
          const [pOk, cOk] = await Promise.all([
            probeApkAvailable(apk.performer),
            probeApkAvailable(apk.console),
          ]);
          if (cancelled) return;
          setPerformerReady(pOk);
          setConsoleReady(cOk);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Nie udało się pobrać URL sieci",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeUrl =
    mode === "join"
      ? selected
      : mode === "performer"
        ? performerReady
          ? performerUrl
          : null
        : consoleReady
          ? consoleUrl
          : null;

  const qrSvg = useMemo(() => {
    if (!activeUrl) return null;
    try {
      return renderSVG(activeUrl, {
        ecc: "M",
        border: 2,
        pixelSize: 6,
      });
    } catch {
      return null;
    }
  }, [activeUrl]);

  const title =
    mode === "join"
      ? "Kod QR — dołącz do hosta"
      : mode === "performer"
        ? "Kod QR — pobierz Performer"
        : "Kod QR — pobierz Console";

  return (
    <Modal title={title} onClose={onClose}>
      <div className={styles.body}>
        <div className={styles.modeRow} role="tablist" aria-label="Tryb QR">
          {(
            [
              ["join", "Dołącz"],
              ["performer", "Performer APK"],
              ["console", "Console APK"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              variant="ghost"
              role="tab"
              aria-selected={mode === id}
              selected={mode === id}
              onClick={() => setMode(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        {loading ? (
          <p className={styles.muted} role="status" aria-live="polite">
            Ładowanie adresów LAN…
          </p>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && mode === "join" && urls.length === 0 ? (
          <p className={styles.muted} role="status" aria-live="polite">
            Brak adresów LAN z hosta.
          </p>
        ) : null}
        {!loading &&
        !error &&
        mode === "performer" &&
        !performerReady ? (
          <p className={styles.muted} role="status">
            Host nie serwuje teraz Performer APK (
            {performerUrl ?? "/downloads/stagesync-performer.apk"}). Pobierz z
            Releases albo zbuduj APK lokalnie — patrz dokumentacja Mobile.
          </p>
        ) : null}
        {!loading && !error && mode === "console" && !consoleReady ? (
          <p className={styles.muted} role="status">
            Host nie serwuje teraz Console APK (
            {consoleUrl ?? "/downloads/stagesync-console.apk"}). Pobierz z
            Releases albo zbuduj APK lokalnie — patrz dokumentacja Mobile.
          </p>
        ) : null}
        {activeUrl && qrSvg ? (
          <QrWrap svg={qrSvg} aria-label={`Kod QR dla ${activeUrl}`} />
        ) : null}
        {mode === "join" && urls.length > 0 ? (
          <ul className={styles.urlList} aria-label="Adresy sieciowe">
            {urls.map((url) => (
              <li key={url}>
                <Button
                  variant="ghost"
                  selected={url === selected}
                  className={styles.urlPick}
                  onClick={() => setSelected(url)}
                >
                  {url}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {mode === "join" ? (
          <p className={styles.muted}>
            Zeskanuj kod telefonem / tabletem w tej samej sieci LAN (dołączenie).
          </p>
        ) : (
          <p className={styles.muted}>
            QR prowadzi do pliku APK na tym hoście.
          </p>
        )}
      </div>
    </Modal>
  );
}

function RestartConfirmModal({
  onClose,
  onConfirm,
  pending,
  error,
}: {
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <Modal title="Restart hosta" onClose={onClose}>
      <div className={styles.body}>
        <p className={styles.muted}>
          Serwer lokalny zostanie zrestartowany. Klienci na scenie mogą się
          rozłączyć na chwilę.
        </p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Anuluj
          </Button>
          <Button onClick={onConfirm} loading={pending} disabled={pending}>
            Restart
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Layout bridge for desktop OS menu Faza B+C.
 * Listens for CustomEvents from Tauri (`eval`) and routes to transport / dialogs.
 */
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
      setRestartError(
        err instanceof Error ? err.message : "Restart nieudany",
      );
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
            n === 1
              ? "Zaimportowano 1 utwór."
              : `Zaimportowano ${n} utworów.`,
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
            currentTimelineProjectId(location.pathname) ??
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
          if (!onTimeline && shouldAllowNativeTextClipboard(document.activeElement)) {
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
    location.pathname,
    navigate,
    onClient,
    onTimeline,
    onTransportPlay,
    onTransportStop,
  ]);

  useEffect(() => {
    function onOpenPrefs(ev: Event) {
      if (onClient) {
        window.dispatchEvent(
          new CustomEvent(DESKTOP_MENU_EVENT, { detail: { action: "appearance" } }),
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
          new CustomEvent(DESKTOP_MENU_EVENT, { detail: { action: "appearance" } }),
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
    window.addEventListener("keydown", preventBrowserHistoryShortcuts, { capture: true });

    return () => {
      window.removeEventListener(OPEN_PREFERENCES_EVENT, onOpenPrefs);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", preventBrowserHistoryShortcuts, { capture: true });
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
