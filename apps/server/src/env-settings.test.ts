import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  normalizeIncomingValue,
  parseEnvContent,
  readManagedSettings,
  releaseMatchesUpdateChannel,
  SETTINGS_SCHEMA,
  writeManagedSettings,
} from "./env-settings.js";

describe("env-settings", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  it("normalizes PORT and rejects out of range", () => {
    expect(normalizeIncomingValue("PORT", "8080", SETTINGS_SCHEMA.PORT)).toBe("8080");
    expect(() => normalizeIncomingValue("PORT", "0", SETTINGS_SCHEMA.PORT)).toThrow(/minimum/);
  });

  it("round-trips managed settings", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-env-"));
    dirs.push(dir);
    const envPath = join(dir, ".env");
    await writeFile(envPath, "FOO=bar\nPORT=4000\n", "utf8");
    const written = writeManagedSettings(
      { PORT: 4500, STAGESYNC_BIND_HOST: "127.0.0.1", STAGESYNC_DISABLE_MDNS: true, STAGESYNC_UPDATE_CHANNEL: "beta" },
      envPath,
    );
    expect(written.values.PORT).toBe("4500");
    expect(written.values.STAGESYNC_DISABLE_MDNS).toBe(true);
    const raw = parseEnvContent(await readFile(envPath, "utf8"));
    expect(raw.FOO).toBe("bar");
  });

  it("filters update channel", () => {
    expect(releaseMatchesUpdateChannel("5.0.0", false, "stable")).toBe(true);
    expect(releaseMatchesUpdateChannel("5.0.0-beta.2", true, "stable")).toBe(false);
    expect(releaseMatchesUpdateChannel("5.0.0-beta.2", true, "beta")).toBe(true);
  });
});
