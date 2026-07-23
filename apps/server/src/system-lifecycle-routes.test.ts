import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.js";
import type { Lifecycle } from "./lifecycle.js";

describe("system restart / shutdown + lifecycle ACL edges", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

  async function listenWithLifecycle(lifecycle: Lifecycle): Promise<{
    server: Server;
    baseUrl: string;
  }> {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-life-"));
    dirs.push(dataDir);
    const { app } = createApp({ dataDir, lifecycle });
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return { server, baseUrl: `http://127.0.0.1:${port}` };
  }

  it("POST /restart and /shutdown invoke lifecycle", async () => {
    const gracefulShutdown = vi.fn();
    const scheduleProcessRestart = vi.fn();
    const lifecycle: Lifecycle = {
      isShuttingDown: () => false,
      gracefulShutdown,
      scheduleProcessRestart,
    };
    const { server, baseUrl } = await listenWithLifecycle(lifecycle);

    const restart = await fetch(`${baseUrl}/api/system/restart`, {
      method: "POST",
    });
    expect(restart.status).toBe(200);
    expect(await restart.json()).toMatchObject({ ok: true, action: "restart" });

    const shutdown = await fetch(`${baseUrl}/api/system/shutdown`, {
      method: "POST",
    });
    expect(shutdown.status).toBe(200);
    expect(await shutdown.json()).toMatchObject({
      ok: true,
      action: "shutdown",
    });

    await vi.waitFor(() => {
      expect(scheduleProcessRestart).toHaveBeenCalled();
      expect(gracefulShutdown).toHaveBeenCalledWith("admin_restart", {
        restart: true,
      });
      expect(gracefulShutdown).toHaveBeenCalledWith("admin_shutdown");
    });

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("returns 501 without lifecycle and 409 when already shutting down", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-nolife-"));
    dirs.push(dataDir);
    const { app } = createApp({ dataDir });
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const noLife = await fetch(`${baseUrl}/api/system/restart`, {
      method: "POST",
    });
    expect(noLife.status).toBe(501);

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

    const busy: Lifecycle = {
      isShuttingDown: () => true,
      gracefulShutdown: vi.fn(),
      scheduleProcessRestart: vi.fn(),
    };
    const listened = await listenWithLifecycle(busy);
    const conflict = await fetch(`${listened.baseUrl}/api/system/shutdown`, {
      method: "POST",
    });
    expect(conflict.status).toBe(409);
    await new Promise<void>((resolve, reject) => {
      listened.server.close((err) => (err ? reject(err) : resolve()));
    });
  });
});
