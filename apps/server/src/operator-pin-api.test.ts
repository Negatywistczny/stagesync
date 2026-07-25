import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.js";

describe("Operator PIN ACL", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    vi.unstubAllEnvs();
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

  it("reports required=false when PIN unset; mutations work", async () => {
    vi.stubEnv("STAGESYNC_OPERATOR_PIN", "");
    const dataDir = await mkdtemp(join(tmpdir(), "ss-pin-off-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const auth = await fetch(`${baseUrl}/api/system/operator-auth`);
      expect(auth.status).toBe(200);
      expect(await auth.json()).toEqual({ required: false });

      const create = await fetch(`${baseUrl}/api/projects`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "No PIN" }),
      });
      expect(create.status).toBe(201);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("gates project PUT without PIN and allows with header (AUTH-01-AC1)", async () => {
    vi.stubEnv("STAGESYNC_OPERATOR_PIN", "4242");
    const dataDir = await mkdtemp(join(tmpdir(), "ss-pin-on-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const auth = await fetch(`${baseUrl}/api/system/operator-auth`);
      expect(await auth.json()).toEqual({ required: true });

      const badUnlock = await fetch(`${baseUrl}/api/system/operator-auth`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: "0000" }),
      });
      expect(badUnlock.status).toBe(403);

      const goodUnlock = await fetch(`${baseUrl}/api/system/operator-auth`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: "4242" }),
      });
      expect(goodUnlock.status).toBe(200);

      const create = await fetch(`${baseUrl}/api/projects`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Gated" }),
      });
      expect(create.status).toBe(403);

      const createOk = await fetch(`${baseUrl}/api/projects`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-stagesync-operator-pin": "4242",
        },
        body: JSON.stringify({ name: "Gated" }),
      });
      expect(createOk.status).toBe(201);
      const project = (await createOk.json()) as Record<string, unknown> & {
        id: string;
        name: string;
      };

      const putBad = await fetch(`${baseUrl}/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...project, name: "Hacked" }),
      });
      expect(putBad.status).toBe(403);

      const { id: _id, ...putBody } = project;
      void _id;
      const putOk = await fetch(`${baseUrl}/api/projects/${project.id}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-stagesync-pin": "4242",
        },
        body: JSON.stringify({ ...putBody, name: "Renamed" }),
      });
      expect(putOk.status).toBe(200);
      expect(((await putOk.json()) as { name: string }).name).toBe("Renamed");

      const play = await fetch(`${baseUrl}/api/transport/play`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(play.status).not.toBe(403);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
