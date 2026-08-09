import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import {
  APK_DOWNLOAD_FILES,
  defaultApkBundleDir,
  isUsableApkFile,
  resolveApkFilePath,
  resolveApkPath,
  resolveDownloadsDir,
} from "./downloads.js";

async function listenApp(dataDir: string): Promise<{
  server: Server;
  baseUrl: string;
}> {
  const { app } = createApp({
    dataDir,
    staticDir: null,
    disableFileLogs: true,
  });
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
  /** Parent of seed + sibling downloads (cleaned as one tree). */
  let productRoot: string | undefined;
  let prevSeed: string | undefined;
  let prevBundle: string | undefined;
  let prevDownloads: string | undefined;

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
    if (productRoot) {
      await rm(productRoot, { recursive: true, force: true });
      productRoot = undefined;
    }
    if (prevSeed === undefined) delete process.env.STAGESYNC_SEED_DIR;
    else process.env.STAGESYNC_SEED_DIR = prevSeed;
    if (prevBundle === undefined) delete process.env.STAGESYNC_APK_BUNDLE_DIR;
    else process.env.STAGESYNC_APK_BUNDLE_DIR = prevBundle;
    if (prevDownloads === undefined) delete process.env.STAGESYNC_DOWNLOADS_DIR;
    else process.env.STAGESYNC_DOWNLOADS_DIR = prevDownloads;
    prevSeed = undefined;
    prevBundle = undefined;
    prevDownloads = undefined;
  });

  function snapshotEnv(): void {
    prevSeed = process.env.STAGESYNC_SEED_DIR;
    prevBundle = process.env.STAGESYNC_APK_BUNDLE_DIR;
    prevDownloads = process.env.STAGESYNC_DOWNLOADS_DIR;
    delete process.env.STAGESYNC_DOWNLOADS_DIR;
    delete process.env.STAGESYNC_APK_BUNDLE_DIR;
  }

  async function withIsolatedSeed(): Promise<{
    seedDir: string;
    bundleDir: string;
  }> {
    productRoot = await mkdtemp(join(tmpdir(), "ss-apk-product-"));
    const seedDir = join(productRoot, "seed");
    const bundleDir = join(productRoot, "downloads");
    await mkdir(seedDir, { recursive: true });
    process.env.STAGESYNC_SEED_DIR = seedDir;
    return { seedDir, bundleDir };
  }

  it("returns clear 404 text when performer APK is missing", async () => {
    snapshotEnv();
    dataDir = await mkdtemp(join(tmpdir(), "ss-apk-"));
    await withIsolatedSeed();
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
    snapshotEnv();
    dataDir = await mkdtemp(join(tmpdir(), "ss-apk-"));
    await withIsolatedSeed();
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
    snapshotEnv();
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
    snapshotEnv();
    dataDir = await mkdtemp(join(tmpdir(), "ss-apk-"));
    await withIsolatedSeed();
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

  it("falls back to product bundle next to seed when dataDir has no APK", async () => {
    snapshotEnv();
    dataDir = await mkdtemp(join(tmpdir(), "ss-apk-data-"));
    const { bundleDir } = await withIsolatedSeed();
    expect(defaultApkBundleDir()).toBe(bundleDir);
    await mkdir(bundleDir, { recursive: true });
    const payload = Buffer.from("bundled-performer");
    await writeFile(join(bundleDir, APK_DOWNLOAD_FILES.performer), payload);

    expect(resolveApkFilePath(dataDir, "performer")).toBe(
      join(bundleDir, APK_DOWNLOAD_FILES.performer),
    );

    const listened = await listenApp(dataDir);
    server = listened.server;
    const res = await fetch(
      `${listened.baseUrl}/downloads/${APK_DOWNLOAD_FILES.performer}`,
    );
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer())).toEqual(payload);
  });

  it("prefers dataDir downloads over bundle", async () => {
    snapshotEnv();
    dataDir = await mkdtemp(join(tmpdir(), "ss-apk-data-"));
    const { bundleDir } = await withIsolatedSeed();
    await mkdir(bundleDir, { recursive: true });
    await writeFile(
      join(bundleDir, APK_DOWNLOAD_FILES.performer),
      Buffer.from("bundle"),
    );
    const localDir = join(dataDir, "downloads");
    await mkdir(localDir, { recursive: true });
    await writeFile(
      join(localDir, APK_DOWNLOAD_FILES.performer),
      Buffer.from("local"),
    );

    expect(resolveApkFilePath(dataDir, "performer")).toBe(
      join(localDir, APK_DOWNLOAD_FILES.performer),
    );
    expect(isUsableApkFile(join(localDir, APK_DOWNLOAD_FILES.performer))).toBe(
      true,
    );
  });

  it("honors STAGESYNC_APK_BUNDLE_DIR override", async () => {
    snapshotEnv();
    dataDir = await mkdtemp(join(tmpdir(), "ss-apk-data-"));
    overrideDir = await mkdtemp(join(tmpdir(), "ss-apk-bundle-"));
    process.env.STAGESYNC_APK_BUNDLE_DIR = overrideDir;
    const payload = Buffer.from("env-bundle");
    await writeFile(join(overrideDir, APK_DOWNLOAD_FILES.console), payload);

    expect(defaultApkBundleDir()).toBe(overrideDir);
    expect(resolveApkFilePath(dataDir, "console")).toBe(
      join(overrideDir, APK_DOWNLOAD_FILES.console),
    );
  });
});
