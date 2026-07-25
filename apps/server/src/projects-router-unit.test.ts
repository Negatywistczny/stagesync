import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createProjectsRouter } from "./routes/projects.js";
import type { Stores } from "./storage/index.js";
import type { TransportEngine } from "./transport/engine.js";

describe("createProjectsRouter error and delete edges", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()));
    });
    server = undefined;
  });

  async function listen(
    stores: Partial<Stores>,
    transport?: TransportEngine,
  ): Promise<string> {
    const app = express();
    app.use(express.json());
    app.use("/api/projects", createProjectsRouter(stores as Stores, transport));
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it("clears active transport project on successful delete", async () => {
    const clearActiveIf = vi.fn();
    const stores = {
      deleteProject: vi.fn(async () => undefined),
    };
    const transport = { clearActiveIf } as unknown as TransportEngine;
    const id = "00000000-0000-4000-8000-0000000000aa";
    const baseUrl = await listen(stores, transport);

    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
    expect(clearActiveIf).toHaveBeenCalledWith(id);
  });

  it("maps get/put/create store failures", async () => {
    const boom = new Error("projects-down");
    const stores = {
      createProject: vi.fn(async () => {
        throw boom;
      }),
      getProject: vi.fn(async () => {
        throw boom;
      }),
      putProject: vi.fn(async () => {
        throw boom;
      }),
      deleteProject: vi.fn(async () => {
        throw boom;
      }),
    };
    const baseUrl = await listen(stores);

    const create = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(create.status).toBeGreaterThanOrEqual(400);

    const get = await fetch(
      `${baseUrl}/api/projects/00000000-0000-4000-8000-000000000001`,
    );
    expect(get.status).toBeGreaterThanOrEqual(400);

    const put = await fetch(
      `${baseUrl}/api/projects/00000000-0000-4000-8000-000000000001`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "X" }),
      },
    );
    expect(put.status).toBeGreaterThanOrEqual(400);

    const del = await fetch(
      `${baseUrl}/api/projects/00000000-0000-4000-8000-000000000001`,
      { method: "DELETE" },
    );
    expect(del.status).toBeGreaterThanOrEqual(400);
  });
});
