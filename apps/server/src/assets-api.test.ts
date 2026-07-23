import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  ProjectSchema,
  PutProjectBodySchema,
  type Project,
} from "@stagesync/shared";
import { createApp } from "./app.js";

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

describe("project assets API", () => {
  let dataDir: string;
  let server: Server;
  let baseUrl: string;
  let projectId: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "stagesync-assets-"));
    ({ server, baseUrl } = await listen(dataDir));
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "With Audio" }),
    });
    const created = ProjectSchema.parse(await createRes.json());
    projectId = created.id;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await rm(dataDir, { recursive: true, force: true });
  });

  it("uploads audio and lists assets", async () => {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/wav" }),
      "kick.wav",
    );
    const up = await fetch(`${baseUrl}/api/projects/${projectId}/assets`, {
      method: "POST",
      body: form,
    });
    expect(up.status).toBe(201);
    const project = ProjectSchema.parse(await up.json());
    expect(project.assets).toHaveLength(1);
    expect(project.assets[0]?.originalName).toBe("kick.wav");
    expect(project.audioTracks.length).toBeGreaterThanOrEqual(1);
    expect(project.audioClips.length).toBeGreaterThanOrEqual(1);

    const list = await fetch(`${baseUrl}/api/projects/${projectId}/assets`);
    expect(list.status).toBe(200);
    const body = (await list.json()) as { assets: unknown[] };
    expect(body.assets).toHaveLength(1);
  });

  it("honors multipart trackId for the created audio clip", async () => {
    const form1 = new FormData();
    form1.append(
      "file",
      new Blob([new Uint8Array([1])], { type: "audio/wav" }),
      "kick.wav",
    );
    const up1 = await fetch(`${baseUrl}/api/projects/${projectId}/assets`, {
      method: "POST",
      body: form1,
    });
    expect(up1.status).toBe(201);
    const first = ProjectSchema.parse(await up1.json());
    expect(first.audioTracks.length).toBeGreaterThanOrEqual(1);

    const trackB = { id: "track-b", name: "Audio 2" };
    const seeded = {
      ...first,
      audioTracks: [...first.audioTracks, trackB],
    };
    const put = await fetch(`${baseUrl}/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(putBody(seeded)),
    });
    expect(put.status).toBe(200);

    const form2 = new FormData();
    form2.append(
      "file",
      new Blob([new Uint8Array([9, 9])], { type: "audio/wav" }),
      "snare.wav",
    );
    form2.append("trackId", trackB.id);
    const up2 = await fetch(`${baseUrl}/api/projects/${projectId}/assets`, {
      method: "POST",
      body: form2,
    });
    expect(up2.status).toBe(201);
    const project = ProjectSchema.parse(await up2.json());
    const clip = project.audioClips[project.audioClips.length - 1];
    expect(clip?.trackId).toBe(trackB.id);
    expect(clip?.assetId).toBe(project.assets.at(-1)?.id);
  });

  it("merge-preserves assets when PUT omits them", async () => {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array([9, 9])], { type: "audio/mpeg" }),
      "loop.mp3",
    );
    const up = await fetch(`${baseUrl}/api/projects/${projectId}/assets`, {
      method: "POST",
      body: form,
    });
    const withAsset = ProjectSchema.parse(await up.json());
    expect(withAsset.assets).toHaveLength(1);

    const stale = {
      ...putBody(withAsset),
      assets: [],
      audioTracks: [],
      audioClips: [],
    };
    const putRes = await fetch(`${baseUrl}/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(stale),
    });
    expect(putRes.status).toBe(200);
    const afterPut = ProjectSchema.parse(await putRes.json());
    expect(afterPut.assets).toHaveLength(1);
    expect(afterPut.assets[0]?.id).toBe(withAsset.assets[0]?.id);
  });

  it("deletes asset", async () => {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array([1])], { type: "audio/wav" }),
      "x.wav",
    );
    const up = await fetch(`${baseUrl}/api/projects/${projectId}/assets`, {
      method: "POST",
      body: form,
    });
    const project = ProjectSchema.parse(await up.json());
    const assetId = project.assets[0]!.id;
    const del = await fetch(
      `${baseUrl}/api/projects/${projectId}/assets/${assetId}`,
      { method: "DELETE" },
    );
    expect(del.status).toBe(200);
    const after = ProjectSchema.parse(await del.json());
    expect(after.assets).toHaveLength(0);
  });

  it("serves asset file with mime + rejects bad uploads", async () => {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array([10, 20, 30])], { type: "audio/flac" }),
      "pad.flac",
    );
    const up = await fetch(`${baseUrl}/api/projects/${projectId}/assets`, {
      method: "POST",
      body: form,
    });
    expect(up.status).toBe(201);
    const project = ProjectSchema.parse(await up.json());
    const assetId = project.assets[0]!.id;

    const file = await fetch(
      `${baseUrl}/api/projects/${projectId}/assets/${assetId}/file`,
    );
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toMatch(/audio\/flac|octet/i);
    const bytes = new Uint8Array(await file.arrayBuffer());
    expect([...bytes]).toEqual([10, 20, 30]);

    const missing = await fetch(
      `${baseUrl}/api/projects/${projectId}/assets/00000000-0000-4000-8000-000000000099/file`,
    );
    expect(missing.status).toBeGreaterThanOrEqual(400);

    const bad = new FormData();
    bad.append(
      "file",
      new Blob([new Uint8Array([1])], { type: "text/plain" }),
      "notes.txt",
    );
    const reject = await fetch(`${baseUrl}/api/projects/${projectId}/assets`, {
      method: "POST",
      body: bad,
    });
    expect(reject.status).toBe(400);

    const xml = new FormData();
    xml.append(
      "file",
      new Blob(["<?xml version='1.0'?><score-partwise/>"], {
        type: "application/xml",
      }),
      "score.musicxml",
    );
    const xmlUp = await fetch(`${baseUrl}/api/projects/${projectId}/assets`, {
      method: "POST",
      body: xml,
    });
    expect(xmlUp.status).toBe(201);
    const withXml = ProjectSchema.parse(await xmlUp.json());
    expect(withXml.assets.some((a) => a.kind === "musicxml")).toBe(true);

    for (const [name, type] of [
      ["a.ogg", ""],
      ["b.aiff", ""],
      ["c.m4a", ""],
      ["d.mp3", ""],
      ["e.mxl", ""],
    ] as const) {
      const f = new FormData();
      f.append("file", new Blob([new Uint8Array([1])], { type }), name);
      const r = await fetch(`${baseUrl}/api/projects/${projectId}/assets`, {
        method: "POST",
        body: f,
      });
      expect(r.status).toBe(201);
    }

    const empty = new FormData();
    const noFile = await fetch(`${baseUrl}/api/projects/${projectId}/assets`, {
      method: "POST",
      body: empty,
    });
    expect(noFile.status).toBe(400);
  });
});
