import React from "react";
import type { AudioClip, FormaClip, Project } from "@stagesync/shared";
import {
  isAudioLaneId,
  type AudioLaneId,
} from "@lib/timeline/timelineTracks.js";
import type { ContentLaneId } from "@lib/timeline-edit/contentLaneEdit.js";
import { type MapLaneId } from "@lib/timeline/mapLaneEdit.js";
import type {
  ClipSelection,
  ClipSelectionLane,
} from "@lib/timeline/timelineSelection.js";
import type { MapSegment } from "@lib/timeline/mapSegments.js";
import type { ToolId } from "../../timelineToolsData.js";
import type { ClipMenuLane } from "@lib/timeline/timelineContextMenus.js";
import { TimelineAudioLaneRenderer } from "./TimelineAudioLaneRenderer.js";
import { TimelineMapLaneRenderer } from "./TimelineMapLaneRenderer.js";
import { TimelineContentLaneRenderer } from "./TimelineContentLaneRenderer.js";

export type TimelineLanesRendererProps = {
  trackId: string;
  draftProject: Project | null;
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
    name?: string;
    targetLane?: string;
    subsections?: any;
  } | null;
  clipSelection: ClipSelection;
  primaryId: string | null;
  selectedSubsectionIdx: number | null;
  selectedAnchorId: string | null;
  selectedMapLane: MapLaneId | null;
  selectedMapIds: string[];
  mapDragPreview: {
    lane: MapLaneId;
    moveIds: string[];
    deltaTicks: number;
  } | null;
  tempoSegments: MapSegment[];
  meterSegments: MapSegment[];
  keySegments: MapSegment[];
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
  setMapSelection: (
    lane: MapLaneId,
    ids: string[],
    primaryId: string | null,
  ) => void;
  openMapEdit: (lane: MapLaneId, ticks: number) => void;
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
  rawTicksAtClientX: (clientX: number) => number | null;
  onAudioClipPointerDown: (
    e: React.PointerEvent<HTMLButtonElement>,
    lane: AudioLaneId,
    clip: AudioClip,
  ) => void;
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
  onMapSegmentPointerDown: (
    e: React.PointerEvent<HTMLButtonElement>,
    lane: MapLaneId,
    seg: MapSegment,
  ) => void;
  onMapSegmentPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onMapSegmentPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
};

export function renderLaneContent(
  props: TimelineLanesRendererProps,
): React.ReactNode {
  const { trackId, draftProject } = props;
  if (!draftProject) return null;

  if (isAudioLaneId(trackId)) {
    return (
      <TimelineAudioLaneRenderer
        lane={trackId as AudioLaneId}
        draftProject={draftProject}
        projectId={props.projectId}
        failedAudioAssetIds={props.failedAudioAssetIds}
        gestureSession={props.gestureSession}
        gesturePreview={props.gesturePreview}
        clipSelection={props.clipSelection}
        viewSpan={props.viewSpan}
        barTicks={props.barTicks}
        effectiveZoomH={props.effectiveZoomH}
        openClipContextMenu={props.openClipContextMenu}
        onAudioClipPointerDown={props.onAudioClipPointerDown}
        onFormaClipPointerMove={props.onFormaClipPointerMove}
        onFormaClipPointerUp={props.onFormaClipPointerUp}
      />
    );
  }

  if (
    trackId === "tempo" ||
    trackId === "metrum" ||
    trackId === "tonacja" ||
    trackId === "kotwice"
  ) {
    return (
      <TimelineMapLaneRenderer
        trackId={trackId}
        draftProject={draftProject}
        selectedMapLane={props.selectedMapLane}
        selectedMapIds={props.selectedMapIds}
        mapDragPreview={props.mapDragPreview}
        tempoSegments={props.tempoSegments}
        meterSegments={props.meterSegments}
        keySegments={props.keySegments}
        selectedAnchorId={props.selectedAnchorId}
        viewSpan={props.viewSpan}
        barTicks={props.barTicks}
        effectiveZoomH={props.effectiveZoomH}
        tool={props.tool}
        commitDraft={props.commitDraft}
        clearClipSelection={props.clearClipSelection}
        clearMapSelection={props.clearMapSelection}
        setSelectedAnchorId={props.setSelectedAnchorId}
        setInspectorVisible={props.setInspectorVisible}
        setSongMetaOpen={props.setSongMetaOpen}
        setMapSelection={props.setMapSelection}
        openMapEdit={props.openMapEdit}
        rawTicksAtClientX={props.rawTicksAtClientX}
        onMapSegmentPointerDown={props.onMapSegmentPointerDown}
        onMapSegmentPointerMove={props.onMapSegmentPointerMove}
        onMapSegmentPointerUp={props.onMapSegmentPointerUp}
      />
    );
  }

  if (
    trackId === "forma" ||
    trackId === "tekst" ||
    trackId === "akordy" ||
    trackId === "cue"
  ) {
    return (
      <TimelineContentLaneRenderer
        trackId={trackId}
        draftProject={draftProject}
        gestureSession={props.gestureSession}
        gesturePreview={props.gesturePreview}
        clipSelection={props.clipSelection}
        primaryId={props.primaryId}
        selectedSubsectionIdx={props.selectedSubsectionIdx}
        viewSpan={props.viewSpan}
        barTicks={props.barTicks}
        effectiveZoomH={props.effectiveZoomH}
        tool={props.tool}
        tapActiveClipId={props.tapActiveClipId}
        clearMapSelection={props.clearMapSelection}
        openClipContextMenu={props.openClipContextMenu}
        selectLaneClip={props.selectLaneClip}
        focusInspectorPanel={props.focusInspectorPanel}
        onFormaClipPointerDown={props.onFormaClipPointerDown}
        onContentClipPointerDown={props.onContentClipPointerDown}
        onFormaClipPointerMove={props.onFormaClipPointerMove}
        onFormaClipPointerUp={props.onFormaClipPointerUp}
      />
    );
  }

  return null;
}
