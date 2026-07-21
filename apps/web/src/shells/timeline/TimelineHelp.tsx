/**
 * Timeline help overlay — operator cheat-sheet with v4-like visual chrome
 * (icon rows, section cards, accent panel) on `@stagesync/ui` tokens.
 */

import type { ReactNode } from "react";
import {
  IconAutoAdvance,
  IconChevronLeft,
  IconChevronRight,
  IconDiscard,
  IconEraser,
  IconEye,
  IconFollow,
  IconHelp,
  IconInfo,
  IconLoop,
  IconMetronome,
  IconPencil,
  IconPlay,
  IconPointer,
  IconSave,
  IconScissors,
  IconSmart,
  IconStop,
  IconTap,
  IconWand,
} from "../icons.js";
import styles from "../TimelineShell.module.css";

function HelpPreview({ children }: { children: ReactNode }) {
  return (
    <span className={styles.helpPreview} aria-hidden>
      {children}
    </span>
  );
}

function HelpChip({
  children,
  accent,
}: {
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={[styles.helpChip, accent ? styles.helpChipAccent : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}

function HelpRow({
  preview,
  children,
}: {
  preview?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className={styles.helpToolItem}>
      {preview ? <HelpPreview>{preview}</HelpPreview> : null}
      <span className={styles.helpToolText}>{children}</span>
    </li>
  );
}

function HelpSection({
  title,
  children,
  keys,
}: {
  title: string;
  children: ReactNode;
  keys?: boolean;
}) {
  return (
    <section
      className={[styles.helpSection, keys ? styles.helpSectionKeys : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <h3 className={styles.helpSectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

function LaneStrip() {
  const lanes = [
    { label: "Tm", className: styles.helpLaneTempo },
    { label: "To", className: styles.helpLaneTonacja },
    { label: "Me", className: styles.helpLaneMetrum },
    { label: "Ko", className: styles.helpLaneKotwice },
    { label: "Fo", className: styles.helpLaneForma },
    { label: "Te", className: styles.helpLaneTekst },
    { label: "Ak", className: styles.helpLaneAkordy },
    { label: "Cu", className: styles.helpLaneCue },
  ];
  return (
    <span className={styles.helpLaneStrip} aria-hidden>
      {lanes.map((lane) => (
        <span
          key={lane.label}
          className={[styles.helpLaneChip, lane.className]
            .filter(Boolean)
            .join(" ")}
        >
          {lane.label}
        </span>
      ))}
    </span>
  );
}

function MarkerPreview({ variant }: { variant: "locator" | "playhead" }) {
  return (
    <span className={styles.helpMarkerPreview} aria-hidden>
      <span className={styles.helpMarkerRuler} />
      <span
        className={[
          styles.helpMarkerDemo,
          variant === "locator" ? styles.helpMarkerLocator : styles.helpMarkerPlayhead,
        ].join(" ")}
      />
    </span>
  );
}

function HelpKbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.helpKbd}>{children}</kbd>;
}

function Chord({ parts }: { parts: ReactNode[] }) {
  return (
    <span className={styles.helpChord}>
      {parts.map((part, i) => (
        <span key={i} className={styles.helpChordPart}>
          {part}
        </span>
      ))}
    </span>
  );
}

type KeyRow = { chord: ReactNode; action: string };

const KEY_GROUPS: { heading: string; rows: KeyRow[] }[] = [
  {
    heading: "Transport",
    rows: [
      { chord: <HelpKbd>Spacja</HelpKbd>, action: "Play / Pause" },
      { chord: <HelpKbd>C</HelpKbd>, action: "Pętla on/off" },
      { chord: <HelpKbd>K</HelpKbd>, action: "Metronom on/off" },
    ],
  },
  {
    heading: "Locator i utwory",
    rows: [
      {
        chord: (
          <Chord
            parts={[
              <HelpKbd key="l">←</HelpKbd>,
              <span key="s" className={styles.helpKeyAlt}>
                /
              </span>,
              <HelpKbd key="r">→</HelpKbd>,
            ]}
          />
        ),
        action: "Locator ±1 beat",
      },
      {
        chord: (
          <Chord
            parts={[
              <HelpKbd key="a">[</HelpKbd>,
              <span key="s" className={styles.helpKeyAlt}>
                /
              </span>,
              <HelpKbd key="b">]</HelpKbd>,
            ]}
          />
        ),
        action: "Poprzedni / następny utwór setlisty",
      },
    ],
  },
  {
    heading: "Narzędzia i widok",
    rows: [
      { chord: <HelpKbd>T</HelpKbd>, action: "Menu narzędzi przy kursorze" },
      { chord: <HelpKbd>W</HelpKbd>, action: "Różdżka — menu" },
      { chord: <HelpKbd>?</HelpKbd>, action: "Ta pomoc" },
      { chord: <HelpKbd>Esc</HelpKbd>, action: "Zamknij overlay / menu" },
      {
        chord: (
          <Chord
            parts={[
              <HelpKbd key="m">⌘/Ctrl</HelpKbd>,
              <span key="p" className={styles.helpKeyPlus}>
                +
              </span>,
              <span key="d" className={styles.helpKeyAlt}>
                drag
              </span>,
            ]}
          />
        ),
        action: "Snap off (chwilowo)",
      },
    ],
  },
  {
    heading: "Edycja",
    rows: [
      {
        chord: (
          <span className={styles.helpChordsStack}>
            <HelpKbd>Delete</HelpKbd>
            <HelpKbd>Backspace</HelpKbd>
          </span>
        ),
        action: "Usuń zaznaczony clip",
      },
      {
        chord: (
          <Chord
            parts={[
              <HelpKbd key="m">⌘/Ctrl</HelpKbd>,
              <span key="p" className={styles.helpKeyPlus}>
                +
              </span>,
              <HelpKbd key="z">Z</HelpKbd>,
            ]}
          />
        ),
        action: "Undo",
      },
      {
        chord: (
          <Chord
            parts={[
              <HelpKbd key="m">⌘/Ctrl</HelpKbd>,
              <span key="p" className={styles.helpKeyPlus}>
                +
              </span>,
              <HelpKbd key="s">⇧</HelpKbd>,
              <span key="p2" className={styles.helpKeyPlus}>
                +
              </span>,
              <HelpKbd key="z">Z</HelpKbd>,
            ]}
          />
        ),
        action: "Redo",
      },
      {
        chord: (
          <Chord
            parts={[
              <HelpKbd key="m">⌘/Ctrl</HelpKbd>,
              <span key="p" className={styles.helpKeyPlus}>
                +
              </span>,
              <HelpKbd key="x">X</HelpKbd>,
              <span key="s" className={styles.helpKeyAlt}>
                /
              </span>,
              <HelpKbd key="c">C</HelpKbd>,
              <span key="s2" className={styles.helpKeyAlt}>
                /
              </span>,
              <HelpKbd key="v">V</HelpKbd>,
            ]}
          />
        ),
        action: "Cut / Copy / Paste",
      },
      {
        chord: (
          <Chord
            parts={[
              <HelpKbd key="a">Alt/⌥</HelpKbd>,
              <span key="p" className={styles.helpKeyPlus}>
                +
              </span>,
              <span key="d" className={styles.helpKeyAlt}>
                drag
              </span>,
            ]}
          />
        ),
        action: "Duplikat clipów",
      },
      {
        chord: (
          <Chord
            parts={[
              <HelpKbd key="m">⌘/Ctrl</HelpKbd>,
              <span key="p" className={styles.helpKeyPlus}>
                +
              </span>,
              <HelpKbd key="s">S</HelpKbd>,
            ]}
          />
        ),
        action: "Zapisz draft",
      },
    ],
  },
];

export function TimelineHelpBody() {
  return (
    <div className={styles.helpBody}>
      <p className={styles.helpLead}>
        Skróty i narzędzia Timeline (v5). Autorytet czasu i MIDI clock = serwer;
        shell tylko mostkuje. Świadomie OUT: Flex Time, stretch audio, MIDI w
        procesie Tauri.
      </p>

      <div className={styles.helpGrid}>
        <HelpSection title="Podstawy">
          <ul className={styles.helpList}>
            <HelpRow preview={<LaneStrip />}>
              Edytuj ścieżki <strong>Forma</strong>, <strong>Tekst</strong>,{" "}
              <strong>Akordy</strong>, <strong>Cue</strong>. Specjalne (
              <strong>Tempo</strong> / <strong>Tonacja</strong> /{" "}
              <strong>Metrum</strong> / <strong>Kotwice</strong>) — włącz w menu
              oka.
            </HelpRow>
            <HelpRow
              preview={
                <span className={styles.helpBtnGroup}>
                  <HelpChip accent>
                    <IconSave />
                  </HelpChip>
                  <HelpChip>
                    <IconDiscard />
                  </HelpChip>
                </span>
              }
            >
              <strong>Zapisz</strong> / <strong>Odrzuć</strong> — zapis lub
              cofnięcie lokalnych zmian. Undo / Redo w nagłówku.
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconInfo />
                </HelpChip>
              }
            >
              <strong>Metadane</strong> — tytuł, PC, tempo domyślne, tonacja
              startowa, artysta, gatunek.
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconEye />
                </HelpChip>
              }
            >
              Admin / Klient / Timeline — przełączanie widoku (pasek lub menu OS
              Widok w desktop). Dirty guard przy wyjściu z niezapisanym
              draftem.
            </HelpRow>
          </ul>
        </HelpSection>

        <HelpSection title="Utwory i setlista">
          <ul className={styles.helpList}>
            <HelpRow
              preview={
                <span className={styles.helpSongPreview}>
                  Utwór
                  <IconChevronRight />
                </span>
              }
            >
              <strong>Tytuł utworu</strong> — biblioteka / setlista (picker w
              nagłówku).
            </HelpRow>
            <HelpRow
              preview={
                <span className={styles.helpBtnGroup}>
                  <HelpChip>
                    <IconChevronLeft />
                  </HelpChip>
                  <HelpChip>
                    <IconChevronRight />
                  </HelpChip>
                </span>
              }
            >
              <strong>← / →</strong> lub <strong>[ / ]</strong> — poprzedni /
              następny utwór setlisty.
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconAutoAdvance />
                </HelpChip>
              }
            >
              <strong>Auto-setlista</strong> — po końcu utworu serwer wczytuje
              następny (zatrzymany, takt 1.1); stan współdzielony z Adminem.
            </HelpRow>
          </ul>
        </HelpSection>

        <HelpSection title="Narzędzia">
          <ul className={styles.helpList}>
            <HelpRow
              preview={
                <span className={styles.helpBtnGroup}>
                  <HelpChip accent>
                    <IconPointer />
                  </HelpChip>
                  <HelpChip>
                    <IconSmart />
                  </HelpChip>
                  <HelpChip>
                    <IconPencil />
                  </HelpChip>
                  <HelpChip>
                    <IconEraser />
                  </HelpChip>
                  <HelpChip>
                    <IconScissors />
                  </HelpChip>
                  <HelpChip>
                    <IconWand />
                  </HelpChip>
                </span>
              }
            >
              Pasek narzędzi — wybór trybu. <strong>T</strong> otwiera menu przy
              kursorze. <strong>Tap</strong> jest przy etykiecie ścieżki Tekst,
              nie na pasku.
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconPointer />
                </HelpChip>
              }
            >
              <strong>Pointer / Smart</strong> — zaznacz, przesuń, zmień długość
              (strefy na brzegach).
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconPencil />
                </HelpChip>
              }
            >
              <strong>Pencil</strong> — klik: 1 takt; przeciągnięcie: zakres z
              nadpisaniem. Na mapach Tempo / Tonacja / Metrum: nowa zmiana @
              snap.
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconEraser />
                </HelpChip>
              }
            >
              <strong>Eraser</strong> — usuń clip lub zdarzenie mapy.
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconScissors />
                </HelpChip>
              }
            >
              <strong>Scissors</strong> — Forma: podsekcja; treść: podział
              clipu; mapy: zmiana w miejscu cięcia.
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconWand />
                </HelpChip>
              }
            >
              <strong>Różdżka (W)</strong> — Tekst → Forma, Akordy → Forma, albo
              obie. Zaznaczenie = zakres; bez — cały utwór.
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconTap />
                </HelpChip>
              }
            >
              <strong>Tap</strong> — przy docku Tekst; tempo @ locator z
              kolejnych stuknięć.
            </HelpRow>
            <HelpRow>
              <strong>Snap</strong> (toolbar) — Off / Takt / Beat / podział.
              Zoom H / V / UI w statusie (bez lupy na pasku).
            </HelpRow>
          </ul>
        </HelpSection>

        <HelpSection title="Transport i pętla">
          <ul className={styles.helpList}>
            <HelpRow
              preview={
                <span className={styles.helpBtnGroup}>
                  <HelpChip accent>
                    <IconPlay />
                  </HelpChip>
                  <HelpChip>
                    <IconStop />
                  </HelpChip>
                </span>
              }
            >
              <strong>Play / Pause</strong> i <strong>Stop</strong> — pasek
              transportu. Countdown: Stop wraca na początek pre-roll.
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconLoop />
                </HelpChip>
              }
            >
              <strong>Pętla</strong> — przeciągnij zakres na linijce, potem
              włącz (C).
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconMetronome />
                </HelpChip>
              }
            >
              <strong>Metronom (K)</strong> — włącz/wyłącz podczas
              odtwarzania.
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconFollow />
                </HelpChip>
              }
            >
              <strong>Podążaj za wskaźnikiem</strong> — podczas Play przewija
              widok.
            </HelpRow>
            <HelpRow>
              <strong>Tempo / Metrum / Tonacja</strong> na toolbarze — edycja @
              playhead; na lane’ach — Pencil / klik / Scissors.
            </HelpRow>
          </ul>
        </HelpSection>

        <HelpSection title="Locator i playhead">
          <ul className={styles.helpList}>
            <HelpRow preview={<MarkerPreview variant="locator" />}>
              <strong>Locator</strong> — klik w linijkę taktów lub przeciągnij
              marker.
            </HelpRow>
            <HelpRow preview={<MarkerPreview variant="playhead" />}>
              <strong>Playhead</strong> — pozycja transportu serwera (SSOT);
              klient tylko wygładza między tickami.
            </HelpRow>
          </ul>
        </HelpSection>

        <HelpSection title="Zaznaczanie i edycja">
          <ul className={styles.helpList}>
            <HelpRow
              preview={
                <span className={styles.helpInputChord}>
                  <HelpKbd>⌘/Ctrl</HelpKbd>
                  <span className={styles.helpKeyPlus}>+</span>
                  <HelpChip>
                    <IconPointer />
                  </HelpChip>
                </span>
              }
            >
              Przy przeciąganiu — chwilowo wyłącza snap (Forma: takt; treść /
              mapy: beat).
            </HelpRow>
            <HelpRow>
              Marquee / multi-select; <strong>Alt/⌥+drag</strong> = duplikat.
              Schowek: Cut / Copy / Paste.
            </HelpRow>
            <HelpRow>
              Forma: <strong>Countdown</strong> zablokowany (bez pencil /
              scissors / delete); długość przez resize prawej krawędzi.
            </HelpRow>
            <HelpRow>
              <strong>Kotwice</strong> — Pencil gdy jest MusicXML / mapa;
              przeciąganie zmienia logicBar.
            </HelpRow>
          </ul>
        </HelpSection>

        <HelpSection title="Audio">
          <ul className={styles.helpList}>
            <HelpRow>
              Ścieżki Audio 0…N — menu oka (+ Ścieżka Audio). Pointer / Smart:
              move / trim; bez pencil.
            </HelpRow>
            <HelpRow>
              Waveform peak/RMS; gain clip + fader track; mute. Playback
              WebAudio sync do ticków serwera.
            </HelpRow>
            <HelpRow>
              Fade / crossfade / loop-region — w toku 5.0.0; Flex Time pozostaje
              OUT.
            </HelpRow>
          </ul>
        </HelpSection>

        <HelpSection title="MIDI i desktop">
          <ul className={styles.helpList}>
            <HelpRow>
              MIDI I/O + clock — wyłącznie w serwerze (Admin → Host). Nigdy w
              procesie Tauri.
            </HelpRow>
            <HelpRow>
              Desktop: menu Plik / Host / Transport mostkuje do API —
              bez autorytetu czasu w shellu.
            </HelpRow>
            <HelpRow
              preview={
                <HelpChip>
                  <IconHelp />
                </HelpChip>
              }
            >
              Pomoc OS i <strong>?</strong> otwierają ten overlay skrótów.
            </HelpRow>
          </ul>
        </HelpSection>
      </div>

      <HelpSection title="Skróty klawiszowe" keys>
        <div className={styles.helpKeysGrid}>
          {KEY_GROUPS.map((group) => (
            <div key={group.heading} className={styles.helpKeysGroup}>
              <h4 className={styles.helpKeysHeading}>{group.heading}</h4>
              <div className={styles.helpKeysRows}>
                {group.rows.map((row) => (
                  <div key={row.action} className={styles.helpKeyRow}>
                    <div className={styles.helpKeyChordCell}>{row.chord}</div>
                    <div className={styles.helpKeyAction}>{row.action}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </HelpSection>
    </div>
  );
}
