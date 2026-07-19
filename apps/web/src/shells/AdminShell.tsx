import { useEffect, useState } from "react";
import { Button } from "@stagesync/ui";
import { ticksToBbt, toDisplayBar, type Library } from "@stagesync/shared";
import { fetchLibrary } from "../lib/libraryApi.js";
import { useTransport } from "../transport/useTransport.js";
import { ShellNav } from "./ShellNav.js";
import styles from "./AdminShell.module.css";

type RailSection = "utwory" | "setlista" | "sesja" | "import" | "system";

const RAIL: { id: RailSection; label: string }[] = [
  { id: "utwory", label: "Utwory" },
  { id: "setlista", label: "Setlista" },
  { id: "sesja", label: "Sesja" },
  { id: "import", label: "Import" },
  { id: "system", label: "System" },
];

export function AdminShell() {
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [detailCollapsed, setDetailCollapsed] = useState(false);
  const [section, setSection] = useState<RailSection>("utwory");
  const [library, setLibrary] = useState<Library | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { state, displayTicks, wsStatus, commandPending, play, pause } =
    useTransport();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchLibrary();
        if (cancelled) return;
        setLibrary(data);
        setSelectedId(data.projects[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setLibraryError(
            err instanceof Error ? err.message : "Nie udało się wczytać",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = library?.projects.find((p) => p.id === selectedId) ?? null;
  const bbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);

  return (
    <div
      className={[
        styles.shell,
        railCollapsed ? styles.railCollapsed : "",
        detailCollapsed ? styles.detailCollapsed : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          StageSync
          <span className={styles.brandSub}>Admin</span>
        </div>
        <ShellNav />
        <div className={styles.context}>
          <strong>{selected?.name ?? "Biblioteka"}</strong>
          <span>
            {state.bpm} BPM · {state.timeSignature.numerator}/
            {state.timeSignature.denominator}
          </span>
        </div>
        <div className={styles.topbarActions}>
          <Button
            variant="ghost"
            selected={railCollapsed}
            onClick={() => setRailCollapsed((v) => !v)}
            aria-expanded={!railCollapsed}
            title="Zwiń rail"
          >
            ☰
          </Button>
          <Button
            variant="ghost"
            selected={!detailCollapsed}
            onClick={() => setDetailCollapsed((v) => !v)}
            aria-expanded={!detailCollapsed}
          >
            Szczegóły
          </Button>
        </div>
      </header>

      <nav className={styles.rail} aria-label="Sekcje">
        {RAIL.map((item) => (
          <button
            key={item.id}
            type="button"
            className={[
              styles.railItem,
              section === item.id ? styles.railItemActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={section === item.id}
            onClick={() => setSection(item.id)}
          >
            <span className={styles.railLabel}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.main}>
        <section className={styles.panel} aria-label="Lista utworów">
          <div className={styles.panelHeader}>
            <h2>Utwory</h2>
            <Button variant="secondary" disabled title="Wkrótce">
              + Nowy
            </Button>
          </div>
          <div className={styles.panelBody}>
            {libraryError ? (
              <p className={styles.error} role="alert">
                {libraryError}
              </p>
            ) : null}
            {!library && !libraryError ? (
              <p className={styles.muted}>Ładowanie…</p>
            ) : null}
            {library?.projects.length === 0 ? (
              <p className={styles.muted}>Brak projektów w bibliotece.</p>
            ) : null}
            {library?.projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={[
                  styles.listRow,
                  selectedId === project.id ? styles.listRowSelected : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={selectedId === project.id}
                onClick={() => setSelectedId(project.id)}
              >
                <div>
                  <div className={styles.listTitle}>{project.name}</div>
                  <div className={styles.listMeta}>
                    {project.updatedAt
                      ? new Date(project.updatedAt).toLocaleString("pl-PL")
                      : project.id}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {!detailCollapsed ? (
          <aside className={styles.detail} aria-label="Szczegóły utworu">
            <div className={styles.panelHeader}>
              <h2>Szczegóły</h2>
              <Button
                variant="ghost"
                onClick={() => setDetailCollapsed(true)}
                aria-label="Zwiń szczegóły"
              >
                ×
              </Button>
            </div>
            <div className={styles.panelBody}>
              {selected ? (
                <>
                  <p className={styles.detailTitle}>{selected.name}</p>
                  <p className={styles.muted}>id: {selected.id}</p>
                  <p className={styles.muted}>
                    CRUD UI w kolejnym PR — tu tylko odczyt listy.
                  </p>
                </>
              ) : (
                <p className={styles.muted}>Wybierz utwór z listy.</p>
              )}
            </div>
          </aside>
        ) : null}
      </div>

      <footer className={styles.liveDesk} aria-label="Live Desk">
        <span className={styles.deskLabel}>Live Desk</span>
        <span className={styles.deskMeta}>
          WS: {wsStatus}
          {state.playing ? " · play" : " · pause"} · takt{" "}
          {toDisplayBar(bbt.bar)}.{bbt.beat}
        </span>
        <div className={styles.deskActions}>
          <Button
            variant="primary"
            loading={commandPending}
            selected={state.playing}
            onClick={() => void play()}
          >
            Play
          </Button>
          <Button
            variant="secondary"
            loading={commandPending}
            selected={!state.playing}
            onClick={() => void pause()}
          >
            Pause
          </Button>
        </div>
      </footer>
    </div>
  );
}
