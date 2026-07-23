import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { Button, Slider, useContextMenu } from "@stagesync/ui";
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
  normalizeKeyTonic,
  placeContentFromForma,
  projectEndTicks,
  transportHomeTicks,
  resolveTrackColor,
  channelModeFromChannelCount,
  type FormaClip,
  type Project,
  type SnapMode,
  type WandMode,
} from "@stagesync/shared";
import {
  buildBarMarks,
  buildRulerBeatMarks,
  clipStylePx,
  computeCanvasWidthPx,
  computeFormaViewSpan,
  DEFAULT_PX_PER_BAR,
  pencilFormaClick,
  projectContentEqual,
  scrollCanvasToStart,
  snapEditTicks,
  tickToPx,
  ticksFromPointer,
} from "../lib/formaCanvas.js";
import {
  cascadeFormaMoveIds,
  commitGesture,
  deleteFormaClip,
  formaSectionCoveringTicks,
  joinFormaAtClick,
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
  applySoloButtonClick,
  clearSelection,
  clearTrackSelection,
  EMPTY_CLIP_SELECTION,
  EMPTY_TRACK_SELECTION,
  idsOnLane,
  isAudioSelectionLane,
  isAudioTrackSelected,
  isClipSelected,
  isMarqueeClick,
  isMultiSelectClick,
  marqueeSelectFromHits,
  primaryAudioTrackId,
  primaryLane,
  pruneTrackSelection,
  rectsIntersect,
  resolveMoveIds,
  resolveMuteButtonClick,
  selectAudioTrack,
  selectAudioTrackRange,
  selectAllProjectClips,
  selectRangeTo,
  selectSingle,
  setSelection,
  toggleAudioTrackSelected,
  toggleSelected,
  type ClipSelection,
  type ClipSelectionLane,
  type TimelineSurface,
  type TrackSelection,
} from "../lib/timelineSelection.js";
import { resolveTimelineShortcut } from "../lib/timelineKeyboardShortcuts.js";
import {
  isToolbarToolId,
  loadToolbarVisibleTools,
  saveToolbarVisibleTools,
  toggleToolbarVisibleTool,
  TOOLBAR_ALWAYS_VISIBLE,
  type ToolbarToolId,
} from "../lib/timelineToolbarTools.js";
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
import { TimelineHelp } from "./timeline/TimelineHelp.js";
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
  pencilTekstClick,
  setTekstClipText,
} from "../lib/tekstEdit.js";
import {
  deleteAkordyClip,
  pencilAkordyClick,
  setAkordyClipSymbol,
} from "../lib/akordyEdit.js";
import {
  deleteCueClip,
  pencilCueClick,
  setCueClipLabel,
  setCueClipRoles,
  setCueClipPriority,
  CUE_ROLES,
} from "../lib/cueEdit.js";
import {
  commitContentGesture,
  contentClipCoveringTicks,
  defaultPencilLabel,
  joinAdjacentContentClips,
  previewContentFromSession,
  splitContentClipAt,
  type ContentLaneId,
} from "../lib/contentLaneEdit.js";
import {
  buildAudioTrackContextMenuItems,
  buildClipContextMenuItems,
  buildEmptyLaneContextMenuItems,
  clipboardMatchesEmptyLane,
  type ClipMenuLane,
  type EmptyLaneMenuKind,
} from "../lib/timelineContextMenus.js";
import {
  applyTimelineNudge,
  nudgeShowsLeftEdge,
  shouldShowTouchNudge,
} from "../lib/timelineTouchNudge.js";
import { useTimelineTouchGestures } from "../lib/useTimelineTouchGestures.js";
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
  snapMovedLoopRange,
  ticksInLoopRegion,
  usableLoopRange,
  type LoopRange,
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
  getMetronomeOn,
  setMetronomeOn as persistMetronomeOn,
} from "../lib/metronomePrefs.js";
import {
  addAudioTrack,
  duplicateAudioTrack,
  MAX_AUDIO_TRACKS,
  applyDecodedAudioMeta,
  commitAudioGesture,
  joinAdjacentAudioClips,
  previewAudioFromSession,
  removeAudioTrack,
  setAudioClipFadeMs,
  setAudioClipGainDb,
  setAudioClipLoop,
  setAudioClipMuted,
  setAudioClipTrimMs,
  setAudioTrackColor,
  setAudioTrackGainDb,
  setAudioTrackIcon,
  setAudioTrackOutput,
  setAudioTrackPan,
  setAudioTrackChannelMode,
  setAudioTracksMuted,
  setAudioTrackName,
  setAudioBusGainDb,
  setAudioBusMuted,
  setAudioBusName,
  setAudioBusPan,
  setAudioBusChannelMode,
  addAudioBus,
  removeAudioBus,
  setMasterGainDb,
  splitAudioClipAt,
  toggleAudioClipMute,
} from "../lib/audioLaneEdit.js";
import {
  ChannelStripControls,
  MixerSurface,
} from "./timeline/channelStrip/index.js";
import type {
  ChannelStripCallbacks,
  MasterStripCallbacks,
} from "./timeline/channelStrip/channelStripTypes.js";
import {
  allowAudioPlayback,
  clearAudioBufferCache,
  ensureAudioBuffered,
  getFailedAudioAssetIds,
  isAudioAssetDecodeFailed,
  loadAudioBuffer,
  restartAudioPlayback,
  stopAudioPlayback,
  suppressAudioPlayback,
  syncAudioPlayback,
} from "../lib/audioPlayback.js";
import {
  AUDIO_LATENCY_CHANGED_EVENT,
  getStoredLatencyCompensationMs,
} from "../lib/audioLatencyPrefs.js";
import {
  CLOCK_DISPLAY_CHANGED_EVENT,
  formatClockDisplay,
  getStoredClockDisplayFormat,
  type ClockDisplayFormat,
} from "../lib/clockDisplayPrefs.js";
import { ticksFromSyncLeadMs } from "../lib/syncLead.js";
import { isEditableKeyboardTarget } from "../lib/isEditableKeyboardTarget.js";
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
  TIMELINE_TABLET_MQ,
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
  cursorForTimelineTool,
  hitTestAudioClipZone,
  hitTestClipZone,
  loadSessionSnapModeFromStorage,
  persistSessionSnapMode,
  snapModeFromStorageKey,
  snapModeToStorageKey,
  toolAllowsClipHitZones,
  toolIsPencilDraw,
  toolUsesMarqueeGesture,
  type ClipHitZone,
  type FormaGesturePreview,
  type FormaGestureSession,
  type FormaToolId,
} from "../lib/timelineGesture.js";
import {
  applyVocalTap,
  vocalTapMarkTicks,
  vocalTapQueue,
} from "../lib/clientVocalTap.js";
import {
  clampBeatForProject,
  formatStartBarBeat,
  moveClipStartKeepLength,
  parseStartBarBeat,
} from "../lib/clipStartEdit.js";
import {
  audioTrackIdFromLane,
  buildTrackList,
  defaultTrackVisibility,
  ensureAudioTrackVisibility,
  isAudioLaneId,
  isTrackVisible,
  TRACKS,
  type AudioLaneId,
  type TrackVisibilityMap,
} from "../lib/timelineTracks.js";
import {
  clearLaneHeightOverride,
  DEFAULT_LANE_PX,
  DOCK_COMPACT_MAX_PX,
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
  clampDockWidth,
  loadDockWidth,
  saveDockWidth,
} from "../lib/timelineDockWidth.js";
import {
  clampZoomUi,
  loadZoomPrefs,
  saveZoomPrefs,
  ZOOM_H_MAX as PREFS_ZOOM_H_MAX,
  ZOOM_H_MIN as PREFS_ZOOM_H_MIN,
  ZOOM_UI_MAX,
  ZOOM_UI_MIN,
} from "../lib/timelineZoomPrefs.js";
import {
  toggleAppFullscreen,
  syncEditHistoryState,
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
  IconEraser,
  IconEye,
  IconFade,
  IconFollow,
  IconGain,
  IconInfo,
  IconJoin,
  IconLoop,
  IconMarquee,
  IconMetronome,
  IconMixer,
  IconMute,
  IconPause,
  IconPencil,
  IconPlay,
  IconPointer,
  IconScissors,
  IconSettings,
  IconSolo,
  IconStop,
  IconTap,
  IconUnchecked,
  IconZoomIn,
} from "./icons.js";
import { ConnectionIndicator } from "./ConnectionIndicator.js";
import { ConnectionLostBanner } from "./ConnectionLostBanner.js";
import {
  SettingsPopover,
  ShellAppearanceFields,
} from "./SettingsPopover.js";
import { ShellIconButton } from "./ShellIconButton.js";
import { ShellSwitchRow } from "./ShellSwitchRow.js";
import { AppHeader } from "./components/AppHeader.js";
import styles from "./TimelineShell.module.css";

type ToolId = FormaToolId;

const TOOLS: {
  id: ToolId;
  label: string;
  title: string;
  /** Second key after T opens the tools menu (Logic-style chord). */
  key: string | null;
  Icon: typeof IconPointer;
  /** Shown in toolbar + T menu (wand outside; Tap = Tekst dock only). */
  inMenu?: boolean;
}[] = [
  {
    id: "pointer",
    label: "Wskaźnik",
    title: "Wskaźnik — zaznacz, przesuń, zmień długość",
    key: "t",
    Icon: IconPointer,
  },
  {
    id: "pencil",
    label: "Ołówek",
    title: "Ołówek — klik: 1 takt / marker; przeciągnij: zakres",
    key: "p",
    Icon: IconPencil,
  },
  {
    id: "eraser",
    label: "Gumka",
    title: "Gumka — usuń kliknięty element",
    key: "e",
    Icon: IconEraser,
  },
  {
    id: "scissors",
    label: "Nożyczki",
    title: "Nożyczki — podział clipu / podsekcja Formy / zmiana mapy",
    key: "i",
    Icon: IconScissors,
  },
  {
    id: "join",
    label: "Połącz",
    title: "Połącz — scal sąsiednie clipy / usuń granicę podsekcji",
    key: "j",
    Icon: IconJoin,
  },
  {
    id: "mute",
    label: "Mute",
    title: "Mute — przełącz wyciszenie klikniętego clipu audio",
    key: "m",
    Icon: IconMute,
  },
  {
    id: "solo",
    label: "Solo",
    title: "Solo — chwilowe solo ścieżki clipu audio przytrzymaniem LMB",
    key: "s",
    Icon: IconSolo,
  },
  {
    id: "fade",
    label: "Fade",
    title: "Fade — przeciągnij na krawędzi clipu audio: fade in/out",
    key: "a",
    Icon: IconFade,
  },
  {
    id: "gain",
    label: "Gain",
    title: "Gain — przeciągnij w pionie na clipie audio: poziom dB",
    key: "g",
    Icon: IconGain,
  },
  {
    id: "marquee",
    label: "Zaznaczanie",
    title: "Zaznaczanie — prostokąt na siatce",
    key: "r",
    Icon: IconMarquee,
  },
  {
    id: "zoom",
    label: "Zoom",
    title: "Zoom — przeciągnij prostokąt; klik tła = Fit",
    key: "y",
    Icon: IconZoomIn,
  },
];

const TOOL_BY_KEY = Object.fromEntries(
  TOOLS.filter((t) => t.key).map((t) => [t.key!, t]),
);

export function TimelineShell() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const lanesCoordRef = useRef<HTMLDivElement>(null);
  const trackRowsRoRef = useRef<ResizeObserver | null>(null);
  const markerOverlayRef = useRef<HTMLDivElement>(null);
  const eyeBtnRef = useRef<HTMLButtonElement>(null);
  const eyeMenuRef = useRef<HTMLDivElement>(null);
  const toolsVisBtnRef = useRef<HTMLButtonElement>(null);
  const toolsVisMenuRef = useRef<HTMLDivElement>(null);
  const [eyeMenuPos, setEyeMenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [toolsVisMenuPos, setToolsVisMenuPos] = useState<{
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
  const { openAt: openContextMenu, close: closeContextMenu } = useContextMenu();
  const wasPlayingRef = useRef(state.playing);
  const [latencyCompMs, setLatencyCompMs] = useState(
    () => getStoredLatencyCompensationMs(),
  );
  const [clockFormat, setClockFormat] = useState<ClockDisplayFormat>(() =>
    getStoredClockDisplayFormat(),
  );
  const clockLabel = formatClockDisplay({
    ticks: displayTicks,
    bpm: state.bpm,
    timeSignature: state.timeSignature,
    ppq: state.ppq,
    format: clockFormat,
  });

  useEffect(() => {
    const onLatency = () => {
      setLatencyCompMs(getStoredLatencyCompensationMs());
    };
    window.addEventListener(AUDIO_LATENCY_CHANGED_EVENT, onLatency);
    return () => {
      window.removeEventListener(AUDIO_LATENCY_CHANGED_EVENT, onLatency);
    };
  }, []);

  useEffect(() => {
    const onClock = () => {
      setClockFormat(getStoredClockDisplayFormat());
    };
    window.addEventListener(CLOCK_DISPLAY_CHANGED_EVENT, onClock);
    return () => {
      window.removeEventListener(CLOCK_DISPLAY_CHANGED_EVENT, onClock);
    };
  }, []);

  const [savedProject, setSavedProject] = useState<Project | null>(null);
  const [draftProject, setDraftProject] = useState<Project | null>(null);
  const [draftHistory, setDraftHistory] = useState<DraftHistory | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savePending, setSavePending] = useState(false);
  const [audioUploadPending, setAudioUploadPending] = useState(false);
  const audioUploadPendingRef = useRef(false);
  const inspAudioFileRef = useRef<HTMLInputElement>(null);
  const [audioBuffering, setAudioBuffering] = useState(false);
  const [failedAudioAssetIds, setFailedAudioAssetIds] = useState<string[]>([]);
  const [libraryNames, setLibraryNames] = useState<
    { id: string; name: string }[]
  >([]);
  const [setlistIds, setSetlistIds] = useState<string[]>([]);
  const [setlistEnabled, setSetlistEnabled] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);

  const [tool, setTool] = useState<ToolId>("pointer");
  const toolRef = useRef<ToolId>("pointer");
  toolRef.current = tool;
  /** Solo tool: restore track solo set on mouseup / blur. */
  const soloHoldRef = useRef<string[] | null>(null);
  const effectiveLocatorTicksRef = useRef(0);
  const [tapLineIndex, setTapLineIndex] = useState(0);
  const tapLineIndexRef = useRef(0);
  tapLineIndexRef.current = tapLineIndex;
  const [heldZoom, setHeldZoom] = useState(false);
  const heldZoomRef = useRef(false);
  heldZoomRef.current = heldZoom;
  const [snapMode, setSnapMode] = useState<SnapMode>(() =>
    loadSessionSnapModeFromStorage(),
  );

  useEffect(() => {
    persistSessionSnapMode(snapMode);
  }, [snapMode]);
  const [toolMenu, setToolMenu] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [wandMenu, setWandMenu] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const wandMenuOpenRef = useRef(false);
  wandMenuOpenRef.current = Boolean(wandMenu);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const wandMenuRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [helpOpen, setHelpOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [songScreenOpen, setSongScreenOpen] = useState(false);
  const [ugModalOpen, setUgModalOpen] = useState(false);
  const [ugText, setUgText] = useState("");
  const [ugError, setUgError] = useState<string | null>(null);
  const [metronomeOn, setMetronomeOn] = useState(() => getMetronomeOn());
  const [followPlayhead, setFollowPlayhead] = useState(() => {
    try {
      return localStorage.getItem("stagesync-timeline-follow-playhead") === "1";
    } catch {
      return false;
    }
  });
  const [showMidiPlayhead, setShowMidiPlayhead] = useState(() => {
    try {
      const v = localStorage.getItem("stagesync-timeline-midi-playhead");
      if (v === null) return true;
      return v === "1";
    } catch {
      return true;
    }
  });
  const [zoomH, setZoomH] = useState(() => loadZoomPrefs().zoomH);
  const [zoomV, setZoomV] = useState(() => loadZoomPrefs().zoomV);
  const [zoomUi, setZoomUi] = useState(() => loadZoomPrefs().zoomUi);
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
  const [dockWidthBase, setDockWidthBase] = useState(() => loadDockWidth());
  const [dockWidthResizing, setDockWidthResizing] = useState(false);
  const dockWidthResizeRef = useRef<{
    startX: number;
    startWidthBase: number;
    pointerId: number;
  } | null>(null);
  const dockWidthBaseRef = useRef(dockWidthBase);
  dockWidthBaseRef.current = dockWidthBase;
  const uiScale = zoomUi / 100;
  /** v4 effectivePxPerBar / lane × UI scale. */
  const effectiveZoomH = zoomH * uiScale;
  const effectiveZoomV = Math.max(1, Math.round(zoomV * uiScale));
  /** Match v4 `ZOOM_H_STEP` / slider bounds on status zoom H. */
  const ZOOM_H_STEP = 4;
  const ZOOM_H_MIN = PREFS_ZOOM_H_MIN;
  const ZOOM_H_MAX = PREFS_ZOOM_H_MAX;
  const ZOOM_V_STEP = 4;
  const ZOOM_V_MIN = MIN_LANE_PX;
  const ZOOM_V_MAX = MAX_LANE_PX;
  const [touchTier, setTouchTier] = useState<TimelineTouchTier>(() =>
    typeof window !== "undefined" ? detectTimelineTier() : "desktop",
  );
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
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
  /** Show/hide Właściwości panel (I). Independent of Metadane (ⓘ). */
  const [inspectorVisible, setInspectorVisible] = useState(
    () =>
      (typeof window !== "undefined" ? detectTimelineTier() : "desktop") !==
      "mobile",
  );
  const [tapState, setTapState] = useState(createTapTempoState);
  const [tapBpmHint, setTapBpmHint] = useState<number | null>(null);
  const [touchAlertOpen, setTouchAlertOpen] = useState(false);
  const metroBeatRef = useRef(0);
  const loopDragRef = useRef<{
    pointerId: number;
    originTicks: number;
    originClientX: number;
    /**
     * Logic-style split ruler: top lane creates/moves cycle; bottom + locator
     * scrub playhead only.
     */
    source: "ruler-loop" | "ruler-beat" | "locator";
    kind: "seek" | "create" | "move";
    moveOriginRange?: LoopRange;
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
  const [toolbarVisibleTools, setToolbarVisibleTools] = useState<
    ToolbarToolId[]
  >(() => loadToolbarVisibleTools());
  const [toolsVisOpen, setToolsVisOpen] = useState(false);
  const toolbarVisibleSet = useMemo(
    () => new Set<string>(toolbarVisibleTools),
    [toolbarVisibleTools],
  );
  const [locatorTicks, setLocatorTicks] = useState(0);
  /** Forma/content multi-select (v4 selectedIds + primaryId). */
  const [clipSelection, setClipSelection] =
    useState<ClipSelection>(EMPTY_CLIP_SELECTION);
  const [trackSelection, setTrackSelection] =
    useState<TrackSelection>(EMPTY_TRACK_SELECTION);
  const [soloAudioTrackIds, setSoloAudioTrackIds] = useState<string[]>([]);
  const [soloBusIds, setSoloBusIds] = useState<string[]>([]);
  const [timelineSurface, setTimelineSurface] =
    useState<TimelineSurface>("timeline");
  const [trackRename, setTrackRename] = useState<{
    trackId: string;
    name: string;
  } | null>(null);
  const [busRename, setBusRename] = useState<{
    busId: string;
    name: string;
  } | null>(null);
  const [audioLaneDropId, setAudioLaneDropId] = useState<string | null>(null);
  const laneImportTrackIdRef = useRef<string | null>(null);
  const laneAudioFileRef = useRef<HTMLInputElement>(null);
  const trackSelectionRef = useRef(trackSelection);
  trackSelectionRef.current = trackSelection;
  const primaryId = clipSelection.primaryId;
  const selectionLane = primaryLane(clipSelection);

  // Clip focus and track header focus are mutually exclusive in the dock/inspector.
  useEffect(() => {
    if (clipSelection.items.length > 0) {
      setTrackSelection(clearTrackSelection());
    }
  }, [clipSelection]);

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
  const clipSelectionRef = useRef(clipSelection);
  clipSelectionRef.current = clipSelection;
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
    onStop: async () => {},
    onMetronomeToggle: async () => {},
    onLoopToggle: () => {},
    onTool: (id: ToolId) => {
      void id;
    },
    applyWand: (mode: WandMode) => {
      void mode;
    },
    nudgeLocator: (dir: -1 | 1) => {
      void dir;
    },
    fitZoom: () => {},
    zoomHorizontalBySteps: (steps: number, anchorViewportX?: number) => {
      void steps;
      void anchorViewportX;
    },
    applyAbsoluteZoomH: (next: number, anchorViewportX?: number) => {
      void next;
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
      setFailedAudioAssetIds(getFailedAudioAssetIds(id));
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
    const sel = clipSelectionRef.current;
    setDraftProject(next);
    setTrackVisibility((prev) =>
      ensureAudioTrackVisibility(prev, next.audioTracks),
    );
    setDraftHistory((h) =>
      h ? pushDraftHistory(h, next, sel) : createDraftHistory(next, sel),
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
      setInspectorVisible(true);
    },
    [],
  );

  const clearMapSelection = useCallback(() => {
    setSelectedMapIds([]);
    setSelectedMapLane(null);
    setPrimaryMapId(null);
  }, []);

  /** Desktop dblclick → focus Właściwości (v4); tablet canvas double-tap stays Fit Zoom. */
  const focusInspectorPanel = useCallback(() => {
    setInspectorVisible(true);
    setSongMetaOpen(false);
    requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLElement>(
        'aside[aria-label="Właściwości"]',
      );
      if (!panel) return;
      panel.scrollIntoView({ block: "nearest" });
      const field = panel.querySelector<HTMLElement>(
        "input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
      );
      field?.focus({ preventScroll: true });
    });
  }, []);

  /** Esc / mobile sheet dismiss — clear focus; hide panel only on mobile. */
  const closeMobileInspector = useCallback(() => {
    setSongMetaOpen(false);
    clearClipSelection();
    clearMapSelection();
    setTrackSelection(clearTrackSelection());
    setSelectedAnchorId(null);
    if (touchTier === "mobile") {
      setInspectorVisible(false);
    }
  }, [clearClipSelection, clearMapSelection, touchTier]);

  /** Header × — hide Właściwości (same as bare I off); mobile also clears sheet focus. */
  const closeInspectorPanel = useCallback(() => {
    setInspectorVisible(false);
    if (touchTier === "mobile") {
      setSongMetaOpen(false);
      clearClipSelection();
      clearMapSelection();
      setTrackSelection(clearTrackSelection());
      setSelectedAnchorId(null);
    }
  }, [clearClipSelection, clearMapSelection, touchTier]);

  const setMapSelection = useCallback(
    (lane: MapLaneId, ids: string[], mapPrimaryId: string | null) => {
      setSelectedMapLane(lane);
      setSelectedMapIds(ids);
      setPrimaryMapId(mapPrimaryId);
      clearClipSelection();
      setSelectedAnchorId(null);
      setSongMetaOpen(false);
      setInspectorVisible(true);
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
    const tabletMq = window.matchMedia(TIMELINE_TABLET_MQ);
    const coarseMq = window.matchMedia(TIMELINE_COARSE_MQ);
    mobileMq.addEventListener("change", syncTier);
    tabletMq.addEventListener("change", syncTier);
    coarseMq.addEventListener("change", syncTier);
    window.addEventListener("resize", syncTier);
    return () => {
      mobileMq.removeEventListener("change", syncTier);
      tabletMq.removeEventListener("change", syncTier);
      coarseMq.removeEventListener("change", syncTier);
      window.removeEventListener("resize", syncTier);
    };
  }, []);

  useTimelineTouchGestures({
    enabled: touchTier === "tablet",
    scrollRef: canvasScrollRef,
    getZoomH: () => zoomHBaseRef.current,
    applyZoomH: (next, anchor) => {
      keyHandlersRef.current.applyAbsoluteZoomH?.(next, anchor);
    },
    onDoubleTap: () => {
      keyHandlersRef.current.fitZoom();
    },
    zoomMin: ZOOM_H_MIN,
    zoomMax: ZOOM_H_MAX,
  });

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
    if (!clipSelection.items.length) {
      const ids = trackSelectionRef.current.ids;
      if (!ids.length) return;
      let next = draft;
      for (const trackId of ids) {
        next = removeAudioTrack(next, trackId);
      }
      if (next === draft) return;
      commitDraft(next);
      setTrackSelection(clearTrackSelection());
      setSoloAudioTrackIds((prev) => prev.filter((id) => !ids.includes(id)));
      setTrackVisibility((prev) =>
        ensureAudioTrackVisibility(prev, next.audioTracks),
      );
      return;
    }
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
    if (!lane) return false;
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
    } else if (isAudioSelectionLane(lane)) {
      clips = draft.audioClips.filter((c) => idSet.has(c.id));
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
    const clips = isAudioSelectionLane(lane)
      ? draft.audioClips.filter((c) => idSet.has(c.id))
      : lane === "forma"
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

  const splitSelectionAtPlayhead = useCallback((): boolean => {
    const draft = draftRef.current;
    const lane = primaryLane(clipSelection);
    const id = clipSelection.primaryId;
    if (!draft || !lane || !id) return false;
    const at = displayTicks;
    let next = draft;
    if (lane === "forma") {
      next = splitFormaClipAt(draft, id, at);
    } else if (lane === "tekst" || lane === "akordy" || lane === "cue") {
      next = splitContentClipAt(draft, lane, id, at);
    } else if (isAudioSelectionLane(lane)) {
      next = splitAudioClipAt(draft, id, at);
    } else {
      return false;
    }
    if (next === draft) return false;
    commitDraft(next);
    return true;
  }, [clipSelection, commitDraft, displayTicks]);

  const joinSelectionAdjacent = useCallback((): boolean => {
    const draft = draftRef.current;
    const lane = primaryLane(clipSelection);
    const id = clipSelection.primaryId;
    if (!draft || !lane || !id) return false;
    let next = draft;
    if (lane === "forma") {
      next = joinFormaAtClick(draft, id, displayTicks);
    } else if (lane === "tekst" || lane === "akordy" || lane === "cue") {
      next = joinAdjacentContentClips(draft, lane, id);
    } else if (isAudioSelectionLane(lane)) {
      next = joinAdjacentAudioClips(draft, id);
    } else {
      return false;
    }
    if (next === draft) return false;
    commitDraft(next);
    return true;
  }, [clipSelection, commitDraft, displayTicks]);

  const setCycleFromSelectedAudioClip = useCallback((): boolean => {
    const draft = draftRef.current;
    const lane = primaryLane(clipSelection);
    const id = clipSelection.primaryId;
    if (!draft || !id || !isAudioSelectionLane(lane)) return false;
    const clip = draft.audioClips.find((c) => c.id === id);
    if (!clip || clip.lengthTicks < 1) return false;
    void setLoop({
      enabled: true,
      startTicks: clip.startTicks,
      endTicks: clip.startTicks + clip.lengthTicks,
    });
    return true;
  }, [clipSelection, setLoop]);

  const nudgeSelectedClip = useCallback(
    (dir: -1 | 1) => {
      const draft = draftRef.current;
      const lane = primaryLane(clipSelection);
      const id = clipSelection.primaryId;
      if (!draft || !lane || !id) return;
      const next = applyTimelineNudge(
        draft,
        lane,
        id,
        dir < 0 ? "move-left" : "move-right",
        snapMode,
      );
      if (next !== draft) commitDraft(next);
    },
    [clipSelection, commitDraft, snapMode],
  );

  const playFromSelectionOrLocator = useCallback(async () => {
    if (audioBuffering) return;
    const draft = draftRef.current;
    const lane = primaryLane(clipSelectionRef.current);
    const id = clipSelectionRef.current.primaryId;
    let startTicks = locatorTicks;
    if (draft && lane && id) {
      if (lane === "forma") {
        const c = draft.forma.clips.find((x) => x.id === id);
        if (c) startTicks = c.startTicks;
      } else if (lane === "tekst") {
        const c = draft.tekst.clips.find((x) => x.id === id);
        if (c) startTicks = c.startTicks;
      } else if (lane === "akordy") {
        const c = draft.akordy.clips.find((x) => x.id === id);
        if (c) startTicks = c.startTicks;
      } else if (lane === "cue") {
        const c = draft.cue.clips.find((x) => x.id === id);
        if (c) startTicks = c.startTicks;
      } else if (isAudioSelectionLane(lane)) {
        const c = draft.audioClips.find((x) => x.id === id);
        if (c) startTicks = c.startTicks;
      }
    }
    setLocatorTicks(startTicks);
    allowAudioPlayback();
    await resumeMetronomeAudio(getMetronomeAudioContext());
    if (projectId && draft) {
      setAudioBuffering(true);
      try {
        const buffered = await ensureAudioBuffered(
          projectId,
          draft,
          startTicks,
        );
        setFailedAudioAssetIds(
          buffered.failedAssetIds.length
            ? buffered.failedAssetIds
            : getFailedAudioAssetIds(projectId),
        );
      } finally {
        setAudioBuffering(false);
      }
      restartAudioPlayback(projectId, {
        project: draft,
        playing: true,
        displayTicks:
          startTicks +
          ticksFromSyncLeadMs(latencyCompMs, state.bpm, state.ppq),
        soloTrackIds: soloAudioTrackIds,
        soloBusIds,
      });
    }
    metroBeatRef.current = metronomeBeatIndex(
      startTicks,
      state.timeSignature,
      state.ppq,
    );
    if (startTicks !== state.positionTicks) {
      await seek(startTicks);
    }
    await play({ projectId });
  }, [
    audioBuffering,
    latencyCompMs,
    locatorTicks,
    play,
    projectId,
    seek,
    soloAudioTrackIds,
    soloBusIds,
    state.bpm,
    state.positionTicks,
    state.ppq,
    state.timeSignature,
  ]);

  /** Bare I — show/hide Właściwości only (never Metadane / songMetaOpen). */
  const toggleInspectorPanel = useCallback(() => {
    setInspectorVisible((v) => !v);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableKeyboardTarget(e.target)) {
        return;
      }
      const h = keyHandlersRef.current;
      const action = resolveTimelineShortcut({
        key: e.key,
        code: e.code,
        mod: e.metaKey || e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        toolMenuOpen: Boolean(toolMenu),
        wandMenuOpen: wandMenuOpenRef.current,
        helpOpen,
        tapToolActive: toolRef.current === "tap",
      });
      if (!action) return;

      if (typeof action === "object" && action.type === "tool-letter") {
        const pick = TOOL_BY_KEY[action.letter];
        if (pick) {
          e.preventDefault();
          onTool(pick.id);
        }
        return;
      }

      e.preventDefault();

      switch (action) {
        case "help-open":
          setHelpOpen(true);
          return;
        case "help-close":
          setHelpOpen(false);
          return;
        case "escape": {
          if (toolMenu) {
            setToolMenu(null);
            return;
          }
          if (wandMenuOpenRef.current) {
            setWandMenu(null);
            setTool("pointer");
            return;
          }
          if (eyeMenuPos) {
            setEyeMenuPos(null);
            setEyeOpen(false);
            return;
          }
          if (toolsVisOpen) {
            setToolsVisOpen(false);
            return;
          }
          closeContextMenu();
          if (toolRef.current === "tap") {
            setTool("pointer");
            return;
          }
          if (toolRef.current !== "pointer") {
            setTool("pointer");
          }
          closeMobileInspector();
          return;
        }
        case "save":
          if (h.dirty && !h.savePending) void h.onSave();
          return;
        case "undo":
          h.onUndo();
          return;
        case "redo":
          h.onRedo();
          return;
        case "copy":
          copyClipSelection();
          return;
        case "cut":
          cutClipSelection();
          return;
        case "paste":
          pasteClipClipboard(locatorTicks);
          return;
        case "duplicate":
          duplicateClipSelection();
          return;
        case "select-all": {
          const draft = draftRef.current;
          if (!draft) return;
          setClipSelection(selectAllProjectClips(draft));
          setSongMetaOpen(false);
          clearMapSelection();
          setSelectedAnchorId(null);
          setTrackSelection(clearTrackSelection());
          return;
        }
        case "split-at-playhead":
          splitSelectionAtPlayhead();
          return;
        case "join-adjacent":
          joinSelectionAdjacent();
          return;
        case "zoom-h-out":
          h.zoomHorizontalBySteps(-1);
          return;
        case "zoom-h-in":
          h.zoomHorizontalBySteps(1);
          return;
        case "zoom-v-in":
          h.zoomVerticalBySteps(1);
          return;
        case "zoom-v-out":
          h.zoomVerticalBySteps(-1);
          return;
        case "fit-zoom":
          h.fitZoom();
          return;
        case "play-pause": {
          if (toolRef.current === "tap") {
            const draft = draftRef.current;
            if (!draft) return;
            const queue = vocalTapQueue(draft);
            const clip = queue[tapLineIndexRef.current];
            if (!clip) return;
            const next = applyVocalTap(
              draft,
              clip.id,
              effectiveLocatorTicksRef.current,
            );
            commitDraft(next);
            setTapLineIndex((i) =>
              Math.min(i + 1, Math.max(0, queue.length - 1)),
            );
            return;
          }
          h.onPlayOrPause();
          return;
        }
        case "play-from-selection":
          void playFromSelectionOrLocator();
          return;
        case "stop-home":
          void h.onStop();
          return;
        case "cycle-toggle":
          h.onLoopToggle();
          return;
        case "metronome-toggle":
          void h.onMetronomeToggle();
          return;
        case "cycle-from-clip":
          setCycleFromSelectedAudioClip();
          return;
        case "toggle-mixer":
          setTimelineSurface((s) =>
            s === "mixer" ? "timeline" : "mixer",
          );
          return;
        case "toggle-inspector":
          toggleInspectorPanel();
          return;
        case "wand-tool":
          h.onTool("wand");
          return;
        case "tool-menu-toggle": {
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
        case "locator-left":
          h.nudgeLocator(-1);
          return;
        case "locator-right":
          h.nudgeLocator(1);
          return;
        case "nudge-clip-left":
          nudgeSelectedClip(-1);
          return;
        case "nudge-clip-right":
          nudgeSelectedClip(1);
          return;
        case "setlist-prev": {
          const id = h.prevSetlistId;
          if (id) navigate(`/timeline/${id}`);
          return;
        }
        case "setlist-next": {
          const id = h.nextSetlistId;
          if (id) navigate(`/timeline/${id}`);
          return;
        }
        case "delete-selection":
          deleteSelectedFormaClip();
          return;
        case "tap-line-prev": {
          setTapLineIndex((i) => Math.max(0, i - 1));
          return;
        }
        case "tap-line-next": {
          const draft = draftRef.current;
          const queue = draft ? vocalTapQueue(draft) : [];
          const max = Math.max(0, queue.length - 1);
          setTapLineIndex((i) => Math.min(max, i + 1));
          return;
        }
        case "wand-tekst":
          h.applyWand("tekst");
          return;
        case "wand-akordy":
          h.applyWand("akordy");
          return;
        case "wand-both":
          h.applyWand("both");
          return;
        default:
          return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    clearMapSelection,
    closeContextMenu,
    closeMobileInspector,
    commitDraft,
    copyClipSelection,
    cutClipSelection,
    deleteSelectedFormaClip,
    duplicateClipSelection,
    eyeMenuPos,
    helpOpen,
    joinSelectionAdjacent,
    locatorTicks,
    navigate,
    nudgeSelectedClip,
    pasteClipClipboard,
    playFromSelectionOrLocator,
    setCycleFromSelectedAudioClip,
    splitSelectionAtPlayhead,
    toggleInspectorPanel,
    toolMenu,
    toolsVisOpen,
  ]);

  useEffect(() => {
    const scrollEl = document.querySelector(
      "[data-canvas-scroll]",
    ) as HTMLElement | null;
    if (!scrollEl) return;

    function onWheel(e: WheelEvent) {
      if (isEditableKeyboardTarget(document.activeElement)) {
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

  const bindTrackRowsRef = useCallback((node: HTMLDivElement | null) => {
    trackRowsRoRef.current?.disconnect();
    trackRowsRoRef.current = null;
    if (!node) return;
    const sync = () => {
      node.style.setProperty("--tl-track-rows-h", `${node.clientHeight}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(node);
    trackRowsRoRef.current = ro;
  }, []);

  useEffect(() => {
    return () => {
      trackRowsRoRef.current?.disconnect();
      trackRowsRoRef.current = null;
    };
  }, []);

  useEffect(() => {
    saveZoomPrefs({ zoomH, zoomV, zoomUi });
  }, [zoomH, zoomV, zoomUi]);

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

  useLayoutEffect(() => {
    if (!toolsVisOpen) {
      setToolsVisMenuPos(null);
      return;
    }

    function updateToolsVisMenuPos() {
      const btn = toolsVisBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setToolsVisMenuPos({ top: rect.bottom, left: rect.left });
    }

    updateToolsVisMenuPos();
    window.addEventListener("resize", updateToolsVisMenuPos);
    return () => {
      window.removeEventListener("resize", updateToolsVisMenuPos);
    };
  }, [toolsVisOpen]);

  useEffect(() => {
    if (!toolsVisOpen) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (toolsVisBtnRef.current?.contains(target)) return;
      if (toolsVisMenuRef.current?.contains(target)) return;
      setToolsVisOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [toolsVisOpen]);

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

  const effectiveLocatorTicks = vocalTapMarkTicks(
    state.playing,
    displayTicks,
    locatorTicks,
  );
  effectiveLocatorTicksRef.current = effectiveLocatorTicks;

  /** v4: while Tap is active, highlight the queue line Space will mark next. */
  const tapActiveClipId = useMemo(() => {
    if (tool !== "tap" || !draftProject) return null;
    const queue = vocalTapQueue(draftProject);
    if (queue.length === 0) return null;
    return queue[Math.min(tapLineIndex, queue.length - 1)]?.id ?? null;
  }, [tool, draftProject, tapLineIndex]);
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
  const selectedDockAudioTrack =
    draftProject && primaryAudioTrackId(trackSelection)
      ? draftProject.audioTracks.find(
          (tr) => tr.id === primaryAudioTrackId(trackSelection),
        ) ?? null
      : null;
  const selectedAnchor =
    draftProject && selectedAnchorId
      ? scoreAnchors(draftProject).find((a) => a.id === selectedAnchorId) ??
        null
      : null;

  /** Panel visibility — bare I (not Metadane ⓘ). Hidden in Mixer; state kept for restore. */
  const inspectorOpen =
    inspectorVisible && timelineSurface !== "mixer";

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
  // Latency compensation is a client-only tick offset (Preferences); SSOT unchanged.
  useEffect(() => {
    if (!projectId || !draftProject) {
      stopAudioPlayback();
      return;
    }
    if (!state.playing) {
      // SSOT paused/stopped — clear local suppress from Pause/Stop click RTT.
      allowAudioPlayback();
      stopAudioPlayback();
      return;
    }
    const audioTicks =
      displayTicks +
      ticksFromSyncLeadMs(latencyCompMs, state.bpm, state.ppq);
    syncAudioPlayback(projectId, {
      project: draftProject,
      playing: state.playing,
      displayTicks: audioTicks,
      soloTrackIds: soloAudioTrackIds,
      soloBusIds,
    });
  }, [
    projectId,
    draftProject,
    state.playing,
    displayTicks,
    state.bpm,
    state.ppq,
    latencyCompMs,
    soloAudioTrackIds,
    soloBusIds,
  ]);

  useEffect(() => {
    return () => {
      stopAudioPlayback();
      if (projectId) clearAudioBufferCache(projectId);
    };
  }, [projectId]);

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
        if (cancelled) return;
        setFailedAudioAssetIds(getFailedAudioAssetIds(projectId));
        if (!buf) continue;
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
      if (!detail) return;
      const h = keyHandlersRef.current;
      switch (detail.action) {
        case "save":
          if (h.dirty && !h.savePending) void h.onSave();
          break;
        case "edit-undo":
          h.onUndo();
          break;
        case "edit-redo":
          h.onRedo();
          break;
        case "edit-delete":
          deleteSelectedFormaClip();
          break;
        case "view-zoom-in":
          h.zoomHorizontalBySteps(1);
          break;
        case "view-zoom-out":
          h.zoomHorizontalBySteps(-1);
          break;
        case "view-zoom-reset":
          h.fitZoom();
          break;
        case "help-shortcuts":
          setHelpOpen(true);
          break;
        default:
          break;
      }
    }
    window.addEventListener(DESKTOP_MENU_EVENT, onMenu);
    return () => window.removeEventListener(DESKTOP_MENU_EVENT, onMenu);
  }, [deleteSelectedFormaClip]);

  useEffect(() => {
    const canU = Boolean(draftHistory && canUndo(draftHistory));
    const canR = Boolean(draftHistory && canRedo(draftHistory));
    void syncEditHistoryState(canU, canR);
  }, [draftHistory]);

  useEffect(() => {
    return () => {
      void syncEditHistoryState(false, false);
    };
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
      setDraftProject(next.present.project);
      setClipSelection(next.present.clipSelection);
      return next;
    });
  }

  function onRedo() {
    setDraftHistory((h) => {
      if (!h || !canRedo(h)) return h;
      const next = redoDraft(h);
      setDraftProject(next.present.project);
      setClipSelection(next.present.clipSelection);
      return next;
    });
  }

  async function onPlayClick() {
    allowAudioPlayback();
    await resumeMetronomeAudio(getMetronomeAudioContext());
    if (projectId && draftProject) {
      setAudioBuffering(true);
      try {
        const buffered = await ensureAudioBuffered(
          projectId,
          draftProject,
          locatorTicks,
        );
        setFailedAudioAssetIds(
          buffered.failedAssetIds.length
            ? buffered.failedAssetIds
            : getFailedAudioAssetIds(projectId),
        );
      } finally {
        setAudioBuffering(false);
      }
      restartAudioPlayback(projectId, {
        project: draftProject,
        playing: true,
        displayTicks:
          locatorTicks +
          ticksFromSyncLeadMs(latencyCompMs, state.bpm, state.ppq),
        soloTrackIds: soloAudioTrackIds,
        soloBusIds,
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

  async function onPauseClick() {
    // Halt WebAudio immediately — do not wait for pause RTT (#352).
    suppressAudioPlayback();
    await pause();
  }

  async function onStopClick() {
    suppressAudioPlayback();
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
    persistMetronomeOn(next);
    setMetronomeOn(next);
  }

  /** Tekst dock Tap — activates vocal-tap tool + records tempo taps (no hotkey). */
  function onTap() {
    setTool("tap");
    setToolMenu(null);
    setWandMenu(null);
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
    clientY?: number,
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
        clientY,
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

    if (tool === "join") {
      const next = joinAdjacentContentClips(draftProject, lane, clip.id);
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
    if (tool === "scissors") {
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      const next = splitAudioClipAt(draftProject, clip.id, raw);
      if (next !== draftProject) commitDraft(next);
      return;
    }
    if (tool === "join") {
      const next = joinAdjacentAudioClips(draftProject, clip.id);
      if (next !== draftProject) commitDraft(next);
      return;
    }
    if (tool === "mute") {
      commitDraft(toggleAudioClipMute(draftProject, clip.id));
      return;
    }
    if (tool === "solo") {
      const trackId = audioTrackIdFromLane(lane);
      soloHoldRef.current = soloAudioTrackIds;
      setSoloAudioTrackIds([trackId]);
      const release = () => {
        if (soloHoldRef.current) {
          setSoloAudioTrackIds(soloHoldRef.current);
          soloHoldRef.current = null;
        }
        window.removeEventListener("pointerup", release);
        window.removeEventListener("blur", release);
      };
      window.addEventListener("pointerup", release);
      window.addEventListener("blur", release);
      return;
    }
    if (tool === "fade") {
      if (!gesturePolicy.clipDragResize) {
        selectLaneClip(lane, clip.id);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const zone = hitTestAudioClipZone(
        e.clientX - rect.left,
        e.clientY - rect.top,
        rect.width,
        rect.height,
        true,
        true,
      );
      const fadeKind =
        zone === "fade-out" || zone === "end" ? "fade-out" : "fade-in";
      const full = draftProject.audioClips.find((c) => c.id === clip.id);
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null || !full) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const session: FormaGestureSession = {
        kind: fadeKind,
        clipId: clip.id,
        pointerId: e.pointerId,
        originTicks: raw,
        originClipStart: clip.startTicks,
        originClipLength: clip.lengthTicks,
        lane,
        originClientX: e.clientX,
        originFadeMs:
          fadeKind === "fade-in" ? full.fadeInMs ?? 0 : full.fadeOutMs ?? 0,
      };
      beginFormaGesture(
        session,
        previewAudioFromSession(
          draftProject,
          session,
          raw,
          e.metaKey,
          e.ctrlKey,
        ),
      );
      return;
    }
    if (tool === "gain") {
      if (!gesturePolicy.clipDragResize) {
        selectLaneClip(lane, clip.id);
        return;
      }
      const full = draftProject.audioClips.find((c) => c.id === clip.id);
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null || !full) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const session: FormaGestureSession = {
        kind: "gain",
        clipId: clip.id,
        pointerId: e.pointerId,
        originTicks: raw,
        originClipStart: clip.startTicks,
        originClipLength: clip.lengthTicks,
        lane,
        originClientX: e.clientX,
        originClientY: e.clientY,
        originGainDb: full.gainDb ?? 0,
      };
      beginFormaGesture(
        session,
        previewAudioFromSession(
          draftProject,
          session,
          raw,
          e.metaKey,
          e.ctrlKey,
          e.clientY,
        ),
      );
      return;
    }
    if (toolIsPencilDraw(tool) || tool === "marquee" || tool === "zoom") {
      return;
    }
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
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      const hit =
        formaSectionCoveringTicks(draftProject, raw) ??
        (selectedClipId
          ? draftProject.forma.clips.find(
              (c) => c.id === selectedClipId && c.kind === "section",
            )
          : null);
      if (!hit) return;
      clearMapSelection();
      selectLaneClip("forma", hit.id);
      const next = splitFormaClipAt(draftProject, hit.id, raw);
      if (next !== draftProject) commitDraft(next);
      return;
    }
    if (!toolIsPencilDraw(tool)) {
      if (toolUsesMarqueeGesture(tool)) {
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

    if (tool === "join") {
      if (clip.kind === "countdown") return;
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      const next = joinFormaAtClick(draftProject, clip.id, raw);
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
          : cascadeFormaMoveIds(draftProject.forma.clips, clip.id)
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
    updateFormaGesturePreview(raw, e.metaKey, e.ctrlKey, e.clientX, e.clientY);
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
      if (toolRef.current === "zoom" || heldZoomRef.current) {
        fitZoom();
        return;
      }
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
    if (toolRef.current === "zoom" || heldZoomRef.current) {
      const boxW = box.right - box.left;
      const scroll = canvasScrollRef.current;
      if (scroll && boxW > 16) {
        const ratio = scroll.clientWidth / boxW;
        const next = Math.round(zoomHBaseRef.current * ratio);
        setZoomH(Math.min(ZOOM_H_MAX, Math.max(ZOOM_H_MIN, next)));
        requestAnimationFrame(() => {
          scroll.scrollLeft = Math.max(0, box.left * ratio - 24);
        });
      }
      return;
    }
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
      const nextHeld = e.ctrlKey && e.altKey;
      if (nextHeld !== heldZoomRef.current) {
        heldZoomRef.current = nextHeld;
        setHeldZoom(nextHeld);
      }
    }
    function onKeyChange(e: KeyboardEvent) {
      if (e.key !== "Control" && e.key !== "Alt" && e.key !== "Meta") return;
      const nextHeld = e.ctrlKey && e.altKey;
      if (nextHeld !== heldZoomRef.current) {
        heldZoomRef.current = nextHeld;
        setHeldZoom(nextHeld);
      }
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("keydown", onKeyChange);
    window.addEventListener("keyup", onKeyChange);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKeyChange);
      window.removeEventListener("keyup", onKeyChange);
    };
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
    source: "ruler-loop" | "ruler-beat" | "locator",
  ) {
    if (e.button !== 0) return;
    const raw = rawTicksAtClientX(e.clientX);
    if (raw == null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const existing = usableLoopRange(state.loop);
    if (source === "ruler-loop") {
      if (existing && ticksInLoopRegion(raw, existing)) {
        loopDragRef.current = {
          pointerId: e.pointerId,
          originTicks: raw,
          originClientX: e.clientX,
          source,
          kind: "move",
          moveOriginRange: existing,
        };
        setLoopDraft(existing);
        return;
      }
      loopDragRef.current = {
        pointerId: e.pointerId,
        originTicks: raw,
        originClientX: e.clientX,
        source,
        kind: "create",
      };
      setLoopDraft(null);
      return;
    }
    loopDragRef.current = {
      pointerId: e.pointerId,
      originTicks: raw,
      originClientX: e.clientX,
      source,
      kind: "seek",
    };
    setLoopDraft(null);
    setLocatorFromClientX(e.clientX, {
      seekTransport: true,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
    });
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
    const mode = contentSnapModeFromModifiers(e.metaKey, e.ctrlKey);
    if (drag.kind === "create" && draftProject) {
      const dx = Math.abs(e.clientX - drag.originClientX);
      if (dx >= 5) {
        const a = Math.min(drag.originTicks, raw);
        const b = Math.max(drag.originTicks, raw);
        setLoopDraft(snapLoopRange(draftProject, a, b, mode));
      }
      return;
    }
    if (drag.kind === "move" && drag.moveOriginRange && draftProject) {
      const delta = raw - drag.originTicks;
      setLoopDraft(
        snapMovedLoopRange(draftProject, drag.moveOriginRange, delta, mode),
      );
      return;
    }
    setLocatorFromClientX(e.clientX, {
      seekTransport: true,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
    });
  }

  function onLocatorPointerUp(e: React.PointerEvent<HTMLElement>) {
    const drag = loopDragRef.current;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!drag || drag.pointerId !== e.pointerId) return;
    const draft = loopDraftRef.current;
    const dx = Math.abs(e.clientX - drag.originClientX);
    loopDragRef.current = null;
    if (
      drag.kind === "create" &&
      draft &&
      draft.endTicks > draft.startTicks &&
      draftProject
    ) {
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
    if (drag.kind === "move" && drag.moveOriginRange) {
      if (dx < 5) {
        setLoopDraft(null);
        void setLoop({ enabled: !state.loop?.enabled });
        return;
      }
      if (draft && draft.endTicks > draft.startTicks) {
        void setLoop({
          enabled: state.loop?.enabled ?? true,
          startTicks: draft.startTicks,
          endTicks: draft.endTicks,
        }).finally(() => setLoopDraft(null));
        return;
      }
    }
    setLoopDraft(null);
    if (drag.kind === "seek") {
      setLocatorFromClientX(e.clientX, {
        seekTransport: true,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
      });
    }
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

  function applyAbsoluteZoomH(nextBaseRaw: number, anchorViewportX?: number) {
    const scroll =
      canvasScrollRef.current ??
      (document.querySelector("[data-canvas-scroll]") as HTMLElement | null);
    const oldEff = zoomHRef.current;
    const nextBase = Math.min(
      ZOOM_H_MAX,
      Math.max(ZOOM_H_MIN, Math.round(nextBaseRaw)),
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

  function zoomHorizontalBySteps(
    steps: number,
    anchorViewportX?: number,
  ) {
    if (!steps) return;
    applyAbsoluteZoomH(
      zoomHBaseRef.current + steps * ZOOM_H_STEP,
      anchorViewportX,
    );
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

  function beginDockWidthResize(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 || touchTier === "mobile") return;
    e.preventDefault();
    e.stopPropagation();
    dockWidthResizeRef.current = {
      startX: e.clientX,
      startWidthBase: dockWidthBaseRef.current,
      pointerId: e.pointerId,
    };
    setDockWidthResizing(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onDockWidthResizePointerMove(
    e: React.PointerEvent<HTMLButtonElement>,
  ) {
    const drag = dockWidthResizeRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const scale = uiScaleRef.current || 1;
    const dx = e.clientX - drag.startX;
    const nextBase = clampDockWidth(drag.startWidthBase + dx / scale);
    dockWidthBaseRef.current = nextBase;
    setDockWidthBase(nextBase);
  }

  function endDockWidthResize(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dockWidthResizeRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    dockWidthResizeRef.current = null;
    setDockWidthResizing(false);
    saveDockWidth(dockWidthBaseRef.current);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
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
    if (draftProject.audioTracks.length >= MAX_AUDIO_TRACKS) {
      setLoadError(`Limit ścieżek audio (${MAX_AUDIO_TRACKS}) osiągnięty`);
      return;
    }
    const { project, trackId } = addAudioTrack(draftProject);
    commitDraft(project);
    setClipSelection(clearSelection());
    setTrackSelection(selectAudioTrack(trackId));
    setInspectorVisible(true);
    setEyeOpen(false);
    setTrackVisibility((prev) =>
      ensureAudioTrackVisibility(prev, project.audioTracks),
    );
  }

  function onRemoveAudioTrack(trackId: string) {
    if (!draftProject) return;
    const next = removeAudioTrack(draftProject, trackId);
    if (next === draftProject) return;
    commitDraft(next);
    setClipSelection(clearSelection());
    setTrackSelection(
      pruneTrackSelection(
        trackSelection,
        new Set(next.audioTracks.map((t) => t.id)),
      ),
    );
    setSoloAudioTrackIds((prev) => prev.filter((id) => id !== trackId));
    setTrackVisibility((prev) =>
      ensureAudioTrackVisibility(prev, next.audioTracks),
    );
    if (trackRename?.trackId === trackId) setTrackRename(null);
  }

  function onDuplicateAudioTrack(trackId: string) {
    if (!draftProject) return;
    if (draftProject.audioTracks.length >= MAX_AUDIO_TRACKS) {
      setLoadError(`Limit ścieżek audio (${MAX_AUDIO_TRACKS}) osiągnięty`);
      return;
    }
    try {
      const result = duplicateAudioTrack(draftProject, trackId);
      if (!result) return;
      commitDraft(result.project);
      setClipSelection(clearSelection());
      setTrackSelection(selectAudioTrack(result.trackId));
      setTrackVisibility((prev) =>
        ensureAudioTrackVisibility(prev, result.project.audioTracks),
      );
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Nie udało się zduplikować ścieżki",
      );
    }
  }

  function openTrackRename(trackId: string) {
    const name =
      draftProject?.audioTracks.find((t) => t.id === trackId)?.name ?? "";
    setTrackRename({ trackId, name });
  }

  function openAudioTrackContextMenu(
    trackId: string,
    clientX: number,
    clientY: number,
  ) {
    setClipSelection(clearSelection());
    if (!isAudioTrackSelected(trackSelection, trackId)) {
      setTrackSelection(selectAudioTrack(trackId));
    }
    openContextMenu({
      x: clientX,
      y: clientY,
      label: "Menu ścieżki audio",
      items: buildAudioTrackContextMenuItems({
        canDuplicate:
          (draftProject?.audioTracks.length ?? 0) < MAX_AUDIO_TRACKS,
        onRename: () => openTrackRename(trackId),
        onDuplicate: () => onDuplicateAudioTrack(trackId),
        onRemove: () => onRemoveAudioTrack(trackId),
      }),
    });
  }

  function commitTrackRename() {
    if (!draftProject || !trackRename) return;
    const next = setAudioTrackName(
      draftProject,
      trackRename.trackId,
      trackRename.name,
    );
    if (next !== draftProject) commitDraft(next);
    setTrackRename(null);
  }

  function cancelTrackRename() {
    setTrackRename(null);
  }

  function onAudioTrackHeaderClick(
    e: React.MouseEvent,
    trackId: string,
  ) {
    if ((e.target as HTMLElement).closest("button, label, input")) {
      return;
    }
    setClipSelection(clearSelection());
    const orderedIds = (draftProject?.audioTracks ?? []).map((t) => t.id);
    if (e.shiftKey) {
      setTrackSelection(
        selectAudioTrackRange(trackSelection, trackId, orderedIds),
      );
    } else if (isMultiSelectClick(e)) {
      setTrackSelection(toggleAudioTrackSelected(trackSelection, trackId));
    } else {
      setTrackSelection(selectAudioTrack(trackId));
    }
    setInspectorVisible(true);
  }

  function onAudioTrackSoloClick(e: React.MouseEvent, trackId: string) {
    const allIds = (draftProject?.audioTracks ?? []).map((t) => t.id);
    setSoloAudioTrackIds((prev) =>
      applySoloButtonClick(prev, trackId, allIds, trackSelection.ids, e),
    );
    setSoloBusIds([]);
  }

  function onAudioTrackMuteClick(e: React.MouseEvent, trackId: string) {
    if (!draftProject) return;
    const track = draftProject.audioTracks.find((t) => t.id === trackId);
    if (!track) return;
    const allIds = draftProject.audioTracks.map((t) => t.id);
    const { trackIds, muted } = resolveMuteButtonClick(
      trackId,
      Boolean(track.muted),
      allIds,
      trackSelection.ids,
      e,
    );
    commitDraft(setAudioTracksMuted(draftProject, trackIds, muted));
  }

  function buildChannelStripCallbacks(trackId: string): ChannelStripCallbacks {
    return {
      onSelect: (e) => onAudioTrackHeaderClick(e, trackId),
      onContextMenu: (e) => {
        e.preventDefault();
        e.stopPropagation();
        openAudioTrackContextMenu(trackId, e.clientX, e.clientY);
      },
      onSoloClick: (e) => onAudioTrackSoloClick(e, trackId),
      onMuteClick: (e) => onAudioTrackMuteClick(e, trackId),
      onGainChange: (v) => {
        if (!draftProject) return;
        commitDraft(setAudioTrackGainDb(draftProject, trackId, v));
      },
      onGainReset: () => {
        if (!draftProject) return;
        commitDraft(setAudioTrackGainDb(draftProject, trackId, 0));
      },
      onPanChange: (v) => {
        if (!draftProject) return;
        commitDraft(setAudioTrackPan(draftProject, trackId, v));
      },
      onPanReset: () => {
        if (!draftProject) return;
        commitDraft(setAudioTrackPan(draftProject, trackId, 0));
      },
      onChannelModeChange: (mode) => {
        if (!draftProject) return;
        commitDraft(setAudioTrackChannelMode(draftProject, trackId, mode));
      },
      onColorChange: (color) => {
        if (!draftProject) return;
        commitDraft(setAudioTrackColor(draftProject, trackId, color));
      },
      onIconChange: (icon) => {
        if (!draftProject) return;
        commitDraft(setAudioTrackIcon(draftProject, trackId, icon));
      },
      onOutputChange: (output) => {
        if (!draftProject) return;
        commitDraft(setAudioTrackOutput(draftProject, trackId, output));
      },
      onNameDoubleClick: () => openTrackRename(trackId),
      onRenameChange: (name) => {
        setTrackRename((prev) =>
          prev && prev.trackId === trackId ? { ...prev, name } : prev,
        );
      },
      onRenameCommit: commitTrackRename,
      onRenameCancel: cancelTrackRename,
    };
  }

  function buildMasterStripCallbacks(): MasterStripCallbacks {
    return {
      onGainChange: (v) => {
        if (!draftProject) return;
        commitDraft(setMasterGainDb(draftProject, v));
      },
      onGainReset: () => {
        if (!draftProject) return;
        commitDraft(setMasterGainDb(draftProject, 0));
      },
    };
  }

  function openBusRename(busId: string) {
    const name =
      draftProject?.audioBusses?.find((b) => b.id === busId)?.name ?? "";
    setBusRename({ busId, name });
  }

  function commitBusRename() {
    if (!draftProject || !busRename) return;
    const next = setAudioBusName(
      draftProject,
      busRename.busId,
      busRename.name,
    );
    if (next !== draftProject) commitDraft(next);
    setBusRename(null);
  }

  function openBusContextMenu(busId: string, clientX: number, clientY: number) {
    openContextMenu({
      x: clientX,
      y: clientY,
      label: "Menu busa",
      items: [
        {
          id: "rename",
          label: "Zmień nazwę",
          onSelect: () => openBusRename(busId),
        },
        {
          id: "remove",
          label: "Usuń bus",
          danger: true,
          onSelect: () => {
            if (!draftProject) return;
            commitDraft(removeAudioBus(draftProject, busId));
            setSoloBusIds((prev) => prev.filter((id) => id !== busId));
          },
        },
      ],
    });
  }

  function onAddBus() {
    if (!draftProject) return;
    try {
      const { project } = addAudioBus(draftProject);
      commitDraft(project);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Nie udało się dodać busa",
      );
    }
  }

  function buildBusCallbacks(busId: string): ChannelStripCallbacks {
    return {
      onSelect: () => {
        /* bus selection not in trackSelection */
      },
      onContextMenu: (e) => {
        e.preventDefault();
        e.stopPropagation();
        openBusContextMenu(busId, e.clientX, e.clientY);
      },
      onSoloClick: (e) => {
        e.stopPropagation();
        const allIds = (draftProject?.audioBusses ?? []).map((b) => b.id);
        setSoloBusIds((prev) => {
          const on = prev.includes(busId);
          if (e.altKey) return on && prev.length === 1 ? [] : [busId];
          if (on) return prev.filter((id) => id !== busId);
          return [...prev, busId].filter((id) => allIds.includes(id));
        });
        // Bus solo clears track solo (exclusive lanes).
        setSoloAudioTrackIds([]);
      },
      onMuteClick: (e) => {
        e.stopPropagation();
        if (!draftProject) return;
        const bus = draftProject.audioBusses?.find((b) => b.id === busId);
        commitDraft(
          setAudioBusMuted(draftProject, busId, !bus?.muted),
        );
      },
      onGainChange: (v) => {
        if (!draftProject) return;
        commitDraft(setAudioBusGainDb(draftProject, busId, v));
      },
      onGainReset: () => {
        if (!draftProject) return;
        commitDraft(setAudioBusGainDb(draftProject, busId, 0));
      },
      onPanChange: (v) => {
        if (!draftProject) return;
        commitDraft(setAudioBusPan(draftProject, busId, v));
      },
      onPanReset: () => {
        if (!draftProject) return;
        commitDraft(setAudioBusPan(draftProject, busId, 0));
      },
      onChannelModeChange: (mode) => {
        if (!draftProject) return;
        commitDraft(setAudioBusChannelMode(draftProject, busId, mode));
      },
      onNameDoubleClick: () => openBusRename(busId),
      onRenameChange: (name) => {
        setBusRename((prev) =>
          prev && prev.busId === busId ? { ...prev, name } : prev,
        );
      },
      onRenameCommit: commitBusRename,
      onRenameCancel: () => setBusRename(null),
    };
  }

  async function onUploadAudioToTrack(trackId: string, file: File) {
    if (!projectId || !draftProject) return;
    if (audioUploadPendingRef.current) return;
    audioUploadPendingRef.current = true;
    setAudioUploadPending(true);
    try {
      const next = await uploadProjectAudio(projectId, file);
      // Prefer the uploaded clip on the chosen track when server put it on track 0
      let project = next;
      let targetTrackId = trackId;
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
        targetTrackId = trackId || last.trackId;
        const buf = await loadAudioBuffer(projectId, last.assetId);
        if (buf) {
          project = setAudioTrackChannelMode(
            project,
            targetTrackId,
            channelModeFromChannelCount(buf.numberOfChannels),
          );
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
      setLoadError(
        err instanceof Error
          ? err.message
          : "Przesyłanie pliku audio nie powiodło się",
      );
    } finally {
      audioUploadPendingRef.current = false;
      setAudioUploadPending(false);
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

  function flashCanvasNotice(message: string) {
    if (canvasNoticeTimerRef.current) {
      clearTimeout(canvasNoticeTimerRef.current);
    }
    setCanvasNotice(message);
    canvasNoticeTimerRef.current = setTimeout(() => {
      setCanvasNotice(null);
      canvasNoticeTimerRef.current = null;
    }, 3200);
  }

  function applyWand(mode: WandMode) {
    const draft = draftRef.current;
    if (!draft) return;
    // v4 wandScopeSectionIds: Forma sections and/or enclosing sections of
    // selected Tekst/Akordy. Empty selection → whole song. Cue-only → abort.
    const selected = clipSelection.items;
    let scope: { sectionIds?: string[] } = {};
    if (selected.length > 0) {
      const sectionIds = new Set<string>();
      const music = draft.forma.clips.filter((c) => c.kind === "section");
      for (const item of selected) {
        if (item.lane === "forma") {
          const clip = draft.forma.clips.find((c) => c.id === item.id);
          if (clip?.kind === "section") sectionIds.add(clip.id);
          continue;
        }
        if (item.lane !== "tekst" && item.lane !== "akordy") continue;
        const content =
          item.lane === "tekst"
            ? draft.tekst.clips.find((c) => c.id === item.id)
            : draft.akordy.clips.find((c) => c.id === item.id);
        if (!content) continue;
        const host = music.find(
          (s) =>
            content.startTicks >= s.startTicks &&
            content.startTicks < s.startTicks + s.lengthTicks,
        );
        if (host) sectionIds.add(host.id);
      }
      if (sectionIds.size === 0) {
        flashCanvasNotice(
          "Zaznacz sekcję Formy albo clipy Tekstu/Akordów — Różdżka nie działa na Cue",
        );
        setWandMenu(null);
        setTool("pointer");
        return;
      }
      scope = { sectionIds: [...sectionIds] };
    }
    const result = placeContentFromForma(draft, mode, scope);
    if (!result.ok) {
      flashCanvasNotice(
        result.message || "Nie udało się rozmieścić treści Różdżką",
      );
      setWandMenu(null);
      setTool("pointer");
      return;
    }
    if (result.project !== draft) commitDraft(result.project);
    let msg = result.message || `Różdżka: ${result.placed} clipów`;
    if (result.approximate) {
      msg += " — przybliżone (doprecyzuj Tapem)";
    }
    flashCanvasNotice(msg);
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
      if (audioBuffering) return;
      void (state.playing ? onPauseClick() : onPlayClick());
    },
    onStop: onStopClick,
    onMetronomeToggle,
    onLoopToggle,
    onTool,
    applyWand,
    nudgeLocator,
    fitZoom,
    zoomHorizontalBySteps,
    applyAbsoluteZoomH,
    zoomVerticalBySteps,
    dirty,
    savePending,
    playing: state.playing,
    tool,
    prevSetlistId: prevSetlistId ?? null,
    nextSetlistId: nextSetlistId ?? null,
  };

  const canvasInnerWidth = `calc(var(--tl-dock-w) + ${canvasWidthPx}px)`;

  function openClipContextMenu(args: {
    clientX: number;
    clientY: number;
    lane: ClipMenuLane;
    clipId: string;
    clipMuted?: boolean;
    canSplit: boolean;
    canDelete?: boolean;
    selectionLane: Parameters<typeof selectLaneClip>[0];
  }) {
    const {
      clientX,
      clientY,
      lane,
      clipId,
      clipMuted,
      canSplit,
      canDelete = true,
    } = args;
    clearMapSelection();
    flushSync(() => {
      selectLaneClip(args.selectionLane, clipId);
    });
    const board = clipboardRef.current;
    const canPaste = Boolean(board);
    const splitTicks = rawTicksAtClientX(clientX);

    const copyThisClip = (): boolean => {
      const draft = draftRef.current;
      if (!draft) return false;
      let clips: Parameters<typeof buildClipboardFromClips>[1] = [];
      if (lane === "forma") {
        const c = draft.forma.clips.find(
          (x) => x.id === clipId && x.kind === "section",
        );
        if (c) clips = [c];
      } else if (lane === "tekst") {
        const c = draft.tekst.clips.find((x) => x.id === clipId);
        if (c) clips = [c];
      } else if (lane === "akordy") {
        const c = draft.akordy.clips.find((x) => x.id === clipId);
        if (c) clips = [c];
      } else if (lane === "cue") {
        const c = draft.cue.clips.find((x) => x.id === clipId);
        if (c) clips = [c];
      } else if (lane === "audio") {
        const c = draft.audioClips.find((x) => x.id === clipId);
        if (c) clips = [c];
      }
      const nextBoard = buildClipboardFromClips(args.selectionLane, clips);
      if (!nextBoard) return false;
      clipboardRef.current = nextBoard;
      return true;
    };

    const deleteThisClip = () => {
      const draft = draftRef.current;
      if (!draft || !canDelete) return;
      if (lane === "forma") {
        const next = deleteFormaClip(draft, clipId);
        if (next !== draft) commitDraft(next);
      } else if (lane === "tekst") {
        commitDraft(deleteTekstClip(draft, clipId));
      } else if (lane === "akordy") {
        commitDraft(deleteAkordyClip(draft, clipId));
      } else if (lane === "cue") {
        commitDraft(deleteCueClip(draft, clipId));
      } else if (lane === "audio") {
        const next = deleteClipsOnLane(draft, args.selectionLane, [clipId]);
        if (next !== draft) commitDraft(next);
      }
      setClipSelection(clearSelection());
    };

    openContextMenu({
      x: clientX,
      y: clientY,
      label: "Menu klipu",
      items: buildClipContextMenuItems({
        lane,
        canPaste,
        canSplit: canSplit && splitTicks != null,
        clipMuted,
        onCopy: () => {
          copyThisClip();
        },
        onCut: () => {
          if (!canDelete) return;
          if (!copyThisClip()) return;
          deleteThisClip();
        },
        onPaste: () => {
          pasteClipClipboard(locatorTicks);
        },
        onDuplicate: () => {
          if (!copyThisClip()) return;
          const draft = draftRef.current;
          if (!draft) return;
          let end = 0;
          if (lane === "forma") {
            const c = draft.forma.clips.find((x) => x.id === clipId);
            if (c) end = c.startTicks + c.lengthTicks;
          } else if (lane === "tekst") {
            const c = draft.tekst.clips.find((x) => x.id === clipId);
            if (c) end = c.startTicks + c.lengthTicks;
          } else if (lane === "akordy") {
            const c = draft.akordy.clips.find((x) => x.id === clipId);
            if (c) end = c.startTicks + c.lengthTicks;
          } else if (lane === "cue") {
            const c = draft.cue.clips.find((x) => x.id === clipId);
            if (c) end = c.startTicks + c.lengthTicks;
          } else if (lane === "audio") {
            const c = draft.audioClips.find((x) => x.id === clipId);
            if (c) end = c.startTicks + c.lengthTicks;
          }
          pasteClipClipboard(end);
        },
        onDelete: () => deleteThisClip(),
        onMuteToggle:
          lane === "audio"
            ? () => {
                const draft = draftRef.current;
                if (!draft) return;
                const clip = draft.audioClips.find((c) => c.id === clipId);
                if (!clip) return;
                commitDraft(setAudioClipMuted(draft, clipId, !clip.muted));
              }
            : undefined,
        onFocusInspector: () => focusInspectorPanel(),
        onSplit:
          canSplit && splitTicks != null
            ? () => {
                const draft = draftRef.current;
                if (!draft) return;
                if (lane === "forma") {
                  const next = splitFormaClipAt(draft, clipId, splitTicks);
                  if (next !== draft) commitDraft(next);
                  return;
                }
                if (
                  lane === "tekst" ||
                  lane === "akordy" ||
                  lane === "cue"
                ) {
                  const next = splitContentClipAt(
                    draft,
                    lane,
                    clipId,
                    splitTicks,
                  );
                  if (next !== draft) commitDraft(next);
                  return;
                }
                if (lane === "audio") {
                  const next = splitAudioClipAt(draft, clipId, splitTicks);
                  if (next !== draft) commitDraft(next);
                }
              }
            : undefined,
      }).map((item) => {
        if (!("id" in item)) return item;
        if (
          !canDelete &&
          (item.id === "cut" || item.id === "delete" || item.id === "duplicate")
        ) {
          return { ...item, disabled: true };
        }
        return item;
      }),
    });
  }

  function openEmptyLaneContextMenu(args: {
    clientX: number;
    clientY: number;
    laneKind: EmptyLaneMenuKind;
    audioTrackId?: string;
  }) {
    const { clientX, clientY, laneKind, audioTrackId } = args;
    const ticks = rawTicksAtClientX(clientX);
    if (ticks == null) return;
    const board = clipboardRef.current;
    const canPaste = clipboardMatchesEmptyLane(board?.lane, laneKind);
    openContextMenu({
      x: clientX,
      y: clientY,
      label: "Menu ścieżki",
      items: buildEmptyLaneContextMenuItems({
        lane: laneKind,
        canPaste,
        onPaste: () => {
          pasteClipClipboard(ticks);
        },
        onImportAudio:
          laneKind === "audio" && audioTrackId
            ? () => {
                laneImportTrackIdRef.current = audioTrackId;
                laneAudioFileRef.current?.click();
              }
            : undefined,
        onAddClip:
          laneKind === "forma"
            ? () => {
                const draft = draftRef.current;
                if (!draft) return;
                const n =
                  draft.forma.clips.filter((c) => c.kind === "section").length +
                  1;
                const next = pencilFormaClick(draft, ticks, `Sekcja ${n}`);
                if (next !== draft) commitDraft(next);
              }
            : laneKind === "tekst"
              ? () => {
                  const draft = draftRef.current;
                  if (!draft) return;
                  const next = pencilTekstClick(draft, ticks, "…");
                  if (next !== draft) commitDraft(next);
                }
              : laneKind === "akordy"
                ? () => {
                    const draft = draftRef.current;
                    if (!draft) return;
                    const next = pencilAkordyClick(draft, ticks, "C");
                    if (next !== draft) commitDraft(next);
                  }
                : laneKind === "cue"
                  ? () => {
                      const draft = draftRef.current;
                      if (!draft) return;
                      const next = pencilCueClick(draft, ticks, "Cue");
                      if (next !== draft) commitDraft(next);
                    }
                  : undefined,
      }),
    });
  }

  function renderLaneContent(trackId: string) {
    if (!draftProject) return null;
    if (isAudioLaneId(trackId)) {
      const lane = trackId;
      const trackUuid = audioTrackIdFromLane(lane);
      const clips = draftProject.audioClips.filter((c) => c.trackId === trackUuid);
      const assetById = new Map(draftProject.assets.map((a) => [a.id, a]));
      const trackColor = resolveTrackColor(
        draftProject.audioTracks.find((t) => t.id === trackUuid)?.color,
      );
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
            const decodeFailed =
              Boolean(projectId) &&
              (failedAudioAssetIds.includes(clip.assetId) ||
                isAudioAssetDecodeFailed(projectId!, clip.assetId));
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
                  decodeFailed ? styles.audioClipDecodeFailed : "",
                  previewing ? styles.formaClipDim : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  ...style,
                  ["--tl-track-color" as string]: trackColor,
                }}
                title={
                  decodeFailed
                    ? `${asset?.originalName ?? "Audio"} — błąd wczytania / dekodowania`
                    : `${asset?.originalName ?? "Audio"} — move/trim`
                }
                onPointerDown={(e) => onAudioClipPointerDown(e, lane, clip)}
                onPointerMove={onFormaClipPointerMove}
                onPointerUp={onFormaClipPointerUp}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openClipContextMenu({
                    clientX: e.clientX,
                    clientY: e.clientY,
                    lane: "audio",
                    clipId: clip.id,
                    clipMuted: Boolean(clip.muted),
                    canSplit: true,
                    selectionLane: lane,
                  });
                }}
              >
                {(clip.fadeInMs ?? 0) > 0 ? (
                  <span
                    className={styles.audioFadeIn}
                    style={{
                      width: `${Math.min(widthPx * 0.45, Math.max(4, widthPx * 0.12))}px`,
                    }}
                  />
                ) : null}
                {(clip.fadeOutMs ?? 0) > 0 ? (
                  <span
                    className={styles.audioFadeOut}
                    style={{
                      width: `${Math.min(widthPx * 0.45, Math.max(4, widthPx * 0.12))}px`,
                    }}
                  />
                ) : null}
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
            aria-label={`${seg.label} — ⌘/⇧ multi · przeciągnij lub kliknij`}            onPointerDown={(e) => onMapSegmentPointerDown(e, "tempo", seg)}
            onPointerMove={onMapSegmentPointerMove}
            onPointerUp={onMapSegmentPointerUp}
            onPointerCancel={onMapSegmentPointerUp}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSongMetaOpen(false);
              if (!seg.eventId.endsWith("-default")) {
                setMapSelection("tempo", [seg.eventId], seg.eventId);
              }
              openMapEdit("tempo", seg.eventStartTicks);
            }}
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
            aria-label={`${seg.label} — ⌘/⇧ multi · przeciągnij lub kliknij`}            onPointerDown={(e) => onMapSegmentPointerDown(e, "metrum", seg)}
            onPointerMove={onMapSegmentPointerMove}
            onPointerUp={onMapSegmentPointerUp}
            onPointerCancel={onMapSegmentPointerUp}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSongMetaOpen(false);
              if (!seg.eventId.endsWith("-default")) {
                setMapSelection("metrum", [seg.eventId], seg.eventId);
              }
              openMapEdit("metrum", seg.eventStartTicks);
            }}
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
            aria-label={`${seg.label} — ⌘/⇧ multi · przeciągnij lub kliknij`}            onPointerDown={(e) => onMapSegmentPointerDown(e, "tonacja", seg)}
            onPointerMove={onMapSegmentPointerMove}
            onPointerUp={onMapSegmentPointerUp}
            onPointerCancel={onMapSegmentPointerUp}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSongMetaOpen(false);
              if (!seg.eventId.endsWith("-default")) {
                setMapSelection("tonacja", [seg.eventId], seg.eventId);
              }
              openMapEdit("tonacja", seg.eventStartTicks);
            }}
          >
            {seg.label}
          </button>
        ));
      case "kotwice": {
        const anchors = scoreAnchors(draftProject);
        if (anchors.length === 0 && !canEditKotwice(draftProject)) {
          return (
            <span className={styles.muted}>
              Kotwice — dodaj MusicXML (Admin) lub kotwicę Ołówkiem
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
                width: `${
                  tickToPx(start + width, viewSpan, barTicks, effectiveZoomH) -
                  tickToPx(start, viewSpan, barTicks, effectiveZoomH)
                }px`,
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                clearClipSelection();
                clearMapSelection();
                setSelectedAnchorId(anchor.id);
                setInspectorVisible(true);
                if (tool === "eraser") {
                  commitDraft(deleteScoreAnchor(draftProject, anchor.id));
                  setSelectedAnchorId(null);
                  return;
                }
                if (
                  !toolAllowsClipHitZones(tool) &&
                  tool !== "pointer"
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
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openClipContextMenu({
                      clientX: e.clientX,
                      clientY: e.clientY,
                      lane: "forma",
                      clipId: clip.id,
                      canSplit: clip.kind === "section",
                      canDelete: clip.kind !== "countdown",
                      selectionLane: "forma",
                    });
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearMapSelection();
                    selectLaneClip("forma", clip.id);
                    focusInspectorPanel();
                  }}
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
              const tapTarget =
                lane === "tekst" && tapActiveClipId === clip.id;
              return (
                <FormaClipButton
                  key={clip.id}
                  clip={styleClip}
                  dataClipLane={lane}
                  selected={
                    isClipSelected(clipSelection, clip.id, lane) || tapTarget
                  }
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
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openClipContextMenu({
                      clientX: e.clientX,
                      clientY: e.clientY,
                      lane,
                      clipId: clip.id,
                      canSplit: true,
                      selectionLane: lane,
                    });
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearMapSelection();
                    selectLaneClip(lane, clip.id);
                    focusInspectorPanel();
                  }}
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
        dockWidthResizing ? styles.dockWidthResizing : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-tl-tier={touchTier}
    >
      <input
        ref={laneAudioFileRef}
        type="file"
        accept="audio/*,.mp3,.wav,.aiff,.aif,.m4a,.flac,.ogg"
        hidden
        disabled={audioUploadPending}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          const trackId = laneImportTrackIdRef.current;
          laneImportTrackIdRef.current = null;
          if (f && trackId) {
            void onUploadAudioToTrack(trackId, f);
          }
        }}
      />
      <AppHeader
        suffix="Timeline"
        version={APP_VERSION}
        appJump={[
          { to: "/admin", label: "Admin" },
          { to: "/client", label: "Klient" },
        ]}
        history={{
          canUndo: Boolean(draftHistory && canUndo(draftHistory)),
          canRedo: Boolean(draftHistory && canRedo(draftHistory)),
          dirty,
          savePending,
          onUndo,
          onRedo,
          onSave: () => {
            void onSave();
          },
          onDiscard,
        }}
        helpPressed={helpOpen}
        onHelp={() => setHelpOpen(true)}
        appearancePressed={appearanceOpen}
        onAppearance={() => setAppearanceOpen((v) => !v)}
        onFullscreen={() => {
          void (async () => {
            try {
              await toggleAppFullscreen();
              setFullscreenError(null);
            } catch (err) {
              setFullscreenError(
                err instanceof Error
                  ? err.message
                  : "Nie udało się przełączyć pełnego ekranu",
              );
            }
          })();
        }}
      />

      <ConnectionLostBanner status={wsStatus} />

      {fullscreenError ? (
        <p className={styles.chromeAlert} role="alert">
          {fullscreenError}
        </p>
      ) : null}

      <div className={styles.toolbar} data-ss-level="2">
        <div className={styles.toolBar} role="toolbar" aria-label="Narzędzia">
          {TOOLS.filter(({ id }) => toolbarVisibleSet.has(id)).map(
            ({ id, title, Icon }) => (
              <ShellIconButton
                key={id}
                label={title}
                pressed={tool === id}
                onClick={() => onTool(id)}
              >
                <Icon />
              </ShellIconButton>
            ),
          )}
          <button
            ref={toolsVisBtnRef}
            type="button"
            className={[
              styles.toolsVisBtn,
              toolsVisOpen ? styles.toolsVisBtnOpen : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Widoczne narzędzia na pasku"
            title="Widoczne narzędzia na pasku"
            aria-expanded={toolsVisOpen}
            aria-haspopup="menu"
            onClick={() => setToolsVisOpen((v) => !v)}
          >
            <IconSettings />
          </button>
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
              className={[
                styles.playBtn,
                state.playing ? styles.playBtnPlaying : "",
                audioBuffering ? styles.playBtnBuffering : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={
                audioBuffering
                  ? "Buforowanie audio"
                  : state.playing
                    ? "Pauza"
                    : "Odtwarzaj"
              }
              aria-busy={audioBuffering || undefined}
              disabled={commandPending || audioBuffering}
              onClick={() =>
                void (state.playing ? onPauseClick() : onPlayClick())
              }
            >
              {audioBuffering ? (
                <span className={styles.playBtnSpinner} aria-hidden="true" />
              ) : state.playing ? (
                <IconPause />
              ) : (
                <IconPlay />
              )}
            </button>
            <span className={styles.bbt} aria-live="polite">
              {clockLabel}
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
            <ShellIconButton
              label={
                timelineSurface === "mixer"
                  ? "Wróć do Timeline"
                  : "Mikser"
              }
              aria-keyshortcuts="x"
              pressed={timelineSurface === "mixer"}
              onClick={() =>
                setTimelineSurface((s) =>
                  s === "mixer" ? "timeline" : "mixer",
                )
              }
            >
              <IconMixer />
            </ShellIconButton>
            <div className={styles.transportExtras}>
              <ShellIconButton
                label="Pętla — przeciągnij zakres na linijce, potem włącz"
                aria-keyshortcuts="c"
                pressed={loopOn}
                onClick={onLoopToggle}
              >
                <IconLoop />
              </ShellIconButton>
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
                aria-keyshortcuts="k"
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
              setInspectorVisible(true);
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
          <span className={styles.songClusterExtra}>
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
          </span>
        </div>

      </div>

      <div
        className={[
          styles.main,
          inspectorOpen ? "" : styles.mainInspectorHidden,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          /* Unitless scale like v4 `--tl-ui-scale` (not `%` — avoids calc % of parent). */
          ["--tl-zoom-ui" as string]: String(uiScale),
          ["--tl-row-h" as string]: `${effectiveZoomV}px`,
        }}
      >
        <div className={styles.timelinePane}>
          {timelineSurface === "mixer" && draftProject ? (
            <MixerSurface
              project={draftProject}
              trackSelection={trackSelection}
              soloAudioTrackIds={soloAudioTrackIds}
              soloBusIds={soloBusIds}
              renamingTrackId={trackRename?.trackId ?? null}
              renameValue={trackRename?.name ?? ""}
              renamingBusId={busRename?.busId ?? null}
              busRenameValue={busRename?.name ?? ""}
              buildCallbacks={buildChannelStripCallbacks}
              buildBusCallbacks={buildBusCallbacks}
              masterCallbacks={buildMasterStripCallbacks()}
              clickCallbacks={{ onMuteClick: () => void onMetronomeToggle() }}
              clickMuted={!metronomeOn}
              playing={state.playing}
              onAddBus={onAddBus}
              onEmptyDoubleClick={(e) => {
                if ((e.target as HTMLElement).closest("button, input, select"))
                  return;
                onAddAudioTrack();
              }}
            />
          ) : (
          <div
            ref={canvasScrollRef}
            className={styles.canvasScroll}
            data-canvas-scroll
          >
            <div
              className={styles.canvasInner}
              style={{
                width: canvasInnerWidth,
                /* Base px × --tl-zoom-ui — keeps grid / sticky / overlays in sync. */
                ["--tl-dock-w" as string]: `calc(${dockWidthBase}px * var(--tl-zoom-ui))`,
              }}
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
                    {touchTier !== "mobile" ? (
                      <button
                        type="button"
                        className={styles.dockWidthResizeEdge}
                        title="Przeciągnij — szerokość kolumny docku"
                        aria-label="Zmień szerokość kolumny docku"
                        onPointerDown={beginDockWidthResize}
                        onPointerMove={onDockWidthResizePointerMove}
                        onPointerUp={endDockWidthResize}
                        onPointerCancel={endDockWidthResize}
                      />
                    ) : null}
                  </div>
                  <div
                    className={styles.ruler}
                  >
                    <div
                      className={styles.rulerLoopLane}
                      onPointerDown={(e) => onLocatorPointerDown(e, "ruler-loop")}
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
                    </div>
                    <div
                      className={styles.rulerBeatLane}
                      onPointerDown={(e) => onLocatorPointerDown(e, "ruler-beat")}
                      onPointerMove={onLocatorPointerMove}
                      onPointerUp={onLocatorPointerUp}
                    >
                      {barMarks.map((mark) => (
                        <span
                          key={`bar-tick-${mark.ticks}`}
                          className={styles.rulerBarTick}
                          style={{
                            left: `${tickToPx(mark.ticks, viewSpan, barTicks, effectiveZoomH)}px`,
                          }}
                          aria-hidden
                        />
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
                </div>

                <div className={styles.trackRows} ref={bindTrackRowsRef}>
                  {/* Continuous sticky dock paint (v4 `.timeline-dock`) — seals row seams. */}
                  <div className={styles.dockColumnRail} aria-hidden />
                  {touchTier !== "mobile" ? (
                    <button
                      type="button"
                      className={styles.dockWidthResize}
                      title="Przeciągnij — szerokość kolumny docku"
                      aria-label="Zmień szerokość kolumny docku"
                      onPointerDown={beginDockWidthResize}
                      onPointerMove={onDockWidthResizePointerMove}
                      onPointerUp={endDockWidthResize}
                      onPointerCancel={endDockWidthResize}
                    />
                  ) : null}
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
                        track.group === "audio" ? styles.dockCellAudio : "",
                        track.group === "special" ? styles.dockMuted : "",
                        track.group === "audio" &&
                        track.audioTrackId &&
                        isAudioTrackSelected(trackSelection, track.audioTrackId)
                          ? styles.dockSelected
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={(e) => {
                        if (track.group !== "audio" || !track.audioTrackId) return;
                        onAudioTrackHeaderClick(e, track.audioTrackId);
                      }}
                      onContextMenu={(e) => {
                        // Always block native Look Up / Inspect on dock text;
                        // ChannelStrip name handler may already have opened the menu.
                        e.preventDefault();
                        e.stopPropagation();
                        if (track.group !== "audio" || !track.audioTrackId) return;
                        openAudioTrackContextMenu(
                          track.audioTrackId,
                          e.clientX,
                          e.clientY,
                        );
                      }}
                    >
                      {track.group === "audio" && track.audioTrackId ? (
                        <>
                          <ChannelStripControls
                            layout="dock"
                            compact={
                              laneHeightEffective(
                                laneHeightBase(track.id, laneHeights, zoomV),
                                uiScale,
                              ) <= DOCK_COMPACT_MAX_PX
                            }
                            strip={{
                              trackId: track.audioTrackId,
                              name: track.label,
                              muted: Boolean(
                                draftProject?.audioTracks.find(
                                  (a) => a.id === track.audioTrackId,
                                )?.muted,
                              ),
                              gainDb:
                                draftProject?.audioTracks.find(
                                  (a) => a.id === track.audioTrackId,
                                )?.gainDb ?? 0,
                              pan:
                                draftProject?.audioTracks.find(
                                  (a) => a.id === track.audioTrackId,
                                )?.pan ?? 0,
                              color: draftProject?.audioTracks.find(
                                (a) => a.id === track.audioTrackId,
                              )?.color,
                              icon: draftProject?.audioTracks.find(
                                (a) => a.id === track.audioTrackId,
                              )?.icon,
                              soloed: soloAudioTrackIds.includes(
                                track.audioTrackId,
                              ),
                              selected: isAudioTrackSelected(
                                trackSelection,
                                track.audioTrackId,
                              ),
                            }}
                            callbacks={buildChannelStripCallbacks(
                              track.audioTrackId,
                            )}
                            renaming={
                              trackRename?.trackId === track.audioTrackId
                            }
                            renameValue={
                              trackRename?.trackId === track.audioTrackId
                                ? trackRename.name
                                : track.label
                            }
                            soloClassName={styles.tapBtn}
                            muteClassName={styles.tapBtn}
                            soloActiveClassName={styles.tapBtnSolo}
                            muteActiveClassName={styles.tapBtnMute}
                            labelClassName={styles.dockLabel}
                            faderClassName={styles.dockFader}
                            renameInputClassName={styles.dockRenameInput}
                          />
                        </>
                      ) : (
                        <span className={styles.dockLabel}>{track.label}</span>
                      )}
                      {track.id === "tekst" ? (
                        <button
                          type="button"
                          className={[
                            styles.tapBtn,
                            tool === "tap" ? styles.tapBtnSelected : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          title={
                            tapBpmHint
                              ? `Tap — linie Tekstu + tempo (${tapBpmHint} BPM)`
                              : "Tap — linie Tekstu + tempo @ locator"
                          }
                          aria-label="Tap — linie Tekstu i tempo"
                          aria-pressed={tool === "tap"}
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
                                  if (tool === "scissors") {
                                    e.preventDefault();
                                    const raw = rawTicksAtClientX(e.clientX);
                                    if (raw == null) return;
                                    const lane = track.id as ContentLaneId;
                                    const hit = contentClipCoveringTicks(
                                      draftProject,
                                      lane,
                                      raw,
                                    );
                                    if (!hit) return;
                                    clearMapSelection();
                                    selectLaneClip(lane, hit.id);
                                    const next = splitContentClipAt(
                                      draftProject,
                                      lane,
                                      hit.id,
                                      raw,
                                    );
                                    if (next !== draftProject) commitDraft(next);
                                    return;
                                  }
                                  if (!toolIsPencilDraw(tool)) {
                                    if (toolUsesMarqueeGesture(tool)) {
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
                                    if (toolUsesMarqueeGesture(tool)) {
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
                        isMapLaneId(track.id) || track.id === "kotwice"
                          ? styles.mapLaneCell
                          : "",
                        isAudioLaneId(track.id) &&
                        audioLaneDropId === track.audioTrackId
                          ? styles.laneCellDropActive
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        cursor: cursorForTimelineTool(
                          heldZoom ? "zoom" : tool,
                        ),
                      }}
                      data-track={track.id}
                      onContextMenu={(e) => {
                        // Clips stopPropagation; this handles empty lane area.
                        if (
                          (e.target as HTMLElement).closest(
                            "button[data-clip-id]",
                          )
                        ) {
                          return;
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        if (track.group === "audio" && track.audioTrackId) {
                          openEmptyLaneContextMenu({
                            clientX: e.clientX,
                            clientY: e.clientY,
                            laneKind: "audio",
                            audioTrackId: track.audioTrackId,
                          });
                          return;
                        }
                        if (
                          track.id === "forma" ||
                          track.id === "tekst" ||
                          track.id === "akordy" ||
                          track.id === "cue"
                        ) {
                          openEmptyLaneContextMenu({
                            clientX: e.clientX,
                            clientY: e.clientY,
                            laneKind: track.id,
                          });
                        }
                      }}
                      onDragOver={
                        track.group === "audio" && track.audioTrackId
                          ? (e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "copy";
                              setAudioLaneDropId(track.audioTrackId!);
                            }
                          : undefined
                      }
                      onDragLeave={
                        track.group === "audio" && track.audioTrackId
                          ? (e) => {
                              if (
                                e.currentTarget.contains(e.relatedTarget as Node)
                              ) {
                                return;
                              }
                              setAudioLaneDropId((id) =>
                                id === track.audioTrackId ? null : id,
                              );
                            }
                          : undefined
                      }
                      onDrop={
                        track.group === "audio" && track.audioTrackId
                          ? (e) => {
                              e.preventDefault();
                              setAudioLaneDropId(null);
                              const file = e.dataTransfer.files?.[0];
                              if (file && track.audioTrackId) {
                                void onUploadAudioToTrack(
                                  track.audioTrackId,
                                  file,
                                );
                              }
                            }
                          : undefined
                      }
                    >
                      {renderLaneContent(track.id)}
                    </div>
                  </div>
                ))}
                <div className={styles.rowsFill}>
                  <div
                    className={styles.dockColumnFill}
                    onDoubleClick={(e) => {
                      if ((e.target as HTMLElement).closest("button")) return;
                      onAddAudioTrack();
                    }}
                  >
                    <button
                      type="button"
                      className={styles.dockAddTrack}
                      disabled={
                        !draftProject ||
                        draftProject.audioTracks.length >= MAX_AUDIO_TRACKS
                      }
                      title={
                        !draftProject
                          ? undefined
                          : draftProject.audioTracks.length >= MAX_AUDIO_TRACKS
                            ? `Limit ${MAX_AUDIO_TRACKS} ścieżek audio`
                            : "Dodaj pustą ścieżkę audio"
                      }
                      onClick={onAddAudioTrack}
                    >
                      + Dodaj Ścieżkę
                    </button>
                    <div
                      className={styles.dockFillHit}
                      title="Dwuklik — dodaj pustą ścieżkę"
                    />
                  </div>
                  <div
                    className={styles.laneFillHit}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      if (!toolUsesMarqueeGesture(tool)) return;
                      beginMarquee(e);
                    }}
                  />
                </div>
              </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {touchTier === "mobile" && inspectorOpen ? (
          <button
            type="button"
            className={styles.inspectorBackdrop}
            aria-label="Zamknij właściwości"
            onClick={closeInspectorPanel}
          />
        ) : null}
        <aside
          className={[
            styles.inspector,
            inspectorOpen ? styles.inspectorOpen : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Właściwości"
          aria-hidden={!inspectorOpen ? true : undefined}
        >
            <div className={styles.inspHead}>
              <h2 className={styles.inspTitle}>Właściwości</h2>
              <span className={styles.inspClose}>
                <ShellIconButton
                  label="Zamknij właściwości"
                  onClick={closeInspectorPanel}
                >
                  <IconClose />
                </ShellIconButton>
              </span>
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
                          draftProject,
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
                  Okładka (URL)
                  <input
                    className={styles.nameInput}
                    value={draftProject.coverUrl ?? ""}
                    placeholder="https://…"
                    aria-label="URL okładki"
                    onChange={(e) =>
                      commitDraft({
                        ...draftProject,
                        coverUrl: e.target.value.trim() || undefined,
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
                            tonic: normalizeKeyTonic(e.target.value, "C"),
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
                <label className={styles.inspField}>
                  Start (takt.beat)
                  <input
                    className={styles.nameInput}
                    defaultValue={formatStartBarBeat(
                      draftProject!,
                      selectedTekstClip.startTicks,
                    )}
                    key={`tekst-start-${selectedTekstClip.id}-${selectedTekstClip.startTicks}`}
                    aria-label="Start tekst takt.beat"
                    onBlur={(e) => {
                      if (!draftProject) return;
                      const parsed = parseStartBarBeat(e.target.value);
                      if (!parsed) return;
                      const beat = clampBeatForProject(
                        draftProject,
                        parsed.bar,
                        parsed.beat,
                      );
                      commitDraft({
                        ...draftProject,
                        tekst: {
                          clips: moveClipStartKeepLength(
                            draftProject,
                            draftProject.tekst.clips,
                            selectedTekstClip.id,
                            parsed.bar,
                            beat,
                          ),
                        },
                      });
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
                <label className={styles.inspField}>
                  Start (takt.beat)
                  <input
                    className={styles.nameInput}
                    defaultValue={formatStartBarBeat(
                      draftProject!,
                      selectedAkordClip.startTicks,
                    )}
                    key={`akord-start-${selectedAkordClip.id}-${selectedAkordClip.startTicks}`}
                    aria-label="Start akord takt.beat"
                    onBlur={(e) => {
                      if (!draftProject) return;
                      const parsed = parseStartBarBeat(e.target.value);
                      if (!parsed) return;
                      const beat = clampBeatForProject(
                        draftProject,
                        parsed.bar,
                        parsed.beat,
                      );
                      commitDraft({
                        ...draftProject,
                        akordy: {
                          clips: moveClipStartKeepLength(
                            draftProject,
                            draftProject.akordy.clips,
                            selectedAkordClip.id,
                            parsed.bar,
                            beat,
                          ),
                        },
                      });
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
                <fieldset className={styles.inspFieldset}>
                  <legend>Role (puste = wszyscy)</legend>
                  <div className={styles.inspChecks}>
                    {CUE_ROLES.map((role) => {
                      const on = (selectedCueClip.roles ?? []).includes(role);
                      return (
                        <label key={role} className={styles.inspCheck}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => {
                              if (!draftProject) return;
                              const cur = selectedCueClip.roles ?? [];
                              const next = on
                                ? cur.filter((r) => r !== role)
                                : [...cur, role];
                              commitDraft(
                                setCueClipRoles(
                                  draftProject,
                                  selectedCueClip.id,
                                  next,
                                ),
                              );
                            }}
                          />
                          {role}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <label className={styles.inspField}>
                  Priorytet
                  <select
                    className={styles.nameInput}
                    value={selectedCueClip.priority ?? "normal"}
                    aria-label="Priorytet cue"
                    onChange={(e) => {
                      if (!draftProject) return;
                      const v = e.target.value === "alert" ? "alert" : "normal";
                      commitDraft(
                        setCueClipPriority(
                          draftProject,
                          selectedCueClip.id,
                          v,
                        ),
                      );
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="alert">Alert</option>
                  </select>
                </label>
                <label className={styles.inspField}>
                  Start (takt.beat)
                  <input
                    className={styles.nameInput}
                    defaultValue={formatStartBarBeat(
                      draftProject!,
                      selectedCueClip.startTicks,
                    )}
                    key={`cue-start-${selectedCueClip.id}-${selectedCueClip.startTicks}`}
                    aria-label="Start cue takt.beat"
                    onBlur={(e) => {
                      if (!draftProject) return;
                      const parsed = parseStartBarBeat(e.target.value);
                      if (!parsed) return;
                      const beat = clampBeatForProject(
                        draftProject,
                        parsed.bar,
                        parsed.beat,
                      );
                      commitDraft({
                        ...draftProject,
                        cue: {
                          clips: moveClipStartKeepLength(
                            draftProject,
                            draftProject.cue.clips,
                            selectedCueClip.id,
                            parsed.bar,
                            beat,
                          ),
                        },
                      });
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
            ) : selectedAudioClip ? (
              <div className={styles.inspBody}>
                <p className={styles.muted}>Klip audio</p>
                <p className={styles.muted}>
                  {draftProject?.assets.find(
                    (a) => a.id === selectedAudioClip.assetId,
                  )?.originalName ?? "Audio"}
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
                  Trim In (ms)
                  <input
                    className={styles.lengthInput}
                    type="number"
                    min={0}
                    step={1}
                    value={selectedAudioClip.trimInMs ?? 0}
                    onChange={(e) => {
                      if (!draftProject) return;
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n) || n < 0) return;
                      commitDraft(
                        setAudioClipTrimMs(draftProject, selectedAudioClip.id, {
                          trimInMs: n,
                        }),
                      );
                    }}
                  />
                </label>
                <label className={styles.inspField}>
                  Trim Out (ms)
                  <input
                    className={styles.lengthInput}
                    type="number"
                    min={0}
                    step={1}
                    value={selectedAudioClip.trimOutMs ?? 0}
                    onChange={(e) => {
                      if (!draftProject) return;
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n) || n < 0) return;
                      commitDraft(
                        setAudioClipTrimMs(draftProject, selectedAudioClip.id, {
                          trimOutMs: n,
                        }),
                      );
                    }}
                  />
                </label>
                <label className={styles.inspField}>
                  Gain clip (dB)
                  <Slider
                    aria-label="Gain clip"
                    min={-24}
                    max={12}
                    step={0.5}
                    value={selectedAudioClip.gainDb ?? 0}
                    onValueChange={(v) => {
                      if (!draftProject) return;
                      commitDraft(
                        setAudioClipGainDb(
                          draftProject,
                          selectedAudioClip.id,
                          v,
                        ),
                      );
                    }}
                  />
                </label>
                <label className={styles.inspField}>
                  Fade In (ms)
                  <Slider
                    aria-label="Fade in"
                    min={0}
                    max={2000}
                    step={10}
                    value={selectedAudioClip.fadeInMs ?? 0}
                    onValueChange={(v) => {
                      if (!draftProject) return;
                      commitDraft(
                        setAudioClipFadeMs(draftProject, selectedAudioClip.id, {
                          fadeInMs: v,
                        }),
                      );
                    }}
                  />
                </label>
                <label className={styles.inspField}>
                  Fade Out (ms)
                  <Slider
                    aria-label="Fade out"
                    min={0}
                    max={2000}
                    step={10}
                    value={selectedAudioClip.fadeOutMs ?? 0}
                    onValueChange={(v) => {
                      if (!draftProject) return;
                      commitDraft(
                        setAudioClipFadeMs(draftProject, selectedAudioClip.id, {
                          fadeOutMs: v,
                        }),
                      );
                    }}
                  />
                </label>
                <label className={styles.inspField}>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedAudioClip.loop)}
                    onChange={(e) => {
                      if (!draftProject) return;
                      commitDraft(
                        setAudioClipLoop(
                          draftProject,
                          selectedAudioClip.id,
                          e.target.checked,
                        ),
                      );
                    }}
                  />{" "}
                  Loop
                </label>
              </div>
            ) : selectedDockAudioTrack ? (
              <div className={styles.inspBody}>
                <p className={styles.muted}>Ścieżka audio</p>
                <label className={styles.inspField}>
                  Nazwa
                  <input
                    className={styles.nameInput}
                    value={selectedDockAudioTrack.name}
                    aria-label="Nazwa ścieżki"
                    onChange={(e) => {
                      if (!draftProject) return;
                      commitDraft(
                        setAudioTrackName(
                          draftProject,
                          selectedDockAudioTrack.id,
                          e.target.value,
                        ),
                      );
                    }}
                  />
                </label>
                <label className={styles.inspField}>
                  Fader (dB)
                  <div
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      if (!draftProject) return;
                      commitDraft(
                        setAudioTrackGainDb(
                          draftProject,
                          selectedDockAudioTrack.id,
                          0,
                        ),
                      );
                    }}
                    title="Dwuklik — 0.0 dB"
                  >
                    <Slider
                      aria-label="Fader ścieżki"
                      min={-24}
                      max={12}
                      step={0.5}
                      value={selectedDockAudioTrack.gainDb ?? 0}
                      onValueChange={(v) => {
                        if (!draftProject) return;
                        commitDraft(
                          setAudioTrackGainDb(
                            draftProject,
                            selectedDockAudioTrack.id,
                            v,
                          ),
                        );
                      }}
                    />
                  </div>
                </label>
                <div className={styles.inspField}>
                  <input
                    ref={inspAudioFileRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.aiff,.aif,.m4a,.flac,.ogg"
                    hidden
                    disabled={audioUploadPending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) {
                        void onUploadAudioToTrack(
                          selectedDockAudioTrack.id,
                          f,
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={audioUploadPending}
                    onClick={() => inspAudioFileRef.current?.click()}
                  >
                    {audioUploadPending
                      ? "Przesyłanie…"
                      : "Importuj plik"}
                  </Button>
                </div>
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
        <div className={styles.zooms} role="group" aria-label="Zoom i snap">
          <label className={styles.snapPicker}>
            <span className={styles.snapPickerLab}>Snap</span>
            <select
              className={styles.snapPickerSelect}
              aria-label="Tryb snap"
              value={snapModeToStorageKey(snapMode)}
              onChange={(e) => {
                const next = snapModeFromStorageKey(e.target.value);
                if (next) setSnapMode(next);
              }}
            >
              <option value="off">Off</option>
              <option value="bar">Takt</option>
              <option value="beat">Beat</option>
              <option value="subdivision:2">1/2</option>
              <option value="subdivision:4">1/4</option>
              <option value="subdivision:8">1/8</option>
              <option value="subdivision:16">1/16</option>
            </select>
          </label>
          <label className={styles.zoomLab}>
            UI
            <input
              className={styles.zoomRange}
              type="range"
              min={ZOOM_UI_MIN}
              max={ZOOM_UI_MAX}
              value={zoomUi}
              onChange={(e) => setZoomUi(clampZoomUi(Number(e.target.value)))}
              title="Zoom UI — gęstość chrome Timeline / Mixer (85–125%)"
              aria-label="Zoom UI"
            />
          </label>
          <label
            className={styles.zoomLab}
            title={
              timelineSurface === "mixer"
                ? "Zoom H dotyczy osi czasu (niedostępny w Mixerze)"
                : "Zoom poziomy (oś czasu)"
            }
          >
            H
            <input
              className={styles.zoomRange}
              type="range"
              min={ZOOM_H_MIN}
              max={ZOOM_H_MAX}
              value={zoomH}
              disabled={timelineSurface === "mixer"}
              onChange={(e) => setZoomH(Number(e.target.value))}
              aria-label="Zoom poziomy"
            />
          </label>
          <label
            className={styles.zoomLab}
            title={
              timelineSurface === "mixer"
                ? "Zoom V dotyczy wysokości ścieżek (niedostępny w Mixerze)"
                : "Zoom pionowy (wysokość ścieżek)"
            }
          >
            V
            <input
              className={styles.zoomRange}
              type="range"
              min={ZOOM_V_MIN}
              max={ZOOM_V_MAX}
              value={zoomV}
              disabled={timelineSurface === "mixer"}
              onChange={(e) => setVerticalZoom(Number(e.target.value))}
              aria-label="Zoom pionowy"
            />
          </label>
        </div>
      </footer>

      {shouldShowTouchNudge(
        touchTier,
        selectionLane,
        primaryId,
        draftProject,
      ) && draftProject && selectionLane && primaryId ? (
        <div
          className={styles.touchNudge}
          role="toolbar"
          aria-label="Przesuń i rozciągnij clip"
        >
          <button
            type="button"
            className={styles.touchNudgeBtn}
            aria-label="Przesuń w lewo"
            onClick={() => {
              commitDraft(
                applyTimelineNudge(
                  draftProject,
                  selectionLane,
                  primaryId,
                  "move-left",
                ),
              );
            }}
          >
            ◀
          </button>
          <button
            type="button"
            className={styles.touchNudgeBtn}
            aria-label="Przesuń w prawo"
            onClick={() => {
              commitDraft(
                applyTimelineNudge(
                  draftProject,
                  selectionLane,
                  primaryId,
                  "move-right",
                ),
              );
            }}
          >
            ▶
          </button>
          <span className={styles.touchNudgeSep} aria-hidden />
          {nudgeShowsLeftEdge(draftProject, selectionLane, primaryId) ? (
            <>
              <button
                type="button"
                className={`${styles.touchNudgeBtn} ${styles.touchNudgeBtnSm}`}
                aria-label="Wydłuż lewą krawędź"
                onClick={() => {
                  commitDraft(
                    applyTimelineNudge(
                      draftProject,
                      selectionLane,
                      primaryId,
                      "stretch-left-out",
                    ),
                  );
                }}
              >
                ◂|
              </button>
              <button
                type="button"
                className={`${styles.touchNudgeBtn} ${styles.touchNudgeBtnSm}`}
                aria-label="Skróć od lewej"
                onClick={() => {
                  commitDraft(
                    applyTimelineNudge(
                      draftProject,
                      selectionLane,
                      primaryId,
                      "stretch-left-in",
                    ),
                  );
                }}
              >
                |▸
              </button>
            </>
          ) : null}
          <button
            type="button"
            className={`${styles.touchNudgeBtn} ${styles.touchNudgeBtnSm}`}
            aria-label="Skróć od prawej"
            onClick={() => {
              commitDraft(
                applyTimelineNudge(
                  draftProject,
                  selectionLane,
                  primaryId,
                  "stretch-right-in",
                ),
              );
            }}
          >
            ◂|
          </button>
          <button
            type="button"
            className={`${styles.touchNudgeBtn} ${styles.touchNudgeBtnSm}`}
            aria-label="Wydłuż prawą krawędź"
            onClick={() => {
              commitDraft(
                applyTimelineNudge(
                  draftProject,
                  selectionLane,
                  primaryId,
                  "stretch-right-out",
                ),
              );
            }}
          >
            |▸
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
          Tryb odtwarzacza — pełna edycja na tablecie ({'>'}768 px) lub komputerze.
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
            <TimelineHelp onClose={() => setHelpOpen(false)} />
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
          <ShellSwitchRow
            checked={showMidiPlayhead}
            onChange={(e) => {
              const next = e.target.checked;
              setShowMidiPlayhead(next);
              try {
                localStorage.setItem(
                  "stagesync-timeline-midi-playhead",
                  next ? "1" : "0",
                );
              } catch {
                /* ignore */
              }
            }}
          >
            Wskaźnik MIDI (playhead)
          </ShellSwitchRow>
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
            </div>,
            document.body,
          )
        : null}

      {toolsVisOpen && toolsVisMenuPos
        ? createPortal(
            <div
              ref={toolsVisMenuRef}
              className={[styles.eyeMenu, styles.eyeMenuFixed]
                .filter(Boolean)
                .join(" ")}
              style={{ top: toolsVisMenuPos.top, left: toolsVisMenuPos.left }}
              role="menu"
              aria-label="Widoczne narzędzia na pasku"
            >
              {TOOLS.map(({ id, label }) => {
                if (!isToolbarToolId(id)) return null;
                const locked = TOOLBAR_ALWAYS_VISIBLE.has(id);
                const checked = toolbarVisibleSet.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    className={[
                      styles.eyeItem,
                      locked ? styles.eyeItemLocked : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={locked}
                    onClick={() => {
                      if (locked) return;
                      setToolbarVisibleTools((prev) => {
                        const next = toggleToolbarVisibleTool(prev, id);
                        saveToolbarVisibleTools(next);
                        return next;
                      });
                    }}
                  >
                    <span aria-hidden>
                      {checked ? <IconChecked /> : <IconUnchecked />}
                    </span>
                    {label}
                    {locked ? " (zawsze)" : ""}
                  </button>
                );
              })}
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
              {TOOLS.map(({ id, label, key, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
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
                  <span className={styles.toolMenuKey}>
                    {key ? `T ${key.toUpperCase()}` : "—"}
                  </span>
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
                  ["tekst", "Tekst → Forma", "1"],
                  ["akordy", "Akordy → Forma", "2"],
                  ["both", "Tekst + Akordy → Forma", "3"],
                ] as const
              ).map(([mode, label, keyHint]) => (
                <button
                  key={mode}
                  type="button"
                  role="menuitem"
                  className={styles.toolMenuItem}
                  onClick={() => applyWand(mode)}
                >
                  <span>{label}</span>
                  <span className={styles.toolMenuKey}>{keyHint}</span>
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
                  const tonic = normalizeKeyTonic(tonicEl?.value, "C");
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
  onDoubleClick,
  onContextMenu,
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
  onDoubleClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const [hoverZone, setHoverZone] = useState<ClipHitZone>("body");
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
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
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

