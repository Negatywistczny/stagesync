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
  PutProjectBodySchema,
  type Library,
  type Project,
} from "@stagesync/shared";

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

function putBody(project: Project) {
  const { id, updatedAt, ...body } = project;
  void id;
  void updatedAt;
  return PutProjectBodySchema.parse(body);
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
    expect(created.formatVersion).toBe(2);
    expect(created.forma.clips.some((c) => c.kind === "countdown")).toBe(true);
    expect(
      created.forma.clips.find((c) => c.kind === "countdown")?.startTicks,
    ).toBe(-7680);
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

    const renamed = {
      ...created,
      name: "Renamed Song",
      forma: {
        clips: [
          ...created.forma.clips,
          {
            id: "forma-verse",
            name: "Verse",
            kind: "section" as const,
            startTicks: 7680,
            lengthTicks: 7680,
          },
        ],
      },
    };
    const putRes = await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(putBody(renamed)),
    });
    expect(putRes.status).toBe(200);
    const updated = ProjectSchema.parse(await putRes.json()) as Project;
    expect(updated.name).toBe("Renamed Song");
    expect(updated.forma.clips).toHaveLength(3);
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

  it("returns 400 for unknown PUT keys", async () => {
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    const created = ProjectSchema.parse(await createRes.json());
    const res = await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...putBody(created), legacy: true }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown project", async () => {
    const res = await fetch(
      `${baseUrl}/api/projects/00000000-0000-4000-8000-000000000000`,
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 400 for invalid project id", async () => {
    const res = await fetch(`${baseUrl}/api/projects/not-a-uuid`);
    expect(res.status).toBe(400);
  });

  it("seeds library.json into STAGESYNC_DATA_DIR on first read", async () => {
    const res = await fetch(`${baseUrl}/api/library`);
    expect(res.status).toBe(200);
    const library = LibrarySchema.parse(await res.json());
    expect(library).toEqual({ version: 1, projects: [] });
  });

  it("upgrades v1 project on GET", async () => {
    const id = "00000000-0000-4000-8000-000000000099";
    const v1 = {
      id,
      name: "Legacy",
      formatVersion: 1,
      updatedAt: "2026-07-19T12:00:00.000Z",
    };
    const { mkdir, writeFile } = await import("node:fs/promises");
    const projDir = join(dataDir, "projects", id);
    await mkdir(projDir, { recursive: true });
    await writeFile(join(projDir, "project.json"), JSON.stringify(v1));
    const lib = { version: 1, projects: [{ id, name: "Legacy" }] };
    await mkdir(join(dataDir, "library"), { recursive: true });
    await writeFile(
      join(dataDir, "library", "library.json"),
      JSON.stringify(lib),
    );

    const getRes = await fetch(`${baseUrl}/api/projects/${id}`);
    expect(getRes.status).toBe(200);
    const upgraded = ProjectSchema.parse(await getRes.json());
    expect(upgraded.formatVersion).toBe(2);
    expect(upgraded.forma.clips.length).toBeGreaterThan(0);
  });

  it("concurrent creates keep library consistent", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        fetch(`${baseUrl}/api/projects`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: `Song ${i}` }),
        }),
      ),
    );
    expect(results.every((r) => r.status === 201)).toBe(true);
    const library = LibrarySchema.parse(
      await (await fetch(`${baseUrl}/api/library`)).json(),
    );
    expect(library.projects).toHaveLength(5);
    const ids = new Set(library.projects.map((p) => p.id));
    expect(ids.size).toBe(5);
  });
});
