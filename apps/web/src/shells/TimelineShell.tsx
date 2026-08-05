import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { Link, useBlocker, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Slider, Select, useContextMenu } from "@stagesync/ui";
import {
  resolveMeterAt,
  resolveTempoAt,
  resolveKeyAt,
  formatKeySignature,
  parseLegacyMeter,
  ticksPerBar,
  ticksToBbt,
  toDisplayBar,
  applyUgImportToProject,
  applyUltrastarImportToProject,
  applyUsUgBridgeToProject,
  DEFAULT_PPQ,
  normalizeKeyTonic,
  placeContentFromForma,
  projectEndTicks,
  transportHomeTicks,
  resolveTrackColor,
  channelModeFromChannelCount,
  isHwOutRepatchBlockedWhilePlaying,
  wrapDisplayTicks,
  type FormaClip,
  type Project,
  type UgImportOk,
  type UgTabMetadata,
  type UltrastarImportOk,
  type SnapMode,
  type WandMode,
} from "@stagesync/shared";
import { yieldToUi } from "@lib/audio/audioTempoAnalysis.js";
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
  snapLocatorTicks,
  tickToPx,
  ticksFromPointer,
} from "@lib/timeline-edit/formaCanvas.js";
import {
  cascadeFormaMoveIds,
  commitGesture,
  deleteFormaClip,
  formaSectionCoveringTicks,
  joinFormaAtClick,
  previewFromSession,
  splitFormaClipAt,
} from "@lib/timeline-edit/formaEdit.js";
import {
  buildClipboardFromClips,
  deleteClipsOnLane,
  pasteClipboardAt,
  pasteClipboardWithDelta,
  selectionMaxEndTicks,
  type TimelineClipboard,
} from "@lib/timeline/timelineClipboard.js";
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
  selectionIdsAfterFormaMove,
  setSelection,
  toggleAudioTrackSelected,
  toggleSelected,
  type ClipSelection,
  type ClipSelectionLane,
  type TimelineSurface,
  type TrackSelection,
} from "@lib/timeline/timelineSelection.js";
import { resolveTimelineShortcut } from "@lib/timeline/timelineKeyboardShortcuts.js";
import {
  isToolbarToolId,
  loadToolbarVisibleTools,
  saveToolbarVisibleTools,
  toggleToolbarVisibleTool,
  TOOLBAR_ALWAYS_VISIBLE,
  type ToolbarToolId,
} from "@lib/timeline/timelineToolbarTools.js";
import {
  subsectionRanges,
} from "@lib/timeline-edit/formaSubsections.js";
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
} from "@lib/timeline/mapLaneEdit.js";
import {
  keyMapSegments,
  meterMapSegments,
  segmentStylePx,
  tempoMapSegments,
} from "@lib/timeline/mapSegments.js";
import { FormaClipPreview } from "./timeline/FormaClipPreview.js";
import { TimelineHelp } from "./timeline/TimelineHelp.js";
import {
  addFormaSubsection,
  countdownBars,
  deleteFormaSubsection,
  formaSubsectionRows,
  renameFormaClip,
  setCountdownBars,
  setFormaSubsectionStartBar,
} from "@lib/timeline-edit/formaInspector.js";
import {
  deleteTekstClip,
  pencilTekstClick,
  setTekstClipStart,
  setTekstClipText,
} from "@lib/timeline-edit/tekstEdit.js";
import {
  deleteAkordyClip,
  pencilAkordyClick,
  commitAkordyClipSymbol,
  setAkordyClipSymbol,
} from "@lib/timeline-edit/akordyEdit.js";
import {
  deleteCueClip,
  pencilCueClick,
  setCueClipLabel,
  setCueClipRoles,
  setCueClipPriority,
  setCueClipSample,
  CUE_ROLES,
} from "@lib/timeline-edit/cueEdit.js";
import {
  commitContentGesture,
  contentClipCoveringTicks,
  defaultPencilLabel,
  joinAdjacentContentClips,
  previewContentFromSession,
  splitContentClipAt,
  type ContentLaneId,
} from "@lib/timeline-edit/contentLaneEdit.js";
import {
  buildAudioTrackContextMenuItems,
  buildClipContextMenuItems,
  buildEmptyLaneContextMenuItems,
  clipboardMatchesEmptyLane,
  audioTrackContextMenuLabel,
  clipContextMenuLabel,
  mapSegmentSelectionAriaLabel,
  type ClipMenuLane,
  type EmptyLaneMenuKind,
} from "@lib/timeline/timelineContextMenus.js";
import {
  applyTimelineNudge,
  nudgeShowsLeftEdge,
  shouldShowTouchNudge,
  type NudgeAction,
} from "@lib/timeline/timelineTouchNudge.js";
import { useTimelineTouchGestures } from "@lib/timeline/useTimelineTouchGestures.js";
import {
  anchorBarWidthTicks,
  canEditKotwice,
  deleteScoreAnchor,
  insertScoreAnchor,
  moveScoreAnchor,
  scoreAnchors,
  ticksFromLogicBar,
  updateScoreAnchor,
} from "@lib/timeline-edit/scoreBarEdit.js";
import {
  snapLoopRange,
  snapMovedLoopRange,
  ticksInLoopRegion,
  usableLoopRange,
  type LoopRange,
} from "@lib/timeline/timelineLocator.js";
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
} from "@lib/client/draftHistory.js";
import {
  advanceMetronomeClicks,
  cancelScheduledMetronomeClicks,
  getMetronomeAudioContext,
  metronomeBeatIndex,
  resumeMetronomeAudio,
} from "@lib/audio/metronome.js";
import {
  getMetronomeOn,
  setMetronomeOn as persistMetronomeOn,
} from "@lib/audio/metronomePrefs.js";
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
  setAudioBusOutput,
  setAudioBusPan,
  setAudioBusChannelMode,
  addAudioBus,
  removeAudioBus,
  setMasterGainDb,
  placeImportedAudioClipAt,
  splitAudioClipAt,
  toggleAudioClipMute,
} from "@lib/audio/audioLaneEdit.js";
import {
  addAudioHardwareOutput,
  canAddHardwareOutput,
  removeAudioHardwareOutput,
  setMasterOutputRouting,
  updateAudioHardwareOutput,
} from "@lib/audio/audioHwEdit.js";
import {
  getAudioHwCapability,
} from "@lib/audio/audioHwCapability.js";
import {
  ChannelStripControls,
  TaperGainSlider,
} from "./timeline/channelStrip/index.js";
import type {
  ChannelStripCallbacks,
  MasterStripCallbacks,
} from "./timeline/channelStrip/channelStripTypes.js";
import {
  allowAudioPlayback,
  clearAudioBufferCache,
  ensureAudioBuffered,
  fireCueSampleGo,
  getAudioPlaybackDebugState,
  getFailedAudioAssetIds,
  isAudioAssetDecodeFailed,
  loadAudioBuffer,
  restartAudioPlayback,
  stopAudioPlayback,
  suppressAudioPlayback,
  syncAudioPlayback,
} from "@lib/audio/audioPlayback.js";
import {
  AUDIO_LATENCY_CHANGED_EVENT,
  getStoredLatencyCompensationMs,
} from "@lib/audio/audioLatencyPrefs.js";
import {
  CLOCK_DISPLAY_CHANGED_EVENT,
  formatClockDisplay,
  getStoredClockDisplayFormat,
  type ClockDisplayFormat,
} from "@lib/client/clockDisplayPrefs.js";
import { ticksFromSyncLeadAlongMap } from "@lib/timeline/syncLead.js";
import {
  hasNonCollapsedDomTextSelection,
  isEditableKeyboardTarget,
} from "@lib/client/isEditableKeyboardTarget.js";
import { uploadProjectAudio } from "@lib/shell-operator/projectAssetsApi.js";
import {
  computeWaveformFromAudioBuffer,
  peaksToPolylinePoints,
} from "@lib/audio/waveformPeaks.js";
import {
  detectTimelineTier,
  TIMELINE_COARSE_MQ,
  TIMELINE_LANDSCAPE_PHONE_MQ,
  TIMELINE_MOBILE_MQ,
  timelineGesturesAllowed,
  TOUCH_FULL_EDIT_MSG,
  type TimelineTouchTier,
} from "@lib/timeline/timelineTouchTier.js";
import { APP_VERSION } from "@lib/client/appVersion.js";
import { createSongWithContent } from "@lib/client/desktopFileMenu.js";
import { fetchLibrary, fetchProject, putProject } from "@lib/shell-operator/libraryApi.js";
import {
  fetchSetlist,
  patchSetlistAutoAdvance,
} from "@lib/shell-operator/setlistApi.js";
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
  isTouchPointerType,
  toolAllowsClipHitZones,
  toolIsPencilDraw,
  toolNeedsExclusiveTouchAction,
  toolUsesMarqueeGesture,
  type ClipHitZone,
  type FormaGesturePreview,
  type FormaGestureSession,
  type FormaToolId,
} from "@lib/timeline/timelineGesture.js";
import {
  applyVocalTap,
  vocalTapMarkTicks,
  vocalTapQueue,
} from "@lib/client/clientVocalTap.js";
import {
  clampBeatForProject,
  formatStartBarBeat,
  moveClipStartKeepLength,
  parseStartBarBeat,
  ticksFromDisplayBarBeat,
} from "@lib/timeline/clipStartEdit.js";
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
} from "@lib/timeline/timelineTracks.js";
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
} from "@lib/timeline/timelineLaneHeights.js";
import {
  clampDockWidth,
  loadDockWidth,
  saveDockWidth,
} from "@lib/timeline/timelineDockWidth.js";
import {
  clampZoomUi,
  loadZoomPrefs,
  saveZoomPrefs,
  ZOOM_H_MAX as PREFS_ZOOM_H_MAX,
  ZOOM_H_MIN as PREFS_ZOOM_H_MIN,
  ZOOM_UI_MAX,
  ZOOM_UI_MIN,
} from "@lib/timeline/timelineZoomPrefs.js";
import {
  toggleAppFullscreen,
  syncEditHistoryState,
  syncNavRecentProjects,
  syncNavTimelineProjectId,
} from "@lib/client/desktopBridge.js";
import { useAnnounceDevicePresence } from "@lib/client/useAnnounceDevicePresence.js";
import {
  DESKTOP_MENU_EVENT,
  parseDesktopMenuDetail,
} from "@lib/client/desktopMenuEvents.js";
import { pushRecentTimelineProject } from "@lib/client/lastTimelineProject.js";
import { markOperatorSession } from "@lib/shell-operator/operatorSession.js";
import { openPreferences } from "@lib/client/preferencesEvents.js";
import {
  shouldShowFullscreenControl,
  shouldShowOperatorNav,
} from "@lib/shell-operator/operatorSurface.js";
import { useMqMobileCompact } from "@lib/client/useMqMobileCompact.js";
import { ShellAlertDialog } from "./ShellBlockingDialog.js";
import { loadTransport } from "../transport/api.js";
import { useTransport } from "../transport/useTransport.js";
import {
  IconChecked,
  IconClose,
  IconEraser,
  IconEye,
  IconFade,
  IconFullscreen,
  IconGain,
  IconJoin,
  IconMarquee,
  IconMute,
  IconPencil,
  IconPointer,
  IconScissors,
  IconSolo,
  IconTap,
  IconUnchecked,
  IconWand,
  IconZoomIn,
} from "./icons.js";
import { ConnectionIndicator } from "./ConnectionIndicator.js";
import { ConnectionLostBanner } from "./ConnectionLostBanner.js";
import { ShellIconButton } from "./ShellIconButton.js";
import { AppHeader, AppHeaderActions } from "./components/AppHeader.js";
import { OperatorNav } from "./components/OperatorNav.js";
import { UgImportForm } from "./UgImportForm.js";
import { UltrastarImportForm } from "./UltrastarImportForm.js";
import { CombinedUsUgImportForm, type UsUgApplyPayload } from "./CombinedUsUgImportForm.js";
import { TimelineToolbar } from "./timeline/TimelineToolbar.js";
import { MixerDock } from "./timeline/MixerDock.js";
import styles from "./TimelineShell.module.css";

type ToolId = FormaToolId;

const TOOLS: {
  id: ToolId;
  label: string;
  title: string;
  /** Second key after T opens the tools menu (Logic-style chord). */
  key: string | null;
  Icon: typeof IconPointer;
  /** Shown in toolbar + T menu (wand = Forma dock; Tap = Tekst dock). */
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
    title: "Nożyczki — podział klipu / podsekcja Formy / zmiana mapy",
    key: "i",
    Icon: IconScissors,
  },
  {
    id: "join",
    label: "Połącz",
    title: "Połącz — scal sąsiednie klipy / usuń granicę podsekcji",
    key: "j",
    Icon: IconJoin,
  },
  {
    id: "mute",
    label: "Mute",
    title: "Mute — przełącz wyciszenie klikniętego klipu audio",
    key: "m",
    Icon: IconMute,
  },
  {
    id: "solo",
    label: "Solo",
    title: "Solo — chwilowe solo ścieżki klipu audio przytrzymaniem LMB",
    key: "s",
    Icon: IconSolo,
  },
  {
    id: "fade",
    label: "Fade",
    title: "Fade — przeciągnij na krawędzi klipu audio: fade in/out",
    key: "a",
    Icon: IconFade,
  },
  {
    id: "gain",
    label: "Gain",
    title: "Gain — przeciągnij w pionie na klipie audio: poziom dB",
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
  useAnnounceDevicePresence(["timeline"]);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isCompactMobile = useMqMobileCompact();
  const showOperatorNav = shouldShowOperatorNav(pathname);

  useEffect(() => {
    markOperatorSession();
  }, []);

  const { projectId } = useParams<{ projectId: string }>();
  const lanesCoordRef = useRef<HTMLDivElement>(null);
  const trackRowsRoRef = useRef<ResizeObserver | null>(null);
  const markerOverlayRef = useRef<HTMLDivElement>(null);
  const eyeBtnRef = useRef<HTMLButtonElement>(null);
  const eyeMenuRef = useRef<HTMLDivElement>(null);
  const toolsVisBtnRef = useRef<HTMLButtonElement>(null);
  const toolsVisMenuRef = useRef<HTMLDivElement>(null);
  const songScreenId = useId();
  const eyeMenuId = useId();
  const toolsVisMenuId = useId();
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
    setSoftClockTempoMaps,
    setlistSnapshot,
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
  const [songScreenOpen, setSongScreenOpen] = useState(false);
  const [ugModalOpen, setUgModalOpen] = useState(false);
  const [ultrastarModalOpen, setUltrastarModalOpen] = useState(false);
  /** Song picker → new library song; Metadane (ⓘ) → overwrite current draft. */
  const [importAsNewSong, setImportAsNewSong] = useState(false);
  const [importApplying, setImportApplying] = useState(false);
  const [combinedImportModalOpen, setCombinedImportModalOpen] = useState(false);
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
  /** Phone = read/preview surface — no edit chrome / inspector (v4 mobile RO). */
  const isMobilePreview = touchTier === "mobile";
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const gesturePolicy = timelineGesturesAllowed(touchTier);
  const [tempoEditOpen, setTempoEditOpen] = useState(false);
  const [tempoDraft, setTempoDraft] = useState("");
  const [meterEditOpen, setMeterEditOpen] = useState(false);
  const [meterNumDraft, setMeterNumDraft] = useState("4");
  const [meterDenDraft, setMeterDenDraft] = useState("4");
  const tempoEditTitleId = useId();
  const meterEditTitleId = useId();
  const keyEditTitleId = useId();
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
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedHwOutputId, setSelectedHwOutputId] = useState<string | null>(
    null,
  );
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
  /** Pencil @ empty audio: place imported clip at these ticks (Logic-like). */
  const laneImportStartTicksRef = useRef<number | null>(null);
  const laneAudioFileRef = useRef<HTMLInputElement>(null);
  const trackSelectionRef = useRef(trackSelection);
  trackSelectionRef.current = trackSelection;
  const selectedBusIdRef = useRef(selectedBusId);
  selectedBusIdRef.current = selectedBusId;
  const selectedHwOutputIdRef = useRef(selectedHwOutputId);
  selectedHwOutputIdRef.current = selectedHwOutputId;
  const primaryId = clipSelection.primaryId;
  const selectionLane = primaryLane(clipSelection);

  // Clip focus and track header focus are mutually exclusive in the dock/inspector.
  useEffect(() => {
    if (clipSelection.items.length > 0) {
      setTrackSelection(clearTrackSelection());
      setSelectedBusId(null);
      setSelectedHwOutputId(null);
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
  /** Touch + Pointer tool: track tap (locator) without starting marquee; drag = native pan. */
  const touchCanvasNavRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  /** Re-run touch-nav window listeners when a nav session starts. */
  const [touchCanvasNavActive, setTouchCanvasNavActive] = useState(false);
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
    onClipCut: () => false as boolean,
    onClipCopy: () => false as boolean,
    onClipPaste: () => false as boolean,
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
    if (touchTier === "mobile") return;
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
  }, [touchTier]);

  /** Esc — clear focus; on mobile preview there is no inspector sheet. */
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
    setSetlistIds(setlistSnapshot.projectIds);
    setSetlistEnabled(setlistSnapshot.enabled);
    setAutoAdvance(setlistSnapshot.autoAdvanceEnabled);
  }, [setlistSnapshot]);

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
    const landscapeMq = window.matchMedia(TIMELINE_LANDSCAPE_PHONE_MQ);
    const coarseMq = window.matchMedia(TIMELINE_COARSE_MQ);
    mobileMq.addEventListener("change", syncTier);
    landscapeMq.addEventListener("change", syncTier);
    coarseMq.addEventListener("change", syncTier);
    window.addEventListener("resize", syncTier);
    return () => {
      mobileMq.removeEventListener("change", syncTier);
      landscapeMq.removeEventListener("change", syncTier);
      coarseMq.removeEventListener("change", syncTier);
      window.removeEventListener("resize", syncTier);
    };
  }, []);

  useEffect(() => {
    if (!isMobilePreview) return;
    setInspectorVisible(false);
    setSongMetaOpen(false);
    setTimelineSurface("timeline");
    setTool((t) => (t === "tap" ? "pointer" : t));
  }, [isMobilePreview]);

  useTimelineTouchGestures({
    // Phones, tablets, and hybrid touch screens — not gated by MQ_MOBILE/tablet only.
    enabled: true,
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
    if (selectedAnchorId) {
      const next = deleteScoreAnchor(draft, selectedAnchorId);
      if (next !== draft) commitDraft(next);
      setSelectedAnchorId(null);
      return;
    }
    if (!clipSelection.items.length) {
      const hwId = selectedHwOutputIdRef.current;
      if (hwId) {
        const next = removeAudioHardwareOutput(draft, hwId);
        if (next !== draft) commitDraft(next);
        setSelectedHwOutputId(null);
        return;
      }
      const busId = selectedBusIdRef.current;
      if (busId) {
        const next = removeAudioBus(draft, busId);
        if (next !== draft) commitDraft(next);
        setSelectedBusId(null);
        setSoloBusIds((prev) => prev.filter((id) => id !== busId));
        return;
      }
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
    selectedAnchorId,
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
    let clips: Parameters<typeof buildClipboardFromClips>[1];
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
    let next: typeof draft;
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
    let next: typeof draft;
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
    if (getAudioPlaybackDebugState().suppressed) return;
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
      if (getAudioPlaybackDebugState().suppressed) return;
      restartAudioPlayback(projectId, {
        project: draft,
        playing: true,
        displayTicks:
          startTicks +
          ticksFromSyncLeadAlongMap(latencyCompMs, startTicks, draft),
        soloTrackIds: soloAudioTrackIds,
        soloBusIds,
      });
    }
    metroBeatRef.current = metronomeBeatIndex(
      startTicks,
      state.timeSignature,
      state.ppq,
    );
    if (getAudioPlaybackDebugState().suppressed) return;
    if (startTicks !== state.positionTicks) {
      await seek(startTicks);
    }
    if (getAudioPlaybackDebugState().suppressed) return;
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
    state.positionTicks,
    state.ppq,
    state.timeSignature,
  ]);

  /** Bare I — show/hide Właściwości only (never Metadane / songMetaOpen). */
  const toggleInspectorPanel = useCallback(() => {
    if (touchTier === "mobile") return;
    setInspectorVisible((v) => !v);
  }, [touchTier]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableKeyboardTarget(e.target)) {
        return;
      }
      // Import overlays own Space & shortcuts — don't drive Timeline transport.
      if (combinedImportModalOpen || ugModalOpen || ultrastarModalOpen) {
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
          h.onTool(pick.id);
        }
        return;
      }

      // DOM text selection → system clipboard (not in-app clip clipboard).
      if (
        (action === "copy" || action === "cut") &&
        hasNonCollapsedDomTextSelection()
      ) {
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
          setSelectedBusId(null);
          setSelectedHwOutputId(null);
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
    combinedImportModalOpen,
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
    ugModalOpen,
    ultrastarModalOpen,
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

  /** Panel visibility — bare I (not Metadane ⓘ). Hidden in Mixer; absent on mobile preview. */
  const inspectorOpen =
    !isMobilePreview &&
    inspectorVisible &&
    timelineSurface !== "mixer";

  const meterAtPlayhead = draftProject
    ? resolveMeterAt(draftProject, displayTicks)
    : state.timeSignature;
  const tempoAtPlayhead = draftProject
    ? resolveTempoAt(draftProject, displayTicks)
    : state.bpm;

  useEffect(() => {
    if (!metronomeOn || !state.playing) {
      cancelScheduledMetronomeClicks();
      metroBeatRef.current =
        metronomeBeatIndex(displayTicks, meterAtPlayhead, state.ppq) - 1;
      return;
    }
    metroBeatRef.current = advanceMetronomeClicks(
      {
        enabled: metronomeOn,
        playing: state.playing,
        displayTicks,
        bpm: tempoAtPlayhead,
        timeSignature: meterAtPlayhead,
        ppq: state.ppq,
        tempoMaps: draftProject
          ? {
              defaultBpm: draftProject.defaultBpm,
              defaultMeter: draftProject.defaultMeter,
              tempoMap: draftProject.tempoMap,
              meterMap: draftProject.meterMap,
              ppq: draftProject.ppq,
            }
          : null,
      },
      metroBeatRef.current,
    );
  }, [
    displayTicks,
    draftProject,
    metronomeOn,
    meterAtPlayhead,
    state.playing,
    state.ppq,
    tempoAtPlayhead,
  ]);

  // Soft-clock AlongMap — same TempoMap math as server engine / audio (P3).
  useEffect(() => {
    if (!draftProject) {
      setSoftClockTempoMaps(null);
      return;
    }
    setSoftClockTempoMaps({
      defaultBpm: draftProject.defaultBpm,
      defaultMeter: draftProject.defaultMeter,
      tempoMap: draftProject.tempoMap,
      meterMap: draftProject.meterMap,
      ppq: draftProject.ppq,
    });
    return () => setSoftClockTempoMaps(null);
  }, [draftProject, setSoftClockTempoMaps]);

  // WebAudio clip playback — sync to server ticks (ADR 0008 / 0002).
  // Latency compensation is a client-only tick offset (Preferences); SSOT unchanged.
  // Soft-clock + lead must stay inside the transport loop (exclusive end) so a
  // clip starting on the loop end (e.g. bar 2.1 while cycling bar 1) never
  // arms early at the wrap boundary.
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
    let audioTicks = displayTicks;
    const loopRange = usableLoopRange(state.loop);
    if (loopOn && loopRange) {
      audioTicks = wrapDisplayTicks(audioTicks, {
        enabled: true,
        startTicks: loopRange.startTicks,
        endTicks: loopRange.endTicks,
      });
    }
    syncAudioPlayback(projectId, {
      project: draftProject,
      playing: state.playing,
      displayTicks: audioTicks,
      loopEnabled: loopOn,
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
    state.loop,
    latencyCompMs,
    loopOn,
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
        // Waveform meta only — do not pin full PCM into the playback cache
        // (eager decode of every asset used to retain multi-GB of AudioBuffers).
        const buf = await loadAudioBuffer(projectId, asset.id, undefined, {
          cache: false,
        });
        if (cancelled) return;
        setFailedAudioAssetIds(getFailedAudioAssetIds(projectId));
        if (!buf) continue;
        const meta = computeWaveformFromAudioBuffer(buf);
        project = applyDecodedAudioMeta(project, asset.id, {
          durationMs: meta.durationMs,
          waveformPeaks: meta.peaks,
          waveformRms: meta.rms,
          channelCount: buf.numberOfChannels,
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
        case "file-save":
          if (h.dirty && !h.savePending) void h.onSave();
          break;
        case "edit-undo":
          h.onUndo();
          break;
        case "edit-redo":
          h.onRedo();
          break;
        case "edit-cut":
          if (hasNonCollapsedDomTextSelection()) {
            try {
              document.execCommand("cut");
            } catch {
              /* best-effort native text */
            }
            break;
          }
          h.onClipCut();
          break;
        case "edit-copy":
          if (hasNonCollapsedDomTextSelection()) {
            try {
              document.execCommand("copy");
            } catch {
              /* best-effort native text */
            }
            break;
          }
          h.onClipCopy();
          break;
        case "edit-paste":
          if (isEditableKeyboardTarget(document.activeElement)) {
            try {
              document.execCommand("paste");
            } catch {
              /* best-effort native text */
            }
            break;
          }
          h.onClipPaste();
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
        case "appearance":
          openPreferences("general");
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
    if (getAudioPlaybackDebugState().suppressed) return;
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
      if (getAudioPlaybackDebugState().suppressed) return;
      restartAudioPlayback(projectId, {
        project: draftProject,
        playing: true,
        displayTicks: locatorTicks,
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
    if (getAudioPlaybackDebugState().suppressed) return;
    if (startTicks !== state.positionTicks) {
      await seek(startTicks);
    }
    if (getAudioPlaybackDebugState().suppressed) return;
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
    // Scroll canvas to CD / song start (same feel as after Countdown length change).
    requestAnimationFrame(() => {
      scrollCanvasToStart(
        canvasScrollRef.current ??
          (document.querySelector("[data-canvas-scroll]") as HTMLElement | null),
      );
    });
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

  function closeImportModals() {
    setUgModalOpen(false);
    setUltrastarModalOpen(false);
    setCombinedImportModalOpen(false);
    setImportAsNewSong(false);
    setImportApplying(false);
  }

  function openImportUg(asNew: boolean) {
    setImportAsNewSong(asNew);
    setUgModalOpen(true);
  }

  function openImportUltrastar(asNew: boolean) {
    setImportAsNewSong(asNew);
    setUltrastarModalOpen(true);
  }

  function openImportUsUg(asNew: boolean) {
    setImportAsNewSong(asNew);
    setCombinedImportModalOpen(true);
  }

  const importPreviewOptions = importAsNewSong
    ? {
        ppq: DEFAULT_PPQ,
        meter: { numerator: 4, denominator: 4 } as const,
      }
    : draftProject
      ? {
          ppq: draftProject.ppq,
          meter: resolveMeterAt(draftProject, 0),
        }
      : {
          ppq: DEFAULT_PPQ,
          meter: { numerator: 4, denominator: 4 } as const,
        };

  function mergeUgIntoProject(
    project: Project,
    result: UgImportOk,
    runWand: boolean,
    metadata?: UgTabMetadata | null,
  ): Project {
    let next = applyUgImportToProject(project, result);
    const title = metadata?.title?.trim();
    const artist = metadata?.artist?.trim();
    if (title) next = { ...next, name: title.slice(0, 200) };
    if (artist) next = { ...next, artist: artist.slice(0, 200) };
    if (runWand) {
      const wand = placeContentFromForma(next, "both");
      if (wand.ok) next = wand.project;
    }
    return next;
  }

  async function onImportUg(
    result: UgImportOk,
    runWand: boolean,
    metadata?: UgTabMetadata | null,
  ) {
    if (importAsNewSong) {
      setImportApplying(true);
      try {
        const name =
          metadata?.title?.trim() ||
          `Import UG ${new Date().toLocaleTimeString("pl")}`;
        const saved = await createSongWithContent(name, (shell) =>
          mergeUgIntoProject(shell, result, runWand, metadata),
        );
        closeImportModals();
        setSongScreenOpen(false);
        flashCanvasNotice(
          runWand
            ? `Nowy utwór „${saved.name}”: Import UG (${result.sections.length} sekcji) + Różdżka`
            : `Nowy utwór „${saved.name}”: Import UG (${result.sections.length} sekcji)`,
        );
        navigate(`/timeline/${saved.id}`);
      } catch (err) {
        setImportApplying(false);
        flashCanvasNotice(
          err instanceof Error ? err.message : "Import UG nie powiódł się",
        );
      }
      return;
    }
    if (!draftProject) return;
    const next = mergeUgIntoProject(draftProject, result, runWand, metadata);
    commitDraft(next);
    flashCanvasNotice(
      runWand
        ? `Import UG: ${result.sections.length} sekcji + Różdżka — sprawdź Formę i Tap`
        : `Import UG: ${result.sections.length} sekcji — Różdżka (W) gdy Formę dopracujesz`,
    );
    closeImportModals();
    setSongScreenOpen(false);
  }

  async function onImportUltrastar(result: UltrastarImportOk) {
    if (importAsNewSong) {
      setImportApplying(true);
      try {
        const name =
          result.title?.trim() ||
          `Import UltraStar ${new Date().toLocaleTimeString("pl")}`;
        const saved = await createSongWithContent(name, (shell) =>
          applyUltrastarImportToProject(shell, result),
        );
        closeImportModals();
        setSongScreenOpen(false);
        setSongMetaOpen(false);
        flashCanvasNotice(
          `Nowy utwór „${saved.name}”: Import UltraStar (${result.syllableCount} sylab)`,
        );
        navigate(`/timeline/${saved.id}`);
      } catch (err) {
        setImportApplying(false);
        flashCanvasNotice(
          err instanceof Error
            ? err.message
            : "Import UltraStar nie powiódł się",
        );
      }
      return;
    }
    if (!draftProject) return;
    const next = applyUltrastarImportToProject(draftProject, result);
    commitDraft(next);
    flashCanvasNotice(
      `Import UltraStar: ${result.syllableCount} sylab / ${result.tekst.clips.length} linii w draftcie — Zapisz (⌘S), aby utrwalić`,
    );
    closeImportModals();
    setSongScreenOpen(false);
    setSongMetaOpen(false);
  }

  async function onImportUsUgBridge(payload: UsUgApplyPayload) {
    const result = payload.bridge;
    const smartAudio = payload.smartTempoAudio;
    const pendingFile = payload.pendingAudioFile;
    const warn =
      result.approximate || result.warnings.length > 0
        ? " · sprawdź Formę / akordy"
        : "";
    const summary = `${result.sections.length} sekcji · ${result.akordy.clips.length} akordów · dopasowanie ${Math.round(result.alignScore * 100)}%${warn}`;
    setImportApplying(true);
    await yieldToUi();
    if (importAsNewSong) {
      try {
        const name =
          result.title?.trim() ||
          `Import US+UG ${new Date().toLocaleTimeString("pl")}`;
        let saved = await createSongWithContent(name, (shell) =>
          applyUsUgBridgeToProject(shell, result, {
            // Place clip only after real upload (skip synthetic local-* ids).
            smartTempoAudio: pendingFile ? undefined : smartAudio,
          }),
        );
        if (pendingFile && saved.id) {
          saved = await uploadProjectAudio(saved.id, pendingFile, {
            startTicks: 0,
          });
          const asset = saved.assets.at(-1);
          if (asset && smartAudio) {
            const withClip = applyUsUgBridgeToProject(saved, result, {
              smartTempoAudio: {
                ...smartAudio,
                assetId: asset.id,
              },
            });
            saved = await putProject(saved.id, {
              ...withClip,
              id: saved.id,
              updatedAt: saved.updatedAt,
              midiProgramId: saved.midiProgramId,
            });
          }
        }
        closeImportModals();
        setSongScreenOpen(false);
        setSongMetaOpen(false);
        flashCanvasNotice(`Nowy utwór „${saved.name}”: Import US+UG (${summary})`);
        navigate(`/timeline/${saved.id}`);
      } catch (err) {
        setImportApplying(false);
        flashCanvasNotice(
          err instanceof Error
            ? err.message
            : "Import US+UG nie powiódł się",
        );
      }
      return;
    }
    if (!draftProject) return;
    const baseDraft = payload.serverProjectSnapshot
      ? {
          ...draftProject,
          updatedAt: payload.serverProjectSnapshot.updatedAt,
          assets: payload.serverProjectSnapshot.assets,
          audioTracks: payload.serverProjectSnapshot.audioTracks,
          audioClips: payload.serverProjectSnapshot.audioClips,
        }
      : draftProject;
    let next = applyUsUgBridgeToProject(baseDraft, result, {
      smartTempoAudio: smartAudio,
    });
    if (pendingFile && projectId) {
      next = await uploadProjectAudio(projectId, pendingFile, { startTicks: 0 });
      const asset = next.assets.at(-1);
      if (asset && smartAudio) {
        next = applyUsUgBridgeToProject(next, result, {
          smartTempoAudio: { ...smartAudio, assetId: asset.id },
        });
      }
    }
    if (projectId) {
      try {
        next = await putProject(projectId, next);
      } catch (err) {
        console.warn("[TimelineShell] Auto-save on import failed, keeping draft:", err);
      }
    }
    commitDraft(next);
    flashCanvasNotice(`Import US+UG: ${summary}`);
    closeImportModals();
    setSongScreenOpen(false);
    setSongMetaOpen(false);
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
      let targetAudioLane: AudioLaneId | undefined = undefined;
      if (typeof window !== "undefined" && clientX != null && clientY != null) {
        const elem = document.elementFromPoint(clientX, clientY);
        const laneElem = elem?.closest("[data-audio-lane]");
        if (laneElem) {
          const laneId = laneElem.getAttribute("data-audio-lane");
          if (laneId && isAudioLaneId(laneId)) {
            targetAudioLane = laneId as AudioLaneId;
          }
        }
      }
      const preview = previewAudioFromSession(
        draft,
        session,
        rawTicks,
        metaKey,
        ctrlKey,
        clientY,
        targetAudioLane,
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
      const destLane = (
        preview.targetLane && isAudioLaneId(preview.targetLane)
          ? preview.targetLane
          : lane
      ) as AudioLaneId;
      const next = commitAudioGesture(
        draft,
        lane as AudioLaneId,
        session,
        preview,
        metaKey,
        ctrlKey,
        destLane,
      );
      commitDraft(next);
      if (session.kind === "move" && session.moveIds?.length) {
        setClipSelection((prev) =>
          setSelection(
            [
              ...prev.items.filter((i) => i.lane !== lane && i.lane !== destLane),
              ...session.moveIds!.map((id) => ({ id, lane: destLane })),
            ],
            session.clipId,
          ),
        );
        return;
      }
      if (session.clipId) selectLaneClip(destLane, session.clipId);
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
    } else if (session.kind === "move" && session.clipId) {
      // TE-24 cascade: moveIds may include later sections for the commit, but
      // selection stays on the primary unless the user had explicit multi-select.
      const selectIds = selectionIdsAfterFormaMove(
        session.clipId,
        session.moveIds ?? [session.clipId],
        Boolean(session.explicitMulti),
      );
      setClipSelection((prev) =>
        setSelection(
          [
            ...prev.items.filter((i) => i.lane !== "forma"),
            ...selectIds.map((id) => ({ id, lane: "forma" as const })),
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
      updateFormaGesturePreview(raw, e.metaKey, e.ctrlKey, e.clientX, e.clientY);
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
  }, [gestureSession?.pointerId, gestureSession?.kind, gestureSession?.clipId, gesturePreview]);

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
      if (toolUsesMarqueeGesture(tool, e.pointerType)) {
        beginMarquee(e);
      } else if (
        isTouchPointerType(e.pointerType) &&
        tool === "pointer" &&
        !heldZoomRef.current
      ) {
        beginTouchCanvasNav(e);
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
      explicitMulti: kind === "move" ? inMulti : undefined,
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

  function beginTouchCanvasNav(e: React.PointerEvent<HTMLElement>) {
    // Do not preventDefault — browser pans the scroll viewport.
    touchCanvasNavRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
    };
    setTouchCanvasNavActive(true);
  }

  function finishTouchCanvasNav(clientX: number, clientY: number) {
    const nav = touchCanvasNavRef.current;
    touchCanvasNavRef.current = null;
    setTouchCanvasNavActive(false);
    if (!nav) return;
    const dx = clientX - nav.startX;
    const dy = clientY - nav.startY;
    if (!isMarqueeClick(dx, dy)) return;
    clearClipSelection();
    clearMapSelection();
    setSelectedAnchorId(null);
    setLocatorFromClientX(clientX, { seekTransport: true });
  }

  function beginMarquee(e: React.PointerEvent<HTMLElement>) {
    if (
      isTouchPointerType(e.pointerType) &&
      toolRef.current === "pointer" &&
      !heldZoomRef.current
    ) {
      beginTouchCanvasNav(e);
      return;
    }
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
    if (!touchCanvasNavActive) return;
    function onUp(e: PointerEvent) {
      const nav = touchCanvasNavRef.current;
      if (!nav || e.pointerId !== nav.pointerId) return;
      finishTouchCanvasNav(e.clientX, e.clientY);
    }
    function onCancel(e: PointerEvent) {
      const nav = touchCanvasNavRef.current;
      if (!nav || e.pointerId !== nav.pointerId) return;
      touchCanvasNavRef.current = null;
      setTouchCanvasNavActive(false);
    }
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session gated by active flag
  }, [touchCanvasNavActive]);

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
    const snapped = snapLocatorTicks(draftRef.current, ticks, mode);
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
    if (isMobilePreview) {
      setTouchAlertOpen(true);
      return;
    }
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
    if (isMobilePreview) {
      setTouchAlertOpen(true);
      return;
    }
    setClipSelection(clearSelection());
    setSelectedBusId(null);
    setSelectedHwOutputId(null);
    const alreadySelected = isAudioTrackSelected(trackSelection, trackId);
    const trackCount = alreadySelected ? trackSelection.ids.length : 1;
    if (!alreadySelected) {
      setTrackSelection(selectAudioTrack(trackId));
    }
    openContextMenu({
      x: clientX,
      y: clientY,
      label: audioTrackContextMenuLabel(trackCount),
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
    setSelectedBusId(null);
    setSelectedHwOutputId(null);
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
        const prev = draftProject.audioTracks.find((t) => t.id === trackId)
          ?.output;
        if (
          isHwOutRepatchBlockedWhilePlaying(state.playing, prev, output)
        ) {
          return;
        }
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
      onOutputChange: (value) => {
        if (!draftProject || state.playing) return;
        const m = /^ch:(\d+)$/.exec(value);
        if (!m) return;
        const channelOffset = Number(m[1]);
        try {
          commitDraft(
            setMasterOutputRouting(draftProject, { channelOffset }),
          );
        } catch (err) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Nie udało się zmienić wyjścia Master",
          );
        }
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
    setClipSelection(clearSelection());
    setTrackSelection(clearTrackSelection());
    setSelectedHwOutputId(null);
    setSelectedBusId(busId);
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
            setSelectedBusId((prev) => (prev === busId ? null : prev));
          },
        },
      ],
    });
  }

  function openHwContextMenu(
    hwOutputId: string,
    clientX: number,
    clientY: number,
  ) {
    setClipSelection(clearSelection());
    setTrackSelection(clearTrackSelection());
    setSelectedBusId(null);
    setSelectedHwOutputId(hwOutputId);
    openContextMenu({
      x: clientX,
      y: clientY,
      label: "Menu HW Out",
      items: [
        {
          id: "remove",
          label: "Usuń wyjście HW",
          danger: true,
          onSelect: () => {
            if (!draftProject) return;
            commitDraft(removeAudioHardwareOutput(draftProject, hwOutputId));
            setSelectedHwOutputId((prev) =>
              prev === hwOutputId ? null : prev,
            );
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

  function onAddHwOut() {
    if (!draftProject) return;
    const maxChannelCount = getAudioHwCapability().maxChannelCount;
    const rows = draftProject.audioHardwareOutputs ?? [];
    if (
      !canAddHardwareOutput(
        rows,
        maxChannelCount,
        "stereo",
        draftProject.masterOutput,
      )
    ) {
      return;
    }
    try {
      const { project } = addAudioHardwareOutput(draftProject, undefined, {
        maxChannelCount,
      });
      commitDraft(project);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Nie udało się dodać HW Out",
      );
    }
  }

  function onHwGainChange(hwOutputId: string, gainDb: number) {
    if (!draftProject) return;
    commitDraft(
      updateAudioHardwareOutput(draftProject, hwOutputId, { gainDb }),
    );
  }

  function onHwMuteToggle(hwOutputId: string) {
    if (!draftProject) return;
    const row = draftProject.audioHardwareOutputs?.find(
      (h) => h.id === hwOutputId,
    );
    commitDraft(
      updateAudioHardwareOutput(draftProject, hwOutputId, {
        muted: !row?.muted,
      }),
    );
  }

  function onHwChannelModeChange(
    hwOutputId: string,
    mode: "mono" | "stereo",
  ) {
    if (!draftProject) return;
    commitDraft(
      updateAudioHardwareOutput(draftProject, hwOutputId, { channelMode: mode }),
    );
  }

  function onHwSelect(hwOutputId: string, e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button, label, input")) {
      return;
    }
    setClipSelection(clearSelection());
    setTrackSelection(clearTrackSelection());
    setSelectedBusId(null);
    setSelectedHwOutputId(hwOutputId);
  }

  function onHwContextMenu(hwOutputId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    openHwContextMenu(hwOutputId, e.clientX, e.clientY);
  }

  function buildBusCallbacks(busId: string): ChannelStripCallbacks {
    return {
      onSelect: () => {
        setClipSelection(clearSelection());
        setTrackSelection(clearTrackSelection());
        setSelectedHwOutputId(null);
        setSelectedBusId(busId);
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
      onOutputChange: (output) => {
        if (!draftProject) return;
        const bus = draftProject.audioBusses?.find((b) => b.id === busId);
        const prev =
          bus?.output?.kind === "hw_out" || bus?.output?.kind === "bus"
            ? bus.output
            : ({ kind: "master" } as const);
        if (
          isHwOutRepatchBlockedWhilePlaying(state.playing, prev, output)
        ) {
          return;
        }
        commitDraft(setAudioBusOutput(draftProject, busId, output));
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

  async function onUploadAudioToTrack(
    trackId: string,
    file: File,
    opts?: { startTicks?: number },
  ) {
    if (!projectId || !draftProject) return;
    if (audioUploadPendingRef.current) return;
    audioUploadPendingRef.current = true;
    setAudioUploadPending(true);
    try {
      const next = await uploadProjectAudio(projectId, file, {
        trackId,
        startTicks: opts?.startTicks,
      });
      // Merge any client-side audio tracks that might not be on server yet
      const mergedTracks = [...next.audioTracks];
      for (const dt of draftProject.audioTracks) {
        if (!mergedTracks.some((t) => t.id === dt.id)) {
          mergedTracks.push(dt);
        }
      }
      let project = { ...next, audioTracks: mergedTracks };
      let targetTrackId = trackId;
      let lastClipId: string | null = null;
      if (next.assets.length && next.audioClips.length) {
        const uploadedAsset = next.assets
          .filter((a) => a.kind === "audio")
          .at(-1);
        const uploadedClip = uploadedAsset
          ? next.audioClips.find((c) => c.assetId === uploadedAsset.id) ??
            next.audioClips[next.audioClips.length - 1]!
          : next.audioClips[next.audioClips.length - 1]!;
        lastClipId = uploadedClip.id;
        if (trackId && uploadedClip.trackId !== trackId) {
          project = {
            ...project,
            audioClips: project.audioClips.map((c) =>
              c.id === uploadedClip.id ? { ...c, trackId } : c,
            ),
          };
        }
        targetTrackId = trackId || uploadedClip.trackId;
        const buf = await loadAudioBuffer(projectId, uploadedClip.assetId);
        if (buf) {
          project = setAudioTrackChannelMode(
            project,
            targetTrackId,
            channelModeFromChannelCount(buf.numberOfChannels),
          );
        }
        if (
          lastClipId &&
          opts?.startTicks != null &&
          Number.isFinite(opts.startTicks)
        ) {
          project = placeImportedAudioClipAt(
            project,
            lastClipId,
            opts.startTicks,
            buf ? { durationMs: buf.duration * 1000 } : undefined,
          );
        } else if (lastClipId && buf) {
          project = placeImportedAudioClipAt(
            project,
            lastClipId,
            uploadedClip.startTicks,
            { durationMs: buf.duration * 1000 },
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

    if (tool === "scissors" || toolIsPencilDraw(tool)) {
      e.preventDefault();
      e.stopPropagation();
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
    // Pointer: touch pans the canvas; mouse tap seeks via touch-nav / empty handlers.
    if (
      isTouchPointerType(e.pointerType) &&
      tool === "pointer" &&
      !heldZoomRef.current
    ) {
      beginTouchCanvasNav(e);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
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
    if (isMobilePreview) {
      setTouchAlertOpen(true);
      return;
    }
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
          "Zaznacz sekcję Formy albo klipy Tekstu/Akordów — Różdżka nie działa na Cue",
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
    let msg = result.message || `Różdżka: ${result.placed} klipów`;
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
    onClipCut: cutClipSelection,
    onClipCopy: copyClipSelection,
    onClipPaste: () => pasteClipClipboard(locatorTicks),
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
    if (isMobilePreview) {
      setTouchAlertOpen(true);
      return;
    }
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
    const prev = clipSelectionRef.current;
    const alreadySelected = isClipSelected(prev, clipId, args.selectionLane);
    const onLaneIds = alreadySelected
      ? idsOnLane(prev, args.selectionLane)
      : [];
    const multiIds = onLaneIds.length > 1 ? onLaneIds : null;
    const selectionCount = multiIds?.length ?? 1;
    flushSync(() => {
      if (multiIds) {
        setClipSelection(setSelection(prev.items, clipId));
        setSelectedSubsectionIdx(null);
        setSelectedAnchorId(null);
        setSongMetaOpen(false);
        setInspectorVisible(true);
      } else {
        selectLaneClip(args.selectionLane, clipId);
      }
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
      label: clipContextMenuLabel(selectionCount),
      items: buildClipContextMenuItems({
        lane,
        canPaste,
        canSplit: canSplit && splitTicks != null && !multiIds,
        clipMuted,
        onCopy: () => {
          if (multiIds) {
            copyClipSelection();
            return;
          }
          copyThisClip();
        },
        onCut: () => {
          if (multiIds) {
            if (!copyClipSelection()) return;
            deleteSelectedFormaClip();
            return;
          }
          if (!canDelete) return;
          if (!copyThisClip()) return;
          deleteThisClip();
        },
        onPaste: () => {
          pasteClipClipboard(locatorTicks);
        },
        onDuplicate: () => {
          if (multiIds) {
            duplicateClipSelection();
            return;
          }
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
        onDelete: () => {
          if (multiIds) {
            deleteSelectedFormaClip();
            return;
          }
          deleteThisClip();
        },
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
          canSplit && splitTicks != null && !multiIds
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
    if (isMobilePreview) {
      setTouchAlertOpen(true);
      return;
    }
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
                laneImportStartTicksRef.current = null;
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

      const isAudioMoving =
        gestureSession?.kind === "move" && isAudioLaneId(gestureSession.lane ?? "");
      const sourceAudioLane = isAudioMoving ? (gestureSession!.lane as AudioLaneId) : null;
      const targetAudioLane = isAudioMoving
        ? ((gesturePreview?.targetLane as AudioLaneId | undefined) ?? sourceAudioLane)
        : null;
      const moveIds = isAudioMoving
        ? gestureSession!.moveIds?.length
          ? gestureSession!.moveIds
          : gestureSession!.clipId
            ? [gestureSession!.clipId]
            : []
        : [];
      const moveDelta =
        gesturePreview && isAudioMoving
          ? gesturePreview.startTicks - gestureSession!.originClipStart
          : 0;

      const isTargetLane = isAudioMoving && targetAudioLane === lane && targetAudioLane !== sourceAudioLane;
      const ghostClips = isTargetLane
        ? moveIds
            .map((id) => draftProject.audioClips.find((c) => c.id === id))
            .filter(Boolean)
        : [];

      return (
        <>
          {clips.map((clip) => {
            const asset = assetById.get(clip.assetId);
            const isBeingMoved = isAudioMoving && moveIds.includes(clip.id);
            const isSourceLane = isAudioMoving && sourceAudioLane === lane;

            const previewing =
              Boolean(gesturePreview) &&
              ((isSourceLane && isBeingMoved) ||
                (gestureSession?.lane === lane &&
                  gesturePreview!.clipId === clip.id &&
                  gesturePreview!.kind !== "move"));

            const styleClip: FormaClip = {
              id: clip.id,
              name: asset?.originalName ?? "Audio",
              kind: "section",
              startTicks:
                previewing && isSourceLane && isBeingMoved
                  ? targetAudioLane === sourceAudioLane
                    ? clip.startTicks + moveDelta
                    : clip.startTicks
                  : previewing
                    ? gesturePreview!.startTicks
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

          {ghostClips.map((ghostClip) => {
            if (!ghostClip) return null;
            const asset = assetById.get(ghostClip.assetId);
            const styleClip: FormaClip = {
              id: `ghost-${ghostClip.id}`,
              name: asset?.originalName ?? "Audio",
              kind: "section",
              startTicks: ghostClip.startTicks + moveDelta,
              lengthTicks: ghostClip.lengthTicks,
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
                key={`ghost-${ghostClip.id}`}
                type="button"
                className={[
                  styles.clip,
                  styles.audioClip,
                  styles.formaClipDim,
                ].join(" ")}
                style={{
                  ...style,
                  ["--tl-track-color" as string]: trackColor,
                }}
                disabled
              >
                {(ghostClip.fadeInMs ?? 0) > 0 ? (
                  <span
                    className={styles.audioFadeIn}
                    style={{
                      width: `${Math.min(widthPx * 0.45, Math.max(4, widthPx * 0.12))}px`,
                    }}
                  />
                ) : null}
                {(ghostClip.fadeOutMs ?? 0) > 0 ? (
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
    const mapSegmentSelected = (eventId: string, lane: MapLaneId) =>
      selectedMapLane === lane && selectedMapIds.includes(eventId);
    const mapSegmentAriaLabel = (
      seg: { label: string; eventId: string },
      lane: MapLaneId,
    ) =>
      mapSegmentSelectionAriaLabel(seg.label, {
        selected: mapSegmentSelected(seg.eventId, lane),
        groupSize:
          mapSegmentSelected(seg.eventId, lane) &&
          selectedMapLane === lane &&
          selectedMapIds.length > 1
            ? selectedMapIds.length
            : undefined,
      });

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
            aria-label={mapSegmentAriaLabel(seg, "tempo")}
            onPointerDown={(e) => onMapSegmentPointerDown(e, "tempo", seg)}
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
            aria-label={mapSegmentAriaLabel(seg, "metrum")}
            onPointerDown={(e) => onMapSegmentPointerDown(e, "metrum", seg)}
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
            aria-label={mapSegmentAriaLabel(seg, "tonacja")}
            onPointerDown={(e) => onMapSegmentPointerDown(e, "tonacja", seg)}
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
                    <FormaClipPreview
                      key={ghost.id}
                      label={clip.name}
                      style={clipStylePx(
                        ghost,
                        viewSpan,
                        barTicks,
                        effectiveZoomH,
                      )}
                    />
                  );
                })
              : null}
            {gesturePreview?.kind === "pencil-draw" &&
            (gestureSession?.lane ?? "forma") === "forma" ? (
              <FormaClipPreview
                label={gesturePreview.name ?? "Sekcja"}
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
              />
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
                    <FormaClipPreview
                      key={ghost.id}
                      label={label}
                      style={clipStylePx(
                        ghost,
                        viewSpan,
                        barTicks,
                        effectiveZoomH,
                      )}
                    />
                  );
                })
              : null}
            {gesturePreview?.kind === "pencil-draw" &&
            gestureSession?.lane === lane ? (
              <FormaClipPreview
                label={gesturePreview.name ?? defaultPencilLabel(lane)}
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
              />
            ) : null}
          </>
        );
      }
      default:
        return null;
    }
  }

  const operatorNavCompact = isCompactMobile && showOperatorNav;
  const headerHistory = isMobilePreview
    ? undefined
    : {
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
      };
  const headerOnFullscreen = shouldShowFullscreenControl()
    ? () => {
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
      }
    : undefined;
  const timelineHeaderActions = (
    <AppHeaderActions
      history={headerHistory}
      helpPressed={helpOpen}
      onHelp={() => setHelpOpen(true)}
      onFullscreen={operatorNavCompact ? undefined : headerOnFullscreen}
    />
  );
  const fullscreenButton = shouldShowFullscreenControl() ? (
    <ShellIconButton label="Pełny ekran" onClick={headerOnFullscreen}>
      <IconFullscreen />
    </ShellIconButton>
  ) : null;

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
      data-tl-touch-pan={
        toolNeedsExclusiveTouchAction(heldZoom ? "zoom" : tool)
          ? undefined
          : ""
      }
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
          const startTicks = laneImportStartTicksRef.current;
          laneImportTrackIdRef.current = null;
          laneImportStartTicksRef.current = null;
          if (f && trackId) {
            void onUploadAudioToTrack(
              trackId,
              f,
              startTicks != null ? { startTicks } : undefined,
            );
          }
        }}
      />
      {operatorNavCompact ? (
        <div className={styles.topChrome}>
          <OperatorNav
            activeApp="timeline"
            center={draftProject?.name ?? projectId ?? undefined}
            trailing={fullscreenButton}
          />
        </div>
      ) : (
        <AppHeader
          suffix="Timeline"
          version={APP_VERSION}
          appJump={[
            { to: "/admin", label: "Admin" },
            { to: "/client", label: "Klient" },
          ]}
          operatorApp="timeline"
          history={headerHistory}
          helpPressed={helpOpen}
          onHelp={() => setHelpOpen(true)}
          onFullscreen={headerOnFullscreen}
          hideOnDesktop={!shouldShowOperatorNav(pathname)}
        />
      )}

      <ConnectionLostBanner status={wsStatus} />

      {fullscreenError ? (
        <p className={styles.chromeAlert} role="alert">
          {fullscreenError}
        </p>
      ) : null}

      <TimelineToolbar
        operatorNavCompact={operatorNavCompact}
        timelineHeaderActions={timelineHeaderActions}
        isMobilePreview={isMobilePreview}
        tools={TOOLS}
        toolbarVisibleSet={toolbarVisibleSet}
        tool={tool}
        onTool={onTool}
        toolsVisBtnRef={toolsVisBtnRef}
        toolsVisOpen={toolsVisOpen}
        toolsVisMenuId={toolsVisMenuId}
        setToolsVisOpen={setToolsVisOpen}
        commandPending={commandPending}
        onStopClick={onStopClick}
        state={state}
        audioBuffering={audioBuffering}
        onPauseClick={onPauseClick}
        onPlayClick={onPlayClick}
        clockLabel={clockLabel}
        tempoAtPlayhead={tempoAtPlayhead}
        displayTicks={displayTicks}
        openMapEdit={openMapEdit}
        timelineSurface={timelineSurface}
        setTimelineSurface={setTimelineSurface}
        loopOn={loopOn}
        onLoopToggle={onLoopToggle}
        meterAtPlayhead={meterAtPlayhead}
        draftProject={draftProject}
        metronomeOn={metronomeOn}
        onMetronomeToggle={onMetronomeToggle}
        followPlayhead={followPlayhead}
        setFollowPlayhead={setFollowPlayhead}
        showMidiPlayhead={showMidiPlayhead}
        setShowMidiPlayhead={setShowMidiPlayhead}
        songMetaOpen={songMetaOpen}
        clearClipSelection={clearClipSelection}
        clearMapSelection={clearMapSelection}
        setInspectorVisible={setInspectorVisible}
        setSongMetaOpen={setSongMetaOpen}
        prevSetlistId={prevSetlistId}
        nextSetlistId={nextSetlistId}
        songScreenOpen={songScreenOpen}
        setSongScreenOpen={setSongScreenOpen}
        songScreenId={songScreenId}
        setlistEnabled={setlistEnabled}
        autoAdvance={autoAdvance}
        patchSetlistAutoAdvance={patchSetlistAutoAdvance}
        setAutoAdvance={setAutoAdvance}
      />

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
            <MixerDock
              draftProject={draftProject}
              trackSelection={trackSelection}
              soloAudioTrackIds={soloAudioTrackIds}
              soloBusIds={soloBusIds}
              selectedBusId={selectedBusId}
              selectedHwOutputId={selectedHwOutputId}
              trackRename={trackRename}
              busRename={busRename}
              buildChannelStripCallbacks={buildChannelStripCallbacks}
              buildBusCallbacks={buildBusCallbacks}
              buildMasterStripCallbacks={buildMasterStripCallbacks()}
              onMetronomeToggle={onMetronomeToggle}
              metronomeOn={metronomeOn}
              playing={state.playing}
              onAddAudioTrack={onAddAudioTrack}
              onAddBus={onAddBus}
              onAddHwOut={onAddHwOut}
              onHwSelect={onHwSelect}
              onHwContextMenu={onHwContextMenu}
              onHwGainChange={onHwGainChange}
              onHwMuteToggle={onHwMuteToggle}
              onHwChannelModeChange={onHwChannelModeChange}
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
                    <ShellIconButton
                      ref={eyeBtnRef}
                      label="Widoczność ścieżek"
                      pressed={eyeOpen}
                      aria-expanded={eyeOpen}
                      aria-haspopup="menu"
                      aria-controls={eyeOpen ? eyeMenuId : undefined}
                      onClick={() => setEyeOpen((v) => !v)}
                    >
                      <IconEye />
                    </ShellIconButton>
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
                      {track.id === "forma" && !isMobilePreview ? (
                        <Button
                          variant="ghost"
                          iconOnly
                          selected={tool === "wand"}
                          className={
                            tool === "wand" ? styles.tapBtnSelected : undefined
                          }
                          title="Różdżka — rozmieszcza Tekst/Akordy wg Formy (W)"
                          aria-label="Różdżka — rozmieszcza Tekst/Akordy wg Formy"
                          onClick={() => onTool("wand")}
                        >
                          <IconWand />
                        </Button>
                      ) : null}
                      {track.id === "tekst" && !isMobilePreview ? (
                        <Button
                          variant="ghost"
                          iconOnly
                          selected={tool === "tap"}
                          className={
                            tool === "tap" ? styles.tapBtnSelected : undefined
                          }
                          title="Tap — kolejka linii Tekstu; Spacja = start przy playheadzie"
                          aria-label="Tap — kolejka linii Tekstu"
                          onClick={() => onTool("tap")}
                        >
                          <IconTap />
                        </Button>
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
                      data-audio-lane={isAudioLaneId(track.id) ? track.id : undefined}
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
                                    if (
                                      toolUsesMarqueeGesture(tool, e.pointerType)
                                    ) {
                                      beginMarquee(e);
                                    } else if (
                                      isTouchPointerType(e.pointerType) &&
                                      tool === "pointer" &&
                                      !heldZoomRef.current
                                    ) {
                                      beginTouchCanvasNav(e);
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
                                    if (toolIsPencilDraw(tool)) {
                                      const raw = rawTicksAtClientX(e.clientX);
                                      if (raw == null || !track.audioTrackId) {
                                        return;
                                      }
                                      const draft = draftRef.current;
                                      if (!draft) return;
                                      const mode = contentSnapModeFromModifiers(
                                        e.metaKey,
                                        e.ctrlKey,
                                      );
                                      const snapped = snapEditTicks(
                                        draft,
                                        raw,
                                        mode,
                                      );
                                      laneImportTrackIdRef.current =
                                        track.audioTrackId;
                                      laneImportStartTicksRef.current = snapped;
                                      laneAudioFileRef.current?.click();
                                      return;
                                    }
                                    if (
                                      toolUsesMarqueeGesture(tool, e.pointerType)
                                    ) {
                                      beginMarquee(e);
                                    } else if (
                                      isTouchPointerType(e.pointerType) &&
                                      tool === "pointer" &&
                                      !heldZoomRef.current
                                    ) {
                                      beginTouchCanvasNav(e);
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
                        isAudioLaneId(track.id) && toolIsPencilDraw(tool)
                          ? styles.formaLanePencil
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
                  {isMobilePreview ? (
                    <div className={styles.dockColumnFill} aria-hidden />
                  ) : (
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
                  )}
                  <div
                    className={styles.laneFillHit}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      if (toolUsesMarqueeGesture(tool, e.pointerType)) {
                        beginMarquee(e);
                        return;
                      }
                      if (
                        isTouchPointerType(e.pointerType) &&
                        tool === "pointer" &&
                        !heldZoomRef.current
                      ) {
                        beginTouchCanvasNav(e);
                      }
                    }}
                  />
                </div>
              </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {!isMobilePreview ? (
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
            {clipSelection.items.length > 1 ? (
              <p
                className={styles.inspMulti}
                role="status"
                aria-live="polite"
              >
                Zaznaczono {clipSelection.items.length} klipów
                {selectionLane
                  ? ` · ${
                      selectionLane === "forma"
                        ? "Forma"
                        : selectionLane === "tekst"
                          ? "Tekst"
                          : selectionLane === "akordy"
                            ? "Akordy"
                            : selectionLane === "cue"
                              ? "Cue"
                              : "Audio"
                    }`
                  : ""}
              </p>
            ) : null}
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
                      aria-label="Tonika (start)"
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
                      aria-label="Tryb (start)"
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
                <div className={styles.inspField}>
                  Import (nadpisuje bieżący utwór)
                  <div className={styles.metaKeyRow}>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => openImportUsUg(false)}
                    >
                      Import US+UG
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => openImportUg(false)}
                    >
                      Importuj UG
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => openImportUltrastar(false)}
                    >
                      Importuj UltraStar
                    </Button>
                  </div>
                </div>
              </div>
            ) : selectedMapLane && selectedMapIds.length > 0 ? (
              <div className={styles.inspBody}>
                <p
                  className={styles.inspMulti}
                  role="status"
                  aria-live="polite"
                >
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
                    aria-label="Start tekstu (takt.beat)"
                    onBlur={(e) => {
                      if (!draftProject) return;
                      const parsed = parseStartBarBeat(e.target.value);
                      if (!parsed) return;
                      const beat = clampBeatForProject(
                        draftProject,
                        parsed.bar,
                        parsed.beat,
                      );
                      const startTicks = ticksFromDisplayBarBeat(
                        draftProject,
                        parsed.bar,
                        beat,
                      );
                      commitDraft(
                        setTekstClipStart(
                          draftProject,
                          selectedTekstClip.id,
                          startTicks,
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
                    onBlur={(e) => {
                      if (!draftProject) return;
                      commitDraft(
                        commitAkordyClipSymbol(
                          draftProject,
                          selectedAkordClip.id,
                          e.target.value,
                        ),
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      (e.currentTarget as HTMLInputElement).blur();
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
                    aria-label="Start akordu (takt.beat)"
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
                <fieldset className={styles.inspFieldset}>
                  <legend>Sampler</legend>
                  <label className={styles.inspField}>
                    Asset audio
                    <select
                      className={styles.nameInput}
                      aria-label="Cue sample asset"
                      value={selectedCueClip.sample?.assetId ?? ""}
                      onChange={(e) => {
                        if (!draftProject) return;
                        const assetId = e.target.value;
                        if (!assetId) {
                          commitDraft(
                            setCueClipSample(
                              draftProject,
                              selectedCueClip.id,
                              null,
                            ),
                          );
                          return;
                        }
                        commitDraft(
                          setCueClipSample(draftProject, selectedCueClip.id, {
                            ...(selectedCueClip.sample ?? {}),
                            assetId,
                          }),
                        );
                      }}
                    >
                      <option value="">— brak —</option>
                      {draftProject!.assets
                        .filter((a) => a.kind === "audio")
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.originalName}
                          </option>
                        ))}
                    </select>
                  </label>
                  {selectedCueClip.sample ? (
                    <>
                      <label className={styles.inspField}>
                        Tryb
                        <select
                          className={styles.nameInput}
                          aria-label="Cue sample mode"
                          value={selectedCueClip.sample.mode ?? "one-shot"}
                          onChange={(e) => {
                            if (!draftProject || !selectedCueClip.sample) return;
                            const mode =
                              e.target.value === "gated" ? "gated" : "one-shot";
                            commitDraft(
                              setCueClipSample(
                                draftProject,
                                selectedCueClip.id,
                                { ...selectedCueClip.sample, mode },
                              ),
                            );
                          }}
                        >
                          <option value="one-shot">One-shot</option>
                          <option value="gated">Gated</option>
                        </select>
                      </label>
                      <label className={styles.inspField}>
                        Out
                        <select
                          className={styles.nameInput}
                          aria-label="Cue sample output"
                          value={
                            selectedCueClip.sample.output?.kind === "bus"
                              ? `bus:${selectedCueClip.sample.output.busId}`
                              : selectedCueClip.sample.output?.kind === "hw_out"
                                ? `hw:${selectedCueClip.sample.output.hwOutputId}`
                                : "master"
                          }
                          onChange={(e) => {
                            if (!draftProject || !selectedCueClip.sample) return;
                            const v = e.target.value;
                            const output = v.startsWith("hw:") && v.length > 3
                              ? ({
                                  kind: "hw_out" as const,
                                  hwOutputId: v.slice(3),
                                })
                              : v.startsWith("bus:") && v.length > 4
                                ? ({
                                    kind: "bus" as const,
                                    busId: v.slice(4),
                                  })
                                : ({ kind: "master" as const });
                            commitDraft(
                              setCueClipSample(
                                draftProject,
                                selectedCueClip.id,
                                { ...selectedCueClip.sample, output },
                              ),
                            );
                          }}
                        >
                          <option value="master">Master</option>
                          {(draftProject!.audioBusses ?? []).map((b) => (
                            <option key={b.id} value={`bus:${b.id}`}>
                              {b.name}
                            </option>
                          ))}
                          {(draftProject!.audioHardwareOutputs ?? []).map(
                            (h) => (
                              <option key={h.id} value={`hw:${h.id}`}>
                                {h.name}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <label className={styles.inspCheck}>
                        <input
                          type="checkbox"
                          checked={Boolean(
                            selectedCueClip.sample.playPostStop,
                          )}
                          onChange={(e) => {
                            if (!draftProject || !selectedCueClip.sample) return;
                            commitDraft(
                              setCueClipSample(
                                draftProject,
                                selectedCueClip.id,
                                {
                                  ...selectedCueClip.sample,
                                  playPostStop: e.target.checked || undefined,
                                },
                              ),
                            );
                          }}
                        />
                        Graj po Stop
                      </label>
                      <button
                        type="button"
                        className={styles.nameInput}
                        onClick={() => {
                          if (!draftProject || !projectId) return;
                          void fireCueSampleGo(
                            projectId,
                            draftProject,
                            selectedCueClip.id,
                            displayTicks,
                          );
                        }}
                      >
                        GO
                      </button>
                    </>
                  ) : null}
                </fieldset>
                <label className={styles.inspField}>
                  Start (takt.beat)
                  <input
                    className={styles.nameInput}
                    defaultValue={formatStartBarBeat(
                      draftProject!,
                      selectedCueClip.startTicks,
                    )}
                    key={`cue-start-${selectedCueClip.id}-${selectedCueClip.startTicks}`}
                    aria-label="Start cue (takt.beat)"
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
                  Wycisz klip
                </label>
                <label className={styles.inspField}>
                  Trim początku (ms)
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
                  Trim końca (ms)
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
                  Gain klipu (dB)
                  <Slider
                    aria-label="Gain klipu"
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
                    aria-label="Fade In"
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
                    aria-label="Fade Out"
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
                  Pętla
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
                    <TaperGainSlider
                      aria-label="Fader ścieżki"
                      gainDb={selectedDockAudioTrack.gainDb ?? 0}
                      onGainChange={(v) => {
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
        ) : null}
      </div>

      <footer className={styles.status} aria-label="Status osi czasu">
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
          {!isMobilePreview ? (
          <label className={styles.snapPicker}>
            <span className={styles.snapPickerLab}>Snap</span>
            <Select
              className={styles.snapPickerSelect}
              aria-label="Tryb snap"
              value={snapModeToStorageKey(snapMode)}
              onChange={(e) => {
                const next = snapModeFromStorageKey(e.target.value);
                if (next) setSnapMode(next);
              }}
            >
              <option value="off">Wyłącz</option>
              <option value="bar">Takt</option>
              <option value="beat">Beat</option>
              <option value="subdivision:2">1/2</option>
              <option value="subdivision:4">1/4</option>
              <option value="subdivision:8">1/8</option>
              <option value="subdivision:16">1/16</option>
            </Select>
          </label>
          ) : null}
          {!isMobilePreview ? (
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
          ) : null}
          <label
            className={styles.zoomLab}
            title={
              timelineSurface === "mixer"
                ? "Zoom poziomy dotyczy osi czasu (niedostępny w Mixerze)"
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
                ? "Zoom pionowy dotyczy wysokości ścieżek (niedostępny w Mixerze)"
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
        <TouchNudgeBar
          clipId={primaryId}
          lane={selectionLane}
          showLeftEdge={nudgeShowsLeftEdge(
            draftProject,
            selectionLane,
            primaryId,
          )}
          onAction={(action) => {
            commitDraft(
              applyTimelineNudge(
                draftProject,
                selectionLane,
                primaryId,
                action,
              ),
            );
          }}
        />
      ) : null}

      {canvasNotice ? (
        <p className={styles.canvasNotice} role="status" aria-live="polite">
          {canvasNotice}
        </p>
      ) : null}

      {touchTier === "mobile" ? (
        <p className={styles.touchTierNote} role="status">
          Tryb odtwarzacza
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

      {songScreenOpen ? (
        <div
          id={songScreenId}
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby="song-screen-title"
        >
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
                  variant="primary"
                  onClick={() => openImportUsUg(true)}
                >
                  Import US+UG
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openImportUg(true)}
                >
                  Importuj UG
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openImportUltrastar(true)}
                >
                  Importuj UltraStar
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {ugModalOpen && (importAsNewSong || draftProject) ? (
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
            onClick={closeImportModals}
          />
          <div className={styles.overlayPanel}>
            <div className={styles.overlayHead}>
              <h2 id="ug-import-title">
                {importAsNewSong
                  ? "Importuj Ultimate Guitar — nowy utwór"
                  : "Importuj Ultimate Guitar"}
              </h2>
              <ShellIconButton label="Zamknij" onClick={closeImportModals}>
                <IconClose />
              </ShellIconButton>
            </div>
            <div className={styles.overlayBody}>
              <UgImportForm
                applyLabel={
                  importAsNewSong
                    ? "Utwórz nowy utwór"
                    : "Importuj do draftu"
                }
                applying={importApplying}
                importOptions={importPreviewOptions}
                initialTitle={
                  importAsNewSong ? undefined : draftProject?.name
                }
                initialArtist={
                  importAsNewSong ? undefined : draftProject?.artist
                }
                onCancel={closeImportModals}
                onApply={({ result, runWand, metadata }) =>
                  onImportUg(result, runWand, metadata)
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {ultrastarModalOpen && (importAsNewSong || draftProject) ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby="ultrastar-import-title"
        >
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Zamknij"
            onClick={closeImportModals}
          />
          <div className={styles.overlayPanel}>
            <div className={styles.overlayHead}>
              <h2 id="ultrastar-import-title">
                {importAsNewSong
                  ? "Importuj UltraStar — nowy utwór"
                  : "Importuj UltraStar"}
              </h2>
              <ShellIconButton label="Zamknij" onClick={closeImportModals}>
                <IconClose />
              </ShellIconButton>
            </div>
            <div className={styles.overlayBody}>
              <UltrastarImportForm
                applyLabel={
                  importAsNewSong
                    ? "Utwórz nowy utwór"
                    : "Importuj do draftu"
                }
                applying={importApplying}
                importOptions={importPreviewOptions}
                initialTitle={
                  importAsNewSong ? undefined : draftProject?.name
                }
                initialArtist={
                  importAsNewSong ? undefined : draftProject?.artist
                }
                onCancel={closeImportModals}
                onApply={onImportUltrastar}
              />
            </div>
          </div>
        </div>
      ) : null}

      {combinedImportModalOpen && (importAsNewSong || draftProject) ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby="us-ug-import-title"
        >
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Zamknij"
            onClick={closeImportModals}
          />
          <div
            className={[styles.overlayPanel, styles.usUgOverlayPanel]
              .filter(Boolean)
              .join(" ")}
          >
            <div className={styles.usUgOverlayHead}>
              <h2 id="us-ug-import-title">Import US+UG</h2>
              <ShellIconButton label="Zamknij" onClick={closeImportModals}>
                <IconClose />
              </ShellIconButton>
            </div>
            <div className={styles.usUgOverlayBody}>
              <CombinedUsUgImportForm
                applyLabel="Importuj do projektu"
                applying={importApplying}
                projectId={importAsNewSong ? undefined : projectId ?? undefined}
                importOptions={importPreviewOptions}
                initialTitle={
                  importAsNewSong ? undefined : draftProject?.name
                }
                initialArtist={
                  importAsNewSong ? undefined : draftProject?.artist
                }
                onCancel={closeImportModals}
                onApply={onImportUsUgBridge}
              />
            </div>
          </div>
        </div>
      ) : null}

      {eyeOpen && eyeMenuPos
        ? createPortal(
            <div
              ref={eyeMenuRef}
              id={eyeMenuId}
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
              id={toolsVisMenuId}
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
                    {key ? key.toUpperCase() : "—"}
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
              aria-label="Różdżka — wybór źródła"
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
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby={tempoEditTitleId}
        >
          <div className={styles.overlayPanel}>
            <h2 id={tempoEditTitleId}>
              Tempo @ {mapEditTicks === displayTicks ? "playhead" : "ścieżka"}
            </h2>
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
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby={meterEditTitleId}
        >
          <div className={styles.overlayPanel}>
            <h2 id={meterEditTitleId}>
              Metrum @ {mapEditTicks === displayTicks ? "playhead" : "ścieżka"}
            </h2>
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
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby={keyEditTitleId}
        >
          <div className={styles.overlayPanel}>
            <h2 id={keyEditTitleId}>
              Tonacja @ {mapEditTicks === displayTicks ? "playhead" : "ścieżka"}
            </h2>
            <div
              className={styles.keyEditRow}
              role="group"
              aria-label="Tonacja"
            >
              <select
                className={styles.nameInput}
                id="key-tonic"
                aria-label="Tonika"
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

function TouchNudgeBar({
  clipId,
  lane,
  showLeftEdge,
  onAction,
}: {
  clipId: string;
  lane: string;
  showLeftEdge: boolean;
  onAction: (action: NudgeAction) => void;
}) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  const reposition = useCallback(() => {
    const leftEdge = leftRef.current;
    const rightEdge = rightRef.current;
    if (!rightEdge && !leftEdge) return;

    const clipEl =
      document.querySelector<HTMLElement>(
        `[data-clip-id="${CSS.escape(clipId)}"][data-clip-lane="${CSS.escape(lane)}"]`,
      ) ??
      document.querySelector<HTMLElement>(
        `[data-clip-id="${CSS.escape(clipId)}"]`,
      );
    const scrollEl = document.querySelector<HTMLElement>("[data-canvas-scroll]");
    const pad = 4;

    if (!clipEl) {
      if (leftEdge) leftEdge.style.visibility = "hidden";
      if (rightEdge) rightEdge.style.visibility = "hidden";
      return;
    }

    const clipRect = clipEl.getBoundingClientRect();
    const scrollRect = scrollEl?.getBoundingClientRect() ?? null;
    const top = scrollRect
      ? Math.max(
          scrollRect.top + pad,
          Math.min(clipRect.top, scrollRect.bottom - pad),
        )
      : Math.max(pad, clipRect.top);
    const viewLeft = scrollRect ? scrollRect.left : 0;
    const viewRight = scrollRect ? scrollRect.right : window.innerWidth;

    if (leftEdge) {
      if (!showLeftEdge) {
        leftEdge.style.visibility = "hidden";
      } else {
        leftEdge.style.visibility = "visible";
        const leftW = leftEdge.offsetWidth || 52;
        let leftX = clipRect.left;
        let leftTx = "translate(-100%, 0)";
        if (leftX - leftW < viewLeft + pad) {
          leftX = Math.min(clipRect.left + 2, viewRight - leftW - pad);
          leftTx = "translate(0, 0)";
        }
        leftEdge.style.top = `${top}px`;
        leftEdge.style.left = `${leftX}px`;
        leftEdge.style.transform = leftTx;
      }
    }

    if (rightEdge) {
      rightEdge.style.visibility = "visible";
      const rightW = rightEdge.offsetWidth || 52;
      let rightX = clipRect.right;
      let rightTx = "translate(0, 0)";
      if (rightX + rightW > viewRight - pad) {
        rightX = Math.max(clipRect.right - 2, viewLeft + rightW + pad);
        rightTx = "translate(-100%, 0)";
      }
      rightEdge.style.top = `${top}px`;
      rightEdge.style.left = `${rightX}px`;
      rightEdge.style.transform = rightTx;
    }
  }, [clipId, lane, showLeftEdge]);

  useLayoutEffect(() => {
    reposition();
    const scrollEl = document.querySelector("[data-canvas-scroll]");
    scrollEl?.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition, { passive: true });
    return () => {
      scrollEl?.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [reposition]);

  return (
    <div
      className={styles.touchNudge}
      role="toolbar"
      aria-label="Przesuń i rozciągnij klip"
    >
      {showLeftEdge ? (
        <div
          ref={leftRef}
          className={styles.touchNudgeEdge}
          data-nudge-edge="left"
        >
          <Button
            variant="ghost"
            iconOnly
            className={styles.touchNudgeMove}
            aria-label="Przesuń w lewo"
            onClick={() => onAction("move-left")}
          >
            ◀
          </Button>
          <div className={styles.touchNudgeStretch} data-nudge-group="resize">
            <Button
              variant="ghost"
              iconOnly
              className={styles.touchNudgeStretchBtn}
              aria-label="Wydłuż lewą krawędź"
              onClick={() => onAction("stretch-left-out")}
            >
              ◂|
            </Button>
            <Button
              variant="ghost"
              iconOnly
              className={styles.touchNudgeStretchBtn}
              aria-label="Skróć od lewej"
              onClick={() => onAction("stretch-left-in")}
            >
              |▸
            </Button>
          </div>
        </div>
      ) : null}
      <div
        ref={rightRef}
        className={styles.touchNudgeEdge}
        data-nudge-edge="right"
      >
        <Button
          variant="ghost"
          iconOnly
          className={styles.touchNudgeMove}
          aria-label="Przesuń w prawo"
          onClick={() => onAction("move-right")}
        >
          ▶
        </Button>
        <div className={styles.touchNudgeStretch} data-nudge-group="resize">
          <Button
            variant="ghost"
            iconOnly
            className={styles.touchNudgeStretchBtn}
            aria-label="Skróć od prawej"
            onClick={() => onAction("stretch-right-in")}
          >
            ◂|
          </Button>
          <Button
            variant="ghost"
            iconOnly
            className={styles.touchNudgeStretchBtn}
            aria-label="Wydłuż prawą krawędź"
            onClick={() => onAction("stretch-right-out")}
          >
            |▸
          </Button>
        </div>
      </div>
    </div>
  );
}

