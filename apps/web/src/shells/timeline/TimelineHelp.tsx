/**
 * Timeline help overlay — tabbed shortcuts + tools/tracks (v4 topic parity).
 */

import { useId, useState } from "react";
import shellStyles from "../TimelineShell.module.css";
import { IconClose } from "../icons.js";
import { ShellIconButton } from "../ShellIconButton.js";
import styles from "./TimelineHelp.module.css";

type HelpSection = {
  title: string;
  items: string[];
};

type HelpTab = "shortcuts" | "tools";

const TABS: { id: HelpTab; label: string }[] = [
  { id: "shortcuts", label: "⌨️ Skróty Klawiszowe" },
  { id: "tools", label: "📖 Opis Narzędzi & Ścieżek" },
];

const SECTIONS: HelpSection[] = [
  {
    title: "Podstawy",
    items: [
      "Edytuj ścieżki Forma, Tekst, Akordy, Cue. Specjalne (Tempo / Tonacja / Metrum / Kotwice) — włącz w menu oka.",
      "Zapisz / Odrzuć — zapis lub cofnięcie lokalnych zmian na serwerze. Undo / Redo ze skrótów ⌘/Ctrl+Z / ⌘/Ctrl+Shift+Z lub z menu Edycja.",
      "Metadane (ikona info) — tytuł, PC, tempo domyślne, tonacja startowa, artysta, gatunek.",
      "Linki Admin / Klient w statusie — przełączenie widoku (bez labowego ShellNav).",
      "Live playhead — badge w statusie, gdy otwarty utwór = aktywny na transporcie.",
      "Utwory / setlista — tytuł otwiera bibliotekę; [ / ] lub Alt+←/→ = poprzedni / następny; auto-setlista po końcu utworu (współdzielona z Adminem).",
      "Transport — Play / Pause / Stop; pętla (C / L) po zakresie na linijce; metronom (głośność w Preferencjach); Podążaj za wskaźnikiem.",
      "Tempo / Metrum / Tonacja na toolbarze — edycja @ playhead; na lane’ach — Pencil / klik segmentu / Scissors.",
      "Pointer / Smart — zaznacz, przesuń, zmień długość (strefy na brzegach).",
      "Pencil — klik: 1 takt; przeciągnięcie: zakres z nadpisaniem (Forma + Tekst / Akordy / Cue). Na Tempo / Tonacja / Metrum: nowa zmiana mapy @ snap.",
      "Eraser — usuń clip (Forma / treść) lub zdarzenie mapy.",
      "Scissors — Forma: podsekcja (także pusty lane); Tekst / Akordy / Cue: podział clipu; mapy: nowa zmiana w miejscu cięcia.",
      "Zoom — narzędzie (prostokąt / klik tła = Fit) + suwaki H / V / UI; Ctrl+Alt = chwilowy Zoom.",
      "Różdżka (W) — Tekst→Forma / Akordy→Forma / obie (1 / 2 / 3 w menu).",
      "Tap (A) — kolejka linii Tekstu; Spacja = start @ locator; ↑/↓ = poprzednia/następna linia.",
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
      "Prawy przycisk myszy — menu kontekstowe: na klipie (wytnij / kopiuj / wklej / duplikuj / usuń / mute audio / rozdziel / Inspector); na pustej lane (wklej @ kursor, dodaj sekcję/cue/treść, import audio); na nagłówku ścieżki audio (nazwa / duplikuj / usuń).",
      "⌘/Ctrl przy przeciąganiu — chwilowo wyłącza snap (Forma: takt; treść/mapy: beat).",
      "Forma: Countdown zablokowany (bez pencil / scissors / delete); długość przez resize prawej krawędzi; single-move przesuwa też późniejsze sekcje.",
      "Kotwice — Pencil gdy jest MusicXML / mapa; przeciąganie kotwicy zmienia logicBar.",
    ],
  },
  {
    title: "Ścieżki Audio",
    items: [
      "+ Dodaj Ścieżkę pod listą ścieżek (dock) — nowa pusta lane audio; dwuklik pustego miejsca w kolumnie docku też dodaje ścieżkę.",
      "PPM na nagłówku ścieżki — zmień nazwę / duplikuj / usuń; Delete/⌫ przy zaznaczonej ścieżce (także multi).",
      "Dwuklik nazwy w docku — zmiana nazwy w miejscu (Enter/blur = zapis, Esc = anuluj); PPM „Zmień nazwę” to samo.",
      "Zaznaczanie ścieżek: klik = jedna; Shift+klik = zakres; ⌘/Ctrl+klik = przełącz w zestawie.",
      "S / M na docku = Solo / Mute; przy multi — na wszystkich zaznaczonych. ⌘/Ctrl+S/M = wszystkie ścieżki; ⌥/Alt+S = solo wyłącznie tej ścieżki.",
      "Dwuklik fadera — reset do 0.0 dB. Przycisk Mixer w transporcie — paski kanałów (te same S/M/fader).",
      "Dock responsywny: nazwa ze skracaniem środka (nie ellipsis na końcu); przy wąskiej kolumnie / niskiej wysokości ścieżki zostają nazwa + S/M (fader się chowa).",
      "Pusta lane — upuść plik audio lub PPM → Importuj plik audio; import też z Inspectora.",
      "Pointer / Smart — move i trim krawędzi; bez Pencil na lane audio.",
      "Schowek ⌘C / ⌘X / ⌘V / ⌘D — także dla klipów audio (także z PPM).",
      "Uchwyty Smart — fade in/out, region loop; crossfade przy styku klipów.",
    ],
  },
];

/** Column order: tall groups first so 3-col row fits without vertical scroll. */
const KEY_GROUPS: { heading: string; rows: { keys: string; action: string }[] }[] =
  [
    {
      heading: "Narzędzia",
      rows: [
        { keys: "T", action: "Menu narzędzi przy kursorze" },
        {
          keys: "T, potem litera",
          action: "T·S·P·E·C·Z·W·A — narzędzia",
        },
        { keys: "W", action: "Różdżka (1/2/3 w menu)" },
        { keys: "1 / 2 / 3", action: "Tekst / Akordy / obie" },
        { keys: "A", action: "Narzędzie Tap" },
        { keys: "↑ / ↓", action: "Tap: poprzednia / następna linia" },
        { keys: "Esc", action: "Zamknij overlay / menu / Tap" },
        { keys: "⌃/Ctrl+⌥/Alt", action: "Chwilowy Zoom" },
        { keys: "?", action: "Otwórz tę pomoc" },
        { keys: "⌘/Ctrl+drag", action: "Snap off" },
      ],
    },
    {
      heading: "Edycja i schowek",
      rows: [
        { keys: "⌘/Ctrl+S", action: "Zapisz (gdy dirty)" },
        { keys: "⌘/Ctrl+C", action: "Kopiuj klipy (w tym audio)" },
        { keys: "⌘/Ctrl+X", action: "Wytnij zaznaczone klipy" },
        { keys: "⌘/Ctrl+V", action: "Wklej @ locator" },
        { keys: "⌘/Ctrl+D", action: "Duplikuj zaznaczone" },
        { keys: "Delete / ⌫", action: "Usuń klip / mapę / ścieżkę audio" },
        { keys: "⌘/Ctrl+Z", action: "Undo (z zaznaczeniem)" },
        { keys: "⌘/Ctrl+⇧+Z", action: "Redo" },
      ],
    },
    {
      heading: "Transport",
      rows: [
        { keys: "Spacja", action: "Play / Pause (Tap: mark linii)" },
        { keys: "C / L", action: "Pętla / Cycle on/off" },
        { keys: "K", action: "Metronom on/off" },
        { keys: "M", action: "Mute ścieżki audio (dock)" },
        { keys: "S", action: "Solo ścieżki audio (dock)" },
        {
          keys: "⌘/Ctrl+klik S/M",
          action: "Solo/Mute wszystkich ścieżek audio",
        },
        {
          keys: "⌥/Alt+klik S",
          action: "Solo wyłącznie tej ścieżki",
        },
        {
          keys: "Shift / ⌘+klik",
          action: "Zakres / przełącz zaznaczenie ścieżek",
        },
      ],
    },
    {
      heading: "Locator i utwory",
      rows: [
        { keys: "← / →", action: "Locator ±1 beat" },
        { keys: "[ / ]", action: "Poprzedni / następny utwór" },
        { keys: "Alt+← / Alt+→", action: "Poprzedni / następny utwór" },
      ],
    },
    {
      heading: "Nawigacja i Zoom",
      rows: [
        { keys: "⌘/Ctrl+← / →", action: "Zoom H" },
        { keys: "⌘/Ctrl+↑ / ↓", action: "Zoom V" },
        { keys: "Z", action: "Fit Zoom (cały utwór)" },
        { keys: "Shift+Wheel", action: "Poziome przewijanie" },
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
        const parts = alt.split("+").map((p) => p.trim()).filter(Boolean);
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

type TimelineHelpProps = {
  onClose: () => void;
};

/** Full help panel (header tabs + body). `?` / help icon wiring stays in TimelineShell. */
export function TimelineHelp({ onClose }: TimelineHelpProps) {
  const baseId = useId();
  const [tab, setTab] = useState<HelpTab>("shortcuts");

  return (
    <>
      <div
        className={[shellStyles.overlayHead, shellStyles.helpOverlayHead]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.headMain}>
          <div className={shellStyles.helpOverlayHeadText}>
            <p className={shellStyles.helpOverlayEyebrow}>Timeline</p>
            <h2 id="tl-help-title">Pomoc</h2>
          </div>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Sekcje pomocy Timeline"
          >
            {TABS.map((t) => {
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`${baseId}-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-${t.id}-panel`}
                  tabIndex={selected ? 0 : -1}
                  className={[styles.tab, selected ? styles.tabSelected : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <ShellIconButton label="Zamknij" onClick={onClose}>
          <IconClose />
        </ShellIconButton>
      </div>
      <div
        className={[
          shellStyles.overlayBody,
          shellStyles.helpOverlayBody,
          tab === "shortcuts" ? styles.bodyNoScroll : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {tab === "shortcuts" ? (
          <div
            className={styles.shortcutsPanel}
            role="tabpanel"
            id={`${baseId}-shortcuts-panel`}
            aria-labelledby={`${baseId}-shortcuts`}
          >
            <div className={styles.keysGrid}>
              {KEY_GROUPS.map((group) => (
                <div key={group.heading} className={styles.keysGroup}>
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
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            role="tabpanel"
            id={`${baseId}-tools-panel`}
            aria-labelledby={`${baseId}-tools`}
          >
            <div className={shellStyles.helpGrid}>
              {SECTIONS.map((section) => (
                <section key={section.title} className={shellStyles.helpSection}>
                  <h3 className={shellStyles.helpSectionTitle}>{section.title}</h3>
                  <ul className={shellStyles.helpList}>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
