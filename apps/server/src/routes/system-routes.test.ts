import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../app.js";

describe("system routes — network / logs / apply-update / settings edges", () => {
  const dirs: string[] = [];
  const envKeys = [
    "STAGESYNC_UPDATER_URL",
    "STAGESYNC_UPDATER_TOKEN",
    "STAGESYNC_DISABLE_AUTO_UPDATE",
    "STAGESYNC_DISABLE_MDNS",
    "STAGESYNC_MDNS_PLATFORM",
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
    stash("STAGESYNC_MDNS_PLATFORM");
    process.env.STAGESYNC_DISABLE_MDNS = "1";
    delete process.env.STAGESYNC_MDNS_PLATFORM;
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

  it("GET /network mdnsEnabled when platform NSD advertises (Android)", async () => {
    stash("STAGESYNC_DISABLE_MDNS");
    stash("STAGESYNC_MDNS_PLATFORM");
    process.env.STAGESYNC_DISABLE_MDNS = "1";
    process.env.STAGESYNC_MDNS_PLATFORM = "1";
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-net-plat-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/network`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { mdnsEnabled: boolean };
      expect(body.mdnsEnabled).toBe(true);
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

  it("POST apply-update: 400 on invalid body", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-upd-bad-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const missingTarget = await fetch(`${baseUrl}/api/system/apply-update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(missingTarget.status).toBe(400);
      const missingBody = (await missingTarget.json()) as {
        ok?: boolean;
        error?: string;
      };
      expect(missingBody.ok).toBe(false);
      expect(String(missingBody.error ?? "")).toMatch(/Invalid body/i);

      const badTarget = await fetch(`${baseUrl}/api/system/apply-update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: "desktop" }),
      });
      expect(badTarget.status).toBe(400);

      const unknownKey = await fetch(`${baseUrl}/api/system/apply-update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: "host", extra: true }),
      });
      expect(unknownKey.status).toBe(400);
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
      const missingBody = (await missing.json()) as { error?: string };
      expect(missingBody.error ?? "").toMatch(/Watchtower|compose\.prod/i);

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

  it("POST restore returns 400 for corrupt ZIP archive", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-restore-bad-zip-"));
    dirs.push(dataDir);
    const zipPath = join(dataDir, "bad.zip");
    await writeFile(zipPath, "not-a-zip", "utf8");
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: zipPath, confirm: true }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok?: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(String(body.error ?? "")).toMatch(/ZIP|archiwum|odczytu/i);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("POST restore returns 400 for ZIP path traversal entry", async () => {
    const { buildStoreZip } = await import("../system/diagnostics-zip.js");
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-restore-trav-"));
    dirs.push(dataDir);
    const zipPath = join(dataDir, "evil.zip");
    await writeFile(
      zipPath,
      buildStoreZip([
        { name: "../outside.json", data: Buffer.from("x", "utf8") },
      ]),
    );
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: zipPath, confirm: true }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok?: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(String(body.error ?? "")).toMatch(/Niedozwolona|ścieżka/i);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("GET /logs/stream delivers SSE lines and cleans up on disconnect", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-sse-"));
    dirs.push(dataDir);
    const { app, logBuffer } = createApp({ dataDir });
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;
    try {
      const ac = new AbortController();
      const streamRes = await fetch(`${baseUrl}/api/system/logs/stream`, {
        signal: ac.signal,
      });
      expect(streamRes.status).toBe(200);
      expect(streamRes.headers.get("content-type")).toMatch(
        /text\/event-stream/,
      );

      logBuffer.push("info", "sse-line");
      const reader = streamRes.body!.getReader();
      const decoder = new TextDecoder();
      let chunk = "";
      for (let i = 0; i < 20; i++) {
        const { value, done } = await reader.read();
        if (done) break;
        chunk += decoder.decode(value, { stream: true });
        if (chunk.includes("sse-line")) break;
        await new Promise((r) => setTimeout(r, 10));
      }
      expect(chunk).toContain("sse-line");

      ac.abort();
      await expect(reader.read()).rejects.toThrow();
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("POST restore returns 400 for corrupt ZIP archive", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-restore-bad-zip-"));
    dirs.push(dataDir);
    const zipPath = join(dataDir, "bad.zip");
    await writeFile(zipPath, "not-a-zip", "utf8");
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: zipPath, confirm: true }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok?: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(String(body.error ?? "")).toMatch(/ZIP|archiwum|odczytu/i);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("POST restore returns 400 for ZIP path traversal entry", async () => {
    const { buildStoreZip } = await import("../system/diagnostics-zip.js");
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-restore-trav-"));
    dirs.push(dataDir);
    const zipPath = join(dataDir, "evil.zip");
    await writeFile(
      zipPath,
      buildStoreZip([
        { name: "../outside.json", data: Buffer.from("x", "utf8") },
      ]),
    );
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: zipPath, confirm: true }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok?: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(String(body.error ?? "")).toMatch(/Niedozwolona|ścieżka/i);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("GET /logs/stream delivers SSE lines and cleans up on disconnect", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-sys-sse-"));
    dirs.push(dataDir);
    const { app, logBuffer } = createApp({ dataDir });
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;
    try {
      const ac = new AbortController();
      const streamRes = await fetch(`${baseUrl}/api/system/logs/stream`, {
        signal: ac.signal,
      });
      expect(streamRes.status).toBe(200);
      expect(streamRes.headers.get("content-type")).toMatch(
        /text\/event-stream/,
      );

      logBuffer.push("info", "sse-line");
      const reader = streamRes.body!.getReader();
      const decoder = new TextDecoder();
      let chunk = "";
      for (let i = 0; i < 20; i++) {
        const { value, done } = await reader.read();
        if (done) break;
        chunk += decoder.decode(value, { stream: true });
        if (chunk.includes("sse-line")) break;
        await new Promise((r) => setTimeout(r, 10));
      }
      expect(chunk).toContain("sse-line");

      ac.abort();
      await expect(reader.read()).rejects.toThrow();
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
