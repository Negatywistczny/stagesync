import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { createLiveDeskRouter } from "./live-desk.js";
import { createProjectsRouter } from "./projects.js";
import { createSetlistRouter } from "./setlist.js";
import { createTransportRouter } from "./transport.js";
import type { Stores } from "../storage/index.js";
import type { TransportEngine } from "../transport/engine.js";
import type { LiveDeskStore } from "../live-desk.js";

async function listen(app: express.Express): Promise<{
  server: Server;
  baseUrl: string;
}> {
  const server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

describe("selective route catch paths", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) =>
      server!.close((err) => (err ? reject(err) : resolve())),
    );
    server = undefined;
  });

  it("setlist / live-desk / projects / transport catch store failures", async () => {
    const boom = new Error("store-down");
    const stores = {
      getSetlist: vi.fn().mockRejectedValue(boom),
      getLibrary: vi.fn().mockRejectedValue(boom),
      putSetlist: vi.fn().mockRejectedValue(boom),
      patchSetlistAutoAdvance: vi.fn().mockRejectedValue(boom),
      createProject: vi.fn().mockRejectedValue(boom),
      getProject: vi.fn().mockRejectedValue(boom),
      putProject: vi.fn().mockRejectedValue(boom),
      deleteProject: vi.fn().mockRejectedValue(boom),
    } as unknown as Stores;

    const transport = {
      getActiveProjectId: () => null,
      toTickMessage: () => {
        throw boom;
      },
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn(),
      setLoop: vi.fn(),
      loadProject: vi.fn(),
    } as unknown as TransportEngine;

    const liveDesk = {
      get: vi.fn().mockRejectedValue(boom),
      patch: vi.fn().mockRejectedValue(boom),
    } as unknown as LiveDeskStore;

    const app = express();
    app.use(express.json());
    app.use("/api/setlist", createSetlistRouter(stores, transport));
    app.use("/api/live-desk", createLiveDeskRouter(liveDesk));
    app.use("/api/projects", createProjectsRouter(stores, transport));
    app.use("/api/transport", createTransportRouter(transport, stores));

    const listened = await listen(app);
    server = listened.server;
    const { baseUrl } = listened;

    const paths: Array<{ method: string; url: string; body?: unknown }> = [
      { method: "GET", url: "/api/setlist" },
      { method: "PUT", url: "/api/setlist", body: { enabled: true, items: [] } },
      {
        method: "PATCH",
        url: "/api/setlist/auto-advance",
        body: { enabled: true },
      },
      { method: "GET", url: "/api/live-desk" },
      {
        method: "PATCH",
        url: "/api/live-desk",
        body: { transposeSemitones: 1 },
      },
      { method: "POST", url: "/api/projects", body: { name: "X" } },
      {
        method: "DELETE",
        url: "/api/projects/00000000-0000-4000-8000-000000000001",
      },
      { method: "GET", url: "/api/transport" },
      { method: "POST", url: "/api/transport/play", body: {} },
      {
        method: "POST",
        url: "/api/transport/load",
        body: { projectId: "00000000-0000-4000-8000-000000000001" },
      },
      { method: "POST", url: "/api/transport/pause" },
      { method: "POST", url: "/api/transport/stop" },
      { method: "POST", url: "/api/transport/seek", body: { positionTicks: 0 } },
      { method: "POST", url: "/api/transport/loop", body: { enabled: false } },
    ];

    for (const p of paths) {
      const res = await fetch(`${baseUrl}${p.url}`, {
        method: p.method,
        headers: p.body ? { "content-type": "application/json" } : undefined,
        body: p.body ? JSON.stringify(p.body) : undefined,
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      const json = (await res.json()) as { ok: boolean };
      expect(json.ok).toBe(false);
    }
  });
});
