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
});
