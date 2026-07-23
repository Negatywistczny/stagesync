import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.js";
import { createClientPresence } from "./client-presence.js";

describe("GET/POST/DELETE /api/stage", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

  async function listen(opts?: {
    dataDir?: string;
    presence?: ReturnType<typeof createClientPresence>;
  }): Promise<{ server: Server; baseUrl: string }> {
    const dataDir =
      opts?.dataDir ?? (await mkdtemp(join(tmpdir(), "ss-stage-")));
    dirs.push(dataDir);
    const { app } = createApp({
      dataDir,
      presence: opts?.presence,
    });
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return { server, baseUrl: `http://127.0.0.1:${port}` };
  }

  it("POST message → list → dismiss one → clear all", async () => {
    const { server, baseUrl } = await listen();
    try {
      const empty = await fetch(`${baseUrl}/api/stage/messages`);
      expect(empty.status).toBe(200);
      expect(await empty.json()).toEqual({ messages: [] });

      const post = await fetch(`${baseUrl}/api/stage/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: "TERAZ",
          roles: ["drums"],
          ttlMs: 0,
          priority: "alert",
        }),
      });
      expect(post.status).toBe(201);
      const created = (await post.json()) as {
        id: string;
        text: string;
        messages: Array<{ id: string }>;
      };
      expect(created.text).toBe("TERAZ");
      expect(created.messages).toHaveLength(1);

      const list = await fetch(`${baseUrl}/api/stage/messages`);
      expect(
        ((await list.json()) as { messages: unknown[] }).messages,
      ).toHaveLength(1);

      const dismiss = await fetch(
        `${baseUrl}/api/stage/messages/${created.id}`,
        { method: "DELETE" },
      );
      expect(dismiss.status).toBe(200);
      expect(
        ((await dismiss.json()) as { messages: unknown[] }).messages,
      ).toHaveLength(0);

      await fetch(`${baseUrl}/api/stage/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "A", ttlMs: 0 }),
      });
      await fetch(`${baseUrl}/api/stage/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "B", ttlMs: 0 }),
      });
      const clear = await fetch(`${baseUrl}/api/stage/messages`, {
        method: "DELETE",
      });
      expect(clear.status).toBe(200);
      expect(await clear.json()).toEqual({ ok: true, messages: [] });
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("fail-fast on invalid body; 404 on unknown dismiss id", async () => {
    const { server, baseUrl } = await listen();
    try {
      const bad = await fetch(`${baseUrl}/api/stage/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "" }),
      });
      expect(bad.status).toBe(400);

      const missing = await fetch(
        `${baseUrl}/api/stage/messages/does-not-exist`,
        { method: "DELETE" },
      );
      expect(missing.status).toBe(404);
      const body = (await missing.json()) as { ok?: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(body.error).toMatch(/not found/i);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("GET /clients returns presence list", async () => {
    const presence = createClientPresence();
    presence.connect("c1");
    presence.upsert("c1", { displayName: "Ada", roles: ["karaoke"] });
    const { server, baseUrl } = await listen({ presence });
    try {
      const res = await fetch(`${baseUrl}/api/stage/clients`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        clients: Array<{ id: string; displayName: string | null }>;
      };
      expect(body.clients).toHaveLength(1);
      expect(body.clients[0]?.displayName).toBe("Ada");
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
