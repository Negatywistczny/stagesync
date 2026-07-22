/**
 * Managed .env settings for Admin Ustawienia (v4 Server Settings parity, v5 keys).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./storage/paths.js";

export const ENV_PATH = join(REPO_ROOT, ".env");

export type SettingType = "string" | "number" | "boolean" | "enum";

export type SettingSpec = {
  section: "network" | "logs" | "maintenance" | "advanced";
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

export function loadDotenvIntoProcess(envPath = ENV_PATH): void {
  if (!existsSync(envPath)) return;
  const parsed = parseEnvContent(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function readManagedSettings(envPath = ENV_PATH): {
  values: ManagedSettingsValues;
  envExists: boolean;
} {
  const content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const parsed = parseEnvContent(content);
  const values = {} as ManagedSettingsValues;
  for (const key of Object.keys(SETTINGS_SCHEMA) as SettingsKey[]) {
    const spec = SETTINGS_SCHEMA[key];
    values[key] = toFormValue(
      parsed[key],
      spec,
    ) as ManagedSettingsValues[typeof key];
  }
  return { values, envExists: existsSync(envPath) };
}

export function writeManagedSettings(
  updates: Partial<Record<string, unknown>>,
  envPath = ENV_PATH,
): { values: ManagedSettingsValues; envExists: boolean } {
  const normalized: Record<string, string | null> = {};
  for (const [key, rawValue] of Object.entries(updates || {})) {
    if (!(key in SETTINGS_SCHEMA)) continue;
    const spec = SETTINGS_SCHEMA[key as SettingsKey];
    normalized[key] = normalizeIncomingValue(key, rawValue, spec);
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
  writeFileSync(envPath, output ? `${output}\n` : "", "utf8");

  for (const [key, value] of Object.entries(normalized)) {
    const spec = SETTINGS_SCHEMA[key as SettingsKey];
    if (!spec || spec.restartRequired) continue;
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }

  return readManagedSettings(envPath);
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
  }
> {
  return Object.fromEntries(
    (Object.keys(SETTINGS_SCHEMA) as SettingsKey[]).map((key) => {
      const spec = SETTINGS_SCHEMA[key];
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
