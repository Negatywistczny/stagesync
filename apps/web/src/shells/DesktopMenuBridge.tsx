import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@stagesync/ui";
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
import {
  fetchNetworkInfo,
  fetchSetlist,
  postSystemRestart,
} from "../lib/setlistApi.js";
import { useTransport } from "../transport/useTransport.js";
import { ShellIconButton } from "./ShellIconButton.js";
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
  return (
    <div className={styles.overlay} role="dialog" aria-modal>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Zamknij"
        onClick={onClose}
      />
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2>{title}</h2>
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
  const [urls, setUrls] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
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
        setSelected(list[0] ?? null);
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

  const qrSvg = useMemo(() => {
    if (!selected) return null;
    try {
      return renderSVG(selected, {
        ecc: "M",
        border: 2,
        pixelSize: 6,
      });
    } catch {
      return null;
    }
  }, [selected]);

  return (
    <Modal title="Kod QR — połączenie klientów" onClose={onClose}>
      <div className={styles.body}>
        {loading ? <p className={styles.muted}>Ładowanie adresów LAN…</p> : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && urls.length === 0 ? (
          <p className={styles.muted}>Brak adresów LAN z hosta.</p>
        ) : null}
        {selected && qrSvg ? (
          <div
            className={styles.qrWrap}
            aria-label={`Kod QR dla ${selected}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        ) : null}
        {urls.length > 0 ? (
          <ul className={styles.urlList} aria-label="Adresy sieciowe">
            {urls.map((url) => (
              <li key={url}>
                <button
                  type="button"
                  className={[
                    styles.urlBtn,
                    url === selected ? styles.urlBtnSelected : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={url === selected}
                  onClick={() => setSelected(url)}
                >
                  {url}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className={styles.muted}>
          Zeskanuj kod telefonem / tabletem w tej samej sieci LAN.
        </p>
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
  const { play, stop, state } = useTransport();
  const [qrOpen, setQrOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [restartPending, setRestartPending] = useState(false);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [setlistNeighborError, setSetlistNeighborError] = useState<string | null>(
    null,
  );
  const setlistNeighborPendingRef = useRef(false);

  useEffect(() => {
    if (!isDesktopShell()) return;
    void syncNavRecentProjects(getRecentTimelineProjects());
    void syncNavTimelineProjectId(getLastTimelineProjectId());
  }, []);

  const goSetlistNeighbor = useCallback(
    async (direction: "prev" | "next") => {
      if (setlistNeighborPendingRef.current) return;
      setlistNeighborPendingRef.current = true;
      setSetlistNeighborError(null);
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
      } catch (err) {
        setSetlistNeighborError(
          err instanceof Error
            ? err.message
            : "Nie udało się przełączyć utworu setlisty",
        );
      } finally {
        setlistNeighborPendingRef.current = false;
      }
    },
    [location.pathname, navigate, play],
  );

  const onTransportPlay = useCallback(async () => {
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
  }, [location.pathname, play, state.activeProjectId]);

  const onTransportStop = useCallback(async () => {
    try {
      await stop();
    } catch {
      /* ignore */
    }
  }, [stop]);

  const onRestartConfirm = useCallback(async () => {
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
        default:
          break;
      }
    }
    window.addEventListener(DESKTOP_MENU_EVENT, onMenu);
    return () => window.removeEventListener(DESKTOP_MENU_EVENT, onMenu);
  }, [goSetlistNeighbor, onTransportPlay, onTransportStop]);

  return (
    <>
      <Outlet />
      {setlistNeighborError ? (
        <p className={styles.toastError} role="alert">
          {setlistNeighborError}
          <button
            type="button"
            className={styles.toastDismiss}
            onClick={() => setSetlistNeighborError(null)}
            aria-label="Zamknij komunikat"
          >
            ×
          </button>
        </p>
      ) : null}
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
    </>
  );
}
