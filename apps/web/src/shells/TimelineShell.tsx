import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
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
  DEFAULT_PX_PER_BAR,
  projectContentEqual,
  snapEditTicks,
  tickToPx,
  ticksFromPointer,
} from "../lib/formaCanvas.js";
import {
  commitGesture,
  deleteFormaClip,
  previewFromSession,
} from "../lib/formaEdit.js";
import {
  countdownBars,
  renameFormaClip,
  setCountdownBars,
} from "../lib/formaInspector.js";
import {
  deleteTekstClip,
  pencilTekstClick,
  setTekstClipText,
} from "../lib/tekstEdit.js";
import { APP_VERSION } from "../lib/appVersion.js";
import { fetchLibrary, fetchProject, putProject } from "../lib/libraryApi.js";
import {
  fetchSetlist,
  patchSetlistAutoAdvance,
} from "../lib/setlistApi.js";
import {
  meterMapSegments,
  segmentStylePx,
  tempoMapSegments,
} from "../lib/mapSegments.js";
import {
  cursorForHitZone,
  hitTestClipZone,
  toolAllowsClipHitZones,
  toolIsPencilDraw,
  type FormaGesturePreview,
  type FormaGestureSession,
  type FormaToolId,
} from "../lib/timelineGesture.js";
import {
  defaultTrackVisibility,
  isCoreTrackVisible,
  TRACKS,
  type CoreTrackId,
} from "../lib/timelineTracks.js";
import { loadTransport } from "../transport/api.js";
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
  IconSmart,
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

type ToolId = FormaToolId;

const TOOLS: {
  id: ToolId;
  label: string;
  title: string;
  Icon: typeof IconPointer;
  disabled?: boolean;
}[] = [
  {
    id: "pointer",
    label: "Pointer",
    title: "Pointer — zaznacz, przesuń, zmień długość",
    Icon: IconPointer,
  },
  {
    id: "smart",
    label: "Smart",
    title: "Smart Tool — strefy move / trim (jak Pointer)",
    Icon: IconSmart,
  },
  {
    id: "pencil",
    label: "Pencil",
    title: "Pencil — klik: 1 takt; przeciągnij: zakres (nadpisz)",
    Icon: IconPencil,
  },
  {
    id: "eraser",
    label: "Eraser",
    title: "Eraser — usuń zaznaczony clip",
    Icon: IconEraser,
  },
  {
    id: "scissors",
    label: "Scissors",
    title: "Scissors — OUT α7 (timebox)",
    Icon: IconScissors,
    disabled: true,
  },
  {
    id: "zoom",
    label: "Zoom",
    title: "Zoom — OUT α7",
    Icon: IconZoom,
    disabled: true,
  },
  {
    id: "wand",
    label: "Różdżka",
    title: "Różdżka — cut α7 (disabled)",
    Icon: IconWand,
    disabled: true,
  },
];

const WAND_ACTIONS = [
  { id: "vocals-to-forma", label: "Tekst → Forma" },
  { id: "chords-to-forma", label: "Akordy → Forma" },
  { id: "both-to-forma", label: "Tekst + Akordy → Forma" },
] as const;

type AudioTrack = { id: string; name: string };

export function TimelineShell() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const lanesCoordRef = useRef<HTMLDivElement>(null);
  const markerOverlayRef = useRef<HTMLDivElement>(null);
  const eyeBtnRef = useRef<HTMLButtonElement>(null);
  const eyeMenuRef = useRef<HTMLDivElement>(null);
  const [eyeMenuPos, setEyeMenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const { state, displayTicks, wsStatus, commandPending, play, pause, stop } =
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
  const [setlistIds, setSetlistIds] = useState<string[]>([]);
  const [setlistEnabled, setSetlistEnabled] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);

  const [tool, setTool] = useState<ToolId>("pointer");
  const [wandOpen, setWandOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [songScreenOpen, setSongScreenOpen] = useState(false);
  const [trackVisibility, setTrackVisibility] = useState(defaultTrackVisibility);
  const [audioTrackVisible, setAudioTrackVisible] = useState<
    Record<string, boolean>
  >({});
  const [eyeOpen, setEyeOpen] = useState(false);
  const [locatorTicks, setLocatorTicks] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTekstClipId, setSelectedTekstClipId] = useState<string | null>(
    null,
  );
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [gestureSession, setGestureSession] =
    useState<FormaGestureSession | null>(null);
  const [gesturePreview, setGesturePreview] =
    useState<FormaGesturePreview | null>(null);
  const gestureSessionRef = useRef<FormaGestureSession | null>(null);
  const gesturePreviewRef = useRef<FormaGesturePreview | null>(null);
  const draftRef = useRef<Project | null>(null);

  const audioTracks: AudioTrack[] = (draftProject?.audioTracks ?? []).map(
    (t) => ({ id: t.id, name: t.name }),
  );
  const audioClips = draftProject?.audioClips ?? [];
  const assetsById = new Map(
    (draftProject?.assets ?? []).map((a) => [a.id, a]),
  );

  const reloadProject = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const project = await fetchProject(id);
      await loadTransport(id);
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const view = await fetchSetlist();
        if (cancelled) return;
        setSetlistIds(view.projectIds);
        setSetlistEnabled(view.enabled);
        setAutoAdvance(view.autoAdvance.enabled);
      } catch {
        if (!cancelled) {
          setSetlistIds([]);
          setSetlistEnabled(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const setlistIndex = projectId ? setlistIds.indexOf(projectId) : -1;
  const prevSetlistId =
    setlistEnabled && setlistIndex > 0 ? setlistIds[setlistIndex - 1] : null;
  const nextSetlistId =
    setlistEnabled && setlistIndex >= 0 && setlistIndex < setlistIds.length - 1
      ? setlistIds[setlistIndex + 1]
      : null;

  const dirty =
    savedProject !== null &&
    draftProject !== null &&
    !projectContentEqual(savedProject, draftProject);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    draftRef.current = draftProject;
  }, [draftProject]);

  useEffect(() => {
    gestureSessionRef.current = gestureSession;
  }, [gestureSession]);

  useEffect(() => {
    gesturePreviewRef.current = gesturePreview;
  }, [gesturePreview]);

  const deleteSelectedFormaClip = useCallback(() => {
    const draft = draftRef.current;
    if (!draft) return;
    if (selectedTekstClipId) {
      const next = deleteTekstClip(draft, selectedTekstClipId);
      setDraftProject(next);
      setSelectedTekstClipId(null);
      return;
    }
    if (!selectedClipId) return;
    const clip = draft.forma.clips.find((c) => c.id === selectedClipId);
    if (!clip || clip.kind === "countdown") return;
    const next = deleteFormaClip(draft, selectedClipId);
    setDraftProject(next);
    setSelectedClipId(null);
  }, [selectedClipId, selectedTekstClipId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      deleteSelectedFormaClip();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelectedFormaClip]);

  useLayoutEffect(() => {
    if (!eyeOpen) {
      setEyeMenuPos(null);
      return;
    }

    function updateEyeMenuPos() {
      const btn = eyeBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setEyeMenuPos({ top: rect.bottom, left: rect.left });
    }

    updateEyeMenuPos();
    window.addEventListener("resize", updateEyeMenuPos);
    const scrollEl = document.querySelector("[data-canvas-scroll]");
    scrollEl?.addEventListener("scroll", updateEyeMenuPos, true);
    return () => {
      window.removeEventListener("resize", updateEyeMenuPos);
      scrollEl?.removeEventListener("scroll", updateEyeMenuPos, true);
    };
  }, [eyeOpen]);

  useEffect(() => {
    if (!eyeOpen) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (eyeBtnRef.current?.contains(target)) return;
      if (eyeMenuRef.current?.contains(target)) return;
      setEyeOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [eyeOpen]);

  const viewSpan = useMemo(
    () => computeFormaViewSpan(draftProject?.forma.clips ?? []),
    [draftProject?.forma.clips],
  );

  const barTicks = draftProject
    ? ticksPerBar(draftProject.defaultMeter, draftProject.ppq)
    : ticksPerBar({ numerator: 4, denominator: 4 }, 960);

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

  const effectiveLocatorTicks = state.playing ? displayTicks : locatorTicks;
  const locatorPx = tickToPx(effectiveLocatorTicks, viewSpan, barTicks);
  const locatorMeter = draftProject
    ? resolveMeterAt(draftProject, effectiveLocatorTicks)
    : state.timeSignature;
  const locatorBbt = ticksToBbt(
    effectiveLocatorTicks,
    locatorMeter,
    draftProject?.ppq ?? state.ppq,
  );
  const locatorLabel = `${toDisplayBar(locatorBbt.bar)}.${locatorBbt.beat}`;
  const showMidiPlayhead = !state.playing;

  const tempoSegments = useMemo(() => {
    if (!draftProject) return [];
    return tempoMapSegments(draftProject, viewSpan);
  }, [draftProject, viewSpan]);

  const meterSegments = useMemo(() => {
    if (!draftProject) return [];
    return meterMapSegments(draftProject, viewSpan);
  }, [draftProject, viewSpan]);

  const selectedClip =
    draftProject?.forma.clips.find((c) => c.id === selectedClipId) ?? null;
  const selectedTekstClip =
    draftProject?.tekst.clips.find((c) => c.id === selectedTekstClipId) ?? null;

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

  function rawTicksAtClientX(clientX: number): number | null {
    const coordRoot = lanesCoordRef.current;
    if (!coordRoot || !draftProject) return null;
    return ticksFromPointer(clientX, coordRoot, viewSpan, barTicks);
  }

  function beginFormaGesture(session: FormaGestureSession, preview: FormaGesturePreview) {
    gestureSessionRef.current = session;
    gesturePreviewRef.current = preview;
    setGestureSession(session);
    setGesturePreview(preview);
  }

  function updateFormaGesturePreview(
    rawTicks: number,
    metaKey: boolean,
    ctrlKey: boolean,
  ) {
    const session = gestureSessionRef.current;
    const draft = draftRef.current;
    if (!session || !draft) return;
    const n =
      draft.forma.clips.filter((c) => c.kind === "section").length + 1;
    const preview = previewFromSession(
      draft,
      session,
      rawTicks,
      metaKey,
      ctrlKey,
      `Sekcja ${n}`,
    );
    gesturePreviewRef.current = preview;
    setGesturePreview(preview);
  }

  function endFormaGesture(metaKey: boolean, ctrlKey: boolean) {
    const session = gestureSessionRef.current;
    const preview = gesturePreviewRef.current;
    const draft = draftRef.current;
    gestureSessionRef.current = null;
    gesturePreviewRef.current = null;
    setGestureSession(null);
    setGesturePreview(null);
    if (!session || !preview || !draft) return;
    const next = commitGesture(draft, session, preview, metaKey, ctrlKey);
    setDraftProject(next);
    if (session.kind === "pencil-draw") {
      const created = next.forma.clips.find(
        (c) =>
          c.kind === "section" &&
          c.startTicks === preview.startTicks &&
          c.lengthTicks === preview.lengthTicks,
      );
      if (created) setSelectedClipId(created.id);
    } else if (session.clipId) {
      setSelectedClipId(session.clipId);
    }
  }

  function onFormaLanePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !draftProject) return;
    if (tool === "eraser") {
      e.preventDefault();
      deleteSelectedFormaClip();
      return;
    }
    if (!toolIsPencilDraw(tool)) {
      if (toolAllowsClipHitZones(tool)) {
        setSelectedClipId(null);
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const n =
      draftProject.forma.clips.filter((c) => c.kind === "section").length + 1;
    const session: FormaGestureSession = {
      kind: "pencil-draw",
      clipId: null,
      pointerId: e.pointerId,
      originTicks: raw,
      originClipStart: 0,
      originClipLength: 0,
    };
    const preview = previewFromSession(
      draftProject,
      session,
      raw,
      e.metaKey,
      e.ctrlKey,
      `Sekcja ${n}`,
    );
    beginFormaGesture(session, preview);
  }

  function onFormaLanePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!gestureSessionRef.current) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    updateFormaGesturePreview(raw, e.metaKey, e.ctrlKey);
  }

  function onFormaLanePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!gestureSessionRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endFormaGesture(e.metaKey, e.ctrlKey);
  }

  function onFormaClipPointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    clip: FormaClip,
  ) {
    if (e.button !== 0 || !draftProject) return;
    e.preventDefault();
    e.stopPropagation();

    if (tool === "eraser") {
      if (clip.kind === "countdown") return;
      setDraftProject(deleteFormaClip(draftProject, clip.id));
      if (selectedClipId === clip.id) setSelectedClipId(null);
      return;
    }

    if (toolIsPencilDraw(tool)) {
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const n =
        draftProject.forma.clips.filter((c) => c.kind === "section").length + 1;
      const session: FormaGestureSession = {
        kind: "pencil-draw",
        clipId: null,
        pointerId: e.pointerId,
        originTicks: raw,
        originClipStart: 0,
        originClipLength: 0,
      };
      const preview = previewFromSession(
        draftProject,
        session,
        raw,
        e.metaKey,
        e.ctrlKey,
        `Sekcja ${n}`,
      );
      beginFormaGesture(session, preview);
      return;
    }

    if (!toolAllowsClipHitZones(tool)) return;

    setSelectedClipId(clip.id);
    if (clip.kind === "countdown") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const zone = hitTestClipZone(localX, rect.width, true);
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const kind =
      zone === "start"
        ? "resize-start"
        : zone === "end"
          ? "resize-end"
          : "move";
    const session: FormaGestureSession = {
      kind,
      clipId: clip.id,
      pointerId: e.pointerId,
      originTicks: raw,
      originClipStart: clip.startTicks,
      originClipLength: clip.lengthTicks,
    };
    const preview = previewFromSession(
      draftProject,
      session,
      raw,
      e.metaKey,
      e.ctrlKey,
    );
    beginFormaGesture(session, preview);
  }

  function onFormaClipPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!gestureSessionRef.current) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    updateFormaGesturePreview(raw, e.metaKey, e.ctrlKey);
  }

  function onFormaClipPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!gestureSessionRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endFormaGesture(e.metaKey, e.ctrlKey);
  }

  function setLocatorFromClientX(clientX: number) {
    if (state.playing) return;
    const coordRoot = markerOverlayRef.current ?? lanesCoordRef.current;
    if (!coordRoot || !draftProject) return;
    const raw = ticksFromPointer(clientX, coordRoot, viewSpan, barTicks);
    setLocatorTicks(snapEditTicks(draftProject, raw));
  }

  function onLocatorPointerDown(e: React.PointerEvent<HTMLElement>) {
    if (e.button !== 0 || state.playing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setLocatorFromClientX(e.clientX);
  }

  function onLocatorPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setLocatorFromClientX(e.clientX);
  }

  function onLocatorPointerUp(e: React.PointerEvent<HTMLElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function toggleTrack(id: CoreTrackId) {
    const def = TRACKS.find((t) => t.id === id);
    if (def?.locked) return;
    setTrackVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function onClipRename(name: string) {
    if (!draftProject || !selectedClip) return;
    setDraftProject(renameFormaClip(draftProject, selectedClip.id, name));
  }

  function onCountdownBarsChange(raw: string) {
    if (!draftProject) return;
    const bars = Number.parseInt(raw, 10);
    if (!Number.isFinite(bars)) return;
    try {
      setDraftProject(setCountdownBars(draftProject, bars));
    } catch {
      /* invalid bar count */
    }
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
    window.alert(
      "Import audio — Admin → Utwory → Pliki projektu (playback β1).",
    );
  }

  function onTool(id: ToolId) {
    const def = TOOLS.find((t) => t.id === id);
    if (def?.disabled) return;
    if (id === "wand") {
      setWandOpen((v) => !v);
      setTool("wand");
      return;
    }
    setWandOpen(false);
    setTool(id);
  }

  const canvasInnerWidth = `calc(var(--tl-dock-w) + ${canvasWidthPx}px)`;

  function renderLaneContent(trackId: CoreTrackId) {
    if (!draftProject) return null;
    switch (trackId) {
      case "tempo":
        return tempoSegments.map((seg, i) => (
          <span
            key={`tempo-${seg.startTicks}-${i}`}
            className={styles.mapSegment}
            style={segmentStylePx(
              seg,
              viewSpan,
              barTicks,
              DEFAULT_PX_PER_BAR,
            )}
          >
            {seg.label}
          </span>
        ));
      case "metrum":
        return meterSegments.map((seg, i) => (
          <span
            key={`meter-${seg.startTicks}-${i}`}
            className={styles.mapSegment}
            style={segmentStylePx(
              seg,
              viewSpan,
              barTicks,
              DEFAULT_PX_PER_BAR,
            )}
          >
            {seg.label}
          </span>
        ));
      case "tonacja":
        return (
          <span className={styles.muted}>Tonacja — OUT α4</span>
        );
      case "kotwice":
        return (
          <span className={styles.muted}>Kotwice — OUT α4</span>
        );
      case "forma":
        return (
          <>
            {draftProject.forma.clips.map((clip) => {
              const previewing =
                gesturePreview &&
                gesturePreview.clipId === clip.id &&
                gesturePreview.kind !== "pencil-draw";
              const styleClip = previewing
                ? {
                    ...clip,
                    startTicks: gesturePreview.startTicks,
                    lengthTicks: gesturePreview.lengthTicks,
                  }
                : clip;
              return (
                <FormaClipButton
                  key={clip.id}
                  clip={clip}
                  selected={selectedClipId === clip.id}
                  style={clipStylePx(styleClip, viewSpan, barTicks)}
                  pencilActive={toolIsPencilDraw(tool)}
                  allowHitZones={toolAllowsClipHitZones(tool)}
                  dimmed={Boolean(previewing)}
                  onPointerDown={(e) => onFormaClipPointerDown(e, clip)}
                  onPointerMove={onFormaClipPointerMove}
                  onPointerUp={onFormaClipPointerUp}
                />
              );
            })}
            {gesturePreview?.kind === "pencil-draw" ? (
              <div
                className={[styles.clip, styles.formaClip, styles.formaPreview]
                  .filter(Boolean)
                  .join(" ")}
                style={clipStylePx(
                  {
                    id: "preview",
                    name: gesturePreview.name ?? "Sekcja",
                    kind: "section",
                    startTicks: gesturePreview.startTicks,
                    lengthTicks: gesturePreview.lengthTicks,
                  },
                  viewSpan,
                  barTicks,
                )}
                aria-hidden
              >
                {gesturePreview.name ?? "Sekcja"}
              </div>
            ) : null}
          </>
        );
      case "tekst":
        return (
          <>
            {(draftProject.tekst?.clips ?? []).map((clip) => (
              <button
                key={clip.id}
                type="button"
                className={[
                  styles.clip,
                  styles.formaClip,
                  selectedTekstClipId === clip.id ? styles.clipOn : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={clipStylePx(
                  {
                    id: clip.id,
                    name: clip.text || "…",
                    kind: "section",
                    startTicks: clip.startTicks,
                    lengthTicks: clip.lengthTicks,
                  },
                  viewSpan,
                  barTicks,
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (toolIsPencilDraw(tool)) {
                    setDraftProject(
                      pencilTekstClick(draftProject, ticksFromPointer(
                        e.clientX,
                        lanesCoordRef.current!,
                        viewSpan,
                        barTicks,
                      )),
                    );
                    return;
                  }
                  if (tool === "eraser") {
                    setDraftProject(deleteTekstClip(draftProject, clip.id));
                    setSelectedTekstClipId(null);
                    return;
                  }
                  setSelectedClipId(null);
                  setSelectedTekstClipId(clip.id);
                }}
              >
                {clip.text || "…"}
              </button>
            ))}
          </>
        );
      case "akordy":
        return (
          <span className={styles.muted}>
            Akordy — schema v4 (edycja cut α7)
          </span>
        );
      case "cue":
        return (
          <span className={styles.muted}>Cue — schema v4 (edycja cut α7)</span>
        );
      default:
        return null;
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <ShellWordmark suffix="Timeline" version={APP_VERSION} />

        <div className={styles.songCluster} role="group" aria-label="Setlista">
          <ShellIconButton label="Metadane utworu" disabled>
            ⓘ
          </ShellIconButton>
          <ShellIconButton
            label="Poprzedni utwór setlisty"
            disabled={!prevSetlistId}
            onClick={() => prevSetlistId && navigate(`/timeline/${prevSetlistId}`)}
          >
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
          <ShellIconButton
            label="Następny utwór setlisty"
            disabled={!nextSetlistId}
            onClick={() => nextSetlistId && navigate(`/timeline/${nextSetlistId}`)}
          >
            <IconChevronRight />
          </ShellIconButton>
          <ShellIconButton
            label="Auto-setlista"
            disabled={!setlistEnabled || commandPending}
            pressed={autoAdvance}
            onClick={() => {
              void (async () => {
                try {
                  const v = await patchSetlistAutoAdvance(!autoAdvance);
                  setAutoAdvance(v.autoAdvance.enabled);
                } catch {
                  /* ignore */
                }
              })();
            }}
          >
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
          {TOOLS.map(({ id, title, Icon, disabled }) => (
            <ShellIconButton
              key={id}
              label={title}
              pressed={tool === id}
              disabled={disabled}
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
          <ShellIconButton
            label="Zatrzymaj"
            disabled={commandPending}
            onClick={() => void stop()}
          >
            <IconStop />
          </ShellIconButton>
          <button
            type="button"
            className={styles.playBtn}
            aria-label={state.playing ? "Pauza" : "Odtwarzaj"}
            disabled={commandPending}
            onClick={() =>
              void (state.playing ? pause() : play({ projectId }))
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
        <div className={styles.timelinePane}>
          <div className={styles.canvasScroll} data-canvas-scroll>
            <div
              className={styles.canvasInner}
              style={{ width: canvasInnerWidth }}
            >
              <div className={styles.canvasBody}>
                <div ref={markerOverlayRef} className={styles.markerOverlay}>
                  {showMidiPlayhead ? (
                    <div
                      className={styles.playheadMidi}
                      style={{ left: `${playheadPx}px` }}
                      aria-hidden
                    />
                  ) : null}
                  <div
                    className={styles.locator}
                    style={{ left: `${locatorPx}px` }}
                    role="slider"
                    aria-label="Locator wklejania"
                    aria-valuemin={viewSpan.start}
                    aria-valuemax={viewSpan.end}
                    aria-valuenow={effectiveLocatorTicks}
                    aria-valuetext={locatorLabel}
                    tabIndex={-1}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onLocatorPointerDown(e);
                    }}
                    onPointerMove={onLocatorPointerMove}
                    onPointerUp={onLocatorPointerUp}
                  >
                    <span className={styles.locatorLabel}>{locatorLabel}</span>
                  </div>
                </div>

                <div className={styles.rulerRow}>
                  <div className={styles.rulerDock}>
                    <button
                      ref={eyeBtnRef}
                      type="button"
                      className={styles.eyeBtn}
                      aria-label="Widoczność ścieżek"
                      aria-expanded={eyeOpen}
                      aria-haspopup="menu"
                      onClick={() => setEyeOpen((v) => !v)}
                    >
                      <IconEye />
                    </button>
                  </div>
                  <div
                    className={styles.ruler}
                    onPointerDown={onLocatorPointerDown}
                    onPointerMove={onLocatorPointerMove}
                    onPointerUp={onLocatorPointerUp}
                  >
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
                </div>

                <div className={styles.trackRows}>
                  <div className={styles.laneOverlay} ref={lanesCoordRef} aria-hidden>
                    <div className={styles.barGrid}>
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
                  </div>

                {TRACKS.filter((t) =>
                  isCoreTrackVisible(trackVisibility, t.id),
                ).map((track) => (
                  <div key={track.id} className={styles.trackRow}>
                    <div
                      className={[
                        styles.dockCell,
                        track.group === "special" ? styles.dockMuted : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span>{track.label}</span>
                      {track.id === "tekst" ? (
                        <button
                          type="button"
                          className={styles.tapBtn}
                          title="Tap — timing linii Tekstu"
                          aria-label="Tap"
                          disabled
                        >
                          <IconTap />
                        </button>
                      ) : null}
                    </div>
                    <div
                      onPointerDown={
                        track.id === "forma"
                          ? onFormaLanePointerDown
                          : track.id === "tekst"
                            ? (e) => {
                                if (e.button !== 0 || !draftProject) return;
                                if (!toolIsPencilDraw(tool)) {
                                  if (toolAllowsClipHitZones(tool)) {
                                    setSelectedTekstClipId(null);
                                  }
                                  return;
                                }
                                e.preventDefault();
                                const raw = rawTicksAtClientX(e.clientX);
                                if (raw == null) return;
                                const next = pencilTekstClick(
                                  draftProject,
                                  raw,
                                );
                                setDraftProject(next);
                                const last =
                                  next.tekst.clips[next.tekst.clips.length - 1];
                                if (last) {
                                  setSelectedClipId(null);
                                  setSelectedTekstClipId(last.id);
                                }
                              }
                            : undefined
                      }
                      onPointerMove={
                        track.id === "forma"
                          ? onFormaLanePointerMove
                          : undefined
                      }
                      onPointerUp={
                        track.id === "forma" ? onFormaLanePointerUp : undefined
                      }
                      role={
                        track.id === "forma" || track.id === "tekst"
                          ? "presentation"
                          : undefined
                      }
                      className={[
                        styles.laneCell,
                        track.group === "special" ? styles.laneCellMuted : "",
                        track.id === "forma" ? styles.formaLaneCell : "",
                        track.id === "forma" && toolIsPencilDraw(tool)
                          ? styles.formaLanePencil
                          : "",
                        track.id === "tekst" && toolIsPencilDraw(tool)
                          ? styles.formaLanePencil
                          : "",
                        track.id === "tempo" || track.id === "metrum"
                          ? styles.mapLaneCell
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {renderLaneContent(track.id)}
                    </div>
                  </div>
                ))}

                {audioTracks
                  .filter((t) => audioTrackVisible[t.id] !== false)
                  .map((t) => {
                    const clips = audioClips.filter((c) => c.trackId === t.id);
                    return (
                      <div key={t.id} className={styles.trackRow}>
                        <div className={styles.dockCell}>
                          <span>{t.name}</span>
                        </div>
                        <div className={styles.laneCell}>
                          {clips.length === 0 ? (
                            <span className={styles.muted}>
                              Brak clipów — β1 playback
                            </span>
                          ) : (
                            clips.map((c) => {
                              const asset = assetsById.get(c.assetId);
                              return (
                                <Clip
                                  key={c.id}
                                  name={
                                    asset?.originalName ??
                                    `${t.name} (β1)`
                                  }
                                  selected={false}
                                  onSelect={() => undefined}
                                />
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}

                <div className={styles.trackRow}>
                  <div className={styles.dockCell}>
                    <Button variant="ghost" onClick={addAudio}>
                      + Audio
                    </Button>
                  </div>
                  <div className={styles.laneCell} aria-hidden />
                </div>
              </div>
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
            {selectedTekstClip ? (
              <div className={styles.inspBody}>
                <label className={styles.inspField}>
                  Tekst linii
                  <textarea
                    className={styles.nameInput}
                    value={selectedTekstClip.text}
                    aria-label="Tekst linii"
                    rows={3}
                    onChange={(e) => {
                      if (!draftProject) return;
                      setDraftProject(
                        setTekstClipText(
                          draftProject,
                          selectedTekstClip.id,
                          e.target.value,
                        ),
                      );
                    }}
                  />
                </label>
                <p>
                  start {selectedTekstClip.startTicks}, długość{" "}
                  {selectedTekstClip.lengthTicks} ticks
                </p>
              </div>
            ) : selectedClip ? (
              <div className={styles.inspBody}>
                {selectedClip.kind === "section" ? (
                  <label className={styles.inspField}>
                    Nazwa sekcji
                    <input
                      className={styles.nameInput}
                      value={selectedClip.name}
                      aria-label="Nazwa sekcji"
                      onChange={(e) => onClipRename(e.target.value)}
                    />
                  </label>
                ) : (
                  <p>
                    <strong>{selectedClip.name}</strong> — zablokowany
                    Countdown
                  </p>
                )}
                {selectedClip.kind === "countdown" ? (
                  <label className={styles.inspField}>
                    Długość (takty)
                    <input
                      className={styles.lengthInput}
                      type="number"
                      min={1}
                      step={1}
                      value={countdownBars(draftProject!, selectedClip)}
                      aria-label="Długość Countdown w taktach"
                      onChange={(e) => onCountdownBarsChange(e.target.value)}
                    />
                  </label>
                ) : (
                  <p>
                    start {selectedClip.startTicks}, długość{" "}
                    {selectedClip.lengthTicks} ticks
                  </p>
                )}
              </div>
            ) : (
              <p className={styles.inspBody}>
                Zaznacz clip na ścieżce Forma lub Tekst.
              </p>
            )}
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

      {blocker.state === "blocked" ? (
        <div
          className={styles.overlay}
          role="alertdialog"
          aria-modal
          aria-labelledby="dirty-guard-title"
        >
          <div className={styles.overlayPanel}>
            <h2 id="dirty-guard-title">Niezapisane zmiany</h2>
            <p className={styles.overlayBody}>
              Masz niezapisane zmiany. Opuścić Timeline bez zapisu?
            </p>
            <div className={styles.overlayActions}>
              <Button variant="ghost" onClick={() => blocker.reset?.()}>
                Anuluj
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  onDiscard();
                  blocker.proceed?.();
                }}
              >
                Odrzuć i wyjdź
              </Button>
              <Button
                variant="primary"
                loading={savePending}
                onClick={() => {
                  void (async () => {
                    if (!projectId || !draftProject) return;
                    setSavePending(true);
                    try {
                      const next = await putProject(projectId, draftProject);
                      setSavedProject(next);
                      setDraftProject(next);
                      blocker.proceed?.();
                    } catch (err) {
                      setLoadError(
                        err instanceof Error
                          ? err.message
                          : "Zapis nie powiódł się",
                      );
                    } finally {
                      setSavePending(false);
                    }
                  })();
                }}
              >
                Zapisz i wyjdź
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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

      {eyeOpen && eyeMenuPos
        ? createPortal(
            <div
              ref={eyeMenuRef}
              className={[styles.eyeMenu, styles.eyeMenuFixed]
                .filter(Boolean)
                .join(" ")}
              style={{ top: eyeMenuPos.top, left: eyeMenuPos.left }}
              role="menu"
            >
              {TRACKS.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isCoreTrackVisible(trackVisibility, track.id)}
                  className={[
                    styles.eyeItem,
                    track.locked ? styles.eyeItemLocked : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={track.locked}
                  onClick={() => toggleTrack(track.id)}
                >
                  <span aria-hidden>
                    {isCoreTrackVisible(trackVisibility, track.id) ? "☑" : "☐"}
                  </span>
                  {track.label}
                  {track.locked ? " (zawsze)" : ""}
                </button>
              ))}
              {audioTracks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={audioTrackVisible[t.id] !== false}
                  className={styles.eyeItem}
                  onClick={() =>
                    setAudioTrackVisible((prev) => ({
                      ...prev,
                      [t.id]: !(prev[t.id] !== false),
                    }))
                  }
                >
                  <span aria-hidden>
                    {audioTrackVisible[t.id] !== false ? "☑" : "☐"}
                  </span>
                  {t.name}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function FormaClipButton({
  clip,
  selected,
  style,
  pencilActive,
  allowHitZones,
  dimmed,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  clip: FormaClip;
  selected: boolean;
  style: { left: string; width: string };
  pencilActive: boolean;
  allowHitZones: boolean;
  dimmed?: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const [hoverZone, setHoverZone] = useState<"body" | "start" | "end">("body");
  const cursor = pencilActive
    ? "crosshair"
    : allowHitZones && clip.kind !== "countdown"
      ? cursorForHitZone(hoverZone, true)
      : "pointer";

  return (
    <button
      type="button"
      className={[
        styles.clip,
        styles.formaClip,
        selected ? styles.clipOn : "",
        clip.kind === "countdown" ? styles.clipLocked : "",
        pencilActive ? styles.formaClipPencil : "",
        dimmed ? styles.formaClipDim : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...style, cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => {
        if (allowHitZones && clip.kind !== "countdown") {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverZone(hitTestClipZone(e.clientX - rect.left, rect.width, true));
        }
        onPointerMove(e);
      }}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setHoverZone("body")}
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
