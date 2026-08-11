import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createLibraryRouter } from "./library.js";
import type { Stores } from "../storage/index.js";

describe("createLibraryRouter error paths", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()));
    });
    server = undefined;
  });

  async function listen(stores: Partial<Stores>): Promise<string> {
    const app = express();
    app.use(express.json());
    app.use("/api/library", createLibraryRouter(stores as Stores));
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it("maps getLibrary / batch / export store failures", async () => {
    const boom = new Error("library-down");
    const stores = {
      getLibrary: vi.fn(async () => {
        throw boom;
      }),
      batchMidiProgramIds: vi.fn(async () => {
        throw boom;
      }),
      getProject: vi.fn(async () => {
        throw boom;
      }),
    };

    const baseUrl = await listen(stores);

    const get = await fetch(`${baseUrl}/api/library`);
    expect(get.status).toBeGreaterThanOrEqual(400);
    expect(((await get.json()) as { ok: boolean }).ok).toBe(false);

    const batch = await fetch(`${baseUrl}/api/library/batch-midi-pc`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignments: [] }),
    });
    expect(batch.status).toBeGreaterThanOrEqual(400);
    expect(((await batch.json()) as { ok: boolean }).ok).toBe(false);

    const exp = await fetch(`${baseUrl}/api/library/export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(exp.status).toBeGreaterThanOrEqual(400);
    expect(((await exp.json()) as { ok: boolean }).ok).toBe(false);
  });
});
