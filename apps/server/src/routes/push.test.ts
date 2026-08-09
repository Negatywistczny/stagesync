import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../app.js";
import { createPushTokenStore } from "../push/tokens.js";

async function listen(
  dataDir: string,
): Promise<{ server: Server; baseUrl: string }> {
  const { app } = createApp({ dataDir, disableFileLogs: true });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

describe("push routes (#810)", () => {
  const dirs: string[] = [];
  const servers: Server[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (s) =>
          new Promise<void>((resolve) => {
            s.close(() => resolve());
          }),
      ),
    );
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

  it("exposes public config without secrets", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-push-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    servers.push(server);
    const res = await fetch(`${baseUrl}/api/push/config`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ fcmAvailable: false });
  });

  it("registers and unregisters a token", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-push-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    servers.push(server);

    const reg = await fetch(`${baseUrl}/api/push/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "fcm-token-abcdefgh",
        platform: "android-performer",
        deviceLabel: "Pixel",
      }),
    });
    expect(reg.status).toBe(201);
    expect((await reg.json()).ok).toBe(true);

    const store = createPushTokenStore(dataDir);
    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.platform).toBe("android-performer");

    const raw = await readFile(
      join(dataDir, "host", "push-tokens.json"),
      "utf8",
    );
    expect(raw).toContain("fcm-token-abcdefgh");

    const del = await fetch(`${baseUrl}/api/push/tokens`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "fcm-token-abcdefgh" }),
    });
    expect(del.status).toBe(200);
    expect(await store.list()).toHaveLength(0);
  });

  it("rejects invalid register body", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-push-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    servers.push(server);
    const res = await fetch(`${baseUrl}/api/push/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "short", platform: "android-performer" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
  });
});
