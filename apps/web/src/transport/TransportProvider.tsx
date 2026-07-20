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

export function TransportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TransportState>(defaultTransportState);
  const [displayTicks, setDisplayTicks] = useState(0);
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");
  const [commandPending, setCommandPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageCue, setStageCue] = useState<StageCue | null>(null);

  const anchorRef = useRef<TransportAnchor>(toAnchor(defaultTransportState()));
  const receiptMsRef = useRef(0);
  const lastServerTimeMsRef = useRef(-Infinity);
  const playingRef = useRef(false);
  const rafIdRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
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
        wsRef.current = null;
      }
      setWsStatus("connecting");
      ws = new WebSocket(transportWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!cancelled) setWsStatus("connected");
        const hello = pendingHelloRef.current;
        if (hello && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "client_hello",
              displayName: hello.displayName,
              roles: hello.roles,
            }),
          );
        }
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
          applyAnchor(
            {
              playing: msg.playing,
              positionTicks: msg.positionTicks,
              bpm: msg.bpm,
              timeSignature: msg.timeSignature,
              ppq: msg.ppq,
              activeProjectId: msg.activeProjectId ?? null,
            },
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
        wsRef.current = null;
      }
    };
  }, [applyAnchor, startRaf, stopRaf]);

  const announcePresence = useCallback(
    (payload: { displayName: string | null; roles: string[] }) => {
      pendingHelloRef.current = payload;
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "client_hello",
            displayName: payload.displayName,
            roles: payload.roles,
          }),
        );
      }
    },
    [],
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
