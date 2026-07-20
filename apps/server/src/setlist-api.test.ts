import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { ProjectSchema } from "@stagesync/shared";
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

describe("setlist API", () => {
  let dataDir: string;
  let server: Server;
  let baseUrl: string;
  let idA: string;
  let idB: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "stagesync-setlist-"));
    ({ server, baseUrl } = await listen(dataDir));
    const a = ProjectSchema.parse(
      await (
        await fetch(`${baseUrl}/api/projects`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "A" }),
        })
      ).json(),
    );
    const b = ProjectSchema.parse(
      await (
        await fetch(`${baseUrl}/api/projects`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "B" }),
        })
      ).json(),
    );
    idA = a.id;
    idB = b.id;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await rm(dataDir, { recursive: true, force: true });
  });

  it("put and get setlist with next", async () => {
    const put = await fetch(`${baseUrl}/api/setlist`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true, projectIds: [idA, idB] }),
    });
    expect(put.status).toBe(200);
    const view = (await put.json()) as {
      enabled: boolean;
      entries: { name: string }[];
      next: { name: string } | null;
    };
    expect(view.enabled).toBe(true);
    expect(view.entries.map((e) => e.name)).toEqual(["A", "B"]);

    await fetch(`${baseUrl}/api/transport/play`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: idA }),
    });

    const get = await fetch(`${baseUrl}/api/setlist`);
    const live = (await get.json()) as {
      next: { name: string } | null;
      currentIndex: number;
    };
    expect(live.currentIndex).toBe(0);
    expect(live.next?.name).toBe("B");
  });

  it("patches auto-advance", async () => {
    const res = await fetch(`${baseUrl}/api/setlist/auto-advance`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    expect(res.status).toBe(200);
    const view = (await res.json()) as { autoAdvance: { enabled: boolean } };
    expect(view.autoAdvance.enabled).toBe(true);
  });
});
