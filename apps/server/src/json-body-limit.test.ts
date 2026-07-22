import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("express JSON body limit", () => {
  let server: Server;
  let baseUrl: string;
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-json-"));
    const { app } = createApp({ dataDir, staticDir: null });
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await rm(dataDir, { recursive: true, force: true });
  });

  it("returns JSON 413 when body exceeds limit", async () => {
    const huge = "x".repeat(2 * 1024 * 1024 + 1024);
    const res = await fetch(`${baseUrl}/api/health`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pad: huge }),
    });
    expect(res.status).toBe(413);
    expect(res.headers.get("content-type")).toMatch(/json/);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "Payload too large",
    });
  });
});
