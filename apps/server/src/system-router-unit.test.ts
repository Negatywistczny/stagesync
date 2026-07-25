import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createLogBuffer } from "./log-buffer.js";
import { createSystemRouter } from "./routes/system.js";

describe("createSystemRouter unit edges", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()));
    });
    server = undefined;
  });

  async function listen(
    router: express.Router,
  ): Promise<{ baseUrl: string }> {
    const app = express();
    app.use(express.json());
    app.use("/api/system", router);
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return { baseUrl: `http://127.0.0.1:${port}` };
  }

  it("diagnostics/export returns 501 without dataDir", async () => {
    const { baseUrl } = await listen(
      createSystemRouter({ logBuffer: createLogBuffer() }),
    );
    const res = await fetch(`${baseUrl}/api/system/diagnostics/export`);
    expect(res.status).toBe(501);
  });

  it("shutdown reports pm2 flag when under PM2", async () => {
    process.env.pm_id = "1";
    try {
      const lifecycle = {
        isShuttingDown: () => false,
        gracefulShutdown: () => {},
        scheduleProcessRestart: () => {},
      };
      const { baseUrl } = await listen(
        createSystemRouter({ logBuffer: createLogBuffer(), lifecycle }),
      );
      const res = await fetch(`${baseUrl}/api/system/shutdown`, {
        method: "POST",
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ ok: true, pm2: true });
    } finally {
      delete process.env.pm_id;
    }
  });

  it("GET /network and POST /logs/clear work without lifecycle", async () => {
    const logBuffer = createLogBuffer();
    logBuffer.push("info", "keep");
    const { baseUrl } = await listen(
      createSystemRouter({
        logBuffer,
        port: 4321,
        version: "9.9.9-test",
      }),
    );

    const prev = process.env.STAGESYNC_DISABLE_MDNS;
    process.env.STAGESYNC_DISABLE_MDNS = "1";
    try {
      const net = await fetch(`${baseUrl}/api/system/network`);
      expect(net.status).toBe(200);
      expect(net.headers.get("cache-control")).toMatch(/no-store/i);
      const body = (await net.json()) as {
        port: number;
        version: string;
        mdnsEnabled: boolean;
        urls: string[];
      };
      expect(body.port).toBe(4321);
      expect(body.version).toBe("9.9.9-test");
      expect(body.mdnsEnabled).toBe(false);
      expect(body.urls.some((u) => u.includes("localhost:4321"))).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.STAGESYNC_DISABLE_MDNS;
      else process.env.STAGESYNC_DISABLE_MDNS = prev;
    }

    const clear = await fetch(`${baseUrl}/api/system/logs/clear`, {
      method: "POST",
    });
    expect(clear.status).toBe(200);
    expect(await clear.json()).toEqual({ ok: true });
    expect(logBuffer.getLines()).toEqual([]);
  });
});
