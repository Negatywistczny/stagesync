/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import type { Project } from "@stagesync/shared";
import type { MapLaneId } from "@lib/timeline/mapLaneEdit.js";
import { AppHeader } from "../../components/AppHeader.js";
import { OperatorNav } from "../../components/OperatorNav.js";
import { ConnectionLostBanner } from "../../client/ConnectionLostBanner.js";
import { TimelineToolbar } from "../TimelineToolbar.js";
import type { ToolId } from "../timelineToolsData.js";
import styles from "../TimelineShell.module.css";

export type TimelineHeaderContainerProps = {
  operatorNavCompact: boolean;
  draftProject: Project | null;
  projectId: string | null;
  fullscreenButton: React.ReactNode;
  APP_VERSION: string;
  headerHistory?: {
    canUndo: boolean;
    canRedo: boolean;
    dirty: boolean;
    savePending: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onSave: () => void;
    onDiscard: () => void;
  };
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
  headerOnFullscreen?: () => void;
  shouldShowOperatorNav: (pathname: string) => boolean;
  pathname: string;
  wsStatus: any;
  fullscreenError: string | null;
  timelineHeaderActions: React.ReactNode;
  isMobilePreview: boolean;
  tools: any[];
  toolbarVisibleSet: Set<string>;
  tool: ToolId;
  onTool: (tool: ToolId) => void;
  toolsVisBtnRef: React.RefObject<HTMLButtonElement | null>;
  toolsVisOpen: boolean;
  toolsVisMenuId: string;
  setToolsVisOpen: React.Dispatch<React.SetStateAction<boolean>>;
  commandPending: boolean;
  onStopClick: () => void;
  state: any;
  audioBuffering: boolean;
  onPauseClick: () => void;
  onPlayClick: () => void;
  clockLabel: string;
  tempoAtPlayhead: number;
  displayTicks: number;
  openMapEdit: (
    kind: MapLaneId,
    ticks: number,
    seed?: { bpm?: number; num?: number; den?: number },
  ) => void;
  timelineSurface: any;
  setTimelineSurface: (surface: any) => void;
  loopOn: boolean;
  onLoopToggle: () => void;
  meterAtPlayhead: any;
  metronomeOn: boolean;
  onMetronomeToggle: () => void;
  followPlayhead: boolean;
  setFollowPlayhead: React.Dispatch<React.SetStateAction<boolean>>;
  showMidiPlayhead: boolean;
  setShowMidiPlayhead: React.Dispatch<React.SetStateAction<boolean>>;
  songMetaOpen: boolean;
  clearClipSelection: () => void;
  clearMapSelection: () => void;
  setInspectorVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setSongMetaOpen: (v: boolean) => void;
  prevSetlistId: string | null;
  nextSetlistId: string | null;
  songScreenOpen: boolean;
  setSongScreenOpen: React.Dispatch<React.SetStateAction<boolean>>;
  songScreenId: string | null;
  setlistEnabled: boolean;
  autoAdvance: boolean;
  patchSetlistAutoAdvance: (v: boolean) => Promise<{ autoAdvance: { enabled: boolean } }>;
  setAutoAdvance: (v: boolean) => void;
};

export function TimelineHeaderContainer({
  operatorNavCompact,
  draftProject,
  projectId,
  fullscreenButton,
  APP_VERSION,
  headerHistory,
  helpOpen,
  setHelpOpen,
  headerOnFullscreen,
  shouldShowOperatorNav,
  pathname,
  wsStatus,
  fullscreenError,
  timelineHeaderActions,
  isMobilePreview,
  tools,
  toolbarVisibleSet,
  tool,
  onTool,
  toolsVisBtnRef,
  toolsVisOpen,
  toolsVisMenuId,
  setToolsVisOpen,
  commandPending,
  onStopClick,
  state,
  audioBuffering,
  onPauseClick,
  onPlayClick,
  clockLabel,
  tempoAtPlayhead,
  displayTicks,
  openMapEdit,
  timelineSurface,
  setTimelineSurface,
  loopOn,
  onLoopToggle,
  meterAtPlayhead,
  metronomeOn,
  onMetronomeToggle,
  followPlayhead,
  setFollowPlayhead,
  showMidiPlayhead,
  setShowMidiPlayhead,
  songMetaOpen,
  clearClipSelection,
  clearMapSelection,
  setInspectorVisible,
  setSongMetaOpen,
  prevSetlistId,
  nextSetlistId,
  songScreenOpen,
  setSongScreenOpen,
  songScreenId,
  setlistEnabled,
  autoAdvance,
  patchSetlistAutoAdvance,
  setAutoAdvance,
}: TimelineHeaderContainerProps) {
  return (
    <>
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
        tools={tools}
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
        songScreenId={songScreenId ?? ""}
        setlistEnabled={setlistEnabled}
        autoAdvance={autoAdvance}
        patchSetlistAutoAdvance={patchSetlistAutoAdvance}
        setAutoAdvance={setAutoAdvance}
      />
    </>
  );
}
