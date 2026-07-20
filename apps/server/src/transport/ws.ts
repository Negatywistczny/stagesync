import type { Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { TransportTickMessageSchema } from "@stagesync/shared";
import type { TransportEngine } from "./engine.js";
import type { StageHub } from "./stage-hub.js";

export const TRANSPORT_WS_PATH = "/ws/transport";

export function attachTransportWs(
  server: HttpServer,
  transport: TransportEngine,
  stageHub?: StageHub,
): WebSocketServer {
  const wss = new WebSocketServer({ server, path: TRANSPORT_WS_PATH });

  function send(ws: WebSocket, raw: unknown): void {
    if (ws.readyState !== ws.OPEN) return;
    const msg = TransportTickMessageSchema.parse(raw);
    ws.send(JSON.stringify(msg));
  }

  wss.on("connection", (ws) => {
    send(ws, transport.toTickMessage());
  });

  const unsubscribe = transport.onChange((msg) => {
    const payload = JSON.stringify(TransportTickMessageSchema.parse(msg));
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  });

  const unsubStage = stageHub?.onMessage((msg) => {
    const payload = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  });

  wss.on("close", () => {
    unsubscribe();
    unsubStage?.();
  });

  return wss;
}
