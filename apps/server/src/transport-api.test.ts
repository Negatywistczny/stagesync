import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import {
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

  it("GET /api/transport returns idle tick envelope", async () => {
    const res = await fetch(`${baseUrl}/api/transport`);
    expect(res.status).toBe(200);
    const tick = TransportTickMessageSchema.parse(await res.json());
    expect(tick.type).toBe("transport_tick");
    expect(typeof tick.serverTimeMs).toBe("number");
    expect(tick.playing).toBe(false);
    expect(tick.positionTicks).toBe(0);
  });

  it("play → pause → seek via REST", async () => {
    const playRes = await fetch(`${baseUrl}/api/transport/play`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(playRes.status).toBe(200);
    expect(TransportTickMessageSchema.parse(await playRes.json()).playing).toBe(
      true,
    );

    const pauseRes = await fetch(`${baseUrl}/api/transport/pause`, {
      method: "POST",
    });
    expect(pauseRes.status).toBe(200);
    expect(
      TransportTickMessageSchema.parse(await pauseRes.json()).playing,
    ).toBe(false);

    const seekRes = await fetch(`${baseUrl}/api/transport/seek`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ positionTicks: 1920 }),
    });
    expect(seekRes.status).toBe(200);
    const sought = TransportTickMessageSchema.parse(await seekRes.json());
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

  it("play with projectId sets activeProjectId and resolves bpm", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "stagesync-transport-"));
    const { app } = createApp({ dataDir });
    const localServer = createServer(app);
    await new Promise<void>((resolve) => {
      localServer.listen(0, "127.0.0.1", () => resolve());
    });
    const port = (localServer.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}`;

    try {
      const createRes = await fetch(`${url}/api/projects`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Transport Song" }),
      });
      const project = (await createRes.json()) as { id: string };

      const playRes = await fetch(`${url}/api/transport/play`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      expect(playRes.status).toBe(200);
      const state = TransportTickMessageSchema.parse(await playRes.json());
      expect(state.activeProjectId).toBe(project.id);
      expect(state.bpm).toBe(120);
      expect(state.playing).toBe(true);
      expect(state.type).toBe("transport_tick");
      expect(typeof state.serverTimeMs).toBe("number");
    } finally {
      await new Promise<void>((resolve) => localServer.close(() => resolve()));
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  it("stop with active project seeks to Countdown start (#41)", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "stagesync-transport-stop-"));
    const transport = createTransportEngine();
    const { app } = createApp({ dataDir, transport });
    const localServer = createServer(app);
    await new Promise<void>((resolve) => {
      localServer.listen(0, "127.0.0.1", () => resolve());
    });
    const port = (localServer.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}`;

    try {
      const createRes = await fetch(`${url}/api/projects`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Stop Home" }),
      });
      const project = (await createRes.json()) as {
        id: string;
        forma: { clips: Array<{ kind: string; startTicks: number }> };
      };
      const cdStart = project.forma.clips.find((c) => c.kind === "countdown")
        ?.startTicks;
      expect(cdStart).toBeLessThan(0);

      await fetch(`${url}/api/transport/play`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      await fetch(`${url}/api/transport/seek`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ positionTicks: 1920 }),
      });

      const stopRes = await fetch(`${url}/api/transport/stop`, {
        method: "POST",
      });
      expect(stopRes.status).toBe(200);
      const stopped = TransportTickMessageSchema.parse(await stopRes.json());
      expect(stopped.playing).toBe(false);
      expect(stopped.positionTicks).toBe(cdStart);
      expect(stopped.type).toBe("transport_tick");
    } finally {
      transport.dispose();
      await new Promise<void>((resolve) => localServer.close(() => resolve()));
      await rm(dataDir, { recursive: true, force: true });
    }
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
