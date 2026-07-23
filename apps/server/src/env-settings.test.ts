import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getSettingsSchemaForClient,
  listRestartRequiredKeys,
  loadDotenvIntoProcess,
  normalizeIncomingValue,
  parseEnvContent,
  readManagedSettings,
  releaseMatchesUpdateChannel,
  SETTINGS_SCHEMA,
  writeManagedSettings,
  type ManagedSettingsValues,
} from "./env-settings.js";

describe("env-settings", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

  it("parses quoted values, comments, and skips bad lines", () => {
    const parsed = parseEnvContent(
      [
        "# comment",
        "",
        "NOEQ",
        'QUOTED="hello \\"world\\\\"',
        "SINGLE='x'",
        "PLAIN=ok",
      ].join("\n"),
    );
    expect(parsed.QUOTED).toBe('hello "world\\');
    expect(parsed.SINGLE).toBe("x");
    expect(parsed.PLAIN).toBe("ok");
    expect(parsed.NOEQ).toBeUndefined();
  });

  it("normalizes PORT and rejects out of range / non-number", () => {
    expect(normalizeIncomingValue("PORT", "8080", SETTINGS_SCHEMA.PORT)).toBe(
      "8080",
    );
    expect(normalizeIncomingValue("PORT", "1.5", SETTINGS_SCHEMA.PORT)).toBe(
      "1.5",
    );
    expect(() =>
      normalizeIncomingValue("PORT", "0", SETTINGS_SCHEMA.PORT),
    ).toThrow(/minimum/);
    expect(() =>
      normalizeIncomingValue("PORT", "70000", SETTINGS_SCHEMA.PORT),
    ).toThrow(/maksimum/);
    expect(() =>
      normalizeIncomingValue("PORT", "nope", SETTINGS_SCHEMA.PORT),
    ).toThrow(/liczba/);
  });

  it("normalizes boolean / enum / string edges", () => {
    expect(
      normalizeIncomingValue(
        "STAGESYNC_DISABLE_MDNS",
        false,
        SETTINGS_SCHEMA.STAGESYNC_DISABLE_MDNS,
      ),
    ).toBeNull();
    expect(
      normalizeIncomingValue(
        "STAGESYNC_DISABLE_MDNS",
        "",
        SETTINGS_SCHEMA.STAGESYNC_DISABLE_MDNS,
      ),
    ).toBeNull();
    expect(
      normalizeIncomingValue(
        "STAGESYNC_DISABLE_MDNS",
        "yes",
        SETTINGS_SCHEMA.STAGESYNC_DISABLE_MDNS,
      ),
    ).toBe("1");
    expect(
      normalizeIncomingValue(
        "STAGESYNC_DISABLE_MDNS",
        "no",
        SETTINGS_SCHEMA.STAGESYNC_DISABLE_MDNS,
      ),
    ).toBeNull();

    expect(() =>
      normalizeIncomingValue("LOG_LEVEL", "trace", SETTINGS_SCHEMA.LOG_LEVEL),
    ).toThrow(/niedozwolona/);
    expect(
      normalizeIncomingValue("LOG_LEVEL", "debug", SETTINGS_SCHEMA.LOG_LEVEL),
    ).toBe("debug");

    expect(normalizeIncomingValue("PORT", "", SETTINGS_SCHEMA.PORT)).toBeNull();
    expect(() =>
      normalizeIncomingValue(
        "STAGESYNC_DATA_DIR",
        "x".repeat(300),
        SETTINGS_SCHEMA.STAGESYNC_DATA_DIR,
      ),
    ).toThrow(/za długa/);
    expect(
      normalizeIncomingValue(
        "STAGESYNC_DATA_DIR",
        "./data",
        SETTINGS_SCHEMA.STAGESYNC_DATA_DIR,
      ),
    ).toBe("./data");
  });

  it("round-trips managed settings and formats escaped values", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-env-"));
    dirs.push(dir);
    const envPath = join(dir, ".env");
    await writeFile(envPath, "FOO=bar\nPORT=4000\n", "utf8");
    const written = writeManagedSettings(
      {
        PORT: 4500,
        STAGESYNC_BIND_HOST: "127.0.0.1",
        STAGESYNC_DISABLE_MDNS: true,
        STAGESYNC_UPDATE_CHANNEL: "beta",
        STAGESYNC_DATA_DIR: 'path with "quotes" and # hash',
        STAGESYNC_DISABLE_AUTO_UPDATE: false,
      },
      envPath,
    );
    expect(written.values.PORT).toBe("4500");
    expect(written.values.STAGESYNC_DISABLE_MDNS).toBe(true);
    const raw = parseEnvContent(await readFile(envPath, "utf8"));
    expect(raw.FOO).toBe("bar");
    expect(raw.STAGESYNC_DATA_DIR).toContain("quotes");

    writeManagedSettings(
      { STAGESYNC_UPDATE_CHANNEL: "", STAGESYNC_DISABLE_AUTO_UPDATE: true },
      envPath,
    );
    expect(process.env.STAGESYNC_DISABLE_AUTO_UPDATE).toBe("1");
    writeManagedSettings({ STAGESYNC_DISABLE_AUTO_UPDATE: false }, envPath);
    expect(process.env.STAGESYNC_DISABLE_AUTO_UPDATE).toBeUndefined();
  });

  it("loads dotenv only for unset process keys", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-dotenv-"));
    dirs.push(dir);
    const envPath = join(dir, ".env");
    await writeFile(envPath, "SS_TEST_A=from-file\nSS_TEST_B=file-b\n", "utf8");
    process.env.SS_TEST_A = "preexisting";
    delete process.env.SS_TEST_B;
    loadDotenvIntoProcess(envPath);
    expect(process.env.SS_TEST_A).toBe("preexisting");
    expect(process.env.SS_TEST_B).toBe("file-b");
    delete process.env.SS_TEST_A;
    delete process.env.SS_TEST_B;
    loadDotenvIntoProcess(join(dir, "missing.env"));
  });

  it("reads missing env as empty form values and exposes schema", () => {
    const missing = join(tmpdir(), `ss-env-missing-${Date.now()}`, "nope.env");
    const { values, envExists } = readManagedSettings(missing);
    expect(envExists).toBe(false);
    expect(values.PORT).toBe("");
    expect(values.STAGESYNC_DISABLE_MDNS).toBe(false);

    const schema = getSettingsSchemaForClient();
    expect(schema.PORT?.label).toMatch(/Port/i);
    expect(schema.PORT?.options).toBeNull();
    expect(schema.LOG_LEVEL?.options).toContain("debug");
    expect(schema.STAGESYNC_DATA_DIR?.pathKind).toBe("dir");
  });

  it("lists restart-required keys that changed", () => {
    const before = {
      PORT: "4000",
      STAGESYNC_BIND_HOST: "0.0.0.0",
      STAGESYNC_DISABLE_MDNS: false,
      LOG_LEVEL: "info",
      STAGESYNC_DISABLE_AUTO_UPDATE: false,
      STAGESYNC_UPDATE_CHANNEL: "stable",
      STAGESYNC_DATA_DIR: "",
      STAGESYNC_BACKUPS_DIR: "",
      STAGESYNC_ASSETS_DIR: "",
    } as ManagedSettingsValues;
    const after = { ...before, PORT: "4500", STAGESYNC_UPDATE_CHANNEL: "beta" };
    expect(listRestartRequiredKeys(before, after)).toEqual(["PORT"]);
  });

  it("filters update channel including rc and unknown", () => {
    expect(releaseMatchesUpdateChannel("5.0.0", false, "stable")).toBe(true);
    expect(releaseMatchesUpdateChannel("v5.0.0-beta.2", true, "stable")).toBe(
      false,
    );
    expect(releaseMatchesUpdateChannel("5.0.0-beta.2", true, "beta")).toBe(
      true,
    );
    expect(releaseMatchesUpdateChannel("5.0.0", false, "beta")).toBe(true);
    expect(releaseMatchesUpdateChannel("5.0.0-rc.1", true, "rc")).toBe(true);
    expect(releaseMatchesUpdateChannel("5.0.0-beta.1", true, "rc")).toBe(true);
    expect(releaseMatchesUpdateChannel("5.0.0", false, "rc")).toBe(true);
    expect(releaseMatchesUpdateChannel("x", true, "nightly")).toBe(true);
  });
});
