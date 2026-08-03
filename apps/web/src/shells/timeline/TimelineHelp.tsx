/**
 * Timeline help overlay — sticky header/tabs, scrollable card body (v4 topic parity).
 */

import { useId, useMemo, useState } from "react";
import { Button } from "@stagesync/ui";
import { IconClose } from "../icons.js";
import { ShellIconButton } from "../ShellIconButton.js";
import styles from "./TimelineHelp.module.css";

type HelpTab = "shortcuts" | "tools";

type ShortcutRow = { keys: string; action: string };
type ShortcutGroup = { heading: string; rows: ShortcutRow[] };

type ToolBullet = { term: string; detail: string };
type ToolSection = { title: string; bullets: ToolBullet[] };

const TABS: { id: HelpTab; label: string }[] = [
  { id: "shortcuts", label: "Skróty klawiszowe" },
  { id: "tools", label: "Narzędzia i ścieżki" },
];

const KEY_GROUPS: ShortcutGroup[] = [
  {
    heading: "Widok",
    rows: [
      { keys: "X", action: "Mikser on/off (ikona obok Tempo)" },
      {
        keys: "I",
        action:
          "Inspector / Właściwości on/off (Timeline; × w panelu; ukryte w Mixerze)",
      },
      { keys: "? / Shift+/", action: "Otwórz tę pomoc" },
    ],
  },
  {
    heading: "Narzędzia",
    rows: [
      { keys: "T", action: "Otwórz menu narzędzi (akord)" },
      {
        keys: "T, potem T/P/E/I/J/M/S/A/G/R/Y",
        action:
          "Wybór narzędzia: T T Wskaźnik, T P Ołówek, T E Gumka, T I Nożyczki, T J Połącz, T M Mute, T S Solo, T A Fade, T G Gain, T R Zaznaczanie, T Y Zoom",
      },
      { keys: "W", action: "Różdżka — przycisk przy Formie lub skrót (1/2/3 w menu)" },
      { keys: "1 / 2 / 3", action: "Tekst / Akordy / obie (menu Różdżki)" },
      {
        keys: "Przycisk Tap (Tekst)",
        action: "Tryb Tap — kolejka linii (bez skrótu)",
      },
      { keys: "↑ / ↓", action: "Tap: poprzednia / następna linia" },
      { keys: "Esc", action: "Anuluj akord / odznacz / Tap→Wskaźnik" },
      { keys: "⌃/Ctrl+⌥/Alt", action: "Chwilowy Zoom" },
      { keys: "⌘/Ctrl+drag", action: "Snap off przy przeciąganiu" },
    ],
  },
  {
    heading: "Edycja",
    rows: [
      { keys: "⌘/Ctrl+S", action: "Zapisz (gdy dirty)" },
      { keys: "⌘/Ctrl+A", action: "Zaznacz wszystkie klipy" },
      { keys: "⌘/Ctrl+C", action: "Kopiuj klipy (w tym audio)" },
      { keys: "⌘/Ctrl+X", action: "Wytnij zaznaczone klipy" },
      { keys: "⌘/Ctrl+V", action: "Wklej przy locatorze" },
      { keys: "⌘/Ctrl+D", action: "Duplikuj zaznaczone" },
      { keys: "⌘/Ctrl+T", action: "Podziel zaznaczony klip przy playheadzie" },
      { keys: "⌘/Ctrl+J", action: "Połącz sąsiednie zaznaczone klipy" },
      { keys: "⌥/Alt+← / →", action: "Nudge zaznaczonego klipu ±1 siatka" },
      { keys: "Delete / ⌫", action: "Usuń klip / mapę / ścieżkę / bus / HW Out" },
      { keys: "⌘/Ctrl+Z", action: "Undo (z zaznaczeniem)" },
      { keys: "⌘/Ctrl+⇧+Z", action: "Redo" },
    ],
  },
  {
    heading: "Odtwarzanie",
    rows: [
      { keys: "Spacja", action: "Play / Pause (Tap: mark linii)" },
      { keys: "Shift+Spacja", action: "Play od startu zaznaczonego klipu" },
      { keys: "Enter / Home", action: "Stop + początek utworu" },
      { keys: "C", action: "Pętla / Cycle on/off" },
      {
        keys: "U / ⌘/Ctrl+U",
        action: "Cycle = długość zaznaczonego klipu audio",
      },
      { keys: "K", action: "Metronom on/off" },
      {
        keys: "⌘/Ctrl+klik S/M",
        action: "Solo/Mute wszystkich ścieżek (dock)",
      },
      { keys: "⌥/Alt+klik S", action: "Solo wyłącznie tej ścieżki" },
      {
        keys: "Shift / ⌘+klik",
        action: "Zakres / przełącz zaznaczenie ścieżek",
      },
    ],
  },
  {
    heading: "Nawigacja",
    rows: [
      { keys: "← / →", action: "Locator ±1 beat" },
      { keys: "[ / ]", action: "Poprzedni / następny utwór" },
      { keys: "⌘/Ctrl+← / →", action: "Zoom H" },
      { keys: "⌘/Ctrl+↑ / ↓", action: "Zoom V (lane)" },
      { keys: "Z", action: "Fit Zoom (cały utwór)" },
      { keys: "Shift+Wheel", action: "Poziome przewijanie" },
    ],
  },
];

const TOOL_SECTIONS: ToolSection[] = [
  {
    title: "Podstawy & Odtwarzanie",
    bullets: [
      {
        term: "Ścieżki",
        detail:
          "edytuj Forma, Tekst, Akordy, Cue; specjalne (Tempo / Tonacja / Metrum / Kotwice) włącz w menu oka.",
      },
      {
        term: "Zapisz / Odrzuć",
        detail:
          "zapis lub cofnięcie lokalnych zmian; Undo/Redo: ⌘/Ctrl+Z / ⌘/Ctrl+Shift+Z lub menu Edycja.",
      },
      {
        term: "Metadane",
        detail:
          "ikona info ⓘ — tytuł, PC, tempo, tonacja, artysta, gatunek.",
      },
      {
        term: "Widok",
        detail:
          "X = Mikser (bez panelu Właściwości); I / Właściwości = Inspector w Timeline; ? = ta pomoc.",
      },
      {
        term: "Odtwarzanie",
        detail:
          "Play / Pause / Stop (Enter/Home = stop + początek); pętla C; U = cycle z klipu audio; metronom K; Podążaj za wskaźnikiem.",
      },
      {
        term: "Utwory",
        detail:
          "tytuł otwiera bibliotekę; [ / ] = poprzedni / następny; auto-setlista po końcu utworu.",
      },
      {
        term: "Playhead",
        detail:
          "pozycja transportu serwera (SSOT); klient tylko wygładza między tickami. Locator — klik w linijkę lub przeciągnij marker.",
      },
      {
        term: "Shift+Spacja",
        detail: "odtwarzanie od startu zaznaczonego klipu (lub locatora).",
      },
    ],
  },
  {
    title: "Zaznaczanie i gesty myszy",
    bullets: [
      {
        term: "PPM",
        detail:
          "menu kontekstowe na klipie (wytnij / kopiuj / wklej / duplikuj / usuń / mute / rozdziel / Inspector), pustej lane i nagłówku ścieżki audio.",
      },
      {
        term: "⌘/Ctrl+drag",
        detail: "chwilowo wyłącza snap (Forma: takt; treść/mapy: beat).",
      },
      {
        term: "Schowek",
        detail:
          "⌘/Ctrl+A zaznacz wszystkie; ⌘/Ctrl+T podział przy playheadzie; ⌘/Ctrl+J scal; ⌥/Alt+←/→ nudge.",
      },
      {
        term: "Dwuklik klipu",
        detail: "fokus Inspectora; tablet: double-tap osi = Fit Zoom.",
      },
      {
        term: "Forma",
        detail:
          "Countdown zablokowany (bez pencil / scissors / delete); długość przez resize prawej krawędzi; single-move przesuwa też późniejsze sekcje.",
      },
      {
        term: "Kotwice",
        detail:
          "Pencil gdy jest MusicXML / mapa; przeciąganie kotwicy zmienia logicBar.",
      },
    ],
  },
  {
    title: "Ścieżki Audio i Dock",
    bullets: [
      {
        term: "+ Dodaj Ścieżkę",
        detail:
          "pod listą w docku; dwuklik pustego miejsca w kolumnie docku też dodaje ścieżkę.",
      },
      {
        term: "Zaznaczanie ścieżek",
        detail:
          "klik = jedna; Shift+klik = zakres; ⌘/Ctrl+klik = przełącz w zestawie.",
      },
      {
        term: "S / M",
        detail:
          "Solo / Mute w docku; przy multi — na zaznaczonych. ⌘/Ctrl+S/M = wszystkie; ⌥/Alt+S = solo wyłącznie tej.",
      },
      {
        term: "Fader",
        detail: "dwuklik fadera / dB = reset 0.0 dB.",
      },
      {
        term: "Mikser",
        detail:
          "ikona obok Tempo (X); pionowe paski: M / ST (PAN vs True Balance BAL), ciemny baner z cienkim paskiem koloru ścieżki, fader z podziałką, peak LED (mono 1 pasek / stereo L+R; zielony / żółty −6 / czerwony clip), S/M; Out = Master|Bus|HW; Busy / Click / Master; HW Out: M/ST, L/R, PPM/Delete; Master Out = para fizyczna przy multi-out; przypięty Stereo Out.",
      },
      {
        term: "Dock",
        detail:
          "nazwa + S/M w pierwszym rzędzie, fader na pełną szerokość w drugim; przeciągnij prawą krawędź kolumny (zapamiętane).",
      },
      {
        term: "Import US+UG (eksperymentalny)",
        detail:
          "Wybierz utwór → Import US+UG (eksperymentalny): tworzy nowy utwór (UltraStar czas+tekst, potem UG Forma+akordy). Nadpisanie draftu: Metadane (ⓘ) → Import US+UG → Importuj do draftu → Zapisz (⌘S). Mostek buduje Formę i akordy oraz przybliżoną mapę tempa z timingów UltraStar — sync z MP3 bywa niedokładny (mapa z sylab to proteza). Docelowo: Smart Tempo z audio. Słabe dopasowanie wymaga potwierdzenia. Osobne Import UG / UltraStar zostają; Różdżka (W) = naprawa / sam UG.",
      },
      {
        term: "Import UG",
        detail:
          "Wybierz utwór → Importuj UG: tworzy nowy utwór w bibliotece (szukaj / link Ultimate Guitar → podgląd → Utwórz nowy utwór). Nadpisanie bieżącego: Metadane utworu (ⓘ) → Importuj UG. Wklejenie tekstu zostaje jako zapas. Puste linie / [Verse]/[Chorus] → Forma.",
      },
      {
        term: "Import UltraStar",
        detail:
          "Wybierz utwór → Importuj UltraStar: tworzy nowy utwór (USDB / link / wklej .txt → Utwórz nowy utwór). Nadpisanie draftu: Metadane (ⓘ) → Importuj UltraStar → Importuj do draftu → Zapisz (⌘S). Konto USDB: Konto USDB w dialogu albo Ustawienia serwera. Melisma „~” nie trafia do tekstu; tempo z pliku aktualizuje metronom.",
      },
      {
        term: "Import",
        detail:
          "upuść plik na pustą lane, PPM → Importuj, albo z Inspectora.",
      },
      {
        term: "Schowek audio",
        detail: "⌘C / ⌘X / ⌘V / ⌘D także dla klipów audio (i z PPM).",
      },
    ],
  },
  {
    title: "Lista narzędzi audio",
    bullets: [
      {
        term: "Menu T",
        detail:
          "Logic-style: T otwiera menu przy kursorze; druga litera wybiera narzędzie. Same litery nie przełączają narzędzi.",
      },
      {
        term: "Pasek",
        detail:
          "domyślnie Wskaźnik / Ołówek / Gumka / Nożyczki; kafelek ustawień wybiera widoczne (lokalnie). Pełny zestaw zawsze przez T + litera.",
      },
      {
        term: "Pointer (T T)",
        detail:
          "zaznacz, przesuń, zmień długość (strefy na brzegach). Esc = anuluj / Wskaźnik / odznacz.",
      },
      {
        term: "Pencil (T P)",
        detail:
          "klik: 1 takt / marker; przeciągnięcie: zakres z nadpisaniem. Na mapach: nowa zmiana przy snapie. Na audio: klik w pustym → Import i wstawienie w miejscu kliknięcia (jak Logic).",
      },
      {
        term: "Eraser (T E)",
        detail: "usuń kliknięty klip (Forma / treść / audio) lub zdarzenie mapy.",
      },
      {
        term: "Scissors (T I)",
        detail:
          "podział klipu / podsekcja Formy / nowa zmiana mapy. Samo I = Inspector (nie nożyczki).",
      },
      {
        term: "Join (T J)",
        detail:
          "scal sąsiednie klipy albo usuń najbliższą granicę podsekcji Formy.",
      },
      {
        term: "Mute (T M) / Solo (T S)",
        detail:
          "klik = mute klipu; przytrzymaj LMB = chwilowe solo ścieżki. Dock S/M bez zmian.",
      },
      {
        term: "Fade (T A)",
        detail: "przeciągnij na krawędzi klipu: fade in / out.",
      },
      {
        term: "Gain (T G)",
        detail: "przeciągnij w pionie na klipie: poziom dB.",
      },
      {
        term: "Marquee (T R)",
        detail: "prostokąt zaznaczenia na siatce (także klipy audio).",
      },
      {
        term: "Zoom (T Y)",
        detail:
          "przeciągnij prostokąt na osi; klik tła = Fit; Ctrl+Alt = chwilowy Zoom. Z = Fit Zoom.",
      },
      {
        term: "Różdżka (W)",
        detail:
          "naprawa / sam UG: przycisk przy warstwie Forma lub W — Tekst→Forma / Akordy→Forma / obie (1 / 2 / 3). Przy imporcie US+UG struktura powstaje z mostka; Różdżka nie jest domyślną ścieżką.",
      },
      {
        term: "Tap",
        detail:
          "tylko przycisk przy warstwie Tekst: kolejka linii; Spacja = start przy playheadzie; ↑/↓ = linie; Esc wychodzi.",
      },
    ],
  },
];

/** Phrases that should stay as a single kbd chip. */
function isAtomicKeys(keys: string): boolean {
  return /przy |potem|,|drag/i.test(keys);
}

function KeyChord({ keys }: { keys: string }) {
  if (isAtomicKeys(keys)) {
    return <kbd className={styles.kbd}>{keys}</kbd>;
  }

  const alternatives = keys.split(" / ");
  return (
    <span className={styles.chord}>
      {alternatives.map((alt, altIdx) => {
        const parts = alt
          .split("+")
          .map((p) => p.trim())
          .filter(Boolean);
        return (
          <span key={`${alt}-${altIdx}`} className={styles.chordAlt}>
            {altIdx > 0 ? <span className={styles.keySlash}>/</span> : null}
            {parts.map((part, partIdx) => (
              <span key={`${part}-${partIdx}`} className={styles.chordPart}>
                {partIdx > 0 ? <span className={styles.keyPlus}>+</span> : null}
                <kbd className={styles.kbd}>{part}</kbd>
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

function matchesQuery(haystack: string, query: string): boolean {
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}

type TimelineHelpProps = {
  onClose: () => void;
};

/** Full help panel (header tabs + body). `?` / help icon wiring stays in TimelineShell. */
export function TimelineHelp({ onClose }: TimelineHelpProps) {
  const baseId = useId();
  const searchId = `${baseId}-search`;
  const [tab, setTab] = useState<HelpTab>("shortcuts");
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return KEY_GROUPS;
    return KEY_GROUPS.map((group) => ({
      ...group,
      rows: group.rows.filter(
        (row) =>
          matchesQuery(group.heading, normalizedQuery) ||
          matchesQuery(row.keys, normalizedQuery) ||
          matchesQuery(row.action, normalizedQuery),
      ),
    })).filter((group) => group.rows.length > 0);
  }, [normalizedQuery]);

  const filteredTools = useMemo(() => {
    if (!normalizedQuery) return TOOL_SECTIONS;
    return TOOL_SECTIONS.map((section) => ({
      ...section,
      bullets: section.bullets.filter(
        (b) =>
          matchesQuery(section.title, normalizedQuery) ||
          matchesQuery(b.term, normalizedQuery) ||
          matchesQuery(b.detail, normalizedQuery),
      ),
    })).filter((section) => section.bullets.length > 0);
  }, [normalizedQuery]);

  const isEmpty =
    tab === "shortcuts"
      ? filteredGroups.length === 0
      : filteredTools.length === 0;

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div className={styles.headMain}>
          <div className={styles.headText}>
            <p className={styles.eyebrow}>Timeline</p>
            <h2 id="tl-help-title" className={styles.title}>
              Pomoc
            </h2>
          </div>
          <div className={styles.searchRow}>
            <input
              id={searchId}
              className={styles.search}
              type="search"
              placeholder="Szukaj skrótów i opisów…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label="Filtruj pomoc"
            />
          </div>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Sekcje pomocy Timeline"
          >
            {TABS.map((t) => {
              const selected = tab === t.id;
              return (
                <Button
                  key={t.id}
                  variant="ghost"
                  role="tab"
                  id={`${baseId}-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-${t.id}-panel`}
                  tabIndex={selected ? 0 : -1}
                  selected={selected}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </Button>
              );
            })}
          </div>
        </div>
        <ShellIconButton label="Zamknij" onClick={onClose}>
          <IconClose />
        </ShellIconButton>
      </div>

      <div className={styles.body}>
        {isEmpty ? (
          <p className={styles.empty} role="status" aria-live="polite">
            Brak wyników dla „{query.trim()}”.
          </p>
        ) : null}

        {tab === "shortcuts" && !isEmpty ? (
          <div
            className={styles.keysGrid}
            role="tabpanel"
            id={`${baseId}-shortcuts-panel`}
            aria-labelledby={`${baseId}-shortcuts`}
          >
            {filteredGroups.map((group) => (
              <section key={group.heading} className={styles.keysCard}>
                <h3 className={styles.keysHeading}>{group.heading}</h3>
                <dl className={styles.keysDl}>
                  {group.rows.map((row) => (
                    <div key={row.keys} className={styles.keyRow}>
                      <dt>
                        <KeyChord keys={row.keys} />
                      </dt>
                      <dd>{row.action}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        ) : null}

        {tab === "tools" && !isEmpty ? (
          <div
            className={styles.toolsGrid}
            role="tabpanel"
            id={`${baseId}-tools-panel`}
            aria-labelledby={`${baseId}-tools`}
          >
            {filteredTools.map((section) => (
              <section key={section.title} className={styles.toolCard}>
                <h3 className={styles.toolCardTitle}>{section.title}</h3>
                <ul className={styles.toolList}>
                  {section.bullets.map((bullet) => (
                    <li
                      key={`${bullet.term}-${bullet.detail.slice(0, 24)}`}
                      className={styles.toolItem}
                    >
                      <span className={styles.toolBullet} aria-hidden />
                      <span className={styles.toolItemText}>
                        <span className={styles.term}>{bullet.term}</span>
                        {" — "}
                        {bullet.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
