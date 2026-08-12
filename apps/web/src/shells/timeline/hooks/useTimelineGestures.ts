import React from "react";
import type { Project } from "@stagesync/shared";
import type {
  ClipSelection,
  ClipSelectionLane,
} from "@lib/timeline/timelineSelection.js";
import type { MapLaneId } from "@lib/timeline/mapLaneEdit.js";
import type { ToolId } from "../timelineToolsData.js";
import { useTimelineRulerGestures } from "./useTimelineRulerGestures.js";
import { useTimelineMarquee } from "./useTimelineMarquee.js";
import { useTimelineFormaGestures } from "./useTimelineFormaGestures.js";
import { useTimelineMapPointerHandlers } from "./useTimelineMapPointerHandlers.js";
import { useTimelineKeyboardEvents } from "./useTimelineKeyboardEvents.js";
import type { TimelineKeyHandlers } from "./useTimelineShortcuts.js";

interface UseTimelineGesturesParams {
  draftRef: React.RefObject<Project | null>;
  draftProject: Project | null;
  commitDraft: (p: Project) => void;
  state: any;
  locatorTicks: number;
  seek: (ticks: number) => Promise<void>;
  setLoop: (body: {
    enabled: boolean;
    startTicks?: number;
    endTicks?: number;
  }) => Promise<void>;
  setLocatorTicks: React.Dispatch<React.SetStateAction<number>>;
  markerOverlayRef: React.RefObject<HTMLDivElement | null>;
  lanesCoordRef: React.RefObject<HTMLDivElement | null>;
  canvasScrollRef: React.RefObject<HTMLDivElement | null>;
  viewSpanRef: React.RefObject<{ start: number; end: number }>;
  barTicksRef: React.RefObject<number>;
  zoomHRef: React.RefObject<number>;
  zoomHBaseRef: React.RefObject<number>;
  setZoomH: React.Dispatch<React.SetStateAction<number>>;
  fitZoom: () => void;
  rawTicksAtClientX: (clientX: number) => number | null;
  toolRef: React.RefObject<ToolId>;
  tool: ToolId;
  gesturePolicy: any;
  setTouchAlertOpen: React.Dispatch<React.SetStateAction<boolean>>;
  clipSelection: ClipSelection;
  setClipSelection: React.Dispatch<React.SetStateAction<ClipSelection>>;
  clearClipSelection: () => void;
  selectLaneClip: (lane: ClipSelectionLane, id: string) => void;
  selectedClipId: string | null;
  clearMapSelection: () => void;
  setSelectedAnchorId: (id: string | null) => void;
  setSongMetaOpen: (open: boolean) => void;
  setSelectedSubsectionIdx: (idx: number | null) => void;
  deleteSelectedFormaClip: () => void;
  effectiveZoomH: number;
  soloAudioTrackIds: string[];
  setSoloAudioTrackIds: React.Dispatch<React.SetStateAction<string[]>>;
  soloHoldRef: React.MutableRefObject<string[] | null>;
  setCanvasNotice: (msg: string | null) => void;
  canvasNoticeTimerRef: React.MutableRefObject<ReturnType<
    typeof setTimeout
  > | null>;
  selectedMapLane: MapLaneId | null;
  selectedMapIds: string[];
  primaryMapId: string | null;
  setMapSelection: (
    lane: MapLaneId,
    ids: string[],
    primaryId: string | null,
  ) => void;
  setPrimaryMapId: (id: string | null) => void;
  openMapEdit: (lane: MapLaneId, ticks: number) => void;
  keyHandlersRef: React.RefObject<TimelineKeyHandlers>;
  openPreferences: (tab?: any) => void;
  setHelpOpen: React.Dispatch<React.SetStateAction<boolean>>;
  projectId?: string;
}

export function useTimelineGestures({
  draftRef,
  draftProject,
  commitDraft,
  state,
  locatorTicks,
  seek,
  setLoop,
  setLocatorTicks,
  markerOverlayRef,
  lanesCoordRef,
  canvasScrollRef,
  viewSpanRef,
  barTicksRef,
  zoomHRef,
  zoomHBaseRef,
  setZoomH,
  fitZoom,
  rawTicksAtClientX,
  toolRef,
  tool,
  gesturePolicy,
  setTouchAlertOpen,
  clipSelection,
  setClipSelection,
  clearClipSelection,
  selectLaneClip,
  selectedClipId,
  clearMapSelection,
  setSelectedAnchorId,
  setSongMetaOpen,
  setSelectedSubsectionIdx,
  deleteSelectedFormaClip,
  effectiveZoomH,
  soloAudioTrackIds,
  setSoloAudioTrackIds,
  soloHoldRef,
  setCanvasNotice,
  canvasNoticeTimerRef,
  selectedMapLane,
  selectedMapIds,
  primaryMapId,
  setMapSelection,
  setPrimaryMapId,
  openMapEdit,
  keyHandlersRef,
  openPreferences,
  setHelpOpen,
  projectId,
}: UseTimelineGesturesParams) {
  const { heldZoom, heldZoomRef } = useTimelineKeyboardEvents({
    keyHandlersRef,
    deleteSelectedFormaClip,
    openPreferences,
    setHelpOpen,
    projectId,
    draftProject,
  });

  const ruler = useTimelineRulerGestures({
    draftRef,
    draftProject,
    state,
    locatorTicks,
    seek,
    setLoop,
    setLocatorTicks,
    markerOverlayRef,
    lanesCoordRef,
    viewSpanRef,
    barTicksRef,
    zoomHRef,
    rawTicksAtClientX,
  });

  const marquee = useTimelineMarquee({
    toolRef,
    heldZoomRef,
    lanesCoordRef,
    canvasScrollRef,
    zoomHBaseRef,
    setZoomH,
    fitZoom,
    clearClipSelection,
    clearMapSelection,
    setSelectedAnchorId,
    setSongMetaOpen,
    setSelectedSubsectionIdx,
    setClipSelection,
    setLocatorFromClientX: ruler.setLocatorFromClientX,
  });

  const formaGestures = useTimelineFormaGestures({
    draftRef,
    draftProject,
    commitDraft,
    rawTicksAtClientX,
    tool,
    gesturePolicy,
    setTouchAlertOpen,
    clipSelection,
    setClipSelection,
    clearClipSelection,
    selectLaneClip,
    selectedClipId,
    clearMapSelection,
    setSelectedAnchorId,
    setSongMetaOpen,
    setSelectedSubsectionIdx,
    deleteSelectedFormaClip,
    beginMarquee: marquee.beginMarquee,
    beginTouchCanvasNav: marquee.beginTouchCanvasNav,
    heldZoomRef,
    zoomHRef,
    effectiveZoomH,
    soloAudioTrackIds,
    setSoloAudioTrackIds,
    soloHoldRef,
    setCanvasNotice,
    canvasNoticeTimerRef,
  });

  const mapPointer = useTimelineMapPointerHandlers({
    draftRef,
    draftProject,
    commitDraft,
    rawTicksAtClientX,
    tool,
    heldZoomRef,
    gesturePolicy,
    setTouchAlertOpen,
    selectedMapLane,
    selectedMapIds,
    primaryMapId,
    setMapSelection,
    setPrimaryMapId,
    clearMapSelection,
    openMapEdit,
    beginTouchCanvasNav: marquee.beginTouchCanvasNav,
  });

  return {
    heldZoom,
    heldZoomRef,
    ...ruler,
    ...marquee,
    ...formaGestures,
    ...mapPointer,
  };
}
