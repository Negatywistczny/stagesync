import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createAssetsRouter } from "./routes/assets.js";
import { NotFoundError, type Stores } from "./storage/index.js";

describe("createAssetsRouter error paths", () => {
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
    app.use(
      "/api/projects/:id/assets",
      createAssetsRouter(stores as Stores),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it("maps store failures on list/delete/file", async () => {
    const notFound = new NotFoundError("missing");
    const stores = {
      getProject: vi.fn(async () => {
        throw notFound;
      }),
      deleteProjectAsset: vi.fn(async () => {
        throw notFound;
      }),
      getAssetFilePath: vi.fn(async () => {
        throw notFound;
      }),
      addProjectAsset: vi.fn(),
    };

    const baseUrl = await listen(stores);

    expect((await fetch(`${baseUrl}/api/projects/p1/assets`)).status).toBe(404);
    expect(
      (
        await fetch(`${baseUrl}/api/projects/p1/assets/a1`, {
          method: "DELETE",
        })
      ).status,
    ).toBe(404);
    expect(
      (await fetch(`${baseUrl}/api/projects/p1/assets/a1/file`)).status,
    ).toBe(404);
  });

  it("rejects missing file field and unsupported extensions", async () => {
    const stores = {
      getProject: vi.fn(),
      addProjectAsset: vi.fn(),
      deleteProjectAsset: vi.fn(),
      getAssetFilePath: vi.fn(),
    };
    const baseUrl = await listen(stores);

    const missing = await fetch(`${baseUrl}/api/projects/p1/assets`, {
      method: "POST",
      body: new FormData(),
    });
    expect(missing.status).toBe(400);
    expect(((await missing.json()) as { ok: boolean }).ok).toBe(false);

    const form = new FormData();
    form.append(
      "file",
      new Blob(["x"], { type: "text/plain" }),
      "notes.txt",
    );
    const badExt = await fetch(`${baseUrl}/api/projects/p1/assets`, {
      method: "POST",
      body: form,
    });
    expect(badExt.status).toBe(400);
    expect(((await badExt.json()) as { ok: boolean }).ok).toBe(false);
    expect(stores.addProjectAsset).not.toHaveBeenCalled();
  });

  it("maps addProjectAsset store failures after a valid upload", async () => {
    const boom = new Error("disk-full");
    const stores = {
      getProject: vi.fn(),
      addProjectAsset: vi.fn(async () => {
        throw boom;
      }),
      deleteProjectAsset: vi.fn(),
      getAssetFilePath: vi.fn(),
    };
    const baseUrl = await listen(stores);

    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" }),
      "kick.wav",
    );
    const res = await fetch(`${baseUrl}/api/projects/p1/assets`, {
      method: "POST",
      body: form,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(false);
  });
});
