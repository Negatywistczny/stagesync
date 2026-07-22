/**
 * Timeline help overlay — full operator content for 5.0.0 (v4 topics adapted to v5).
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
      "Zapisz / Odrzuć — zapis lub cofnięcie lokalnych zmian na serwerze. Undo / Redo w nagłówku (stos sesji).",
      "Metadane (ikona info) — tytuł, PC, tempo domyślne, tonacja startowa, artysta, gatunek.",
      "Admin / Klient / Timeline — przełączanie widoku (pasek aplikacji lub menu OS Widok w desktop).",
      "Dirty guard — przy wyjściu z Timeline z niezapisowanym draftem: Zapisz / Odrzuć / Anuluj.",
    ],
  },
  {
    title: "Utwory i setlista",
    items: [
      "Tytuł utworu — biblioteka / setlista (picker w nagłówku).",
      "← / → lub [ / ] — poprzedni / następny utwór setlisty (gdy setlista włączona).",
      "Auto-setlista — serwer po końcu utworu wczytuje następny (zatrzymany, takt 1.1); stan współdzielony z Adminem.",
      "Import UG — wklej tekst Ultimate Guitar → Akordy / Tekst (gdy dostępne w menu).",
    ],
  },
  {
    title: "Narzędzia",
    items: [
      "Pointer / Smart — zaznacz, przesuń, zmień długość (strefy na brzegach; Smart = strefy Logic-style).",
      "Pencil — klik: 1 takt; przeciągnięcie: zakres z nadpisaniem (Forma + Tekst / Akordy / Cue). Na Tempo / Tonacja / Metrum: nowa zmiana mapy @ snap.",
      "Eraser — usuń clip (Forma / treść) lub zdarzenie mapy.",
      "Scissors — Forma: podsekcja wewnątrz sekcji; Tekst / Akordy / Cue: podział clipu; mapy: nowa zmiana w miejscu cięcia.",
      "Różdżka (W) — Tekst → Forma, Akordy → Forma, albo obie. Zaznaczenie sekcji = zakres; bez zaznaczenia — cały utwór.",
      "Snap (toolbar) — Off / Takt / Beat / 1/2…1/16 ([ADR 0007] faza 2). Domyślnie Takt; nie zapisuje się w projekcie.",
      "Zoom — ikony + suwaki H / V / UI w statusie (± i range; nie ma narzędzia lupy na pasku).",
      "Tap — przy etykiecie ścieżki Tekst (dock); tempo @ locator z kolejnych stuknięć.",
      "T — menu narzędzi przy kursorze (litery jak v4).",
    ],
  },
  {
    title: "Transport i pętla",
    items: [
      "Play / Pause i Stop — pasek transportu. Autorytet czasu = serwer; playhead klienta tylko wygładza między tickami.",
      "Countdown — Play startuje z pre-roll gdy locator w CD; Stop wraca na początek Countdown (nie snap past CD).",
      "Pętla transportu — przeciągnij zakres na linijce taktów, potem włącz przyciskiem (C). Snap podglądu = beat (Cmd = off).",
      "Metronom (K) — włącz/wyłącz podczas odtwarzania.",
      "Podążaj za wskaźnikiem — podczas Play przewija widok.",
      "Tempo / Metrum / Tonacja na toolbarze — edycja @ playhead; na lane’ach — Pencil / klik segmentu / Scissors.",
    ],
  },
  {
    title: "Locator i playhead",
    items: [
      "Locator — klik w linijkę taktów lub przeciągnij marker (żółty).",
      "Playhead — pozycja transportu serwera (SSOT); klient tylko wygładza między tickami ([ADR 0002]).",
      "BBT na toolbarze — takt.beat (takt 1 = start utworu; Countdown ≤ 0).",
    ],
  },
  {
    title: "Zaznaczanie i edycja",
    items: [
      "⌘/Ctrl przy przeciąganiu — chwilowo wyłącza snap (sesja snap zostaje bez zmian).",
      "Marquee / multi-select — przeciągnij pusty obszar; multi-drag; Alt/⌥+drag = duplikat.",
      "Schowek — Cut / Copy / Paste clipów na lane (overwrite no-overlap).",
      "Forma: Countdown zablokowany (bez pencil / scissors / delete); długość przez resize prawej krawędzi.",
      "Kotwice — Pencil gdy jest MusicXML / mapa; przeciąganie kotwicy zmienia logicBar.",
    ],
  },
  {
    title: "Audio",
    items: [
      "Ścieżki Audio 0…N — menu oka (+ Ścieżka Audio); import plików w Admin / Pliki projektu.",
      "Pointer / Smart: select, move, trim w granicach pliku; zakaz pencil i stretch poza materiał.",
      "Waveform peak/RMS; gain clip + fader track; mute clip / track.",
      "Playback WebAudio sync do ticków serwera (`ticksToMs`) — bez własnego zegara muzycznego.",
      "Fade / crossfade / loop-region clip — w toku 5.0.0 ([ADR 0008]); Flex Time pozostaje OUT.",
    ],
  },
  {
    title: "MIDI i host",
    items: [
      "MIDI I/O + clock — wyłącznie w `apps/server` (Admin → Host). Nigdy w procesie Tauri.",
      "Desktop: menu Plik / Host / Transport mostkuje do API i WebView — bez autorytetu czasu w shellu.",
      "Status połączenia WS — kropka w statusie Timeline (Połączony / Łączenie / Rozłączony).",
    ],
  },
  {
    title: "Desktop (Tauri)",
    items: [
      "Menu StageSync — O programie, aktualizacje, Quit.",
      "Plik — Otwórz ostatnie, Zapisz, Zamknij projekt.",
      "Widok — Admin / Timeline / Klient, zakładki Admina, pełny ekran; zoom (Faza D).",
      "Transport — Odtwórz / Stop / prev / next (API serwera).",
      "Host — status, klienci, QR, restart, ustawienia.",
      "Pomoc — dokumentacja online, feedback; overlay skrótów = ta pomoc (?).",
      "Edycja (Faza D) — Undo / Redo / schowek gdy dostępne w Timeline.",
    ],
  },
];

const KEY_GROUPS: { heading: string; rows: { keys: string; action: string }[] }[] =
  [
    {
      heading: "Transport",
      rows: [
        { keys: "Spacja", action: "Play / Pause" },
        { keys: "C", action: "Pętla on/off" },
        { keys: "K", action: "Metronom on/off" },
      ],
    },
    {
      heading: "Locator i utwory",
      rows: [
        { keys: "← / →", action: "Locator ±1 beat" },
        { keys: "[ / ]", action: "Poprzedni / następny utwór setlisty" },
      ],
    },
    {
      heading: "Narzędzia i widok",
      rows: [
        { keys: "T", action: "Menu narzędzi przy kursorze" },
        { keys: "W", action: "Różdżka — menu" },
        { keys: "?", action: "Ta pomoc" },
        { keys: "Esc", action: "Zamknij overlay / menu" },
        { keys: "Snap (toolbar)", action: "Off / Takt / Beat / podział" },
        { keys: "⌘/Ctrl przy drag", action: "Snap off (chwilowo)" },
        { keys: "Scroll / gesty", action: "Zoom H/V (oś + wysokości)" },
      ],
    },
    {
      heading: "Edycja",
      rows: [
        { keys: "Delete / Backspace", action: "Usuń zaznaczony clip" },
        { keys: "⌘/Ctrl+Z", action: "Undo" },
        { keys: "⌘/Ctrl+⇧+Z", action: "Redo" },
        { keys: "⌘/Ctrl+X / C / V", action: "Cut / Copy / Paste" },
        { keys: "Alt/⌥+drag", action: "Duplikat clipów" },
        { keys: "⌘/Ctrl+S", action: "Zapisz draft (desktop Plik)" },
      ],
    },
  ];

export function TimelineHelpBody() {
  return (
    <div className={styles.helpBody}>
      <p className={styles.helpLead}>
        StageSync Timeline — pełna pomoc operatora (v5). Playhead i MIDI clock =
        serwer; shell desktop tylko mostkuje. Świadomie OUT: Flex Time, stretch
        audio, MIDI w procesie Tauri, clone chrome v4.
      </p>
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
