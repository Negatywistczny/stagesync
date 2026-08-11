import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getSettingsSchemaForClient,
  listConfiguredSecrets,
  listRestartRequiredKeys,
  loadDotenvIntoProcess,
  maskSecretSettingsValues,
  normalizeIncomingValue,
  parseEnvContent,
  readManagedSettings,
  releaseMatchesUpdateChannel,
  REPO_ENV_PATH,
  resolveEnvPath,
  SETTINGS_SCHEMA,
  writeManagedSettings,
  type ManagedSettingsValues,
} from "./env-settings.js";

describe("env-settings", () => {
  const dirs: string[] = [];
  const prevDataDir = process.env.STAGESYNC_DATA_DIR;
  afterEach(async () => {
    delete process.env.STAGESYNC_USDB_USER;
    delete process.env.STAGESYNC_USDB_PASS;
    if (prevDataDir === undefined) delete process.env.STAGESYNC_DATA_DIR;
    else process.env.STAGESYNC_DATA_DIR = prevDataDir;
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

  it("resolves managed .env under STAGESYNC_DATA_DIR/host", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-env-data-"));
    dirs.push(dir);
    delete process.env.STAGESYNC_DATA_DIR;
    expect(resolveEnvPath()).toBe(REPO_ENV_PATH);

    process.env.STAGESYNC_DATA_DIR = dir;
    expect(resolveEnvPath()).toBe(join(dir, "host", ".env"));
  });

  it("writes managed settings into dataDir/host without an existing file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-env-write-data-"));
    dirs.push(dir);
    process.env.STAGESYNC_DATA_DIR = dir;

    writeManagedSettings({
      STAGESYNC_USDB_USER: "alice",
      STAGESYNC_USDB_PASS: "s3cret",
    });
    const envPath = join(dir, "host", ".env");
    const raw = parseEnvContent(await readFile(envPath, "utf8"));
    expect(raw.STAGESYNC_USDB_USER).toBe("alice");
    expect(raw.STAGESYNC_USDB_PASS).toBe("s3cret");
  });

  it("loadDotenv bootstraps DATA_DIR from repo then loads host/.env", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-env-boot-data-"));
    dirs.push(dataDir);
    delete process.env.STAGESYNC_DATA_DIR;
    delete process.env.SS_TEST_HOST_ONLY;

    const hostEnv = join(dataDir, "host", ".env");
    await mkdir(dirname(hostEnv), { recursive: true });
    await writeFile(hostEnv, "SS_TEST_HOST_ONLY=from-host\n", "utf8");

    // Simulate: DATA_DIR already set by launcher/compose (desktop path).
    process.env.STAGESYNC_DATA_DIR = dataDir;
    loadDotenvIntoProcess();
    expect(process.env.SS_TEST_HOST_ONLY).toBe("from-host");
    delete process.env.SS_TEST_HOST_ONLY;
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
        "on",
        SETTINGS_SCHEMA.STAGESYNC_DISABLE_MDNS,
      ),
    ).toBe("1");
    expect(
      normalizeIncomingValue(
        "STAGESYNC_DISABLE_MDNS",
        "TRUE",
        SETTINGS_SCHEMA.STAGESYNC_DISABLE_MDNS,
      ),
    ).toBe("1");
    expect(
      normalizeIncomingValue(
        "STAGESYNC_DISABLE_MDNS",
        1,
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

  it("persists USDB credentials, masks secrets, keeps password on empty", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-usdb-env-"));
    dirs.push(dir);
    const envPath = join(dir, ".env");
    await writeFile(envPath, "", "utf8");

    writeManagedSettings(
      { STAGESYNC_USDB_USER: "alice", STAGESYNC_USDB_PASS: "s3cret" },
      envPath,
    );
    expect(process.env.STAGESYNC_USDB_USER).toBe("alice");
    expect(process.env.STAGESYNC_USDB_PASS).toBe("s3cret");

    const raw = readManagedSettings(envPath);
    expect(raw.values.STAGESYNC_USDB_USER).toBe("alice");
    expect(raw.values.STAGESYNC_USDB_PASS).toBe("s3cret");
    expect(listConfiguredSecrets(raw.values).STAGESYNC_USDB_PASS).toBe(true);
    expect(maskSecretSettingsValues(raw.values).STAGESYNC_USDB_PASS).toBe("");

    writeManagedSettings(
      { STAGESYNC_USDB_USER: "bob", STAGESYNC_USDB_PASS: "" },
      envPath,
    );
    expect(process.env.STAGESYNC_USDB_USER).toBe("bob");
    expect(process.env.STAGESYNC_USDB_PASS).toBe("s3cret");

    writeManagedSettings({ STAGESYNC_USDB_USER: "" }, envPath);
    expect(process.env.STAGESYNC_USDB_USER).toBeUndefined();
    expect(process.env.STAGESYNC_USDB_PASS).toBeUndefined();
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
    expect(schema.STAGESYNC_USDB_PASS?.secret).toBe(true);
    expect(schema.STAGESYNC_USDB_USER?.section).toBe("imports");
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

  it("returns empty when restart keys unchanged; includes data dir", () => {
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
    expect(listRestartRequiredKeys(before, { ...before })).toEqual([]);
    const after = { ...before, STAGESYNC_DATA_DIR: "./data-alt" };
    expect(listRestartRequiredKeys(before, after)).toEqual([
      "STAGESYNC_DATA_DIR",
    ]);
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
