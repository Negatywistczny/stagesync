import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.js";
import { createLiveDeskStore } from "./live-desk.js";

describe("GET/PATCH /api/live-desk", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

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

  it("GET defaults then PATCH persists and fans out fields", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-live-desk-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const get1 = await fetch(`${baseUrl}/api/live-desk`);
      expect(get1.status).toBe(200);
      const defaults = (await get1.json()) as {
        transpositionSemitones: number;
        syncLeadMs: number;
        clientEditEnabled: boolean;
      };
      expect(defaults.transpositionSemitones).toBe(0);
      expect(typeof defaults.clientEditEnabled).toBe("boolean");

      const patch = await fetch(`${baseUrl}/api/live-desk`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transpositionSemitones: 2,
          syncLeadMs: 40,
          clientEditEnabled: true,
        }),
      });
      expect(patch.status).toBe(200);
      const next = (await patch.json()) as typeof defaults;
      expect(next).toMatchObject({
        transpositionSemitones: 2,
        syncLeadMs: 40,
        clientEditEnabled: true,
      });

      const get2 = await fetch(`${baseUrl}/api/live-desk`);
      expect(await get2.json()).toMatchObject(next);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("fail-fast on invalid PATCH body", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-live-desk-bad-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await fetch(`${baseUrl}/api/live-desk`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transpositionSemitones: 99 }),
      });
      expect(res.status).toBe(400);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});

describe("createLiveDeskStore", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

  it("loads existing file, emits on patch, snapshotMessage", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-live-desk-store-"));
    dirs.push(dataDir);
    const filePath = join(dataDir, "library", "live-desk.json");
    await mkdir(join(dataDir, "library"), { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify({
        transpositionSemitones: -1,
        syncLeadMs: 10,
        clientEditEnabled: true,
      }),
      "utf8",
    );

    const store = createLiveDeskStore(filePath);
    const seen: unknown[] = [];
    const unsub = store.onMessage((msg) => seen.push(msg));

    expect(await store.get()).toMatchObject({
      transpositionSemitones: -1,
      syncLeadMs: 10,
      clientEditEnabled: true,
    });
    expect(store.snapshotMessage().type).toBe("live_desk");

    await store.patch({ syncLeadMs: 25 });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      type: "live_desk",
      syncLeadMs: 25,
      transpositionSemitones: -1,
    });

    const disk = JSON.parse(await readFile(filePath, "utf8")) as {
      syncLeadMs: number;
    };
    expect(disk.syncLeadMs).toBe(25);

    unsub();
    await store.patch({ syncLeadMs: 30 });
    expect(seen).toHaveLength(1);
  });

  it("seeds defaults when file missing or corrupt", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-live-desk-seed-"));
    dirs.push(dataDir);
    const filePath = join(dataDir, "library", "live-desk.json");
    await mkdir(join(dataDir, "library"), { recursive: true });
    await writeFile(filePath, "{not-json", "utf8");

    const store = createLiveDeskStore(filePath);
    const settings = await store.get();
    expect(settings.transpositionSemitones).toBe(0);
    expect(settings.clientEditEnabled).toBe(true);
  });
});
