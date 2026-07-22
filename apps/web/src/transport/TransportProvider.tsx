import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  TransportTickMessageSchema,
  defaultTransportState,
  getDisplayTicks,
  type TransportAnchor,
  type TransportPlayBody,
  type TransportState,
} from "@stagesync/shared";
import { transportStateFromTick } from "../lib/timelineLocator.js";
import {
  getTransport,
  pauseTransport,
  playTransport,
  seekTransport,
  setTransportLoop,
  stopTransport,
} from "./api.js";
import { TransportContext, type StageCue, type WsStatus } from "./transportContext.js";
import type { TransportLoopBody } from "@stagesync/shared";

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

/** v4-style EMA of one-way delay from wall-clock `sentAtMs`. */
function noteLatencySample(prev: number, sentAtMs: number): number {
  const sample = Math.max(0, Date.now() - sentAtMs);
  if (!prev) return sample;
  return Math.round(prev * 0.82 + sample * 0.18);
}

export function TransportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TransportState>(defaultTransportState);
  const [displayTicks, setDisplayTicks] = useState(0);
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [commandPending, setCommandPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageCue, setStageCue] = useState<StageCue | null>(null);

  const anchorRef = useRef<TransportAnchor>(toAnchor(defaultTransportState()));
  const receiptMsRef = useRef(0);
  const lastServerTimeMsRef = useRef(-Infinity);
  const playingRef = useRef(false);
  const rafIdRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const latencyEmaRef = useRef(0);
  const pendingHelloRef = useRef<{
    displayName: string | null;
    roles: string[];
  } | null>(null);

  const stopRaf = useCallback(() => {
    if (rafIdRef.current !== 0) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
  }, []);

  const applyAnchor = useCallback(
    (next: TransportState, receiptMs: number, serverTimeMs?: number) => {
      if (
        serverTimeMs !== undefined &&
        serverTimeMs < lastServerTimeMsRef.current
      ) {
        return;
      }
      if (serverTimeMs !== undefined) {
        lastServerTimeMsRef.current = serverTimeMs;
      }
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

  const sendHello = useCallback(() => {
    const hello = pendingHelloRef.current;
    const ws = wsRef.current;
    if (!hello || !ws || ws.readyState !== WebSocket.OPEN) return;
    const latency =
      latencyEmaRef.current > 0 ? Math.round(latencyEmaRef.current) : null;
    ws.send(
      JSON.stringify({
        type: "client_hello",
        displayName: hello.displayName,
        roles: hello.roles,
        latencyMs: latency,
      }),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let helloTimer: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (cancelled) return;
      stopRaf();
      if (helloTimer !== null) {
        clearInterval(helloTimer);
        helloTimer = null;
      }
      if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
        wsRef.current = null;
      }
      setWsStatus("connecting");
      latencyEmaRef.current = 0;
      setLatencyMs(null);
      ws = new WebSocket(transportWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        lastServerTimeMsRef.current = Number.NEGATIVE_INFINITY;
        setWsStatus("connected");
        sendHello();
        // Keep Admin presence latency fresh while connected (v4 interval).
        helloTimer = setInterval(() => {
          if (!cancelled) sendHello();
        }, 3000);
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const raw = JSON.parse(String(event.data)) as {
            type?: string;
            text?: string;
            ttlMs?: number;
            sentAtMs?: number;
            roles?: Array<"karaoke" | "grid" | "score" | "drums">;
          };
          if (raw.type === "stage_cue" && typeof raw.text === "string") {
            setStageCue({
              text: raw.text,
              ttlMs: raw.ttlMs ?? 6000,
              sentAtMs: raw.sentAtMs ?? Date.now(),
              roles: raw.roles,
            });
            return;
          }
          const msg = TransportTickMessageSchema.parse(raw);
          if (msg.sentAtMs != null && Number.isFinite(msg.sentAtMs)) {
            const next = noteLatencySample(latencyEmaRef.current, msg.sentAtMs);
            latencyEmaRef.current = next;
            setLatencyMs((prev) => (prev === next ? prev : next));
          }
          applyAnchor(
            transportStateFromTick(msg),
            performance.now(),
            msg.serverTimeMs,
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
        if (helloTimer !== null) {
          clearInterval(helloTimer);
          helloTimer = null;
        }
        setWsStatus("disconnected");
        latencyEmaRef.current = 0;
        setLatencyMs(null);
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
      if (helloTimer !== null) clearInterval(helloTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
        wsRef.current = null;
      }
    };
  }, [applyAnchor, sendHello, startRaf, stopRaf]);

  const announcePresence = useCallback(
    (payload: { displayName: string | null; roles: string[] }) => {
      pendingHelloRef.current = payload;
      sendHello();
    },
    [sendHello],
  );

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
      stageCue,
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
      stageCue,
      announcePresence,
    ],
  );

  return (
    <TransportContext.Provider value={value}>
      {children}
    </TransportContext.Provider>
  );
}
