/**
 * Shared utilities for DX Hub modules.
 *
 * Re-exports core dependencies and defines common helpers used across
 * hub/doctor, hub/network, hub/gate, and the main dev-hub entrypoint.
 */

import * as clack from "@clack/prompts";
import pc from "picocolors";
import { spawnSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

// ── Re-exports for sub-modules ──────────────────────────────────────────────
export { clack, pc, spawnSync, execSync, fs, path };

// ── Root dir ────────────────────────────────────────────────────────────────
export const rootDir = path.resolve(__dirname, "..");

// ── Scrollback protection state ─────────────────────────────────────────────

/**
 * When true, resize may wipe the whole screen (clean menus).
 * When false, only the active prompt frame is erased (keep logs / command output).
 */
let _resizeMayClearScreen = true;

export function allowResizeScreenClear() {
  _resizeMayClearScreen = true;
}

export function getResizeMayClearScreen(): boolean {
  return _resizeMayClearScreen;
}

export function protectScrollback() {
  _resizeMayClearScreen = false;
}

export function clearTerminalScreen() {
  _lastIntro = undefined;
  allowResizeScreenClear();
  process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
}

// ── Intro tracking ──────────────────────────────────────────────────────────

let _lastIntro: string | undefined;

export function getLastIntro(): string | undefined {
  return _lastIntro;
}

export function hubIntro(title: string) {
  _lastIntro = title;
  allowResizeScreenClear();
  clack.intro(pc.bold(pc.cyan(title)));
}

// ── Prompts ─────────────────────────────────────────────────────────────────

export async function waitReturn() {
  protectScrollback();
  await clack.select({
    message: "Zadanie zakończone. Co chcesz zrobić?",
    options: [{ value: "back", label: "↩️  Powrót do menu głównego" }],
  });
}

/** Potwierdzenie PL: etykiety Tak/Nie; initialValue = domyślna odpowiedź (jak [T/n] vs [t/N]). */
export async function confirmPl(
  message: string,
  initialValue = false,
): Promise<boolean> {
  const ok = await clack.confirm({
    message,
    initialValue,
    active: "Tak",
    inactive: "Nie",
  });
  return Boolean(ok) && !clack.isCancel(ok);
}

export async function confirmDanger(
  message: string,
  initialValue = false,
): Promise<boolean> {
  return confirmPl(pc.yellow(message), initialValue);
}

export function warnSideEffects(lines: string[]) {
  protectScrollback();
  clack.log.warn(pc.yellow(pc.bold("Skutki uboczne / wpływ:")));
  for (const line of lines) clack.log.message(` • ${pc.dim(line)}`);
}

// ── Command execution ───────────────────────────────────────────────────────

export function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
) {
  protectScrollback();
  console.log();
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NODE_NO_WARNINGS: "1", ...options.env },
  });
  return result.status === 0;
}

export type CommandResult = { ok: boolean; output: string };

/** Like `runCommand`, but captures stdout/stderr for gate summaries (echoes after exit). */
export function runCommandCaptured(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): CommandResult {
  protectScrollback();
  console.log();
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, NODE_NO_WARNINGS: "1", ...options.env },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (output) {
    process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
  }
  return { ok: result.status === 0, output };
}

// ── Text helpers ────────────────────────────────────────────────────────────

export function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

export function truncateHint(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

/** Known stderr from passing server/web tests — must not win over real turbo/vitest fails. */
export function isNoiseFailureLine(line: string): boolean {
  if (/^#\s/.test(line)) return true;
  if (/listener-boom/i.test(line)) return true;
  if (/transport listener error/i.test(line)) return true;
  if (/\[DevLayoutMatrix\] screenshot failed/i.test(line)) return true;
  if (/An update to .* was not wrapped in act\(\)/i.test(line)) return true;
  return false;
}

/**
 * Best one-line failure hint for gate summaries and verify logs.
 * Prefers turbo package target and vitest FAIL over generic Error: lines.
 */
export function failureHint(output: string, maxLen = 96): string | undefined {
  const plain = stripAnsi(output);
  const lines = plain
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const failedPkg = plain.match(/Failed:\s+(@stagesync\/[^\s]+)/);
  if (failedPkg) {
    const vitestFail = [...lines]
      .reverse()
      .find((l) => /\sFAIL\s+/.test(l) && !isNoiseFailureLine(l));
    if (vitestFail) {
      return truncateHint(`${failedPkg[1]} — ${vitestFail}`, maxLen);
    }
    return truncateHint(failedPkg[1], maxLen);
  }

  const vitestFails = lines.filter(
    (l) =>
      /\sFAIL\s+/.test(l) && !/Failed Tests/i.test(l) && !isNoiseFailureLine(l),
  );
  if (vitestFails.length > 0) {
    return truncateHint(vitestFails[vitestFails.length - 1]!, maxLen);
  }

  const testFilesFailed = [
    ...plain.matchAll(/Test Files\s+\d+\s+failed[^\n]*/g),
  ];
  if (testFilesFailed.length > 0) {
    return truncateHint(
      testFilesFailed[testFilesFailed.length - 1]![0],
      maxLen,
    );
  }

  const turboErr = lines.find(
    (l) =>
      (/ ERROR  run failed/.test(l) ||
        /exited \(1\)/.test(l) ||
        /\[ELIFECYCLE\].*failed/i.test(l)) &&
      !isNoiseFailureLine(l),
  );
  if (turboErr) return truncateHint(turboErr, maxLen);

  const interesting = lines.find(
    (l) =>
      (/error TS\d+|✖|FAIL |Error:|ELIFECYCLE| failed|broken=/i.test(l) ||
        /AssertionError:/i.test(l)) &&
      !/DeprecationWarning|ExperimentalWarning/.test(l) &&
      !isNoiseFailureLine(l),
  );
  if (!interesting) return undefined;
  return truncateHint(interesting, maxLen);
}

/** @deprecated Use failureHint — kept as alias for clarity at call sites. */
export function firstFailureHint(
  output: string,
  maxLen = 96,
): string | undefined {
  return failureHint(output, maxLen);
}

// ── Git helpers ─────────────────────────────────────────────────────────────

export function hashFileContent(relPath: string): string | null {
  try {
    const abs = path.join(rootDir, relPath);
    const buf = fs.readFileSync(abs);
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

/** Dirty paths (vs HEAD + untracked) → content hash. Detects writes even when already dirty. */
export function gitDirtyContentMap(): Map<string, string> {
  const map = new Map<string, string>();
  const tracked = spawnSync("git", ["diff", "HEAD", "--name-only"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  const untracked = spawnSync(
    "git",
    ["ls-files", "--others", "--exclude-standard"],
    { cwd: rootDir, encoding: "utf8" },
  );
  for (const raw of `${tracked.stdout ?? ""}\n${untracked.stdout ?? ""}`.split(
    /\r?\n/,
  )) {
    const filePath = raw.trim().replace(/\\/g, "/");
    if (!filePath) continue;
    map.set(filePath, hashFileContent(filePath) ?? "missing");
  }
  return map;
}

export function gitContentChangedPaths(
  before: Map<string, string>,
  after: Map<string, string>,
): string[] {
  const paths = new Set<string>();
  for (const [p, h] of after) {
    if (before.get(p) !== h) paths.add(p);
  }
  for (const p of before.keys()) {
    if (!after.has(p)) paths.add(p);
  }
  return [...paths].sort();
}

export function formatChangedFilesDetail(
  paths: string[],
  verb = "zapisano",
): string {
  if (paths.length === 0) return "bez zmian w git";
  const preview = paths.slice(0, 3).join(", ");
  const more = paths.length > 3 ? ` (+${paths.length - 3})` : "";
  return `${verb} ${paths.length}: ${preview}${more}`;
}

// ── Env hydration ───────────────────────────────────────────────────────────

/** Load unset STAGESYNC_* keys from root `.env` (mirrors server dotenv for hub). */
export function hydrateStagesyncEnvFromDotenv() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (key !== "STAGESYNC_DATA_DIR" && key !== "STAGESYNC_REPO_DEV") continue;
    if (process.env[key] !== undefined) continue;
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

export type HubDataDirRule =
  | "STAGESYNC_DATA_DIR"
  | "STAGESYNC_REPO_DEV"
  | "Documents/StageSync"
  | "repo/data (fallback)";

/** Same priority as apps/server `defaultDataDir()` (ADR 0012). */
export function resolveHubDataDir(): { dir: string; rule: HubDataDirRule } {
  const fromEnv = process.env.STAGESYNC_DATA_DIR;
  if (fromEnv) {
    const dir = path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(rootDir, fromEnv);
    return { dir, rule: "STAGESYNC_DATA_DIR" };
  }
  if (process.env.STAGESYNC_REPO_DEV) {
    return {
      dir: path.join(rootDir, "data"),
      rule: "STAGESYNC_REPO_DEV",
    };
  }
  const home = process.env.HOME ?? process.env.USERPROFILE ?? null;
  if (home) {
    return {
      dir: path.join(home, "Documents", "StageSync"),
      rule: "Documents/StageSync",
    };
  }
  return {
    dir: path.join(rootDir, "data"),
    rule: "repo/data (fallback)",
  };
}

export function readRootPackageVersion(): string | null {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
    ) as { version?: string };
    return typeof pkg.version === "string" && pkg.version ? pkg.version : null;
  } catch {
    return null;
  }
}
