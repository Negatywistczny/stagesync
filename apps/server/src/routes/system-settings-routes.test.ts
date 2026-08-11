import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createLogBuffer } from "../system/log-buffer.js";
import { createSystemRouter } from "./system.js";

describe("GET/PUT /api/system/settings (router unit)", () => {
  let server: Server | undefined;
  const dirs: string[] = [];

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
      server = undefined;
    }
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

  async function listen(dataDir: string): Promise<{ baseUrl: string }> {
    const router = createSystemRouter({
      logBuffer: createLogBuffer(),
      dataDir,
      version: "9.9.9-test",
    });
    const app = express();
    app.use(express.json());
    app.use("/api/system", router);
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return { baseUrl: `http://127.0.0.1:${port}` };
  }

  it("GET settings returns schema, values, and resolved paths", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-settings-router-"));
    dirs.push(dataDir);
    const { baseUrl } = await listen(dataDir);

    const res = await fetch(`${baseUrl}/api/system/settings`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toMatch(/no-store/i);
    const body = (await res.json()) as {
      values: Record<string, unknown>;
      schema: Record<string, { label: string }>;
      resolved: { dataDir: string | null; backupsDir: string | null };
      restartRequired: boolean;
    };
    expect(body.schema.PORT?.label).toMatch(/Port/i);
    expect(body.values).toHaveProperty("PORT");
    expect(body.resolved.dataDir).toBe(dataDir);
    expect(body.resolved.backupsDir).toBe(join(dataDir, "backups"));
    expect(body.restartRequired).toBe(true);
  });

  it("PUT settings fail-fast on invalid body and bad PORT", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-settings-put-"));
    dirs.push(dataDir);
    const { baseUrl } = await listen(dataDir);

    const missing = await fetch(`${baseUrl}/api/system/settings`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(missing.status).toBe(400);
    expect((await missing.json()) as { ok?: boolean }).toMatchObject({
      ok: false,
    });

    const badPort = await fetch(`${baseUrl}/api/system/settings`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ values: { PORT: 0 } }),
    });
    expect(badPort.status).toBe(400);
    const badBody = (await badPort.json()) as { ok?: boolean; error?: string };
    expect(badBody.ok).toBe(false);
    expect(String(badBody.error ?? "")).toMatch(/PORT|minimum|Pole|Invalid/i);
  });

  it("PUT settings returns restartKeys when network keys change", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-settings-restart-"));
    dirs.push(dataDir);
    const { baseUrl } = await listen(dataDir);

    const get = await fetch(`${baseUrl}/api/system/settings`);
    const current = (await get.json()) as {
      values: Record<string, string | number | boolean>;
    };
    const prevHost = String(current.values.STAGESYNC_BIND_HOST ?? "0.0.0.0");
    const nextHost = prevHost === "0.0.0.0" ? "127.0.0.1" : "0.0.0.0";

    const res = await fetch(`${baseUrl}/api/system/settings`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        values: {
          ...current.values,
          STAGESYNC_BIND_HOST: nextHost,
        },
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      restartRequired: boolean;
      restartKeys: string[];
    };
    expect(body.ok).toBe(true);
    expect(body.restartRequired).toBe(true);
    expect(body.restartKeys).toContain("STAGESYNC_BIND_HOST");
  });
});
