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
});
