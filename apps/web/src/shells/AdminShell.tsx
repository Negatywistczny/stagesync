import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@stagesync/ui";
import { ticksToBbt, toDisplayBar, type Library } from "@stagesync/shared";
import { fetchLibrary } from "../lib/libraryApi.js";
import { useTransport } from "../transport/useTransport.js";
import { IconSettings, IconSun } from "./icons.js";
import styles from "./AdminShell.module.css";

export function AdminShell() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const { state, displayTicks, wsStatus } = useTransport();
  const bbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);

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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden />
          <div>
            <h1 className={styles.title}>
              StageSync Admin{" "}
              <span className={styles.version}>5.0.0-alpha.1</span>
            </h1>
            <p className={styles.subtitle}>
              Zarządzanie utworami i podgląd stanu na żywo
            </p>
          </div>
        </div>
        <nav className={styles.navLinks} aria-label="Aplikacje">
          <Link className={styles.appLink} to="/timeline">
            Timeline
          </Link>
          <Link className={styles.appLink} to="/">
            Klient
          </Link>
        </nav>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Wygląd"
            title="Wygląd"
            aria-expanded={appearanceOpen}
            onClick={() => setAppearanceOpen((v) => !v)}
          >
            <IconSun />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Ustawienia serwera"
            title="Ustawienia serwera"
            onClick={() => setSettingsOpen(true)}
          >
            <IconSettings />
          </button>
          <Button variant="ghost" disabled title="Restart (2×)">
            Restart
          </Button>
          <Button variant="ghost" disabled title="Wyłącz (2×)">
            Wyłącz
          </Button>
        </div>
        {appearanceOpen ? (
          <div className={styles.appearPop} role="dialog" aria-label="Wygląd">
            <p className={styles.appearTitle}>Wygląd</p>
            <label className={styles.switchRow}>
              <input type="checkbox" disabled /> Jasny motyw
            </label>
            <label className={styles.switchRow}>
              <input type="checkbox" disabled /> Wysoki kontrast
            </label>
          </div>
        ) : null}
      </header>

      <div className={styles.liveStrip} aria-label="Pulpit na żywo">
        <div className={styles.liveItem}>
          <span className={styles.liveLab}>Utwór</span>
          <strong>{selected?.name ?? "—"}</strong>
        </div>
        <div className={styles.liveItem}>
          <span className={styles.liveLab}>Sekcja</span>
          <span>—</span>
        </div>
        <div className={styles.liveItem}>
          <span className={styles.liveLab}>Pozycja</span>
          <span className={styles.mono}>
            {toDisplayBar(bbt.bar)}.{bbt.beat}
          </span>
        </div>
        <div className={styles.liveItem}>
          <span className={styles.liveLab}>Następny</span>
          <span className={styles.muted}>Setlista wyłączona</span>
        </div>
        <div className={styles.liveItem}>
          <span className={styles.liveLab}>Conn</span>
          <span>{wsStatus}</span>
        </div>
        <Button variant="secondary" disabled>
          Kontrola MIDI / Timeline
        </Button>
      </div>

      <div className={styles.body}>
        <section className={styles.mainCol} aria-label="Biblioteka">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Biblioteka</h2>
            <div className={styles.row}>
              <Button
                variant="secondary"
                onClick={() => setImportModalOpen(true)}
              >
                Importuj z pliku
              </Button>
              <Button variant="ghost" disabled>
                Eksportuj do pliku
              </Button>
            </div>
          </div>
          <div className={styles.toolbar}>
            <input
              className={styles.input}
              placeholder="Szukaj tytułu, artysty, gatunku, PC…"
              disabled
            />
            <select className={styles.select} disabled aria-label="Sortuj">
              <option>Kolejność bazy</option>
              <option>Tytuł A–Z</option>
              <option>PC rosnąco</option>
            </select>
            <div className={styles.chips}>
              <button type="button" className={styles.chipOn} disabled>
                Wszystkie
              </button>
              <button type="button" className={styles.chip} disabled>
                Ostrzeżenia
              </button>
            </div>
          </div>
          {libraryError ? (
            <p className={styles.error} role="alert">
              {libraryError}
            </p>
          ) : null}
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>
                <input type="checkbox" disabled aria-label="Zaznacz wszystkie" />
              </span>
              <span>PC</span>
              <span>Tytuł</span>
              <span>Wykonawca</span>
              <span>Gatunek</span>
              <span>Akcje</span>
            </div>
            {library?.projects.map((p) => (
              <div
                key={p.id}
                className={[
                  styles.tableRow,
                  selectedId === p.id ? styles.tableRowOn : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span>
                  <input
                    type="checkbox"
                    disabled
                    aria-label={`Zaznacz ${p.name}`}
                  />
                </span>
                <button
                  type="button"
                  className={styles.pcCell}
                  disabled
                  title="Edycja PC"
                >
                  —
                </button>
                <button
                  type="button"
                  className={styles.titleCell}
                  onClick={() => setSelectedId(p.id)}
                >
                  {p.name}
                </button>
                <span className={styles.muted}>—</span>
                <span className={styles.muted}>—</span>
                <span className={styles.actions}>
                  <Button variant="ghost" disabled>
                    XML
                  </Button>
                  <Button variant="ghost" disabled>
                    Partytura
                  </Button>
                  <Link className={styles.editLink} to="/timeline">
                    Edytuj
                  </Link>
                  <Button variant="ghost" disabled>
                    Usuń
                  </Button>
                </span>
              </div>
            ))}
          </div>
          <p className={styles.assetHint}>
            Assety projektu: XML · audio · okładka (folder projects/&lt;id&gt;/).
          </p>
          <div className={styles.templates}>
            <h3 className={styles.subTitle}>Wzory</h3>
            <p className={styles.muted}>
              Szablony `isTemplate` — Edytuj / Usuń (disabled).
            </p>
          </div>
        </section>

        <aside className={styles.sideCol}>
          <details className={styles.sidePanel} open>
            <summary>Setlista koncertowa</summary>
            <div className={styles.sideBody}>
              <label className={styles.switchRow}>
                <input type="checkbox" disabled /> Włącz setlistę
              </label>
              <label className={styles.switchRow}>
                <input type="checkbox" disabled /> Auto-setlista
              </label>
              <div className={styles.row}>
                <Button variant="secondary" disabled>
                  Dodaj zaznaczone
                </Button>
                <Button variant="primary" disabled>
                  Zapisz setlistę
                </Button>
                <Button variant="ghost" disabled>
                  Usuń wszystkie
                </Button>
              </div>
            </div>
          </details>

          <details className={styles.sidePanel} open>
            <summary>Komunikaty live</summary>
            <div className={styles.sideBody}>
              <textarea
                className={styles.textarea}
                maxLength={200}
                placeholder="Tekst komunikatu…"
                disabled
              />
              <div className={styles.chips}>
                <button type="button" className={styles.chip} disabled>
                  Tekst
                </button>
                <button type="button" className={styles.chip} disabled>
                  Akordy
                </button>
                <button type="button" className={styles.chip} disabled>
                  Partytura
                </button>
                <button type="button" className={styles.chip} disabled>
                  Forma
                </button>
              </div>
              <div className={styles.row}>
                <select className={styles.select} disabled>
                  <option>TTL 6 s</option>
                  <option>10 s</option>
                  <option>∞</option>
                </select>
                <Button variant="primary" disabled>
                  Wyślij
                </Button>
                <Button variant="ghost" disabled>
                  Wyczyść
                </Button>
              </div>
            </div>
          </details>

          <details className={styles.sidePanel} open>
            <summary>Sieć i klienci</summary>
            <div className={styles.sideBody}>
              <p className={styles.muted}>mDNS / IP · lista klientów + role</p>
              <Button variant="ghost" disabled>
                Odśwież
              </Button>
            </div>
          </details>

          <details className={styles.sidePanel} open>
            <summary>Korekta na scenie</summary>
            <div className={styles.sideBody}>
              <label className={styles.field}>
                Transpozycja (−12…+12)
                <input type="range" min={-12} max={12} defaultValue={0} disabled />
              </label>
              <label className={styles.field}>
                Sync lead (ms)
                <input
                  type="range"
                  min={-500}
                  max={500}
                  step={25}
                  defaultValue={200}
                  disabled
                />
              </label>
              <label className={styles.switchRow}>
                <input type="checkbox" defaultChecked disabled /> Edycja zdalna
              </label>
            </div>
          </details>
        </aside>
      </div>

      <details
        className={styles.bottomPanel}
        open={logsOpen}
        onToggle={(e) => setLogsOpen(e.currentTarget.open)}
      >
        <summary>Logi / Monitor MIDI</summary>
        <div className={styles.bottomGrid}>
          <div>
            <div className={styles.row}>
              <h3 className={styles.subTitle}>Logi serwera</h3>
              <Button variant="ghost" disabled>
                Wstrzymaj
              </Button>
              <Button variant="ghost" disabled>
                Wyczyść
              </Button>
            </div>
            <pre className={styles.terminal}>SSE logów — shell (później)</pre>
          </div>
          <div>
            <h3 className={styles.subTitle}>Monitor MIDI</h3>
            <div className={styles.midiGrid}>
              <div className={styles.midiCard}>Clock/s —</div>
              <div className={styles.midiCard}>SPP/s —</div>
              <div className={styles.midiCard}>PC/s —</div>
              <div className={styles.midiCard}>Beat→WS —</div>
            </div>
          </div>
        </div>
      </details>

      <details
        className={styles.bottomPanel}
        open={aboutOpen}
        onToggle={(e) => setAboutOpen(e.currentTarget.open)}
      >
        <summary>O aplikacji</summary>
        <div className={styles.sideBody}>
          <p>
            Wersja <strong>5.0.0-alpha.1</strong>
          </p>
          <p className={styles.muted}>
            Aktualizacja: Docker (bump tagu obrazu). Brak git-apply — ADR 0004.
          </p>
          <div className={styles.row}>
            <Button variant="secondary" disabled>
              Sprawdź aktualizacje
            </Button>
            <select className={styles.select} disabled aria-label="Kanał">
              <option>Oficjalne</option>
              <option>Testowe</option>
            </select>
          </div>
          <h3 className={styles.subTitle}>Kopie zapasowe</h3>
          <Button variant="ghost" disabled>
            Przywróć…
          </Button>
        </div>
      </details>

      {settingsOpen ? (
        <Modal title="Ustawienia serwera" onClose={() => setSettingsOpen(false)}>
          <fieldset className={styles.fieldset} disabled>
            <legend>MIDI</legend>
            <label className={styles.field}>
              Port MIDI
              <input className={styles.input} />
            </label>
          </fieldset>
          <fieldset className={styles.fieldset} disabled>
            <legend>Sieć / Logi / Ścieżki</legend>
            <p className={styles.muted}>Pola .env jak w v4 — shell.</p>
          </fieldset>
          <div className={styles.row}>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
              Anuluj
            </Button>
            <Button variant="primary" disabled>
              Zapisz
            </Button>
          </div>
        </Modal>
      ) : null}

      {importModalOpen ? (
        <Modal title="Import projektu" onClose={() => setImportModalOpen(false)}>
          <p className={styles.muted}>
            Preview konfliktów · Nadpisz / Utwórz jako nowe — shell.
          </p>
          <div className={styles.row}>
            <Button variant="ghost" onClick={() => setImportModalOpen(false)}>
              Anuluj
            </Button>
            <Button variant="primary" disabled>
              Importuj wybrane
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

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
      <div className={styles.modalPanel}>
        <div className={styles.modalHead}>
          <h2>{title}</h2>
          <button type="button" className={styles.iconBtn} onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
