import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@stagesync/ui";
import {
  resolveMeterAt,
  resolveTempoAt,
  ticksPerBar,
  ticksToBbt,
  toDisplayBar,
  type FormaClip,
  type Project,
} from "@stagesync/shared";
import {
  buildBarMarks,
  clipStylePx,
  computeCanvasWidthPx,
  computeFormaViewSpan,
  pencilFormaClick,
  projectContentEqual,
  tickToPx,
  ticksFromPointer,
} from "../lib/formaCanvas.js";
import { fetchLibrary, fetchProject, putProject } from "../lib/libraryApi.js";
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
import { ShellWordmark } from "./ShellWordmark.js";
import { ConnectionIndicator } from "./ConnectionIndicator.js";
import {
  SettingsPopover,
  ShellAppearanceFields,
} from "./SettingsPopover.js";
import { ShellIconButton } from "./ShellIconButton.js";
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
  const { projectId } = useParams<{ projectId: string }>();
  const idPrefix = useId();
  const lanesCoordRef = useRef<HTMLDivElement>(null);
  const { state, displayTicks, wsStatus, commandPending, play, pause } =
    useTransport();
  const bbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);

  const [savedProject, setSavedProject] = useState<Project | null>(null);
  const [draftProject, setDraftProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savePending, setSavePending] = useState(false);
  const [libraryNames, setLibraryNames] = useState<
    { id: string; name: string }[]
  >([]);

  const [tool, setTool] = useState<ToolId>("pointer");
  const [wandOpen, setWandOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [songScreenOpen, setSongScreenOpen] = useState(false);
  const [showSpecial, setShowSpecial] = useState(true);
  const [eyeOpen, setEyeOpen] = useState(false);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const reloadProject = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const project = await fetchProject(id);
      setSavedProject(project);
      setDraftProject(project);
      setSelectedClipId(project.forma.clips[0]?.id ?? null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Nie udało się wczytać");
      setSavedProject(null);
      setDraftProject(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!projectId) return;
    void reloadProject(projectId);
  }, [projectId, reloadProject]);

  useEffect(() => {
    if (!songScreenOpen) return;
    void (async () => {
      try {
        const lib = await fetchLibrary();
        setLibraryNames(lib.projects.map((p) => ({ id: p.id, name: p.name })));
      } catch {
        setLibraryNames([]);
      }
    })();
  }, [songScreenOpen]);

  const dirty =
    savedProject !== null &&
    draftProject !== null &&
    !projectContentEqual(savedProject, draftProject);

  const viewSpan = useMemo(
    () => computeFormaViewSpan(draftProject?.forma.clips ?? []),
    [draftProject?.forma.clips],
  );

  const barTicks = draftProject
    ? ticksPerBar(draftProject.defaultMeter, draftProject.ppq)
    : ticksPerBar(
        { numerator: 4, denominator: 4 },
        960,
      );

  const canvasWidthPx = useMemo(
    () => computeCanvasWidthPx(viewSpan, barTicks),
    [viewSpan, barTicks],
  );

  const barMarks = useMemo(() => {
    if (!draftProject) return [];
    return buildBarMarks(
      viewSpan,
      draftProject.defaultMeter,
      draftProject.ppq,
    );
  }, [draftProject, viewSpan]);

  const playheadPx = tickToPx(displayTicks, viewSpan, barTicks);

  const selectedClip =
    draftProject?.forma.clips.find((c) => c.id === selectedClipId) ?? null;

  const meterAtPlayhead = draftProject
    ? resolveMeterAt(draftProject, displayTicks)
    : state.timeSignature;
  const tempoAtPlayhead = draftProject
    ? resolveTempoAt(draftProject, displayTicks)
    : state.bpm;

  async function onSave() {
    if (!projectId || !draftProject) return;
    setSavePending(true);
    try {
      const next = await putProject(projectId, draftProject);
      setSavedProject(next);
      setDraftProject(next);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Zapis nie powiódł się");
    } finally {
      setSavePending(false);
    }
  }

  function onDiscard() {
    if (!projectId) return;
    void reloadProject(projectId);
  }

  function onFormaPencilAt(clientX: number) {
    const coordRoot = lanesCoordRef.current;
    if (!coordRoot || !draftProject || tool !== "pencil") return;
    const ticks = ticksFromPointer(clientX, coordRoot, viewSpan, barTicks);
    const n =
      draftProject.forma.clips.filter((c) => c.kind === "section").length + 1;
    setDraftProject(
      pencilFormaClick(draftProject, ticks, `Sekcja ${n}`),
    );
  }

  function onFormaLaneClick(e: React.MouseEvent<HTMLDivElement>) {
    onFormaPencilAt(e.clientX);
  }

  if (!projectId) {
    return (
      <div className={styles.shell}>
        <p className={styles.muted}>Brak identyfikatora projektu.</p>
        <Link to="/admin">Admin</Link>
      </div>
    );
  }

  if (loading && !draftProject) {
    return (
      <div className={styles.shell}>
        <p className={styles.muted}>Wczytywanie projektu…</p>
      </div>
    );
  }

  if (loadError && !draftProject) {
    return (
      <div className={styles.shell}>
        <p className={styles.muted}>{loadError}</p>
        <Link to="/admin">Admin</Link>
      </div>
    );
  }

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
        <ShellWordmark suffix="Timeline" />

        <div className={styles.songCluster} role="group" aria-label="Setlista">
          <ShellIconButton label="Metadane utworu" disabled>
            ⓘ
          </ShellIconButton>
          <ShellIconButton label="Poprzedni utwór setlisty" disabled>
            <IconChevronLeft />
          </ShellIconButton>
          <button
            type="button"
            className={styles.songPicker}
            onClick={() => setSongScreenOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={songScreenOpen}
          >
            {draftProject?.name ?? "Wybierz utwór"}
          </button>
          <ShellIconButton label="Następny utwór setlisty" disabled>
            <IconChevronRight />
          </ShellIconButton>
          <ShellIconButton label="Auto-setlista" disabled pressed={false}>
            ▶|
          </ShellIconButton>
        </div>

        <div className={styles.headerActions}>
          <ShellIconButton label="Cofnij" disabled>
            <IconUndo />
          </ShellIconButton>
          <ShellIconButton label="Ponów" disabled>
            <IconRedo />
          </ShellIconButton>
          <Button variant="ghost" disabled={!dirty || savePending} onClick={onDiscard}>
            Odrzuć
          </Button>
          <Button
            variant="primary"
            disabled={!dirty || savePending}
            onClick={() => void onSave()}
          >
            Zapisz
          </Button>
          <ShellIconButton
            label="Pomoc"
            pressed={helpOpen}
            onClick={() => setHelpOpen(true)}
          >
            <IconHelp />
          </ShellIconButton>
          <ShellIconButton
            label="Wygląd"
            pressed={appearanceOpen}
            onClick={() => setAppearanceOpen((v) => !v)}
          >
            <IconSun />
          </ShellIconButton>
          <ShellIconButton label="Pełny ekran" disabled>
            ⛶
          </ShellIconButton>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.toolBar} role="toolbar" aria-label="Narzędzia">
          {TOOLS.map(({ id, title, Icon }) => (
            <ShellIconButton
              key={id}
              label={title}
              pressed={tool === id}
              onClick={() => onTool(id)}
            >
              <Icon />
            </ShellIconButton>
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
          <ShellIconButton label="Zatrzymaj" disabled>
            <IconStop />
          </ShellIconButton>
          <button
            type="button"
            className={styles.playBtn}
            aria-label={state.playing ? "Pauza" : "Odtwarzaj"}
            disabled={commandPending}
            onClick={() =>
              void (state.playing
                ? pause()
                : play({ projectId }))
            }
          >
            {state.playing ? <IconPause /> : <IconPlay />}
          </button>
          <ShellIconButton label="Pętla" disabled pressed={false}>
            ↻
          </ShellIconButton>
          <span className={styles.bbt} aria-live="polite">
            {toDisplayBar(bbt.bar)}.{bbt.beat}
          </span>
          <button type="button" className={styles.metaBtn} disabled title="Tempo">
            {tempoAtPlayhead} BPM
          </button>
          <span className={styles.metaRead}>
            {meterAtPlayhead.numerator}/{meterAtPlayhead.denominator}
          </span>
          <span className={styles.metaRead}>—</span>
          <ShellIconButton label="Metronom" disabled pressed={false}>
            ♪
          </ShellIconButton>
          <ShellIconButton label="Podążaj za wskaźnikiem" disabled pressed={false}>
            ◎
          </ShellIconButton>
        </div>

        <span className={styles.dirty} hidden={!dirty}>
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
          <div className={styles.canvasScroll} data-canvas-scroll>
            <div
              className={styles.canvasInner}
              style={{ width: `${canvasWidthPx}px` }}
            >
              <div className={styles.ruler} aria-hidden>
                {barMarks.map((mark) => (
                  <span
                    key={mark.ticks}
                    className={styles.rulerMark}
                    style={{
                      left: `${tickToPx(mark.ticks, viewSpan, barTicks)}px`,
                    }}
                  >
                    {mark.label}
                  </span>
                ))}
              </div>
              <div className={styles.lanes} ref={lanesCoordRef}>
                <div className={styles.barGrid} aria-hidden>
                  {barMarks.map((mark) => (
                    <span
                      key={`grid-${mark.ticks}`}
                      className={styles.barLine}
                      style={{
                        left: `${tickToPx(mark.ticks, viewSpan, barTicks)}px`,
                      }}
                    />
                  ))}
                </div>
                <div
                  className={styles.playhead}
                  style={{ left: `${playheadPx}px` }}
                  aria-hidden
                />
                <div
                  className={[
                    styles.lane,
                    styles.formaLane,
                    tool === "pencil" ? styles.formaLanePencil : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={onFormaLaneClick}
                  role="presentation"
                >
                  {draftProject?.forma.clips.map((clip) => (
                    <FormaClipButton
                      key={clip.id}
                      clip={clip}
                      selected={selectedClipId === clip.id}
                      style={clipStylePx(clip, viewSpan, barTicks)}
                      pencilActive={tool === "pencil"}
                      onSelect={setSelectedClipId}
                      onPencilAt={(clientX) => onFormaPencilAt(clientX)}
                    />
                  ))}
                </div>
            <Lane muted>
              <span className={styles.muted}>Tekst — OUT α3</span>
            </Lane>
            <Lane muted>
              <span className={styles.muted}>Akordy — OUT α3</span>
            </Lane>
            <Lane muted>
              <span className={styles.muted}>Cue — OUT α3</span>
            </Lane>
            {showSpecial ? (
              <>
                <Lane muted>
                  <span className={styles.muted}>
                    Tempo {tempoAtPlayhead} (read-only)
                  </span>
                </Lane>
                <Lane muted>
                  <span className={styles.muted}>Tonacja — OUT α3</span>
                </Lane>
                <Lane muted>
                  <span className={styles.muted}>
                    Metrum {meterAtPlayhead.numerator}/
                    {meterAtPlayhead.denominator} (read-only)
                  </span>
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
                    selected={false}
                    onSelect={() => undefined}
                  />
                </Lane>
              ))
            )}
              </div>
            </div>
          </div>
        </div>

        {inspectorOpen ? (
          <aside className={styles.inspector} aria-label="Właściwości">
            <div className={styles.inspHead}>
              <h2 className={styles.inspTitle}>Właściwości</h2>
              <ShellIconButton
                label="Ukryj właściwości"
                onClick={() => setInspectorOpen(false)}
              >
                ×
              </ShellIconButton>
            </div>
            <p className={styles.inspBody}>
              {selectedClip ? (
                <>
                  <strong>{selectedClip.name}</strong>
                  {selectedClip.kind === "countdown" ? (
                    <>
                      {" "}
                      — zablokowany; długość{" "}
                      {selectedClip.lengthTicks} ticks (pre-roll ≤ 0).
                    </>
                  ) : (
                    <>
                      {" "}
                      — start {selectedClip.startTicks}, długość{" "}
                      {selectedClip.lengthTicks} ticks.
                    </>
                  )}
                </>
              ) : (
                "Zaznacz clip na ścieżce Forma."
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
        <ConnectionIndicator status={wsStatus} variant="dot" />
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
              <ShellIconButton label="Zamknij" onClick={() => setHelpOpen(false)}>
                ×
              </ShellIconButton>
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
        <SettingsPopover
          title="Wygląd"
          placement="fixed-top-right"
          onClose={() => setAppearanceOpen(false)}
        >
          <ShellAppearanceFields />
        </SettingsPopover>
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
              <ShellIconButton label="Zamknij" onClick={() => setSongScreenOpen(false)}>
                ×
              </ShellIconButton>
            </div>
            <div className={styles.overlayBody}>
              <ul className={styles.songList}>
                {libraryNames.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/timeline/${p.id}`}
                      onClick={() => setSongScreenOpen(false)}
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
              {libraryNames.length === 0 ? (
                <p className={styles.muted}>Brak utworów w bibliotece.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
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

function Lane({
  children,
  muted,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={[styles.lane, muted ? styles.laneMuted : ""].join(" ")}>
      {children}
    </div>
  );
}

function FormaClipButton({
  clip,
  selected,
  style,
  pencilActive,
  onSelect,
  onPencilAt,
}: {
  clip: FormaClip;
  selected: boolean;
  style: { left: string; width: string };
  pencilActive: boolean;
  onSelect: (id: string) => void;
  onPencilAt: (clientX: number) => void;
}) {
  return (
    <button
      type="button"
      className={[
        styles.clip,
        styles.formaClip,
        selected ? styles.clipOn : "",
        clip.kind === "countdown" ? styles.clipLocked : "",
        pencilActive ? styles.formaClipPencil : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        if (pencilActive) {
          onPencilAt(e.clientX);
          return;
        }
        onSelect(clip.id);
      }}
    >
      {clip.kind === "countdown" ? "🔒 " : ""}
      {clip.name}
    </button>
  );
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
