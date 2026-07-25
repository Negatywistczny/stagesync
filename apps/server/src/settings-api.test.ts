import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.js";

describe("GET/PUT /api/system/settings + browse", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    vi.unstubAllEnvs();
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

  it("PUT settings returns 400 on missing values object", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-settings-body-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/settings`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok?: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(String(body.error ?? "")).toMatch(/Invalid body/i);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("PUT settings returns 400 when values is not an object", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-settings-arr-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/system/settings`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values: ["PORT"] }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok?: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(String(body.error ?? "")).toMatch(/Invalid body/i);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("POST restore restores sibling .bak into dataDir", async () => {
    const dataDir = await mkdtemp(join(homedir(), ".stagesync-restore-api-"));
    dirs.push(dataDir);
    const live = join(dataDir, "library.json");
    await writeFile(live, '{"v":1}', "utf8");
    const bak = `${live}.schema.bak`;
    await writeFile(bak, '{"v":2}', "utf8");
    const { server, baseUrl } = await listen(dataDir);
    try {
      const bad = await fetch(`${baseUrl}/api/system/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: bak }),
      });
      expect(bad.status).toBe(400);

      const res = await fetch(`${baseUrl}/api/system/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: bak, confirm: true }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        ok: boolean;
        targetPath: string;
        shadowed: string | null;
      };
      expect(body.ok).toBe(true);
      expect(body.targetPath).toBe(live);
      expect(body.shadowed).toBe(`${live}.pre-restore.bak`);
      expect(await readFile(live, "utf8")).toBe('{"v":2}');
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("POST restore requires operator PIN when configured", async () => {
    vi.stubEnv("STAGESYNC_OPERATOR_PIN", "4242");
    const dataDir = await mkdtemp(join(homedir(), ".stagesync-restore-pin-"));
    dirs.push(dataDir);
    const live = join(dataDir, "library.json");
    await writeFile(live, '{"v":1}', "utf8");
    const bak = `${live}.schema.bak`;
    await writeFile(bak, '{"v":2}', "utf8");
    const { server, baseUrl } = await listen(dataDir);
    try {
      const denied = await fetch(`${baseUrl}/api/system/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: bak, confirm: true }),
      });
      expect(denied.status).toBe(403);

      const res = await fetch(`${baseUrl}/api/system/restore`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-stagesync-operator-pin": "4242",
        },
        body: JSON.stringify({ path: bak, confirm: true }),
      });
      expect(res.status).toBe(200);
      expect(await readFile(live, "utf8")).toBe('{"v":2}');
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
