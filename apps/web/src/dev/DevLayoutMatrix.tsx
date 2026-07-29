import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Select } from "@stagesync/ui";
import { ShellSwitchRow } from "../shells/ShellSwitchRow.js";
import {
  DEV_PREVIEW_PROJECT_ID,
  DEV_VIEWPORTS,
  type DevPreviewRoute,
  type DevSurface,
} from "./devSurfaceTypes.js";
import {
  buildDevPreviewUrl,
  devPreviewShowsOperatorSession,
  normalizeDevPreviewConfig,
  type DevPreviewConfig,
} from "./devPreviewConfig.js";
import {
  buildDevPreviewScreenshotFilename,
  downloadBlob,
  requestDevPreviewScreenshot,
} from "./devPreviewScreenshot.js";
import styles from "./DevLayoutMatrix.module.css";

const SURFACE_LABELS: Record<DevSurface, string> = {
  tauri: "Desktop Tauri",
  console: "Android Console",
  performer: "Android Performer (Client only)",
  web: "Web LAN",
};

const ROUTE_OPTIONS: { value: DevPreviewRoute; label: string }[] = [
  { value: "/admin", label: "/admin" },
  { value: "/timeline", label: "/timeline/:id" },
  { value: "/client", label: "/client" },
];

export function DevLayoutMatrix() {
  const [surface, setSurface] = useState<DevSurface>("web");
  const [path, setPath] = useState<DevPreviewRoute>("/admin");
  const [session, setSession] = useState(true);
  const [hostOk, setHostOk] = useState<boolean | null>(null);
  const [capturingViewportId, setCapturingViewportId] = useState<string | null>(
    null,
  );
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const isPerformerSurface = surface === "performer";
  const showSessionControl = devPreviewShowsOperatorSession(surface);

  const config = useMemo<DevPreviewConfig>(
    () =>
      normalizeDevPreviewConfig({
        surface,
        path,
        session,
        projectId: DEV_PREVIEW_PROJECT_ID,
      }),
    [surface, path, session],
  );

  const previewUrl = useMemo(
    () => buildDevPreviewUrl(config),
    [config],
  );

  const handleScreenshot = async (viewportId: string, width: number, height: number) => {
    const iframe = iframeRefs.current[viewportId];
    if (!iframe) {
      setScreenshotError("Podgląd nie jest jeszcze gotowy.");
      return;
    }

    setScreenshotError(null);
    setCapturingViewportId(viewportId);
    try {
      const blob = await requestDevPreviewScreenshot(iframe, width, height);
      downloadBlob(
        blob,
        buildDevPreviewScreenshotFilename(surface, path, viewportId),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nie udało się wykonać zrzutu ekranu";
      setScreenshotError(message);
      console.error("[DevLayoutMatrix] screenshot failed", error);
    } finally {
      setCapturingViewportId(null);
    }
  };

  const handleSurfaceChange = (nextSurface: DevSurface) => {
    setSurface(nextSurface);
    if (nextSurface === "performer") {
      setPath("/client");
      setSession(false);
    } else if (!devPreviewShowsOperatorSession(nextSurface)) {
      setSession(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/health", { method: "GET" });
        if (!cancelled) setHostOk(res.ok);
      } catch {
        if (!cancelled) setHostOk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dev Layout Matrix</h1>
        <div className={styles.controls}>
          <label className={styles.field}>
            Powierzchnia
            <Select
              value={surface}
              onChange={(e) => handleSurfaceChange(e.target.value as DevSurface)}
              aria-label="Powierzchnia"
            >
              {(Object.keys(SURFACE_LABELS) as DevSurface[]).map((id) => (
                <option key={id} value={id}>
                  {SURFACE_LABELS[id]}
                </option>
              ))}
            </Select>
          </label>
          {!isPerformerSurface ? (
            <>
              <label className={styles.field}>
                Trasa
                <Select
                  value={path}
                  onChange={(e) => setPath(e.target.value as DevPreviewRoute)}
                  aria-label="Trasa"
                >
                  {ROUTE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </label>
              {showSessionControl ? (
                <ShellSwitchRow
                  checked={session}
                  onChange={(e) => setSession(e.target.checked)}
                >
                  Sesja operatora
                </ShellSwitchRow>
              ) : null}
            </>
          ) : (
            <p className={styles.performerHint}>
              Podgląd Performer zawsze używa <code>/client</code> (bez sesji operatora).
            </p>
          )}
        </div>
      </header>

      {hostOk === false ? (
        <p className={styles.banner} role="status">
          Wymaga hosta — uruchom <code>pnpm dev</code> (serwer na porcie 4000).
          Podgląd shelli w iframe może nie wczytać danych bez API.
        </p>
      ) : null}

      {screenshotError ? (
        <p className={styles.errorBanner} role="alert">
          Zrzut ekranu nie powiódł się: {screenshotError}
        </p>
      ) : null}

      <div className={styles.grid}>
        <div className={styles.gridTrack}>
        {DEV_VIEWPORTS.map((vp) => (
          <section key={vp.id} className={styles.card}>
            <div className={styles.label}>{vp.label}</div>
            <div className={styles.frameWrap}>
              <iframe
                ref={(node) => {
                  iframeRefs.current[vp.id] = node;
                }}
                className={styles.frame}
                title={`Podgląd ${vp.label}`}
                src={previewUrl}
                width={vp.width}
                height={vp.height}
                style={{ width: `${vp.width}px`, height: `${vp.height}px` }}
                loading="lazy"
              />
            </div>
            <div className={styles.cardActions}>
              <Button
                type="button"
                variant="secondary"
                loading={capturingViewportId === vp.id}
                disabled={capturingViewportId !== null && capturingViewportId !== vp.id}
                aria-label={`Zrzut ekranu ${vp.label}`}
                onClick={() => {
                  void handleScreenshot(vp.id, vp.width, vp.height);
                }}
              >
                Zrzut ekranu
              </Button>
            </div>
          </section>
        ))}
        </div>
      </div>

      <p className={styles.hint}>
        Tylko <code>import.meta.env.DEV</code>. Otwórz{" "}
        <code>{typeof window !== "undefined" ? `${window.location.origin}/_dev/layouts` : "/_dev/layouts"}</code>
        {" "}przy działającym Vite + hoście :4000.
      </p>
    </div>
  );
}
