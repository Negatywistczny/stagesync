import { useLayoutEffect, useMemo, useRef } from "react";
import {
  ticksPerBar,
  ticksToBbt,
  toDisplayBar,
  resolveMeterAt,
  formatKeySignature,
  type Project,
  type TransportLoop,
} from "@stagesync/shared";
import {
  buildBarMarks,
  buildRulerBeatMarks,
  computeCanvasWidthPx,
  computeFormaViewSpan,
  scrollCanvasToStart,
  tickToPx,
} from "@lib/timeline-edit/formaCanvas.js";
import {
  vocalTapMarkTicks,
  vocalTapQueue,
} from "@lib/client/clientVocalTap.js";
import {
  usableLoopRange,
  type LoopRange,
} from "@lib/timeline/timelineLocator.js";
import {
  keyMapSegments,
  meterMapSegments,
  tempoMapSegments,
} from "@lib/timeline/mapSegments.js";
import { type MapLaneId } from "@lib/timeline/mapLaneEdit.js";
import type {
  FormaGesturePreview,
  FormaGestureSession,
} from "@lib/timeline/timelineGesture.js";
import type { ToolId } from "../timelineToolsData.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MapDragPreview {
  lane: MapLaneId;
  moveIds: string[];
  deltaTicks: number;
}

interface Params {
  draftProject: Project | null;
  gesturePreview: FormaGesturePreview | null;
  gestureSessionRef: React.RefObject<FormaGestureSession | null>;
  effectiveZoomH: number;
  displayTicks: number;
  locatorTicks: number;
  tool: ToolId;
  tapLineIndex: number;
  state: {
    playing: boolean;
    timeSignature: { numerator: number; denominator: number };
    ppq: number;
    loop?: TransportLoop | null;
  };
  loopDraft: LoopRange | null;
  mapDragPreview: MapDragPreview | null;
  viewSpanRef: React.MutableRefObject<{ start: number; end: number }>;
  barTicksRef: React.MutableRefObject<number>;
  effectiveLocatorTicksRef: React.MutableRefObject<number>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTimelineCanvasDerived({
  draftProject,
  gesturePreview,
  gestureSessionRef,
  effectiveZoomH,
  displayTicks,
  locatorTicks,
  tool,
  tapLineIndex,
  state,
  loopDraft,
  mapDragPreview,
  viewSpanRef,
  barTicksRef,
  effectiveLocatorTicksRef,
}: Params) {
  const cdSpanStartRef = useRef<number | null>(null);
  const cdScrollToStartPendingRef = useRef(false);

  // --- View span ----------------------------------------------------------

  const viewSpan = useMemo(() => {
    const clips = draftProject?.forma.clips ?? [];
    if (gesturePreview?.kind === "countdown-length" && gesturePreview.clipId) {
      return computeFormaViewSpan(
        clips.map((c) =>
          c.id === gesturePreview.clipId
            ? {
                ...c,
                startTicks: gesturePreview.startTicks,
                lengthTicks: gesturePreview.lengthTicks,
              }
            : c,
        ),
      );
    }
    return computeFormaViewSpan(clips);
  }, [draftProject?.forma.clips, gesturePreview]);

  // --- Bar ticks ----------------------------------------------------------

  const barTicks = draftProject
    ? ticksPerBar(draftProject.defaultMeter, draftProject.ppq)
    : ticksPerBar({ numerator: 4, denominator: 4 }, 960);

  viewSpanRef.current = viewSpan;
  barTicksRef.current = barTicks;

  // --- Countdown length drag scroll --------------------------------------

  useLayoutEffect(() => {
    const cdGesture =
      gestureSessionRef.current?.kind === "countdown-length" ||
      gesturePreview?.kind === "countdown-length";
    if (cdGesture) {
      cdScrollToStartPendingRef.current = true;
      cdSpanStartRef.current = viewSpan.start;
      scrollCanvasToStart(
        document.querySelector("[data-canvas-scroll]") as HTMLElement | null,
      );
      return;
    }
    if (cdSpanStartRef.current != null || cdScrollToStartPendingRef.current) {
      cdSpanStartRef.current = null;
      if (cdScrollToStartPendingRef.current) {
        cdScrollToStartPendingRef.current = false;
        scrollCanvasToStart(
          document.querySelector("[data-canvas-scroll]") as HTMLElement | null,
        );
      }
    }
  }, [
    viewSpan.start,
    gesturePreview?.kind,
    barTicks,
    effectiveZoomH,
    gestureSessionRef,
  ]);

  // --- Canvas width -------------------------------------------------------

  const canvasWidthPx = useMemo(
    () => computeCanvasWidthPx(viewSpan, barTicks, effectiveZoomH),
    [viewSpan, barTicks, effectiveZoomH],
  );

  // --- Bar / beat marks ---------------------------------------------------

  const barMarks = useMemo(() => {
    if (!draftProject) return [];
    return buildBarMarks(viewSpan, draftProject);
  }, [draftProject, viewSpan]);

  const rulerBeatMarks = useMemo(() => {
    if (!draftProject) return [];
    return buildRulerBeatMarks(viewSpan, draftProject, effectiveZoomH);
  }, [draftProject, viewSpan, effectiveZoomH]);

  // --- Playhead -----------------------------------------------------------

  const playheadPx = tickToPx(displayTicks, viewSpan, barTicks, effectiveZoomH);

  // --- Locator derived values ---------------------------------------------

  const effectiveLocatorTicks = vocalTapMarkTicks(
    state.playing,
    displayTicks,
    locatorTicks,
  );
  effectiveLocatorTicksRef.current = effectiveLocatorTicks;

  const tapActiveClipId = useMemo(() => {
    if (tool !== "tap" || !draftProject) return null;
    const queue = vocalTapQueue(draftProject);
    if (queue.length === 0) return null;
    return queue[Math.min(tapLineIndex, queue.length - 1)]?.id ?? null;
  }, [tool, draftProject, tapLineIndex]);

  const locatorPx = tickToPx(
    effectiveLocatorTicks,
    viewSpan,
    barTicks,
    effectiveZoomH,
  );
  const locatorMeter = draftProject
    ? resolveMeterAt(draftProject, effectiveLocatorTicks)
    : state.timeSignature;
  const locatorBbt = ticksToBbt(
    effectiveLocatorTicks,
    locatorMeter,
    draftProject?.ppq ?? state.ppq,
  );
  const locatorLabel = `${toDisplayBar(locatorBbt.bar)}.${locatorBbt.beat}`;

  // --- Loop ---------------------------------------------------------------

  const loopOn = Boolean(state.loop?.enabled);
  const loopRange = loopDraft ?? usableLoopRange(state.loop);

  // --- Map preview project ------------------------------------------------

  const mapPreviewProject = useMemo(() => {
    if (!draftProject || !mapDragPreview) return draftProject;
    const { lane, moveIds, deltaTicks } = mapDragPreview;
    if (deltaTicks === 0) return draftProject;
    const idSet = new Set(moveIds);
    const shift = <T extends { id: string; startTicks: number }>(
      list: T[],
    ): T[] =>
      list
        .map((e) =>
          idSet.has(e.id) && e.startTicks > 0
            ? { ...e, startTicks: e.startTicks + deltaTicks }
            : e,
        )
        .sort((a, b) => a.startTicks - b.startTicks);
    if (lane === "tempo") {
      return { ...draftProject, tempoMap: shift(draftProject.tempoMap) };
    }
    if (lane === "metrum") {
      return { ...draftProject, meterMap: shift(draftProject.meterMap) };
    }
    return {
      ...draftProject,
      keyMap: shift(draftProject.keyMap ?? []),
    };
  }, [draftProject, mapDragPreview]);

  // --- Map segments -------------------------------------------------------

  const tempoSegments = useMemo(() => {
    if (!mapPreviewProject) return [];
    return tempoMapSegments(mapPreviewProject, viewSpan);
  }, [mapPreviewProject, viewSpan]);

  const meterSegments = useMemo(() => {
    if (!mapPreviewProject) return [];
    return meterMapSegments(mapPreviewProject, viewSpan);
  }, [mapPreviewProject, viewSpan]);

  const keySegments = useMemo(() => {
    if (!mapPreviewProject) return [];
    return keyMapSegments(mapPreviewProject, viewSpan, formatKeySignature);
  }, [mapPreviewProject, viewSpan]);

  return {
    viewSpan,
    barTicks,
    canvasWidthPx,
    barMarks,
    rulerBeatMarks,
    playheadPx,
    effectiveLocatorTicks,
    tapActiveClipId,
    locatorPx,
    locatorMeter,
    locatorBbt,
    locatorLabel,
    loopOn,
    loopRange,
    mapPreviewProject,
    tempoSegments,
    meterSegments,
    keySegments,
  };
}
