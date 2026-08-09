import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import {
  HealthResponseSchema,
  PROTOCOL_VERSION,
  UiManifestSchema,
} from "@stagesync/shared";
import { createApp } from "./app.js";
import { loadUiMeta, UI_UNAVAILABLE_HASH } from "./ui-meta.js";

describe("ui-meta / health (#692)", () => {
  let dataDir: string;
  let staticDir: string;
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
      server = undefined;
    }
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
    if (staticDir) await rm(staticDir, { recursive: true, force: true });
  });

  it("loadUiMeta returns none without static dir", () => {
    const meta = loadUiMeta(null);
    expect(meta.uiHash).toBe(UI_UNAVAILABLE_HASH);
    expect(meta.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(meta.assets).toEqual([]);
    expect(meta.uiHashPerformer).toBeUndefined();
    expect(meta.uiHashConsole).toBeUndefined();
  });

  it("health includes protocolVersion + uiHash from manifest", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-ui-data-"));
    staticDir = await mkdtemp(join(tmpdir(), "ss-ui-static-"));
    await writeFile(
      join(staticDir, "index.html"),
      "<!doctype html><title>t</title>",
    );
    await writeFile(
      join(staticDir, "ui-manifest.json"),
      JSON.stringify({
        protocolVersion: PROTOCOL_VERSION,
        uiHash: "hash-from-build",
        assets: [{ path: "/index.html", hash: "aa", size: 28 }],
      }),
    );
    await writeFile(
      join(staticDir, "ui-bundle.zip"),
      Buffer.from("PK\u0003\u0004fake"),
    );
    await writeFile(
      join(staticDir, "ui-role-hashes.json"),
      JSON.stringify({
        uiHashPerformer: "perf-hash",
        uiHashConsole: "cons-hash",
      }),
    );
    await writeFile(
      join(staticDir, "ui-manifest-performer.json"),
      JSON.stringify({
        protocolVersion: PROTOCOL_VERSION,
        uiHash: "perf-hash",
        assets: [{ path: "/index.html", hash: "bb", size: 10 }],
      }),
    );
    await writeFile(
      join(staticDir, "ui-bundle-performer.zip"),
      Buffer.from("PK\u0003\u0004perf"),
    );
    await writeFile(
      join(staticDir, "ui-bundle-console.zip"),
      Buffer.from("PK\u0003\u0004cons"),
    );

    const { app } = createApp({
      dataDir,
      staticDir,
      disableFileLogs: true,
    });
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;

    const healthRes = await fetch(`${base}/api/health`);
    expect(healthRes.status).toBe(200);
    const health = HealthResponseSchema.parse(await healthRes.json());
    expect(health.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(health.uiHash).toBe("hash-from-build");
    expect(health.uiHashPerformer).toBe("perf-hash");
    expect(health.uiHashConsole).toBe("cons-hash");

    const manRes = await fetch(`${base}/api/ui-manifest`);
    expect(manRes.status).toBe(200);
    const man = UiManifestSchema.parse(await manRes.json());
    expect(man.uiHash).toBe("hash-from-build");
    expect(man.assets).toHaveLength(1);

    const roleManRes = await fetch(`${base}/api/ui-manifest?role=performer`);
    expect(roleManRes.status).toBe(200);
    const roleMan = UiManifestSchema.parse(await roleManRes.json());
    expect(roleMan.uiHash).toBe("perf-hash");

    const zipRes = await fetch(`${base}/downloads/ui-bundle.zip`);
    expect(zipRes.status).toBe(200);
    expect(zipRes.headers.get("content-type")).toMatch(/zip/);

    const perfZip = await fetch(`${base}/downloads/ui-bundle-performer.zip`);
    expect(perfZip.status).toBe(200);
    const consZip = await fetch(`${base}/downloads/ui-bundle-console.zip`);
    expect(consZip.status).toBe(200);
  });

  it("health without static still exposes protocol + none hash", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-ui-nostatic-"));
    staticDir = ""; // unused
    const { app } = createApp({
      dataDir,
      staticDir: null,
      disableFileLogs: true,
    });
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const health = HealthResponseSchema.parse(
      await (await fetch(`http://127.0.0.1:${port}/api/health`)).json(),
    );
    expect(health.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(health.uiHash).toBe(UI_UNAVAILABLE_HASH);
    expect(health.uiHashPerformer).toBeUndefined();

    const zipRes = await fetch(
      `http://127.0.0.1:${port}/downloads/ui-bundle.zip`,
    );
    expect(zipRes.status).toBe(404);
  });

  it("loadUiMeta ignores invalid ui-hash.json and keeps none", async () => {
    staticDir = await mkdtemp(join(tmpdir(), "ss-ui-bad-"));
    await writeFile(join(staticDir, "ui-hash.json"), "{not-json");
    const meta = loadUiMeta(staticDir);
    expect(meta.uiHash).toBe(UI_UNAVAILABLE_HASH);
    expect(meta.assets).toEqual([]);
  });
});
