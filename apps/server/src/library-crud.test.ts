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
  const { id, ...body } = project;
  void id;
  return PutProjectBodySchema.parse(body);
}

function playableProjects(library: Library) {
  return library.projects.filter((p) => p.isTemplate !== true);
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
    expect(created.formatVersion).toBe(5);
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
    expect(playableProjects(library)).toHaveLength(1);
    expect(library.projects.find((p) => p.id === created.id)?.name).toBe(
      "First Song",
    );

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
    expect(
      listAfter.projects.find((p) => p.id === created.id)?.name,
    ).toBe("Renamed Song");

    const delRes = await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: "DELETE",
    });
    expect(delRes.status).toBe(204);

    const missing = await fetch(`${baseUrl}/api/projects/${created.id}`);
    expect(missing.status).toBe(404);

    const emptyLib = LibrarySchema.parse(
      await (await fetch(`${baseUrl}/api/library`)).json(),
    );
    expect(playableProjects(emptyLib)).toHaveLength(0);
    expect(emptyLib.projects.some((p) => p.isTemplate === true)).toBe(true);
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
    const errBody = await res.json();
    expect(errBody.ok).toBe(false);
    expect(Array.isArray(errBody.details)).toBe(true);
  });

  it("returns 409 on stale updatedAt (OCC)", async () => {
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "OCC" }),
    });
    const created = ProjectSchema.parse(await createRes.json());
    const first = await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(putBody({ ...created, name: "OCC-1" })),
    });
    expect(first.status).toBe(200);
    const stale = await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(putBody({ ...created, name: "OCC-stale" })),
    });
    expect(stale.status).toBe(409);
    const body = await stale.json();
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

  it("returns 400 for invalid project id", async () => {
    const res = await fetch(`${baseUrl}/api/projects/not-a-uuid`);
    expect(res.status).toBe(400);
  });

  it("seeds library.json with default Template on first read", async () => {
    const res = await fetch(`${baseUrl}/api/library`);
    expect(res.status).toBe(200);
    const library = LibrarySchema.parse(await res.json());
    expect(library.version).toBe(1);
    expect(library.projects).toHaveLength(1);
    expect(library.projects[0]?.name).toBe("Template");
    expect(library.projects[0]?.isTemplate).toBe(true);

    const id = library.projects[0]!.id;
    const getRes = await fetch(`${baseUrl}/api/projects/${id}`);
    expect(getRes.status).toBe(200);
    const project = ProjectSchema.parse(await getRes.json());
    expect(project.isTemplate).toBe(true);
    expect(project.midiProgramId).toBeUndefined();
    expect(project.forma.clips.some((c) => c.kind === "countdown")).toBe(true);
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
    expect(upgraded.formatVersion).toBe(5);
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
    expect(library.projects).toHaveLength(6);
    expect(playableProjects(library)).toHaveLength(5);
    const ids = new Set(library.projects.map((p) => p.id));
    expect(ids.size).toBe(6);
  });

  it("POST /api/library/import auto-detects legacy database.json", async () => {
    const legacy = {
      schemaVersion: 4,
      songs: [
        {
          id: "song-legacy-1",
          title: "Legacy Import",
          tempo: 120,
          markers: [{ id: "mk-end", kind: "END", startAbs: 16 }],
          sections: [
            { id: 0, name: "Countdown", startAbs: 0 },
            { id: 1, name: "Verse", startAbs: 8 },
          ],
          chords: { timeSignature: "4/4", clips: [] },
        },
      ],
    };
    const res = await fetch(`${baseUrl}/api/library/import`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(legacy),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      format: string;
      created: string[];
      library: unknown;
    };
    expect(body.ok).toBe(true);
    expect(body.format).toBe("legacy-database");
    expect(body.created).toHaveLength(1);
    const library = LibrarySchema.parse(body.library);
    expect(library.projects.some((p) => p.name === "Legacy Import")).toBe(true);

    const project = ProjectSchema.parse(
      await (
        await fetch(`${baseUrl}/api/projects/${body.created[0]}`)
      ).json(),
    );
    expect(project.formatVersion).toBe(5);
    expect(project.forma.clips.length).toBeGreaterThan(0);
  });

  it("POST /api/library/import rejects unknown JSON", async () => {
    const res = await fetch(`${baseUrl}/api/library/import`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ foo: 1 }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Nieznany format|projects|songs/);
  });

  it("POST /api/library/import accepts docs typical legacy fixture", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const repoRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );
    const raw = JSON.parse(
      await readFile(
        join(repoRoot, "docs/examples/legacy/database.typical.json"),
        "utf8",
      ),
    );
    const res = await fetch(`${baseUrl}/api/library/import`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(raw),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      format: string;
      created: string[];
    };
    expect(body.ok).toBe(true);
    expect(body.format).toBe("legacy-database");
    expect(body.created).toHaveLength(2);
  });

  it("POST /api/library/import accepts v5 pack fixture", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const repoRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );
    const raw = JSON.parse(
      await readFile(
        join(
          repoRoot,
          "docs/examples/v5/library.pack.sample.stagesync.json",
        ),
        "utf8",
      ),
    );
    const res = await fetch(`${baseUrl}/api/library/import`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(raw),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      format: string;
      created: string[];
    };
    expect(body.ok).toBe(true);
    expect(body.format).toBe("v5-pack");
    expect(body.created).toHaveLength(1);
    const project = ProjectSchema.parse(
      await (
        await fetch(`${baseUrl}/api/projects/${body.created[0]}`)
      ).json(),
    );
    expect(project.name).toBe("Pack Sample");
  });
});
