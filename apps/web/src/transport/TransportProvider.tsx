import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  TransportWsServerMessageSchema,
  defaultTransportState,
  getDisplayTicks,
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
import {
  TransportContext,
  DEFAULT_LIVE_DESK,
  type LiveDeskState,
  type StageCue,
  type WsStatus,
} from "./transportContext.js";
import type { TransportLoopBody } from "@stagesync/shared";
import { wsReconnectDelayMs } from "./wsReconnect.js";
import { fetchLiveDesk } from "../lib/setlistApi.js";
import {
  dismissStageCues,
  formatTransportError,
  liveDeskFromPayload,
  noteLatencySample,
  shouldAcceptServerTick,
  stageCueFromWs,
  toTransportAnchor,
  transportWsUrl,
  upsertStageCue,
} from "./transportReducer.js";

export { noteLatencySample } from "./transportReducer.js";

export function TransportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TransportState>(defaultTransportState);
  const [displayTicks, setDisplayTicks] = useState(0);
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [commandPending, setCommandPending] = useState(false);
  const commandPendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [stageCue, setStageCue] = useState<StageCue | null>(null);
  const [stageCues, setStageCues] = useState<StageCue[]>([]);
  const [liveDesk, setLiveDesk] = useState<LiveDeskState>(DEFAULT_LIVE_DESK);

  const anchorRef = useRef(toTransportAnchor(defaultTransportState()));
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
      if (!shouldAcceptServerTick(serverTimeMs, lastServerTimeMsRef.current)) {
        return;
      }
      if (serverTimeMs !== undefined) {
        lastServerTimeMsRef.current = serverTimeMs;
      }
      const anchor = toTransportAnchor(next);
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
    let reconnectAttempt = 0;

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
      ws = new WebSocket(transportWsUrl(window.location));
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        reconnectAttempt = 0;
        setWsStatus("connected");
        sendHello();
        void (async () => {
          try {
            const snap = await getTransport();
            if (cancelled) return;
            applyAnchor(snap.state, performance.now(), snap.serverTimeMs);
            if (snap.state.playing) startRaf();
            else stopRaf();
          } catch {
            /* ticks will catch up */
          }
        })();
        // Keep Admin presence latency fresh while connected (v4 interval).
        helloTimer = setInterval(() => {
          if (!cancelled) sendHello();
        }, 3000);
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        let raw: unknown;
        try {
          raw = JSON.parse(String(event.data));
        } catch (err) {
          setError(formatTransportError(err, "Nieprawidłowy tick"));
          return;
        }
        const parsed = TransportWsServerMessageSchema.safeParse(raw);
        if (!parsed.success) {
          const type =
            raw && typeof raw === "object" && "type" in raw
              ? (raw as { type?: unknown }).type
              : undefined;
          // Only surface malformed ticks; ignore unknown / non-tick frames.
          if (type === "transport_tick") {
            setError(
              formatTransportError(parsed.error, "Nieprawidłowy tick"),
            );
          }
          return;
        }
        if (parsed.data.type === "stage_cue") {
          const nextCue = stageCueFromWs(parsed.data);
          setStageCues((prev) => upsertStageCue(prev, nextCue));
          setStageCue(nextCue);
          return;
        }
        if (parsed.data.type === "stage_cue_dismiss") {
          const dismiss = parsed.data;
          if (dismiss.clearAll) {
            setStageCues([]);
            setStageCue(null);
            return;
          }
          if (dismiss.id) {
            setStageCues((prev) => {
              const { cues, latest } = dismissStageCues(prev, {
                id: dismiss.id,
              });
              setStageCue(latest);
              return cues;
            });
          }
          return;
        }
        if (parsed.data.type === "live_desk") {
          setLiveDesk(liveDeskFromPayload(parsed.data));
          return;
        }
        const msg = parsed.data;
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
      };

      ws.onclose = () => {
        if (cancelled) return;
        if (helloTimer !== null) {
          clearInterval(helloTimer);
          helloTimer = null;
        }
        setStageCue(null);
        setStageCues([]);
        setWsStatus("disconnected");
        latencyEmaRef.current = 0;
        setLatencyMs(null);
        stopRaf();
        const delay = wsReconnectDelayMs(reconnectAttempt);
        reconnectAttempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        /* onclose handles reconnect + backoff */
      };
    };

    void (async () => {
      try {
        const initial = await getTransport();
        if (cancelled) return;
        applyAnchor(initial.state, performance.now(), initial.serverTimeMs);
      } catch (err) {
        if (!cancelled) {
          setError(formatTransportError(err, "Nie udało się wczytać"));
        }
      }
      try {
        const desk = await fetchLiveDesk();
        if (!cancelled) {
          setLiveDesk(liveDeskFromPayload(desk));
        }
      } catch {
        /* WS snapshot may still arrive */
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
    async (fn: () => Promise<{ state: TransportState; serverTimeMs: number }>) => {
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
      stageCues,
      liveDesk,
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
      stageCues,
      liveDesk,
      announcePresence,
    ],
  );

  return (
    <TransportContext.Provider value={value}>
      {children}
    </TransportContext.Provider>
  );
}
