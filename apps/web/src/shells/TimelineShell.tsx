import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@stagesync/ui";
import { ticksToBbt, toDisplayBar } from "@stagesync/shared";
import { useTransport } from "../transport/useTransport.js";
import {
  IconChevronLeft,
  IconChevronRight,
  IconEraser,
  IconEye,
  IconHelp,
  IconPause,
  IconPencil,
  IconPlay,
  IconPointer,
  IconRedo,
  IconScissors,
  IconStop,
  IconSun,
  IconTap,
  IconUndo,
  IconWand,
  IconZoom,
} from "./icons.js";
import styles from "./TimelineShell.module.css";

type ToolId = "pointer" | "pencil" | "eraser" | "scissors" | "zoom" | "wand";

const TOOLS: {
  id: ToolId;
  label: string;
  title: string;
  Icon: typeof IconPointer;
}[] = [
  {
    id: "pointer",
    label: "Pointer",
    title: "Pointer — zaznacz, przesuń, zmień długość",
    Icon: IconPointer,
  },
  {
    id: "pencil",
    label: "Pencil",
    title: "Pencil — klik: 1 takt; przeciągnij: nadpisz",
    Icon: IconPencil,
  },
  {
    id: "eraser",
    label: "Eraser",
    title: "Eraser — usuń clip / zaznaczenie",
    Icon: IconEraser,
  },
  {
    id: "scissors",
    label: "Scissors",
    title: "Scissors — Forma: podsekcja; Tekst/Akordy: podział",
    Icon: IconScissors,
  },
  {
    id: "zoom",
    label: "Zoom",
    title: "Zoom — przeciągnij prostokąt; klik tła = reset",
    Icon: IconZoom,
  },
  {
    id: "wand",
    label: "Różdżka",
    title: "Różdżka — menu auto-akcji",
    Icon: IconWand,
  },
];

const WAND_ACTIONS = [
  { id: "vocals-to-forma", label: "Tekst → Forma" },
  { id: "chords-to-forma", label: "Akordy → Forma" },
  { id: "both-to-forma", label: "Tekst + Akordy → Forma" },
] as const;

type AudioTrack = { id: string; name: string };

export function TimelineShell() {
  const idPrefix = useId();
  const { state, displayTicks, wsStatus, commandPending, play, pause } =
    useTransport();
  const bbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);

  const [tool, setTool] = useState<ToolId>("pointer");
  const [wandOpen, setWandOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [songScreenOpen, setSongScreenOpen] = useState(false);
  const [showSpecial, setShowSpecial] = useState(false);
  const [eyeOpen, setEyeOpen] = useState(false);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [selected, setSelected] = useState("Countdown");
  const [inspectorOpen, setInspectorOpen] = useState(true);

  function addAudio() {
    const n = audioTracks.length + 1;
    setAudioTracks((prev) => [
      ...prev,
      { id: `${idPrefix}-a-${n}`, name: `Audio ${n}` },
    ]);
  }

  function onTool(id: ToolId) {
    if (id === "wand") {
      setWandOpen((v) => !v);
      setTool("wand");
      return;
    }
    setWandOpen(false);
    setTool(id);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden />
          <div>
            <h1 className={styles.title}>StageSync Timeline</h1>
            <Link className={styles.adminLink} to="/admin">
              Admin
            </Link>
          </div>
        </div>

        <div className={styles.songCluster} role="group" aria-label="Setlista">
          <IconBtn label="Metadane utworu" disabled>
            ⓘ
          </IconBtn>
          <IconBtn label="Poprzedni utwór setlisty" disabled>
            <IconChevronLeft />
          </IconBtn>
          <button
            type="button"
            className={styles.songPicker}
            onClick={() => setSongScreenOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={songScreenOpen}
          >
            Wybierz utwór
          </button>
          <IconBtn label="Następny utwór setlisty" disabled>
            <IconChevronRight />
          </IconBtn>
          <IconBtn label="Auto-setlista" disabled pressed={false}>
            ▶|
          </IconBtn>
        </div>

        <div className={styles.headerActions}>
          <IconBtn label="Cofnij" disabled>
            <IconUndo />
          </IconBtn>
          <IconBtn label="Ponów" disabled>
            <IconRedo />
          </IconBtn>
          <Button variant="ghost" disabled>
            Odrzuć
          </Button>
          <Button variant="primary" disabled>
            Zapisz
          </Button>
          <IconBtn
            label="Pomoc"
            pressed={helpOpen}
            onClick={() => setHelpOpen(true)}
          >
            <IconHelp />
          </IconBtn>
          <IconBtn
            label="Wygląd"
            pressed={appearanceOpen}
            onClick={() => setAppearanceOpen((v) => !v)}
          >
            <IconSun />
          </IconBtn>
          <IconBtn label="Pełny ekran" disabled>
            ⛶
          </IconBtn>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.toolBar} role="toolbar" aria-label="Narzędzia">
          {TOOLS.map(({ id, title, Icon }) => (
            <button
              key={id}
              type="button"
              className={[
                styles.toolBtn,
                tool === id ? styles.toolActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={title}
              aria-label={title}
              aria-pressed={tool === id}
              onClick={() => onTool(id)}
            >
              <Icon />
            </button>
          ))}
          {wandOpen ? (
            <div className={styles.wandMenu} role="menu">
              {WAND_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="menuitem"
                  className={styles.wandItem}
                  disabled
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.transport} role="group" aria-label="Transport">
          <IconBtn label="Zatrzymaj" disabled>
            <IconStop />
          </IconBtn>
          <button
            type="button"
            className={styles.playBtn}
            aria-label={state.playing ? "Pauza" : "Odtwarzaj"}
            disabled={commandPending}
            onClick={() => void (state.playing ? pause() : play())}
          >
            {state.playing ? <IconPause /> : <IconPlay />}
          </button>
          <IconBtn label="Pętla" disabled pressed={false}>
            ↻
          </IconBtn>
          <span className={styles.bbt} aria-live="polite">
            {toDisplayBar(bbt.bar)}.{bbt.beat}
          </span>
          <button type="button" className={styles.metaBtn} disabled title="Tempo">
            {state.bpm} BPM
          </button>
          <span className={styles.metaRead}>
            {state.timeSignature.numerator}/{state.timeSignature.denominator}
          </span>
          <span className={styles.metaRead}>—</span>
          <IconBtn label="Metronom" disabled pressed={false}>
            ♪
          </IconBtn>
          <IconBtn label="Podążaj za wskaźnikiem" disabled pressed={false}>
            ◎
          </IconBtn>
        </div>

        <span className={styles.dirty} hidden>
          Niezapisane zmiany
        </span>
      </div>

      <div className={styles.main}>
        <aside className={styles.dock} aria-label="Ścieżki">
          <div className={styles.dockHead}>
            <button
              type="button"
              className={styles.eyeBtn}
              aria-label="Widoczność ścieżek"
              aria-expanded={eyeOpen}
              onClick={() => setEyeOpen((v) => !v)}
            >
              <IconEye />
            </button>
            {eyeOpen ? (
              <div className={styles.eyeMenu}>
                <button
                  type="button"
                  className={styles.eyeItem}
                  onClick={() => setShowSpecial((v) => !v)}
                >
                  Specjalne: {showSpecial ? "on" : "off"}
                </button>
              </div>
            ) : null}
          </div>
          <DockLabel>Forma</DockLabel>
          <DockLabel
            action={
              <button
                type="button"
                className={styles.tapBtn}
                title="Tap — timing linii Tekstu"
                aria-label="Tap"
                disabled
              >
                <IconTap />
              </button>
            }
          >
            Tekst
          </DockLabel>
          <DockLabel>Akordy</DockLabel>
          <DockLabel>Cue</DockLabel>
          {showSpecial ? (
            <>
              <DockLabel muted>Tempo</DockLabel>
              <DockLabel muted>Tonacja</DockLabel>
              <DockLabel muted>Metrum</DockLabel>
              <DockLabel muted>Kotwice</DockLabel>
            </>
          ) : null}
          {audioTracks.map((t) => (
            <DockLabel key={t.id}>{t.name}</DockLabel>
          ))}
          <Button variant="ghost" onClick={addAudio}>
            + Audio
          </Button>
        </aside>

        <div className={styles.canvas} aria-label="Canvas">
          <div className={styles.ruler}>
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i}>{i === 0 ? "CD" : i}</span>
            ))}
          </div>
          <div className={styles.lanes}>
            <div className={styles.playhead} aria-hidden />
            <Lane>
              <Clip
                name="Countdown"
                locked
                selected={selected === "Countdown"}
                onSelect={setSelected}
              />
              <Clip
                name="Intro"
                selected={selected === "Intro"}
                onSelect={setSelected}
              />
            </Lane>
            <Lane>
              <Clip
                name="Waiting on…"
                selected={selected === "Waiting on…"}
                onSelect={setSelected}
              />
            </Lane>
            <Lane>
              {["Am", "F", "C"].map((c) => (
                <Clip
                  key={c}
                  name={c}
                  selected={selected === c}
                  onSelect={setSelected}
                />
              ))}
            </Lane>
            <Lane>
              <Clip
                name="Fill → verse"
                selected={selected === "Fill → verse"}
                onSelect={setSelected}
              />
            </Lane>
            {showSpecial ? (
              <>
                <Lane>
                  <Clip name="118" selected={selected === "118"} onSelect={setSelected} />
                </Lane>
                <Lane>
                  <Clip name="Am" selected={false} onSelect={setSelected} />
                </Lane>
                <Lane>
                  <Clip name="4/4" selected={false} onSelect={setSelected} />
                </Lane>
                <Lane>
                  <Clip name="map" selected={false} onSelect={setSelected} />
                </Lane>
              </>
            ) : null}
            {audioTracks.length === 0 ? (
              <p className={styles.audioEmpty}>Brak ścieżek audio (0…N).</p>
            ) : (
              audioTracks.map((t) => (
                <Lane key={t.id}>
                  <Clip
                    name={`${t.name} clip`}
                    selected={selected === `${t.name} clip`}
                    onSelect={setSelected}
                  />
                </Lane>
              ))
            )}
          </div>
        </div>

        {inspectorOpen ? (
          <aside className={styles.inspector} aria-label="Właściwości">
            <div className={styles.inspHead}>
              <h2 className={styles.inspTitle}>Właściwości</h2>
              <IconBtn
                label="Ukryj właściwości"
                onClick={() => setInspectorOpen(false)}
              >
                ×
              </IconBtn>
            </div>
            <p className={styles.inspBody}>
              {selected === "Countdown" ? (
                <>
                  <strong>Countdown</strong> — zablokowany; ustaw długość (pre-roll
                  ≤ 0 w v5). Pole długości:
                  <input
                    className={styles.lengthInput}
                    type="number"
                    defaultValue={2}
                    disabled
                    aria-label="Długość Countdown (takty)"
                  />
                </>
              ) : (
                <>
                  Zaznaczenie: <strong>{selected}</strong>. Bindingi draftu —
                  później.
                </>
              )}
            </p>
          </aside>
        ) : (
          <button
            type="button"
            className={styles.showInsp}
            onClick={() => setInspectorOpen(true)}
          >
            Właściwości
          </button>
        )}
      </div>

      <footer className={styles.status}>
        <span
          className={[
            styles.connDot,
            wsStatus === "connected" ? styles.connOn : "",
          ].join(" ")}
          title={`WS: ${wsStatus}`}
        />
        <span className={styles.badge}>MIDI / Timeline</span>
        <div className={styles.zooms} role="group" aria-label="Zoom">
          <label className={styles.zoomLab}>
            UI
            <input type="range" min={50} max={150} defaultValue={100} disabled />
          </label>
          <label className={styles.zoomLab}>
            H
            <input type="range" min={24} max={160} defaultValue={48} disabled />
          </label>
          <label className={styles.zoomLab}>
            V
            <input type="range" min={40} max={160} defaultValue={72} disabled />
          </label>
        </div>
      </footer>

      {helpOpen ? (
        <div className={styles.overlay} role="dialog" aria-modal aria-labelledby="tl-help-title">
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Zamknij"
            onClick={() => setHelpOpen(false)}
          />
          <div className={styles.overlayPanel}>
            <div className={styles.overlayHead}>
              <h2 id="tl-help-title">Pomoc</h2>
              <IconBtn label="Zamknij" onClick={() => setHelpOpen(false)}>
                ×
              </IconBtn>
            </div>
            <div className={styles.overlayBody}>
              <p>Skróty i opis narzędzi — treść jak w v4 (statyczny shell).</p>
              <ul>
                <li>Pointer / Pencil / Eraser / Scissors / Zoom / Różdżka</li>
                <li>Tap na ścieżce Tekst</li>
                <li>Countdown: tylko długość</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}

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

      {songScreenOpen ? (
        <div className={styles.overlay} role="dialog" aria-modal aria-labelledby="song-screen-title">
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Zamknij"
            onClick={() => setSongScreenOpen(false)}
          />
          <div className={styles.overlayPanel}>
            <div className={styles.overlayHead}>
              <h2 id="song-screen-title">Wybierz utwór</h2>
              <IconBtn label="Zamknij" onClick={() => setSongScreenOpen(false)}>
                ×
              </IconBtn>
            </div>
            <div className={styles.overlayBody}>
              <input
                className={styles.search}
                placeholder="Szukaj tytułu, artysty…"
                disabled
              />
              <div className={styles.createRow}>
                <Button variant="secondary" disabled>
                  Ze wzoru
                </Button>
                <Button variant="secondary" disabled>
                  Import Ultimate Guitar
                </Button>
              </div>
              <p className={styles.muted}>Lista biblioteki — później.</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IconBtn({
  label,
  children,
  disabled,
  pressed,
  onClick,
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  pressed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        styles.iconBtn,
        pressed ? styles.iconBtnOn : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DockLabel({
  children,
  action,
  muted,
}: {
  children: ReactNode;
  action?: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={[styles.dockLabel, muted ? styles.dockMuted : ""].join(" ")}>
      <span>{children}</span>
      {action}
    </div>
  );
}

function Lane({ children }: { children: ReactNode }) {
  return <div className={styles.lane}>{children}</div>;
}

function Clip({
  name,
  selected,
  onSelect,
  locked,
}: {
  name: string;
  selected: boolean;
  onSelect: (n: string) => void;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      className={[
        styles.clip,
        selected ? styles.clipOn : "",
        locked ? styles.clipLocked : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect(name)}
    >
      {locked ? "🔒 " : ""}
      {name}
    </button>
  );
}
