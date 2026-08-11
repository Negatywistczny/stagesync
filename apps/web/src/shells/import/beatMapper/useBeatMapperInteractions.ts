import { useCallback, useRef, useState, type RefObject } from "react";
import type { TempoNode } from "@stagesync/shared";

export type UseBeatMapperInteractionsParams = {
  disabled: boolean;
  durationMs: number;
  tempoNodes: TempoNode[];
  onTempoNodesChange: (nodes: TempoNode[]) => void;
  beat1AnchorMs: number;
  beatMarkerMs: number[];
  audioStartOffsetMs: number;
  onAudioStartOffsetChange: (ms: number) => void;
  frameWidth: number;
  clientXToMs: (clientX: number) => number;
  msToPct: (ms: number) => number;
  stopPlayback: () => void;
  setCursorMs: (ms: number) => void;
  updateCursorDom: (ms: number) => void;
  cursorMsRef: RefObject<number>;
};

export function useBeatMapperInteractions({
  disabled,
  durationMs,
  tempoNodes,
  onTempoNodesChange,
  beat1AnchorMs,
  beatMarkerMs,
  onAudioStartOffsetChange,
  frameWidth,
  clientXToMs,
  msToPct,
  stopPlayback,
  setCursorMs,
  updateCursorDom,
  cursorMsRef,
}: UseBeatMapperInteractionsParams) {
  const [dragNodeIdx, setDragNodeIdx] = useState<number | null>(null);
  const [dragBeat1, setDragBeat1] = useState(false);

  const dragNodesRef = useRef(tempoNodes);
  const dragIdxRef = useRef<number | null>(null);
  const dragBeat1Ref = useRef(false);

  const updateDraggedNode = useCallback(
    (idx: number, ms: number) => {
      const wallMs = Math.max(0, ms);
      const next = dragNodesRef.current.map((n, i) =>
        i === idx ? { ...n, wallMs } : n,
      );
      dragNodesRef.current = next;
      onTempoNodesChange(next);
    },
    [onTempoNodesChange],
  );

  const commitDraggedNodes = useCallback(() => {
    onTempoNodesChange([...dragNodesRef.current]);
  }, [onTempoNodesChange]);

  const onWavePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || durationMs <= 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const ms = clientXToMs(e.clientX);
      if (e.shiftKey) {
        setCursorMs(ms);
        updateCursorDom(ms);
        return;
      }
      const xPct = msToPct(ms);
      const beat1Dist =
        Math.abs(msToPct(beat1AnchorMs) - xPct) * (frameWidth / 100);
      if (beat1Dist < 14) {
        stopPlayback();
        dragBeat1Ref.current = true;
        setDragBeat1(true);
        dragIdxRef.current = null;
        setDragNodeIdx(null);
        onAudioStartOffsetChange(Math.max(0, Math.round(ms)));
        return;
      }
      const hitIdx = beatMarkerMs.findIndex((bm) => {
        const pct = msToPct(bm);
        return Math.abs(pct - xPct) * (frameWidth / 100) < 14;
      });
      if (hitIdx >= 0) {
        stopPlayback();
        dragBeat1Ref.current = false;
        setDragBeat1(false);
        dragIdxRef.current = hitIdx;
        setDragNodeIdx(hitIdx);
        updateDraggedNode(hitIdx, ms);
      } else {
        dragBeat1Ref.current = false;
        setDragBeat1(false);
        dragIdxRef.current = null;
        setDragNodeIdx(null);
        setCursorMs(ms);
        updateCursorDom(ms);
      }
    },
    [
      disabled,
      durationMs,
      clientXToMs,
      msToPct,
      beat1AnchorMs,
      frameWidth,
      stopPlayback,
      onAudioStartOffsetChange,
      beatMarkerMs,
      updateDraggedNode,
      setCursorMs,
      updateCursorDom,
    ],
  );

  const onWavePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragBeat1Ref.current) {
        e.preventDefault();
        onAudioStartOffsetChange(
          Math.max(0, Math.round(clientXToMs(e.clientX))),
        );
        return;
      }
      const idx = dragIdxRef.current;
      if (idx == null || disabled) return;
      e.preventDefault();
      updateDraggedNode(idx, clientXToMs(e.clientX));
    },
    [clientXToMs, disabled, onAudioStartOffsetChange, updateDraggedNode],
  );

  const onWavePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (dragIdxRef.current != null) {
        commitDraggedNodes();
      }
      dragBeat1Ref.current = false;
      setDragBeat1(false);
      dragIdxRef.current = null;
      setDragNodeIdx(null);
    },
    [commitDraggedNodes],
  );

  const setBeat1AtCursor = useCallback(() => {
    const wallAtCursor = Math.max(0, Math.round(cursorMsRef.current ?? 0));
    onAudioStartOffsetChange(wallAtCursor);
  }, [cursorMsRef, onAudioStartOffsetChange]);

  return {
    dragNodeIdx,
    dragBeat1,
    dragNodesRef,
    onWavePointerDown,
    onWavePointerMove,
    onWavePointerUp,
    setBeat1AtCursor,
  };
}
