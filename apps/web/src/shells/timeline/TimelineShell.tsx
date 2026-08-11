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
import {
  Link,
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import { Button, Slider, Select, useContextMenu } from "@stagesync/ui";
import {
  resolveMeterAt,
  resolveTempoAt,
  resolveKeyAt,
  formatKeySignature,
  parseMeterString,
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
import { subsectionRanges } from "@lib/timeline-edit/formaSubsections.js";
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
import { FormaClipPreview } from "./FormaClipPreview.js";
import { TimelineHelp } from "./TimelineHelp.js";
import { TimelineInspector } from "./TimelineInspector.js";
import { useTimelineModals } from "./hooks/useTimelineModals.js";
import { useTimelineDraft } from "./hooks/useTimelineDraft.js";
import { useTimelineZoomPan } from "./hooks/useTimelineZoomPan.js";
import { useTimelineShortcuts } from "./hooks/useTimelineShortcuts.js";
import { useTimelinePlayback } from "./hooks/useTimelinePlayback.js";
import { useTimelineSelectionState } from "./hooks/useTimelineSelectionState.js";
import { TimelineLanesView } from "./lanes/TimelineLanesView.js";
import { TimelineStatusFooter } from "./components/TimelineStatusFooter.js";
import { TouchNudgeBar } from "./components/TouchNudgeBar.js";
import { TimelineSongDialogs } from "./dialogs/TimelineSongDialogs.js";
import { TimelinePortals } from "./menus/TimelinePortals.js";
import { TimelineMapDialogs } from "./dialogs/TimelineMapDialogs.js";
import { useTimelineMixerState } from "./hooks/useTimelineMixerState.js";
import { useTimelineAudioUpload } from "./hooks/useTimelineAudioUpload.js";
import { useTimelineContextMenus } from "./hooks/useTimelineContextMenus.js";
import { useTimelineMapEdits } from "./hooks/useTimelineMapEdits.js";
import { useTimelineWandTool } from "./hooks/useTimelineWandTool.js";
import { useTimelineMarquee } from "./hooks/useTimelineMarquee.js";
import { useTimelineRulerGestures } from "./hooks/useTimelineRulerGestures.js";
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
import { getAudioHwCapability } from "@lib/audio/audioHwCapability.js";
import { ChannelStripControls, TaperGainSlider } from "./channelStrip/index.js";
import type {
  ChannelStripCallbacks,
  MasterStripCallbacks,
} from "./channelStrip/channelStripTypes.js";
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
import {
  fetchLibrary,
  fetchProject,
  putProject,
} from "@lib/shell-operator/libraryApi.js";
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
import { ShellAlertDialog } from "../components/ShellBlockingDialog.js";
import { loadTransport } from "../../transport/api.js";
import { useTransport } from "../../transport/useTransport.js";
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
} from "../components/icons.js";
import { ConnectionIndicator } from "../client/ConnectionIndicator.js";
import { ConnectionLostBanner } from "../client/ConnectionLostBanner.js";
import { ShellIconButton } from "../components/ShellIconButton.js";
import { AppHeader, AppHeaderActions } from "../components/AppHeader.js";
import { OperatorNav } from "../components/OperatorNav.js";
import { SongImportWizard } from "../import/SongImportWizard.js";
import type { UsUgApplyPayload } from "../import/CombinedUsUgImportForm.js";
import {
  SONG_IMPORT_EVENT,
  parseSongImportDetail,
} from "@lib/client/songImportEvents.js";
import { TimelineToolbar } from "./TimelineToolbar.js";
import { MixerDock } from "./MixerDock.js";
import styles from "./TimelineShell.module.css";

import { TOOLS, TOOL_BY_KEY, type ToolId } from "./timelineToolsData.js";

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
    const onClock = () => {
      setClockFormat(getStoredClockDisplayFormat());
    };
    window.addEventListener(CLOCK_DISPLAY_CHANGED_EVENT, onClock);
    return () => {
      window.removeEventListener(CLOCK_DISPLAY_CHANGED_EVENT, onClock);
    };
  }, []);

  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const inspAudioFileRef = useRef<HTMLInputElement>(null);
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
  const {
    helpOpen,
    setHelpOpen,
    songScreenOpen,
    setSongScreenOpen,
    songImportOpen,
    setSongImportOpen,
    importAsNewSong,
    setImportAsNewSong,
    importApplying,
    setImportApplying,
    openSongImportWizard,
    closeSongImportWizard: closeImportModals,
  } = useTimelineModals();

  const [touchTier, setTouchTier] = useState<TimelineTouchTier>(() =>
    typeof window !== "undefined" ? detectTimelineTier() : "desktop",
  );
  /** Match v4 `ZOOM_H_STEP` / slider bounds on status zoom H. */
  const ZOOM_H_STEP = 4;
  const ZOOM_H_MIN = PREFS_ZOOM_H_MIN;
  const ZOOM_H_MAX = PREFS_ZOOM_H_MAX;
  const ZOOM_V_STEP = 4;
  const ZOOM_V_MIN = MIN_LANE_PX;
  const ZOOM_V_MAX = MAX_LANE_PX;

  /** Phone = read/preview surface — no edit chrome / inspector (v4 mobile RO). */
  const isMobilePreview = touchTier === "mobile";
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const gesturePolicy = timelineGesturesAllowed(touchTier);

  const [songMetaOpen, setSongMetaOpen] = useState(false);
  /** Show/hide Właściwości panel (I). Independent of Metadane (ⓘ). */
  const [inspectorVisible, setInspectorVisible] = useState(
    () =>
      (typeof window !== "undefined" ? detectTimelineTier() : "desktop") !==
      "mobile",
  );
  const [touchAlertOpen, setTouchAlertOpen] = useState(false);

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

  const [primaryMapId, setPrimaryMapId] = useState<string | null>(null);
  const [trackVisibility, setTrackVisibility] = useState<TrackVisibilityMap>(
    () => defaultTrackVisibility(),
  );
  const [soloAudioTrackIds, setSoloAudioTrackIds] = useState<string[]>([]);
  const [soloBusIds, setSoloBusIds] = useState<string[]>([]);
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
  const clipSelectionRef = useRef<ClipSelection>(EMPTY_CLIP_SELECTION);

  const {
    savedProject,
    setSavedProject,
    draftProject,
    setDraftProject,
    draftHistory,
    setDraftHistory,
    loading,
    setLoading,
    savePending,
    setSavePending,
    loadError,
    setLoadError,
    draftRef,
    dirty,
    blocker,
    reloadProject,
    commitDraft,
    onSave,
    onUndo,
    onRedo,
  } = useTimelineDraft({
    projectId,
    clipSelectionRef,
    onEnsureAudioTracks: (tracks) => {
      setTrackVisibility((prev) => ensureAudioTrackVisibility(prev, tracks));
    },
    onProjectLoaded: async (project) => {
      if (projectId) {
        await loadTransport(projectId);
        setFailedAudioAssetIds(getFailedAudioAssetIds(projectId));
      }
      setTrackVisibility(
        ensureAudioTrackVisibility(
          defaultTrackVisibility(project.audioTracks),
          project.audioTracks,
        ),
      );
      const first = project.forma.clips[0]?.id ?? null;
      setClipSelection(first ? selectSingle(first, "forma") : clearSelection());
      setSelectedSubsectionIdx(null);
    },
    onRestoreClipSelection: (sel) => {
      setClipSelection(sel);
    },
  });

  const { audioUploadPending, audioUploadPendingRef, onUploadAudioToTrack } =
    useTimelineAudioUpload({
      projectId,
      draftProject,
      setSavedProject,
      setDraftProject,
      setDraftHistory,
      setTrackVisibility,
      setLoadError,
    });

  const {
    tempoEditTitleId,
    meterEditTitleId,
    keyEditTitleId,
    tempoEditOpen,
    setTempoEditOpen,
    tempoDraft,
    setTempoDraft,
    meterEditOpen,
    setMeterEditOpen,
    meterNumDraft,
    setMeterNumDraft,
    meterDenDraft,
    setMeterDenDraft,
    keyEditOpen,
    setKeyEditOpen,
    mapEditTicks,
    setMapEditTicks,
    openMapEdit,
  } = useTimelineMapEdits({ draftProject, commitDraft });

  const {
    clipSelection,
    setClipSelection,
    clearClipSelection,
    selectedMapLane,
    setSelectedMapLane,
    selectedMapIds,
    setSelectedMapIds,
    clearMapSelection,
    selectedAnchorId,
    setSelectedAnchorId,
    selectedSubsectionIdx,
    setSelectedSubsectionIdx,
    trackSelection,
    setTrackSelection,
    trackSelectionRef,
    selectedBusId,
    setSelectedBusId,
    selectedBusIdRef,
    selectedHwOutputId,
    setSelectedHwOutputId,
    selectedHwOutputIdRef,
    clipboardRef,
    selectAllClips,
    deleteSelectedFormaClip,
    copyClipSelection,
    cutClipSelection,
    pasteClipClipboard,
    duplicateClipSelection,
    splitSelectionAtPlayhead,
    joinSelectionAdjacent,
    setCycleFromSelectedAudioClip,
    nudgeSelectedClip,
  } = useTimelineSelectionState({
    draftRef,
    commitDraft,
    setSongMetaOpen,
    setLocatorTicks,
    setLoop,
    snapMode,
    displayTicks,
    setSoloBusIds,
    setSoloAudioTrackIds,
    setTrackVisibility,
  });

  const { applyWand } = useTimelineWandTool({
    draftRef,
    clipSelection,
    commitDraft,
    flashCanvasNotice,
    setWandMenu,
    setTool,
  });

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

  const viewSpanRef = useRef({ start: 0, end: 0 });
  const barTicksRef = useRef(3840);

  const {
    zoomH,
    setZoomH,
    zoomV,
    setZoomV,
    zoomUi,
    setZoomUi,
    uiScale,
    effectiveZoomH,
    effectiveZoomV,
    dockWidthBase,
    setDockWidthBase,
    effectiveDockWidth,
    dockWidthResizing,
    laneHeights,
    setLaneHeights,
    laneResizeTrackId,
    zoomHRef,
    zoomHBaseRef,
    zoomVBaseRef,
    uiScaleRef,
    dockWidthBaseRef,
    applyAbsoluteZoomH,
    zoomHorizontalBySteps,
    setVerticalZoom,
    zoomVerticalBySteps,
    fitZoom,
    rowHeightStyle,
    beginLaneResize,
    onLaneResizePointerMove,
    endLaneResize,
    onLaneResizeDblClick,
    beginDockWidthResize,
    onDockWidthResizePointerMove,
    endDockWidthResize,
  } = useTimelineZoomPan({
    canvasScrollRef,
    viewSpanRef,
    barTicksRef,
    touchTier,
  });
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

  const selectLaneClip = useCallback((lane: ClipSelectionLane, id: string) => {
    setClipSelection(selectSingle(id, lane));
    if (lane !== "forma") setSelectedSubsectionIdx(null);
    setSelectedAnchorId(null);
    setSongMetaOpen(false);
    setInspectorVisible(true);
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

  const toggleInspectorPanel = useCallback(() => {
    if (touchTier === "mobile") return;
    setInspectorVisible((v) => !v);
  }, [touchTier]);

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
    if (gesturePreview?.kind === "countdown-length" && gesturePreview.clipId) {
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
  const locatorPx = tickToPx(
    effectiveLocatorTicks,
    viewSpan,
    barTicks,
    effectiveZoomH,
  );
  const locatorMeter = draftProject
    ? resolveMeterAt(draftProject, effectiveLocatorTicks)
    : state.timeSignature;
  const locatorBbt = ticksToBbt(
    effectiveLocatorTicks,
    locatorMeter,
    draftProject?.ppq ?? state.ppq,
  );
  const locatorLabel = `${toDisplayBar(locatorBbt.bar)}.${locatorBbt.beat}`;

  const rawTicksAtClientX = useCallback((clientX: number): number | null => {
    const coordRoot = lanesCoordRef.current;
    if (!coordRoot || !draftRef.current) return null;
    return ticksFromPointer(
      clientX,
      coordRoot,
      viewSpanRef.current,
      barTicksRef.current,
      zoomHRef.current,
    );
  }, []);

  const {
    loopDraft,
    placeLocatorAtTicks,
    setLocatorFromClientX,
    onLocatorPointerDown,
    onLocatorPointerMove,
    onLocatorPointerUp,
    onLoopToggle,
    nudgeLocator,
  } = useTimelineRulerGestures({
    draftRef,
    draftProject,
    state,
    locatorTicks,
    seek,
    setLoop,
    setLocatorTicks,
    markerOverlayRef,
    lanesCoordRef,
    viewSpanRef,
    barTicksRef,
    zoomHRef,
    rawTicksAtClientX,
  });

  const {
    marqueeBox,
    touchCanvasNavActive,
    beginMarquee,
    beginTouchCanvasNav,
    finishTouchCanvasNav,
  } = useTimelineMarquee({
    toolRef,
    heldZoomRef,
    lanesCoordRef,
    canvasScrollRef,
    zoomHBaseRef,
    setZoomH,
    fitZoom,
    clearClipSelection,
    clearMapSelection,
    setSelectedAnchorId,
    setSongMetaOpen,
    setSelectedSubsectionIdx,
    setClipSelection,
    setLocatorFromClientX,
  });

  const loopOn = Boolean(state.loop?.enabled);
  const loopRange = loopDraft ?? usableLoopRange(state.loop);

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
      ? (draftProject.audioClips.find((c) => c.id === selectedAudioClipId) ??
        null)
      : null;
  const selectedDockAudioTrack =
    draftProject && primaryAudioTrackId(trackSelection)
      ? (draftProject.audioTracks.find(
          (tr) => tr.id === primaryAudioTrackId(trackSelection),
        ) ?? null)
      : null;
  const selectedAnchor =
    draftProject && selectedAnchorId
      ? (scoreAnchors(draftProject).find((a) => a.id === selectedAnchorId) ??
        null)
      : null;

  /** Panel visibility — bare I (not Metadane ⓘ). Hidden in Mixer; absent on mobile preview. */
  const inspectorOpen =
    !isMobilePreview && inspectorVisible && timelineSurface !== "mixer";

  const meterAtPlayhead = draftProject
    ? resolveMeterAt(draftProject, displayTicks)
    : state.timeSignature;
  const tempoAtPlayhead = draftProject
    ? resolveTempoAt(draftProject, displayTicks)
    : state.bpm;

  const {
    metronomeOn,
    setMetronomeOn,
    latencyCompMs,
    setLatencyCompMs,
    audioBuffering,
    failedAudioAssetIds,
    setFailedAudioAssetIds,
    followPlayhead,
    setFollowPlayhead,
    showMidiPlayhead,
    setShowMidiPlayhead,
    onPlayClick,
    onPauseClick,
    onStopClick,
    onMetronomeToggle,
    playFromSelectionOrLocator,
  } = useTimelinePlayback({
    projectId,
    draftProject,
    draftRef,
    locatorTicks,
    setLocatorTicks,
    displayTicks,
    clipSelection,
    state,
    seek,
    play,
    pause,
    stop,
    soloAudioTrackIds,
    soloBusIds,
    canvasScrollRef,
    playheadPx,
    meterAtPlayhead,
    tempoAtPlayhead,
  });

  useTimelineShortcuts({
    keyHandlersRef,
    songImportOpen,
    helpOpen,
    setHelpOpen,
    toolRef,
    toolMenu,
    setToolMenu,
    wandMenuOpenRef,
    setWandMenu,
    setTool,
    eyeMenuPos,
    setEyeMenuPos,
    setEyeOpen,
    toolsVisOpen,
    setToolsVisOpen,
    closeContextMenu,
    closeMobileInspector,
    copyClipSelection,
    cutClipSelection,
    pasteClipClipboard,
    duplicateClipSelection,
    selectAllClips,
    splitSelectionAtPlayhead,
    joinSelectionAdjacent,
    deleteSelectedFormaClip,
    nudgeSelectedClip,
    setCycleFromSelectedAudioClip,
    playFromSelectionOrLocator,
    toggleInspectorPanel,
    setTimelineSurface,
    lastPointerRef,
    openToolMenuAt,
    locatorTicks,
    effectiveLocatorTicksRef,
    tapLineIndexRef,
    setTapLineIndex,
    draftRef,
    commitDraft,
    navigate,
  });

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
      .map(
        (a) => `${a.id}:${a.durationMs ?? 0}:${a.waveformPeaks?.length ?? 0}`,
      )
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

  useEffect(() => {
    function onSongImport(ev: Event) {
      const detail = parseSongImportDetail(ev);
      if (detail?.asNew === true) {
        openSongImportWizard(true);
      } else if (detail?.asNew === false) {
        openSongImportWizard(false);
      } else {
        openSongImportWizard(!draftProject);
      }
    }
    window.addEventListener(SONG_IMPORT_EVENT, onSongImport);
    return () => window.removeEventListener(SONG_IMPORT_EVENT, onSongImport);
  }, [draftProject]);

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
        flashCanvasNotice(
          `Nowy utwór „${saved.name}”: Import US+UG (${summary})`,
        );
        navigate(`/timeline/${saved.id}`);
      } catch (err) {
        setImportApplying(false);
        flashCanvasNotice(
          err instanceof Error ? err.message : "Import US+UG nie powiódł się",
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
      next = await uploadProjectAudio(projectId, pendingFile, {
        startTicks: 0,
      });
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
        console.warn(
          "[TimelineShell] Auto-save on import failed, keeping draft:",
          err,
        );
      }
    }
    commitDraft(next);
    flashCanvasNotice(`Import US+UG: ${summary}`);
    closeImportModals();
    setSongScreenOpen(false);
    setSongMetaOpen(false);
  }

  function beginFormaGesture(
    session: FormaGestureSession,
    preview: FormaGesturePreview,
  ) {
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
    const n = draft.forma.clips.filter((c) => c.kind === "section").length + 1;
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
              ...prev.items.filter(
                (i) => i.lane !== lane && i.lane !== destLane,
              ),
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
      const ranges = subsectionRanges(
        clip?.subsections,
        clip?.lengthTicks ?? 1,
      );
      const maxIdx = Math.max(0, ranges.length - 1);
      const countBefore =
        session.originBoundaryRel != null
          ? subsectionRanges(
              draft.forma.clips.find((c) => c.id === session.clipId)
                ?.subsections,
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
      updateFormaGesturePreview(
        raw,
        e.metaKey,
        e.ctrlKey,
        e.clientX,
        e.clientY,
      );
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
  }, [
    gestureSession?.pointerId,
    gestureSession?.kind,
    gestureSession?.clipId,
    gesturePreview,
  ]);

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
          fadeKind === "fade-in" ? (full.fadeInMs ?? 0) : (full.fadeOutMs ?? 0),
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
      const laneClips = draftProject.audioClips.filter(
        (c) => c.trackId === trackId,
      );
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
        err instanceof Error
          ? err.message
          : "Nie udało się zduplikować ścieżki",
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

  function onAudioTrackHeaderClick(e: React.MouseEvent, trackId: string) {
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
        const prev = draftProject.audioTracks.find(
          (t) => t.id === trackId,
        )?.output;
        if (isHwOutRepatchBlockedWhilePlaying(state.playing, prev, output)) {
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
          commitDraft(setMasterOutputRouting(draftProject, { channelOffset }));
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
    const next = setAudioBusName(draftProject, busRename.busId, busRename.name);
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

  function onHwChannelModeChange(hwOutputId: string, mode: "mono" | "stereo") {
    if (!draftProject) return;
    commitDraft(
      updateAudioHardwareOutput(draftProject, hwOutputId, {
        channelMode: mode,
      }),
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
        commitDraft(setAudioBusMuted(draftProject, busId, !bus?.muted));
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
        if (isHwOutRepatchBlockedWhilePlaying(state.playing, prev, output)) {
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
      setMapSelection(
        lane,
        isDefault ? [] : [seg.eventId],
        isDefault ? null : seg.eventId,
      );
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
    const snappedTarget = snapEditTicks(
      draftRef.current,
      unsnappedTarget,
      mode,
    );
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
                if (lane === "tekst" || lane === "akordy" || lane === "cue") {
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

  const lanesRendererProps = {
    draftProject,
    projectId,
    failedAudioAssetIds,
    gestureSession,
    gesturePreview,
    clipSelection,
    primaryId,
    selectedSubsectionIdx,
    selectedAnchorId,
    selectedMapLane,
    selectedMapIds,
    mapDragPreview,
    tempoSegments,
    meterSegments,
    keySegments,
    viewSpan,
    barTicks,
    effectiveZoomH,
    tool,
    tapActiveClipId,
    commitDraft,
    clearClipSelection,
    clearMapSelection,
    setSelectedAnchorId,
    setInspectorVisible,
    setSongMetaOpen,
    setMapSelection,
    openMapEdit,
    openClipContextMenu,
    selectLaneClip,
    focusInspectorPanel,
    rawTicksAtClientX,
    onAudioClipPointerDown,
    onFormaClipPointerDown,
    onContentClipPointerDown,
    onFormaClipPointerMove,
    onFormaClipPointerUp,
    onMapSegmentPointerDown,
    onMapSegmentPointerMove,
    onMapSegmentPointerUp,
  };

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
        toolNeedsExclusiveTouchAction(heldZoom ? "zoom" : tool) ? undefined : ""
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
            <TimelineLanesView
              canvasScrollRef={canvasScrollRef}
              canvasInnerWidth={canvasInnerWidth}
              dockWidthBase={dockWidthBase}
              markerOverlayRef={markerOverlayRef}
              showMidiPlayhead={showMidiPlayhead}
              playheadPx={playheadPx}
              locatorPx={locatorPx}
              viewSpan={viewSpan}
              barTicks={barTicks}
              effectiveLocatorTicks={effectiveLocatorTicks}
              locatorLabel={locatorLabel}
              onLocatorPointerDown={onLocatorPointerDown}
              onLocatorPointerMove={onLocatorPointerMove}
              onLocatorPointerUp={onLocatorPointerUp}
              eyeBtnRef={eyeBtnRef}
              eyeOpen={eyeOpen}
              eyeMenuId={eyeMenuId}
              setEyeOpen={setEyeOpen}
              touchTier={touchTier}
              beginDockWidthResize={beginDockWidthResize}
              onDockWidthResizePointerMove={onDockWidthResizePointerMove}
              endDockWidthResize={endDockWidthResize}
              effectiveZoomH={effectiveZoomH}
              loopRange={loopRange}
              loopOn={loopOn}
              barMarks={barMarks}
              rulerBeatMarks={rulerBeatMarks}
              bindTrackRowsRef={bindTrackRowsRef}
              lanesCoordRef={lanesCoordRef}
              marqueeBox={marqueeBox}
              draftProject={draftProject}
              trackVisibility={trackVisibility}
              rowHeightStyle={rowHeightStyle}
              trackSelection={trackSelection}
              soloAudioTrackIds={soloAudioTrackIds}
              trackRename={trackRename}
              buildChannelStripCallbacks={buildChannelStripCallbacks}
              laneHeights={laneHeights}
              zoomV={zoomV}
              uiScale={uiScale}
              tool={tool}
              onTool={onTool}
              isMobilePreview={isMobilePreview}
              laneResizeTrackId={laneResizeTrackId}
              beginLaneResize={beginLaneResize}
              onLaneResizePointerMove={onLaneResizePointerMove}
              endLaneResize={endLaneResize}
              onLaneResizeDblClick={onLaneResizeDblClick}
              onAudioTrackHeaderClick={onAudioTrackHeaderClick}
              openAudioTrackContextMenu={openAudioTrackContextMenu}
              heldZoom={heldZoom}
              audioLaneDropId={audioLaneDropId}
              setAudioLaneDropId={setAudioLaneDropId}
              onUploadAudioToTrack={onUploadAudioToTrack}
              openEmptyLaneContextMenu={openEmptyLaneContextMenu}
              beginMarquee={beginMarquee}
              beginTouchCanvasNav={beginTouchCanvasNav}
              heldZoomRef={heldZoomRef}
              onAddAudioTrack={onAddAudioTrack}
              onFormaLanePointerDown={onFormaLanePointerDown}
              onMapLanePointerDown={onMapLanePointerDown}
              onFormaLanePointerMove={onFormaLanePointerMove}
              onFormaLanePointerUp={onFormaLanePointerUp}
              beginContentPencilDraw={beginContentPencilDraw}
              rawTicksAtClientX={rawTicksAtClientX}
              commitDraft={commitDraft}
              clearMapSelection={clearMapSelection}
              selectLaneClip={selectLaneClip}
              laneImportTrackIdRef={laneImportTrackIdRef}
              laneImportStartTicksRef={laneImportStartTicksRef}
              laneAudioFileRef={laneAudioFileRef}
              draftRef={draftRef}
              lanesRendererProps={lanesRendererProps}
            />
          )}
        </div>

        {!isMobilePreview ? (
          <TimelineInspector
            inspectorOpen={inspectorOpen}
            closeInspectorPanel={closeInspectorPanel}
            clipSelectionItemsLength={clipSelection.items.length}
            selectionLane={selectionLane}
            songMetaOpen={songMetaOpen}
            draftProject={draftProject}
            commitDraft={commitDraft}
            openSongImportWizard={openSongImportWizard}
            selectedMapLane={selectedMapLane}
            selectedMapIds={selectedMapIds}
            primaryMapId={primaryMapId}
            selectedTekstClip={selectedTekstClip}
            selectedAkordClip={selectedAkordClip}
            selectedCueClip={selectedCueClip}
            selectedAnchor={selectedAnchor}
            selectedAudioClip={selectedAudioClip}
            selectedDockAudioTrack={selectedDockAudioTrack}
            selectedClip={selectedClip}
            selectedSubsectionRows={selectedSubsectionRows}
            selectedSubsectionIdx={selectedSubsectionIdx}
            setSelectedSubsectionIdx={setSelectedSubsectionIdx}
            onClipRename={onClipRename}
            onCountdownBarsChange={onCountdownBarsChange}
            audioUploadPending={audioUploadPending}
            onUploadAudioToTrack={onUploadAudioToTrack}
            displayTicks={displayTicks}
            projectId={projectId}
          />
        ) : null}
      </div>

      <TimelineStatusFooter
        wsStatus={wsStatus}
        isMobilePreview={isMobilePreview}
        snapMode={snapMode}
        setSnapMode={setSnapMode}
        zoomUi={zoomUi}
        setZoomUi={setZoomUi}
        zoomH={zoomH}
        setZoomH={setZoomH}
        zoomV={zoomV}
        setVerticalZoom={setVerticalZoom}
        timelineSurface={timelineSurface}
      />

      {shouldShowTouchNudge(
        touchTier,
        selectionLane,
        primaryId,
        draftProject,
      ) &&
      draftProject &&
      selectionLane &&
      primaryId ? (
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

      <TimelineSongDialogs
        blocker={blocker}
        projectId={projectId}
        draftProject={draftProject}
        savePending={savePending}
        setSavePending={setSavePending}
        setSavedProject={setSavedProject}
        setDraftProject={setDraftProject}
        setDraftHistory={setDraftHistory}
        setLoadError={setLoadError}
        onDiscard={onDiscard}
        helpOpen={helpOpen}
        setHelpOpen={setHelpOpen}
        songScreenOpen={songScreenOpen}
        setSongScreenOpen={setSongScreenOpen}
        songScreenId={songScreenId}
        libraryNames={libraryNames}
        songImportOpen={songImportOpen}
        importAsNewSong={importAsNewSong}
        importApplying={importApplying}
        importPreviewOptions={importPreviewOptions}
        openSongImportWizard={openSongImportWizard}
        closeImportModals={closeImportModals}
        onImportUsUgBridge={onImportUsUgBridge}
        onImportUltrastar={onImportUltrastar}
        onImportUg={onImportUg}
      />

      <TimelinePortals
        eyeOpen={eyeOpen}
        eyeMenuPos={eyeMenuPos}
        eyeMenuRef={eyeMenuRef}
        eyeMenuId={eyeMenuId}
        trackVisibility={trackVisibility}
        toggleTrack={toggleTrack}
        toolsVisOpen={toolsVisOpen}
        toolsVisMenuPos={toolsVisMenuPos}
        toolsVisMenuRef={toolsVisMenuRef}
        toolsVisMenuId={toolsVisMenuId}
        toolbarVisibleSet={toolbarVisibleSet}
        setToolbarVisibleTools={setToolbarVisibleTools}
        toolMenu={toolMenu}
        toolMenuRef={toolMenuRef}
        tool={tool}
        onTool={onTool}
        wandMenu={wandMenu}
        wandMenuRef={wandMenuRef}
        applyWand={applyWand}
      />

      <TimelineMapDialogs
        draftProject={draftProject}
        displayTicks={displayTicks}
        mapEditTicks={mapEditTicks}
        commitDraft={commitDraft}
        tempoEditOpen={tempoEditOpen}
        setTempoEditOpen={setTempoEditOpen}
        tempoEditTitleId={tempoEditTitleId}
        tempoDraft={tempoDraft}
        setTempoDraft={setTempoDraft}
        meterEditOpen={meterEditOpen}
        setMeterEditOpen={setMeterEditOpen}
        meterEditTitleId={meterEditTitleId}
        meterNumDraft={meterNumDraft}
        setMeterNumDraft={setMeterNumDraft}
        meterDenDraft={meterDenDraft}
        setMeterDenDraft={setMeterDenDraft}
        keyEditOpen={keyEditOpen}
        setKeyEditOpen={setKeyEditOpen}
        keyEditTitleId={keyEditTitleId}
        touchAlertOpen={touchAlertOpen}
        setTouchAlertOpen={setTouchAlertOpen}
      />
    </div>
  );
}
