import { useEffect, useMemo, useState } from "react";
import { Select } from "@stagesync/ui";
import { ShellSwitchRow } from "../shells/ShellSwitchRow.js";
import {
  DEV_PREVIEW_PROJECT_ID,
  DEV_VIEWPORTS,
  type DevPreviewRoute,
  type DevSurface,
} from "./devSurfaceTypes.js";
import {
  buildDevPreviewUrl,
  type DevPreviewConfig,
} from "./devPreviewConfig.js";
import styles from "./DevLayoutMatrix.module.css";

const SURFACE_LABELS: Record<DevSurface, string> = {
  tauri: "Desktop Tauri",
  console: "Android Console",
  performer: "Android Performer",
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

  const config = useMemo<DevPreviewConfig>(
    () => ({
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
              onChange={(e) => setSurface(e.target.value as DevSurface)}
              aria-label="Powierzchnia"
            >
              {(Object.keys(SURFACE_LABELS) as DevSurface[]).map((id) => (
                <option key={id} value={id}>
                  {SURFACE_LABELS[id]}
                </option>
              ))}
            </Select>
          </label>
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
          <ShellSwitchRow
            checked={session}
            onChange={(e) => setSession(e.target.checked)}
          >
            Sesja operatora
          </ShellSwitchRow>
        </div>
      </header>

      {hostOk === false ? (
        <p className={styles.banner} role="status">
          Wymaga hosta — uruchom <code>pnpm dev</code> (serwer na porcie 4000).
          Podgląd shelli w iframe może nie wczytać danych bez API.
        </p>
      ) : null}

      <div className={styles.grid}>
        {DEV_VIEWPORTS.map((vp) => (
          <section key={vp.id} className={styles.card}>
            <div className={styles.label}>{vp.label}</div>
            <div className={styles.frameWrap}>
              <iframe
                className={styles.frame}
                title={`Podgląd ${vp.label}`}
                src={previewUrl}
                width={vp.width}
                height={vp.height}
              />
            </div>
          </section>
        ))}
      </div>

      <p className={styles.hint}>
        Tylko <code>import.meta.env.DEV</code>. Otwórz{" "}
        <code>{typeof window !== "undefined" ? `${window.location.origin}/_dev/layouts` : "/_dev/layouts"}</code>
        {" "}przy działającym Vite + hoście :4000.
      </p>
    </div>
  );
}
