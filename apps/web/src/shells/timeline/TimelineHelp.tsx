/**
 * Timeline help overlay — content parity with v4 topics (adapted to v5 alpha).
 * No emoji chrome; text + kbd only.
 */

import styles from "../TimelineShell.module.css";

type HelpSection = {
  title: string;
  items: string[];
};

const SECTIONS: HelpSection[] = [
  {
    title: "Podstawy",
    items: [
      "Edytuj ścieżki Forma, Tekst, Akordy, Cue. Specjalne (Tempo / Tonacja / Metrum / Kotwice) — włącz w menu oka.",
      "Zapisz / Odrzuć — zapis lub cofnięcie lokalnych zmian na serwerze. Undo / Redo dostępne ze skrótów ⌘/Ctrl+Z / ⌘/Ctrl+Shift+Z lub z natywnego menu Edycja.",
      "Metadane (ikona info) — tytuł, PC, tempo domyślne, tonacja startowa, artysta, gatunek.",
      "Linki Admin / Klient w statusie — przełączenie widoku (bez labowego ShellNav).",
      "Live playhead — badge w statusie, gdy otwarty utwór = aktywny na transporcie.",
    ],
  },
  {
    title: "Utwory i setlista",
    items: [
      "Tytuł utworu — biblioteka / setlista.",
      "[ / ] lub Alt+← / Alt+→ — poprzedni / następny utwór setlisty (gdy setlista włączona).",
      "← / → (bez Alt) — locator ±1 beat.",
      "Auto-setlista — serwer po końcu utworu wczytuje następny (zatrzymany, takt 1.1); stan współdzielony z Adminem.",
    ],
  },
  {
    title: "Narzędzia",
    items: [
      "Pointer / Smart — zaznacz, przesuń, zmień długość (strefy na brzegach).",
      "Pencil — klik: 1 takt; przeciągnięcie: zakres z nadpisaniem (Forma + Tekst / Akordy / Cue). Na Tempo / Tonacja / Metrum: nowa zmiana mapy @ snap.",
      "Eraser — usuń clip (Forma / treść) lub zdarzenie mapy.",
      "Scissors — Forma: podsekcja wewnątrz sekcji (także klik pustego lane pod kursorem); Tekst / Akordy / Cue: podział clipu; Tempo / Tonacja / Metrum: nowa zmiana w miejscu cięcia.",
      "Zoom — narzędzie Zoom (prostokąt / klik tła = Fit) + suwaki H / V / UI; Ctrl+Alt = chwilowy Zoom.",
      "Różdżka (W) — rozmieść Tekst / Akordy wg sekcji Formy (1 / 2 / 3); Forma bez zmian; zaznaczenie = zakres.",
      "Tap (A) — kolejka linii Tekstu; Spacja = start @ locator; ↑/↓ = poprzednia/następna linia.",
    ],
  },
  {
    title: "Transport i pętla",
    items: [
      "Play / Pause i Stop — pasek transportu.",
      "Pętla (C / L) — przeciągnij zakres na linijce taktów, potem włącz przyciskiem lub skrótem.",
      "Metronom — włącz/wyłącz podczas odtwarzania (głośność w Preferencjach).",
      "Podążaj za wskaźnikiem — podczas Play przewija widok.",
      "Tempo / Metrum / Tonacja na toolbarze — edycja @ playhead; na lane’ach — Pencil / klik segmentu / Scissors.",
    ],
  },
  {
    title: "Locator i playhead",
    items: [
      "Locator — klik w linijkę taktów lub przeciągnij marker.",
      "Playhead — pozycja transportu serwera (SSOT); klient tylko wygładza między tickami.",
      "Dwuklik klipu — fokus panelu Właściwości (tablet: double-tap osi = Fit Zoom).",
    ],
  },
  {
    title: "Zaznaczanie i edycja",
    items: [
      "⌘/Ctrl przy przeciąganiu — chwilowo wyłącza snap (Forma: takt; treść/mapy: beat).",
      "Forma: Countdown zablokowany (bez pencil / scissors / delete); długość przez resize prawej krawędzi; single-move przesuwa też późniejsze sekcje.",
      "Kotwice — Pencil gdy jest MusicXML / mapa; przeciąganie kotwicy zmienia logicBar.",
      "Ścieżki Audio — menu oka (+ Ścieżka Audio); Pointer/Smart move/trim; schowek ⌘C/V/D; M = mute zaznaczonej ścieżki; S / M na docku = Solo / Mute.",
    ],
  },
];

const KEY_GROUPS: { heading: string; rows: { keys: string; action: string }[] }[] =
  [
    {
      heading: "Transport",
      rows: [
        { keys: "Spacja", action: "Play / Pause (w narzędziu Tap: mark linii)" },
        { keys: "C / L", action: "Pętla / Cycle on/off" },
        { keys: "K", action: "Metronom on/off" },
        { keys: "M", action: "Mute zaznaczonej ścieżki audio (dock)" },
      ],
    },
    {
      heading: "Locator i utwory",
      rows: [
        { keys: "← / →", action: "Locator ±1 beat" },
        { keys: "[ / ]", action: "Poprzedni / następny utwór setlisty" },
        { keys: "Alt+← / Alt+→", action: "Poprzedni / następny utwór setlisty" },
      ],
    },
    {
      heading: "Narzędzia",
      rows: [
        { keys: "T", action: "Menu narzędzi przy kursorze" },
        {
          keys: "T, potem litera",
          action:
            "Wskaźnik T · Inteligentny S · Ołówek P · Gumka E · Nożyczki C · Zoom Z · Różdżka W · Tap A",
        },
        { keys: "W", action: "Różdżka — menu; 1 Tekst→Forma, 2 Akordy→Forma, 3 obie" },
        { keys: "1 / 2 / 3", action: "(menu Różdżki) Tekst / Akordy / obie" },
        { keys: "A", action: "Narzędzie Tap" },
        { keys: "↑ / ↓ (Tap)", action: "Poprzednia / następna linia Tekstu" },
        { keys: "Esc (Tap)", action: "Wróć do Wskaźnika" },
        { keys: "⌃/Ctrl+⌥/Alt", action: "Chwilowy Zoom (przytrzymaj)" },
        { keys: "?", action: "Otwórz tę pomoc" },
        { keys: "Esc", action: "Zamknij overlay / menu / Tap" },
        { keys: "⌘/Ctrl przy drag", action: "Snap off" },
      ],
    },
    {
      heading: "Edycja i schowek",
      rows: [
        { keys: "⌘/Ctrl+S", action: "Zapisz (gdy są niezapisane zmiany)" },
        { keys: "⌘/Ctrl+C", action: "Kopiuj zaznaczone klipy (w tym audio)" },
        { keys: "⌘/Ctrl+X", action: "Wytnij zaznaczone klipy" },
        { keys: "⌘/Ctrl+V", action: "Wklej w pozycji wskaźnika (locatora)" },
        { keys: "⌘/Ctrl+D", action: "Duplikuj zaznaczone klipy" },
        {
          keys: "Delete / Backspace",
          action: "Usuń zaznaczony klip lub zdarzenie mapy",
        },
        { keys: "⌘/Ctrl+Z", action: "Undo (z zaznaczeniem)" },
        { keys: "⌘/Ctrl+⇧+Z", action: "Redo" },
      ],
    },
    {
      heading: "Nawigacja i Zoom",
      rows: [
        { keys: "⌘/Ctrl+← / →", action: "Powiększenie poziome (Zoom H)" },
        { keys: "⌘/Ctrl+↑ / ↓", action: "Powiększenie pionowe (Zoom V)" },
        { keys: "Z", action: "Dopasuj widok do pełnego utworu (Fit Zoom)" },
        { keys: "Shift + Wheel", action: "Poziome przewijanie osi czasu" },
      ],
    },
  ];

export function TimelineHelpBody() {
  return (
    <div className={styles.helpBody}>
      <div className={styles.helpGrid}>
        {SECTIONS.map((section) => (
          <section key={section.title} className={styles.helpSection}>
            <h3 className={styles.helpSectionTitle}>{section.title}</h3>
            <ul className={styles.helpList}>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className={styles.helpSection}>
        <h3 className={styles.helpSectionTitle}>Skróty klawiszowe</h3>
        <div className={styles.helpKeysGrid}>
          {KEY_GROUPS.map((group) => (
            <div key={group.heading} className={styles.helpKeysGroup}>
              <h4 className={styles.helpKeysHeading}>{group.heading}</h4>
              <dl className={styles.helpKeysDl}>
                {group.rows.map((row) => (
                  <div key={row.keys} className={styles.helpKeyRow}>
                    <dt>
                      <kbd className={styles.helpKbd}>{row.keys}</kbd>
                    </dt>
                    <dd>{row.action}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
