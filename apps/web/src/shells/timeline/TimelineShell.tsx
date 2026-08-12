import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useContextMenu } from "@stagesync/ui";
import { type SnapMode, type WandMode } from "@stagesync/shared";
import {
  scrollCanvasToStart,
  ticksFromPointer,
} from "@lib/timeline-edit/formaCanvas.js";
import {
  clearSelection,
  clearTrackSelection,
  EMPTY_CLIP_SELECTION,
  selectSingle,
  type ClipSelection,
  type TimelineSurface,
} from "@lib/timeline/timelineSelection.js";
import {
  loadToolbarVisibleTools,
  type ToolbarToolId,
} from "@lib/timeline/timelineToolbarTools.js";
import {
  renameFormaClip,
  setCountdownBars,
} from "@lib/timeline-edit/formaInspector.js";
import {
  applyTimelineNudge,
  nudgeShowsLeftEdge,
  shouldShowTouchNudge,
} from "@lib/timeline/timelineTouchNudge.js";
import { useTimelineTouchGestures } from "@lib/timeline/useTimelineTouchGestures.js";
import {
  canRedo,
  canUndo,
  resetDraftHistory,
} from "@lib/client/draftHistory.js";
import {
  CLOCK_DISPLAY_CHANGED_EVENT,
  formatClockDisplay,
  getStoredClockDisplayFormat,
  type ClockDisplayFormat,
} from "@lib/client/clockDisplayPrefs.js";
import {
  detectTimelineTier,
  TIMELINE_COARSE_MQ,
  TIMELINE_LANDSCAPE_PHONE_MQ,
  TIMELINE_MOBILE_MQ,
  timelineGesturesAllowed,
  type TimelineTouchTier,
} from "@lib/timeline/timelineTouchTier.js";
import { APP_VERSION } from "@lib/client/appVersion.js";
import { patchSetlistAutoAdvance } from "@lib/shell-operator/setlistApi.js";
import {
  loadSessionSnapModeFromStorage,
  persistSessionSnapMode,
  toolNeedsExclusiveTouchAction,
} from "@lib/timeline/timelineGesture.js";
import {
  defaultTrackVisibility,
  ensureAudioTrackVisibility,
  type TrackVisibilityMap,
} from "@lib/timeline/timelineTracks.js";
import {
  ZOOM_H_MAX as PREFS_ZOOM_H_MAX,
  ZOOM_H_MIN as PREFS_ZOOM_H_MIN,
} from "@lib/timeline/timelineZoomPrefs.js";
import {
  toggleAppFullscreen,
  syncEditHistoryState,
} from "@lib/client/desktopBridge.js";
import { useAnnounceDevicePresence } from "@lib/client/useAnnounceDevicePresence.js";
import { markOperatorSession } from "@lib/shell-operator/operatorSession.js";
import { openPreferences } from "@lib/client/preferencesEvents.js";
import {
  shouldShowFullscreenControl,
  shouldShowOperatorNav,
} from "@lib/shell-operator/operatorSurface.js";
import { useMqMobileCompact } from "@lib/client/useMqMobileCompact.js";
import { loadTransport } from "../../transport/api.js";
import { useTransport } from "../../transport/useTransport.js";
import { IconFullscreen } from "../components/icons.js";
import { ShellIconButton } from "../components/ShellIconButton.js";
import { AppHeaderActions } from "../components/AppHeader.js";
import {
  SONG_IMPORT_EVENT,
  parseSongImportDetail,
} from "@lib/client/songImportEvents.js";
import { getFailedAudioAssetIds } from "@lib/audio/audioPlayback.js";
import { TimelineStatusFooter } from "./components/TimelineStatusFooter.js";
import { TouchNudgeBar } from "./components/TouchNudgeBar.js";
import { useTimelineModals } from "./hooks/useTimelineModals.js";
import { useTimelineDraft } from "./hooks/useTimelineDraft.js";
import { useTimelineZoomPan } from "./hooks/useTimelineZoomPan.js";
import { useTimelineShortcuts } from "./hooks/useTimelineShortcuts.js";
import { useTimelinePlayback } from "./hooks/useTimelinePlayback.js";
import { useTimelineSelectionState } from "./hooks/useTimelineSelectionState.js";
import { useTimelineAudioUpload } from "./hooks/useTimelineAudioUpload.js";
import { useTimelineContextMenus } from "./hooks/useTimelineContextMenus.js";
import { useTimelineKeyboardEvents } from "./hooks/useTimelineKeyboardEvents.js";
import { useTimelineMapEdits } from "./hooks/useTimelineMapEdits.js";
import { useTimelineWandTool } from "./hooks/useTimelineWandTool.js";
import { useTimelineMarquee } from "./hooks/useTimelineMarquee.js";
import { useTimelineRulerGestures } from "./hooks/useTimelineRulerGestures.js";
import { useTimelineMapPointerHandlers } from "./hooks/useTimelineMapPointerHandlers.js";
import { useTimelineFormaGestures } from "./hooks/useTimelineFormaGestures.js";
import { useTimelineDockCallbacks } from "./hooks/useTimelineDockCallbacks.js";
import { useTimelineSongImport } from "./hooks/useTimelineSongImport.js";
import { useTimelineTrackActions } from "./hooks/useTimelineTrackActions.js";
import { useTimelineAudioTrackInteractions } from "./hooks/useTimelineAudioTrackInteractions.js";
import { useTimelineCanvasDerived } from "./hooks/useTimelineCanvasDerived.js";
import { useTimelineAudioEngineSync } from "./hooks/useTimelineAudioEngineSync.js";
import { useTimelineSetlistState } from "./hooks/useTimelineSetlistState.js";
import { useTimelineDerivedSelection } from "./hooks/useTimelineDerivedSelection.js";
import { useTimelineFloatingMenus } from "./hooks/useTimelineFloatingMenus.js";
import { useTimelinePanelState } from "./hooks/useTimelinePanelState.js";
import { TimelineHeaderContainer } from "./containers/TimelineHeaderContainer.js";
import { TimelineDialogsContainer } from "./containers/TimelineDialogsContainer.js";
import { TimelineCanvasViewport } from "./containers/TimelineCanvasViewport.js";
import styles from "./TimelineShell.module.css";
import { TOOLS, type ToolId } from "./timelineToolsData.js";

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
  const markerOverlayRef = useRef<HTMLDivElement>(null);
  const songScreenId = useId();
  const eyeMenuId = useId();
  const toolsVisMenuId = useId();
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

  const [tool, setTool] = useState<ToolId>("pointer");
  const toolRef = useRef<ToolId>("pointer");
  toolRef.current = tool;
  /** Solo tool: restore track solo set on mouseup / blur. */
  const soloHoldRef = useRef<string[] | null>(null);
  const effectiveLocatorTicksRef = useRef(0);
  const [tapLineIndex, setTapLineIndex] = useState(0);
  const tapLineIndexRef = useRef(0);
  const [snapMode, setSnapMode] = useState<SnapMode>(() =>
    loadSessionSnapModeFromStorage(),
  );

  useEffect(() => {
    persistSessionSnapMode(snapMode);
  }, [snapMode]);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const {
    helpOpen,
    setHelpOpen,
    songScreenOpen,
    setSongScreenOpen,
    songImportOpen,
    importAsNewSong,
    importApplying,
    setImportApplying,
    openSongImportWizard,
    closeSongImportWizard: closeImportModals,
  } = useTimelineModals();

  const [touchTier, setTouchTier] = useState<TimelineTouchTier>(() =>
    typeof window !== "undefined" ? detectTimelineTier() : "desktop",
  );
  const ZOOM_H_MIN = PREFS_ZOOM_H_MIN;
  const ZOOM_H_MAX = PREFS_ZOOM_H_MAX;

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

  const {
    eyeBtnRef,
    eyeMenuRef,
    toolsVisBtnRef,
    toolsVisMenuRef,
    toolMenuRef,
    wandMenuRef,
    eyeOpen,
    setEyeOpen,
    eyeMenuPos,
    setEyeMenuPos,
    toolsVisOpen,
    setToolsVisOpen,
    toolsVisMenuPos,
    toolMenu,
    setToolMenu,
    wandMenu,
    setWandMenu,
    wandMenuOpenRef,
    onTool,
    openToolMenuAt,
  } = useTimelineFloatingMenus({
    setTool,
    lastPointerRef,
    isMobilePreview,
    setTouchAlertOpen,
  });

  const [primaryMapId, setPrimaryMapId] = useState<string | null>(null);
  const [trackVisibility, setTrackVisibility] = useState<TrackVisibilityMap>(
    () => defaultTrackVisibility(),
  );
  const [soloAudioTrackIds, setSoloAudioTrackIds] = useState<string[]>([]);
  const [soloBusIds, setSoloBusIds] = useState<string[]>([]);
  const [toolbarVisibleTools, setToolbarVisibleTools] = useState<
    ToolbarToolId[]
  >(() => loadToolbarVisibleTools());
  const toolbarVisibleSet = useMemo(
    () => new Set<string>(toolbarVisibleTools),
    [toolbarVisibleTools],
  );
  const [locatorTicks, setLocatorTicks] = useState(0);
  const [canvasNotice, setCanvasNotice] = useState<string | null>(null);
  const canvasNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const flashCanvasNotice = useCallback((message: string) => {
    if (canvasNoticeTimerRef.current) {
      clearTimeout(canvasNoticeTimerRef.current);
    }
    setCanvasNotice(message);
    canvasNoticeTimerRef.current = setTimeout(() => {
      setCanvasNotice(null);
      canvasNoticeTimerRef.current = null;
    }, 3200);
  }, []);

  const clipSelectionRef = useRef<ClipSelection>(EMPTY_CLIP_SELECTION);

  const {
    savedProject,
    setSavedProject,
    draftProject,
    setDraftProject,
    draftHistory,
    setDraftHistory,
    loading,
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

  const { audioUploadPending, onUploadAudioToTrack } = useTimelineAudioUpload({
    projectId,
    draftProject,
    setSavedProject,
    setDraftProject,
    setDraftHistory,
    setTrackVisibility,
    setLoadError,
  });

  const {
    importPreviewOptions,
    onImportUg,
    onImportUltrastar,
    onImportUsUgBridge,
  } = useTimelineSongImport({
    projectId: projectId ?? null,
    draftProject,
    draftRef,
    commitDraft,
    importAsNewSong,
    setImportApplying,
    closeImportModals,
    setSongScreenOpen,
    setSongMetaOpen,
    flashCanvasNotice,
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
    selectedBusId,
    setSelectedBusId,
    selectedHwOutputId,
    setSelectedHwOutputId,
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

  const [timelineSurface, setTimelineSurface] =
    useState<TimelineSurface>("timeline");

  const {
    primaryId,
    selectionLane,
    selectedClipId,
    selectedClip,
    selectedSubsectionRows,
    selectedTekstClip,
    selectedAkordClip,
    selectedCueClip,
    selectedAudioClip,
    selectedDockAudioTrack,
    selectedAnchor,
    inspectorOpen,
    meterAtPlayhead,
    tempoAtPlayhead,
  } = useTimelineDerivedSelection({
    draftProject,
    clipSelection,
    trackSelection,
    selectedAnchorId,
    isMobilePreview,
    inspectorVisible,
    timelineSurface,
    displayTicks,
    state,
  });

  const { applyWand } = useTimelineWandTool({
    draftRef,
    clipSelection,
    commitDraft,
    flashCanvasNotice,
    setWandMenu,
    setTool,
  });
  const [trackRename, setTrackRename] = useState<{
    trackId: string;
    name: string;
  } | null>(null);
  const [audioLaneDropId, setAudioLaneDropId] = useState<string | null>(null);
  const laneImportTrackIdRef = useRef<string | null>(null);
  /** Pencil @ empty audio: place imported clip at these ticks (Logic-like). */
  const laneImportStartTicksRef = useRef<number | null>(null);
  const laneAudioFileRef = useRef<HTMLInputElement>(null);

  // Clip focus and track header focus are mutually exclusive in the dock/inspector.
  useEffect(() => {
    if (clipSelection.items.length > 0) {
      setTrackSelection(clearTrackSelection());
      setSelectedBusId(null);
      setSelectedHwOutputId(null);
    }
  }, [
    clipSelection,
    setSelectedBusId,
    setSelectedHwOutputId,
    setTrackSelection,
  ]);

  const viewSpanRef = useRef({ start: 0, end: 0 });
  const barTicksRef = useRef(3840);

  const {
    zoomH,
    setZoomH,
    zoomV,
    zoomUi,
    setZoomUi,
    uiScale,
    effectiveZoomH,
    effectiveZoomV,
    dockWidthBase,
    dockWidthResizing,
    laneHeights,
    laneResizeTrackId,
    zoomHRef,
    zoomHBaseRef,
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

  const {
    selectLaneClip,
    focusInspectorPanel,
    closeMobileInspector,
    closeInspectorPanel,
    toggleInspectorPanel,
    setMapSelection,
    bindTrackRowsRef,
  } = useTimelinePanelState({
    touchTier,
    setInspectorVisible,
    setSongMetaOpen,
    setClipSelection,
    clearClipSelection,
    clearMapSelection,
    setTrackSelection,
    setSelectedAnchorId,
    setSelectedSubsectionIdx,
    setSelectedMapLane,
    setSelectedMapIds,
    setPrimaryMapId,
  });

  const {
    libraryNames,
    setlistEnabled,
    autoAdvance,
    setAutoAdvance,
    prevSetlistId,
    nextSetlistId,
  } = useTimelineSetlistState({
    projectId,
    draftProjectName: draftProject?.name,
    songScreenOpen,
    setlistSnapshot,
    reloadProject,
  });

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

  const rawTicksAtClientX = useCallback(
    (clientX: number): number | null => {
      const coordRoot = lanesCoordRef.current;
      if (!coordRoot || !draftRef.current) return null;
      return ticksFromPointer(
        clientX,
        coordRoot,
        viewSpanRef.current,
        barTicksRef.current,
        zoomHRef.current,
      );
    },
    [draftRef, zoomHRef],
  );

  const { openClipContextMenu, openEmptyLaneContextMenu } =
    useTimelineContextMenus({
      isMobilePreview,
      setTouchAlertOpen,
      clearMapSelection,
      clipSelectionRef,
      setClipSelection,
      setSelectedSubsectionIdx,
      setSelectedAnchorId,
      setSongMetaOpen,
      setInspectorVisible,
      selectLaneClip,
      clipboardRef,
      rawTicksAtClientX,
      draftRef,
      commitDraft,
      copyClipSelection,
      deleteSelectedFormaClip,
      duplicateClipSelection,
      pasteClipClipboard,
      focusInspectorPanel,
      openContextMenu,
      laneImportTrackIdRef,
      laneImportStartTicksRef,
      laneAudioFileRef,
      locatorTicks,
    });

  const { heldZoom, heldZoomRef } = useTimelineKeyboardEvents({
    keyHandlersRef,
    deleteSelectedFormaClip,
    openPreferences,
    setHelpOpen,
    projectId,
    draftProject,
  });

  const {
    loopDraft,
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

  const { marqueeBox, beginMarquee, beginTouchCanvasNav } = useTimelineMarquee({
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

  const {
    gestureSession,
    gesturePreview,
    gestureSessionRef,
    beginContentPencilDraw,
    onContentClipPointerDown,
    onAudioClipPointerDown,
    onFormaLanePointerDown,
    onFormaLanePointerMove,
    onFormaLanePointerUp,
    onFormaClipPointerDown,
    onFormaClipPointerMove,
    onFormaClipPointerUp,
  } = useTimelineFormaGestures({
    draftRef,
    draftProject,
    commitDraft,
    rawTicksAtClientX,
    tool,
    gesturePolicy,
    setTouchAlertOpen,
    clipSelection,
    setClipSelection,
    clearClipSelection,
    selectLaneClip,
    selectedClipId,
    clearMapSelection,
    setSelectedAnchorId,
    setSongMetaOpen,
    setSelectedSubsectionIdx,
    deleteSelectedFormaClip,
    beginMarquee,
    beginTouchCanvasNav,
    heldZoomRef,
    zoomHRef,
    effectiveZoomH,
    soloAudioTrackIds,
    setSoloAudioTrackIds,
    soloHoldRef,
    setCanvasNotice,
    canvasNoticeTimerRef,
  });

  const {
    mapDragPreview,
    onMapLanePointerDown,
    onMapSegmentPointerDown,
    onMapSegmentPointerMove,
    onMapSegmentPointerUp,
  } = useTimelineMapPointerHandlers({
    draftRef,
    draftProject,
    commitDraft,
    rawTicksAtClientX,
    tool,
    heldZoomRef,
    gesturePolicy,
    setTouchAlertOpen,
    selectedMapLane,
    selectedMapIds,
    primaryMapId,
    setMapSelection,
    setPrimaryMapId,
    clearMapSelection,
    openMapEdit,
    beginTouchCanvasNav,
  });

  const {
    viewSpan,
    barTicks,
    canvasWidthPx,
    barMarks,
    rulerBeatMarks,
    playheadPx,
    effectiveLocatorTicks,
    tapActiveClipId,
    locatorPx,
    locatorLabel,
    loopOn,
    loopRange,
    tempoSegments,
    meterSegments,
    keySegments,
  } = useTimelineCanvasDerived({
    draftProject,
    gesturePreview,
    gestureSessionRef,
    effectiveZoomH,
    displayTicks,
    locatorTicks,
    tool,
    tapLineIndex,
    state,
    loopDraft,
    mapDragPreview,
    viewSpanRef,
    barTicksRef,
    effectiveLocatorTicksRef,
  });

  const {
    metronomeOn,
    latencyCompMs,
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

  useTimelineAudioEngineSync({
    projectId,
    draftProject,
    setDraftProject,
    setTrackVisibility,
    setFailedAudioAssetIds,
    setSoftClockTempoMaps,
    state,
    displayTicks,
    loopOn,
    soloAudioTrackIds,
    soloBusIds,
    latencyCompMs,
  });

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
  }, [draftProject, openSongImportWizard]);

  const { onAddAudioTrack, onRemoveAudioTrack, onDuplicateAudioTrack } =
    useTimelineTrackActions({
      draftProject,
      commitDraft,
      setClipSelection,
      setTrackSelection,
      setInspectorVisible,
      setEyeOpen,
      setTrackVisibility,
      setSoloAudioTrackIds,
      setTrackRename,
      setSelectedBusId,
      setSelectedHwOutputId,
      isMobilePreview,
      setTouchAlertOpen,
      setLoadError,
      openContextMenu,
    });

  const {
    toggleTrack,
    openTrackRename,
    commitTrackRename,
    cancelTrackRename,
    openAudioTrackContextMenu,
    onAudioTrackHeaderClick,
    onAudioTrackSoloClick,
    onAudioTrackMuteClick,
  } = useTimelineAudioTrackInteractions({
    draftProject,
    commitDraft,
    trackSelection,
    setTrackSelection,
    setClipSelection,
    setSelectedBusId,
    setSelectedHwOutputId,
    setInspectorVisible,
    setSoloAudioTrackIds,
    setSoloBusIds,
    setTrackVisibility,
    trackRename,
    setTrackRename,
    isMobilePreview,
    setTouchAlertOpen,
    openContextMenu,
    onDuplicateAudioTrack,
    onRemoveAudioTrack,
  });

  const {
    busRename,
    buildChannelStripCallbacks,
    buildMasterStripCallbacks,
    onAddBus,
    onAddHwOut,
    onHwGainChange,
    onHwMuteToggle,
    onHwChannelModeChange,
    onHwSelect,
    onHwContextMenu,
    buildBusCallbacks,
  } = useTimelineDockCallbacks({
    draftProject,
    commitDraft,
    state,
    setLoadError,
    onAudioTrackHeaderClick,
    openAudioTrackContextMenu,
    onAudioTrackSoloClick,
    onAudioTrackMuteClick,
    openTrackRename,
    setTrackRename,
    commitTrackRename,
    cancelTrackRename,
    setClipSelection,
    setTrackSelection,
    setSelectedBusId,
    setSelectedHwOutputId,
    setSoloBusIds,
    setSoloAudioTrackIds,
    openContextMenu,
  });

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
      <TimelineHeaderContainer
        operatorNavCompact={operatorNavCompact}
        draftProject={draftProject}
        projectId={projectId}
        fullscreenButton={fullscreenButton}
        APP_VERSION={APP_VERSION}
        headerHistory={headerHistory}
        helpOpen={helpOpen}
        setHelpOpen={setHelpOpen}
        headerOnFullscreen={headerOnFullscreen}
        shouldShowOperatorNav={shouldShowOperatorNav}
        pathname={pathname}
        wsStatus={wsStatus}
        fullscreenError={fullscreenError}
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
        prevSetlistId={prevSetlistId ?? null}
        nextSetlistId={nextSetlistId ?? null}
        songScreenOpen={songScreenOpen}
        setSongScreenOpen={setSongScreenOpen}
        songScreenId={songScreenId}
        setlistEnabled={setlistEnabled}
        autoAdvance={autoAdvance}
        patchSetlistAutoAdvance={patchSetlistAutoAdvance}
        setAutoAdvance={setAutoAdvance}
      />

      <TimelineCanvasViewport
        inspectorOpen={inspectorOpen}
        uiScale={uiScale}
        effectiveZoomV={effectiveZoomV}
        timelineSurface={timelineSurface}
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
        trackVisibility={trackVisibility}
        rowHeightStyle={rowHeightStyle}
        laneHeights={laneHeights}
        zoomV={zoomV}
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
        closeInspectorPanel={closeInspectorPanel}
        clipSelection={clipSelection}
        selectionLane={selectionLane}
        songMetaOpen={songMetaOpen}
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
        displayTicks={displayTicks}
        projectId={projectId}
      />

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

      <TimelineDialogsContainer
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
