import type { Server as HttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import { TransportTickMessageSchema } from "@stagesync/shared";
import type { ClientPresence } from "../client-presence.js";
import type { TransportEngine } from "./engine.js";
import type { StageHub } from "./stage-hub.js";

export const TRANSPORT_WS_PATH = "/ws/transport";

type PresenceSocket = WebSocket & { __presenceId?: string };

export function attachTransportWs(
  server: HttpServer,
  transport: TransportEngine,
  stageHub?: StageHub,
  presence?: ClientPresence,
): WebSocketServer {
  const wss = new WebSocketServer({ server, path: TRANSPORT_WS_PATH });

  // `ws` re-emits HTTP server listen errors onto WSS; without a listener Node
  // treats them as unhandled and kills the process (tsx watch then sits idle).
  wss.on("error", (err) => {
    console.error("[stagesync-server] transport WS error", err);
  });

  function send(ws: WebSocket, raw: unknown): void {
    if (ws.readyState !== ws.OPEN) return;
    const msg = TransportTickMessageSchema.parse(raw);
    ws.send(JSON.stringify(msg));
  }

  wss.on("connection", (ws: PresenceSocket) => {
    const id = randomUUID();
    ws.__presenceId = id;
    presence?.connect(id);
    send(ws, transport.toTickMessage());

    ws.on("message", (data) => {
      if (!presence) return;
      try {
        const raw = JSON.parse(String(data)) as {
          type?: string;
          displayName?: unknown;
          roles?: unknown;
          latencyMs?: unknown;
        };
        if (raw?.type === "client_hello") {
          presence.upsert(id, {
            displayName: raw.displayName,
            roles: raw.roles,
            latencyMs: raw.latencyMs,
          });
        }
      } catch {
        /* ignore malformed */
      }
    });

    ws.on("close", () => {
      presence?.remove(id);
    });
  });

  const unsubscribe = transport.onChange((msg) => {
    const payload = JSON.stringify(TransportTickMessageSchema.parse(msg));
    for (const client of wss.clients) {
      if (client.readyState !== client.OPEN) continue;
      try {
        client.send(payload);
      } catch (err) {
        console.error("[stagesync-server] transport WS send error", err);
      }
    }
  });

  const unsubStage = stageHub?.onMessage((msg) => {
    const payload = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState !== client.OPEN) continue;
      try {
        client.send(payload);
      } catch (err) {
        console.error("[stagesync-server] stage WS send error", err);
      }
    }
  });

  wss.on("close", () => {
    unsubscribe();
    unsubStage?.();
  });

  return wss;
}
