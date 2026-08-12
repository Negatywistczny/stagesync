/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TimelineHeaderContainerProps } from "./TimelineHeaderContainer.js";
import { TOOLS } from "../timelineToolsData.js";
import { patchSetlistAutoAdvance } from "@lib/shell-operator/setlistApi.js";
import { APP_VERSION } from "@lib/client/appVersion.js";

interface HeaderPropsContext {
  appHeader: any;
  transport: any;
  modals: any;
  floatingMenus: any;
  setlistState: any;
  playback: any;
  mapEdits: any;
  derivedSelection: any;
  selection: any;
  panelState: any;
  draftProject: any;
  projectId: string | null;
  pathname: string;
  shouldShowOperatorNav: (path: string) => boolean;
  isMobilePreview: boolean;
  toolbarVisibleSet: Set<string>;
  tool: any;
  timelineSurface: any;
  setTimelineSurface: any;
  loopOn: boolean;
  onLoopToggle: any;
  songMetaOpen: boolean;
  setSongMetaOpen: any;
  setInspectorVisible: any;
}

export function buildTimelineHeaderProps(
  ctx: HeaderPropsContext,
): TimelineHeaderContainerProps {
  const {
    appHeader,
    transport,
    modals,
    floatingMenus,
    setlistState,
    playback,
    mapEdits,
    derivedSelection,
    selection,
    draftProject,
    projectId,
    pathname,
    shouldShowOperatorNav,
    isMobilePreview,
    toolbarVisibleSet,
    tool,
    timelineSurface,
    setTimelineSurface,
    loopOn,
    onLoopToggle,
    songMetaOpen,
    setSongMetaOpen,
    setInspectorVisible,
  } = ctx;

  return {
    operatorNavCompact: appHeader.operatorNavCompact,
    draftProject,
    projectId,
    fullscreenButton: appHeader.fullscreenButton,
    APP_VERSION,
    headerHistory: appHeader.headerHistory,
    helpOpen: modals.helpOpen,
    setHelpOpen: modals.setHelpOpen,
    headerOnFullscreen: appHeader.headerOnFullscreen,
    shouldShowOperatorNav,
    pathname,
    wsStatus: transport.wsStatus,
    fullscreenError: appHeader.fullscreenError,
    timelineHeaderActions: appHeader.timelineHeaderActions,
    isMobilePreview,
    tools: TOOLS,
    toolbarVisibleSet,
    tool,
    onTool: floatingMenus.onTool,
    toolsVisBtnRef: floatingMenus.toolsVisBtnRef,
    toolsVisOpen: floatingMenus.toolsVisOpen,
    toolsVisMenuId: floatingMenus.toolsVisMenuId ?? "tl-tools-vis",
    setToolsVisOpen: floatingMenus.setToolsVisOpen,
    commandPending: transport.commandPending,
    onStopClick: playback.onStopClick,
    state: transport.state,
    audioBuffering: playback.audioBuffering,
    onPauseClick: playback.onPauseClick,
    onPlayClick: playback.onPlayClick,
    clockLabel: transport.clockLabel,
    tempoAtPlayhead: derivedSelection.tempoAtPlayhead,
    displayTicks: transport.displayTicks,
    openMapEdit: mapEdits.openMapEdit,
    timelineSurface,
    setTimelineSurface,
    loopOn,
    onLoopToggle,
    meterAtPlayhead: derivedSelection.meterAtPlayhead,
    metronomeOn: playback.metronomeOn,
    onMetronomeToggle: playback.onMetronomeToggle,
    followPlayhead: playback.followPlayhead,
    setFollowPlayhead: playback.setFollowPlayhead,
    showMidiPlayhead: playback.showMidiPlayhead,
    setShowMidiPlayhead: playback.setShowMidiPlayhead,
    songMetaOpen,
    clearClipSelection: selection.clearClipSelection,
    clearMapSelection: selection.clearMapSelection,
    setInspectorVisible,
    setSongMetaOpen,
    prevSetlistId: setlistState.prevSetlistId ?? null,
    nextSetlistId: setlistState.nextSetlistId ?? null,
    songScreenOpen: modals.songScreenOpen,
    setSongScreenOpen: modals.setSongScreenOpen,
    songScreenId: modals.songScreenId ?? "tl-song-screen",
    setlistEnabled: setlistState.setlistEnabled,
    autoAdvance: setlistState.autoAdvance,
    patchSetlistAutoAdvance,
    setAutoAdvance: setlistState.setAutoAdvance,
  };
}
