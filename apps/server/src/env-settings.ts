/**
 * Managed .env settings for Admin Ustawienia (v4 Server Settings parity, v5 keys).
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { REPO_ROOT } from "./storage/paths.js";
import { validateHostDisplayName } from "./network-info.js";

/** Dev / compose bootstrap file at monorepo (or image) root. */
export const REPO_ENV_PATH = join(REPO_ROOT, ".env");

/**
 * Writable path for Admin / Import USDB managed settings.
 *
 * When `STAGESYNC_DATA_DIR` is set (Desktop launcher, Docker), persist under
 * `{dataDir}/host/.env` — never under a read-only install tree (e.g. Windows
 * `Program Files\\…\\resources`). Otherwise fall back to repo-root `.env`.
 */
export function resolveEnvPath(): string {
  const fromEnv = process.env.STAGESYNC_DATA_DIR?.trim();
  if (fromEnv) {
    const dataDir = isAbsolute(fromEnv) ? fromEnv : resolve(REPO_ROOT, fromEnv);
    return join(dataDir, "host", ".env");
  }
  return REPO_ENV_PATH;
}

/** @deprecated Prefer `resolveEnvPath()` — path depends on `STAGESYNC_DATA_DIR`. Kept for call-site migration. */
export { REPO_ENV_PATH as ENV_PATH };

export type SettingType = "string" | "number" | "boolean" | "enum";

export type SettingSpec = {
  section: "network" | "logs" | "maintenance" | "advanced" | "imports";
  type: SettingType;
  label: string;
  hint?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  options?: readonly string[];
  defaultValue: string | boolean;
  pathKind?: "dir" | "file";
  restartRequired?: boolean;
  /** Never return plaintext over GET; empty PUT keeps existing value (null clears). */
  secret?: boolean;
};

export const SETTINGS_SCHEMA = {
  PORT: {
    section: "network",
    type: "number",
    label: "Port HTTP",
    hint: "Domyślnie 4000. Wymaga restartu serwera.",
    min: 1,
    max: 65535,
    defaultValue: "4000",
    restartRequired: true,
  },
  STAGESYNC_BIND_HOST: {
    section: "network",
    type: "enum",
    label: "Bind host",
    hint: "0.0.0.0 = sieć LAN; 127.0.0.1 = tylko localhost. Wymaga restartu.",
    options: ["0.0.0.0", "127.0.0.1"],
    defaultValue: "0.0.0.0",
    restartRequired: true,
  },
  STAGESYNC_DISABLE_MDNS: {
    section: "network",
    type: "boolean",
    label: "Wyłącz ogłoszenie mDNS",
    hint: "Gdy włączone — bez Bonjour / .local. Wymaga restartu.",
    defaultValue: false,
    restartRequired: true,
  },
  STAGESYNC_HOST_DISPLAY_NAME: {
    section: "network",
    type: "string",
    label: "Nazwa hosta w sieci",
    hint: "Widoczna przy wyszukiwaniu hostów w launcherze; adres IP zostaje w drugiej linii. Bez restartu.",
    defaultValue: "",
    maxLength: 40,
    restartRequired: false,
  },
  LOG_LEVEL: {
    section: "logs",
    type: "enum",
    label: "Poziom logów",
    options: ["info", "debug", "warn", "error"],
    defaultValue: "info",
    restartRequired: true,
  },
  STAGESYNC_DISABLE_AUTO_UPDATE: {
    section: "maintenance",
    type: "boolean",
    label: "Wyłącz aktualizację z admina",
    hint: "Blokuje Sprawdź aktualizacje w Host. Bez restartu.",
    defaultValue: false,
    restartRequired: false,
  },
  STAGESYNC_UPDATE_CHANNEL: {
    section: "maintenance",
    type: "enum",
    label: "Kanał aktualizacji",
    hint: "Stable / Beta / RC — filtr przy Sprawdź aktualizacje. Bez restartu.",
    options: ["stable", "beta", "rc"],
    defaultValue: "stable",
    restartRequired: false,
  },
  STAGESYNC_DATA_DIR: {
    section: "advanced",
    type: "string",
    label: "Katalog danych",
    hint: "Biblioteka + projekty. Puste = domyślna lokalizacja. Wymaga restartu.",
    defaultValue: "",
    maxLength: 260,
    pathKind: "dir",
    restartRequired: true,
  },
  STAGESYNC_BACKUPS_DIR: {
    section: "advanced",
    type: "string",
    label: "Katalog kopii zapasowych",
    hint: "Puste = {dataDir}/backups. Wymaga restartu.",
    defaultValue: "",
    maxLength: 260,
    pathKind: "dir",
    restartRequired: true,
  },
  STAGESYNC_ASSETS_DIR: {
    section: "advanced",
    type: "string",
    label: "Katalog assetów (nadpisanie)",
    hint: "Opcjonalny root mediów. Wymaga restartu.",
    defaultValue: "",
    maxLength: 260,
    pathKind: "dir",
    restartRequired: true,
  },
  STAGESYNC_SAFETY_ROLE: {
    section: "advanced",
    type: "enum",
    label: "Safety Net — rola",
    hint: "Master = pełny MIDI OUT. Spare = pasywne lustro (bez MIDI OUT). Bez auto-election.",
    options: ["master", "spare"],
    defaultValue: "master",
    restartRequired: false,
  },
  STAGESYNC_THEME_DEFAULT: {
    section: "advanced",
    type: "enum",
    label: "Domyślny motyw klientów",
    hint: "Dla urządzeń bez zapisanego motywu lokalnego (booth / daylight / midnight / matrix / neon). Stare aliasy dark/light/*-high nadal działają. Wymaga odświeżenia klienta.",
    options: ["booth", "daylight", "midnight", "matrix", "neon"],
    defaultValue: "booth",
    restartRequired: false,
  },
  STAGESYNC_USDB_USER: {
    section: "imports",
    type: "string",
    label: "USDB — użytkownik",
    hint: "Konto na usdb.animux.de (Import UltraStar). Bez restartu. Zalecane: formularz w dialogu Import UltraStar → Konto USDB.",
    defaultValue: "",
    maxLength: 120,
    restartRequired: false,
  },
  STAGESYNC_USDB_PASS: {
    section: "imports",
    type: "string",
    label: "USDB — hasło",
    hint: "Hasło konta USDB. Nie jest zwracane w API; puste pole przy zapisie = bez zmiany.",
    defaultValue: "",
    maxLength: 200,
    restartRequired: false,
    secret: true,
  },
} as const satisfies Record<string, SettingSpec>;

export type SettingsKey = keyof typeof SETTINGS_SCHEMA;

export type ManagedSettingsValues = {
  [K in SettingsKey]: (typeof SETTINGS_SCHEMA)[K]["type"] extends "boolean"
  ? boolean
  : string;
};

export function parseEnvContent(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of String(content || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    values[key] = value;
  }
  return values;
}

function formatEnvLine(key: string, value: string): string {
  if (/[\s#"'\\]/.test(value)) {
    return `${key}="${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return `${key}=${value}`;
}

function isTruthyEnv(value: unknown): boolean {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function normalizeIncomingValue(
  key: string,
  rawValue: unknown,
  spec: SettingSpec,
): string | null {
  if (spec.type === "boolean") {
    if (rawValue === false || rawValue === null || rawValue === undefined) {
      return null;
    }
    if (typeof rawValue === "string" && rawValue.trim() === "") return null;
    return isTruthyEnv(rawValue) ? "1" : null;
  }

  const text = String(rawValue ?? "").trim();
  if (text === "") return null;

  if (spec.type === "number") {
    const num = Number(text);
    if (!Number.isFinite(num)) {
      throw new Error(`Pole ${key}: wymagana liczba`);
    }
    if (spec.min != null && num < spec.min) {
      throw new Error(`Pole ${key}: minimum ${spec.min}`);
    }
    if (spec.max != null && num > spec.max) {
      throw new Error(`Pole ${key}: maksimum ${spec.max}`);
    }
    return String(Math.trunc(num) === num ? Math.trunc(num) : num);
  }

  if (spec.type === "enum") {
    if (!spec.options?.includes(text)) {
      throw new Error(`Pole ${key}: niedozwolona wartość`);
    }
    return text;
  }

  if (spec.maxLength != null && text.length > spec.maxLength) {
    throw new Error(`Pole ${key}: za długa wartość`);
  }
  if (key === "STAGESYNC_HOST_DISPLAY_NAME") {
    return validateHostDisplayName(text);
  }
  return text;
}

function toFormValue(
  storedValue: string | undefined,
  spec: SettingSpec,
): string | boolean {
  if (spec.type === "boolean") {
    return isTruthyEnv(storedValue);
  }
  if (storedValue == null || storedValue === "") {
    return "";
  }
  return String(storedValue);
}

function applyEnvFile(envPath: string): void {
  if (!existsSync(envPath)) return;
  const parsed = parseEnvContent(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/**
 * Load dotenv into `process.env` (unset keys only).
 *
 * Without an explicit path: load repo-root `.env` first (may define
 * `STAGESYNC_DATA_DIR`), then `{dataDir}/host/.env` when that path differs.
 */
export function loadDotenvIntoProcess(envPath?: string): void {
  if (envPath != null) {
    applyEnvFile(envPath);
    return;
  }
  applyEnvFile(REPO_ENV_PATH);
  const managed = resolveEnvPath();
  if (managed !== REPO_ENV_PATH) {
    applyEnvFile(managed);
  }
}

export function readManagedSettings(envPath = resolveEnvPath()): {
  values: ManagedSettingsValues;
  envExists: boolean;
} {
  const content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const parsed = parseEnvContent(content);
  const values = {} as ManagedSettingsValues;
  for (const key of Object.keys(SETTINGS_SCHEMA) as SettingsKey[]) {
    const spec = SETTINGS_SCHEMA[key] as SettingSpec;
    (values as Record<SettingsKey, string | boolean>)[key] = toFormValue(
      parsed[key],
      spec,
    );
  }
  return { values, envExists: existsSync(envPath) };
}

export function writeManagedSettings(
  updates: Partial<Record<string, unknown>>,
  envPath = resolveEnvPath(),
): { values: ManagedSettingsValues; envExists: boolean } {
  const normalized: Record<string, string | null> = {};
  for (const [key, rawValue] of Object.entries(updates || {})) {
    if (!(key in SETTINGS_SCHEMA)) continue;
    const spec = SETTINGS_SCHEMA[key as SettingsKey] as SettingSpec;
    if (spec.secret) {
      // null = explicit clear; empty / undefined = keep existing secret.
      if (rawValue === null) {
        normalized[key] = null;
        continue;
      }
      if (rawValue === undefined || String(rawValue).trim() === "") {
        continue;
      }
    }
    normalized[key] = normalizeIncomingValue(key, rawValue, spec);
  }

  // Clearing USDB user always drops the stored password too.
  if (
    "STAGESYNC_USDB_USER" in normalized &&
    normalized.STAGESYNC_USDB_USER == null
  ) {
    normalized.STAGESYNC_USDB_PASS = null;
  }

  const content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const lines = content.length ? content.split("\n") : [];
  const touched = new Set<string>();

  const nextLines = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) return line;
      const key = trimmed.slice(0, eq).trim();
      if (!(key in normalized)) return line;
      touched.add(key);
      if (normalized[key] == null) return null;
      return formatEnvLine(key, normalized[key]!);
    })
    .filter((line): line is string => line != null);

  for (const [key, value] of Object.entries(normalized)) {
    if (touched.has(key) || value == null) continue;
    if (nextLines.length && nextLines[nextLines.length - 1] !== "") {
      nextLines.push("");
    }
    nextLines.push(formatEnvLine(key, value));
    touched.add(key);
  }

  const output = nextLines.join("\n").replace(/\n+$/, "");
  mkdirSync(dirname(envPath), { recursive: true });
  // codeql[js/file-system-race] Protected internal config/settings sync write
  writeFileSync(envPath, output ? `${output}\n` : "", { encoding: "utf8", mode: 0o600 });

  for (const [key, value] of Object.entries(normalized)) {
    const spec = SETTINGS_SCHEMA[key as SettingsKey];
    if (!spec || spec.restartRequired) continue;
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }

  return readManagedSettings(envPath);
}

export function maskSecretSettingsValues(
  values: ManagedSettingsValues,
): ManagedSettingsValues {
  const out = { ...values } as ManagedSettingsValues;
  for (const key of Object.keys(SETTINGS_SCHEMA) as SettingsKey[]) {
    const spec = SETTINGS_SCHEMA[key] as SettingSpec;
    if (!spec.secret) continue;
    (out as Record<SettingsKey, string | boolean>)[key] = "";
  }
  return out;
}

export function listConfiguredSecrets(
  values: ManagedSettingsValues,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of Object.keys(SETTINGS_SCHEMA) as SettingsKey[]) {
    const spec = SETTINGS_SCHEMA[key] as SettingSpec;
    if (!spec.secret) continue;
    const raw = values[key];
    result[key] =
      typeof raw === "string" ? raw.trim().length > 0 : Boolean(raw);
  }
  return result;
}

export function getSettingsSchemaForClient(): Record<
  string,
  {
    section: string;
    type: SettingType;
    label: string;
    hint: string | null;
    options: string[] | null;
    defaultValue: string | boolean | null;
    pathKind: "dir" | "file" | null;
    restartRequired: boolean;
    secret: boolean;
  }
> {
  return Object.fromEntries(
    (Object.keys(SETTINGS_SCHEMA) as SettingsKey[]).map((key) => {
      const spec = SETTINGS_SCHEMA[key] as SettingSpec;
      return [
        key,
        {
          section: spec.section,
          type: spec.type,
          label: spec.label,
          hint: spec.hint ?? null,
          options: spec.options ? [...spec.options] : null,
          defaultValue: spec.defaultValue ?? null,
          pathKind: spec.pathKind ?? null,
          restartRequired: Boolean(spec.restartRequired),
          secret: Boolean(spec.secret),
        },
      ];
    }),
  );
}

export function listRestartRequiredKeys(
  before: ManagedSettingsValues,
  after: ManagedSettingsValues,
): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(SETTINGS_SCHEMA) as SettingsKey[]) {
    const spec = SETTINGS_SCHEMA[key];
    if (!spec.restartRequired) continue;
    if (before[key] !== after[key]) keys.push(key);
  }
  return keys;
}

export function releaseMatchesUpdateChannel(
  tagName: string,
  prerelease: boolean,
  channel: string,
): boolean {
  const tag = tagName.replace(/^v/, "").toLowerCase();
  const ch = (channel || "stable").toLowerCase();
  if (ch === "stable") return !prerelease && !tag.includes("-");
  if (ch === "beta") {
    if (!prerelease && !tag.includes("-")) return true;
    return tag.includes("-beta");
  }
  if (ch === "rc") {
    if (!prerelease && !tag.includes("-")) return true;
    return tag.includes("-rc") || tag.includes("-beta");
  }
  return true;
}
