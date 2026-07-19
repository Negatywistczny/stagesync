import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  LibrarySchema,
  ProjectSchema,
  type Library,
  type Project,
} from "@stagesync/shared";

async function listen(
  dataDir: string,
): Promise<{ server: Server; baseUrl: string }> {
  const app = createApp({ dataDir });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

describe("library / projects CRUD", () => {
  let dataDir: string;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "stagesync-crud-"));
    ({ server, baseUrl } = await listen(dataDir));
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await rm(dataDir, { recursive: true, force: true });
  });

  it("create → get → list → update → delete", async () => {
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "First Song" }),
    });
    expect(createRes.status).toBe(201);
    const created = ProjectSchema.parse(await createRes.json());
    expect(created.name).toBe("First Song");
    expect(created.formatVersion).toBe(1);
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    const getRes = await fetch(`${baseUrl}/api/projects/${created.id}`);
    expect(getRes.status).toBe(200);
    const loaded = ProjectSchema.parse(await getRes.json());
    expect(loaded).toEqual(created);

    const listRes = await fetch(`${baseUrl}/api/library`);
    expect(listRes.status).toBe(200);
    const library = LibrarySchema.parse(await listRes.json()) as Library;
    expect(library.version).toBe(1);
    expect(library.projects).toHaveLength(1);
    expect(library.projects[0]?.id).toBe(created.id);
    expect(library.projects[0]?.name).toBe("First Song");

    const putRes = await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Renamed Song" }),
    });
    expect(putRes.status).toBe(200);
    const updated = ProjectSchema.parse(await putRes.json()) as Project;
    expect(updated.name).toBe("Renamed Song");
    expect(updated.id).toBe(created.id);
    expect(updated.updatedAt >= created.updatedAt).toBe(true);

    const listAfter = LibrarySchema.parse(
      await (await fetch(`${baseUrl}/api/library`)).json(),
    );
    expect(listAfter.projects[0]?.name).toBe("Renamed Song");

    const delRes = await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: "DELETE",
    });
    expect(delRes.status).toBe(204);

    const missing = await fetch(`${baseUrl}/api/projects/${created.id}`);
    expect(missing.status).toBe(404);

    const emptyLib = LibrarySchema.parse(
      await (await fetch(`${baseUrl}/api/library`)).json(),
    );
    expect(emptyLib.projects).toEqual([]);
  });

  it("returns 400 for invalid create body", async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  it("returns 404 for unknown project", async () => {
    const res = await fetch(
      `${baseUrl}/api/projects/00000000-0000-4000-8000-000000000000`,
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("seeds library.json into STAGESYNC_DATA_DIR on first read", async () => {
    const res = await fetch(`${baseUrl}/api/library`);
    expect(res.status).toBe(200);
    const library = LibrarySchema.parse(await res.json());
    expect(library).toEqual({ version: 1, projects: [] });
  });
});
