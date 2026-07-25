import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button, ContextMenuProvider } from "@stagesync/ui";
import { renderSVG } from "uqr";
import {
  getLastTimelineProjectId,
  getRecentTimelineProjects,
} from "../lib/lastTimelineProject.js";
import {
  DESKTOP_MENU_EVENT,
  parseDesktopMenuDetail,
} from "../lib/desktopMenuEvents.js";
import {
  isDesktopShell,
  syncNavRecentProjects,
  syncNavTimelineProjectId,
} from "../lib/desktopBridge.js";
import { shouldAllowNativeTextClipboard } from "../lib/isEditableKeyboardTarget.js";
import {
  downloadDiagnosticsExport,
  fetchNetworkInfo,
  fetchSetlist,
  pickPrimaryJoinUrl,
  apkDownloadUrlsFromJoin,
  probeApkAvailable,
  postSystemRestart,
} from "../lib/setlistApi.js";
import { suppressAudioPlayback } from "../lib/audioPlayback.js";
import { restoreAudioOutputSink } from "../lib/audioOutputPrefs.js";
import {
  OPEN_PREFERENCES_EVENT,
  parseOpenPreferencesDetail,
} from "../lib/preferencesEvents.js";
import { useTransport } from "../transport/useTransport.js";
import { ShellIconButton } from "./ShellIconButton.js";
import {
  ServerSettingsModal,
  type PreferencesTab,
} from "./ServerSettingsModal.js";
import styles from "./DesktopMenuBridge.module.css";

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
            Brak pliku Performer w tej instalacji (
            {performerUrl ?? "/downloads/stagesync-performer.apk"}). Pobierz z
            Releases albo zbuduj APK lokalnie — host serwuje go automatycznie.
          </p>
        ) : null}
        {!loading && !error && mode === "console" && !consoleReady ? (
          <p className={styles.muted} role="status">
            Brak pliku Console w tej instalacji (
            {consoleUrl ?? "/downloads/stagesync-console.apk"}). Pobierz z
            Releases albo zbuduj APK lokalnie — host serwuje go automatycznie.
          </p>
        ) : null}
        {activeUrl && qrSvg ? (
          <div
            className={styles.qrWrap}
            aria-label={`Kod QR dla ${activeUrl}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
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
            QR prowadzi do pliku APK na tym hoście (sideload, bez Google Play).
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
  const { play, stop, state, commandPending } = useTransport();
  const [qrOpen, setQrOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefsTab, setPrefsTab] = useState<PreferencesTab>("general");
  const [restartPending, setRestartPending] = useState(false);
  const restartPendingRef = useRef(false);
  const [restartError, setRestartError] = useState<string | null>(null);

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
        default:
          break;
      }
    }
    window.addEventListener(DESKTOP_MENU_EVENT, onMenu);
    return () => window.removeEventListener(DESKTOP_MENU_EVENT, onMenu);
  }, [goSetlistNeighbor, onTransportPlay, onTransportStop]);

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
      <Outlet />
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
    </ContextMenuProvider>
  );
}
