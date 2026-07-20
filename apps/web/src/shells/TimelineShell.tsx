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
  resolveKeyAt,
  formatKeySignature,
  ticksPerBar,
  ticksToBbt,
  toDisplayBar,
  importUgText,
  projectEndTicks,
  wandContentToForma,
  type FormaClip,
  type Project,
  type WandMode,
} from "@stagesync/shared";
import {
  buildBarMarks,
  buildRulerBeatMarks,
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
  commitMoveClip,
  deleteFormaClip,
  previewFromSession,
  splitFormaClipAt,
} from "../lib/formaEdit.js";
import {
  subsectionRanges,
} from "../lib/formaSubsections.js";
import {
  deleteMapEvents,
  insertMapEventAt,
  isMapLaneId,
  mapEventIds,
  mapSnapMode,
  moveMapEventsByDelta,
  splitMapAt,
  upsertKeyAt,
  upsertMeterAt,
  upsertTempoAt,
  type MapLaneId,
} from "../lib/mapLaneEdit.js";
import {
  keyMapSegments,
  meterMapSegments,
  segmentStylePx,
  tempoMapSegments,
} from "../lib/mapSegments.js";
import { TimelineHelpBody } from "./timeline/TimelineHelp.js";
import {
  addFormaSubsection,
  countdownBars,
  deleteFormaSubsection,
  formaSubsectionRows,
  renameFormaClip,
  setCountdownBars,
  setFormaSubsectionStartBar,
} from "../lib/formaInspector.js";
import {
  deleteTekstClip,
  setTekstClipText,
} from "../lib/tekstEdit.js";
import {
  deleteAkordyClip,
  setAkordyClipSymbol,
} from "../lib/akordyEdit.js";
import {
  deleteCueClip,
  setCueClipLabel,
} from "../lib/cueEdit.js";
import {
  commitContentGesture,
  defaultPencilLabel,
  previewContentFromSession,
  splitContentClipAt,
  type ContentLaneId,
} from "../lib/contentLaneEdit.js";
import {
  anchorBarWidthTicks,
  canEditKotwice,
  deleteScoreAnchor,
  insertScoreAnchor,
  moveScoreAnchor,
  scoreAnchors,
  ticksFromLogicBar,
  updateScoreAnchor,
} from "../lib/scoreBarEdit.js";
import {
  canRedo,
  canUndo,
  createDraftHistory,
  pushDraftHistory,
  redoDraft,
  resetDraftHistory,
  syncPresentAfterSave,
  undoDraft,
  type DraftHistory,
} from "../lib/draftHistory.js";
import {
  advanceMetronomeClicks,
  getMetronomeAudioContext,
  metronomeBeatIndex,
  resumeMetronomeAudio,
} from "../lib/metronome.js";
import {
  applyTapBpm,
  createTapTempoState,
  recordTap,
} from "../lib/tapTempo.js";
import {
  detectTimelineTier,
  TIMELINE_COARSE_MQ,
  TIMELINE_MOBILE_MQ,
  timelineGesturesAllowed,
  TOUCH_FULL_EDIT_MSG,
  type TimelineTouchTier,
} from "../lib/timelineTouchTier.js";
import { APP_VERSION } from "../lib/appVersion.js";
import { fetchLibrary, fetchProject, putProject } from "../lib/libraryApi.js";
import {
  fetchSetlist,
  patchSetlistAutoAdvance,
} from "../lib/setlistApi.js";
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
  IconAutoAdvance,
  IconChecked,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconEraser,
  IconEye,
  IconFollow,
  IconFullscreen,
  IconHelp,
  IconInfo,
  IconLoop,
  IconMetronome,
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
  IconUnchecked,
  IconUndo,
  IconWand,
  IconZoom,
} from "./icons.js";
import { ShellWordmark } from "./ShellWordmark.js";
import { connectionStatusLabel } from "./ConnectionIndicator.js";
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
    title:
      "Scissors — Forma: podsekcja; Tekst/Akordy/Cue: podział; Tempo/Tonacja/Metrum: zmiana mapy",
    Icon: IconScissors,
  },
  {
    id: "zoom",
    label: "Zoom",
    title: "Zoom — suwaki H / V / UI w statusie (drag na canvasie wkrótce)",
    Icon: IconZoom,
    disabled: true,
  },
  {
    id: "wand",
    label: "Różdżka",
    title: "Różdżka — Tekst/Akordy → Forma",
    Icon: IconWand,
  },
];

const WAND_ACTIONS: { id: WandMode; label: string }[] = [
  { id: "tekst", label: "Tekst → Forma" },
  { id: "akordy", label: "Akordy → Forma" },
  { id: "both", label: "Tekst + Akordy → Forma" },
];

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
  const {
    state,
    displayTicks,
    wsStatus,
    commandPending,
    play,
    pause,
    stop,
    setLoop,
  } = useTransport();
  const bbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);

  const [savedProject, setSavedProject] = useState<Project | null>(null);
  const [draftProject, setDraftProject] = useState<Project | null>(null);
  const [draftHistory, setDraftHistory] = useState<DraftHistory | null>(null);
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
  const [ugModalOpen, setUgModalOpen] = useState(false);
  const [ugText, setUgText] = useState("");
  const [ugError, setUgError] = useState<string | null>(null);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [followPlayhead, setFollowPlayhead] = useState(() => {
    try {
      return localStorage.getItem("stagesync-timeline-follow-playhead") === "1";
    } catch {
      return false;
    }
  });
  const [zoomH, setZoomH] = useState(DEFAULT_PX_PER_BAR);
  const [zoomV, setZoomV] = useState(72);
  const [zoomUi, setZoomUi] = useState(100);
  const [touchTier, setTouchTier] = useState<TimelineTouchTier>(() =>
    typeof window !== "undefined" ? detectTimelineTier() : "desktop",
  );
  const gesturePolicy = timelineGesturesAllowed(touchTier);
  const [tempoEditOpen, setTempoEditOpen] = useState(false);
  const [tempoDraft, setTempoDraft] = useState("");
  const [meterEditOpen, setMeterEditOpen] = useState(false);
  const [meterNumDraft, setMeterNumDraft] = useState("4");
  const [meterDenDraft, setMeterDenDraft] = useState("4");
  const [keyEditOpen, setKeyEditOpen] = useState(false);
  /** Ticks used by map edit modals (playhead or clicked segment). */
  const [mapEditTicks, setMapEditTicks] = useState(0);
  const [songMetaOpen, setSongMetaOpen] = useState(false);
  const [tapState, setTapState] = useState(createTapTempoState);
  const [tapBpmHint, setTapBpmHint] = useState<number | null>(null);
  const metroBeatRef = useRef(0);
  const loopDragRef = useRef<{
    pointerId: number;
    originTicks: number;
    originClientX: number;
  } | null>(null);
  const mapDragRef = useRef<{
    lane: MapLaneId;
    eventId: string;
    /** Events moved together (v4 multi-select same lane). */
    moveIds: string[];
    originStartTicks: number;
    originPointerTicks: number;
    originClientX: number;
    pointerId: number;
    moved: boolean;
    previewDeltaTicks: number;
  } | null>(null);
  const [mapDragPreview, setMapDragPreview] = useState<{
    lane: MapLaneId;
    moveIds: string[];
    deltaTicks: number;
  } | null>(null);
  /** Map lane multi-select (v4 Cmd/Shift on tempo/meter/key clips). */
  const [selectedMapIds, setSelectedMapIds] = useState<string[]>([]);
  const [selectedMapLane, setSelectedMapLane] = useState<MapLaneId | null>(
    null,
  );
  const [primaryMapId, setPrimaryMapId] = useState<string | null>(null);
  const [loopDraft, setLoopDraft] = useState<{
    startTicks: number;
    endTicks: number;
  } | null>(null);
  const loopDraftRef = useRef(loopDraft);
  loopDraftRef.current = loopDraft;
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
  const [trackVisibility, setTrackVisibility] = useState(defaultTrackVisibility);
  const [eyeOpen, setEyeOpen] = useState(false);
  const [locatorTicks, setLocatorTicks] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  /** Forma subsection band index when a section clip is selected (v4 selectedSubsectionIdx). */
  const [selectedSubsectionIdx, setSelectedSubsectionIdx] = useState<
    number | null
  >(null);
  const [selectedTekstClipId, setSelectedTekstClipId] = useState<string | null>(
    null,
  );
  const [selectedAkordClipId, setSelectedAkordClipId] = useState<string | null>(
    null,
  );
  const [selectedCueClipId, setSelectedCueClipId] = useState<string | null>(
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
  const viewSpanRef = useRef({ start: 0, end: 0 });
  const barTicksRef = useRef(3840);
  const zoomHRef = useRef(DEFAULT_PX_PER_BAR);

  const reloadProject = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const project = await fetchProject(id);
      await loadTransport(id);
      setSavedProject(project);
      setDraftProject(project);
      setDraftHistory(createDraftHistory(project));
      setSelectedClipId(project.forma.clips[0]?.id ?? null);
      setSelectedTekstClipId(null);
      setSelectedAkordClipId(null);
      setSelectedCueClipId(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Nie udało się wczytać");
      setSavedProject(null);
      setDraftProject(null);
      setDraftHistory(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const commitDraft = useCallback((next: Project) => {
    setDraftProject(next);
    setDraftHistory((h) =>
      h ? pushDraftHistory(h, next) : createDraftHistory(next),
    );
  }, []);

  const clearContentSelection = useCallback(() => {
    setSelectedTekstClipId(null);
    setSelectedAkordClipId(null);
    setSelectedCueClipId(null);
    setSelectedAnchorId(null);
  }, []);

  const clearMapSelection = useCallback(() => {
    setSelectedMapIds([]);
    setSelectedMapLane(null);
    setPrimaryMapId(null);
  }, []);

  const setMapSelection = useCallback(
    (lane: MapLaneId, ids: string[], primaryId: string | null) => {
      setSelectedMapLane(lane);
      setSelectedMapIds(ids);
      setPrimaryMapId(primaryId);
      setSelectedClipId(null);
      setSelectedSubsectionIdx(null);
      clearContentSelection();
      setSongMetaOpen(false);
    },
    [clearContentSelection],
  );

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
    const syncTier = () => setTouchTier(detectTimelineTier());
    syncTier();
    const mobileMq = window.matchMedia(TIMELINE_MOBILE_MQ);
    const coarseMq = window.matchMedia(TIMELINE_COARSE_MQ);
    mobileMq.addEventListener("change", syncTier);
    coarseMq.addEventListener("change", syncTier);
    window.addEventListener("resize", syncTier);
    return () => {
      mobileMq.removeEventListener("change", syncTier);
      coarseMq.removeEventListener("change", syncTier);
      window.removeEventListener("resize", syncTier);
    };
  }, []);

  useEffect(() => {
    gestureSessionRef.current = gestureSession;
  }, [gestureSession]);

  useEffect(() => {
    gesturePreviewRef.current = gesturePreview;
  }, [gesturePreview]);

  const deleteSelectedFormaClip = useCallback(() => {
    const draft = draftRef.current;
    if (!draft) return;
    if (selectedMapLane && selectedMapIds.length > 0) {
      const next = deleteMapEvents(draft, selectedMapLane, selectedMapIds);
      if (next !== draft) {
        commitDraft(next);
        clearMapSelection();
      }
      return;
    }
    if (selectedTekstClipId) {
      commitDraft(deleteTekstClip(draft, selectedTekstClipId));
      setSelectedTekstClipId(null);
      return;
    }
    if (selectedAkordClipId) {
      commitDraft(deleteAkordyClip(draft, selectedAkordClipId));
      setSelectedAkordClipId(null);
      return;
    }
    if (selectedCueClipId) {
      commitDraft(deleteCueClip(draft, selectedCueClipId));
      setSelectedCueClipId(null);
      return;
    }
    if (!selectedClipId) return;
    const clip = draft.forma.clips.find((c) => c.id === selectedClipId);
    if (!clip || clip.kind === "countdown") return;
    commitDraft(deleteFormaClip(draft, selectedClipId));
    setSelectedClipId(null);
  }, [
    clearMapSelection,
    commitDraft,
    selectedClipId,
    selectedMapIds,
    selectedMapLane,
    selectedTekstClipId,
    selectedAkordClipId,
    selectedCueClipId,
  ]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if (e.key !== "Delete" && e.key !== "Backspace") return;
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

  viewSpanRef.current = viewSpan;
  barTicksRef.current = barTicks;
  zoomHRef.current = zoomH;

  const canvasWidthPx = useMemo(
    () => computeCanvasWidthPx(viewSpan, barTicks, zoomH),
    [viewSpan, barTicks, zoomH],
  );

  const barMarks = useMemo(() => {
    if (!draftProject) return [];
    return buildBarMarks(viewSpan, draftProject);
  }, [draftProject, viewSpan]);

  const rulerBeatMarks = useMemo(() => {
    if (!draftProject) return [];
    return buildRulerBeatMarks(viewSpan, draftProject, zoomH);
  }, [draftProject, viewSpan, zoomH]);

  const playheadPx = tickToPx(displayTicks, viewSpan, barTicks, zoomH);

  const effectiveLocatorTicks = state.playing ? displayTicks : locatorTicks;
  const locatorPx = tickToPx(effectiveLocatorTicks, viewSpan, barTicks, zoomH);
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

  // Follow playhead: keep playhead in horizontal view while playing.
  useEffect(() => {
    if (!followPlayhead || !state.playing) return;
    const scrollEl = document.querySelector<HTMLElement>(
      "[data-canvas-scroll]",
    );
    if (!scrollEl) return;
    const pad = 48;
    const left = scrollEl.scrollLeft;
    const right = left + scrollEl.clientWidth;
    if (playheadPx < left + pad) {
      scrollEl.scrollLeft = Math.max(0, playheadPx - pad);
    } else if (playheadPx > right - pad) {
      scrollEl.scrollLeft = playheadPx - scrollEl.clientWidth + pad;
    }
  }, [followPlayhead, playheadPx, state.playing]);

  const loopOn = Boolean(state.loop?.enabled);
  const loopRange = loopDraft ??
    (state.loop && state.loop.endTicks > state.loop.startTicks
      ? { startTicks: state.loop.startTicks, endTicks: state.loop.endTicks }
      : null);

  const mapPreviewProject = useMemo(() => {
    if (!draftProject || !mapDragPreview) return draftProject;
    const { lane, moveIds, deltaTicks } = mapDragPreview;
    if (deltaTicks === 0) return draftProject;
    const idSet = new Set(moveIds);
    const shift = <T extends { id: string; startTicks: number }>(
      list: T[],
    ): T[] =>
      list
        .map((e) =>
          idSet.has(e.id) && e.startTicks > 0
            ? { ...e, startTicks: e.startTicks + deltaTicks }
            : e,
        )
        .sort((a, b) => a.startTicks - b.startTicks);
    if (lane === "tempo") {
      return { ...draftProject, tempoMap: shift(draftProject.tempoMap) };
    }
    if (lane === "metrum") {
      return { ...draftProject, meterMap: shift(draftProject.meterMap) };
    }
    return {
      ...draftProject,
      keyMap: shift(draftProject.keyMap ?? []),
    };
  }, [draftProject, mapDragPreview]);

  const tempoSegments = useMemo(() => {
    if (!mapPreviewProject) return [];
    return tempoMapSegments(mapPreviewProject, viewSpan);
  }, [mapPreviewProject, viewSpan]);

  const meterSegments = useMemo(() => {
    if (!mapPreviewProject) return [];
    return meterMapSegments(mapPreviewProject, viewSpan);
  }, [mapPreviewProject, viewSpan]);

  const keySegments = useMemo(() => {
    if (!mapPreviewProject) return [];
    return keyMapSegments(mapPreviewProject, viewSpan, formatKeySignature);
  }, [mapPreviewProject, viewSpan]);

  const selectedClip =
    draftProject?.forma.clips.find((c) => c.id === selectedClipId) ?? null;
  const selectedSubsectionRows =
    draftProject && selectedClip?.kind === "section"
      ? formaSubsectionRows(draftProject, selectedClip)
      : [];
  const selectedTekstClip =
    draftProject?.tekst.clips.find((c) => c.id === selectedTekstClipId) ?? null;
  const selectedAkordClip =
    draftProject?.akordy.clips.find((c) => c.id === selectedAkordClipId) ??
    null;
  const selectedCueClip =
    draftProject?.cue.clips.find((c) => c.id === selectedCueClipId) ?? null;
  const selectedAnchor =
    draftProject && selectedAnchorId
      ? scoreAnchors(draftProject).find((a) => a.id === selectedAnchorId) ??
        null
      : null;

  const meterAtPlayhead = draftProject
    ? resolveMeterAt(draftProject, displayTicks)
    : state.timeSignature;
  const tempoAtPlayhead = draftProject
    ? resolveTempoAt(draftProject, displayTicks)
    : state.bpm;

  useEffect(() => {
    if (!metronomeOn || !state.playing) {
      metroBeatRef.current = metronomeBeatIndex(
        displayTicks,
        state.timeSignature,
        state.ppq,
      );
      return;
    }
    metroBeatRef.current = advanceMetronomeClicks(
      {
        enabled: metronomeOn,
        playing: state.playing,
        displayTicks,
        bpm: state.bpm,
        timeSignature: state.timeSignature,
        ppq: state.ppq,
      },
      metroBeatRef.current,
    );
  }, [
    displayTicks,
    metronomeOn,
    state.bpm,
    state.playing,
    state.ppq,
    state.timeSignature,
  ]);

  async function onSave() {
    if (!projectId || !draftProject) return;
    setSavePending(true);
    try {
      const next = await putProject(projectId, draftProject);
      setSavedProject(next);
      setDraftProject(next);
      setDraftHistory((h) =>
        h ? syncPresentAfterSave(h, next) : createDraftHistory(next),
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Zapis nie powiódł się");
    } finally {
      setSavePending(false);
    }
  }

  function onDiscard() {
    if (!savedProject) {
      if (projectId) void reloadProject(projectId);
      return;
    }
    setDraftProject(savedProject);
    setDraftHistory(resetDraftHistory(savedProject));
    clearContentSelection();
  }

  function onUndo() {
    setDraftHistory((h) => {
      if (!h || !canUndo(h)) return h;
      const next = undoDraft(h);
      setDraftProject(next.present);
      return next;
    });
  }

  function onRedo() {
    setDraftHistory((h) => {
      if (!h || !canRedo(h)) return h;
      const next = redoDraft(h);
      setDraftProject(next.present);
      return next;
    });
  }

  async function onPlayClick() {
    await resumeMetronomeAudio(getMetronomeAudioContext());
    metroBeatRef.current = metronomeBeatIndex(
      displayTicks,
      state.timeSignature,
      state.ppq,
    );
    await play({ projectId });
  }

  async function onMetronomeToggle() {
    const next = !metronomeOn;
    if (next) {
      await resumeMetronomeAudio(getMetronomeAudioContext());
      metroBeatRef.current = metronomeBeatIndex(
        displayTicks,
        state.timeSignature,
        state.ppq,
      );
    }
    setMetronomeOn(next);
  }

  function onTap() {
    if (!draftProject) return;
    const { state: nextTap, bpm } = recordTap(tapState, performance.now());
    setTapState(nextTap);
    if (bpm == null) {
      setTapBpmHint(null);
      return;
    }
    setTapBpmHint(bpm);
    commitDraft(applyTapBpm(draftProject, locatorTicks, bpm));
  }

  function onWandAction(mode: WandMode) {
    if (!draftProject) return;
    commitDraft(wandContentToForma(draftProject, mode));
    setWandOpen(false);
  }

  function onImportUg() {
    if (!draftProject) return;
    const result = importUgText(ugText, {
      ppq: draftProject.ppq,
      meter: resolveMeterAt(draftProject, 0),
    });
    if (!result.ok) {
      setUgError(result.message);
      return;
    }
    commitDraft({
      ...draftProject,
      tekst: result.tekst,
      akordy: result.akordy,
    });
    setUgError(null);
    setUgModalOpen(false);
    setUgText("");
    setSongScreenOpen(false);
  }

  function rawTicksAtClientX(clientX: number): number | null {
    const coordRoot = lanesCoordRef.current;
    if (!coordRoot || !draftRef.current) return null;
    return ticksFromPointer(
      clientX,
      coordRoot,
      viewSpanRef.current,
      barTicksRef.current,
      zoomHRef.current,
    );
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
    clientX?: number,
  ) {
    const session = gestureSessionRef.current;
    const draft = draftRef.current;
    if (!session || !draft) return;
    const lane = session.lane ?? "forma";
    if (lane !== "forma") {
      const preview = previewContentFromSession(
        draft,
        session,
        rawTicks,
        metaKey,
        ctrlKey,
        clientX,
      );
      gesturePreviewRef.current = preview;
      setGesturePreview(preview);
      return;
    }
    const n =
      draft.forma.clips.filter((c) => c.kind === "section").length + 1;
    const preview = previewFromSession(
      draft,
      session,
      rawTicks,
      metaKey,
      ctrlKey,
      `Sekcja ${n}`,
      clientX,
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
    const lane = session.lane ?? "forma";
    if (lane !== "forma") {
      const next = commitContentGesture(
        draft,
        lane,
        session,
        preview,
        metaKey,
        ctrlKey,
      );
      commitDraft(next);
      if (session.kind === "pencil-draw") {
        const clips =
          lane === "tekst"
            ? next.tekst.clips
            : lane === "akordy"
              ? next.akordy.clips
              : next.cue.clips;
        const created = clips.find(
          (c) =>
            c.startTicks === preview.startTicks &&
            c.lengthTicks === preview.lengthTicks,
        );
        setSelectedClipId(null);
        if (lane === "tekst") {
          setSelectedAkordClipId(null);
          setSelectedCueClipId(null);
          setSelectedTekstClipId(created?.id ?? null);
        } else if (lane === "akordy") {
          setSelectedTekstClipId(null);
          setSelectedCueClipId(null);
          setSelectedAkordClipId(created?.id ?? null);
        } else {
          setSelectedTekstClipId(null);
          setSelectedAkordClipId(null);
          setSelectedCueClipId(created?.id ?? null);
        }
        return;
      }
      if (session.clipId) {
        if (lane === "tekst") setSelectedTekstClipId(session.clipId);
        else if (lane === "akordy") setSelectedAkordClipId(session.clipId);
        else setSelectedCueClipId(session.clipId);
      }
      return;
    }
    const next = commitGesture(draft, session, preview, metaKey, ctrlKey);
    commitDraft(next);
    if (session.kind === "pencil-draw") {
      const created = next.forma.clips.find(
        (c) =>
          c.kind === "section" &&
          c.startTicks === preview.startTicks &&
          c.lengthTicks === preview.lengthTicks,
      );
      if (created) {
        setSelectedClipId(created.id);
        setSelectedSubsectionIdx(null);
      }
    } else if (session.kind === "subsection-boundary" && session.clipId) {
      setSelectedClipId(session.clipId);
      const clip = next.forma.clips.find((c) => c.id === session.clipId);
      const ranges = subsectionRanges(clip?.subsections, clip?.lengthTicks ?? 1);
      const maxIdx = Math.max(0, ranges.length - 1);
      const countBefore = session.originBoundaryRel != null
        ? subsectionRanges(
            draft.forma.clips.find((c) => c.id === session.clipId)?.subsections,
            session.originClipLength,
          ).length
        : ranges.length;
      if (ranges.length < countBefore && session.boundarySubIdx != null) {
        setSelectedSubsectionIdx(
          Math.max(0, Math.min(session.boundarySubIdx - 1, maxIdx)),
        );
      } else if (session.boundarySubIdx != null) {
        setSelectedSubsectionIdx(
          Math.max(0, Math.min(session.boundarySubIdx, maxIdx)),
        );
      }
    } else if (session.clipId) {
      setSelectedClipId(session.clipId);
    }
  }

  // Window-level move/up — survives clip reflow under the pointer (v4 pattern).
  useEffect(() => {
    if (!gestureSession) return;
    const pointerId = gestureSession.pointerId;

    function onMove(e: PointerEvent) {
      if (e.pointerId !== pointerId) return;
      if (!gestureSessionRef.current) return;
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      updateFormaGesturePreview(raw, e.metaKey, e.ctrlKey, e.clientX);
    }

    function onUp(e: PointerEvent) {
      if (e.pointerId !== pointerId) return;
      endFormaGesture(e.metaKey, e.ctrlKey);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session id gates; handlers use refs
  }, [gestureSession?.pointerId, gestureSession?.kind, gestureSession?.clipId]);

  function beginContentPencilDraw(
    e: React.PointerEvent<HTMLElement>,
    lane: ContentLaneId,
  ) {
    if (!gesturePolicy.pencilDraw) {
      window.alert(TOUCH_FULL_EDIT_MSG);
      return;
    }
    if (!draftProject) return;
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const session: FormaGestureSession = {
      kind: "pencil-draw",
      clipId: null,
      pointerId: e.pointerId,
      originTicks: raw,
      originClipStart: 0,
      originClipLength: 0,
      lane,
      originClientX: e.clientX,
    };
    const preview = previewContentFromSession(
      draftProject,
      session,
      raw,
      e.metaKey,
      e.ctrlKey,
      e.clientX,
    );
    beginFormaGesture(session, preview);
  }

  function onContentClipPointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    lane: ContentLaneId,
    clip: { id: string; startTicks: number; lengthTicks: number },
  ) {
    if (e.button !== 0 || !draftProject) return;
    e.preventDefault();
    e.stopPropagation();

    if (tool === "eraser") {
      if (lane === "tekst") {
        commitDraft(deleteTekstClip(draftProject, clip.id));
        setSelectedTekstClipId(null);
      } else if (lane === "akordy") {
        commitDraft(deleteAkordyClip(draftProject, clip.id));
        setSelectedAkordClipId(null);
      } else {
        commitDraft(deleteCueClip(draftProject, clip.id));
        setSelectedCueClipId(null);
      }
      return;
    }

    if (tool === "scissors") {
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      const next = splitContentClipAt(draftProject, lane, clip.id, raw);
      if (next !== draftProject) commitDraft(next);
      return;
    }

    if (toolIsPencilDraw(tool)) {
      beginContentPencilDraw(e, lane);
      return;
    }

    if (!toolAllowsClipHitZones(tool)) return;
    if (!gesturePolicy.clipDragResize) {
      // Tablet/mobile: select only (v4 — drag via nudge on tablet).
      setSelectedClipId(null);
      setSongMetaOpen(false);
      clearMapSelection();
      if (lane === "tekst") {
        setSelectedAkordClipId(null);
        setSelectedCueClipId(null);
        setSelectedTekstClipId(clip.id);
      } else if (lane === "akordy") {
        setSelectedTekstClipId(null);
        setSelectedCueClipId(null);
        setSelectedAkordClipId(clip.id);
      } else {
        setSelectedTekstClipId(null);
        setSelectedAkordClipId(null);
        setSelectedCueClipId(clip.id);
      }
      return;
    }

    setSelectedClipId(null);
    setSongMetaOpen(false);
    clearMapSelection();
    if (lane === "tekst") {
      setSelectedAkordClipId(null);
      setSelectedCueClipId(null);
      setSelectedTekstClipId(clip.id);
    } else if (lane === "akordy") {
      setSelectedTekstClipId(null);
      setSelectedCueClipId(null);
      setSelectedAkordClipId(clip.id);
    } else {
      setSelectedTekstClipId(null);
      setSelectedAkordClipId(null);
      setSelectedCueClipId(clip.id);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const zone = hitTestClipZone(e.clientX - rect.left, rect.width, true);
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
      lane,
      originClientX: e.clientX,
    };
    const preview = previewContentFromSession(
      draftProject,
      session,
      raw,
      e.metaKey,
      e.ctrlKey,
      e.clientX,
    );
    beginFormaGesture(session, preview);
  }

  function onFormaLanePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !draftProject) return;
    if (tool === "eraser") {
      e.preventDefault();
      deleteSelectedFormaClip();
      return;
    }
    if (tool === "scissors") {
      e.preventDefault();
      if (!selectedClipId) return;
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      const next = splitFormaClipAt(draftProject, selectedClipId, raw);
      if (next !== draftProject) commitDraft(next);
      return;
    }
    if (!toolIsPencilDraw(tool)) {
      if (toolAllowsClipHitZones(tool)) {
        setSelectedClipId(null);
        clearContentSelection();
      }
      return;
    }
    if (!gesturePolicy.pencilDraw) {
      window.alert(TOUCH_FULL_EDIT_MSG);
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
      originClientX: e.clientX,
    };
    const preview = previewFromSession(
      draftProject,
      session,
      raw,
      e.metaKey,
      e.ctrlKey,
      `Sekcja ${n}`,
      e.clientX,
    );
    beginFormaGesture(session, preview);
  }

  function onFormaLanePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!gestureSessionRef.current) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    updateFormaGesturePreview(raw, e.metaKey, e.ctrlKey, e.clientX);
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
      commitDraft(deleteFormaClip(draftProject, clip.id));
      if (selectedClipId === clip.id) {
        setSelectedClipId(null);
        setSelectedSubsectionIdx(null);
      }
      return;
    }

    if (tool === "scissors") {
      if (clip.kind === "countdown") return;
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      setSelectedClipId(clip.id);
      setSelectedSubsectionIdx(null);
      clearContentSelection();
      clearMapSelection();
      const next = splitFormaClipAt(draftProject, clip.id, raw);
      if (next !== draftProject) commitDraft(next);
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
        originClientX: e.clientX,
      };
      const preview = previewFromSession(
        draftProject,
        session,
        raw,
        e.metaKey,
        e.ctrlKey,
        `Sekcja ${n}`,
        e.clientX,
      );
      beginFormaGesture(session, preview);
      return;
    }

    if (!toolAllowsClipHitZones(tool)) return;

    setSelectedClipId(clip.id);
    clearContentSelection();
    clearMapSelection();
    setSongMetaOpen(false);
    if (clip.kind === "countdown") {
      setSelectedSubsectionIdx(null);
      return;
    }

    if (!gesturePolicy.clipDragResize) {
      setSelectedSubsectionIdx(null);
      return;
    }

    const boundaryEl = (e.target as HTMLElement | null)?.closest?.(
      "[data-sub-boundary]",
    ) as HTMLElement | null;
    if (boundaryEl) {
      const boundarySubIdx = Number(boundaryEl.dataset.subBoundary);
      if (Number.isFinite(boundarySubIdx) && boundarySubIdx >= 1) {
        const ranges = subsectionRanges(clip.subsections, clip.lengthTicks);
        if (boundarySubIdx >= ranges.length) return;
        setSelectedSubsectionIdx(boundarySubIdx);
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const originBoundaryRel = ranges[boundarySubIdx]!.startRel;
        const session: FormaGestureSession = {
          kind: "subsection-boundary",
          clipId: clip.id,
          pointerId: e.pointerId,
          originTicks: raw,
          originClipStart: clip.startTicks,
          originClipLength: clip.lengthTicks,
          boundarySubIdx,
          originBoundaryRel,
        };
        const preview = previewFromSession(
          draftProject,
          session,
          raw,
          e.metaKey,
          e.ctrlKey,
        );
        beginFormaGesture(session, preview);
        return;
      }
    }

    const subEl = (e.target as HTMLElement | null)?.closest?.(
      "[data-sub-idx]",
    ) as HTMLElement | null;
    const subsectionIdx =
      subEl && subEl.dataset.subIdx != null
        ? Number(subEl.dataset.subIdx)
        : null;
    setSelectedSubsectionIdx(
      subsectionIdx != null && Number.isFinite(subsectionIdx)
        ? subsectionIdx
        : null,
    );

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
    updateFormaGesturePreview(raw, e.metaKey, e.ctrlKey, e.clientX);
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
    if (!coordRoot || !draftRef.current) return;
    const raw = ticksFromPointer(
      clientX,
      coordRoot,
      viewSpanRef.current,
      barTicksRef.current,
      zoomHRef.current,
    );
    setLocatorTicks(snapEditTicks(draftRef.current, raw));
  }

  function onLocatorPointerDown(e: React.PointerEvent<HTMLElement>) {
    if (e.button !== 0) return;
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    loopDragRef.current = {
      pointerId: e.pointerId,
      originTicks: raw,
      originClientX: e.clientX,
    };
    setLoopDraft(null);
    if (!state.playing) {
      setLocatorFromClientX(e.clientX);
    }
  }

  function onLocatorPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const drag = loopDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) {
      if (!state.playing) setLocatorFromClientX(e.clientX);
      return;
    }
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    const dx = Math.abs(e.clientX - drag.originClientX);
    if (dx >= 5) {
      const a = Math.min(drag.originTicks, raw);
      const b = Math.max(drag.originTicks, raw);
      setLoopDraft({ startTicks: a, endTicks: Math.max(a + 1, b) });
    }
    if (!state.playing && dx < 5) {
      setLocatorFromClientX(e.clientX);
    }
  }

  function onLocatorPointerUp(e: React.PointerEvent<HTMLElement>) {
    const drag = loopDragRef.current;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (drag && drag.pointerId === e.pointerId) {
      const draft = loopDraftRef.current;
      loopDragRef.current = null;
      if (draft && draft.endTicks > draft.startTicks) {
        void setLoop({
          enabled: true,
          startTicks: draft.startTicks,
          endTicks: draft.endTicks,
        }).finally(() => setLoopDraft(null));
      } else {
        setLoopDraft(null);
      }
    }
  }

  function onLoopToggle() {
    const range = state.loop;
    if (range && range.endTicks > range.startTicks) {
      void setLoop({ enabled: !range.enabled });
      return;
    }
    if (!draftProject) return;
    const end = projectEndTicks(draftProject);
    if (end <= 0) return;
    void setLoop({ enabled: true, startTicks: 0, endTicks: end });
  }

  function toggleTrack(id: CoreTrackId) {
    const def = TRACKS.find((t) => t.id === id);
    if (def?.locked) return;
    setTrackVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function onClipRename(name: string) {
    if (!draftProject || !selectedClip) return;
    commitDraft(renameFormaClip(draftProject, selectedClip.id, name));
  }

  function onCountdownBarsChange(raw: string) {
    if (!draftProject) return;
    const bars = Number.parseInt(raw, 10);
    if (!Number.isFinite(bars)) return;
    try {
      commitDraft(setCountdownBars(draftProject, bars));
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

  function openMapEdit(
    lane: MapLaneId,
    ticks: number,
    seed?: { bpm?: number; num?: number; den?: number },
  ) {
    setMapEditTicks(ticks);
    if (lane === "tempo") {
      setTempoDraft(String(seed?.bpm ?? resolveTempoAt(draftProject!, ticks)));
      setTempoEditOpen(true);
    } else if (lane === "metrum") {
      const m = resolveMeterAt(draftProject!, ticks);
      setMeterNumDraft(String(seed?.num ?? m.numerator));
      setMeterDenDraft(String(seed?.den ?? m.denominator));
      setMeterEditOpen(true);
    } else {
      setKeyEditOpen(true);
    }
  }

  function onMapLanePointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    lane: MapLaneId,
  ) {
    if (e.button !== 0 || !draftProject) return;
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    e.preventDefault();
    e.stopPropagation();

    if (tool === "scissors" || toolIsPencilDraw(tool)) {
      if (!gesturePolicy.mapEdit) {
        window.alert(TOUCH_FULL_EDIT_MSG);
        return;
      }
      const mode = mapSnapMode(e.metaKey, e.ctrlKey);
      const next =
        tool === "scissors"
          ? splitMapAt(draftProject, lane, raw, mode)
          : insertMapEventAt(draftProject, lane, raw, mode);
      if (next !== draftProject) {
        commitDraft(next);
        const snapped = snapEditTicks(next, raw, mode);
        openMapEdit(lane, snapped);
      }
      return;
    }

    if (tool === "eraser") return;
    // Pointer / Smart: seek locator (segment buttons handle edit / drag)
  }

  function onMapSegmentPointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    lane: MapLaneId,
    seg: {
      eventId: string;
      eventStartTicks: number;
      label: string;
    },
  ) {
    if (e.button !== 0 || !draftProject) return;
    e.preventDefault();
    e.stopPropagation();

    if (tool === "eraser") {
      if (seg.eventId.endsWith("-default") || seg.eventStartTicks === 0) return;
      const ids =
        selectedMapLane === lane &&
        selectedMapIds.includes(seg.eventId) &&
        selectedMapIds.length > 1
          ? selectedMapIds
          : [seg.eventId];
      const next = deleteMapEvents(draftProject, lane, ids);
      if (next !== draftProject) {
        commitDraft(next);
        clearMapSelection();
      }
      return;
    }

    if (tool === "scissors") {
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      const mode = mapSnapMode(e.metaKey, e.ctrlKey);
      const next = splitMapAt(draftProject, lane, raw, mode);
      if (next !== draftProject) {
        commitDraft(next);
        openMapEdit(lane, snapEditTicks(next, raw, mode));
      }
      return;
    }

    if (toolIsPencilDraw(tool)) {
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      const mode = mapSnapMode(e.metaKey, e.ctrlKey);
      const next = insertMapEventAt(draftProject, lane, raw, mode);
      if (next !== draftProject) {
        commitDraft(next);
        openMapEdit(lane, snapEditTicks(next, raw, mode));
      } else {
        openMapEdit(lane, seg.eventStartTicks);
      }
      return;
    }

    // Pointer / Smart: multi-select (Cmd/Shift) or drag-move / click-edit
    const isDefault = seg.eventId.endsWith("-default");
    const multiToggle = (e.metaKey || e.ctrlKey) && !e.altKey;

    if (multiToggle && !isDefault) {
      if (selectedMapLane === lane && selectedMapIds.includes(seg.eventId)) {
        const nextIds = selectedMapIds.filter((id) => id !== seg.eventId);
        setMapSelection(
          lane,
          nextIds,
          nextIds.length
            ? nextIds.includes(primaryMapId ?? "")
              ? primaryMapId
              : nextIds[nextIds.length - 1]!
            : null,
        );
      } else if (selectedMapLane === lane) {
        setMapSelection(lane, [...selectedMapIds, seg.eventId], seg.eventId);
      } else {
        setMapSelection(lane, [seg.eventId], seg.eventId);
      }
      return;
    }

    if (e.shiftKey && !isDefault && selectedMapLane === lane && primaryMapId) {
      const ordered = mapEventIds(draftProject, lane);
      const a = ordered.indexOf(primaryMapId);
      const b = ordered.indexOf(seg.eventId);
      if (a >= 0 && b >= 0) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        setMapSelection(lane, ordered.slice(lo, hi + 1), seg.eventId);
        return;
      }
    }

    const inMulti =
      selectedMapLane === lane &&
      selectedMapIds.includes(seg.eventId) &&
      selectedMapIds.length > 1;

    if (!inMulti) {
      setMapSelection(lane, isDefault ? [] : [seg.eventId], isDefault ? null : seg.eventId);
    } else {
      setPrimaryMapId(seg.eventId);
    }

    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    const moveIds = inMulti
      ? selectedMapIds.filter((id) => !id.endsWith("-default"))
      : isDefault
        ? []
        : [seg.eventId];
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    mapDragRef.current = {
      lane,
      eventId: seg.eventId,
      moveIds,
      originStartTicks: seg.eventStartTicks,
      originPointerTicks: raw,
      originClientX: e.clientX,
      pointerId: e.pointerId,
      moved: false,
      previewDeltaTicks: 0,
    };
  }

  function onMapSegmentPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = mapDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    if (!draftRef.current) return;
    if (!drag.moveIds.length || drag.originStartTicks <= 0) return;

    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    const dx = Math.abs(e.clientX - drag.originClientX);
    if (dx >= 5) drag.moved = true;
    if (!drag.moved) return;

    const mode = mapSnapMode(e.metaKey, e.ctrlKey);
    const unsnappedTarget =
      drag.originStartTicks + (raw - drag.originPointerTicks);
    const snappedTarget = snapEditTicks(draftRef.current, unsnappedTarget, mode);
    const deltaTicks = snappedTarget - drag.originStartTicks;
    drag.previewDeltaTicks = deltaTicks;
    setMapDragPreview({
      lane: drag.lane,
      moveIds: drag.moveIds,
      deltaTicks,
    });
  }

  function onMapSegmentPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = mapDragRef.current;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!drag || drag.pointerId !== e.pointerId) return;
    mapDragRef.current = null;
    setMapDragPreview(null);

    const draft = draftRef.current;
    if (!draft) return;

    if (drag.moved && drag.moveIds.length > 0) {
      // Delta already snapped from primary drag; apply uniformly (v4 same Δ).
      const next = moveMapEventsByDelta(
        draft,
        drag.lane,
        drag.moveIds,
        drag.previewDeltaTicks,
        "off",
      );
      if (next !== draft) commitDraft(next);
      return;
    }

    if (drag.moveIds.length <= 1) {
      openMapEdit(drag.lane, drag.originStartTicks);
    }
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
    const mapSelectedClass = (eventId: string, lane: MapLaneId) =>
      selectedMapLane === lane && selectedMapIds.includes(eventId)
        ? styles.mapSegmentSelected
        : "";
    const mapDraggingClass = (eventId: string) =>
      mapDragPreview?.moveIds.includes(eventId)
        ? styles.mapSegmentDragging
        : "";

    switch (trackId) {
      case "tempo":
        return tempoSegments.map((seg, i) => (
          <button
            key={`tempo-${seg.eventId}-${i}`}
            type="button"
            className={[
              styles.mapSegment,
              mapSelectedClass(seg.eventId, "tempo"),
              mapDraggingClass(seg.eventId),
            ]
              .filter(Boolean)
              .join(" ")}
            style={segmentStylePx(seg, viewSpan, barTicks, zoomH)}
            title={`${seg.label} — ⌘/⇧ multi · przeciągnij lub kliknij`}
            onPointerDown={(e) => onMapSegmentPointerDown(e, "tempo", seg)}
            onPointerMove={onMapSegmentPointerMove}
            onPointerUp={onMapSegmentPointerUp}
            onPointerCancel={onMapSegmentPointerUp}
          >
            {seg.label}
          </button>
        ));
      case "metrum":
        return meterSegments.map((seg, i) => (
          <button
            key={`meter-${seg.eventId}-${i}`}
            type="button"
            className={[
              styles.mapSegment,
              mapSelectedClass(seg.eventId, "metrum"),
              mapDraggingClass(seg.eventId),
            ]
              .filter(Boolean)
              .join(" ")}
            style={segmentStylePx(seg, viewSpan, barTicks, zoomH)}
            title={`${seg.label} — ⌘/⇧ multi · przeciągnij lub kliknij`}
            onPointerDown={(e) => onMapSegmentPointerDown(e, "metrum", seg)}
            onPointerMove={onMapSegmentPointerMove}
            onPointerUp={onMapSegmentPointerUp}
            onPointerCancel={onMapSegmentPointerUp}
          >
            {seg.label}
          </button>
        ));
      case "tonacja":
        return (keySegments.length > 0
          ? keySegments
          : []
        ).map((seg, i) => (
          <button
            key={`key-${seg.eventId}-${i}`}
            type="button"
            className={[
              styles.mapSegment,
              mapSelectedClass(seg.eventId, "tonacja"),
              mapDraggingClass(seg.eventId),
            ]
              .filter(Boolean)
              .join(" ")}
            style={segmentStylePx(seg, viewSpan, barTicks, zoomH)}
            title={`${seg.label} — ⌘/⇧ multi · przeciągnij lub kliknij`}
            onPointerDown={(e) => onMapSegmentPointerDown(e, "tonacja", seg)}
            onPointerMove={onMapSegmentPointerMove}
            onPointerUp={onMapSegmentPointerUp}
            onPointerCancel={onMapSegmentPointerUp}
          >
            {seg.label}
          </button>
        ));
      case "kotwice": {
        const anchors = scoreAnchors(draftProject);
        if (anchors.length === 0 && !canEditKotwice(draftProject)) {
          return (
            <span className={styles.muted}>
              Kotwice — dodaj MusicXML (Admin) lub kotwicę Pencil
            </span>
          );
        }
        return anchors.map((anchor) => {
          const start = ticksFromLogicBar(draftProject, anchor.logicBar);
          const width = anchorBarWidthTicks(draftProject, anchor.logicBar);
          return (
            <button
              key={anchor.id}
              type="button"
              className={[
                styles.clip,
                styles.kotwiceClip,
                selectedAnchorId === anchor.id ? styles.clipSelected : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                left: `${tickToPx(start, viewSpan, barTicks, zoomH)}px`,
                width: `${Math.max(
                  tickToPx(start + width, viewSpan, barTicks, zoomH) -
                    tickToPx(start, viewSpan, barTicks, zoomH),
                  24,
                )}px`,
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                setSelectedClipId(null);
                setSelectedTekstClipId(null);
                setSelectedAkordClipId(null);
                setSelectedCueClipId(null);
                clearMapSelection();
                setSelectedAnchorId(anchor.id);
                if (tool === "eraser") {
                  commitDraft(deleteScoreAnchor(draftProject, anchor.id));
                  setSelectedAnchorId(null);
                  return;
                }
                if (
                  !toolAllowsClipHitZones(tool) &&
                  tool !== "pointer" &&
                  tool !== "smart"
                ) {
                  return;
                }
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerUp={(e) => {
                if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                e.currentTarget.releasePointerCapture(e.pointerId);
                const raw = rawTicksAtClientX(e.clientX);
                if (raw == null) return;
                commitDraft(moveScoreAnchor(draftProject, anchor.id, raw));
              }}
            >
              {anchor.logicBar} → {anchor.scoreBar}
            </button>
          );
        });
      }
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
                    subsections:
                      gesturePreview.kind === "subsection-boundary" &&
                      gesturePreview.subsections !== undefined
                        ? gesturePreview.subsections
                        : clip.subsections,
                  }
                : clip;
              return (
                <FormaClipButton
                  key={clip.id}
                  clip={styleClip}
                  selected={selectedClipId === clip.id}
                  selectedSubsectionIdx={
                    selectedClipId === clip.id ? selectedSubsectionIdx : null
                  }
                  style={clipStylePx(styleClip, viewSpan, barTicks, zoomH)}
                  pencilActive={toolIsPencilDraw(tool)}
                  allowHitZones={toolAllowsClipHitZones(tool)}
                  dimmed={Boolean(previewing)}
                  onPointerDown={(e) => onFormaClipPointerDown(e, clip)}
                  onPointerMove={onFormaClipPointerMove}
                  onPointerUp={onFormaClipPointerUp}
                />
              );
            })}
            {gesturePreview?.kind === "pencil-draw" &&
            (gestureSession?.lane ?? "forma") === "forma" ? (
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
                  zoomH,
                )}
                aria-hidden
              >
                {gesturePreview.name ?? "Sekcja"}
              </div>
            ) : null}
          </>
        );
      case "tekst":
      case "akordy":
      case "cue": {
        const lane = trackId as ContentLaneId;
        const clips =
          lane === "tekst"
            ? (draftProject.tekst?.clips ?? [])
            : lane === "akordy"
              ? (draftProject.akordy?.clips ?? [])
              : (draftProject.cue?.clips ?? []);
        const selectedId =
          lane === "tekst"
            ? selectedTekstClipId
            : lane === "akordy"
              ? selectedAkordClipId
              : selectedCueClipId;
        return (
          <>
            {clips.map((clip) => {
              const label =
                lane === "tekst"
                  ? (clip as { text: string }).text || "…"
                  : lane === "akordy"
                    ? (clip as { symbol: string }).symbol
                    : (clip as { label: string }).label;
              const previewing =
                gesturePreview &&
                gestureSession?.lane === lane &&
                gesturePreview.clipId === clip.id &&
                gesturePreview.kind !== "pencil-draw";
              const styleClip: FormaClip = {
                id: clip.id,
                name: label,
                kind: "section",
                startTicks: previewing
                  ? gesturePreview!.startTicks
                  : clip.startTicks,
                lengthTicks: previewing
                  ? gesturePreview!.lengthTicks
                  : clip.lengthTicks,
              };
              return (
                <FormaClipButton
                  key={clip.id}
                  clip={styleClip}
                  selected={selectedId === clip.id}
                  selectedSubsectionIdx={null}
                  style={clipStylePx(styleClip, viewSpan, barTicks, zoomH)}
                  pencilActive={toolIsPencilDraw(tool)}
                  allowHitZones={toolAllowsClipHitZones(tool)}
                  dimmed={Boolean(previewing)}
                  onPointerDown={(e) =>
                    onContentClipPointerDown(e, lane, clip)
                  }
                  onPointerMove={onFormaClipPointerMove}
                  onPointerUp={onFormaClipPointerUp}
                />
              );
            })}
            {gesturePreview?.kind === "pencil-draw" &&
            gestureSession?.lane === lane ? (
              <div
                className={[styles.clip, styles.formaClip, styles.formaPreview]
                  .filter(Boolean)
                  .join(" ")}
                style={clipStylePx(
                  {
                    id: "preview",
                    name: gesturePreview.name ?? defaultPencilLabel(lane),
                    kind: "section",
                    startTicks: gesturePreview.startTicks,
                    lengthTicks: gesturePreview.lengthTicks,
                  },
                  viewSpan,
                  barTicks,
                  zoomH,
                )}
                aria-hidden
              >
                {gesturePreview.name ?? defaultPencilLabel(lane)}
              </div>
            ) : null}
          </>
        );
      }
      default:
        return null;
    }
  }

  return (
    <div className={styles.shell} data-tl-tier={touchTier}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <ShellWordmark suffix="Timeline" version={APP_VERSION} />
        </div>

        <div className={styles.songCluster} role="group" aria-label="Setlista">
          <ShellIconButton
            label="Metadane utworu"
            disabled={!draftProject}
            pressed={songMetaOpen}
            onClick={() => {
              if (!draftProject) return;
              setSelectedClipId(null);
              clearContentSelection();
              clearMapSelection();
              setSongMetaOpen(true);
              setInspectorOpen(true);
            }}
          >
            <IconInfo />
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
            <IconAutoAdvance />
          </ShellIconButton>
        </div>

        <div className={styles.headerActions}>
          <nav className={styles.appJump} aria-label="Aplikacje">
            <Link to="/admin">Admin</Link>
            <Link to="/">Klient</Link>
          </nav>
          <ShellIconButton
            label="Cofnij"
            disabled={!draftHistory || !canUndo(draftHistory)}
            onClick={onUndo}
          >
            <IconUndo />
          </ShellIconButton>
          <ShellIconButton
            label="Ponów"
            disabled={!draftHistory || !canRedo(draftHistory)}
            onClick={onRedo}
          >
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
          <ShellIconButton
            label="Pełny ekran"
            onClick={() => {
              void (async () => {
                try {
                  if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                  } else {
                    await document.exitFullscreen();
                  }
                } catch {
                  /* ignore */
                }
              })();
            }}
          >
            <IconFullscreen />
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
                  onClick={() => onWandAction(a.id)}
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
              void (state.playing ? pause() : onPlayClick())
            }
          >
            {state.playing ? <IconPause /> : <IconPlay />}
          </button>
          <ShellIconButton
            label="Pętla — przeciągnij zakres na linijce, potem włącz"
            pressed={loopOn}
            onClick={onLoopToggle}
          >
            <IconLoop />
          </ShellIconButton>
          <span className={styles.bbt} aria-live="polite">
            {toDisplayBar(bbt.bar)}.{bbt.beat}
          </span>
          <button
            type="button"
            className={styles.metaBtn}
            title="Tempo — kliknij, aby edytować @ playhead"
            onClick={() => {
              openMapEdit("tempo", displayTicks);
            }}
          >
            {tempoAtPlayhead} BPM
          </button>
          <button
            type="button"
            className={styles.metaBtn}
            title="Metrum — kliknij, aby edytować @ playhead"
            onClick={() => {
              openMapEdit("metrum", displayTicks);
            }}
          >
            {meterAtPlayhead.numerator}/{meterAtPlayhead.denominator}
          </button>
          <button
            type="button"
            className={styles.metaBtn}
            title="Tonacja — kliknij, aby edytować"
            onClick={() => openMapEdit("tonacja", displayTicks)}
          >
            {draftProject
              ? formatKeySignature(resolveKeyAt(draftProject, displayTicks))
              : "—"}
          </button>
          <ShellIconButton
            label="Metronom"
            pressed={metronomeOn}
            onClick={() => void onMetronomeToggle()}
          >
            <IconMetronome />
          </ShellIconButton>
          <ShellIconButton
            label="Podążaj za wskaźnikiem"
            pressed={followPlayhead}
            onClick={() => {
              setFollowPlayhead((v) => {
                const next = !v;
                try {
                  localStorage.setItem(
                    "stagesync-timeline-follow-playhead",
                    next ? "1" : "0",
                  );
                } catch {
                  /* ignore */
                }
                return next;
              });
            }}
          >
            <IconFollow />
          </ShellIconButton>
        </div>

        <span className={styles.dirty} hidden={!dirty}>
          Niezapisane zmiany
        </span>
      </div>

      <div
        className={styles.main}
        style={{
          /* Unitless scale like v4 `--tl-ui-scale` (not `%` — avoids calc % of parent). */
          ["--tl-zoom-ui" as string]: String(zoomUi / 100),
          ["--tl-row-h" as string]: `${zoomV}px`,
        }}
      >
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
                    {loopRange ? (
                      <div
                        className={[
                          styles.loopRegion,
                          loopOn ? "" : styles.loopRegionOff,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{
                          left: `${tickToPx(loopRange.startTicks, viewSpan, barTicks, zoomH)}px`,
                          width: `${Math.max(
                            tickToPx(loopRange.endTicks, viewSpan, barTicks, zoomH) -
                              tickToPx(loopRange.startTicks, viewSpan, barTicks, zoomH),
                            2,
                          )}px`,
                        }}
                        aria-hidden
                      />
                    ) : null}
                    {barMarks.map((mark) => (
                      <span
                        key={`bar-${mark.ticks}`}
                        className={styles.rulerMark}
                        style={{
                          left: `${tickToPx(mark.ticks, viewSpan, barTicks, zoomH)}px`,
                        }}
                      >
                        {mark.label}
                      </span>
                    ))}
                    {rulerBeatMarks.map((mark) => (
                      <span
                        key={`beat-${mark.ticks}`}
                        className={styles.rulerBeatTick}
                        style={{
                          left: `${tickToPx(mark.ticks, viewSpan, barTicks, zoomH)}px`,
                        }}
                        aria-hidden
                      />
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
                            left: `${tickToPx(mark.ticks, viewSpan, barTicks, zoomH)}px`,
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
                          title={
                            tapBpmHint
                              ? `Tap tempo — ${tapBpmHint} BPM`
                              : "Tap — tempo @ locator"
                          }
                          aria-label="Tap tempo"
                          onClick={onTap}
                        >
                          <IconTap />
                        </button>
                      ) : null}
                    </div>
                    <div
                      onPointerDown={
                        track.id === "forma"
                          ? onFormaLanePointerDown
                          : track.id === "kotwice"
                            ? (e) => {
                                if (e.button !== 0 || !draftProject) return;
                                if (!toolIsPencilDraw(tool)) return;
                                if (!canEditKotwice(draftProject)) return;
                                const raw = rawTicksAtClientX(e.clientX);
                                if (raw == null) return;
                                const next = insertScoreAnchor(
                                  draftProject,
                                  raw,
                                  1,
                                );
                                if (next !== draftProject) commitDraft(next);
                              }
                            : isMapLaneId(track.id)
                              ? (e) =>
                                  onMapLanePointerDown(
                                    e,
                                    track.id as MapLaneId,
                                  )
                            : track.id === "tekst" ||
                                track.id === "akordy" ||
                                track.id === "cue"
                              ? (e) => {
                                  if (e.button !== 0 || !draftProject) return;
                                  if (!toolIsPencilDraw(tool)) {
                                    if (toolAllowsClipHitZones(tool)) {
                                      if (track.id === "tekst")
                                        setSelectedTekstClipId(null);
                                      if (track.id === "akordy")
                                        setSelectedAkordClipId(null);
                                      if (track.id === "cue")
                                        setSelectedCueClipId(null);
                                    }
                                    return;
                                  }
                                  beginContentPencilDraw(
                                    e,
                                    track.id as ContentLaneId,
                                  );
                                }
                              : undefined
                      }
                      onPointerMove={
                        track.id === "forma" ||
                        track.id === "tekst" ||
                        track.id === "akordy" ||
                        track.id === "cue"
                          ? onFormaLanePointerMove
                          : undefined
                      }
                      onPointerUp={
                        track.id === "forma" ||
                        track.id === "tekst" ||
                        track.id === "akordy" ||
                        track.id === "cue"
                          ? onFormaLanePointerUp
                          : undefined
                      }
                      role={
                        track.id === "forma" ||
                        track.id === "tekst" ||
                        track.id === "akordy" ||
                        track.id === "cue"
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
                        (track.id === "tekst" ||
                          track.id === "akordy" ||
                          track.id === "cue") &&
                        toolIsPencilDraw(tool)
                          ? styles.formaLanePencil
                          : "",
                        isMapLaneId(track.id) &&
                        (toolIsPencilDraw(tool) || tool === "scissors")
                          ? styles.formaLanePencil
                          : "",
                        isMapLaneId(track.id) ? styles.mapLaneCell : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {renderLaneContent(track.id)}
                    </div>
                  </div>
                ))}
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
                onClick={() => {
                  setInspectorOpen(false);
                  setSongMetaOpen(false);
                }}
              >
                <IconClose />
              </ShellIconButton>
            </div>
            {songMetaOpen && draftProject ? (
              <div className={styles.inspBody}>
                <label className={styles.inspField}>
                  Tytuł
                  <input
                    className={styles.nameInput}
                    value={draftProject.name}
                    aria-label="Tytuł utworu"
                    onChange={(e) => {
                      commitDraft({
                        ...draftProject,
                        name: e.target.value || draftProject.name,
                      });
                    }}
                  />
                </label>
                <label className={styles.inspField}>
                  Tempo domyślne (BPM)
                  <input
                    className={styles.lengthInput}
                    type="number"
                    min={20}
                    max={400}
                    step={1}
                    value={draftProject.defaultBpm}
                    aria-label="Tempo domyślne"
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n) || n <= 0) return;
                      commitDraft({ ...draftProject, defaultBpm: n });
                    }}
                  />
                </label>
                <label className={styles.inspField}>
                  Metrum domyślne
                  <span className={styles.metaRead}>
                    {draftProject.defaultMeter.numerator}/
                    {draftProject.defaultMeter.denominator}
                  </span>
                </label>
                <label className={styles.inspField}>
                  PC (MIDI)
                  <input
                    className={styles.lengthInput}
                    type="number"
                    min={0}
                    max={127}
                    value={draftProject.midiProgramId ?? ""}
                    disabled={draftProject.isTemplate === true}
                    aria-label="Program Change"
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      commitDraft({
                        ...draftProject,
                        midiProgramId: Math.max(0, Math.min(127, Math.round(n))),
                      });
                    }}
                  />
                </label>
                <label className={styles.inspField}>
                  Artysta
                  <input
                    className={styles.nameInput}
                    value={draftProject.artist ?? ""}
                    onChange={(e) =>
                      commitDraft({
                        ...draftProject,
                        artist: e.target.value || undefined,
                      })
                    }
                  />
                </label>
                <label className={styles.inspField}>
                  Gatunek
                  <input
                    className={styles.nameInput}
                    value={draftProject.genre ?? ""}
                    onChange={(e) =>
                      commitDraft({
                        ...draftProject,
                        genre: e.target.value || undefined,
                      })
                    }
                  />
                </label>
                <label className={styles.inspField}>
                  Tonacja (start)
                  <span className={styles.metaRead}>
                    {formatKeySignature(resolveKeyAt(draftProject, 0))}
                  </span>
                </label>
              </div>
            ) : selectedMapLane && selectedMapIds.length > 0 ? (
              <div className={styles.inspBody}>
                <p className={styles.inspMulti}>
                  Zaznaczono {selectedMapIds.length} ·{" "}
                  {selectedMapLane === "tempo"
                    ? "Tempo"
                    : selectedMapLane === "metrum"
                      ? "Metrum"
                      : "Tonacja"}
                  {selectedMapIds.length > 1
                    ? " · edycja: klik bez multi / Delete"
                    : " · klik = edycja wartości"}
                </p>
                {primaryMapId ? (
                  <p>
                    Aktywny event:{" "}
                    <span className={styles.metaRead}>{primaryMapId}</span>
                  </p>
                ) : null}
              </div>
            ) : selectedTekstClip ? (
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
                      commitDraft(
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
            ) : selectedAkordClip ? (
              <div className={styles.inspBody}>
                <label className={styles.inspField}>
                  Symbol akordu
                  <input
                    className={styles.nameInput}
                    value={selectedAkordClip.symbol}
                    aria-label="Symbol akordu"
                    onChange={(e) => {
                      if (!draftProject) return;
                      commitDraft(
                        setAkordyClipSymbol(
                          draftProject,
                          selectedAkordClip.id,
                          e.target.value,
                        ),
                      );
                    }}
                  />
                </label>
                <p>
                  start {selectedAkordClip.startTicks}, długość{" "}
                  {selectedAkordClip.lengthTicks} ticks
                </p>
              </div>
            ) : selectedCueClip ? (
              <div className={styles.inspBody}>
                <label className={styles.inspField}>
                  Etykieta cue
                  <input
                    className={styles.nameInput}
                    value={selectedCueClip.label}
                    aria-label="Etykieta cue"
                    onChange={(e) => {
                      if (!draftProject) return;
                      commitDraft(
                        setCueClipLabel(
                          draftProject,
                          selectedCueClip.id,
                          e.target.value,
                        ),
                      );
                    }}
                  />
                </label>
                <p>
                  start {selectedCueClip.startTicks}, długość{" "}
                  {selectedCueClip.lengthTicks} ticks
                </p>
              </div>
            ) : selectedAnchor ? (
              <div className={styles.inspBody}>
                <p>
                  Kotwica {selectedAnchor.logicBar} → {selectedAnchor.scoreBar}
                </p>
                <label className={styles.inspField}>
                  Takt utworu (logicBar)
                  <input
                    className={styles.lengthInput}
                    type="number"
                    min={1}
                    value={selectedAnchor.logicBar}
                    onChange={(e) => {
                      if (!draftProject) return;
                      const n = Number.parseInt(e.target.value, 10);
                      if (!Number.isFinite(n)) return;
                      commitDraft(
                        updateScoreAnchor(draftProject, selectedAnchor.id, {
                          logicBar: n,
                        }),
                      );
                    }}
                  />
                </label>
                <label className={styles.inspField}>
                  Takt partytury (scoreBar)
                  <input
                    className={styles.lengthInput}
                    type="number"
                    min={1}
                    value={selectedAnchor.scoreBar}
                    onChange={(e) => {
                      if (!draftProject) return;
                      const n = Number.parseInt(e.target.value, 10);
                      if (!Number.isFinite(n)) return;
                      commitDraft(
                        updateScoreAnchor(draftProject, selectedAnchor.id, {
                          scoreBar: n,
                        }),
                      );
                    }}
                  />
                </label>
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
                {selectedClip.kind === "section" ? (
                  <label className={styles.inspField}>
                    Notatka (Client Forma)
                    <textarea
                      className={styles.nameInput}
                      rows={2}
                      value={selectedClip.note ?? ""}
                      aria-label="Notatka sekcji"
                      onChange={(e) => {
                        if (!draftProject || !selectedClip) return;
                        const note = e.target.value;
                        commitDraft({
                          ...draftProject,
                          forma: {
                            clips: draftProject.forma.clips.map((c) =>
                              c.id === selectedClip.id
                                ? {
                                    ...c,
                                    note: note.length > 0 ? note : undefined,
                                  }
                                : c,
                            ),
                          },
                        });
                      }}
                    />
                  </label>
                ) : null}
                {selectedClip.kind === "section" ? (
                  <div className={styles.inspField}>
                    <span>Podsekcje</span>
                    <span className={styles.metaRead}>
                      {selectedSubsectionRows.length}
                    </span>
                    <div
                      className={styles.subEditor}
                      aria-label="Podsekcje sekcji"
                    >
                      {selectedSubsectionRows.length === 0 ? (
                        <div className={styles.metaRead}>Brak podsekcji</div>
                      ) : (
                        selectedSubsectionRows.map((row) => {
                          const canDelete = selectedSubsectionRows.length >= 2;
                          const selected =
                            selectedSubsectionIdx === row.index;
                          return (
                            <div
                              key={`sub-${row.index}`}
                              className={[
                                styles.subEditorRow,
                                selected ? styles.subEditorRowSelected : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() =>
                                setSelectedSubsectionIdx(row.index)
                              }
                            >
                              <span
                                className={styles.subEditorIdx}
                                aria-hidden="true"
                              >
                                #{row.index + 1}
                              </span>
                              <input
                                type="number"
                                min={1}
                                step={1}
                                className={styles.subEditorBar}
                                value={row.startDisplayBar}
                                disabled={row.index === 0}
                                title={
                                  row.index === 0
                                    ? "Start sekcji (zablokowany)"
                                    : "Takt początkowy podsekcji"
                                }
                                aria-label={`Takt początkowy podsekcji ${row.index + 1}`}
                                onFocus={() =>
                                  setSelectedSubsectionIdx(row.index)
                                }
                                onChange={(e) => {
                                  if (!draftProject || !selectedClip) return;
                                  if (row.index === 0) return;
                                  const next = setFormaSubsectionStartBar(
                                    draftProject,
                                    selectedClip.id,
                                    row.index,
                                    Number(e.target.value),
                                  );
                                  if (next !== draftProject) commitDraft(next);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                type="button"
                                className={styles.subEditorDel}
                                disabled={!canDelete}
                                title="Usuń podsekcję"
                                aria-label={`Usuń podsekcję ${row.index + 1}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!draftProject || !selectedClip) return;
                                  const result = deleteFormaSubsection(
                                    draftProject,
                                    selectedClip.id,
                                    row.index,
                                  );
                                  if (!result) return;
                                  commitDraft(result.project);
                                  setSelectedSubsectionIdx(result.selectIdx);
                                }}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        className={styles.subEditorAdd}
                        onClick={() => {
                          if (!draftProject || !selectedClip) return;
                          const result = addFormaSubsection(
                            draftProject,
                            selectedClip.id,
                          );
                          if (!result) return;
                          commitDraft(result.project);
                          setSelectedSubsectionIdx(result.selectIdx);
                          setInspectorOpen(true);
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ) : null}
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
                Zaznacz clip Forma / Tekst / Akordy / Cue / Kotwice lub event
                mapy (Tempo / Metrum / Tonacja).
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

      <footer className={styles.status} aria-label="Status Timeline">
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Utwór</span>
          <span className={styles.statusVal}>
            {draftProject?.name ?? "—"}
          </span>
        </div>
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Pozycja</span>
          <span className={[styles.statusVal, styles.statusMono].join(" ")}>
            {toDisplayBar(bbt.bar)}.{bbt.beat} · {tempoAtPlayhead} BPM ·{" "}
            {meterAtPlayhead.numerator}/{meterAtPlayhead.denominator}
          </span>
        </div>
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Połączenie</span>
          <span className={styles.statusVal}>
            {connectionStatusLabel(wsStatus)}
          </span>
        </div>
        <div className={styles.statusGroup}>
          <span className={styles.statusLab}>Stan</span>
          <span
            className={[
              styles.statusVal,
              dirty ? "" : styles.statusMuted,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {dirty ? "Niezapisane" : "Zapisane"}
          </span>
        </div>
        <div className={styles.zooms} role="group" aria-label="Zoom">
          <label className={styles.zoomLab}>
            UI
            <input
              type="range"
              min={50}
              max={150}
              value={zoomUi}
              onChange={(e) => setZoomUi(Number(e.target.value))}
            />
          </label>
          <label className={styles.zoomLab}>
            H
            <input
              type="range"
              min={24}
              max={160}
              value={zoomH}
              onChange={(e) => setZoomH(Number(e.target.value))}
            />
          </label>
          <label className={styles.zoomLab}>
            V
            <input
              type="range"
              min={40}
              max={160}
              value={zoomV}
              onChange={(e) => setZoomV(Number(e.target.value))}
            />
          </label>
        </div>
      </footer>

      {touchTier === "tablet" &&
      draftProject &&
      selectedClipId &&
      draftProject.forma.clips.some(
        (c) => c.id === selectedClipId && c.kind === "section",
      ) ? (
        <div className={styles.touchNudge} role="toolbar" aria-label="Przesuń clip">
          <button
            type="button"
            className={styles.touchNudgeBtn}
            aria-label="Przesuń w lewo o takt"
            onClick={() => {
              const clip = draftProject.forma.clips.find(
                (c) => c.id === selectedClipId,
              );
              if (!clip || clip.kind === "countdown") return;
              commitDraft(
                commitMoveClip(
                  draftProject,
                  clip.id,
                  clip.startTicks - barTicks,
                  "bar",
                ),
              );
            }}
          >
            ◀
          </button>
          <button
            type="button"
            className={styles.touchNudgeBtn}
            aria-label="Przesuń w prawo o takt"
            onClick={() => {
              const clip = draftProject.forma.clips.find(
                (c) => c.id === selectedClipId,
              );
              if (!clip || clip.kind === "countdown") return;
              commitDraft(
                commitMoveClip(
                  draftProject,
                  clip.id,
                  clip.startTicks + barTicks,
                  "bar",
                ),
              );
            }}
          >
            ▶
          </button>
        </div>
      ) : null}

      {touchTier === "mobile" ? (
        <p className={styles.touchTierNote} role="status">
          Tryb tylko do odczytu — pełna edycja na tablecie (≥768px) lub komputerze.
          Metadane można edytować.
        </p>
      ) : null}

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
                      setDraftHistory((h) =>
                        h
                          ? syncPresentAfterSave(h, next)
                          : createDraftHistory(next),
                      );
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
          <div
            className={[styles.overlayPanel, styles.helpOverlayPanel]
              .filter(Boolean)
              .join(" ")}
          >
            <div className={styles.overlayHead}>
              <h2 id="tl-help-title">Pomoc</h2>
              <ShellIconButton label="Zamknij" onClick={() => setHelpOpen(false)}>
                <IconClose />
              </ShellIconButton>
            </div>
            <div
              className={[styles.overlayBody, styles.helpOverlayBody]
                .filter(Boolean)
                .join(" ")}
            >
              <TimelineHelpBody />
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
                <IconClose />
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
              <div className={styles.overlayActions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setUgError(null);
                    setUgModalOpen(true);
                  }}
                >
                  Import UG
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {ugModalOpen ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby="ug-import-title"
        >
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Zamknij"
            onClick={() => setUgModalOpen(false)}
          />
          <div className={styles.overlayPanel}>
            <div className={styles.overlayHead}>
              <h2 id="ug-import-title">Import Ultimate Guitar</h2>
              <ShellIconButton
                label="Zamknij"
                onClick={() => setUgModalOpen(false)}
              >
                <IconClose />
              </ShellIconButton>
            </div>
            <div className={styles.overlayBody}>
              <p className={styles.muted}>
                Wklej tekst ChordPro / UG ([C]tekst). Nadpisze lane Tekst i
                Akordy w draftcie.
              </p>
              {ugError ? (
                <p className={styles.muted} role="alert">
                  {ugError}
                </p>
              ) : null}
              <textarea
                className={styles.nameInput}
                rows={12}
                value={ugText}
                aria-label="Tekst UG"
                placeholder={"[C]Hello [G]world\n[Am]Line two"}
                onChange={(e) => setUgText(e.target.value)}
              />
              <div className={styles.overlayActions}>
                <Button variant="ghost" onClick={() => setUgModalOpen(false)}>
                  Anuluj
                </Button>
                <Button variant="primary" onClick={onImportUg}>
                  Importuj do draftu
                </Button>
              </div>
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
                    {isCoreTrackVisible(trackVisibility, track.id) ? (
                      <IconChecked />
                    ) : (
                      <IconUnchecked />
                    )}
                  </span>
                  {track.label}
                  {track.locked ? " (zawsze)" : ""}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}

      {tempoEditOpen && draftProject ? (
        <div className={styles.overlay} role="dialog" aria-modal>
          <div className={styles.overlayPanel}>
            <h2>Tempo @ {mapEditTicks === displayTicks ? "playhead" : "lane"}</h2>
            <label className={styles.inspField}>
              BPM
              <input
                className={styles.lengthInput}
                type="number"
                min={20}
                max={400}
                value={tempoDraft}
                onChange={(e) => setTempoDraft(e.target.value)}
              />
            </label>
            <div className={styles.overlayActions}>
              <Button variant="ghost" onClick={() => setTempoEditOpen(false)}>
                Anuluj
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const bpm = Number(tempoDraft);
                  if (!Number.isFinite(bpm) || bpm <= 0) return;
                  commitDraft(upsertTempoAt(draftProject, mapEditTicks, bpm));
                  setTempoEditOpen(false);
                }}
              >
                Zapisz
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {meterEditOpen && draftProject ? (
        <div className={styles.overlay} role="dialog" aria-modal>
          <div className={styles.overlayPanel}>
            <h2>Metrum @ {mapEditTicks === displayTicks ? "playhead" : "lane"}</h2>
            <label className={styles.inspField}>
              Licznik
              <input
                className={styles.lengthInput}
                type="number"
                min={1}
                max={32}
                value={meterNumDraft}
                onChange={(e) => setMeterNumDraft(e.target.value)}
              />
            </label>
            <label className={styles.inspField}>
              Mianownik
              <select
                className={styles.nameInput}
                value={meterDenDraft}
                onChange={(e) => setMeterDenDraft(e.target.value)}
              >
                {[1, 2, 4, 8, 16].map((d) => (
                  <option key={d} value={String(d)}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.overlayActions}>
              <Button variant="ghost" onClick={() => setMeterEditOpen(false)}>
                Anuluj
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const numerator = Number(meterNumDraft);
                  const denominator = Number(meterDenDraft);
                  if (
                    !Number.isFinite(numerator) ||
                    !Number.isFinite(denominator) ||
                    numerator < 1 ||
                    denominator < 1
                  ) {
                    return;
                  }
                  commitDraft(
                    upsertMeterAt(
                      draftProject,
                      mapEditTicks,
                      numerator,
                      denominator,
                    ),
                  );
                  setMeterEditOpen(false);
                }}
              >
                Zapisz
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {keyEditOpen && draftProject ? (
        <div className={styles.overlay} role="dialog" aria-modal>
          <div className={styles.overlayPanel}>
            <h2>Tonacja @ {mapEditTicks === displayTicks ? "playhead" : "lane"}</h2>
            <label className={styles.inspField}>
              Tonic
              <select
                className={styles.nameInput}
                id="key-tonic"
                defaultValue={
                  resolveKeyAt(draftProject, mapEditTicks)?.tonic ?? "C"
                }
              >
                {[
                  "C",
                  "C#",
                  "Db",
                  "D",
                  "Eb",
                  "E",
                  "F",
                  "F#",
                  "Gb",
                  "G",
                  "Ab",
                  "A",
                  "Bb",
                  "B",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.inspField}>
              Tryb
              <select
                className={styles.nameInput}
                id="key-mode"
                defaultValue={
                  resolveKeyAt(draftProject, mapEditTicks)?.mode ?? "major"
                }
              >
                <option value="major">Dur</option>
                <option value="minor">Moll</option>
              </select>
            </label>
            <div className={styles.overlayActions}>
              <Button variant="ghost" onClick={() => setKeyEditOpen(false)}>
                Anuluj
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const tonicEl = document.getElementById(
                    "key-tonic",
                  ) as HTMLSelectElement | null;
                  const modeEl = document.getElementById(
                    "key-mode",
                  ) as HTMLSelectElement | null;
                  const tonic = tonicEl?.value || "C";
                  const mode =
                    modeEl?.value === "minor"
                      ? ("minor" as const)
                      : ("major" as const);
                  commitDraft(
                    upsertKeyAt(draftProject, mapEditTicks, { tonic, mode }),
                  );
                  setKeyEditOpen(false);
                }}
              >
                Zapisz
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FormaClipButton({
  clip,
  selected,
  selectedSubsectionIdx,
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
  selectedSubsectionIdx: number | null;
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

  const ranges =
    clip.kind === "section" && clip.subsections && clip.subsections.length > 0
      ? subsectionRanges(clip.subsections, clip.lengthTicks)
      : [];

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
      {ranges.length > 1 ? (
        <span className={styles.formaSubs}>
          {ranges.map((sub) => (
            <span
              key={`band-${sub.index}`}
              className={[
                styles.formaSubBand,
                sub.index % 2 === 1 ? styles.formaSubBandAlt : "",
                selected && selectedSubsectionIdx === sub.index
                  ? styles.formaSubBandSelected
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-sub-idx={sub.index}
              style={{
                left: `${(sub.startRel / clip.lengthTicks) * 100}%`,
                width: `${(sub.lengthRel / clip.lengthTicks) * 100}%`,
              }}
              title={`Podsekcja ${sub.index + 1}`}
            />
          ))}
          {ranges.slice(1).map((sub) => (
            <span
              key={`bound-${sub.index}`}
              className={styles.formaSubBoundary}
              data-sub-boundary={sub.index}
              style={{ left: `${(sub.startRel / clip.lengthTicks) * 100}%` }}
              title={`Przeciągnij granicę podsekcji ${sub.index}`}
              aria-label={`Granica podsekcji ${sub.index + 1}`}
            />
          ))}
        </span>
      ) : null}
      <span className={styles.formaClipLabel}>
        {clip.kind === "countdown" ? `${clip.name} (CD)` : clip.name}
      </span>
    </button>
  );
}

