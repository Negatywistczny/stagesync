import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REPO_ROOT } from "../storage/paths.js";
import { resolveStaticDir } from "./static-web.js";

describe("resolveStaticDir", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    vi.unstubAllEnvs();
    for (const dir of dirs.splice(0)) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns null when STAGESYNC_STATIC_DIR is unset", () => {
    delete process.env.STAGESYNC_STATIC_DIR;
    expect(resolveStaticDir()).toBeNull();
  });

  it("returns null when env points at a dir without index.html", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-static-miss-"));
    dirs.push(dir);
    vi.stubEnv("STAGESYNC_STATIC_DIR", dir);
    expect(resolveStaticDir()).toBeNull();
  });

  it("accepts absolute dir with index.html", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-static-ok-"));
    dirs.push(dir);
    await writeFile(join(dir, "index.html"), "<html></html>");
    vi.stubEnv("STAGESYNC_STATIC_DIR", dir);
    expect(resolveStaticDir()).toBe(dir);
  });

  it("resolves relative env path from repo root", async () => {
    const dir = join(REPO_ROOT, "data", `.ss-static-rel-${Date.now()}`);
    dirs.push(dir);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), "<html></html>");
    const relFromRoot = dir.slice(REPO_ROOT.length + 1);
    vi.stubEnv("STAGESYNC_STATIC_DIR", relFromRoot);
    expect(resolveStaticDir()).toBe(dir);
  });
});
