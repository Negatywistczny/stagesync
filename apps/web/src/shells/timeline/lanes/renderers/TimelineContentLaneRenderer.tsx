import React from "react";
import type { FormaClip, Project } from "@stagesync/shared";
import type { ContentLaneId } from "@lib/timeline-edit/contentLaneEdit.js";
import { clipStylePx } from "@lib/timeline-edit/formaCanvas.js";
import {
  isClipSelected,
  type ClipSelection,
  type ClipSelectionLane,
} from "@lib/timeline/timelineSelection.js";
import {
  toolAllowsClipHitZones,
  toolIsPencilDraw,
} from "@lib/timeline/timelineGesture.js";
import { defaultPencilLabel } from "@lib/timeline-edit/contentLaneEdit.js";
import type { ToolId } from "../../timelineToolsData.js";
import type { ClipMenuLane } from "@lib/timeline/timelineContextMenus.js";
import { FormaClipPreview } from "../../FormaClipPreview.js";
import { FormaClipButton } from "../../components/FormaClipButton.js";

export type TimelineContentLaneRendererProps = {
  trackId: "forma" | "tekst" | "akordy" | "cue";
  draftProject: Project;
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
    name?: string;
    subsections?: any;
  } | null;
  clipSelection: ClipSelection;
  primaryId: string | null;
  selectedSubsectionIdx: number | null;
  viewSpan: { start: number; end: number };
  barTicks: number;
  effectiveZoomH: number;
  tool: ToolId;
  tapActiveClipId: string | null;
  clearMapSelection: () => void;
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
  selectLaneClip: (lane: ContentLaneId | "forma", id: string) => void;
  focusInspectorPanel: () => void;
  onFormaClipPointerDown: (
    e: React.PointerEvent<HTMLButtonElement>,
    clip: FormaClip,
  ) => void;
  onContentClipPointerDown: (
    e: React.PointerEvent<HTMLButtonElement>,
    lane: ContentLaneId,
    clip: { id: string; startTicks: number; lengthTicks: number },
  ) => void;
  onFormaClipPointerMove: (e: React.PointerEvent<any>) => void;
  onFormaClipPointerUp: (e: React.PointerEvent<any>) => void;
};

export function TimelineContentLaneRenderer({
  trackId,
  draftProject,
  gestureSession,
  gesturePreview,
  clipSelection,
  primaryId,
  selectedSubsectionIdx,
  viewSpan,
  barTicks,
  effectiveZoomH,
  tool,
  tapActiveClipId,
  clearMapSelection,
  openClipContextMenu,
  selectLaneClip,
  focusInspectorPanel,
  onFormaClipPointerDown,
  onContentClipPointerDown,
  onFormaClipPointerMove,
  onFormaClipPointerUp,
}: TimelineContentLaneRendererProps): React.ReactNode {
  if (trackId === "forma") {
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
            gestureSession?.originClipStart != null &&
            moveIds.includes(clip.id)
              ? gesturePreview.startTicks - gestureSession.originClipStart
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
        gestureSession?.originClipStart != null &&
        (gestureSession.lane ?? "forma") === "forma"
          ? (gestureSession.moveIds?.length
              ? gestureSession.moveIds
              : gestureSession.clipId
                ? [gestureSession.clipId]
                : []
            ).map((id: string) => {
              const clip = draftProject.forma.clips.find((c) => c.id === id);
              if (!clip || gestureSession.originClipStart == null) return null;
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
  }

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
          gestureSession?.originClipStart != null &&
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
      gestureSession?.originClipStart != null &&
      gestureSession.lane === lane
        ? (gestureSession.moveIds?.length
            ? gestureSession.moveIds
            : gestureSession.clipId
              ? [gestureSession.clipId]
              : []
          ).map((id: string) => {
            const clip = clips.find((c) => c.id === id);
            if (!clip || gestureSession.originClipStart == null) return null;
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
