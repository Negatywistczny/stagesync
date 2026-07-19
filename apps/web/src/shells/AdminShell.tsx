import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@stagesync/ui";
import { ticksToBbt, toDisplayBar, type Library } from "@stagesync/shared";
import { fetchLibrary } from "../lib/libraryApi.js";
import { useTransport } from "../transport/useTransport.js";
import { IconSettings, IconSun } from "./icons.js";
import styles from "./AdminShell.module.css";

type RailId = "library" | "setlist" | "stage" | "import" | "system";

const RAIL: { id: RailId; label: string }[] = [
  { id: "library", label: "Biblioteka" },
  { id: "setlist", label: "Setlista" },
  { id: "stage", label: "Scena" },
  { id: "import", label: "Import" },
  { id: "system", label: "System" },
];

export function AdminShell() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rail, setRail] = useState<RailId>("library");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [xmlModalOpen, setXmlModalOpen] = useState(false);
  const [batchPcOpen, setBatchPcOpen] = useState(false);
  const [pathPickerOpen, setPathPickerOpen] = useState(false);

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
    <div
      className={[styles.shell, railCollapsed ? styles.railCollapsed : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden />
          <div>
            <div className={styles.brandRow}>
              <span className={styles.brandName}>StageSync</span>
              <span className={styles.brandSub}>Admin</span>
              <span className={styles.version}>5.0.0-alpha.1</span>
            </div>
          </div>
        </div>

        <div className={styles.context}>
          <strong>{selected?.name ?? "—"}</strong>
          <span>
            {state.bpm} BPM · {state.timeSignature.numerator}/
            {state.timeSignature.denominator} · takt {toDisplayBar(bbt.bar)}.
            {bbt.beat}
          </span>
        </div>

        <nav className={styles.appLinks} aria-label="Aplikacje">
          <Link className={styles.appLink} to="/timeline">
            Timeline
          </Link>
          <Link className={styles.appLink} to="/">
            Klient
          </Link>
        </nav>

        <div className={styles.topbarActions}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Zwiń rail"
            aria-pressed={railCollapsed}
            title="Zwiń rail"
            onClick={() => setRailCollapsed((v) => !v)}
          >
            ☰
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Wygląd"
            aria-expanded={appearanceOpen}
            title="Wygląd"
            onClick={() => setAppearanceOpen((v) => !v)}
          >
            <IconSun />
          </button>
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

      <nav className={styles.rail} aria-label="Sekcje Admin">
        {RAIL.map((item) => (
          <button
            key={item.id}
            type="button"
            className={[
              styles.railItem,
              rail === item.id ? styles.railItemOn : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={rail === item.id}
            onClick={() => setRail(item.id)}
          >
            <span className={styles.railLabel}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.main}>
        {rail === "library" ? (
          <LibraryView
            library={library}
            libraryError={libraryError}
            selectedId={selectedId}
            selected={selected}
            detailOpen={detailOpen}
            onSelect={setSelectedId}
            onToggleDetail={() => setDetailOpen((v) => !v)}
            onImport={() => setImportModalOpen(true)}
            onXml={() => setXmlModalOpen(true)}
            onBatchPc={() => setBatchPcOpen(true)}
          />
        ) : null}
        {rail === "setlist" ? <SetlistView /> : null}
        {rail === "stage" ? <StageView /> : null}
        {rail === "import" ? (
          <ImportView onOpenModal={() => setImportModalOpen(true)} />
        ) : null}
        {rail === "system" ? (
          <SystemView
            onSettings={() => setSettingsOpen(true)}
            onPathPicker={() => setPathPickerOpen(true)}
          />
        ) : null}
      </div>

      <footer className={styles.liveDesk} aria-label="Live Desk">
        <div className={styles.deskBlock}>
          <span className={styles.deskLab}>Utwór</span>
          <strong>{selected?.name ?? "—"}</strong>
        </div>
        <div className={styles.deskBlock}>
          <span className={styles.deskLab}>Sekcja</span>
          <span>—</span>
        </div>
        <div className={styles.deskBlock}>
          <span className={styles.deskLab}>Pozycja</span>
          <span className={styles.mono}>
            {toDisplayBar(bbt.bar)}.{bbt.beat}
          </span>
        </div>
        <div className={styles.deskBlock}>
          <span className={styles.deskLab}>Następny</span>
          <span className={styles.muted}>Setlista</span>
        </div>
        <div className={styles.deskBlock}>
          <span className={styles.deskLab}>Conn</span>
          <span>{wsStatus}</span>
        </div>
        <Button variant="secondary" disabled>
          Kontrola MIDI / Timeline
        </Button>
        <div className={styles.deskCorrect}>
          <label className={styles.deskField} title="Transpozycja">
            Tr.
            <input type="range" min={-12} max={12} defaultValue={0} disabled />
          </label>
          <label className={styles.deskField} title="Sync lead">
            Lead
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
      </footer>

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
            <Button variant="ghost" onClick={() => setPathPickerOpen(true)}>
              Wybierz ścieżkę…
            </Button>
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

      {xmlModalOpen ? (
        <Modal title="MusicXML" onClose={() => setXmlModalOpen(false)}>
          <p className={styles.muted}>Upload / podgląd OSMD — shell.</p>
          <Button variant="ghost" onClick={() => setXmlModalOpen(false)}>
            Zamknij
          </Button>
        </Modal>
      ) : null}

      {batchPcOpen ? (
        <Modal title="Batch MIDI PC" onClose={() => setBatchPcOpen(false)}>
          <p className={styles.muted}>Numeruj PC dla zaznaczenia — shell.</p>
          <Button variant="ghost" onClick={() => setBatchPcOpen(false)}>
            Zamknij
          </Button>
        </Modal>
      ) : null}

      {pathPickerOpen ? (
        <Modal title="Wybór ścieżki" onClose={() => setPathPickerOpen(false)}>
          <p className={styles.muted}>Browse katalogów — shell.</p>
          <Button variant="ghost" onClick={() => setPathPickerOpen(false)}>
            Zamknij
          </Button>
        </Modal>
      ) : null}
    </div>
  );
}

function LibraryView({
  library,
  libraryError,
  selectedId,
  selected,
  detailOpen,
  onSelect,
  onToggleDetail,
  onImport,
  onXml,
  onBatchPc,
}: {
  library: Library | null;
  libraryError: string | null;
  selectedId: string | null;
  selected: Library["projects"][number] | null;
  detailOpen: boolean;
  onSelect: (id: string) => void;
  onToggleDetail: () => void;
  onImport: () => void;
  onXml: () => void;
  onBatchPc: () => void;
}) {
  return (
    <div
      className={[styles.workspace, detailOpen ? "" : styles.detailHidden]
        .filter(Boolean)
        .join(" ")}
    >
      <section className={styles.listPanel} aria-label="Lista utworów">
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Biblioteka</h2>
          <div className={styles.row}>
            <Button variant="secondary" disabled>
              + Nowy
            </Button>
            <Button variant="ghost" onClick={onToggleDetail}>
              Szczegóły
            </Button>
            <Button variant="ghost" disabled>
              Eksportuj
            </Button>
            <Button variant="ghost" onClick={onImport}>
              Importuj
            </Button>
          </div>
        </div>
        <div className={styles.listToolbar}>
          <input
            className={styles.input}
            placeholder="Szukaj…"
            disabled
            aria-label="Szukaj"
          />
          <select className={styles.select} disabled aria-label="Sortuj">
            <option>Kolejność bazy</option>
            <option>Tytuł A–Z</option>
            <option>PC rosnąco</option>
          </select>
          <button type="button" className={styles.chipOn} disabled>
            Wszystkie
          </button>
          <button type="button" className={styles.chip} disabled>
            Ostrzeżenia
          </button>
          <Button variant="ghost" disabled onClick={onBatchPc}>
            PC batch
          </Button>
        </div>
        {libraryError ? (
          <p className={styles.error} role="alert">
            {libraryError}
          </p>
        ) : null}
        <div className={styles.listBody}>
          {library?.projects.map((p) => (
            <button
              key={p.id}
              type="button"
              className={[
                styles.listRow,
                selectedId === p.id ? styles.listRowOn : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect(p.id)}
            >
              <span className={styles.listPc}>—</span>
              <span className={styles.listTitle}>{p.name}</span>
              <span className={styles.listMeta}>assety · XML · audio</span>
            </button>
          ))}
          {!library && !libraryError ? (
            <p className={styles.muted}>Ładowanie…</p>
          ) : null}
        </div>
        <div className={styles.templates}>
          <h3 className={styles.subTitle}>Wzory</h3>
          <p className={styles.muted}>Szablony — Edytuj / Usuń (disabled).</p>
        </div>
      </section>

      {detailOpen ? (
        <aside className={styles.detailPanel} aria-label="Szczegóły">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Szczegóły</h2>
            <Button variant="ghost" onClick={onToggleDetail} aria-label="Zwiń">
              ×
            </Button>
          </div>
          {selected ? (
            <div className={styles.detailBody}>
              <p className={styles.detailName}>{selected.name}</p>
              <p className={styles.muted}>id: {selected.id}</p>
              <div className={styles.row}>
                <Button variant="secondary" onClick={onXml}>
                  XML
                </Button>
                <Button variant="ghost" disabled>
                  Partytura
                </Button>
                <Link className={styles.editLink} to="/timeline">
                  Edytuj w Timeline
                </Link>
                <Button variant="ghost" disabled>
                  Usuń
                </Button>
              </div>
              <h3 className={styles.subTitle}>Assety projektu</h3>
              <ul className={styles.assetList}>
                <li>MusicXML</li>
                <li>Audio (0…N plików)</li>
                <li>Okładka</li>
              </ul>
            </div>
          ) : (
            <p className={styles.muted}>Wybierz utwór z listy.</p>
          )}
        </aside>
      ) : null}
    </div>
  );
}

function SetlistView() {
  return (
    <section className={styles.singlePanel} aria-label="Setlista">
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Setlista koncertowa</h2>
      </div>
      <div className={styles.panelPad}>
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
        <p className={styles.muted}>Wiersze setlisty (drag) — shell.</p>
      </div>
    </section>
  );
}

function StageView() {
  return (
    <div className={styles.stageGrid}>
      <section className={styles.singlePanel} aria-label="Komunikaty live">
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Komunikaty live</h2>
        </div>
        <div className={styles.panelPad}>
          <textarea
            className={styles.textarea}
            maxLength={200}
            placeholder="Tekst komunikatu…"
            disabled
          />
          <div className={styles.chips}>
            {["Tekst", "Akordy", "Partytura", "Forma"].map((r) => (
              <button key={r} type="button" className={styles.chip} disabled>
                {r}
              </button>
            ))}
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
      </section>
      <section className={styles.singlePanel} aria-label="Sieć i klienci">
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Sieć i klienci</h2>
        </div>
        <div className={styles.panelPad}>
          <p className={styles.muted}>mDNS / IP fallback</p>
          <p className={styles.muted}>Lista klientów + role</p>
          <Button variant="ghost" disabled>
            Odśwież
          </Button>
        </div>
      </section>
    </div>
  );
}

function ImportView({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <section className={styles.singlePanel} aria-label="Import">
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Import / eksport</h2>
      </div>
      <div className={styles.panelPad}>
        <div className={styles.dropZone}>
          Upuść plik .stagesync / .zip tutaj (shell)
        </div>
        <div className={styles.row}>
          <Button variant="secondary" onClick={onOpenModal}>
            Importuj z pliku
          </Button>
          <Button variant="ghost" disabled>
            Eksportuj zaznaczone
          </Button>
        </div>
      </div>
    </section>
  );
}

function SystemView({
  onSettings,
  onPathPicker,
}: {
  onSettings: () => void;
  onPathPicker: () => void;
}) {
  return (
    <div className={styles.systemStack}>
      <section className={styles.singlePanel}>
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>System</h2>
          <div className={styles.row}>
            <Button variant="secondary" onClick={onSettings}>
              <IconSettings /> Ustawienia
            </Button>
            <Button variant="ghost" disabled title="Restart (2×)">
              Restart
            </Button>
            <Button variant="ghost" disabled title="Wyłącz (2×)">
              Wyłącz
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.singlePanel} aria-label="Logi">
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Logi serwera</h2>
          <div className={styles.row}>
            <Button variant="ghost" disabled>
              Wstrzymaj
            </Button>
            <Button variant="ghost" disabled>
              Wyczyść
            </Button>
          </div>
        </div>
        <pre className={styles.terminal}>SSE logów — shell</pre>
      </section>

      <section className={styles.singlePanel} aria-label="Monitor MIDI">
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Monitor MIDI</h2>
        </div>
        <div className={styles.midiGrid}>
          <div className={styles.midiCard}>Clock/s —</div>
          <div className={styles.midiCard}>SPP/s —</div>
          <div className={styles.midiCard}>PC/s —</div>
          <div className={styles.midiCard}>Beat→WS —</div>
        </div>
      </section>

      <section className={styles.singlePanel} aria-label="O aplikacji">
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>O aplikacji</h2>
        </div>
        <div className={styles.panelPad}>
          <p>
            Wersja <strong>5.0.0-alpha.1</strong>
          </p>
          <p className={styles.muted}>
            Aktualizacja: Docker (bump tagu). Brak git-apply — ADR 0004.
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
          <Button variant="ghost" onClick={onPathPicker}>
            Path picker (test)
          </Button>
        </div>
      </section>
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
