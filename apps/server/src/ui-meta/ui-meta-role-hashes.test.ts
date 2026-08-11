import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PROTOCOL_VERSION } from "@stagesync/shared";
import { loadUiMeta, UI_UNAVAILABLE_HASH } from "../ui-meta.js";

describe("loadUiMeta role hash files", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    for (const dir of dirs.splice(0)) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reads per-role ui-hash-*.json when role manifests are absent", async () => {
    const staticDir = await mkdtemp(join(tmpdir(), "ss-ui-role-hash-"));
    dirs.push(staticDir);
    await writeFile(
      join(staticDir, "ui-hash-performer.json"),
      JSON.stringify({
        protocolVersion: PROTOCOL_VERSION,
        uiHash: "perf-file",
      }),
    );
    await writeFile(
      join(staticDir, "ui-hash-console.json"),
      JSON.stringify({
        protocolVersion: PROTOCOL_VERSION,
        uiHash: "cons-file",
      }),
    );

    const meta = loadUiMeta(staticDir);
    expect(meta.uiHash).toBe(UI_UNAVAILABLE_HASH);
    expect(meta.uiHashPerformer).toBe("perf-file");
    expect(meta.uiHashConsole).toBe("cons-file");
    expect(meta.roleManifests).toEqual({});
  });

  it("prefers role manifest uiHash over ui-hash-*.json", async () => {
    const staticDir = await mkdtemp(join(tmpdir(), "ss-ui-role-man-"));
    dirs.push(staticDir);
    await writeFile(
      join(staticDir, "ui-manifest-performer.json"),
      JSON.stringify({
        protocolVersion: PROTOCOL_VERSION,
        uiHash: "perf-manifest",
        assets: [],
      }),
    );
    await writeFile(
      join(staticDir, "ui-hash-performer.json"),
      JSON.stringify({
        protocolVersion: PROTOCOL_VERSION,
        uiHash: "perf-file",
      }),
    );

    const meta = loadUiMeta(staticDir);
    expect(meta.uiHashPerformer).toBe("perf-manifest");
    expect(meta.roleManifests.performer?.uiHash).toBe("perf-manifest");
  });

  it("ignores malformed ui-role-hashes.json without wiping role hashes", async () => {
    const staticDir = await mkdtemp(join(tmpdir(), "ss-ui-role-bad-"));
    dirs.push(staticDir);
    await writeFile(
      join(staticDir, "ui-hash-performer.json"),
      JSON.stringify({
        protocolVersion: PROTOCOL_VERSION,
        uiHash: "perf-file",
      }),
    );
    await writeFile(join(staticDir, "ui-role-hashes.json"), "{not-json");

    const meta = loadUiMeta(staticDir);
    expect(meta.uiHashPerformer).toBe("perf-file");
  });

  it("ignores invalid ui-hash-*.json missing protocolVersion", async () => {
    const staticDir = await mkdtemp(join(tmpdir(), "ss-ui-role-invalid-"));
    dirs.push(staticDir);
    await writeFile(
      join(staticDir, "ui-hash-performer.json"),
      JSON.stringify({ uiHash: "no-protocol" }),
    );

    const meta = loadUiMeta(staticDir);
    expect(meta.uiHashPerformer).toBeUndefined();
  });

  it("ui-role-hashes.json overrides empty / missing role file hashes", async () => {
    const staticDir = await mkdtemp(join(tmpdir(), "ss-ui-role-override-"));
    dirs.push(staticDir);
    await writeFile(
      join(staticDir, "ui-role-hashes.json"),
      JSON.stringify({
        uiHashPerformer: "from-roles",
        uiHashConsole: "",
      }),
    );

    const meta = loadUiMeta(staticDir);
    expect(meta.uiHashPerformer).toBe("from-roles");
    expect(meta.uiHashConsole).toBeUndefined();
  });
});
