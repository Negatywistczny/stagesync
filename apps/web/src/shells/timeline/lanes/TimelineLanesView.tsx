/* eslint-disable @typescript-eslint/no-explicit-any, max-lines */
import React, { type RefObject } from "react";
import type { Project } from "@stagesync/shared";
import {
  buildTrackList,
  isTrackVisible,
  isAudioLaneId,
  type TrackVisibilityMap,
} from "@lib/timeline/timelineTracks.js";
import { MAX_AUDIO_TRACKS } from "@lib/audio/audioLaneEdit.js";
import { isMapLaneId, type MapLaneId } from "@lib/timeline/mapLaneEdit.js";
import type { ContentLaneId } from "@lib/timeline-edit/contentLaneEdit.js";
import {
  toolIsPencilDraw,
  toolUsesMarqueeGesture,
  cursorForTimelineTool,
  isTouchPointerType,
} from "@lib/timeline/timelineGesture.js";
import { tickToPx } from "@lib/timeline-edit/formaCanvas.js";
import type { ToolId } from "../timelineToolsData.js";
import type { TrackSelection } from "@lib/timeline/timelineSelection.js";
import { TimelineRulerView } from "./TimelineRulerView.js";
import { TimelineTrackRowDock } from "../dock/TimelineTrackRowDock.js";
import {
  renderLaneContent,
  type TimelineLanesRendererProps,
} from "./renderers/TimelineLanesRenderer.js";
import { createLanePointerDownHandler } from "./useTimelineLanePointerHandlers.js";
import styles from "../TimelineShell.module.css";

export type TimelineLanesViewProps = {
  canvasScrollRef: RefObject<HTMLDivElement | null>;
  canvasInnerWidth: string;
  dockWidthBase: number;
  markerOverlayRef: RefObject<HTMLDivElement | null>;
  showMidiPlayhead: boolean;
  playheadPx: number;
  locatorPx: number;
  viewSpan: { start: number; end: number };
  barTicks: number;
  effectiveLocatorTicks: number;
  locatorLabel: string;
  onLocatorPointerDown: (
    e: React.PointerEvent<any>,
    target: "locator" | "ruler-loop" | "ruler-beat",
  ) => void;
  onLocatorPointerMove: (e: React.PointerEvent<any>) => void;
  onLocatorPointerUp: (e: React.PointerEvent<any>) => void;
  eyeBtnRef: RefObject<HTMLButtonElement | null>;
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
  lanesCoordRef: RefObject<HTMLDivElement | null>;
  marqueeBox: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  draftProject: Project | null;
  trackVisibility: TrackVisibilityMap;
  rowHeightStyle: (trackId: string) => React.CSSProperties;
  trackSelection: TrackSelection;
  soloAudioTrackIds: string[];
  trackRename: { trackId: string; name: string } | null;
  buildChannelStripCallbacks: (trackId: string) => any;
  laneHeights: Record<string, number>;
  zoomV: number;
  uiScale: number;
  tool: ToolId;
  onTool: (tool: ToolId) => void;
  isMobilePreview: boolean;
  laneResizeTrackId: string | null;
  beginLaneResize: (e: React.PointerEvent<any>, trackId: string) => void;
  onLaneResizePointerMove: (e: React.PointerEvent<any>) => void;
  endLaneResize: (e: React.PointerEvent<any>) => void;
  onLaneResizeDblClick: (e: React.MouseEvent<any>, trackId: string) => void;
  onAudioTrackHeaderClick: (e: React.MouseEvent<any>, trackId: string) => void;
  openAudioTrackContextMenu: (
    trackId: string,
    clientX: number,
    clientY: number,
  ) => void;
  heldZoom: boolean;
  audioLaneDropId: string | null;
  setAudioLaneDropId: (
    id: string | null | ((prev: string | null) => string | null),
  ) => void;
  onUploadAudioToTrack: (audioTrackId: string, file: File) => Promise<void>;
  openEmptyLaneContextMenu: (args: any) => void;
  beginMarquee: (e: React.PointerEvent<any>) => void;
  beginTouchCanvasNav: (e: React.PointerEvent<any>) => void;
  heldZoomRef: RefObject<boolean>;
  onAddAudioTrack: () => void;
  onFormaLanePointerDown: (e: React.PointerEvent<any>) => void;
  onMapLanePointerDown: (e: React.PointerEvent<any>, lane: MapLaneId) => void;
  onFormaLanePointerMove: (e: React.PointerEvent<any>) => void;
  onFormaLanePointerUp: (e: React.PointerEvent<any>) => void;
  beginContentPencilDraw: (
    e: React.PointerEvent<any>,
    lane: ContentLaneId,
  ) => void;
  rawTicksAtClientX: (clientX: number) => number | null;
  commitDraft: (p: Project) => void;
  clearMapSelection: () => void;
  selectLaneClip: (lane: any, id: string) => void;
  laneImportTrackIdRef?: RefObject<string | null>;
  laneImportStartTicksRef?: RefObject<number | null>;
  laneAudioFileRef?: RefObject<HTMLInputElement | null>;
  draftRef: RefObject<Project | null>;
  lanesRendererProps: Omit<TimelineLanesRendererProps, "trackId">;
};

export function TimelineLanesView(props: TimelineLanesViewProps) {
  const {
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
    draftProject,
    trackVisibility,
    rowHeightStyle,
    trackSelection,
    soloAudioTrackIds,
    trackRename,
    buildChannelStripCallbacks,
    laneHeights,
    zoomV,
    uiScale,
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
    onAddAudioTrack,
    onFormaLanePointerMove,
    onFormaLanePointerUp,
    lanesRendererProps,
  } = props;

  return (
    <div
      ref={canvasScrollRef}
      className={styles.canvasScroll}
      data-canvas-scroll
    >
      <div
        className={styles.canvasInner}
        style={{
          width: canvasInnerWidth,
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

          <TimelineRulerView
            eyeBtnRef={eyeBtnRef}
            eyeOpen={eyeOpen}
            eyeMenuId={eyeMenuId}
            setEyeOpen={setEyeOpen}
            touchTier={touchTier}
            beginDockWidthResize={beginDockWidthResize}
            onDockWidthResizePointerMove={onDockWidthResizePointerMove}
            endDockWidthResize={endDockWidthResize}
            viewSpan={viewSpan}
            barTicks={barTicks}
            effectiveZoomH={effectiveZoomH}
            loopRange={loopRange}
            loopOn={loopOn}
            barMarks={barMarks}
            rulerBeatMarks={rulerBeatMarks}
            onLocatorPointerDown={onLocatorPointerDown}
            onLocatorPointerMove={onLocatorPointerMove}
            onLocatorPointerUp={onLocatorPointerUp}
          />

          <div className={styles.trackRows} ref={bindTrackRowsRef}>
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
              .map((track) => {
                const onPointerDown = createLanePointerDownHandler(
                  track,
                  props,
                );
                return (
                  <div
                    key={track.id}
                    className={styles.trackRow}
                    style={rowHeightStyle(track.id)}
                    data-track={track.id}
                  >
                    <TimelineTrackRowDock
                      track={track}
                      draftProject={draftProject}
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
                      touchTier={touchTier}
                      laneResizeTrackId={laneResizeTrackId}
                      beginLaneResize={beginLaneResize}
                      onLaneResizePointerMove={onLaneResizePointerMove}
                      endLaneResize={endLaneResize}
                      onLaneResizeDblClick={onLaneResizeDblClick}
                      onAudioTrackHeaderClick={onAudioTrackHeaderClick}
                      openAudioTrackContextMenu={openAudioTrackContextMenu}
                    />

                    <div
                      data-audio-lane={
                        isAudioLaneId(track.id) ? track.id : undefined
                      }
                      onPointerDown={onPointerDown}
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
                        cursor: cursorForTimelineTool(heldZoom ? "zoom" : tool),
                      }}
                      data-track={track.id}
                      onContextMenu={(e) => {
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
                                e.currentTarget.contains(
                                  e.relatedTarget as Node,
                                )
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
                      {renderLaneContent({
                        ...lanesRendererProps,
                        trackId: track.id,
                      })}
                    </div>
                  </div>
                );
              })}
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
  );
}
