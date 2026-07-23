import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.js";

describe("system routes — network / logs / apply-update / settings edges", () => {
  const dirs: string[] = [];
  const envKeys = [
    "STAGESYNC_UPDATER_URL",
    "STAGESYNC_UPDATER_TOKEN",
    "STAGESYNC_DISABLE_AUTO_UPDATE",
    "STAGESYNC_DISABLE_MDNS",
  ] as const;
  const prevEnv: Partial<Record<(typeof envKeys)[number], string | undefined>> =
    {};

  afterEach(async () => {
    vi.unstubAllGlobals();
    for (const k of envKeys) {
      if (k in prevEnv) {
        if (prevEnv[k] === undefined) delete process.env[k];
        else process.env[k] = prevEnv[k];
        delete prevEnv[k];
      }
    }
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

  function stash(k: (typeof envKeys)[number]): void {
    if (!(k in prevEnv)) prevEnv[k] = process.env[k];
  }

  async function listen(
    dataDir: string,
  ): Promise<{ server: Server; baseUrl: string }> {
    const { app } = createApp({ dataDir });
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return { server, baseUrl: `http://127.0.0.1:${port}` };
  }

  it("GET /network includes version and mdns flag", async () => {
    stash("STAGESYNC_DISABLE_MDNS");
    process.env.STAGESYNC_DISABLE_MDNS = "1";
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-net-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/network`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        version: string;
        mdnsEnabled: boolean;
        dataDir: string;
      };
      expect(body.mdnsEnabled).toBe(false);
      expect(body.dataDir).toBe(dataDir);
      expect(body.version).toBeTruthy();
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("GET/POST logs clear + stream headers", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-logs-"));
    dirs.push(dataDir);
    const { app, logBuffer } = createApp({ dataDir });
    logBuffer.push("info", "hello-log");
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;
    try {
      const get = await fetch(`${baseUrl}/api/system/logs`);
      expect(get.status).toBe(200);
      const lines = (await get.json()) as { lines: Array<{ msg: string }> };
      expect(lines.lines.some((l) => l.msg === "hello-log")).toBe(true);

      const clear = await fetch(`${baseUrl}/api/system/logs/clear`, {
        method: "POST",
      });
      expect(clear.status).toBe(200);
      expect(logBuffer.getLines()).toEqual([]);

      const ac = new AbortController();
      const streamRes = await fetch(`${baseUrl}/api/system/logs/stream`, {
        signal: ac.signal,
      });
      expect(streamRes.status).toBe(200);
      expect(streamRes.headers.get("content-type")).toMatch(
        /text\/event-stream/,
      );
      ac.abort();
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("POST apply-update: 501 without env; 200/502 with mocked Watchtower", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-upd-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    const realFetch = globalThis.fetch;
    try {
      const missing = await fetch(`${baseUrl}/api/system/apply-update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: "host" }),
      });
      expect(missing.status).toBe(501);

      stash("STAGESYNC_UPDATER_URL");
      stash("STAGESYNC_UPDATER_TOKEN");
      process.env.STAGESYNC_UPDATER_URL = "http://watchtower.test";
      process.env.STAGESYNC_UPDATER_TOKEN = "tok";

      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          if (url.includes("/v1/update")) {
            return new Response("ok", { status: 200 });
          }
          return realFetch(input, init);
        }),
      );

      const ok = await fetch(`${baseUrl}/api/system/apply-update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: "host" }),
      });
      expect(ok.status).toBe(200);
      expect(await ok.json()).toMatchObject({
        ok: true,
        action: "host-update-triggered",
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          if (url.includes("/v1/update")) {
            return new Response("nope", { status: 500 });
          }
          return realFetch(input, init);
        }),
      );
      const bad = await fetch(`${baseUrl}/api/system/apply-update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: "host" }),
      });
      expect(bad.status).toBe(502);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("GET update-status when auto-update disabled", async () => {
    stash("STAGESYNC_DISABLE_AUTO_UPDATE");
    process.env.STAGESYNC_DISABLE_AUTO_UPDATE = "1";
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-dis-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/update-status`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        updateAvailable: boolean;
        autoUpdateDisabled?: boolean;
      };
      expect(body.updateAvailable).toBe(false);
      expect(body.autoUpdateDisabled).toBe(true);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("diagnostics export skips non-log files in logs dir", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-diag-"));
    dirs.push(dataDir);
    const logsDir = join(dataDir, "logs");
    await mkdir(logsDir, { recursive: true });
    await writeFile(join(logsDir, "stagesync.log"), "keep\n");
    await writeFile(join(logsDir, "noise.txt"), "skip\n");
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/diagnostics/export`);
      expect(res.status).toBe(200);
      const buf = Buffer.from(await res.arrayBuffer());
      expect(buf.includes(Buffer.from("noise.txt"))).toBe(false);
      expect(buf.includes(Buffer.from("stagesync.log"))).toBe(true);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
