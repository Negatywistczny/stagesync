import { useCallback, useEffect, useRef, useState } from "react";
import {
  TransportWsServerMessageSchema,
  type TransportState,
} from "@stagesync/shared";
import { transportStateFromTick } from "@lib/timeline/timelineLocator.js";
import { getTransport } from "./api.js";
import {
  DEFAULT_LIVE_DESK,
  DEFAULT_SETLIST_SNAPSHOT,
  type LiveDeskState,
  type SetlistSnapshotState,
  type StageCue,
  type WsStatus,
} from "./transportContext.js";
import { wsReconnectDelayMs } from "./wsReconnect.js";
import { fetchLiveDesk, fetchSetlist } from "@lib/shell-operator/setlistApi.js";
import {
  dismissStageCues,
  formatTransportError,
  liveDeskFromPayload,
  noteLatencySample,
  setlistSnapshotFromPayload,
  stageCueFromWs,
  transportWsUrl,
  upsertStageCue,
} from "./transportReducer.js";

export type UseTransportSocketParams = {
  applyAnchor: (
    next: TransportState,
    receiptMs: number,
    serverTimeMs?: number,
  ) => void;
  startRaf: () => void;
  stopRaf: () => void;
};

export function useTransportSocket({
  applyAnchor,
  startRaf,
  stopRaf,
}: UseTransportSocketParams) {
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stageCue, setStageCue] = useState<StageCue | null>(null);
  const [stageCues, setStageCues] = useState<StageCue[]>([]);
  const [liveDesk, setLiveDesk] = useState<LiveDeskState>(DEFAULT_LIVE_DESK);
  const [setlistSnapshot, setSetlistSnapshot] = useState<SetlistSnapshotState>(
    DEFAULT_SETLIST_SNAPSHOT,
  );

  const wsRef = useRef<WebSocket | null>(null);
  const latencyEmaRef = useRef(0);
  const pendingHelloRef = useRef<{
    displayName: string | null;
    roles: string[];
  } | null>(null);

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

  const announcePresence = useCallback(
    (payload: { displayName: string | null; roles: string[] }) => {
      pendingHelloRef.current = payload;
      sendHello();
    },
    [sendHello],
  );

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
          if (type === "transport_tick") {
            setError(formatTransportError(parsed.error, "Nieprawidłowy tick"));
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
        if (parsed.data.type === "setlist_snapshot") {
          setSetlistSnapshot(setlistSnapshotFromPayload(parsed.data));
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

    const onVisibility = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      const cur = wsRef.current;
      if (cur?.readyState === WebSocket.OPEN) {
        sendHello();
        return;
      }
      if (cur?.readyState === WebSocket.CONNECTING) return;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      reconnectAttempt = 0;
      connect();
    };
    document.addEventListener("visibilitychange", onVisibility);

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
      try {
        const view = await fetchSetlist();
        if (!cancelled) {
          setSetlistSnapshot(
            setlistSnapshotFromPayload({
              projectIds: view.projectIds,
              enabled: view.enabled,
              autoAdvance: view.autoAdvance,
              currentIndex: view.currentIndex,
              next: view.next,
              sentAtMs: Date.now(),
            }),
          );
        }
      } catch {
        /* WS snapshot may still arrive */
      }
      connect();
    })();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
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

  return {
    wsStatus,
    latencyMs,
    error,
    setError,
    stageCue,
    stageCues,
    liveDesk,
    setlistSnapshot,
    announcePresence,
  };
}
