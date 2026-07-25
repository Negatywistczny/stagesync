import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import {
  APK_DOWNLOAD_FILES,
  resolveApkPath,
  resolveDownloadsDir,
} from "./downloads.js";

async function listenApp(dataDir: string): Promise<{
  server: Server;
  baseUrl: string;
}> {
  const { app } = createApp({ dataDir, staticDir: null, disableFileLogs: true });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

describe("APK downloads", () => {
  let dataDir: string;
  let server: Server | undefined;
  let overrideDir: string | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
      server = undefined;
    }
    if (dataDir) {
      await rm(dataDir, { recursive: true, force: true });
    }
    if (overrideDir) {
      await rm(overrideDir, { recursive: true, force: true });
      overrideDir = undefined;
    }
    delete process.env.STAGESYNC_DOWNLOADS_DIR;
  });

  it("returns clear 404 text when performer APK is missing", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-apk-"));
    const listened = await listenApp(dataDir);
    server = listened.server;

    const res = await fetch(
      `${listened.baseUrl}/downloads/${APK_DOWNLOAD_FILES.performer}`,
    );
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).toContain("brak pliku");
    expect(text).toContain(APK_DOWNLOAD_FILES.performer);
  });

  it("serves performer APK bytes and supports HEAD", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-apk-"));
    const downloads = resolveDownloadsDir(dataDir);
    await mkdir(downloads, { recursive: true });
    const payload = Buffer.from("PK-fake-apk-content");
    await writeFile(resolveApkPath(downloads, "performer"), payload);

    const listened = await listenApp(dataDir);
    server = listened.server;
    const { baseUrl } = listened;

    const head = await fetch(
      `${baseUrl}/downloads/${APK_DOWNLOAD_FILES.performer}`,
      { method: "HEAD" },
    );
    expect(head.status).toBe(200);
    expect(head.headers.get("content-type")).toContain(
      "application/vnd.android.package-archive",
    );
    expect(head.headers.get("content-length")).toBe(String(payload.length));

    const get = await fetch(
      `${baseUrl}/downloads/${APK_DOWNLOAD_FILES.performer}`,
    );
    expect(get.status).toBe(200);
    expect(Buffer.from(await get.arrayBuffer())).toEqual(payload);
  });

  it("serves console APK from STAGESYNC_DOWNLOADS_DIR override", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-apk-"));
    overrideDir = await mkdtemp(join(tmpdir(), "ss-apk-ovr-"));
    process.env.STAGESYNC_DOWNLOADS_DIR = overrideDir;
    const payload = Buffer.from("console-apk");
    await writeFile(resolveApkPath(overrideDir, "console"), payload);

    const listened = await listenApp(dataDir);
    server = listened.server;
    const res = await fetch(
      `${listened.baseUrl}/downloads/${APK_DOWNLOAD_FILES.console}`,
    );
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer())).toEqual(payload);
  });

  it("treats empty APK file as missing", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-apk-"));
    const downloads = resolveDownloadsDir(dataDir);
    await mkdir(downloads, { recursive: true });
    await writeFile(resolveApkPath(downloads, "performer"), "");

    const listened = await listenApp(dataDir);
    server = listened.server;
    const res = await fetch(
      `${listened.baseUrl}/downloads/${APK_DOWNLOAD_FILES.performer}`,
    );
    expect(res.status).toBe(404);
  });
});
