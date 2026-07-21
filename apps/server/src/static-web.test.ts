import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";

async function listenStatic(
  staticDir: string,
): Promise<{ server: Server; baseUrl: string }> {
  const { app } = createApp({ dataDir: await mkdtemp(join(tmpdir(), "ss-web-")), staticDir });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

describe("static web SPA", () => {
  let staticDir: string;
  let server: Server;
  let baseUrl: string;
  let prevShell: string | undefined;

  beforeEach(async () => {
    staticDir = await mkdtemp(join(tmpdir(), "ss-static-"));
    await writeFile(join(staticDir, "index.html"), "<!doctype html><title>spa</title>");
    prevShell = process.env.STAGESYNC_SHELL;
  });

  afterEach(async () => {
    if (prevShell === undefined) delete process.env.STAGESYNC_SHELL;
    else process.env.STAGESYNC_SHELL = prevShell;
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await rm(staticDir, { recursive: true, force: true });
  });

  it("serves index.html for unknown SPA routes", async () => {
    ({ server, baseUrl } = await listenStatic(staticDir));
    const res = await fetch(`${baseUrl}/admin`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("spa");
  });

  it("injects desktop shell marker for SPA routes when STAGESYNC_SHELL=desktop", async () => {
    process.env.STAGESYNC_SHELL = "desktop";
    await writeFile(
      join(staticDir, "index.html"),
      "<!doctype html><head></head><body>spa</body>",
    );
    ({ server, baseUrl } = await listenStatic(staticDir));
    const res = await fetch(`${baseUrl}/admin`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('window.__STAGESYNC_SHELL__="desktop"');
    expect(html).toContain("spa");
  });

  it("redirects / to /admin when STAGESYNC_SHELL=desktop", async () => {
    process.env.STAGESYNC_SHELL = "desktop";
    ({ server, baseUrl } = await listenStatic(staticDir));
    const res = await fetch(`${baseUrl}/`, { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin");
  });

  it("does not redirect / when STAGESYNC_SHELL is unset (browser / Docker)", async () => {
    delete process.env.STAGESYNC_SHELL;
    ({ server, baseUrl } = await listenStatic(staticDir));
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("spa");
  });
});
