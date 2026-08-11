/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import type { Project } from "@stagesync/shared";
import { MixerDock } from "../MixerDock.js";
import { TimelineLanesView } from "../lanes/TimelineLanesView.js";
import { TimelineInspector } from "../TimelineInspector.js";
import styles from "../TimelineShell.module.css";

export type TimelineCanvasViewportProps = {
  inspectorOpen: boolean;
  uiScale: number;
  effectiveZoomV: number;
  timelineSurface: "timeline" | "mixer";
  draftProject: Project | null;
  trackSelection: any;
  soloAudioTrackIds: string[];
  soloBusIds: string[];
  selectedBusId: string | null;
  selectedHwOutputId: string | null;
  trackRename: { trackId: string; name: string } | null;
  busRename: { busId: string; name: string } | null;
  buildChannelStripCallbacks: (trackId: string) => any;
  buildBusCallbacks: (busId: string) => any;
  buildMasterStripCallbacks: any;
  onMetronomeToggle: () => void;
  metronomeOn: boolean;
  playing: boolean;
  onAddAudioTrack: () => void;
  onAddBus: () => void;
  onAddHwOut: () => void;
  onHwSelect: (id: string, e: React.MouseEvent) => void;
  onHwContextMenu: (id: string, e: React.MouseEvent) => void;
  onHwGainChange: (id: string, v: number) => void;
  onHwMuteToggle: (id: string) => void;
  onHwChannelModeChange: (id: string, mode: "mono" | "stereo") => void;

  canvasScrollRef: React.RefObject<HTMLDivElement | null>;
  canvasInnerWidth: string;
  dockWidthBase: number;
  markerOverlayRef: React.RefObject<HTMLDivElement | null>;
  showMidiPlayhead: boolean;
  playheadPx: number;
  locatorPx: number;
  viewSpan: { start: number; end: number };
  barTicks: number;
  effectiveLocatorTicks: number;
  locatorLabel: string;
  onLocatorPointerDown: (e: React.PointerEvent<any>, target: any) => void;
  onLocatorPointerMove: (e: React.PointerEvent<any>) => void;
  onLocatorPointerUp: (e: React.PointerEvent<any>) => void;
  eyeBtnRef: React.RefObject<HTMLButtonElement | null>;
  eyeOpen: boolean;
  eyeMenuId: string;
  setEyeOpen: (fn: (v: boolean) => boolean) => void;
  touchTier: string;
  beginDockWidthResize: (e: React.PointerEvent<any>) => void;
  onDockWidthResizePointerMove: (e: React.PointerEvent<any>) => void;
  endDockWidthResize: (e: React.PointerEvent<any>) => void;
  effectiveZoomH: number;
  loopRange: { startTicks: number; endTicks: number } | null;
  loopOn: boolean;
  barMarks: Array<{ ticks: number; label: string }>;
  rulerBeatMarks: Array<{ ticks: number }>;
  bindTrackRowsRef: (el: HTMLDivElement | null) => void;
  lanesCoordRef: React.RefObject<HTMLDivElement | null>;
  marqueeBox: any;
  trackVisibility: any;
  rowHeightStyle: (trackId: string) => React.CSSProperties;
  laneHeights: Record<string, number>;
  zoomV: number;
  tool: any;
  onTool: (tool: any) => void;
  isMobilePreview: boolean;
  laneResizeTrackId: string | null;
  beginLaneResize: (e: React.PointerEvent<any>, trackId: string) => void;
  onLaneResizePointerMove: (e: React.PointerEvent<any>) => void;
  endLaneResize: (e: React.PointerEvent<any>) => void;
  onLaneResizeDblClick: (e: React.MouseEvent<any>, trackId: string) => void;
  onAudioTrackHeaderClick: (e: React.MouseEvent<any>, trackId: string) => void;
  openAudioTrackContextMenu: (trackId: string, clientX: number, clientY: number) => void;
  heldZoom: boolean;
  audioLaneDropId: string | null;
  setAudioLaneDropId: React.Dispatch<React.SetStateAction<string | null>>;
  onUploadAudioToTrack: (trackId: string, file: File, opts?: any) => Promise<void>;
  openEmptyLaneContextMenu: (args: any) => void;
  beginMarquee: (e: React.PointerEvent<any>) => void;
  beginTouchCanvasNav: (e: React.PointerEvent<any>) => void;
  heldZoomRef: React.RefObject<boolean>;
  onFormaLanePointerDown: (e: React.PointerEvent<any>) => void;
  onMapLanePointerDown: (e: React.PointerEvent<any>, lane: any) => void;
  onFormaLanePointerMove: (e: React.PointerEvent<any>) => void;
  onFormaLanePointerUp: (e: React.PointerEvent<any>) => void;
  beginContentPencilDraw: (e: React.PointerEvent<any>, lane: any) => void;
  rawTicksAtClientX: (clientX: number) => number | null;
  commitDraft: (p: Project) => void;
  clearMapSelection: () => void;
  selectLaneClip: (lane: any, id: string) => void;
  laneImportTrackIdRef: React.RefObject<string | null>;
  laneImportStartTicksRef: React.RefObject<number | null>;
  laneAudioFileRef: React.RefObject<HTMLInputElement | null>;
  draftRef: React.RefObject<Project | null>;
  lanesRendererProps: any;

  closeInspectorPanel: () => void;
  clipSelection: any;
  selectionLane: any;
  songMetaOpen: boolean;
  openSongImportWizard: (asNew: boolean) => void;
  selectedMapLane: any;
  selectedMapIds: string[];
  primaryMapId: string | null;
  selectedTekstClip: any;
  selectedAkordClip: any;
  selectedCueClip: any;
  selectedAnchor: any;
  selectedAudioClip: any;
  selectedDockAudioTrack: any;
  selectedClip: any;
  selectedSubsectionRows: any;
  selectedSubsectionIdx: number | null;
  setSelectedSubsectionIdx: (idx: number | null) => void;
  onClipRename: (name: string) => void;
  onCountdownBarsChange: (raw: string) => void;
  audioUploadPending: boolean;
  displayTicks: number;
  projectId: string | null;
};

export function TimelineCanvasViewport({
  inspectorOpen,
  uiScale,
  effectiveZoomV,
  timelineSurface,
  draftProject,
  trackSelection,
  soloAudioTrackIds,
  soloBusIds,
  selectedBusId,
  selectedHwOutputId,
  trackRename,
  busRename,
  buildChannelStripCallbacks,
  buildBusCallbacks,
  buildMasterStripCallbacks,
  onMetronomeToggle,
  metronomeOn,
  playing,
  onAddAudioTrack,
  onAddBus,
  onAddHwOut,
  onHwSelect,
  onHwContextMenu,
  onHwGainChange,
  onHwMuteToggle,
  onHwChannelModeChange,
  canvasScrollRef,
  canvasInnerWidth,
  dockWidthBase,
  markerOverlayRef,
  showMidiPlayhead,
  playheadPx,
  locatorPx,
  viewSpan,
  barTicks,
  effectiveLocatorTicks,
  locatorLabel,
  onLocatorPointerDown,
  onLocatorPointerMove,
  onLocatorPointerUp,
  eyeBtnRef,
  eyeOpen,
  eyeMenuId,
  setEyeOpen,
  touchTier,
  beginDockWidthResize,
  onDockWidthResizePointerMove,
  endDockWidthResize,
  effectiveZoomH,
  loopRange,
  loopOn,
  barMarks,
  rulerBeatMarks,
  bindTrackRowsRef,
  lanesCoordRef,
  marqueeBox,
  trackVisibility,
  rowHeightStyle,
  laneHeights,
  zoomV,
  tool,
  onTool,
  isMobilePreview,
  laneResizeTrackId,
  beginLaneResize,
  onLaneResizePointerMove,
  endLaneResize,
  onLaneResizeDblClick,
  onAudioTrackHeaderClick,
  openAudioTrackContextMenu,
  heldZoom,
  audioLaneDropId,
  setAudioLaneDropId,
  onUploadAudioToTrack,
  openEmptyLaneContextMenu,
  beginMarquee,
  beginTouchCanvasNav,
  heldZoomRef,
  onFormaLanePointerDown,
  onMapLanePointerDown,
  onFormaLanePointerMove,
  onFormaLanePointerUp,
  beginContentPencilDraw,
  rawTicksAtClientX,
  commitDraft,
  clearMapSelection,
  selectLaneClip,
  laneImportTrackIdRef,
  laneImportStartTicksRef,
  laneAudioFileRef,
  draftRef,
  lanesRendererProps,
  closeInspectorPanel,
  clipSelection,
  selectionLane,
  songMetaOpen,
  openSongImportWizard,
  selectedMapLane,
  selectedMapIds,
  primaryMapId,
  selectedTekstClip,
  selectedAkordClip,
  selectedCueClip,
  selectedAnchor,
  selectedAudioClip,
  selectedDockAudioTrack,
  selectedClip,
  selectedSubsectionRows,
  selectedSubsectionIdx,
  setSelectedSubsectionIdx,
  onClipRename,
  onCountdownBarsChange,
  audioUploadPending,
  displayTicks,
  projectId,
}: TimelineCanvasViewportProps) {
  return (
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
            buildMasterStripCallbacks={buildMasterStripCallbacks}
            onMetronomeToggle={onMetronomeToggle}
            metronomeOn={metronomeOn}
            playing={playing}
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
          clipSelectionItemsLength={clipSelection?.items?.length ?? 0}
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
  );
}
