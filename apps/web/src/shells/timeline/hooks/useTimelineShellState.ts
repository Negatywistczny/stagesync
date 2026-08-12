import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useContextMenu } from "@stagesync/ui";
import { ticksFromPointer } from "@lib/timeline-edit/formaCanvas.js";
import {
  clearSelection,
  EMPTY_CLIP_SELECTION,
  selectSingle,
  type ClipSelection,
  type TimelineSurface,
} from "@lib/timeline/timelineSelection.js";
import {
  loadToolbarVisibleTools,
  type ToolbarToolId,
} from "@lib/timeline/timelineToolbarTools.js";
import { useTimelineTouchGestures } from "@lib/timeline/useTimelineTouchGestures.js";
import {
  detectTimelineTier,
  TIMELINE_COARSE_MQ,
  TIMELINE_LANDSCAPE_PHONE_MQ,
  TIMELINE_MOBILE_MQ,
  timelineGesturesAllowed,
  type TimelineTouchTier,
} from "@lib/timeline/timelineTouchTier.js";
import { toolNeedsExclusiveTouchAction } from "@lib/timeline/timelineGesture.js";
import {
  defaultTrackVisibility,
  ensureAudioTrackVisibility,
  type TrackVisibilityMap,
} from "@lib/timeline/timelineTracks.js";
import {
  ZOOM_H_MAX as PREFS_ZOOM_H_MAX,
  ZOOM_H_MIN as PREFS_ZOOM_H_MIN,
} from "@lib/timeline/timelineZoomPrefs.js";
import { useAnnounceDevicePresence } from "@lib/client/useAnnounceDevicePresence.js";
import { markOperatorSession } from "@lib/shell-operator/operatorSession.js";
import { openPreferences } from "@lib/client/preferencesEvents.js";
import { shouldShowOperatorNav } from "@lib/shell-operator/operatorSurface.js";
import { useMqMobileCompact } from "@lib/client/useMqMobileCompact.js";
import { loadTransport } from "../../../transport/api.js";
import { getFailedAudioAssetIds } from "@lib/audio/audioPlayback.js";
import { useTimelineModals } from "./useTimelineModals.js";
import { useTimelineDraft } from "./useTimelineDraft.js";
import { useTimelineZoomPan } from "./useTimelineZoomPan.js";
import { useTimelinePlayback } from "./useTimelinePlayback.js";
import { useTimelineSelectionState } from "./useTimelineSelectionState.js";
import { useTimelineContextMenus } from "./useTimelineContextMenus.js";
import { useTimelineMapEdits } from "./useTimelineMapEdits.js";
import { useTimelineWandTool } from "./useTimelineWandTool.js";
import { useTimelineSongImport } from "./useTimelineSongImport.js";
import { useTimelineCanvasDerived } from "./useTimelineCanvasDerived.js";
import { useTimelineSetlistState } from "./useTimelineSetlistState.js";
import { useTimelineDerivedSelection } from "./useTimelineDerivedSelection.js";
import { useTimelineFloatingMenus } from "./useTimelineFloatingMenus.js";
import { useTimelinePanelState } from "./useTimelinePanelState.js";
import { useTimelineTransportClock } from "./useTimelineTransportClock.js";
import { useTimelineAppHeader } from "./useTimelineAppHeader.js";
import { useTimelineGestures } from "./useTimelineGestures.js";
import { useTimelineAudioState } from "./useTimelineAudioState.js";
import { useTimelineShortcutsAndSync } from "./useTimelineShortcutsAndSync.js";
import type { TimelineKeyHandlers } from "./useTimelineShortcuts.js";
import { buildTimelineHeaderProps } from "../containers/buildTimelineHeaderProps.js";
import { buildTimelineCanvasViewportProps } from "../containers/buildTimelineCanvasViewportProps.js";
import { buildTimelineDialogsProps } from "../containers/buildTimelineDialogsProps.js";
import type { ToolId } from "../timelineToolsData.js";
import styles from "../TimelineShell.module.css";

export function useTimelineShellState() {
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
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const laneAudioFileRef = useRef<HTMLInputElement>(null);
  const laneImportTrackIdRef = useRef<string | null>(null);
  const laneImportStartTicksRef = useRef<number | null>(null);

  // 1. Transport & Clock
  const transport = useTimelineTransportClock();
  const {
    state,
    displayTicks,
    setLoop,
    setSoftClockTempoMaps,
    snapMode,
    setSnapMode,
  } = transport;
  const { openAt: openContextMenu, close: closeContextMenu } = useContextMenu();

  // 2. Modals & Touch tier
  const modals = useTimelineModals();
  const [touchTier, setTouchTier] = useState<TimelineTouchTier>(() =>
    typeof window !== "undefined" ? detectTimelineTier() : "desktop",
  );
  const isMobilePreview = touchTier === "mobile";
  const gesturePolicy = timelineGesturesAllowed(touchTier);
  const [songMetaOpen, setSongMetaOpen] = useState(false);
  const [inspectorVisible, setInspectorVisible] = useState(
    () =>
      (typeof window !== "undefined" ? detectTimelineTier() : "desktop") !==
      "mobile",
  );
  const [touchAlertOpen, setTouchAlertOpen] = useState(false);
  const [tool, setTool] = useState<ToolId>("pointer");
  const toolRef = useRef<ToolId>("pointer");
  toolRef.current = tool;
  const soloHoldRef = useRef<string[] | null>(null);
  const effectiveLocatorTicksRef = useRef(0);
  const [tapLineIndex, setTapLineIndex] = useState(0);
  const tapLineIndexRef = useRef(0);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  // 3. Floating menus & UI State
  const floatingMenus = useTimelineFloatingMenus({
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
    if (canvasNoticeTimerRef.current)
      clearTimeout(canvasNoticeTimerRef.current);
    setCanvasNotice(message);
    canvasNoticeTimerRef.current = setTimeout(() => {
      setCanvasNotice(null);
      canvasNoticeTimerRef.current = null;
    }, 3200);
  }, []);

  const clipSelectionRef = useRef<ClipSelection>(EMPTY_CLIP_SELECTION);

  // 4. Draft & Song management
  const draft = useTimelineDraft({
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
      selection.setClipSelection(
        first ? selectSingle(first, "forma") : clearSelection(),
      );
      selection.setSelectedSubsectionIdx(null);
    },
    onRestoreClipSelection: (sel) => {
      selection.setClipSelection(sel);
    },
  });
  const {
    savedProject,
    setSavedProject,
    draftProject,
    setDraftProject,
    draftHistory,
    setDraftHistory,
    loading,
    savePending,
    loadError,
    setLoadError,
    draftRef,
    dirty,
    reloadProject,
    commitDraft,
    onSave,
    onUndo,
    onRedo,
  } = draft;

  const songImport = useTimelineSongImport({
    projectId: projectId ?? null,
    draftProject,
    draftRef,
    commitDraft,
    importAsNewSong: modals.importAsNewSong,
    setImportApplying: modals.setImportApplying,
    closeImportModals: modals.closeSongImportWizard,
    setSongScreenOpen: modals.setSongScreenOpen,
    setSongMetaOpen,
    flashCanvasNotice,
  });

  const mapEdits = useTimelineMapEdits({ draftProject, commitDraft });

  // 5. Selection & derived
  const selection = useTimelineSelectionState({
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

  const derivedSelection = useTimelineDerivedSelection({
    draftProject,
    clipSelection: selection.clipSelection,
    trackSelection: selection.trackSelection,
    selectedAnchorId: selection.selectedAnchorId,
    isMobilePreview,
    inspectorVisible,
    timelineSurface,
    displayTicks,
    state,
  });

  const wandTool = useTimelineWandTool({
    draftRef,
    clipSelection: selection.clipSelection,
    commitDraft,
    flashCanvasNotice,
    setWandMenu: floatingMenus.setWandMenu,
    setTool,
  });

  const viewSpanRef = useRef({ start: 0, end: 0 });
  const barTicksRef = useRef(3840);

  // 6. Zoom & Pan
  const zoomPan = useTimelineZoomPan({
    canvasScrollRef,
    viewSpanRef,
    barTicksRef,
    touchTier,
  });

  // 7. Panel & Setlist state
  const panelState = useTimelinePanelState({
    touchTier,
    setInspectorVisible,
    setSongMetaOpen,
    setClipSelection: selection.setClipSelection,
    clearClipSelection: selection.clearClipSelection,
    clearMapSelection: selection.clearMapSelection,
    setTrackSelection: selection.setTrackSelection,
    setSelectedAnchorId: selection.setSelectedAnchorId,
    setSelectedSubsectionIdx: selection.setSelectedSubsectionIdx,
    setSelectedMapLane: selection.setSelectedMapLane,
    setSelectedMapIds: selection.setSelectedMapIds,
    setPrimaryMapId,
  });

  const setlistState = useTimelineSetlistState({
    projectId,
    draftProjectName: draftProject?.name,
    songScreenOpen: modals.songScreenOpen,
    setlistSnapshot: transport.setlistSnapshot,
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
    enabled: true,
    scrollRef: canvasScrollRef,
    getZoomH: () => zoomPan.zoomHBaseRef.current,
    applyZoomH: (next, anchor) => {
      keyHandlersRef.current.applyAbsoluteZoomH?.(next, anchor);
    },
    onDoubleTap: () => {
      keyHandlersRef.current.fitZoom();
    },
    zoomMin: PREFS_ZOOM_H_MIN,
    zoomMax: PREFS_ZOOM_H_MAX,
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
        zoomPan.zoomHRef.current,
      );
    },
    [draftRef, zoomPan.zoomHRef],
  );

  // 8. Context menus
  const contextMenus = useTimelineContextMenus({
    isMobilePreview,
    setTouchAlertOpen,
    clearMapSelection: selection.clearMapSelection,
    clipSelectionRef,
    setClipSelection: selection.setClipSelection,
    setSelectedSubsectionIdx: selection.setSelectedSubsectionIdx,
    setSelectedAnchorId: selection.setSelectedAnchorId,
    setSongMetaOpen,
    setInspectorVisible,
    selectLaneClip: panelState.selectLaneClip,
    clipboardRef: selection.clipboardRef,
    rawTicksAtClientX,
    draftRef,
    commitDraft,
    copyClipSelection: selection.copyClipSelection,
    deleteSelectedFormaClip: selection.deleteSelectedFormaClip,
    duplicateClipSelection: selection.duplicateClipSelection,
    pasteClipClipboard: selection.pasteClipClipboard,
    focusInspectorPanel: panelState.focusInspectorPanel,
    openContextMenu,
    laneImportTrackIdRef,
    laneImportStartTicksRef,
    laneAudioFileRef,
    locatorTicks,
  });

  const keyHandlersRef = useRef<TimelineKeyHandlers>({
    onSave: async () => {},
    onDiscard: () => {},
    onUndo: () => {},
    onRedo: () => {},
    onClipCut: () => false,
    onClipCopy: () => false,
    onClipPaste: () => false,
    onPlayOrPause: () => {},
    onStop: async () => {},
    onMetronomeToggle: async () => {},
    onLoopToggle: () => {},
    onTool: () => {},
    applyWand: () => {},
    nudgeLocator: () => {},
    fitZoom: () => {},
    zoomHorizontalBySteps: () => {},
    applyAbsoluteZoomH: () => {},
    zoomVerticalBySteps: () => {},
    dirty: false,
    savePending: false,
    playing: false,
    tool: "pointer",
    prevSetlistId: null,
    nextSetlistId: null,
  });

  // 9. Gestures facade
  const gestures = useTimelineGestures({
    draftRef,
    draftProject,
    commitDraft,
    state,
    locatorTicks,
    seek: transport.seek,
    setLoop: transport.setLoop,
    setLocatorTicks,
    markerOverlayRef,
    lanesCoordRef,
    canvasScrollRef,
    viewSpanRef,
    barTicksRef,
    zoomHRef: zoomPan.zoomHRef,
    zoomHBaseRef: zoomPan.zoomHBaseRef,
    setZoomH: zoomPan.setZoomH,
    fitZoom: zoomPan.fitZoom,
    rawTicksAtClientX,
    toolRef,
    tool,
    gesturePolicy,
    setTouchAlertOpen,
    clipSelection: selection.clipSelection,
    setClipSelection: selection.setClipSelection,
    clearClipSelection: selection.clearClipSelection,
    selectLaneClip: panelState.selectLaneClip,
    selectedClipId: derivedSelection.selectedClipId,
    clearMapSelection: selection.clearMapSelection,
    setSelectedAnchorId: selection.setSelectedAnchorId,
    setSongMetaOpen,
    setSelectedSubsectionIdx: selection.setSelectedSubsectionIdx,
    deleteSelectedFormaClip: selection.deleteSelectedFormaClip,
    effectiveZoomH: zoomPan.effectiveZoomH,
    soloAudioTrackIds,
    setSoloAudioTrackIds,
    soloHoldRef,
    setCanvasNotice,
    canvasNoticeTimerRef,
    selectedMapLane: selection.selectedMapLane,
    selectedMapIds: selection.selectedMapIds,
    primaryMapId,
    setMapSelection: panelState.setMapSelection,
    setPrimaryMapId,
    openMapEdit: mapEdits.openMapEdit,
    keyHandlersRef,
    openPreferences,
    setHelpOpen: modals.setHelpOpen,
    projectId,
  });

  // 10. Canvas derived & Playback
  const canvasDerived = useTimelineCanvasDerived({
    draftProject,
    gesturePreview: gestures.gesturePreview,
    gestureSessionRef: gestures.gestureSessionRef,
    effectiveZoomH: zoomPan.effectiveZoomH,
    displayTicks,
    locatorTicks,
    tool,
    tapLineIndex,
    state,
    loopDraft: gestures.loopDraft,
    mapDragPreview: gestures.mapDragPreview,
    viewSpanRef,
    barTicksRef,
    effectiveLocatorTicksRef,
  });

  const playback = useTimelinePlayback({
    projectId,
    draftProject,
    draftRef,
    locatorTicks,
    setLocatorTicks,
    displayTicks,
    clipSelection: selection.clipSelection,
    state,
    seek: transport.seek,
    play: transport.play,
    pause: transport.pause,
    stop: transport.stop,
    soloAudioTrackIds,
    soloBusIds,
    canvasScrollRef,
    playheadPx: canvasDerived.playheadPx,
    meterAtPlayhead: derivedSelection.meterAtPlayhead,
    tempoAtPlayhead: derivedSelection.tempoAtPlayhead,
  });
  const { setFailedAudioAssetIds } = playback;

  // 11. Audio & Mixer state
  const [audioLaneDropId, setAudioLaneDropId] = useState<string | null>(null);
  const audioState = useTimelineAudioState({
    projectId,
    draftProject,
    commitDraft,
    setSavedProject,
    setDraftProject,
    setDraftHistory,
    setTrackVisibility,
    setLoadError,
    trackSelection: selection.trackSelection,
    setTrackSelection: selection.setTrackSelection,
    setClipSelection: selection.setClipSelection,
    setSelectedBusId: selection.setSelectedBusId,
    setSelectedHwOutputId: selection.setSelectedHwOutputId,
    setInspectorVisible,
    setEyeOpen: floatingMenus.setEyeOpen,
    setSoloAudioTrackIds,
    setSoloBusIds,
    isMobilePreview,
    setTouchAlertOpen,
    openContextMenu,
    state,
  });

  // 12. Shortcuts & Audio Engine Sync
  const shortcuts = useTimelineShortcutsAndSync({
    keyHandlersRef,
    onSave,
    savedProject,
    projectId,
    reloadProject,
    setDraftProject,
    setDraftHistory,
    clearClipSelection: selection.clearClipSelection,
    onUndo,
    onRedo,
    cutClipSelection: selection.cutClipSelection,
    copyClipSelection: selection.copyClipSelection,
    pasteClipClipboard: selection.pasteClipClipboard,
    locatorTicks,
    audioBuffering: playback.audioBuffering,
    playing: state.playing,
    onPauseClick: playback.onPauseClick,
    onPlayClick: playback.onPlayClick,
    onStopClick: playback.onStopClick,
    onMetronomeToggle: playback.onMetronomeToggle,
    onLoopToggle: gestures.onLoopToggle,
    onTool: floatingMenus.onTool,
    applyWand: wandTool.applyWand,
    nudgeLocator: gestures.nudgeLocator,
    fitZoom: zoomPan.fitZoom,
    zoomHorizontalBySteps: zoomPan.zoomHorizontalBySteps,
    applyAbsoluteZoomH: zoomPan.applyAbsoluteZoomH,
    zoomVerticalBySteps: zoomPan.zoomVerticalBySteps,
    dirty,
    savePending,
    tool,
    prevSetlistId: setlistState.prevSetlistId ?? null,
    nextSetlistId: setlistState.nextSetlistId ?? null,
    songImportOpen: modals.songImportOpen,
    helpOpen: modals.helpOpen,
    setHelpOpen: modals.setHelpOpen,
    toolRef,
    toolMenu: floatingMenus.toolMenu,
    setToolMenu: floatingMenus.setToolMenu,
    wandMenuOpenRef: floatingMenus.wandMenuOpenRef,
    setWandMenu: floatingMenus.setWandMenu,
    setTool,
    eyeMenuPos: floatingMenus.eyeMenuPos,
    setEyeMenuPos: floatingMenus.setEyeMenuPos,
    setEyeOpen: floatingMenus.setEyeOpen,
    toolsVisOpen: floatingMenus.toolsVisOpen,
    setToolsVisOpen: floatingMenus.setToolsVisOpen,
    closeContextMenu,
    closeMobileInspector: panelState.closeMobileInspector,
    duplicateClipSelection: selection.duplicateClipSelection,
    selectAllClips: selection.selectAllClips,
    splitSelectionAtPlayhead: selection.splitSelectionAtPlayhead,
    joinSelectionAdjacent: selection.joinSelectionAdjacent,
    deleteSelectedFormaClip: selection.deleteSelectedFormaClip,
    nudgeSelectedClip: selection.nudgeSelectedClip,
    setCycleFromSelectedAudioClip: selection.setCycleFromSelectedAudioClip,
    playFromSelectionOrLocator: playback.playFromSelectionOrLocator,
    toggleInspectorPanel: panelState.toggleInspectorPanel,
    setTimelineSurface,
    lastPointerRef,
    openToolMenuAt: floatingMenus.openToolMenuAt,
    effectiveLocatorTicksRef,
    tapLineIndexRef,
    setTapLineIndex,
    draftRef,
    commitDraft,
    navigate,
    draftProject,
    setTrackVisibility,
    setFailedAudioAssetIds,
    setSoftClockTempoMaps,
    state,
    displayTicks,
    loopOn: canvasDerived.loopOn,
    soloAudioTrackIds,
    soloBusIds,
    latencyCompMs: playback.latencyCompMs,
    openSongImportWizard: modals.openSongImportWizard,
    selectedClip: derivedSelection.selectedClip,
  });

  // 13. App Header & Fullscreen
  const appHeader = useTimelineAppHeader({
    isMobilePreview,
    isCompactMobile,
    showOperatorNav,
    draftHistory,
    dirty,
    savePending,
    onUndo,
    onRedo,
    onSave,
    onDiscard: shortcuts.onDiscard,
    helpOpen: modals.helpOpen,
    setHelpOpen: modals.setHelpOpen,
  });

  const headerContainerProps = buildTimelineHeaderProps({
    appHeader,
    transport,
    modals,
    floatingMenus,
    setlistState,
    playback,
    mapEdits,
    derivedSelection,
    selection,
    panelState,
    draftProject,
    projectId: projectId ?? null,
    pathname,
    shouldShowOperatorNav,
    isMobilePreview,
    toolbarVisibleSet,
    tool,
    timelineSurface,
    setTimelineSurface,
    loopOn: canvasDerived.loopOn,
    onLoopToggle: gestures.onLoopToggle,
    songMetaOpen,
    setSongMetaOpen,
    setInspectorVisible,
  });

  const canvasViewportProps = buildTimelineCanvasViewportProps({
    draftProject,
    projectId: projectId ?? null,
    timelineSurface,
    touchTier,
    isMobilePreview,
    tool,
    trackVisibility,
    songMetaOpen,
    audioLaneDropId,
    setAudioLaneDropId,
    audioUploadPending: audioState.audioUploadPending,
    displayTicks,
    canvasScrollRef,
    markerOverlayRef,
    lanesCoordRef,
    laneImportTrackIdRef,
    laneImportStartTicksRef,
    laneAudioFileRef,
    draftRef,
    rawTicksAtClientX,
    derivedSelection,
    selection,
    zoomPan,
    gestures,
    canvasDerived,
    playback,
    audioState,
    panelState,
    floatingMenus,
    contextMenus,
    modals,
    mapEdits,
    shortcuts,
  });

  const dialogsContainerProps = buildTimelineDialogsProps({
    draft,
    shortcuts,
    modals,
    setlistState,
    songImport,
    floatingMenus,
    audioState,
    mapEdits,
    toolbarVisibleSet,
    setToolbarVisibleTools,
    displayTicks,
    touchAlertOpen,
    setTouchAlertOpen,
    tool,
  });

  const rootClassName = [
    styles.shell,
    zoomPan.laneResizeTrackId ? styles.laneResizing : "",
    zoomPan.dockWidthResizing ? styles.dockWidthResizing : "",
  ]
    .filter(Boolean)
    .join(" ");

  const touchPanAttr = toolNeedsExclusiveTouchAction(
    gestures.heldZoom ? "zoom" : tool,
  )
    ? undefined
    : "";

  return {
    projectId,
    loading,
    loadError,
    draftProject,
    rootClassName,
    touchTier,
    touchPanAttr,
    laneAudioFileRef,
    audioUploadPending: audioState.audioUploadPending,
    laneImportTrackIdRef,
    laneImportStartTicksRef,
    onUploadAudioToTrack: audioState.onUploadAudioToTrack,
    headerContainerProps,
    canvasViewportProps,
    wsStatus: transport.wsStatus,
    isMobilePreview,
    snapMode,
    setSnapMode,
    zoomUi: zoomPan.zoomUi,
    setZoomUi: zoomPan.setZoomUi,
    zoomH: zoomPan.zoomH,
    setZoomH: zoomPan.setZoomH,
    zoomV: zoomPan.zoomV,
    setVerticalZoom: zoomPan.setVerticalZoom,
    timelineSurface,
    selectionLane: derivedSelection.selectionLane,
    primaryId: derivedSelection.primaryId,
    commitDraft,
    canvasNotice,
    dialogsContainerProps,
  };
}
