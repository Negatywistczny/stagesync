import { useCallback, useEffect, useRef, useState } from "react";
import {
  TransportTickMessageSchema,
  defaultTransportState,
  getDisplayTicks,
  type TransportAnchor,
  type TransportPlayBody,
  type TransportState,
} from "@stagesync/shared";
import {
  getTransport,
  pauseTransport,
  playTransport,
  seekTransport,
} from "./api.js";

export type WsStatus = "connecting" | "connected" | "disconnected";

function toAnchor(state: TransportState): TransportAnchor {
  return {
    positionTicks: state.positionTicks,
    bpm: state.bpm,
    timeSignature: state.timeSignature,
    ppq: state.ppq,
  };
}

function transportWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/transport`;
}

export function useTransport() {
  const [state, setState] = useState<TransportState>(defaultTransportState);
  const [displayTicks, setDisplayTicks] = useState(0);
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");
  const [commandPending, setCommandPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anchorRef = useRef<TransportAnchor>(toAnchor(defaultTransportState()));
  const receiptMsRef = useRef(0);
  const playingRef = useRef(false);
  const rafIdRef = useRef(0);

  const stopRaf = useCallback(() => {
    if (rafIdRef.current !== 0) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
  }, []);

  const applyAnchor = useCallback(
    (next: TransportState, receiptMs: number) => {
      const anchor = toAnchor(next);
      anchorRef.current = anchor;
      receiptMsRef.current = receiptMs;
      playingRef.current = next.playing;
      setState(next);
      setDisplayTicks(anchor.positionTicks);
    },
    [],
  );

  const startRaf = useCallback(() => {
    stopRaf();
    const loop = (frameTime: number) => {
      if (!playingRef.current) {
        rafIdRef.current = 0;
        return;
      }
      setDisplayTicks(
        getDisplayTicks(
          anchorRef.current,
          frameTime,
          receiptMsRef.current,
          true,
        ),
      );
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
  }, [stopRaf]);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      stopRaf();
      if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
      }
      setWsStatus("connecting");
      ws = new WebSocket(transportWsUrl());

      ws.onopen = () => {
        if (!cancelled) setWsStatus("connected");
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const msg = TransportTickMessageSchema.parse(
            JSON.parse(String(event.data)),
          );
          applyAnchor(
            {
              playing: msg.playing,
              positionTicks: msg.positionTicks,
              bpm: msg.bpm,
              timeSignature: msg.timeSignature,
              ppq: msg.ppq,
            },
            performance.now(),
          );
          if (msg.playing) {
            startRaf();
          } else {
            stopRaf();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Invalid tick");
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setWsStatus("disconnected");
        stopRaf();
        reconnectTimer = setTimeout(connect, 1000);
      };

      ws.onerror = () => {
        /* onclose handles reconnect */
      };
    };

    void (async () => {
      try {
        const initial = await getTransport();
        if (cancelled) return;
        applyAnchor(initial, performance.now());
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
      connect();
    })();

    return () => {
      cancelled = true;
      stopRaf();
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [applyAnchor, startRaf, stopRaf]);

  const runCommand = useCallback(
    async (fn: () => Promise<TransportState>) => {
      setCommandPending(true);
      setError(null);
      try {
        const next = await fn();
        applyAnchor(next, performance.now());
        if (next.playing) {
          startRaf();
        } else {
          stopRaf();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Command failed");
      } finally {
        setCommandPending(false);
      }
    },
    [applyAnchor, startRaf, stopRaf],
  );

  const play = useCallback(
    (body?: TransportPlayBody) => runCommand(() => playTransport(body)),
    [runCommand],
  );

  const pause = useCallback(
    () => runCommand(() => pauseTransport()),
    [runCommand],
  );

  const seek = useCallback(
    (positionTicks: number) => runCommand(() => seekTransport(positionTicks)),
    [runCommand],
  );

  return {
    state,
    displayTicks,
    wsStatus,
    commandPending,
    error,
    play,
    pause,
    seek,
  };
}
