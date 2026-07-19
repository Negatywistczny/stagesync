import { useEffect, useState } from "react";
import { Button } from "@stagesync/ui";
import { ticksToBbt, toDisplayBar, type Library } from "@stagesync/shared";
import { fetchLibrary } from "../lib/libraryApi.js";
import { useTransport } from "../transport/useTransport.js";
import { ShellNav } from "./ShellNav.js";
import styles from "./AdminShell.module.css";

export function AdminShell() {
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
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <span className={styles.brandMark} aria-hidden="true" />
          <div>
            <h1 className={styles.title}>StageSync Admin</h1>
            <p className={styles.subtitle}>
              Pulpit koncertowy · biblioteka · system
            </p>
          </div>
        </div>
        <ShellNav />
        <div className={styles.headerActions}>
          <Button variant="ghost" disabled title="Wkrótce">
            Wygląd
          </Button>
          <Button variant="ghost" disabled title="Wkrótce">
            Ustawienia
          </Button>
          <Button variant="ghost" disabled title="Wkrótce">
            Restart
          </Button>
          <span className={styles.version} title="Wersja oprogramowania">
            5.0.0-alpha.1
          </span>
        </div>
      </header>

      <div className={styles.stack}>
        <section className={styles.panel} aria-label="Pulpit koncertowy">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Pulpit koncertowy</h2>
          </div>
          <div className={styles.deskGrid}>
            <div className={styles.deskCard}>
              <h3 className={styles.deskLabel}>Transport</h3>
              <p className={styles.deskValue}>
                {selected?.name ?? "—"} · takt {toDisplayBar(bbt.bar)}.{bbt.beat}
              </p>
              <p className={styles.muted}>
                WS: {wsStatus}
                {state.playing ? " · play" : " · pause"} · {state.bpm} BPM ·{" "}
                {state.timeSignature.numerator}/{state.timeSignature.denominator}
              </p>
              <div className={styles.rowActions}>
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
                <Button variant="ghost" disabled title="Wkrótce">
                  Kontrola MIDI / Timeline
                </Button>
              </div>
            </div>
            <div className={styles.deskCard}>
              <h3 className={styles.deskLabel}>Następny (setlista)</h3>
              <p className={styles.muted}>Placeholder — gdy setlista włączona.</p>
            </div>
            <div className={styles.deskCard}>
              <h3 className={styles.deskLabel}>Sieć i klienci</h3>
              <p className={styles.muted}>
                mDNS / IP · podłączeni klienci + role — wkrótce.
              </p>
            </div>
            <div className={styles.deskCard}>
              <h3 className={styles.deskLabel}>Korekta na scenie</h3>
              <p className={styles.muted}>
                Transpozycja · sync lead · edycja zdalna — placeholdery.
              </p>
              <div className={styles.rowActions}>
                <Button variant="secondary" disabled>
                  Transpozycja
                </Button>
                <Button variant="secondary" disabled>
                  Sync lead
                </Button>
                <Button variant="ghost" disabled>
                  Edycja zdalna
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.panel} aria-label="Setlista koncertowa">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Setlista koncertowa</h2>
            <div className={styles.rowActions}>
              <Button variant="secondary" disabled>
                Włącz setlistę
              </Button>
              <Button variant="ghost" disabled>
                Auto-setlista
              </Button>
            </div>
          </div>
          <p className={styles.muted}>
            Edycja kolejności, PC, zapis — jak w v4; UI w kolejnym PR.
          </p>
        </section>

        <section className={styles.panel} aria-label="Komunikaty live">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Komunikaty live</h2>
            <Button variant="secondary" disabled>
              + Komunikat
            </Button>
          </div>
          <p className={styles.muted}>
            Tekst, role, priorytet, TTL — placeholder (parity v4).
          </p>
        </section>

        <section className={styles.panel} aria-label="Biblioteka utworów">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Biblioteka</h2>
            <div className={styles.rowActions}>
              <Button variant="secondary" disabled title="Wkrótce">
                Import projektu
              </Button>
              <Button variant="ghost" disabled title="Wkrótce">
                Eksport
              </Button>
            </div>
          </div>
          {libraryError ? (
            <p className={styles.error} role="alert">
              {libraryError}
            </p>
          ) : null}
          {!library && !libraryError ? (
            <p className={styles.muted}>Ładowanie…</p>
          ) : null}
          {library?.projects.length === 0 ? (
            <p className={styles.muted}>Brak projektów.</p>
          ) : null}
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Tytuł</span>
              <span>PC</span>
              <span>Assety</span>
              <span>Akcje</span>
            </div>
            {library?.projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={[
                  styles.tableRow,
                  selectedId === project.id ? styles.tableRowSelected : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelectedId(project.id)}
              >
                <span className={styles.tableTitle}>{project.name}</span>
                <span className={styles.muted}>—</span>
                <span className={styles.muted}>XML · audio · okładka</span>
                <span className={styles.muted}>Edytuj → Timeline</span>
              </button>
            ))}
          </div>
          {selected ? (
            <p className={styles.detailLine}>
              Wybrany: <strong>{selected.name}</strong> ({selected.id})
            </p>
          ) : null}
        </section>

        <section className={styles.panel} aria-label="Logi i monitor">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Logi / Monitor MIDI</h2>
          </div>
          <p className={styles.muted}>
            SSE logów · diagnostyka clock/SPP/PC — placeholdery (parity v4).
          </p>
        </section>

        <section className={styles.panel} aria-label="O aplikacji">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>O aplikacji</h2>
          </div>
          <p className={styles.deskValue}>Wersja 5.0.0-alpha.1</p>
          <p className={styles.muted}>
            Aktualizacja produkcyjna: bump tagu obrazu Docker (`data/` na
            volume). Brak git-apply z panelu — zob. ADR 0004.
          </p>
          <div className={styles.rowActions}>
            <Button variant="secondary" disabled title="Tylko info — wkrótce">
              Sprawdź aktualizacje
            </Button>
            <Button variant="ghost" disabled title="Wkrótce">
              Kopie zapasowe
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
