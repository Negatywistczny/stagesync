import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@stagesync/ui";
import { ticksToBbt, toDisplayBar, type Library } from "@stagesync/shared";
import { fetchLibrary } from "../lib/libraryApi.js";
import { useTransport } from "../transport/useTransport.js";
import { IconSettings, IconSun } from "./icons.js";
import styles from "./AdminShell.module.css";

type SectionId = "songs" | "set" | "stage" | "files" | "host";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "songs", label: "Utwory" },
  { id: "set", label: "Set" },
  { id: "stage", label: "Scena" },
  { id: "files", label: "Pliki" },
  { id: "host", label: "Host" },
];

export function AdminShell() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<SectionId>("songs");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [xmlModalOpen, setXmlModalOpen] = useState(false);
  const [batchPcOpen, setBatchPcOpen] = useState(false);
  const [pathPickerOpen, setPathPickerOpen] = useState(false);

  const { state, displayTicks, wsStatus } = useTransport();
  const bbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);
  const selected = library?.projects.find((p) => p.id === selectedId) ?? null;

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

  return (
    <div className={styles.shell}>
      <div className={styles.chromeWrap}>
        <header className={styles.chrome}>
          <div className={styles.identity}>
            <span className={styles.product}>
              Stage<span className={styles.productMark}>Sync</span>
            </span>
            <span className={styles.productRole}>Admin</span>
            <span className={styles.productVer}>5.0.0-alpha.1</span>
          </div>

          <nav className={styles.sections} aria-label="Sekcje">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={[
                  styles.sectionTab,
                  section === item.id ? styles.sectionTabOn : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={section === item.id}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className={styles.chromeAside}>
            <nav className={styles.appJump} aria-label="Aplikacje">
              <Link to="/timeline">Timeline</Link>
              <Link to="/">Klient</Link>
            </nav>
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
        </header>

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
      </div>

      <main className={styles.workspace}>
        {section === "songs" ? (
          <SongsView
            library={library}
            libraryError={libraryError}
            selectedId={selectedId}
            selected={selected}
            inspectorOpen={inspectorOpen}
            onSelect={setSelectedId}
            onToggleInspector={() => setInspectorOpen((v) => !v)}
            onImport={() => setImportModalOpen(true)}
            onXml={() => setXmlModalOpen(true)}
            onBatchPc={() => setBatchPcOpen(true)}
          />
        ) : null}
        {section === "set" ? <SetView /> : null}
        {section === "stage" ? <StageView /> : null}
        {section === "files" ? (
          <FilesView onOpenImport={() => setImportModalOpen(true)} />
        ) : null}
        {section === "host" ? (
          <HostView
            onSettings={() => setSettingsOpen(true)}
            onPathPicker={() => setPathPickerOpen(true)}
          />
        ) : null}
      </main>

      <footer className={styles.status} aria-label="Status koncertu">
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Teraz</span>
          <span className={styles.statusVal}>{selected?.name ?? "—"}</span>
        </div>
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Sekcja</span>
          <span className={styles.statusVal}>—</span>
        </div>
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Pozycja</span>
          <span className={[styles.statusVal, styles.statusMono].join(" ")}>
            {toDisplayBar(bbt.bar)}.{bbt.beat} · {state.bpm} BPM ·{" "}
            {state.timeSignature.numerator}/{state.timeSignature.denominator}
          </span>
        </div>
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Dalej</span>
          <span className={[styles.statusVal, styles.statusMuted].join(" ")}>
            z setu
          </span>
        </div>
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Połączenie</span>
          <span className={styles.statusVal}>{wsStatus}</span>
        </div>
        <Button variant="secondary" disabled>
          MIDI / Timeline
        </Button>
        <div className={styles.statusCorrect}>
          <label className={styles.statusField} title="Transpozycja">
            Tr.
            <input type="range" min={-12} max={12} defaultValue={0} disabled />
          </label>
          <label className={styles.statusField} title="Sync lead">
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
        <Modal title="Ustawienia hosta" onClose={() => setSettingsOpen(false)}>
          <fieldset className={styles.fieldset} disabled>
            <legend>MIDI</legend>
            <label className={styles.field}>
              Port
              <input className={styles.input} />
            </label>
          </fieldset>
          <fieldset className={styles.fieldset} disabled>
            <legend>Sieć, logi, ścieżki</legend>
            <p className={styles.muted}>
              Wartości z konfiguracji serwera — shell pod przyszłe API.
            </p>
            <Button variant="ghost" onClick={() => setPathPickerOpen(true)}>
              Wybierz ścieżkę…
            </Button>
          </fieldset>
          <div className={styles.actions}>
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
        <Modal title="Import" onClose={() => setImportModalOpen(false)}>
          <p className={styles.muted}>
            Podgląd konfliktów i wybór nadpisania albo kopii — shell.
          </p>
          <div className={styles.actions}>
            <Button variant="ghost" onClick={() => setImportModalOpen(false)}>
              Anuluj
            </Button>
            <Button variant="primary" disabled>
              Importuj
            </Button>
          </div>
        </Modal>
      ) : null}

      {xmlModalOpen ? (
        <Modal title="MusicXML" onClose={() => setXmlModalOpen(false)}>
          <p className={styles.muted}>Wgranie i podgląd partytury — shell.</p>
          <Button variant="ghost" onClick={() => setXmlModalOpen(false)}>
            Zamknij
          </Button>
        </Modal>
      ) : null}

      {batchPcOpen ? (
        <Modal title="Batch PC" onClose={() => setBatchPcOpen(false)}>
          <p className={styles.muted}>
            Numeracja Program Change dla zaznaczonych — shell.
          </p>
          <Button variant="ghost" onClick={() => setBatchPcOpen(false)}>
            Zamknij
          </Button>
        </Modal>
      ) : null}

      {pathPickerOpen ? (
        <Modal title="Ścieżka" onClose={() => setPathPickerOpen(false)}>
          <p className={styles.muted}>Przeglądanie katalogów — shell.</p>
          <Button variant="ghost" onClick={() => setPathPickerOpen(false)}>
            Zamknij
          </Button>
        </Modal>
      ) : null}
    </div>
  );
}

function SongsView({
  library,
  libraryError,
  selectedId,
  selected,
  inspectorOpen,
  onSelect,
  onToggleInspector,
  onImport,
  onXml,
  onBatchPc,
}: {
  library: Library | null;
  libraryError: string | null;
  selectedId: string | null;
  selected: Library["projects"][number] | null;
  inspectorOpen: boolean;
  onSelect: (id: string) => void;
  onToggleInspector: () => void;
  onImport: () => void;
  onXml: () => void;
  onBatchPc: () => void;
}) {
  return (
    <div
      className={[styles.split, inspectorOpen ? "" : styles.splitSolo]
        .filter(Boolean)
        .join(" ")}
    >
      <section className={styles.card} aria-label="Utwory">
        <div className={styles.cardHead}>
          <div>
            <h1 className={styles.cardTitle}>Utwory</h1>
            <p className={styles.cardHint}>Biblioteka projektów na tym hoście</p>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" disabled>
              Nowy
            </Button>
            <Button variant="ghost" onClick={onToggleInspector}>
              {inspectorOpen ? "Ukryj panel" : "Pokaż panel"}
            </Button>
            <Button variant="ghost" disabled>
              Eksport
            </Button>
            <Button variant="ghost" onClick={onImport}>
              Import
            </Button>
          </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.toolbar}>
            <input
              className={styles.input}
              placeholder="Filtruj…"
              disabled
              aria-label="Filtruj utwory"
            />
            <select className={styles.select} disabled aria-label="Sortowanie">
              <option>Kolejność bazy</option>
              <option>Tytuł A–Z</option>
              <option>PC ↑</option>
            </select>
            <button type="button" className={styles.chipOn} disabled>
              Wszystkie
            </button>
            <button type="button" className={styles.chip} disabled>
              Ostrzeżenia
            </button>
            <Button variant="ghost" disabled onClick={onBatchPc}>
              Batch PC
            </Button>
          </div>

          {libraryError ? (
            <p className={styles.error} role="alert">
              {libraryError}
            </p>
          ) : null}

          <div className={styles.list}>
            {library?.projects.map((p) => (
              <button
                key={p.id}
                type="button"
                className={[
                  styles.songRow,
                  selectedId === p.id ? styles.songRowOn : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSelect(p.id)}
              >
                <span className={styles.songPc}>—</span>
                <span className={styles.songName}>{p.name}</span>
                <span className={styles.songMeta}>XML · audio</span>
              </button>
            ))}
            {!library && !libraryError ? (
              <p className={styles.muted}>Wczytywanie…</p>
            ) : null}
          </div>

          <div className={styles.templates}>
            <h2 className={styles.subTitle}>Wzory</h2>
            <p className={styles.muted}>Szablony startowe — edycja później.</p>
          </div>
        </div>
      </section>

      {inspectorOpen ? (
        <aside className={styles.card} aria-label="Wybrany utwór">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Wybrany</h2>
            <Button
              variant="ghost"
              onClick={onToggleInspector}
              aria-label="Zamknij panel"
            >
              ×
            </Button>
          </div>
          <div className={styles.cardBody}>
            {selected ? (
              <>
                <p className={styles.inspectorName}>{selected.name}</p>
                <p className={styles.inspectorId}>{selected.id}</p>
                <div className={styles.actions}>
                  <Button variant="secondary" onClick={onXml}>
                    XML
                  </Button>
                  <Button variant="ghost" disabled>
                    Partytura
                  </Button>
                  <Link className={styles.editLink} to="/timeline">
                    Otwórz w Timeline
                  </Link>
                  <Button variant="ghost" disabled>
                    Usuń
                  </Button>
                </div>
                <div>
                  <h3 className={styles.subTitle}>Pliki projektu</h3>
                  <ul className={styles.assetList}>
                    <li>MusicXML</li>
                    <li>Audio (0…N)</li>
                    <li>Okładka</li>
                  </ul>
                </div>
              </>
            ) : (
              <p className={styles.muted}>Wybierz utwór z listy.</p>
            )}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function SetView() {
  return (
    <section className={styles.card} aria-label="Set">
      <div className={styles.cardHead}>
        <div>
          <h1 className={styles.cardTitle}>Set</h1>
          <p className={styles.cardHint}>Kolejność utworów na koncert</p>
        </div>
      </div>
      <div className={styles.cardBody}>
        <label className={styles.switchRow}>
          <input type="checkbox" disabled /> Aktywny set
        </label>
        <label className={styles.switchRow}>
          <input type="checkbox" disabled /> Auto z biblioteki
        </label>
        <div className={styles.actions}>
          <Button variant="secondary" disabled>
            Dodaj zaznaczone
          </Button>
          <Button variant="primary" disabled>
            Zapisz
          </Button>
          <Button variant="ghost" disabled>
            Wyczyść
          </Button>
        </div>
        <p className={styles.muted}>Lista pozycji (przeciąganie) — shell.</p>
      </div>
    </section>
  );
}

function StageView() {
  return (
    <div className={styles.twoUp}>
      <section className={styles.card} aria-label="Komunikat">
        <div className={styles.cardHead}>
          <div>
            <h1 className={styles.cardTitle}>Komunikat</h1>
            <p className={styles.cardHint}>Na ekrany klientów</p>
          </div>
        </div>
        <div className={styles.cardBody}>
          <textarea
            className={styles.textarea}
            maxLength={200}
            placeholder="Treść…"
            disabled
          />
          <div className={styles.chips}>
            {["Tekst", "Akordy", "Partytura", "Forma"].map((r) => (
              <button key={r} type="button" className={styles.chip} disabled>
                {r}
              </button>
            ))}
          </div>
          <div className={styles.actions}>
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

      <section className={styles.card} aria-label="Klienci">
        <div className={styles.cardHead}>
          <div>
            <h1 className={styles.cardTitle}>Klienci</h1>
            <p className={styles.cardHint}>Sieć i role</p>
          </div>
        </div>
        <div className={styles.cardBody}>
          <p className={styles.muted}>mDNS / IP</p>
          <p className={styles.muted}>Lista urządzeń i ról — shell.</p>
          <Button variant="ghost" disabled>
            Odśwież
          </Button>
        </div>
      </section>
    </div>
  );
}

function FilesView({ onOpenImport }: { onOpenImport: () => void }) {
  return (
    <section className={styles.card} aria-label="Pliki">
      <div className={styles.cardHead}>
        <div>
          <h1 className={styles.cardTitle}>Pliki</h1>
          <p className={styles.cardHint}>Paczki projektów</p>
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.dropZone}>Upuść .stagesync lub .zip</div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onOpenImport}>
            Z pliku…
          </Button>
          <Button variant="ghost" disabled>
            Eksport zaznaczonych
          </Button>
        </div>
      </div>
    </section>
  );
}

function HostView({
  onSettings,
  onPathPicker,
}: {
  onSettings: () => void;
  onPathPicker: () => void;
}) {
  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <h1 className={styles.cardTitle}>Host</h1>
            <p className={styles.cardHint}>Maszyna i usługa</p>
          </div>
          <div className={styles.actions}>
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

      <section className={styles.card} aria-label="Logi">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Logi</h2>
          <div className={styles.actions}>
            <Button variant="ghost" disabled>
              Pauza
            </Button>
            <Button variant="ghost" disabled>
              Wyczyść
            </Button>
          </div>
        </div>
        <pre className={styles.terminal}>Strumień logów — shell</pre>
      </section>

      <section className={styles.card} aria-label="MIDI">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>MIDI</h2>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.midiGrid}>
            <div className={styles.midiCard}>Clock/s —</div>
            <div className={styles.midiCard}>SPP/s —</div>
            <div className={styles.midiCard}>PC/s —</div>
            <div className={styles.midiCard}>Beat→WS —</div>
          </div>
        </div>
      </section>

      <section className={styles.card} aria-label="O aplikacji">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>O aplikacji</h2>
        </div>
        <div className={styles.cardBody}>
          <p>
            Wersja <strong>5.0.0-alpha.1</strong>
          </p>
          <p className={styles.muted}>
            Aktualizacje przez Docker (bump tagu) — bez Apply z UI.
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" disabled>
              Sprawdź aktualizacje
            </Button>
            <select className={styles.select} disabled aria-label="Kanał">
              <option>Oficjalne</option>
              <option>Testowe</option>
            </select>
          </div>
          <div>
            <h3 className={styles.subTitle}>Kopie zapasowe</h3>
            <div className={styles.actions}>
              <Button variant="ghost" disabled>
                Przywróć…
              </Button>
              <Button variant="ghost" onClick={onPathPicker}>
                Path picker
              </Button>
            </div>
          </div>
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
