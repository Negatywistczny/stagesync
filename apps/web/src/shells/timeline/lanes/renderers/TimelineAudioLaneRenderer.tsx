import React from "react";
import type { AudioClip, AudioTrack, FormaClip, Project } from "@stagesync/shared";
import {
  audioTrackIdFromLane,
  type AudioLaneId,
} from "@lib/timeline/timelineTracks.js";
import { clipStylePx } from "@lib/timeline-edit/formaCanvas.js";
import { peaksToPolylinePoints } from "@lib/audio/waveformPeaks.js";
import { resolveTrackColor } from "@stagesync/shared";
import {
  isClipSelected,
  type ClipSelection,
  type ClipSelectionLane,
} from "@lib/timeline/timelineSelection.js";
import { isAudioAssetDecodeFailed } from "@lib/audio/audioPlayback.js";
import type { ClipMenuLane } from "@lib/timeline/timelineContextMenus.js";
import styles from "../../TimelineShell.module.css";

export type TimelineAudioLaneRendererProps = {
  lane: AudioLaneId;
  draftProject: Project;
  projectId?: string;
  failedAudioAssetIds: string[];
  gestureSession: {
    kind?: string;
    lane?: string;
    moveIds?: string[];
    clipId?: string | null;
    originClipStart?: number;
    optionCopy?: boolean;
  } | null;
  gesturePreview: {
    kind?: string;
    clipId?: string | null;
    startTicks: number;
    lengthTicks: number;
    targetLane?: string;
  } | null;
  clipSelection: ClipSelection;
  viewSpan: { start: number; end: number };
  barTicks: number;
  effectiveZoomH: number;
  openClipContextMenu: (args: {
    clientX: number;
    clientY: number;
    lane: ClipMenuLane;
    clipId: string;
    clipMuted?: boolean;
    canSplit: boolean;
    canDelete?: boolean;
    selectionLane: ClipSelectionLane;
  }) => void;
  onAudioClipPointerDown: (
    e: React.PointerEvent<HTMLButtonElement>,
    lane: AudioLaneId,
    clip: AudioClip,
  ) => void;
  onFormaClipPointerMove: (e: React.PointerEvent<any>) => void;
  onFormaClipPointerUp: (e: React.PointerEvent<any>) => void;
};

export function TimelineAudioLaneRenderer({
  lane,
  draftProject,
  projectId,
  failedAudioAssetIds,
  gestureSession,
  gesturePreview,
  clipSelection,
  viewSpan,
  barTicks,
  effectiveZoomH,
  openClipContextMenu,
  onAudioClipPointerDown,
  onFormaClipPointerMove,
  onFormaClipPointerUp,
}: TimelineAudioLaneRendererProps): React.ReactNode {
  const trackUuid = audioTrackIdFromLane(lane);
  const clips = draftProject.audioClips.filter((c) => c.trackId === trackUuid);
  const assetById = new Map(draftProject.assets.map((a) => [a.id, a]));
  const trackColor = resolveTrackColor(
    draftProject.audioTracks.find((t: AudioTrack) => t.id === trackUuid)?.color,
  );

  const isAudioMoving =
    gestureSession?.kind === "move" &&
    (gestureSession.lane ?? "").startsWith("audio-");
  const sourceAudioLane = isAudioMoving
    ? (gestureSession!.lane as AudioLaneId)
    : null;
  const targetAudioLane = isAudioMoving
    ? ((gesturePreview?.targetLane as AudioLaneId | undefined) ??
      sourceAudioLane)
    : null;
  const moveIds = isAudioMoving
    ? gestureSession!.moveIds?.length
      ? gestureSession!.moveIds
      : gestureSession!.clipId
        ? [gestureSession!.clipId]
        : []
    : [];
  const moveDelta =
    gesturePreview && isAudioMoving && gestureSession?.originClipStart != null
      ? gesturePreview.startTicks - gestureSession.originClipStart
      : 0;

  const isTargetLane =
    isAudioMoving &&
    targetAudioLane === lane &&
    targetAudioLane !== sourceAudioLane;
  const ghostClips = isTargetLane
    ? moveIds
        .map((id: string) => draftProject.audioClips.find((c) => c.id === id))
        .filter((c: AudioClip | undefined): c is AudioClip => Boolean(c))
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

      {ghostClips.map((ghostClip: AudioClip) => {
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
            className={[styles.clip, styles.audioClip, styles.formaClipDim].join(
              " ",
            )}
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
