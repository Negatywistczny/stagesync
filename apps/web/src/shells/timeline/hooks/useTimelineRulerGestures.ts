import { useState, useRef, useCallback, type RefObject } from "react";
import type { Project, TransportLoop } from "@stagesync/shared";
import { projectEndTicks, resolveMeterAt } from "@stagesync/shared";
import { mapSnapMode } from "@lib/timeline/mapLaneEdit.js";
import { contentSnapModeFromModifiers } from "@lib/timeline/timelineGesture.js";
import { ticksFromPointer, snapLocatorTicks } from "@lib/timeline-edit/formaCanvas.js";
import {
  usableLoopRange,
  ticksInLoopRegion,
  snapLoopRange,
  snapMovedLoopRange,
  type LoopRange,
} from "@lib/timeline/timelineLocator.js";

export type UseTimelineRulerGesturesOptions = {
  draftRef: RefObject<Project | null>;
  draftProject: Project | null;
  state: { loop?: TransportLoop | null };
  locatorTicks: number;
  seek: (ticks: number) => Promise<void>;
  setLoop: (body: {
    enabled: boolean;
    startTicks?: number;
    endTicks?: number;
  }) => Promise<void>;
  setLocatorTicks: (ticks: number | ((prev: number) => number)) => void;
  markerOverlayRef: RefObject<HTMLDivElement | null>;
  lanesCoordRef: RefObject<HTMLDivElement | null>;
  viewSpanRef: RefObject<{ start: number; end: number }>;
  barTicksRef: RefObject<number>;
  zoomHRef: RefObject<number>;
  rawTicksAtClientX: (clientX: number) => number | null;
};

export function useTimelineRulerGestures({
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
}: UseTimelineRulerGesturesOptions) {
  const [loopDraft, setLoopDraftState] = useState<LoopRange | null>(null);
  const loopDraftRef = useRef<LoopRange | null>(null);
  const setLoopDraft = useCallback((d: LoopRange | null) => {
    loopDraftRef.current = d;
    setLoopDraftState(d);
  }, []);

  const loopDragRef = useRef<{
    pointerId: number;
    originTicks: number;
    originClientX: number;
    source: "ruler-loop" | "ruler-beat" | "locator";
    kind: "create" | "move" | "seek";
    moveOriginRange?: LoopRange;
  } | null>(null);

  const placeLocatorAtTicks = useCallback(
    (
      ticks: number,
      opts?: {
        seekTransport?: boolean;
        metaKey?: boolean;
        ctrlKey?: boolean;
      },
    ) => {
      if (!draftRef.current) return;
      const mode = mapSnapMode(opts?.metaKey ?? false, opts?.ctrlKey ?? false);
      const snapped = snapLocatorTicks(draftRef.current, ticks, mode);
      setLocatorTicks(snapped);
      if (opts?.seekTransport !== false) {
        void seek(snapped);
      }
    },
    [draftRef, setLocatorTicks, seek],
  );

  const setLocatorFromClientX = useCallback(
    (
      clientX: number,
      opts?: {
        seekTransport?: boolean;
        metaKey?: boolean;
        ctrlKey?: boolean;
      },
    ) => {
      const coordRoot = markerOverlayRef.current ?? lanesCoordRef.current;
      if (!coordRoot || !draftRef.current) return;
      const raw = ticksFromPointer(
        clientX,
        coordRoot,
        viewSpanRef.current,
        barTicksRef.current,
        zoomHRef.current,
      );
      placeLocatorAtTicks(raw, opts);
    },
    [
      markerOverlayRef,
      lanesCoordRef,
      draftRef,
      viewSpanRef,
      barTicksRef,
      zoomHRef,
      placeLocatorAtTicks,
    ],
  );

  const onLocatorPointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLElement>,
      source: "ruler-loop" | "ruler-beat" | "locator",
    ) => {
      if (e.button !== 0) return;
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const existing = usableLoopRange(state.loop);
      if (source === "ruler-loop") {
        if (existing && ticksInLoopRegion(raw, existing)) {
          loopDragRef.current = {
            pointerId: e.pointerId,
            originTicks: raw,
            originClientX: e.clientX,
            source,
            kind: "move",
            moveOriginRange: existing,
          };
          setLoopDraft(existing);
          return;
        }
        loopDragRef.current = {
          pointerId: e.pointerId,
          originTicks: raw,
          originClientX: e.clientX,
          source,
          kind: "create",
        };
        setLoopDraft(null);
        return;
      }
      loopDragRef.current = {
        pointerId: e.pointerId,
        originTicks: raw,
        originClientX: e.clientX,
        source,
        kind: "seek",
      };
      setLoopDraft(null);
      setLocatorFromClientX(e.clientX, {
        seekTransport: true,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
      });
    },
    [rawTicksAtClientX, state.loop, setLoopDraft, setLocatorFromClientX],
  );

  const onLocatorPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const drag = loopDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) {
        setLocatorFromClientX(e.clientX, {
          seekTransport: true,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
        });
        return;
      }
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      const mode = contentSnapModeFromModifiers(e.metaKey, e.ctrlKey);
      if (drag.kind === "create" && draftProject) {
        const dx = Math.abs(e.clientX - drag.originClientX);
        if (dx >= 5) {
          const a = Math.min(drag.originTicks, raw);
          const b = Math.max(drag.originTicks, raw);
          setLoopDraft(snapLoopRange(draftProject, a, b, mode));
        }
        return;
      }
      if (drag.kind === "move" && drag.moveOriginRange && draftProject) {
        const delta = raw - drag.originTicks;
        setLoopDraft(
          snapMovedLoopRange(draftProject, drag.moveOriginRange, delta, mode),
        );
        return;
      }
      setLocatorFromClientX(e.clientX, {
        seekTransport: true,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
      });
    },
    [rawTicksAtClientX, draftProject, setLoopDraft, setLocatorFromClientX],
  );

  const onLocatorPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const drag = loopDragRef.current;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (!drag || drag.pointerId !== e.pointerId) return;
      const draft = loopDraftRef.current;
      const dx = Math.abs(e.clientX - drag.originClientX);
      loopDragRef.current = null;
      if (
        drag.kind === "create" &&
        draft &&
        draft.endTicks > draft.startTicks &&
        draftProject
      ) {
        const snapped = snapLoopRange(
          draftProject,
          draft.startTicks,
          draft.endTicks,
          contentSnapModeFromModifiers(e.metaKey, e.ctrlKey),
        );
        void setLoop({
          enabled: true,
          startTicks: snapped.startTicks,
          endTicks: snapped.endTicks,
        }).finally(() => setLoopDraft(null));
        return;
      }
      if (drag.kind === "move" && drag.moveOriginRange) {
        if (dx < 5) {
          setLoopDraft(null);
          if (state.loop) {
            void setLoop({
              ...state.loop,
              enabled: !state.loop.enabled,
            });
          }
          return;
        }
        if (draft && draft.endTicks > draft.startTicks) {
          void setLoop({
            enabled: state.loop?.enabled ?? true,
            startTicks: draft.startTicks,
            endTicks: draft.endTicks,
          }).finally(() => setLoopDraft(null));
          return;
        }
      }
      setLoopDraft(null);
      if (drag.kind === "seek") {
        setLocatorFromClientX(e.clientX, {
          seekTransport: true,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
        });
      }
    },
    [draftProject, setLoop, setLoopDraft, state.loop, setLocatorFromClientX],
  );

  const onLoopToggle = useCallback(() => {
    const range = usableLoopRange(state.loop);
    if (range && state.loop) {
      void setLoop({ ...state.loop, enabled: !state.loop.enabled });
      return;
    }
    if (!draftProject) return;
    const end = projectEndTicks(draftProject);
    if (end <= 0) return;
    void setLoop({ enabled: true, startTicks: 0, endTicks: end });
  }, [state.loop, setLoop, draftProject]);

  const nudgeLocator = useCallback(
    (dir: -1 | 1) => {
      const draft = draftRef.current;
      if (!draft) return;
      const meter = resolveMeterAt(draft, locatorTicks);
      const beatTicks = Math.max(
        1,
        Math.round((draft.ppq * 4) / Math.max(1, meter.denominator)),
      );
      placeLocatorAtTicks(locatorTicks + dir * beatTicks, {
        seekTransport: true,
      });
    },
    [draftRef, locatorTicks, placeLocatorAtTicks],
  );

  return {
    loopDraft,
    placeLocatorAtTicks,
    setLocatorFromClientX,
    onLocatorPointerDown,
    onLocatorPointerMove,
    onLocatorPointerUp,
    onLoopToggle,
    nudgeLocator,
  };
}
