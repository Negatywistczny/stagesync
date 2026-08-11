import { useCallback, useRef, useState } from "react";
import {
  defaultTransportState,
  getDisplayTicks,
  type TempoMapProject,
  type TransportState,
} from "@stagesync/shared";
import {
  shouldAcceptServerTick,
  toTransportAnchor,
  transportLoopForSoftClock,
} from "./transportReducer.js";
import { noteH01Raf } from "./h01PerfProbe.js";

export function useTransportInterpolation() {
  const [state, setState] = useState<TransportState>(defaultTransportState);
  const [displayTicks, setDisplayTicks] = useState(0);

  const anchorRef = useRef(toTransportAnchor(defaultTransportState()));
  const tempoMapsRef = useRef<TempoMapProject | null>(null);
  const loopRef = useRef(
    transportLoopForSoftClock(defaultTransportState().loop),
  );
  const receiptMsRef = useRef(0);
  const lastServerTimeMsRef = useRef(-Infinity);
  const playingRef = useRef(false);
  const rafIdRef = useRef(0);
  const displayTicksRef = useRef(0);
  const fallbackIntervalRef = useRef<number | null>(null);

  const stopRaf = useCallback(() => {
    if (rafIdRef.current !== 0) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    if (fallbackIntervalRef.current !== null) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  const commitDisplayTicks = useCallback((next: number): boolean => {
    if (displayTicksRef.current === next) return false;
    displayTicksRef.current = next;
    setDisplayTicks(next);
    return true;
  }, []);

  const applyAnchor = useCallback(
    (next: TransportState, receiptMs: number, serverTimeMs?: number) => {
      if (!shouldAcceptServerTick(serverTimeMs, lastServerTimeMsRef.current)) {
        return;
      }
      if (serverTimeMs !== undefined) {
        lastServerTimeMsRef.current = serverTimeMs;
      }
      const softLoop = transportLoopForSoftClock(next.loop);
      loopRef.current = softLoop;
      const anchor = toTransportAnchor(next, tempoMapsRef.current);
      anchorRef.current = anchor;
      receiptMsRef.current = receiptMs;
      const isStartOrSeek =
        !playingRef.current ||
        !next.playing ||
        Math.abs(anchor.positionTicks - anchorRef.current.positionTicks) > 100;
      playingRef.current = next.playing;
      setState(next);
      if (isStartOrSeek) {
        commitDisplayTicks(anchor.positionTicks);
      }
    },
    [commitDisplayTicks],
  );

  const startRaf = useCallback(() => {
    stopRaf();
    const tick = (timeMs: number) => {
      if (!playingRef.current) return;
      const next = getDisplayTicks(
        anchorRef.current,
        timeMs,
        receiptMsRef.current,
        true,
        loopRef.current,
      );
      const committed = commitDisplayTicks(next);
      noteH01Raf(next, committed);
    };

    const loop = (frameTime: number) => {
      if (!playingRef.current) {
        rafIdRef.current = 0;
        return;
      }
      tick(frameTime);
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);

    fallbackIntervalRef.current = window.setInterval(() => {
      if (playingRef.current) {
        tick(performance.now());
      }
    }, 200);
  }, [commitDisplayTicks, stopRaf]);

  const setSoftClockTempoMaps = useCallback((maps: TempoMapProject | null) => {
    tempoMapsRef.current = maps;
    anchorRef.current = {
      ...anchorRef.current,
      tempoMaps: maps ?? undefined,
    };
  }, []);

  return {
    state,
    displayTicks,
    applyAnchor,
    startRaf,
    stopRaf,
    setSoftClockTempoMaps,
  };
}
