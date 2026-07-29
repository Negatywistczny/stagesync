import { useMemo, useState } from "react";
import styles from "./DevLayoutMatrix.module.css";
import {
  DEFAULT_DEV_PREVIEW_CONFIG,
  type DevPreviewConfig,
  type DevRoute,
  type DevSurface,
  buildDevPreviewUrl,
  devPreviewShowsOperatorSession,
  normalizeDevPreviewConfig,
} from "./devLayoutConfig.js";

type PreviewViewport = {
  label: string;
  width: number;
  height: number;
};

const PREVIEW_VIEWPORTS: PreviewViewport[] = [
  { label: "Mobile 375x667", width: 375, height: 667 },
  { label: "Tablet 768x1024", width: 768, height: 1024 },
  { label: "Desktop 1280x800", width: 1280, height: 800 },
];

export function DevLayoutMatrix() {
  const [surface, setSurface] = useState<DevSurface>(DEFAULT_DEV_PREVIEW_CONFIG.surface);
  const [route, setRoute] = useState<DevRoute>(DEFAULT_DEV_PREVIEW_CONFIG.route);
  const [session, setSession] = useState<boolean>(DEFAULT_DEV_PREVIEW_CONFIG.session);

  const isPerformerSurface = surface === "performer";
  const showSessionControl = devPreviewShowsOperatorSession(surface);

  const previewUrl = useMemo(() => {
    const config: DevPreviewConfig = normalizeDevPreviewConfig({ surface, route, session });
    return buildDevPreviewUrl(config);
  }, [route, session, surface]);

  const handleSurfaceChange = (nextSurface: DevSurface) => {
    setSurface(nextSurface);
    if (nextSurface === "performer") {
      setRoute("client");
      setSession(false);
    } else if (!devPreviewShowsOperatorSession(nextSurface)) {
      setSession(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.controls}>
        <label className={styles.control}>
          <span>Surface</span>
          <select
            className={styles.select}
            value={surface}
            onChange={(event) => handleSurfaceChange(event.target.value as DevSurface)}
          >
            <option value="web">web</option>
            <option value="tauri">tauri</option>
            <option value="console">console</option>
            <option value="performer">Android Performer (Client only)</option>
          </select>
        </label>
        {!isPerformerSurface ? (
          <>
            <label className={styles.control}>
              <span>Route</span>
              <select
                className={styles.select}
                value={route}
                onChange={(event) => setRoute(event.target.value as DevRoute)}
              >
                <option value="admin">/admin</option>
                <option value="timeline">/timeline/:projectId</option>
                <option value="client">/client</option>
              </select>
            </label>
            {showSessionControl ? (
              <label className={styles.sessionLabel}>
                <input
                  type="checkbox"
                  checked={session}
                  onChange={(event) => setSession(event.target.checked)}
                />
                <span>Operator session</span>
              </label>
            ) : null}
          </>
        ) : (
          <p className={styles.performerHint}>Performer previews always use /client (no operator session).</p>
        )}
      </section>

      <section className={styles.grid}>
        <div className={styles.gridTrack}>
          {PREVIEW_VIEWPORTS.map((viewport) => (
            <article key={viewport.label} className={styles.card}>
              <strong>{viewport.label}</strong>
              <span className={styles.label}>
                frame: {viewport.width}x{viewport.height}
              </span>
              <iframe
                className={styles.frame}
                title={viewport.label}
                src={previewUrl}
                width={viewport.width}
                height={viewport.height}
                style={{ width: `${viewport.width}px`, height: `${viewport.height}px` }}
                loading="lazy"
              />
            </article>
          ))}
        </div>
      </section>

      <p className={styles.url}>{previewUrl}</p>
    </main>
  );
}
