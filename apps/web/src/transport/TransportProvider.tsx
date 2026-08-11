import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { type TransportPlayBody, type TransportState } from "@stagesync/shared";
import {
  pauseTransport,
  playTransport,
  seekTransport,
  setTransportLoop,
  stopTransport,
} from "./api.js";
import { TransportContext } from "./transportContext.js";
import type { TransportLoopBody } from "@stagesync/shared";
import { formatTransportError } from "./transportReducer.js";
import { useTransportInterpolation } from "./useTransportInterpolation.js";
import { useTransportSocket } from "./useTransportSocket.js";

export { noteLatencySample } from "./transportReducer.js";

export function TransportProvider({ children }: { children: ReactNode }) {
  const [commandPending, setCommandPending] = useState(false);
  const commandPendingRef = useRef(false);

  const {
    state,
    displayTicks,
    applyAnchor,
    startRaf,
    stopRaf,
    setSoftClockTempoMaps,
  } = useTransportInterpolation();

  const {
    wsStatus,
    latencyMs,
    error,
    setError,
    stageCue,
    stageCues,
    liveDesk,
    setlistSnapshot,
    announcePresence,
  } = useTransportSocket({
    applyAnchor,
    startRaf,
    stopRaf,
  });

  const runCommand = useCallback(
    async (
      fn: () => Promise<{ state: TransportState; serverTimeMs: number }>,
    ) => {
      if (commandPendingRef.current) return;
      commandPendingRef.current = true;
      setCommandPending(true);
      setError(null);
      try {
        const { state: next, serverTimeMs } = await fn();
        applyAnchor(next, performance.now(), serverTimeMs);
        if (next.playing) {
          startRaf();
        } else {
          stopRaf();
        }
      } catch (err) {
        setError(formatTransportError(err, "Komenda nie powiodła się"));
      } finally {
        commandPendingRef.current = false;
        setCommandPending(false);
      }
    },
    [applyAnchor, setError, startRaf, stopRaf],
  );

  const play = useCallback(
    async (body?: TransportPlayBody) => {
      await runCommand(() => playTransport(body));
    },
    [runCommand],
  );

  const pause = useCallback(async () => {
    await runCommand(() => pauseTransport());
  }, [runCommand]);

  const stop = useCallback(async () => {
    await runCommand(() => stopTransport());
  }, [runCommand]);

  const seek = useCallback(
    async (positionTicks: number) => {
      await runCommand(() => seekTransport(positionTicks));
    },
    [runCommand],
  );

  const setLoop = useCallback(
    async (body: TransportLoopBody) => {
      await runCommand(() => setTransportLoop(body));
    },
    [runCommand],
  );

  const value = useMemo(
    () => ({
      state,
      displayTicks,
      wsStatus,
      latencyMs,
      commandPending,
      error,
      play,
      pause,
      stop,
      seek,
      setLoop,
      setSoftClockTempoMaps,
      stageCue,
      stageCues,
      liveDesk,
      setlistSnapshot,
      announcePresence,
    }),
    [
      state,
      displayTicks,
      wsStatus,
      latencyMs,
      commandPending,
      error,
      play,
      pause,
      stop,
      seek,
      setLoop,
      setSoftClockTempoMaps,
      stageCue,
      stageCues,
      liveDesk,
      setlistSnapshot,
      announcePresence,
    ],
  );

  return (
    <TransportContext.Provider value={value}>
      {children}
    </TransportContext.Provider>
  );
}
