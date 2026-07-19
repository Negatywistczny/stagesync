import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import {
  TransportStateSchema,
  TransportTickMessageSchema,
} from "@stagesync/shared";
import { createApp } from "./app.js";
import { attachTransportWs, TRANSPORT_WS_PATH } from "./transport/ws.js";
import { createTransportEngine } from "./transport/engine.js";

describe("transport REST + WS", () => {
  let server: Server;
  let baseUrl: string;
  let wsUrl: string;
  let disposeTransport: () => void;

  beforeEach(async () => {
    const transport = createTransportEngine();
    disposeTransport = () => transport.dispose();
    const { app } = createApp({ transport });
    server = createServer(app);
    attachTransportWs(server, transport);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    wsUrl = `ws://127.0.0.1:${port}${TRANSPORT_WS_PATH}`;
  });

  afterEach(async () => {
    disposeTransport();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("GET /api/transport returns idle snapshot", async () => {
    const res = await fetch(`${baseUrl}/api/transport`);
    expect(res.status).toBe(200);
    const state = TransportStateSchema.parse(await res.json());
    expect(state.playing).toBe(false);
    expect(state.positionTicks).toBe(0);
  });

  it("play → pause → seek via REST", async () => {
    const playRes = await fetch(`${baseUrl}/api/transport/play`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(playRes.status).toBe(200);
    expect(TransportStateSchema.parse(await playRes.json()).playing).toBe(
      true,
    );

    const pauseRes = await fetch(`${baseUrl}/api/transport/pause`, {
      method: "POST",
    });
    expect(pauseRes.status).toBe(200);
    expect(TransportStateSchema.parse(await pauseRes.json()).playing).toBe(
      false,
    );

    const seekRes = await fetch(`${baseUrl}/api/transport/seek`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ positionTicks: 1920 }),
    });
    expect(seekRes.status).toBe(200);
    const sought = TransportStateSchema.parse(await seekRes.json());
    expect(sought.playing).toBe(false);
    expect(sought.positionTicks).toBe(1920);
  });

  it("rejects invalid seek body", async () => {
    const res = await fetch(`${baseUrl}/api/transport/seek`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ positionTicks: 1.5 }),
    });
    expect(res.status).toBe(400);
  });

  it("WS sends transport_tick on connect and after seek", async () => {
    const ws = new WebSocket(wsUrl);
    const firstRaw = await new Promise<unknown>((resolve, reject) => {
      ws.once("error", reject);
      ws.once("message", (data) => {
        resolve(JSON.parse(String(data)));
      });
    });
    const first = TransportTickMessageSchema.parse(firstRaw);
    expect(first.type).toBe("transport_tick");
    expect(first.positionTicks).toBe(0);

    const secondPromise = new Promise<unknown>((resolve, reject) => {
      ws.once("error", reject);
      ws.once("message", (data) => {
        resolve(JSON.parse(String(data)));
      });
    });

    await fetch(`${baseUrl}/api/transport/seek`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ positionTicks: -100 }),
    });
    const second = TransportTickMessageSchema.parse(await secondPromise);
    expect(second.positionTicks).toBe(-100);

    await new Promise<void>((resolve) => {
      ws.once("close", () => resolve());
      ws.close();
    });
  });
});
