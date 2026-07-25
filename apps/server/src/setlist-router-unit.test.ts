import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createSetlistRouter } from "./routes/setlist.js";
import type { Stores } from "./storage/index.js";
import type { TransportEngine } from "./transport/engine.js";
import type { SetlistHub } from "./transport/setlist-hub.js";

describe("createSetlistRouter edges", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()));
    });
    server = undefined;
  });

  async function listen(
    stores: Partial<Stores>,
    transport: TransportEngine,
    setlistHub?: SetlistHub,
  ): Promise<string> {
    const app = express();
    app.use(express.json());
    app.use(
      "/api/setlist",
      createSetlistRouter(stores as Stores, transport, setlistHub),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it("publishes hub on put and auto-advance; rejects bad bodies", async () => {
    const setlist = {
      enabled: true,
      items: [],
      autoAdvance: false,
    };
    const library = { projects: [] };
    const stores = {
      getSetlist: vi.fn(async () => setlist),
      getLibrary: vi.fn(async () => library),
      putSetlist: vi.fn(async (body: unknown) => ({
        ...setlist,
        ...(body as object),
      })),
      patchSetlistAutoAdvance: vi.fn(async (enabled: boolean) => ({
        ...setlist,
        autoAdvance: enabled,
      })),
    };
    const transport = {
      getActiveProjectId: () => null,
    } as unknown as TransportEngine;
    const publishFromView = vi.fn();
    const setlistHub = { publishFromView } as unknown as SetlistHub;

    const baseUrl = await listen(stores, transport, setlistHub);

    const bad = await fetch(`${baseUrl}/api/setlist`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    expect(bad.status).toBeGreaterThanOrEqual(400);

    const put = await fetch(`${baseUrl}/api/setlist`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true, items: [] }),
    });
    expect(put.status).toBe(200);
    expect(publishFromView).toHaveBeenCalled();

    publishFromView.mockClear();
    const patch = await fetch(`${baseUrl}/api/setlist/auto-advance`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    expect(patch.status).toBe(200);
    expect(publishFromView).toHaveBeenCalled();
  });
});
