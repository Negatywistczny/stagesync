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
});
