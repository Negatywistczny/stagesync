/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TimelineCanvasViewportProps } from "./TimelineCanvasViewport.js";

interface CanvasViewportContext {
  draftProject: any;
  projectId: string | null;
  timelineSurface: any;
  touchTier: any;
  isMobilePreview: boolean;
  tool: any;
  trackVisibility: any;
  songMetaOpen: boolean;
  audioLaneDropId: string | null;
  setAudioLaneDropId: any;
  audioUploadPending: boolean;
  displayTicks: number;

  canvasScrollRef: any;
  markerOverlayRef: any;
  lanesCoordRef: any;
  laneImportTrackIdRef: any;
  laneImportStartTicksRef: any;
  laneAudioFileRef: any;
  draftRef: any;
  rawTicksAtClientX: any;

  derivedSelection: any;
  selection: any;
  zoomPan: any;
  gestures: any;
  canvasDerived: any;
  playback: any;
  audioState: any;
  panelState: any;
  floatingMenus: any;
  contextMenus: any;
  modals: any;
  mapEdits: any;
  shortcuts: any;
}

export function buildTimelineCanvasViewportProps(
  ctx: CanvasViewportContext,
): TimelineCanvasViewportProps {
  const {
    draftProject,
    projectId,
    timelineSurface,
    touchTier,
    isMobilePreview,
    tool,
    trackVisibility,
    songMetaOpen,
    audioLaneDropId,
    setAudioLaneDropId,
    audioUploadPending,
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
  } = ctx;

  const canvasInnerWidth = `calc(var(--tl-dock-w) + ${canvasDerived.canvasWidthPx}px)`;

  return {
    inspectorOpen: derivedSelection.inspectorOpen,
    uiScale: zoomPan.uiScale,
    effectiveZoomV: zoomPan.effectiveZoomV,
    timelineSurface,
    draftProject,
    trackSelection: selection.trackSelection,
    soloAudioTrackIds: audioState.soloAudioTrackIds ?? [],
    soloBusIds: audioState.soloBusIds ?? [],
    selectedBusId: selection.selectedBusId,
    selectedHwOutputId: selection.selectedHwOutputId,
    trackRename: audioState.trackRename,
    busRename: audioState.busRename,
    buildChannelStripCallbacks: audioState.buildChannelStripCallbacks,
    buildBusCallbacks: audioState.buildBusCallbacks,
    buildMasterStripCallbacks: audioState.buildMasterStripCallbacks(),
    onMetronomeToggle: playback.onMetronomeToggle,
    metronomeOn: playback.metronomeOn,
    playing: playback.playing ?? false,
    onAddAudioTrack: audioState.onAddAudioTrack,
    onAddBus: audioState.onAddBus,
    onAddHwOut: audioState.onAddHwOut,
    onHwSelect: audioState.onHwSelect,
    onHwContextMenu: audioState.onHwContextMenu,
    onHwGainChange: audioState.onHwGainChange,
    onHwMuteToggle: audioState.onHwMuteToggle,
    onHwChannelModeChange: audioState.onHwChannelModeChange,
    canvasScrollRef,
    canvasInnerWidth,
    dockWidthBase: zoomPan.dockWidthBase,
    markerOverlayRef,
    showMidiPlayhead: playback.showMidiPlayhead,
    playheadPx: canvasDerived.playheadPx,
    locatorPx: canvasDerived.locatorPx,
    viewSpan: canvasDerived.viewSpan,
    barTicks: canvasDerived.barTicks,
    effectiveLocatorTicks: canvasDerived.effectiveLocatorTicks,
    locatorLabel: canvasDerived.locatorLabel,
    onLocatorPointerDown: gestures.onLocatorPointerDown,
    onLocatorPointerMove: gestures.onLocatorPointerMove,
    onLocatorPointerUp: gestures.onLocatorPointerUp,
    eyeBtnRef: floatingMenus.eyeBtnRef,
    eyeOpen: floatingMenus.eyeOpen,
    eyeMenuId: floatingMenus.eyeMenuId ?? "tl-eye-menu",
    setEyeOpen: floatingMenus.setEyeOpen,
    touchTier,
    beginDockWidthResize: zoomPan.beginDockWidthResize,
    onDockWidthResizePointerMove: zoomPan.onDockWidthResizePointerMove,
    endDockWidthResize: zoomPan.endDockWidthResize,
    effectiveZoomH: zoomPan.effectiveZoomH,
    loopRange: canvasDerived.loopRange,
    loopOn: canvasDerived.loopOn,
    barMarks: canvasDerived.barMarks,
    rulerBeatMarks: canvasDerived.rulerBeatMarks,
    bindTrackRowsRef: panelState.bindTrackRowsRef,
    lanesCoordRef,
    marqueeBox: gestures.marqueeBox,
    trackVisibility,
    rowHeightStyle: zoomPan.rowHeightStyle,
    laneHeights: zoomPan.laneHeights,
    zoomV: zoomPan.zoomV,
    tool,
    onTool: floatingMenus.onTool,
    isMobilePreview,
    laneResizeTrackId: zoomPan.laneResizeTrackId,
    beginLaneResize: zoomPan.beginLaneResize,
    onLaneResizePointerMove: zoomPan.onLaneResizePointerMove,
    endLaneResize: zoomPan.endLaneResize,
    onLaneResizeDblClick: zoomPan.onLaneResizeDblClick,
    onAudioTrackHeaderClick: audioState.onAudioTrackHeaderClick,
    openAudioTrackContextMenu: audioState.openAudioTrackContextMenu,
    heldZoom: gestures.heldZoom,
    audioLaneDropId,
    setAudioLaneDropId,
    onUploadAudioToTrack: audioState.onUploadAudioToTrack,
    openEmptyLaneContextMenu: contextMenus.openEmptyLaneContextMenu,
    beginMarquee: gestures.beginMarquee,
    beginTouchCanvasNav: gestures.beginTouchCanvasNav,
    heldZoomRef: gestures.heldZoomRef,
    onFormaLanePointerDown: gestures.onFormaLanePointerDown,
    onMapLanePointerDown: gestures.onMapLanePointerDown,
    onFormaLanePointerMove: gestures.onFormaLanePointerMove,
    onFormaLanePointerUp: gestures.onFormaLanePointerUp,
    beginContentPencilDraw: gestures.beginContentPencilDraw,
    rawTicksAtClientX,
    commitDraft: ctx.draftProject
      ? (shortcuts.commitDraft ?? ((p: any) => p))
      : (p: any) => p,
    clearMapSelection: selection.clearMapSelection,
    selectLaneClip: panelState.selectLaneClip,
    laneImportTrackIdRef,
    laneImportStartTicksRef,
    laneAudioFileRef,
    draftRef,
    failedAudioAssetIds: playback.failedAudioAssetIds,
    gestureSession: gestures.gestureSession,
    gesturePreview: gestures.gesturePreview,
    primaryId: derivedSelection.primaryId,
    selectedAnchorId: selection.selectedAnchorId,
    mapDragPreview: gestures.mapDragPreview,
    tempoSegments: canvasDerived.tempoSegments,
    meterSegments: canvasDerived.meterSegments,
    keySegments: canvasDerived.keySegments,
    tapActiveClipId: canvasDerived.tapActiveClipId,
    clearClipSelection: selection.clearClipSelection,
    setSelectedAnchorId: selection.setSelectedAnchorId,
    setInspectorVisible: panelState.setInspectorVisible,
    setSongMetaOpen: panelState.setSongMetaOpen,
    setMapSelection: panelState.setMapSelection,
    openMapEdit: mapEdits.openMapEdit,
    openClipContextMenu: contextMenus.openClipContextMenu,
    focusInspectorPanel: panelState.focusInspectorPanel,
    onAudioClipPointerDown: gestures.onAudioClipPointerDown,
    onFormaClipPointerDown: gestures.onFormaClipPointerDown,
    onContentClipPointerDown: gestures.onContentClipPointerDown,
    onFormaClipPointerMove: gestures.onFormaClipPointerMove,
    onFormaClipPointerUp: gestures.onFormaClipPointerUp,
    onMapSegmentPointerDown: gestures.onMapSegmentPointerDown,
    onMapSegmentPointerMove: gestures.onMapSegmentPointerMove,
    onMapSegmentPointerUp: gestures.onMapSegmentPointerUp,
    closeInspectorPanel: panelState.closeInspectorPanel,
    clipSelection: selection.clipSelection,
    selectionLane: derivedSelection.selectionLane,
    songMetaOpen,
    openSongImportWizard: modals.openSongImportWizard,
    selectedMapLane: selection.selectedMapLane,
    selectedMapIds: selection.selectedMapIds,
    primaryMapId: panelState.primaryMapId ?? selection.primaryMapId,
    selectedTekstClip: derivedSelection.selectedTekstClip,
    selectedAkordClip: derivedSelection.selectedAkordClip,
    selectedCueClip: derivedSelection.selectedCueClip,
    selectedAnchor: derivedSelection.selectedAnchor,
    selectedAudioClip: derivedSelection.selectedAudioClip,
    selectedDockAudioTrack: derivedSelection.selectedDockAudioTrack,
    selectedClip: derivedSelection.selectedClip,
    selectedSubsectionRows: derivedSelection.selectedSubsectionRows,
    selectedSubsectionIdx: selection.selectedSubsectionIdx,
    setSelectedSubsectionIdx: selection.setSelectedSubsectionIdx,
    onClipRename: shortcuts.onClipRename,
    onCountdownBarsChange: shortcuts.onCountdownBarsChange,
    audioUploadPending,
    displayTicks,
    projectId,
  };
}
