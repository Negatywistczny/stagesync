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
  parseLegacyMeter,
  ticksPerBar,
  ticksToBbt,
  toDisplayBar,
  importUgText,
  projectEndTicks,
  transportHomeTicks,
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
  scrollCanvasToStart,
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
  buildClipboardFromClips,
  deleteClipsOnLane,
  pasteClipboardAt,
  pasteClipboardWithDelta,
  selectionMaxEndTicks,
  type TimelineClipboard,
} from "../lib/timelineClipboard.js";
import {
  clearSelection,
  EMPTY_CLIP_SELECTION,
  idsOnLane,
  isAudioSelectionLane,
  isClipSelected,
  isMarqueeClick,
  isMultiSelectClick,
  marqueeSelectFromHits,
  primaryLane,
  rectsIntersect,
  resolveMoveIds,
  selectRangeTo,
  selectSingle,
  setSelection,
  toggleSelected,
  type ClipSelection,
  type ClipSelectionLane,
} from "../lib/timelineSelection.js";
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
  snapLoopRange,
  ticksInLoopRegion,
  usableLoopRange,
} from "../lib/timelineLocator.js";
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
  addAudioTrack,
  applyDecodedAudioMeta,
  commitAudioGesture,
  previewAudioFromSession,
  setAudioClipGainDb,
  setAudioClipMuted,
  setAudioTrackGainDb,
  setAudioTrackMuted,
} from "../lib/audioLaneEdit.js";
import {
  clearAudioBufferCache,
  loadAudioBuffer,
  restartAudioPlayback,
  stopAudioPlayback,
  syncAudioPlayback,
} from "../lib/audioPlayback.js";
import { uploadProjectAudio } from "../lib/projectAssetsApi.js";
import {
  computeWaveformFromAudioBuffer,
  peaksToPolylinePoints,
} from "../lib/waveformPeaks.js";
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
  contentSnapModeFromModifiers,
  cursorForHitZone,
  hitTestClipZone,
  toolAllowsClipHitZones,
  toolIsPencilDraw,
  type FormaGesturePreview,
  type FormaGestureSession,
  type FormaToolId,
} from "../lib/timelineGesture.js";
import {
  audioTrackIdFromLane,
  buildTrackList,
  defaultTrackVisibility,
  ensureAudioTrackVisibility,
  isAudioLaneId,
  isTrackVisible,
  type AudioLaneId,
  type TrackVisibilityMap,
} from "../lib/timelineTracks.js";
import {
  clearLaneHeightOverride,
  DEFAULT_LANE_PX,
  laneHeightBase,
  laneHeightEffective,
  loadLaneHeights,
  MAX_LANE_PX,
  MIN_LANE_PX,
  saveLaneHeights,
  scaleLaneHeights,
  setLaneHeightOverride,
  type LaneHeightsMap,
} from "../lib/timelineLaneHeights.js";
import {
  toggleAppFullscreen,
  syncNavRecentProjects,
  syncNavTimelineProjectId,
} from "../lib/desktopBridge.js";
import {
  DESKTOP_MENU_EVENT,
  parseDesktopMenuDetail,
} from "../lib/desktopMenuEvents.js";
import { pushRecentTimelineProject } from "../lib/lastTimelineProject.js";
import { ShellAlertDialog } from "./ShellBlockingDialog.js";
import { loadTransport } from "../transport/api.js";
import { useTransport } from "../transport/useTransport.js";
import {
  IconAutoAdvance,
  IconChecked,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconDiscard,
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
  IconSave,
  IconScissors,
  IconSmart,
  IconStop,
  IconSun,
  IconTap,
  IconUnchecked,
  IconUndo,
  IconWand,
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
  /** Letter key while tool menu (T) is open — v4 Logic accelerators. */
  key: string;
  Icon: typeof IconPointer;
  disabled?: boolean;
}[] = [
  {
    id: "pointer",
    label: "Pointer",
    title: "Pointer — zaznacz, przesuń, zmień długość",
    key: "t",
    Icon: IconPointer,
  },
  {
    id: "smart",
    label: "Smart",
    title: "Smart Tool — strefy move / trim (jak Pointer)",
    key: "s",
    Icon: IconSmart,
  },
  {
    id: "pencil",
    label: "Pencil",
    title: "Pencil — klik: 1 takt; przeciągnij: zakres (nadpisz)",
    key: "p",
    Icon: IconPencil,
  },
  {
    id: "eraser",
    label: "Eraser",
    title: "Eraser — usuń zaznaczony clip",
    key: "e",
    Icon: IconEraser,
  },
  {
    id: "scissors",
    label: "Scissors",
    title:
      "Scissors — Forma: podsekcja; Tekst/Akordy/Cue: podział; Tempo/Tonacja/Metrum: zmiana mapy",
    key: "c",
    Icon: IconScissors,
  },
  {
    id: "wand",
    label: "Różdżka",
    title:
      "Różdżka — Tekst / Akordy → Forma (zaznaczenie sekcji = zakres; bez — cały utwór)",
    key: "w",
    Icon: IconWand,
  },
];

const TOOL_BY_KEY = Object.fromEntries(TOOLS.map((t) => [t.key, t]));

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
    seek,
    setLoop,
  } = useTransport();
  const wasPlayingRef = useRef(state.playing);
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
  const [toolMenu, setToolMenu] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [wandMenu, setWandMenu] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const wandMenuRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
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
  const [zoomV, setZoomV] = useState(DEFAULT_LANE_PX);
  const [zoomUi, setZoomUi] = useState(100);
  const [laneHeights, setLaneHeights] = useState<LaneHeightsMap>(() =>
    loadLaneHeights(),
  );
  const [laneResizeTrackId, setLaneResizeTrackId] = useState<string | null>(
    null,
  );
  const laneResizeRef = useRef<{
    trackId: string;
    startY: number;
    startHeightBase: number;
    pointerId: number;
  } | null>(null);
  const laneHeightsRef = useRef(laneHeights);
  laneHeightsRef.current = laneHeights;
  const uiScale = zoomUi / 100;
  /** v4 effectivePxPerBar / lane × UI scale. */
  const effectiveZoomH = zoomH * uiScale;
  const effectiveZoomV = Math.max(1, Math.round(zoomV * uiScale));
  /** Match v4 `ZOOM_H_STEP` / slider bounds on status zoom H. */
  const ZOOM_H_STEP = 4;
  const ZOOM_H_MIN = 24;
  const ZOOM_H_MAX = 160;
  const ZOOM_V_STEP = 4;
  const ZOOM_V_MIN = MIN_LANE_PX;
  const ZOOM_V_MAX = MAX_LANE_PX;
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
  const [touchAlertOpen, setTouchAlertOpen] = useState(false);
  const metroBeatRef = useRef(0);
  const loopDragRef = useRef<{
    pointerId: number;
    originTicks: number;
    originClientX: number;
    /** Ruler empty area vs locator handle (v4 click-in-loop toggles only on ruler). */
    source: "ruler" | "locator";
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
  const [trackVisibility, setTrackVisibility] = useState<TrackVisibilityMap>(() => defaultTrackVisibility());
  const [eyeOpen, setEyeOpen] = useState(false);
  const [locatorTicks, setLocatorTicks] = useState(0);
  /** Forma/content multi-select (v4 selectedIds + primaryId). */
  const [clipSelection, setClipSelection] =
    useState<ClipSelection>(EMPTY_CLIP_SELECTION);
  const primaryId = clipSelection.primaryId;
  const selectionLane = primaryLane(clipSelection);
  const selectedClipId = selectionLane === "forma" ? primaryId : null;
  const selectedTekstClipId = selectionLane === "tekst" ? primaryId : null;
  const selectedAkordClipId = selectionLane === "akordy" ? primaryId : null;
  const selectedCueClipId = selectionLane === "cue" ? primaryId : null;
  const selectedAudioClipId = isAudioSelectionLane(selectionLane)
    ? primaryId
    : null;
  /** Forma subsection band index when a section clip is selected (v4 selectedSubsectionIdx). */
  const [selectedSubsectionIdx, setSelectedSubsectionIdx] = useState<
    number | null
  >(null);
  const clipboardRef = useRef<TimelineClipboard | null>(null);
  const marqueeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [canvasNotice, setCanvasNotice] = useState<string | null>(null);
  const canvasNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [gestureSession, setGestureSession] =
    useState<FormaGestureSession | null>(null);
  const [gesturePreview, setGesturePreview] =
    useState<FormaGesturePreview | null>(null);
  const gestureSessionRef = useRef<FormaGestureSession | null>(null);
  const gesturePreviewRef = useRef<FormaGesturePreview | null>(null);
  /** Last viewSpan.start while CD length gesture keeps tick-0 anchored. */
  const cdSpanStartRef = useRef<number | null>(null);
  /** After CD-length gesture ends → jump viewport to timeline start. */
  const cdScrollToStartPendingRef = useRef(false);
  const draftRef = useRef<Project | null>(null);
  const viewSpanRef = useRef({ start: 0, end: 0 });
  const barTicksRef = useRef(3840);
  const zoomHRef = useRef(DEFAULT_PX_PER_BAR);
  const zoomHBaseRef = useRef(DEFAULT_PX_PER_BAR);
  const zoomVBaseRef = useRef(DEFAULT_LANE_PX);
  const uiScaleRef = useRef(1);
  const keyHandlersRef = useRef({
    onSave: async () => {},
    onDiscard: () => {},
    onUndo: () => {},
    onRedo: () => {},
    onPlayOrPause: () => {},
    onMetronomeToggle: async () => {},
    onLoopToggle: () => {},
    onTool: (id: ToolId) => {
      void id;
    },
    nudgeLocator: (dir: -1 | 1) => {
      void dir;
    },
    fitZoom: () => {},
    zoomHorizontalBySteps: (steps: number, anchorViewportX?: number) => {
      void steps;
      void anchorViewportX;
    },
    zoomVerticalBySteps: (steps: number) => {
      void steps;
    },
    dirty: false,
    savePending: false,
    playing: false,
    tool: "pointer" as ToolId,
    prevSetlistId: null as string | null,
    nextSetlistId: null as string | null,
  });

  const reloadProject = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const project = await fetchProject(id);
      await loadTransport(id);
      setSavedProject(project);
      setDraftProject(project);
      setDraftHistory(createDraftHistory(project));
      setTrackVisibility(
        ensureAudioTrackVisibility(
          defaultTrackVisibility(project.audioTracks),
          project.audioTracks,
        ),
      );
      clearAudioBufferCache(id);
      const first = project.forma.clips[0]?.id ?? null;
      setClipSelection(
        first ? selectSingle(first, "forma") : clearSelection(),
      );
      setSelectedSubsectionIdx(null);
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
    setTrackVisibility((prev) =>
      ensureAudioTrackVisibility(prev, next.audioTracks),
    );
    setDraftHistory((h) =>
      h ? pushDraftHistory(h, next) : createDraftHistory(next),
    );
  }, []);

  const clearClipSelection = useCallback(() => {
    setClipSelection(clearSelection());
    setSelectedSubsectionIdx(null);
  }, []);

  const selectLaneClip = useCallback(
    (lane: ClipSelectionLane, id: string) => {
      setClipSelection(selectSingle(id, lane));
      if (lane !== "forma") setSelectedSubsectionIdx(null);
      setSelectedAnchorId(null);
      setSongMetaOpen(false);
    },
    [],
  );

  const clearMapSelection = useCallback(() => {
    setSelectedMapIds([]);
    setSelectedMapLane(null);
    setPrimaryMapId(null);
  }, []);

  const setMapSelection = useCallback(
    (lane: MapLaneId, ids: string[], mapPrimaryId: string | null) => {
      setSelectedMapLane(lane);
      setSelectedMapIds(ids);
      setPrimaryMapId(mapPrimaryId);
      clearClipSelection();
      setSelectedAnchorId(null);
      setSongMetaOpen(false);
    },
    [clearClipSelection],
  );

  useEffect(() => {
    if (!projectId) return;
    void reloadProject(projectId);
  }, [projectId, reloadProject]);

  useEffect(() => {
    if (!projectId) return;
    const name = draftProject?.name ?? projectId;
    const recent = pushRecentTimelineProject(projectId, name);
    void syncNavTimelineProjectId(projectId);
    void syncNavRecentProjects(recent);
  }, [projectId, draftProject?.name]);

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
    if (!clipSelection.items.length) return;
    let next = draft;
    const lanes = [
      ...new Set(clipSelection.items.map((i) => i.lane)),
    ] as ClipSelectionLane[];
    for (const lane of lanes) {
      const ids = idsOnLane(clipSelection, lane);
      if (!ids.length) continue;
      if (lane === "forma") {
        const hasCountdown = ids.some((id) => {
          const c = next.forma.clips.find((x) => x.id === id);
          return c?.kind === "countdown";
        });
        if (hasCountdown && ids.length === 1 && clipSelection.items.length === 1) {
          return;
        }
        const filtered = ids.filter((id) => {
          const c = next.forma.clips.find((x) => x.id === id);
          return c && c.kind !== "countdown";
        });
        if (!filtered.length) continue;
        next = deleteClipsOnLane(next, "forma", filtered);
      } else {
        next = deleteClipsOnLane(next, lane, ids);
      }
    }
    if (next !== draft) commitDraft(next);
    clearClipSelection();
  }, [
    clearClipSelection,
    clearMapSelection,
    clipSelection,
    commitDraft,
    selectedMapIds,
    selectedMapLane,
  ]);

  const copyClipSelection = useCallback((): boolean => {
    const draft = draftRef.current;
    if (!draft || !clipSelection.items.length) return false;
    // Clipboard is single-lane (v4 paste same kind) — copy primary lane subset.
    const lane = primaryLane(clipSelection);
    if (!lane || isAudioSelectionLane(lane)) return false;
    const idSet = new Set(idsOnLane(clipSelection, lane));
    let clips: Parameters<typeof buildClipboardFromClips>[1] = [];
    if (lane === "forma") {
      clips = draft.forma.clips.filter(
        (c) => idSet.has(c.id) && c.kind === "section",
      );
    } else if (lane === "tekst") {
      clips = draft.tekst.clips.filter((c) => idSet.has(c.id));
    } else if (lane === "akordy") {
      clips = draft.akordy.clips.filter((c) => idSet.has(c.id));
    } else if (lane === "cue") {
      clips = draft.cue.clips.filter((c) => idSet.has(c.id));
    } else {
      return false;
    }
    const board = buildClipboardFromClips(lane, clips);
    if (!board) return false;
    clipboardRef.current = board;
    return true;
  }, [clipSelection]);

  const pasteClipClipboard = useCallback(
    (anchorTicks: number): boolean => {
      const draft = draftRef.current;
      const board = clipboardRef.current;
      if (!draft || !board) return false;
      const result = pasteClipboardAt(draft, board, anchorTicks);
      if (!result) return false;
      commitDraft(result.project);
      setClipSelection(
        setSelection(
          result.newIds.map((id) => ({ id, lane: board.lane })),
          result.newIds[result.newIds.length - 1]!,
        ),
      );
      setSelectedSubsectionIdx(null);
      clearMapSelection();
      setSelectedAnchorId(null);
      const maxEnd = selectionMaxEndTicks(
        board.items.map((it, i) => ({
          id: result.newIds[i] ?? `n${i}`,
          startTicks:
            anchorTicks + (it.startTicks - board.items[0]!.startTicks),
          lengthTicks: it.lengthTicks,
        })),
      );
      setLocatorTicks(Math.max(0, maxEnd));
      return true;
    },
    [clearMapSelection, commitDraft],
  );

  const duplicateClipSelection = useCallback((): boolean => {
    const draft = draftRef.current;
    const lane = primaryLane(clipSelection);
    if (!draft || !lane || !clipSelection.items.length) return false;
    if (!copyClipSelection()) return false;
    const idSet = new Set(idsOnLane(clipSelection, lane));
    const clips =
      lane === "forma"
        ? draft.forma.clips.filter((c) => idSet.has(c.id) && c.kind === "section")
        : lane === "tekst"
          ? draft.tekst.clips.filter((c) => idSet.has(c.id))
          : lane === "akordy"
            ? draft.akordy.clips.filter((c) => idSet.has(c.id))
            : draft.cue.clips.filter((c) => idSet.has(c.id));
    return pasteClipClipboard(selectionMaxEndTicks(clips));
  }, [clipSelection, copyClipSelection, pasteClipClipboard]);

  const cutClipSelection = useCallback((): boolean => {
    if (!copyClipSelection()) return false;
    deleteSelectedFormaClip();
    return true;
  }, [copyClipSelection, deleteSelectedFormaClip]);

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
      const h = keyHandlersRef.current;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (helpOpen && e.key === "Escape") {
        e.preventDefault();
        setHelpOpen(false);
        return;
      }
      if (
        !mod &&
        !e.altKey &&
        (e.key === "?" || (e.shiftKey && e.key === "/"))
      ) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      if (mod && key === "s") {
        e.preventDefault();
        if (h.dirty && !h.savePending) void h.onSave();
        return;
      }
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) h.onRedo();
        else h.onUndo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        h.onRedo();
        return;
      }
      if (mod && !e.altKey && key === "c") {
        e.preventDefault();
        copyClipSelection();
        return;
      }
      if (mod && !e.altKey && key === "x") {
        e.preventDefault();
        cutClipSelection();
        return;
      }
      if (mod && !e.altKey && key === "v") {
        e.preventDefault();
        pasteClipClipboard(locatorTicks);
        return;
      }
      if (mod && !e.altKey && key === "d") {
        e.preventDefault();
        duplicateClipSelection();
        return;
      }
      if (mod && !e.altKey) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          h.zoomHorizontalBySteps(-1);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          h.zoomHorizontalBySteps(1);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          h.zoomVerticalBySteps(1);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          h.zoomVerticalBySteps(-1);
          return;
        }
      }
      if (!mod && !e.altKey && (e.key === " " || e.code === "Space")) {
        e.preventDefault();
        h.onPlayOrPause();
        return;
      }
      if (!mod && !e.altKey && key === "t") {
        e.preventDefault();
        if (toolMenu) {
          setToolMenu(null);
          return;
        }
        const pt = lastPointerRef.current;
        openToolMenuAt(
          pt.x || window.innerWidth / 2,
          pt.y || window.innerHeight / 2,
        );
        return;
      }
      if (toolMenu && !mod) {
        if (e.key === "Escape") {
          e.preventDefault();
          setToolMenu(null);
          return;
        }
        const pick = TOOL_BY_KEY[key];
        if (pick && !pick.disabled) {
          e.preventDefault();
          onTool(pick.id);
          return;
        }
      }
      if (!mod && !e.altKey && key === "c") {
        e.preventDefault();
        h.onLoopToggle();
        return;
      }
      if (!mod && !e.altKey && key === "k") {
        e.preventDefault();
        void h.onMetronomeToggle();
        return;
      }
      if (!mod && !e.altKey && key === "z") {
        e.preventDefault();
        h.fitZoom();
        return;
      }
      if (!mod && !e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        h.nudgeLocator(e.key === "ArrowLeft" ? -1 : 1);
        return;
      }
      if (
        !mod &&
        e.altKey &&
        !e.shiftKey &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        const id =
          e.key === "ArrowRight" ? h.nextSetlistId : h.prevSetlistId;
        if (id) {
          e.preventDefault();
          navigate(`/timeline/${id}`);
        }
        return;
      }
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      e.preventDefault();
      deleteSelectedFormaClip();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    copyClipSelection,
    cutClipSelection,
    deleteSelectedFormaClip,
    duplicateClipSelection,
    locatorTicks,
    navigate,
    pasteClipClipboard,
    helpOpen,
    toolMenu,
  ]);

  useEffect(() => {
    const scrollEl = document.querySelector(
      "[data-canvas-scroll]",
    ) as HTMLElement | null;
    if (!scrollEl) return;

    function onWheel(e: WheelEvent) {
      const t = document.activeElement as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      const h = keyHandlersRef.current;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const steps = e.deltaY < 0 ? 1 : e.deltaY > 0 ? -1 : 0;
        const rect = scrollEl!.getBoundingClientRect();
        h.zoomHorizontalBySteps(steps, e.clientX - rect.left);
        return;
      }
      if (e.altKey) {
        e.preventDefault();
        const useHorizontal =
          e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
        if (useHorizontal) {
          const delta =
            Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          const steps = delta < 0 ? 1 : delta > 0 ? -1 : 0;
          const rect = scrollEl!.getBoundingClientRect();
          h.zoomHorizontalBySteps(steps, e.clientX - rect.left);
        } else {
          const steps = e.deltaY < 0 ? 1 : e.deltaY > 0 ? -1 : 0;
          h.zoomVerticalBySteps(steps);
        }
        return;
      }
      if (
        e.shiftKey &&
        Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
        e.deltaY !== 0
      ) {
        e.preventDefault();
        scrollEl!.scrollLeft += e.deltaY;
      }
    }

    scrollEl.addEventListener("wheel", onWheel, { passive: false });
    return () => scrollEl.removeEventListener("wheel", onWheel);
  }, [projectId, draftProject]);

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

  const viewSpan = useMemo(() => {
    const clips = draftProject?.forma.clips ?? [];
    if (
      gesturePreview?.kind === "countdown-length" &&
      gesturePreview.clipId
    ) {
      return computeFormaViewSpan(
        clips.map((c) =>
          c.id === gesturePreview.clipId
            ? {
                ...c,
                startTicks: gesturePreview.startTicks,
                lengthTicks: gesturePreview.lengthTicks,
              }
            : c,
        ),
      );
    }
    return computeFormaViewSpan(clips);
  }, [draftProject?.forma.clips, gesturePreview]);

  const barTicks = draftProject
    ? ticksPerBar(draftProject.defaultMeter, draftProject.ppq)
    : ticksPerBar({ numerator: 4, denominator: 4 }, 960);

  viewSpanRef.current = viewSpan;
  barTicksRef.current = barTicks;
  zoomHRef.current = effectiveZoomH;
  zoomHBaseRef.current = zoomH;
  zoomVBaseRef.current = zoomV;
  uiScaleRef.current = uiScale;

  // Countdown length drag: scroll to timeline start so new CD bars stay visible.
  // Length delta uses clientX→ticks (not abs tick under cursor) so drag stays stable.
  // After release / inspector: jump to start again if needed.
  useLayoutEffect(() => {
    const cdGesture =
      gestureSessionRef.current?.kind === "countdown-length" ||
      gesturePreview?.kind === "countdown-length";
    if (cdGesture) {
      cdScrollToStartPendingRef.current = true;
      cdSpanStartRef.current = viewSpan.start;
      scrollCanvasToStart(
        document.querySelector("[data-canvas-scroll]") as HTMLElement | null,
      );
      return;
    }
    if (cdSpanStartRef.current != null || cdScrollToStartPendingRef.current) {
      cdSpanStartRef.current = null;
      if (cdScrollToStartPendingRef.current) {
        cdScrollToStartPendingRef.current = false;
        scrollCanvasToStart(
          document.querySelector("[data-canvas-scroll]") as HTMLElement | null,
        );
      }
    }
  }, [viewSpan.start, gesturePreview?.kind, barTicks, effectiveZoomH]);

  const canvasWidthPx = useMemo(
    () => computeCanvasWidthPx(viewSpan, barTicks, effectiveZoomH),
    [viewSpan, barTicks, effectiveZoomH],
  );

  const barMarks = useMemo(() => {
    if (!draftProject) return [];
    return buildBarMarks(viewSpan, draftProject);
  }, [draftProject, viewSpan]);

  const rulerBeatMarks = useMemo(() => {
    if (!draftProject) return [];
    return buildRulerBeatMarks(viewSpan, draftProject, effectiveZoomH);
  }, [draftProject, viewSpan, effectiveZoomH]);

  const playheadPx = tickToPx(displayTicks, viewSpan, barTicks, effectiveZoomH);

  const effectiveLocatorTicks = state.playing ? displayTicks : locatorTicks;
  const locatorPx = tickToPx(effectiveLocatorTicks, viewSpan, barTicks, effectiveZoomH);
  const locatorMeter = draftProject
    ? resolveMeterAt(draftProject, effectiveLocatorTicks)
    : state.timeSignature;
  const locatorBbt = ticksToBbt(
    effectiveLocatorTicks,
    locatorMeter,
    draftProject?.ppq ?? state.ppq,
  );
  const locatorLabel = `${toDisplayBar(locatorBbt.bar)}.${locatorBbt.beat}`;
  // v4: cyan MIDI overlay only when external clock is live and Timeline is not the
  // transport source. Alpha: server Timeline owns play → no separate MIDI overlay (β2).
  const showMidiPlayhead = false;

  // Follow playhead: continuous center (v4 scrollFollowToX) while playing — not edge-only.
  useEffect(() => {
    if (!followPlayhead || !state.playing) return;
    const scrollEl = document.querySelector<HTMLElement>(
      "[data-canvas-scroll]",
    );
    if (!scrollEl) return;
    const viewW = scrollEl.clientWidth;
    if (viewW <= 0) return;
    const maxScroll = Math.max(0, scrollEl.scrollWidth - viewW);
    scrollEl.scrollLeft = Math.max(
      0,
      Math.min(maxScroll, playheadPx - viewW / 2),
    );
  }, [followPlayhead, playheadPx, state.playing]);

  // After pause/stop: yellow locator stays at last transport position (v4).
  useEffect(() => {
    if (wasPlayingRef.current && !state.playing) {
      setLocatorTicks(state.positionTicks);
    }
    wasPlayingRef.current = state.playing;
  }, [state.playing, state.positionTicks]);

  const loopOn = Boolean(state.loop?.enabled);
  const loopRange =
    loopDraft ?? usableLoopRange(state.loop);

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
  const selectedAudioClip =
    draftProject && selectedAudioClipId
      ? draftProject.audioClips.find((c) => c.id === selectedAudioClipId) ?? null
      : null;
  const selectedAudioTrack =
    draftProject && selectedAudioClip
      ? draftProject.audioTracks.find((tr) => tr.id === selectedAudioClip.trackId) ??
        null
      : null;
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

  // WebAudio clip playback — sync to server ticks (ADR 0008 / 0002).
  useEffect(() => {
    if (!projectId || !draftProject) {
      stopAudioPlayback();
      return;
    }
    const input = {
      project: draftProject,
      playing: state.playing,
      displayTicks,
    };
    if (!state.playing) {
      stopAudioPlayback();
      return;
    }
    syncAudioPlayback(projectId, input);
  }, [
    projectId,
    draftProject,
    state.playing,
    displayTicks,
  ]);

  useEffect(() => {
    return () => stopAudioPlayback();
  }, []);

  const audioAssetDecodeKey =
    draftProject?.assets
      .filter((a) => a.kind === "audio")
      .map((a) => `${a.id}:${a.durationMs ?? 0}:${a.waveformPeaks?.length ?? 0}`)
      .join("|") ?? "";

  // Decode assets missing duration/peaks (on-demand waveform).
  useEffect(() => {
    if (!projectId || !draftProject) return;
    let cancelled = false;
    const missing = draftProject.assets.filter(
      (a) =>
        a.kind === "audio" &&
        (a.durationMs == null || !a.waveformPeaks?.length),
    );
    if (!missing.length) return;
    const snapshot = draftProject;
    void (async () => {
      let project = snapshot;
      let changed = false;
      for (const asset of missing) {
        if (cancelled) return;
        const buf = await loadAudioBuffer(projectId, asset.id);
        if (!buf || cancelled) continue;
        const meta = computeWaveformFromAudioBuffer(buf);
        project = applyDecodedAudioMeta(project, asset.id, {
          durationMs: meta.durationMs,
          waveformPeaks: meta.peaks,
          waveformRms: meta.rms,
        });
        changed = true;
      }
      if (cancelled || !changed) return;
      setDraftProject(project);
      setTrackVisibility((prev) =>
        ensureAudioTrackVisibility(prev, project.audioTracks),
      );
    })();
    return () => {
      cancelled = true;
    };
    // audioAssetDecodeKey tracks which audio assets still need meta.
  }, [projectId, audioAssetDecodeKey, draftProject]);

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

  useEffect(() => {
    function onMenu(ev: Event) {
      const detail = parseDesktopMenuDetail(ev);
      if (detail?.action !== "save") return;
      const h = keyHandlersRef.current;
      if (h.dirty && !h.savePending) void h.onSave();
    }
    window.addEventListener(DESKTOP_MENU_EVENT, onMenu);
    return () => window.removeEventListener(DESKTOP_MENU_EVENT, onMenu);
  }, []);

  function onDiscard() {
    if (!savedProject) {
      if (projectId) void reloadProject(projectId);
      return;
    }
    setDraftProject(savedProject);
    setDraftHistory(resetDraftHistory(savedProject));
    clearClipSelection();
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
    if (projectId && draftProject) {
      restartAudioPlayback(projectId, {
        project: draftProject,
        playing: true,
        displayTicks: locatorTicks,
      });
    }
    const startTicks = locatorTicks;
    metroBeatRef.current = metronomeBeatIndex(
      startTicks,
      state.timeSignature,
      state.ppq,
    );
    // v4: play from locator bar/beat — seek SSOT then play.
    if (startTicks !== state.positionTicks) {
      await seek(startTicks);
    }
    await play({ projectId });
  }

  async function onStopClick() {
    await stop();
    // Match server home (Countdown start / pre-roll), not tick 0 past CD (#41).
    setLocatorTicks(transportHomeTicks(draftRef.current));
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
    if (isAudioLaneId(lane)) {
      const preview = previewAudioFromSession(
        draft,
        session,
        rawTicks,
        metaKey,
        ctrlKey,
      );
      gesturePreviewRef.current = preview;
      setGesturePreview(preview);
      return;
    }
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
      zoomHRef.current,
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

    // Alt/⌥+drag: copy at drop (v4 optionCopy) — originals stay.
    if (
      session.optionCopy &&
      session.kind === "move" &&
      session.clipId &&
      preview.startTicks !== session.originClipStart
    ) {
      if (isAudioLaneId(lane)) return;
      const moveIds = session.moveIds?.length
        ? session.moveIds
        : [session.clipId];
      const idSet = new Set(moveIds);
      const clips =
        lane === "forma"
          ? draft.forma.clips.filter(
              (c) => idSet.has(c.id) && c.kind === "section",
            )
          : lane === "tekst"
            ? draft.tekst.clips.filter((c) => idSet.has(c.id))
            : lane === "akordy"
              ? draft.akordy.clips.filter((c) => idSet.has(c.id))
              : draft.cue.clips.filter((c) => idSet.has(c.id));
      const board = buildClipboardFromClips(lane, clips);
      if (!board) return;
      const delta = preview.startTicks - session.originClipStart;
      const result = pasteClipboardWithDelta(draft, board, delta);
      if (!result) return;
      commitDraft(result.project);
      if (result.newIds.length) {
        setClipSelection(
          setSelection(
            result.newIds.map((id) => ({ id, lane })),
            result.newIds[0]!,
          ),
        );
      }
      return;
    }

    if (isAudioLaneId(lane)) {
      const next = commitAudioGesture(
        draft,
        lane,
        session,
        preview,
        metaKey,
        ctrlKey,
      );
      commitDraft(next);
      if (session.kind === "move" && session.moveIds?.length) {
        setClipSelection((prev) =>
          setSelection(
            [
              ...prev.items.filter((i) => i.lane !== lane),
              ...session.moveIds!.map((id) => ({ id, lane })),
            ],
            session.clipId,
          ),
        );
        return;
      }
      if (session.clipId) selectLaneClip(lane, session.clipId);
      return;
    }

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
        if (created?.id) selectLaneClip(lane, created.id);
        else clearClipSelection();
        return;
      }
      if (session.kind === "move" && session.moveIds?.length) {
        setClipSelection((prev) =>
          setSelection(
            [
              ...prev.items.filter((i) => i.lane !== lane),
              ...session.moveIds!.map((id) => ({ id, lane })),
            ],
            session.clipId,
          ),
        );
        return;
      }
      if (session.clipId) {
        selectLaneClip(lane, session.clipId);
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
        selectLaneClip("forma", created.id);
      }
    } else if (session.kind === "subsection-boundary" && session.clipId) {
      selectLaneClip("forma", session.clipId);
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
    } else if (session.kind === "move" && session.moveIds?.length) {
      setClipSelection((prev) =>
        setSelection(
          [
            ...prev.items.filter((i) => i.lane !== "forma"),
            ...session.moveIds!.map((id) => ({ id, lane: "forma" as const })),
          ],
          session.clipId,
        ),
      );
    } else if (session.clipId) {
      selectLaneClip("forma", session.clipId);
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
      setTouchAlertOpen(true);
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
      } else if (lane === "akordy") {
        commitDraft(deleteAkordyClip(draftProject, clip.id));
      } else {
        commitDraft(deleteCueClip(draftProject, clip.id));
      }
      setClipSelection((prev) =>
        isClipSelected(prev, clip.id, lane)
          ? toggleSelected(prev, clip.id, lane)
          : prev,
      );
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
    // Multi-select modifiers (v4 Cmd toggle / Shift range)
    if (isMultiSelectClick(e)) {
      clearMapSelection();
      setSelectedAnchorId(null);
      setSongMetaOpen(false);
      setClipSelection((prev) => toggleSelected(prev, clip.id, lane));
      setSelectedSubsectionIdx(null);
      return;
    }
    if (e.shiftKey) {
      clearMapSelection();
      setSelectedAnchorId(null);
      setSongMetaOpen(false);
      const laneClips =
        lane === "tekst"
          ? draftProject.tekst.clips
          : lane === "akordy"
            ? draftProject.akordy.clips
            : draftProject.cue.clips;
      setClipSelection((prev) => selectRangeTo(prev, clip.id, lane, laneClips));
      setSelectedSubsectionIdx(null);
      return;
    }

    if (!gesturePolicy.clipDragResize) {
      // Tablet/mobile: select only (v4 — drag via nudge on tablet).
      clearMapSelection();
      selectLaneClip(lane, clip.id);
      return;
    }

    const onLaneIds = idsOnLane(clipSelection, lane);
    const inMulti =
      isClipSelected(clipSelection, clip.id, lane) && onLaneIds.length > 1;
    if (!inMulti) {
      clearMapSelection();
      selectLaneClip(lane, clip.id);
    } else {
      setClipSelection((prev) => setSelection(prev.items, clip.id));
      setSelectedSubsectionIdx(null);
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
    const moveIds =
      kind === "move"
        ? inMulti
          ? resolveMoveIds(clipSelection, clip.id, lane)
          : [clip.id]
        : [clip.id];
    const session: FormaGestureSession = {
      kind,
      clipId: clip.id,
      pointerId: e.pointerId,
      originTicks: raw,
      originClipStart: clip.startTicks,
      originClipLength: clip.lengthTicks,
      lane,
      originClientX: e.clientX,
      moveIds: kind === "move" ? moveIds : undefined,
      optionCopy: kind === "move" ? Boolean(e.altKey) : undefined,
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

  
  function onAudioClipPointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    lane: AudioLaneId,
    clip: { id: string; startTicks: number; lengthTicks: number },
  ) {
    if (e.button !== 0 || !draftProject) return;
    e.preventDefault();
    e.stopPropagation();
    if (tool === "eraser") {
      commitDraft(deleteClipsOnLane(draftProject, lane, [clip.id]));
      setClipSelection((prev) =>
        isClipSelected(prev, clip.id, lane)
          ? toggleSelected(prev, clip.id, lane)
          : prev,
      );
      return;
    }
    if (toolIsPencilDraw(tool) || tool === "scissors") return;
    if (!toolAllowsClipHitZones(tool)) return;
    if (isMultiSelectClick(e)) {
      clearMapSelection();
      setSelectedAnchorId(null);
      setSongMetaOpen(false);
      setClipSelection((prev) => toggleSelected(prev, clip.id, lane));
      return;
    }
    if (e.shiftKey) {
      clearMapSelection();
      setSelectedAnchorId(null);
      setSongMetaOpen(false);
      const trackId = audioTrackIdFromLane(lane);
      const laneClips = draftProject.audioClips.filter((c) => c.trackId === trackId);
      setClipSelection((prev) => selectRangeTo(prev, clip.id, lane, laneClips));
      return;
    }
    if (!gesturePolicy.clipDragResize) {
      clearMapSelection();
      selectLaneClip(lane, clip.id);
      return;
    }
    const onLaneIds = idsOnLane(clipSelection, lane);
    const inMulti =
      isClipSelected(clipSelection, clip.id, lane) && onLaneIds.length > 1;
    if (!inMulti) {
      clearMapSelection();
      selectLaneClip(lane, clip.id);
    } else {
      setClipSelection((prev) => setSelection(prev.items, clip.id));
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const zone = hitTestClipZone(e.clientX - rect.left, rect.width, true);
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const kind =
      zone === "start" ? "resize-start" : zone === "end" ? "resize-end" : "move";
    const moveIds =
      kind === "move"
        ? inMulti
          ? resolveMoveIds(clipSelection, clip.id, lane)
          : [clip.id]
        : [clip.id];
    const session: FormaGestureSession = {
      kind,
      clipId: clip.id,
      pointerId: e.pointerId,
      originTicks: raw,
      originClipStart: clip.startTicks,
      originClipLength: clip.lengthTicks,
      lane,
      originClientX: e.clientX,
      moveIds: kind === "move" ? moveIds : undefined,
    };
    beginFormaGesture(
      session,
      previewAudioFromSession(draftProject, session, raw, e.metaKey, e.ctrlKey),
    );
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
        beginMarquee(e);
      }
      return;
    }
    if (!gesturePolicy.pencilDraw) {
      setTouchAlertOpen(true);
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
      setClipSelection((prev) =>
        isClipSelected(prev, clip.id, "forma")
          ? toggleSelected(prev, clip.id, "forma")
          : prev,
      );
      return;
    }

    if (tool === "scissors") {
      if (clip.kind === "countdown") return;
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      clearMapSelection();
      selectLaneClip("forma", clip.id);
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

    // Multi-select modifiers (v4)
    if (clip.kind !== "countdown" && isMultiSelectClick(e)) {
      clearMapSelection();
      setSelectedAnchorId(null);
      setSongMetaOpen(false);
      setClipSelection((prev) => toggleSelected(prev, clip.id, "forma"));
      setSelectedSubsectionIdx(null);
      return;
    }
    if (clip.kind !== "countdown" && e.shiftKey) {
      clearMapSelection();
      setSelectedAnchorId(null);
      setSongMetaOpen(false);
      const laneClips = draftProject.forma.clips
        .filter((c) => c.kind === "section" || c.kind === "countdown")
        .map((c) => ({ id: c.id, startTicks: c.startTicks }));
      setClipSelection((prev) =>
        selectRangeTo(prev, clip.id, "forma", laneClips),
      );
      setSelectedSubsectionIdx(null);
      return;
    }

    const onLaneIds = idsOnLane(clipSelection, "forma");
    const inMulti =
      clip.kind !== "countdown" &&
      isClipSelected(clipSelection, clip.id, "forma") &&
      onLaneIds.length > 1;

    if (!inMulti) {
      clearMapSelection();
      selectLaneClip("forma", clip.id);
    } else {
      setClipSelection((prev) => setSelection(prev.items, clip.id));
    }
    setSongMetaOpen(false);
    if (clip.kind === "countdown") {
      setSelectedSubsectionIdx(null);
      if (!gesturePolicy.clipDragResize) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const zone = hitTestClipZone(localX, rect.width, true);
      if (zone === "start") {
        if (canvasNoticeTimerRef.current) {
          clearTimeout(canvasNoticeTimerRef.current);
        }
        setCanvasNotice(
          "Countdown: tylko prawa krawędź lub przeciągnięcie (długość)",
        );
        canvasNoticeTimerRef.current = setTimeout(() => {
          setCanvasNotice(null);
          canvasNoticeTimerRef.current = null;
        }, 2800);
        return;
      }
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const session: FormaGestureSession = {
        kind: "countdown-length",
        clipId: clip.id,
        pointerId: e.pointerId,
        originTicks: raw,
        originClipStart: clip.startTicks,
        originClipLength: clip.lengthTicks,
        originClientX: e.clientX,
      };
      const preview = previewFromSession(
        draftProject,
        session,
        raw,
        e.metaKey,
        e.ctrlKey,
        undefined,
        e.clientX,
        effectiveZoomH,
      );
      beginFormaGesture(session, preview);
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
    const moveIds =
      kind === "move"
        ? inMulti
          ? resolveMoveIds(clipSelection, clip.id, "forma")
          : [clip.id]
        : [clip.id];
    const session: FormaGestureSession = {
      kind,
      clipId: clip.id,
      pointerId: e.pointerId,
      originTicks: raw,
      originClipStart: clip.startTicks,
      originClipLength: clip.lengthTicks,
      moveIds: kind === "move" ? moveIds : undefined,
      optionCopy: kind === "move" ? Boolean(e.altKey) : undefined,
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

  function clientToCanvasLocal(clientX: number, clientY: number) {
    const root = lanesCoordRef.current;
    if (!root) return { x: 0, y: 0 };
    const rect = root.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function updateMarqueeBoxFromPointer(clientX: number, clientY: number) {
    const drag = marqueeRef.current;
    if (!drag) return;
    drag.currentX = clientX;
    drag.currentY = clientY;
    const a = clientToCanvasLocal(drag.startX, drag.startY);
    const b = clientToCanvasLocal(clientX, clientY);
    setMarqueeBox({
      left: Math.min(a.x, b.x),
      top: Math.min(a.y, b.y),
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y),
    });
  }

  function finishMarquee(clientX: number, clientY: number) {
    const drag = marqueeRef.current;
    marqueeRef.current = null;
    setMarqueeBox(null);
    if (!drag) return;
    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;
    if (isMarqueeClick(dx, dy)) {
      clearClipSelection();
      clearMapSelection();
      setSelectedAnchorId(null);
      setLocatorFromClientX(clientX, { seekTransport: true });
      return;
    }
    const a = clientToCanvasLocal(drag.startX, drag.startY);
    const b = clientToCanvasLocal(clientX, clientY);
    const box = {
      left: Math.min(a.x, b.x),
      right: Math.max(a.x, b.x),
      top: Math.min(a.y, b.y),
      bottom: Math.max(a.y, b.y),
    };
    const overlay = lanesCoordRef.current;
    const root = overlay?.parentElement;
    if (!overlay || !root) {
      clearClipSelection();
      return;
    }
    const rootRect = overlay.getBoundingClientRect();
    const viewportBox = {
      left: rootRect.left + box.left,
      right: rootRect.left + box.right,
      top: rootRect.top + box.top,
      bottom: rootRect.top + box.bottom,
    };
    const hits: { id: string; lane: ClipSelectionLane }[] = [];
    root
      .querySelectorAll<HTMLElement>("[data-clip-id][data-clip-lane]")
      .forEach((el) => {
        const id = el.dataset.clipId;
        const lane = el.dataset.clipLane as ClipSelectionLane | undefined;
        if (!id || !lane) return;
        if (
          lane !== "forma" &&
          lane !== "tekst" &&
          lane !== "akordy" &&
          lane !== "cue"
        ) {
          return;
        }
        const r = el.getBoundingClientRect();
        if (rectsIntersect(viewportBox, r)) {
          hits.push({ id, lane });
        }
      });
    clearMapSelection();
    setSelectedAnchorId(null);
    setSongMetaOpen(false);
    setSelectedSubsectionIdx(null);
    setClipSelection(marqueeSelectFromHits(hits));
  }

  function beginMarquee(e: React.PointerEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    marqueeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    };
    updateMarqueeBoxFromPointer(e.clientX, e.clientY);
  }

  useEffect(() => {
    if (!marqueeBox) return;
    function onMove(e: PointerEvent) {
      const drag = marqueeRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      updateMarqueeBoxFromPointer(e.clientX, e.clientY);
    }
    function onUp(e: PointerEvent) {
      const drag = marqueeRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      finishMarquee(e.clientX, e.clientY);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- marquee session gated by box
  }, [marqueeBox != null]);

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  useEffect(() => {
    if (!toolMenu) return;
    function onPointerDown(e: PointerEvent) {
      const el = toolMenuRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      setToolMenu(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [toolMenu]);

  useEffect(() => {
    if (!wandMenu) return;
    function onPointerDown(e: PointerEvent) {
      const el = wandMenuRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      setWandMenu(null);
      setTool((t) => (t === "wand" ? "pointer" : t));
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [wandMenu]);

  function placeLocatorAtTicks(
    ticks: number,
    opts?: {
      seekTransport?: boolean;
      metaKey?: boolean;
      ctrlKey?: boolean;
    },
  ) {
    if (!draftRef.current) return;
    const mode = mapSnapMode(opts?.metaKey ?? false, opts?.ctrlKey ?? false);
    const snapped = snapEditTicks(draftRef.current, ticks, mode);
    setLocatorTicks(snapped);
    if (opts?.seekTransport !== false) {
      void seek(snapped);
    }
  }

  function setLocatorFromClientX(
    clientX: number,
    opts?: {
      seekTransport?: boolean;
      metaKey?: boolean;
      ctrlKey?: boolean;
    },
  ) {
    const coordRoot = markerOverlayRef.current ?? lanesCoordRef.current;
    if (!coordRoot || !draftRef.current) return;
    const raw = ticksFromPointer(
      clientX,
      coordRoot,
      viewSpanRef.current,
      barTicksRef.current,
      zoomHRef.current,
    );
    placeLocatorAtTicks(raw, opts);
  }

  function onLocatorPointerDown(
    e: React.PointerEvent<HTMLElement>,
    source: "ruler" | "locator",
  ) {
    if (e.button !== 0) return;
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    loopDragRef.current = {
      pointerId: e.pointerId,
      originTicks: raw,
      originClientX: e.clientX,
      source,
    };
    setLoopDraft(null);
    // Immediate seek/scrub (v4); loop-select only after 5px drag on ruler.
    if (source === "locator" || !ticksInLoopRegion(raw, usableLoopRange(state.loop))) {
      setLocatorFromClientX(e.clientX, {
        seekTransport: true,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
      });
    }
  }

  function onLocatorPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const drag = loopDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) {
      setLocatorFromClientX(e.clientX, {
        seekTransport: true,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
      });
      return;
    }
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    const dx = Math.abs(e.clientX - drag.originClientX);
    if (dx >= 5 && draftProject) {
      const a = Math.min(drag.originTicks, raw);
      const b = Math.max(drag.originTicks, raw);
      // Live snap on preview (v4 feel); Cmd/Ctrl = off.
      const mode = contentSnapModeFromModifiers(e.metaKey, e.ctrlKey);
      setLoopDraft(snapLoopRange(draftProject, a, b, mode));
    } else if (dx < 5) {
      setLocatorFromClientX(e.clientX, {
        seekTransport: true,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
      });
    }
  }

  function onLocatorPointerUp(e: React.PointerEvent<HTMLElement>) {
    const drag = loopDragRef.current;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!drag || drag.pointerId !== e.pointerId) return;
    const draft = loopDraftRef.current;
    loopDragRef.current = null;
    if (draft && draft.endTicks > draft.startTicks && draftProject) {
      const snapped = snapLoopRange(
        draftProject,
        draft.startTicks,
        draft.endTicks,
        contentSnapModeFromModifiers(e.metaKey, e.ctrlKey),
      );
      void setLoop({
        enabled: true,
        startTicks: snapped.startTicks,
        endTicks: snapped.endTicks,
      }).finally(() => setLoopDraft(null));
      return;
    }
    setLoopDraft(null);
    // v4: click inside existing loop region on ruler toggles cycle on/off.
    if (
      drag.source === "ruler" &&
      ticksInLoopRegion(drag.originTicks, usableLoopRange(state.loop))
    ) {
      const range = usableLoopRange(state.loop);
      if (range) {
        void setLoop({ enabled: !state.loop?.enabled });
      }
      return;
    }
    setLocatorFromClientX(e.clientX, {
      seekTransport: true,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
    });
  }

  function onLoopToggle() {
    const range = usableLoopRange(state.loop);
    if (range) {
      void setLoop({ enabled: !state.loop?.enabled });
      return;
    }
    if (!draftProject) return;
    const end = projectEndTicks(draftProject);
    if (end <= 0) return;
    void setLoop({ enabled: true, startTicks: 0, endTicks: end });
  }

  function zoomHorizontalBySteps(
    steps: number,
    anchorViewportX?: number,
  ) {
    if (!steps) return;
    const scroll = document.querySelector(
      "[data-canvas-scroll]",
    ) as HTMLElement | null;
    const oldEff = zoomHRef.current;
    const nextBase = Math.min(
      ZOOM_H_MAX,
      Math.max(ZOOM_H_MIN, zoomHBaseRef.current + steps * ZOOM_H_STEP),
    );
    const newEff = nextBase * uiScaleRef.current;
    if (nextBase === zoomHBaseRef.current || !(oldEff > 0) || !(newEff > 0)) {
      return;
    }
    const ax =
      anchorViewportX != null
        ? anchorViewportX
        : (scroll?.clientWidth ?? 0) / 2;
    const prevScroll = scroll?.scrollLeft ?? 0;
    const newScroll = ((prevScroll + ax) * newEff) / oldEff - ax;
    setZoomH(nextBase);
    if (scroll) {
      requestAnimationFrame(() => {
        scroll.scrollLeft = Math.max(0, newScroll);
      });
    }
  }

  function setVerticalZoom(nextLanePx: number) {
    const oldBase = zoomVBaseRef.current;
    const next = Math.min(
      ZOOM_V_MAX,
      Math.max(ZOOM_V_MIN, Math.round(nextLanePx)),
    );
    if (next === oldBase) return;
    setZoomV(next);
    // Keep relative proportions of per-track overrides (v4 setVerticalZoom).
    const current = laneHeightsRef.current;
    if (oldBase > 0 && Object.keys(current).length) {
      const scaled = scaleLaneHeights(current, oldBase, next);
      setLaneHeights(scaled);
      saveLaneHeights(scaled);
    }
  }

  function zoomVerticalBySteps(steps: number) {
    if (!steps) return;
    setVerticalZoom(zoomVBaseRef.current + steps * ZOOM_V_STEP);
  }

  function rowHeightStyle(trackId: string): React.CSSProperties {
    const base = laneHeightBase(trackId, laneHeights, zoomV);
    const eff = laneHeightEffective(base, uiScale);
    return { ["--tl-row-h" as string]: `${eff}px` };
  }

  function beginLaneResize(
    e: React.PointerEvent<HTMLButtonElement>,
    trackId: string,
  ) {
    if (e.button !== 0 || touchTier === "mobile") return;
    e.preventDefault();
    e.stopPropagation();
    const startHeightBase = laneHeightBase(trackId, laneHeights, zoomV);
    laneResizeRef.current = {
      trackId,
      startY: e.clientY,
      startHeightBase,
      pointerId: e.pointerId,
    };
    setLaneResizeTrackId(trackId);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onLaneResizePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = laneResizeRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const scale = uiScaleRef.current || 1;
    const dy = e.clientY - drag.startY;
    const nextBase = drag.startHeightBase + dy / scale;
    const next = setLaneHeightOverride(
      laneHeightsRef.current,
      drag.trackId,
      nextBase,
    );
    setLaneHeights(next);
  }

  function endLaneResize(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = laneResizeRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    laneResizeRef.current = null;
    setLaneResizeTrackId(null);
    saveLaneHeights(laneHeightsRef.current);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onLaneResizeDblClick(
    e: React.MouseEvent<HTMLButtonElement>,
    trackId: string,
  ) {
    if (touchTier === "mobile") return;
    e.preventDefault();
    e.stopPropagation();
    const next = clearLaneHeightOverride(laneHeightsRef.current, trackId);
    setLaneHeights(next);
    saveLaneHeights(next);
  }

  function fitZoom() {
    const scroll = document.querySelector(
      "[data-canvas-scroll]",
    ) as HTMLElement | null;
    if (!scroll) return;
    const usable = Math.max(80, scroll.clientWidth - 48);
    const bars = Math.max(1, viewSpanRef.current.end / Math.max(1, barTicksRef.current));
    const next = Math.round(usable / bars / Math.max(0.01, uiScaleRef.current));
    setZoomH(Math.min(ZOOM_H_MAX, Math.max(ZOOM_H_MIN, next)));
    requestAnimationFrame(() => {
      scroll.scrollLeft = 0;
    });
  }

  function nudgeLocator(dir: -1 | 1) {
    const draft = draftRef.current;
    if (!draft) return;
    const meter = resolveMeterAt(draft, locatorTicks);
    const beatTicks = Math.max(
      1,
      Math.round((draft.ppq * 4) / Math.max(1, meter.denominator)),
    );
    placeLocatorAtTicks(locatorTicks + dir * beatTicks, {
      seekTransport: true,
    });
  }

  function toggleTrack(id: string) {
    const def = buildTrackList(draftProject?.audioTracks ?? []).find(
      (t) => t.id === id,
    );
    if (def?.locked) return;
    setTrackVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function onAddAudioTrack() {
    if (!draftProject) return;
    const { project } = addAudioTrack(draftProject);
    commitDraft(project);
    setEyeOpen(false);
  }

  async function onUploadAudioToTrack(trackId: string, file: File) {
    if (!projectId || !draftProject) return;
    try {
      const next = await uploadProjectAudio(projectId, file);
      // Prefer the uploaded clip on the chosen track when server put it on track 0
      let project = next;
      if (trackId && next.audioClips.length) {
        const last = next.audioClips[next.audioClips.length - 1]!;
        if (last.trackId !== trackId) {
          project = {
            ...next,
            audioClips: next.audioClips.map((c) =>
              c.id === last.id ? { ...c, trackId } : c,
            ),
          };
        }
      }
      setSavedProject(project);
      setDraftProject(project);
      setDraftHistory((h) =>
        h ? syncPresentAfterSave(h, project) : createDraftHistory(project),
      );
      setTrackVisibility((prev) =>
        ensureAudioTrackVisibility(prev, project.audioTracks),
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Upload audio failed");
    }
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
      const next = setCountdownBars(draftProject, bars);
      if (next === draftProject) return;
      commitDraft(next);
      // Length change shifts pre-roll — show CD / song start immediately (v4).
      requestAnimationFrame(() => {
        scrollCanvasToStart(
          document.querySelector("[data-canvas-scroll]") as HTMLElement | null,
        );
      });
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
        setTouchAlertOpen(true);
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
    setToolMenu(null);
    if (id === "wand") {
      setTool("wand");
      const { x, y } = lastPointerRef.current;
      setWandMenu({
        left: Math.max(8, x),
        top: Math.max(8, y),
      });
      return;
    }
    setWandMenu(null);
    setTool(id);
  }

  function applyWand(mode: WandMode) {
    const draft = draftRef.current;
    if (!draft) return;
    const formaIds = idsOnLane(clipSelection, "forma");
    const ranges = formaIds.length
      ? draft.forma.clips
          .filter((c) => formaIds.includes(c.id) && c.kind === "section")
          .map((c) => ({
            startTicks: c.startTicks,
            endTicks: c.startTicks + c.lengthTicks,
          }))
      : undefined;
    const next = wandContentToForma(
      draft,
      mode,
      ranges?.length ? { ranges } : {},
    );
    if (next !== draft) commitDraft(next);
    setWandMenu(null);
    setTool("pointer");
  }

  function openToolMenuAt(clientX: number, clientY: number) {
    const pad = 8;
    const approxW = 220;
    const approxH = TOOLS.length * 40 + 16;
    let left = clientX;
    let top = clientY;
    if (typeof window !== "undefined") {
      if (left + approxW > window.innerWidth - pad) {
        left = window.innerWidth - approxW - pad;
      }
      if (top + approxH > window.innerHeight - pad) {
        top = window.innerHeight - approxH - pad;
      }
    }
    setToolMenu({
      left: Math.max(pad, left),
      top: Math.max(pad, top),
    });
  }

  keyHandlersRef.current = {
    onSave,
    onDiscard,
    onUndo,
    onRedo,
    onPlayOrPause: () => {
      void (state.playing ? pause() : onPlayClick());
    },
    onMetronomeToggle,
    onLoopToggle,
    onTool,
    nudgeLocator,
    fitZoom,
    zoomHorizontalBySteps,
    zoomVerticalBySteps,
    dirty,
    savePending,
    playing: state.playing,
    tool,
    prevSetlistId: prevSetlistId ?? null,
    nextSetlistId: nextSetlistId ?? null,
  };

  const canvasInnerWidth = `calc(var(--tl-dock-w) + ${canvasWidthPx}px)`;

  function renderLaneContent(trackId: string) {
    if (!draftProject) return null;
    if (isAudioLaneId(trackId)) {
      const lane = trackId;
      const trackUuid = audioTrackIdFromLane(lane);
      const clips = draftProject.audioClips.filter((c) => c.trackId === trackUuid);
      const assetById = new Map(draftProject.assets.map((a) => [a.id, a]));
      return (
        <>
          {clips.map((clip) => {
            const asset = assetById.get(clip.assetId);
            const moveIds =
              gestureSession?.kind === "move" && gestureSession.lane === lane
                ? gestureSession.moveIds?.length
                  ? gestureSession.moveIds
                  : gestureSession.clipId
                    ? [gestureSession.clipId]
                    : []
                : [];
            const moveDelta =
              gesturePreview &&
              gestureSession?.kind === "move" &&
              moveIds.includes(clip.id)
                ? gesturePreview.startTicks - gestureSession.originClipStart
                : 0;
            const previewing =
              Boolean(gesturePreview) &&
              gestureSession?.lane === lane &&
              ((gestureSession.kind === "move" && moveIds.includes(clip.id)) ||
                (gesturePreview!.clipId === clip.id &&
                  gesturePreview!.kind !== "move"));
            const styleClip: FormaClip = {
              id: clip.id,
              name: asset?.originalName ?? "Audio",
              kind: "section",
              startTicks: previewing
                ? gestureSession?.kind === "move"
                  ? clip.startTicks + moveDelta
                  : gesturePreview!.startTicks
                : clip.startTicks,
              lengthTicks: previewing
                ? gestureSession?.kind === "move"
                  ? clip.lengthTicks
                  : gesturePreview!.lengthTicks
                : clip.lengthTicks,
            };
            const style = clipStylePx(styleClip, viewSpan, barTicks, effectiveZoomH);
            const widthPx = Number.parseFloat(String(style.width)) || 0;
            const peaks = asset?.waveformPeaks;
            const poly =
              peaks && peaks.length
                ? peaksToPolylinePoints(peaks, Math.max(8, widthPx), 28)
                : "";
            return (
              <button
                key={clip.id}
                type="button"
                data-clip-id={clip.id}
                data-clip-lane={lane}
                className={[
                  styles.clip,
                  styles.audioClip,
                  isClipSelected(clipSelection, clip.id, lane)
                    ? styles.clipSelected
                    : "",
                  clip.muted ? styles.audioClipMuted : "",
                  previewing ? styles.formaClipDim : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={style}
                title={`${asset?.originalName ?? "Audio"} — move/trim`}
                onPointerDown={(e) => onAudioClipPointerDown(e, lane, clip)}
                onPointerMove={onFormaClipPointerMove}
                onPointerUp={onFormaClipPointerUp}
              >
                {poly ? (
                  <svg
                    className={styles.audioWaveform}
                    viewBox={`0 0 ${Math.max(8, widthPx)} 28`}
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <polygon points={poly} />
                  </svg>
                ) : null}
                <span className={styles.audioClipLabel}>
                  {asset?.originalName ?? "Audio"}
                </span>
              </button>
            );
          })}
          {clips.length === 0 ? (
            <span className={styles.muted}>
              + Audio w docku lub menu oka — dodaj plik
            </span>
          ) : null}
        </>
      );
    }
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
            style={segmentStylePx(seg, viewSpan, barTicks, effectiveZoomH)}
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
            style={segmentStylePx(seg, viewSpan, barTicks, effectiveZoomH)}
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
            style={segmentStylePx(seg, viewSpan, barTicks, effectiveZoomH)}
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
                left: `${tickToPx(start, viewSpan, barTicks, effectiveZoomH)}px`,
                width: `${Math.max(
                  tickToPx(start + width, viewSpan, barTicks, effectiveZoomH) -
                    tickToPx(start, viewSpan, barTicks, effectiveZoomH),
                  24,
                )}px`,
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                clearClipSelection();
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
              const moveIds =
                gestureSession?.kind === "move" &&
                (gestureSession.lane ?? "forma") === "forma"
                  ? gestureSession.moveIds?.length
                    ? gestureSession.moveIds
                    : gestureSession.clipId
                      ? [gestureSession.clipId]
                      : []
                  : [];
              const moveDelta =
                gesturePreview &&
                gestureSession?.kind === "move" &&
                moveIds.includes(clip.id)
                  ? gesturePreview.startTicks - gestureSession.originClipStart
                  : 0;
              const optionCopyGhost =
                Boolean(gestureSession?.optionCopy) && moveDelta !== 0;
              const previewing =
                !optionCopyGhost &&
                gesturePreview &&
                ((gestureSession?.kind === "move" &&
                  moveIds.includes(clip.id)) ||
                  (gesturePreview.clipId === clip.id &&
                    gesturePreview.kind !== "pencil-draw" &&
                    gesturePreview.kind !== "move"));
              const styleClip = previewing
                ? {
                    ...clip,
                    startTicks:
                      gestureSession?.kind === "move"
                        ? clip.startTicks + moveDelta
                        : gesturePreview!.startTicks,
                    lengthTicks:
                      gestureSession?.kind === "move"
                        ? clip.lengthTicks
                        : gesturePreview!.lengthTicks,
                    subsections:
                      gesturePreview!.kind === "subsection-boundary" &&
                      gesturePreview!.subsections !== undefined
                        ? gesturePreview!.subsections
                        : clip.subsections,
                  }
                : clip;
              return (
                <FormaClipButton
                  key={clip.id}
                  clip={styleClip}
                  dataClipLane="forma"
                  selected={isClipSelected(clipSelection, clip.id, "forma")}
                  selectedSubsectionIdx={
                    primaryId === clip.id ? selectedSubsectionIdx : null
                  }
                  style={clipStylePx(styleClip, viewSpan, barTicks, effectiveZoomH)}
                  pencilActive={toolIsPencilDraw(tool)}
                  allowHitZones={toolAllowsClipHitZones(tool)}
                  dimmed={Boolean(previewing)}
                  onPointerDown={(e) => onFormaClipPointerDown(e, clip)}
                  onPointerMove={onFormaClipPointerMove}
                  onPointerUp={onFormaClipPointerUp}
                />
              );
            })}
            {gestureSession?.optionCopy &&
            gestureSession.kind === "move" &&
            gesturePreview &&
            (gestureSession.lane ?? "forma") === "forma"
              ? (
                  gestureSession.moveIds?.length
                    ? gestureSession.moveIds
                    : gestureSession.clipId
                      ? [gestureSession.clipId]
                      : []
                ).map((id) => {
                  const clip = draftProject.forma.clips.find((c) => c.id === id);
                  if (!clip) return null;
                  const delta =
                    gesturePreview.startTicks - gestureSession.originClipStart;
                  if (delta === 0) return null;
                  const ghost = {
                    ...clip,
                    id: `ghost-${clip.id}`,
                    startTicks: clip.startTicks + delta,
                  };
                  return (
                    <div
                      key={ghost.id}
                      className={[
                        styles.clip,
                        styles.formaClip,
                        styles.formaPreview,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={clipStylePx(
                        ghost,
                        viewSpan,
                        barTicks,
                        effectiveZoomH,
                      )}
                      aria-hidden
                    >
                      {clip.name}
                    </div>
                  );
                })
              : null}
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
                  effectiveZoomH,
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
        return (
          <>
            {clips.map((clip) => {
              const label =
                lane === "tekst"
                  ? (clip as { text: string }).text || "…"
                  : lane === "akordy"
                    ? (clip as { symbol: string }).symbol
                    : (clip as { label: string }).label;
              const moveIds =
                gestureSession?.kind === "move" &&
                gestureSession.lane === lane
                  ? gestureSession.moveIds?.length
                    ? gestureSession.moveIds
                    : gestureSession.clipId
                      ? [gestureSession.clipId]
                      : []
                  : [];
              const moveDelta =
                gesturePreview &&
                gestureSession?.kind === "move" &&
                moveIds.includes(clip.id)
                  ? gesturePreview.startTicks - gestureSession.originClipStart
                  : 0;
              const optionCopyGhost =
                Boolean(gestureSession?.optionCopy) && moveDelta !== 0;
              const previewing =
                !optionCopyGhost &&
                gesturePreview &&
                gestureSession?.lane === lane &&
                ((gestureSession.kind === "move" &&
                  moveIds.includes(clip.id)) ||
                  (gesturePreview.clipId === clip.id &&
                    gesturePreview.kind !== "pencil-draw" &&
                    gesturePreview.kind !== "move"));
              const styleClip: FormaClip = {
                id: clip.id,
                name: label,
                kind: "section",
                startTicks: previewing
                  ? gestureSession?.kind === "move"
                    ? clip.startTicks + moveDelta
                    : gesturePreview!.startTicks
                  : clip.startTicks,
                lengthTicks: previewing
                  ? gestureSession?.kind === "move"
                    ? clip.lengthTicks
                    : gesturePreview!.lengthTicks
                  : clip.lengthTicks,
              };
              return (
                <FormaClipButton
                  key={clip.id}
                  clip={styleClip}
                  dataClipLane={lane}
                  selected={isClipSelected(clipSelection, clip.id, lane)}
                  selectedSubsectionIdx={null}
                  style={clipStylePx(styleClip, viewSpan, barTicks, effectiveZoomH)}
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
            {gestureSession?.optionCopy &&
            gestureSession.kind === "move" &&
            gesturePreview &&
            gestureSession.lane === lane
              ? (
                  gestureSession.moveIds?.length
                    ? gestureSession.moveIds
                    : gestureSession.clipId
                      ? [gestureSession.clipId]
                      : []
                ).map((id) => {
                  const clip = clips.find((c) => c.id === id);
                  if (!clip) return null;
                  const delta =
                    gesturePreview.startTicks - gestureSession.originClipStart;
                  if (delta === 0) return null;
                  const label =
                    lane === "tekst"
                      ? (clip as { text: string }).text || "…"
                      : lane === "akordy"
                        ? (clip as { symbol: string }).symbol
                        : (clip as { label: string }).label;
                  const ghost: FormaClip = {
                    id: `ghost-${clip.id}`,
                    name: label,
                    kind: "section",
                    startTicks: clip.startTicks + delta,
                    lengthTicks: clip.lengthTicks,
                  };
                  return (
                    <div
                      key={ghost.id}
                      className={[
                        styles.clip,
                        styles.formaClip,
                        styles.formaPreview,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={clipStylePx(
                        ghost,
                        viewSpan,
                        barTicks,
                        effectiveZoomH,
                      )}
                      aria-hidden
                    >
                      {label}
                    </div>
                  );
                })
              : null}
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
                  effectiveZoomH,
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
    <div
      className={[
        styles.shell,
        laneResizeTrackId ? styles.laneResizing : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-tl-tier={touchTier}
    >
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
              clearClipSelection();
              clearMapSelection();
              setSongMetaOpen(true);
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
            <Link to="/client">Klient</Link>
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
          <ShellIconButton
            label="Odrzuć zmiany"
            disabled={!dirty || savePending}
            onClick={onDiscard}
            className={styles.discardBtn}
          >
            <IconDiscard />
          </ShellIconButton>
          <ShellIconButton
            label="Zapisz (⌘/Ctrl+S)"
            disabled={!dirty || savePending}
            onClick={() => void onSave()}
            className={styles.saveBtn}
          >
            <IconSave />
          </ShellIconButton>
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
            onClick={() => void toggleAppFullscreen()}
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
        </div>

        <div className={styles.toolbarCenter}>
          <div className={styles.transport} role="group" aria-label="Transport">
            <ShellIconButton
              label="Zatrzymaj"
              disabled={commandPending}
              onClick={() => void onStopClick()}
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
              label="Metronom (K)"
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
        </div>

        <div className={styles.toolbarRight}>
          <span className={styles.dirty} hidden={!dirty}>
            Niezapisane zmiany
          </span>
        </div>
      </div>

      <div
        className={styles.main}
        style={{
          /* Unitless scale like v4 `--tl-ui-scale` (not `%` — avoids calc % of parent). */
          ["--tl-zoom-ui" as string]: String(uiScale),
          ["--tl-row-h" as string]: `${effectiveZoomV}px`,
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
                      onLocatorPointerDown(e, "locator");
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
                    onPointerDown={(e) => onLocatorPointerDown(e, "ruler")}
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
                          left: `${tickToPx(loopRange.startTicks, viewSpan, barTicks, effectiveZoomH)}px`,
                          width: `${Math.max(
                            tickToPx(loopRange.endTicks, viewSpan, barTicks, effectiveZoomH) -
                              tickToPx(loopRange.startTicks, viewSpan, barTicks, effectiveZoomH),
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
                          left: `${tickToPx(mark.ticks, viewSpan, barTicks, effectiveZoomH)}px`,
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
                          left: `${tickToPx(mark.ticks, viewSpan, barTicks, effectiveZoomH)}px`,
                        }}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.trackRows}>
                  {/* Continuous sticky dock paint (v4 `.timeline-dock`) — seals row seams. */}
                  <div className={styles.dockColumnRail} aria-hidden />
                  <div className={styles.laneOverlay} ref={lanesCoordRef} aria-hidden>
                    <div className={styles.barGrid}>
                      {barMarks.map((mark) => (
                        <span
                          key={`grid-${mark.ticks}`}
                          className={styles.barLine}
                          style={{
                            left: `${tickToPx(mark.ticks, viewSpan, barTicks, effectiveZoomH)}px`,
                          }}
                        />
                      ))}
                      {rulerBeatMarks.map((mark) => (
                        <span
                          key={`grid-beat-${mark.ticks}`}
                          className={styles.beatLine}
                          style={{
                            left: `${tickToPx(mark.ticks, viewSpan, barTicks, effectiveZoomH)}px`,
                          }}
                        />
                      ))}
                    </div>
                    {marqueeBox ? (
                      <div
                        className={styles.marquee}
                        style={{
                          left: marqueeBox.left,
                          top: marqueeBox.top,
                          width: marqueeBox.width,
                          height: marqueeBox.height,
                        }}
                      />
                    ) : null}
                  </div>

                {buildTrackList(draftProject?.audioTracks ?? [])
                  .filter((t) => isTrackVisible(trackVisibility, t))
                  .map((track) => (
                  <div
                    key={track.id}
                    className={styles.trackRow}
                    style={rowHeightStyle(track.id)}
                    data-track={track.id}
                  >
                    <div
                      className={[
                        styles.dockCell,
                        track.group === "special" ? styles.dockMuted : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span>{track.label}</span>
                      {track.group === "audio" && track.audioTrackId ? (
                        <>
                          <button
                            type="button"
                            className={styles.tapBtn}
                            title={
                              draftProject?.audioTracks.find(
                                (a) => a.id === track.audioTrackId,
                              )?.muted
                                ? "Włącz ścieżkę"
                                : "Wycisz ścieżkę"
                            }
                            onClick={() => {
                              if (!draftProject || !track.audioTrackId) return;
                              const muted = !draftProject.audioTracks.find(
                                (a) => a.id === track.audioTrackId,
                              )?.muted;
                              commitDraft(
                                setAudioTrackMuted(
                                  draftProject,
                                  track.audioTrackId,
                                  muted,
                                ),
                              );
                            }}
                          >
                            M
                          </button>
                          <label className={styles.tapBtn} title="Dodaj plik audio">
                            +
                            <input
                              type="file"
                              accept="audio/*,.mp3,.wav,.aiff,.aif,.m4a,.flac,.ogg"
                              hidden
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                if (f && track.audioTrackId) {
                                  void onUploadAudioToTrack(
                                    track.audioTrackId,
                                    f,
                                  );
                                }
                              }}
                            />
                          </label>
                        </>
                      ) : null}
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
                      {touchTier !== "mobile" ? (
                        <button
                          type="button"
                          className={[
                            styles.laneResize,
                            laneResizeTrackId === track.id
                              ? styles.laneResizeActive
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          title="Przeciągnij — wysokość ścieżki (dwuklik = domyślna)"
                          aria-label={`Zmień wysokość ścieżki ${track.label}`}
                          onPointerDown={(e) => beginLaneResize(e, track.id)}
                          onPointerMove={onLaneResizePointerMove}
                          onPointerUp={endLaneResize}
                          onPointerCancel={endLaneResize}
                          onDoubleClick={(e) =>
                            onLaneResizeDblClick(e, track.id)
                          }
                        />
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
                                      beginMarquee(e);
                                    }
                                    return;
                                  }
                                  beginContentPencilDraw(
                                    e,
                                    track.id as ContentLaneId,
                                  );
                                }
                              : isAudioLaneId(track.id)
                                ? (e) => {
                                    if (e.button !== 0) return;
                                    if (toolAllowsClipHitZones(tool)) {
                                      beginMarquee(e);
                                    }
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
                      data-track={track.id}
                    >
                      {renderLaneContent(track.id)}
                    </div>
                  </div>
                ))}
                <div className={styles.rowsFill}>
                  <div className={styles.dockColumnFill} aria-hidden />
                  <div
                    className={styles.laneFillHit}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      if (!toolAllowsClipHitZones(tool)) return;
                      beginMarquee(e);
                    }}
                  />
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>

        <aside className={styles.inspector} aria-label="Właściwości">
            <div className={styles.inspHead}>
              <h2 className={styles.inspTitle}>Właściwości</h2>
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
                  <input
                    className={styles.lengthInput}
                    type="text"
                    inputMode="numeric"
                    placeholder="4/4"
                    defaultValue={`${draftProject.defaultMeter.numerator}/${draftProject.defaultMeter.denominator}`}
                    key={`meter-${draftProject.defaultMeter.numerator}-${draftProject.defaultMeter.denominator}`}
                    aria-label="Metrum domyślne"
                    onBlur={(e) => {
                      const parsed = parseLegacyMeter(
                        e.target.value,
                        draftProject.defaultMeter,
                      );
                      if (
                        parsed.numerator === draftProject.defaultMeter.numerator &&
                        parsed.denominator ===
                          draftProject.defaultMeter.denominator
                      ) {
                        e.target.value = `${parsed.numerator}/${parsed.denominator}`;
                        return;
                      }
                      commitDraft(
                        upsertMeterAt(
                          {
                            ...draftProject,
                            defaultMeter: parsed,
                          },
                          0,
                          parsed.numerator,
                          parsed.denominator,
                        ),
                      );
                    }}
                  />
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
                  Rok wydania
                  <input
                    className={styles.lengthInput}
                    type="number"
                    min={1900}
                    max={2100}
                    placeholder="1978"
                    value={draftProject.year ?? ""}
                    aria-label="Rok wydania"
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        commitDraft({ ...draftProject, year: undefined });
                        return;
                      }
                      const n = Number(raw);
                      if (!Number.isFinite(n)) return;
                      commitDraft({
                        ...draftProject,
                        year: Math.round(n),
                      });
                    }}
                  />
                </label>
                <label className={styles.inspField}>
                  Tonacja (start)
                  <span className={styles.metaKeyRow}>
                    <select
                      className={styles.nameInput}
                      aria-label="Tonic start"
                      value={resolveKeyAt(draftProject, 0)?.tonic ?? "C"}
                      onChange={(e) => {
                        const mode =
                          resolveKeyAt(draftProject, 0)?.mode ?? "major";
                        commitDraft(
                          upsertKeyAt(draftProject, 0, {
                            tonic: e.target.value || "C",
                            mode,
                          }),
                        );
                      }}
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
                    <select
                      className={styles.nameInput}
                      aria-label="Tryb tonacji start"
                      value={resolveKeyAt(draftProject, 0)?.mode ?? "major"}
                      onChange={(e) => {
                        const tonic =
                          resolveKeyAt(draftProject, 0)?.tonic ?? "C";
                        const mode =
                          e.target.value === "minor" ? "minor" : "major";
                        commitDraft(
                          upsertKeyAt(draftProject, 0, { tonic, mode }),
                        );
                      }}
                    >
                      <option value="major">Dur</option>
                      <option value="minor">Moll</option>
                    </select>
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
            ) : selectedAudioClip && selectedAudioTrack ? (
              <div className={styles.inspBody}>
                <p className={styles.muted}>
                  {draftProject?.assets.find((a) => a.id === selectedAudioClip.assetId)
                    ?.originalName ?? "Audio"}
                </p>
                <label className={styles.inspField}>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedAudioClip.muted)}
                    onChange={(e) => {
                      if (!draftProject) return;
                      commitDraft(
                        setAudioClipMuted(
                          draftProject,
                          selectedAudioClip.id,
                          e.target.checked,
                        ),
                      );
                    }}
                  />{" "}
                  Mute clip
                </label>
                <label className={styles.inspField}>
                  Gain clip (dB)
                  <input
                    className={styles.lengthInput}
                    type="number"
                    step={0.5}
                    value={selectedAudioClip.gainDb ?? 0}
                    onChange={(e) => {
                      if (!draftProject) return;
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      commitDraft(
                        setAudioClipGainDb(draftProject, selectedAudioClip.id, n),
                      );
                    }}
                  />
                </label>
                <label className={styles.inspField}>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedAudioTrack.muted)}
                    onChange={(e) => {
                      if (!draftProject) return;
                      commitDraft(
                        setAudioTrackMuted(
                          draftProject,
                          selectedAudioTrack.id,
                          e.target.checked,
                        ),
                      );
                    }}
                  />{" "}
                  Mute track
                </label>
                <label className={styles.inspField}>
                  Fader track (dB)
                  <input
                    className={styles.lengthInput}
                    type="number"
                    step={0.5}
                    value={selectedAudioTrack.gainDb ?? 0}
                    onChange={(e) => {
                      if (!draftProject) return;
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      commitDraft(
                        setAudioTrackGainDb(
                          draftProject,
                          selectedAudioTrack.id,
                          n,
                        ),
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
      </div>

      <footer className={styles.status} aria-label="Status Timeline">
        <div className={styles.statusLeft}>
          <ConnectionIndicator status={wsStatus} variant="dot" />
          <span className={styles.statusConnLab}>
            {wsStatus === "connected"
              ? "Połączony"
              : wsStatus === "connecting"
                ? "Łączenie…"
                : "Rozłączony"}
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
              min={ZOOM_H_MIN}
              max={ZOOM_H_MAX}
              value={zoomH}
              onChange={(e) => setZoomH(Number(e.target.value))}
            />
          </label>
          <label className={styles.zoomLab}>
            V
            <input
              type="range"
              min={ZOOM_V_MIN}
              max={ZOOM_V_MAX}
              value={zoomV}
              onChange={(e) => setVerticalZoom(Number(e.target.value))}
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

      {canvasNotice ? (
        <p className={styles.canvasNotice} role="status" aria-live="polite">
          {canvasNotice}
        </p>
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
              {buildTrackList(draftProject?.audioTracks ?? []).map((track) => (
                <button
                  key={track.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isTrackVisible(trackVisibility, track)}
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
                    {isTrackVisible(trackVisibility, track) ? (
                      <IconChecked />
                    ) : (
                      <IconUnchecked />
                    )}
                  </span>
                  {track.label}
                  {track.locked ? " (zawsze)" : ""}
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                className={styles.eyeItem}
                onClick={onAddAudioTrack}
              >
                + Ścieżka Audio
              </button>
            </div>,
            document.body,
          )
        : null}

      {toolMenu
        ? createPortal(
            <div
              ref={toolMenuRef}
              className={styles.toolMenu}
              style={{ top: toolMenu.top, left: toolMenu.left }}
              role="menu"
              aria-label="Wybór narzędzia"
            >
              {TOOLS.map(({ id, label, key, Icon, disabled }) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  className={[
                    styles.toolMenuItem,
                    tool === id ? styles.toolMenuItemActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onTool(id)}
                >
                  <Icon />
                  <span>{label}</span>
                  <span className={styles.toolMenuKey}>{key}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}

      {wandMenu
        ? createPortal(
            <div
              ref={wandMenuRef}
              className={styles.toolMenu}
              style={{ top: wandMenu.top, left: wandMenu.left }}
              role="menu"
              aria-label="Różdżka — źródło"
            >
              {(
                [
                  ["tekst", "Tekst → Forma"],
                  ["akordy", "Akordy → Forma"],
                  ["both", "Tekst + Akordy → Forma"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="menuitem"
                  className={styles.toolMenuItem}
                  onClick={() => applyWand(mode)}
                >
                  <span>{label}</span>
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
            <div
              className={styles.meterEditRow}
              role="group"
              aria-label="Metrum"
            >
              <input
                className={styles.lengthInput}
                type="number"
                min={1}
                max={32}
                value={meterNumDraft}
                aria-label="Metrum — górna liczba"
                onChange={(e) => setMeterNumDraft(e.target.value)}
              />
              <span className={styles.meterEditSlash} aria-hidden>
                /
              </span>
              <select
                className={styles.nameInput}
                value={meterDenDraft}
                aria-label="Metrum — dolna liczba"
                onChange={(e) => setMeterDenDraft(e.target.value)}
              >
                {[1, 2, 4, 8, 16].map((d) => (
                  <option key={d} value={String(d)}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
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
            <div
              className={styles.keyEditRow}
              role="group"
              aria-label="Tonacja"
            >
              <select
                className={styles.nameInput}
                id="key-tonic"
                aria-label="Tonic"
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
              <select
                className={styles.nameInput}
                id="key-mode"
                aria-label="Tryb"
                defaultValue={
                  resolveKeyAt(draftProject, mapEditTicks)?.mode ?? "major"
                }
              >
                <option value="major">Dur</option>
                <option value="minor">Moll</option>
              </select>
            </div>
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

      <ShellAlertDialog
        open={touchAlertOpen}
        title="Edycja na tym urządzeniu"
        message={TOUCH_FULL_EDIT_MSG}
        onClose={() => setTouchAlertOpen(false)}
      />
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
  dataClipLane,
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
  dataClipLane?: ClipSelectionLane;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const [hoverZone, setHoverZone] = useState<"body" | "start" | "end">("body");
  const countdown = clip.kind === "countdown";
  const cursor = pencilActive
    ? "crosshair"
    : allowHitZones
      ? countdown
        ? hoverZone === "start"
          ? "not-allowed"
          : "ew-resize"
        : cursorForHitZone(hoverZone, true)
      : "pointer";

  const ranges =
    clip.kind === "section" && clip.subsections && clip.subsections.length > 0
      ? subsectionRanges(clip.subsections, clip.lengthTicks)
      : [];

  return (
    <button
      type="button"
      data-clip-id={clip.id}
      data-clip-lane={dataClipLane}
      className={[
        styles.clip,
        styles.formaClip,
        selected ? styles.clipOn : "",
        countdown ? styles.clipLocked : "",
        pencilActive ? styles.formaClipPencil : "",
        dimmed ? styles.formaClipDim : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...style, cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => {
        if (allowHitZones) {
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

