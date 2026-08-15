import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../app.js";

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

describe("RFC 2324 Coffee Easter Egg (/api/coffee, /api/brew)", () => {
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

  it("responds with HTTP 418 I'm a teapot on GET /api/coffee", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-coffee-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    servers.push(server);

    const res = await fetch(`${baseUrl}/api/coffee`);
    expect(res.status).toBe(418);
    expect(res.headers.get("x-guitar-tuning")).toBe("E-A-D-G-B-E");
    expect(res.headers.get("x-drummer-punctuality")).toBe("404 Not Found");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(false);
    expect(json.error).toBe("I'm a teapot");
    expect(json.rfc).toBe("RFC 2324");
    expect(json.temperature).toBe("93.5°C");
  });

  it("responds with HTTP 418 on POST /api/brew", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-coffee-brew-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    servers.push(server);

    const res = await fetch(`${baseUrl}/api/brew`, { method: "POST" });
    expect(res.status).toBe(418);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.error).toBe("I'm a teapot");
  });
});
