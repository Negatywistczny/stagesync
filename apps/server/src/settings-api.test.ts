import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.js";

describe("GET/PUT /api/system/settings + browse", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  async function listen(dataDir: string): Promise<{ server: Server; baseUrl: string }> {
    const { app } = createApp({ dataDir });
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return { server, baseUrl: `http://127.0.0.1:${port}` };
  }

  it("GET settings returns schema + values", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-settings-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/settings`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { values: Record<string, unknown>; schema: Record<string, { label: string }> };
      expect(body.schema.PORT?.label).toMatch(/Port/i);
      expect(body.values).toHaveProperty("PORT");
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("PUT settings fail-fast on bad PORT", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-settings-bad-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/settings`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values: { PORT: 0 } }),
      });
      expect([400, 500]).toContain(res.status);
      const body = (await res.json()) as { ok?: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(String(body.error ?? "")).toMatch(/PORT|minimum|Pole|Invalid/i);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("GET browse lists allowed directory", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-browse-api-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/browse?mode=dir&path=${encodeURIComponent(dataDir)}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { canSelectCurrent: boolean };
      expect(body.canSelectCurrent).toBe(true);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
