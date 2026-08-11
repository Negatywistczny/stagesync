import React from "react";
import type { AudioTrack, FormaClip, Project } from "@stagesync/shared";
import {
  isAudioLaneId,
  audioTrackIdFromLane,
  type AudioLaneId,
} from "@lib/timeline/timelineTracks.js";
import type { ContentLaneId } from "@lib/timeline-edit/contentLaneEdit.js";
import {
  clipStylePx,
  tickToPx,
} from "@lib/timeline-edit/formaCanvas.js";
import {
  peaksToPolylinePoints,
} from "@lib/audio/waveformPeaks.js";
import {
  resolveTrackColor,
} from "@stagesync/shared";
import {
  type MapLaneId,
} from "@lib/timeline/mapLaneEdit.js";
import {
  segmentStylePx,
} from "@lib/timeline/mapSegments.js";
import {
  isClipSelected,
  type ClipSelection,
} from "@lib/timeline/timelineSelection.js";
import {
  isAudioAssetDecodeFailed,
} from "@lib/audio/audioPlayback.js";
import {
  toolAllowsClipHitZones,
  toolIsPencilDraw,
} from "@lib/timeline/timelineGesture.js";
import {
  anchorBarWidthTicks,
  canEditKotwice,
  scoreAnchors,
  ticksFromLogicBar,
  deleteScoreAnchor,
  moveScoreAnchor,
} from "@lib/timeline-edit/scoreBarEdit.js";
import { mapSegmentSelectionAriaLabel } from "@lib/timeline/timelineContextMenus.js";
import { defaultPencilLabel } from "@lib/timeline-edit/contentLaneEdit.js";
import type { ToolId } from "../../timelineToolsData.js";
import { FormaClipPreview } from "../../FormaClipPreview.js";
import { FormaClipButton } from "../../components/FormaClipButton.js";
import styles from "../../TimelineShell.module.css";

export type TimelineLanesRendererProps = {
  trackId: string;
  draftProject: Project | null;
  projectId?: string;
  failedAudioAssetIds: string[];
  gestureSession: any;
  gesturePreview: any;
  clipSelection: ClipSelection;
  primaryId: string | null;
  selectedSubsectionIdx: number | null;
  selectedAnchorId: string | null;
  selectedMapLane: MapLaneId | null;
  selectedMapIds: string[];
  mapDragPreview: { lane: MapLaneId; moveIds: string[]; deltaTicks: number } | null;
  tempoSegments: any[];
  meterSegments: any[];
  keySegments: any[];
  viewSpan: { start: number; end: number };
  barTicks: number;
  effectiveZoomH: number;
  tool: ToolId;
  tapActiveClipId: string | null;
  commitDraft: (p: Project) => void;
  clearClipSelection: () => void;
  clearMapSelection: () => void;
  setSelectedAnchorId: (id: string | null) => void;
  setInspectorVisible: (v: boolean) => void;
  setSongMetaOpen: (v: boolean) => void;
  setMapSelection: (lane: MapLaneId, ids: string[], primaryId: string | null) => void;
  openMapEdit: (lane: MapLaneId, ticks: number) => void;
  openClipContextMenu: (args: any) => void;
  selectLaneClip: (lane: any, id: string) => void;
  focusInspectorPanel: () => void;
  rawTicksAtClientX: (clientX: number) => number | null;
  onAudioClipPointerDown: (e: React.PointerEvent<any>, lane: AudioLaneId, clip: any) => void;
  onFormaClipPointerDown: (e: React.PointerEvent<any>, clip: any) => void;
  onContentClipPointerDown: (e: React.PointerEvent<any>, lane: ContentLaneId, clip: any) => void;
  onFormaClipPointerMove: (e: React.PointerEvent<any>) => void;
  onFormaClipPointerUp: (e: React.PointerEvent<any>) => void;
  onMapSegmentPointerDown: (e: React.PointerEvent<any>, lane: MapLaneId, seg: any) => void;
  onMapSegmentPointerMove: (e: React.PointerEvent<any>) => void;
  onMapSegmentPointerUp: (e: React.PointerEvent<any>) => void;
};

export function renderLaneContent({
  trackId,
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
}: TimelineLanesRendererProps): React.ReactNode {
  if (!draftProject) return null;

  if (isAudioLaneId(trackId)) {
    const lane = trackId as AudioLaneId;
    const trackUuid = audioTrackIdFromLane(lane);
    const clips = draftProject.audioClips.filter((c) => c.trackId === trackUuid);
    const assetById = new Map(draftProject.assets.map((a) => [a.id, a]));
    const trackColor = resolveTrackColor(
      draftProject.audioTracks.find((t: AudioTrack) => t.id === trackUuid)?.color,
    );

    const isAudioMoving =
      gestureSession?.kind === "move" &&
      isAudioLaneId(gestureSession.lane ?? "");
    const sourceAudioLane = isAudioMoving
      ? (gestureSession!.lane as AudioLaneId)
      : null;
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

    const isTargetLane =
      isAudioMoving &&
      targetAudioLane === lane &&
      targetAudioLane !== sourceAudioLane;
    const ghostClips = isTargetLane
      ? moveIds
          .map((id: string) => draftProject.audioClips.find((c) => c.id === id))
          .filter((c: any): c is NonNullable<typeof c> => Boolean(c))
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
          const style = clipStylePx(
            styleClip,
            viewSpan,
            barTicks,
            effectiveZoomH,
          );
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

        {ghostClips.map((ghostClip: any) => {
          if (!ghostClip) return null;
          const asset = assetById.get(ghostClip.assetId);
          const styleClip: FormaClip = {
            id: `ghost-${ghostClip.id}`,
            name: asset?.originalName ?? "Audio",
            kind: "section",
            startTicks: ghostClip.startTicks + moveDelta,
            lengthTicks: ghostClip.lengthTicks,
          };
          const style = clipStylePx(
            styleClip,
            viewSpan,
            barTicks,
            effectiveZoomH,
          );
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
    mapDragPreview?.moveIds.includes(eventId) ? styles.mapSegmentDragging : "";
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
      return (keySegments.length > 0 ? keySegments : []).map((seg, i) => (
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
              if (!toolAllowsClipHitZones(tool) && tool !== "pointer") {
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
                ? gesturePreview.startTicks - gestureSession!.originClipStart
                : 0;
            const optionCopyGhost =
              Boolean(gestureSession?.optionCopy) && moveDelta !== 0;
            const previewing =
              !optionCopyGhost &&
              gesturePreview &&
              ((gestureSession?.kind === "move" && moveIds.includes(clip.id)) ||
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
                style={clipStylePx(
                  styleClip,
                  viewSpan,
                  barTicks,
                  effectiveZoomH,
                )}
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
            ? (gestureSession.moveIds?.length
                ? gestureSession.moveIds
                : gestureSession.clipId
                  ? [gestureSession.clipId]
                  : []
              ).map((id: string) => {
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
            const optionCopyGhost =
              Boolean(gestureSession?.optionCopy) && moveDelta !== 0;
            const previewing =
              !optionCopyGhost &&
              gesturePreview &&
              gestureSession?.lane === lane &&
              ((gestureSession.kind === "move" && moveIds.includes(clip.id)) ||
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
            const tapTarget = lane === "tekst" && tapActiveClipId === clip.id;
            return (
              <FormaClipButton
                key={clip.id}
                clip={styleClip}
                dataClipLane={lane}
                selected={
                  isClipSelected(clipSelection, clip.id, lane) || tapTarget
                }
                selectedSubsectionIdx={null}
                style={clipStylePx(
                  styleClip,
                  viewSpan,
                  barTicks,
                  effectiveZoomH,
                )}
                pencilActive={toolIsPencilDraw(tool)}
                allowHitZones={toolAllowsClipHitZones(tool)}
                dimmed={Boolean(previewing)}
                onPointerDown={(e) => onContentClipPointerDown(e, lane, clip)}
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
            ? (gestureSession.moveIds?.length
                ? gestureSession.moveIds
                : gestureSession.clipId
                  ? [gestureSession.clipId]
                  : []
              ).map((id: string) => {
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
