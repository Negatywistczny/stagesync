import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  InvalidProjectIdError,
  assertSafeProjectId,
  assetFilePath,
  defaultDataDir,
  defaultSeedDir,
  projectAssetsDir,
  projectDir,
  projectFile,
  resolveDataPaths,
} from "./paths.js";

describe("storage/paths", () => {
  const prev: Record<string, string | undefined> = {};
  const keys = [
    "STAGESYNC_DATA_DIR",
    "STAGESYNC_REPO_DEV",
    "STAGESYNC_SEED_DIR",
    "HOME",
    "USERPROFILE",
  ] as const;

  afterEach(() => {
    for (const k of keys) {
      if (k in prev) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
        delete prev[k];
      }
    }
  });

  function stashEnv(): void {
    for (const k of keys) {
      if (!(k in prev)) prev[k] = process.env[k];
    }
  }

  it("resolveDataPaths builds library / projects / live-desk paths", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-paths-"));
    try {
      const paths = resolveDataPaths(dataDir);
      expect(paths.libraryFile).toBe(join(dataDir, "library", "library.json"));
      expect(paths.setlistFile).toBe(join(dataDir, "library", "setlist.json"));
      expect(paths.liveDeskFile).toBe(
        join(dataDir, "library", "live-desk.json"),
      );
      expect(paths.midiConfigFile).toBe(
        join(dataDir, "host", "midi-config.json"),
      );
      expect(paths.projectsDir).toBe(join(dataDir, "projects"));
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  it("defaultDataDir respects env / repo-dev / home", () => {
    stashEnv();
    delete process.env.STAGESYNC_REPO_DEV;
    delete process.env.HOME;
    delete process.env.USERPROFILE;

    process.env.STAGESYNC_DATA_DIR = "/tmp/ss-custom-data";
    expect(defaultDataDir()).toBe("/tmp/ss-custom-data");

    delete process.env.STAGESYNC_DATA_DIR;
    process.env.STAGESYNC_REPO_DEV = "1";
    expect(defaultDataDir()).toMatch(/[/\\]data$/);

    delete process.env.STAGESYNC_REPO_DEV;
    process.env.HOME = "/Users/test";
    expect(defaultDataDir()).toBe(
      join("/Users/test", "Documents", "StageSync"),
    );

    delete process.env.HOME;
    delete process.env.USERPROFILE;
    expect(defaultDataDir()).toMatch(/[/\\]data$/);
  });

  it("defaultSeedDir uses env override (absolute or relative)", () => {
    stashEnv();
    delete process.env.STAGESYNC_SEED_DIR;
    expect(defaultSeedDir()).toMatch(/data[/\\]library$/);

    process.env.STAGESYNC_SEED_DIR = "/opt/seed";
    expect(defaultSeedDir()).toBe("/opt/seed");
  });

  it("assertSafeProjectId + assetFilePath reject traversal", () => {
    const paths = resolveDataPaths("/tmp/ss-safe");
    const id = "00000000-0000-4000-8000-000000000001";
    expect(assertSafeProjectId(paths, id)).toBe(id);
    expect(projectDir(paths, id)).toBe(join(paths.projectsDir, id));
    expect(projectFile(paths, id)).toBe(
      join(paths.projectsDir, id, "project.json"),
    );
    expect(projectAssetsDir(paths, id)).toBe(
      join(paths.projectsDir, id, "assets"),
    );
    expect(assetFilePath(paths, id, "clip.wav")).toBe(
      join(paths.projectsDir, id, "assets", "clip.wav"),
    );

    expect(() => assertSafeProjectId(paths, "../escape")).toThrow();
    expect(() => assetFilePath(paths, id, "../x.wav")).toThrow(
      InvalidProjectIdError,
    );
    expect(() => assetFilePath(paths, id, "a/b.wav")).toThrow(
      InvalidProjectIdError,
    );
    expect(() => assetFilePath(paths, id, "")).toThrow(InvalidProjectIdError);
  });
});
