process.env.NODE_NO_WARNINGS = "1";

import * as clack from "@clack/prompts";
import pc from "picocolors";
import { spawnSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import qrcode from "qrcode-terminal";

const rootDir = path.resolve(__dirname, "..");
const require = createRequire(__filename);

/** Last `clack.intro` title; cleared by `clearTerminalScreen` (submenus). */
let lastIntro: string | undefined;

/**
 * When true, resize may wipe the whole screen (clean menus).
 * When false, only the active prompt frame is erased (keep logs / command output).
 */
let resizeMayClearScreen = true;

function allowResizeScreenClear() {
  resizeMayClearScreen = true;
}

function protectScrollback() {
  resizeMayClearScreen = false;
}

function clearTerminalScreen() {
  lastIntro = undefined;
  allowResizeScreenClear();
  process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
}

const originalStderrWrite = process.stderr.write.bind(process.stderr);

function enableTerminalGuard() {
  process.stderr.write = (chunk: any) => {
    if (
      typeof chunk === "string" &&
      (chunk.includes("DeprecationWarning") ||
        chunk.includes("ExperimentalWarning"))
    ) {
      return true;
    }
    return originalStderrWrite(chunk);
  };
}

enableTerminalGuard();

/**
 * @clack/core re-renders on resize, but wrap width changes break its cursor math
 * (restoreCursor uses the *new* columns on the *old* frame) → ghosts/duplicates.
 *
 * - Clean menus (`resizeMayClearScreen`): full clear + re-intro + initial paint.
 * - Views with scrollback (logi, output): erase only the previous prompt frame
 *   using the pre-resize column width, then initial paint — do not wipe scrollback.
 */
function enableClackFullRedrawOnResize() {
  if (!process.stdout.isTTY) return;

  let resizePending = false;
  let resizePrevColumns = process.stdout.columns || 80;
  let lastColumns = process.stdout.columns || 80;

  const promptsPkg = path.dirname(
    require.resolve("@clack/prompts/package.json"),
  );
  const coreEntry = require.resolve("@clack/core", { paths: [promptsPkg] });
  // Wersja 1.x biblioteki może mieć inną strukturę plików niż 0.x
  const corePath = fs.existsSync(coreEntry)
    ? coreEntry
    : coreEntry.replace(/index\.mjs$/, "index.cjs");

  const coreRequire = createRequire(corePath);
  // wrap-ansi v9 is ESM-only; clack bundles usage — load via dynamic path from its tree.
  type WrapAnsiFn = (
    input: string,
    columns: number,
    options?: { hard?: boolean; trim?: boolean },
  ) => string;
  let wrapAnsiFn: WrapAnsiFn;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const wrapAnsiMod = coreRequire("wrap-ansi") as
      WrapAnsiFn | { default: WrapAnsiFn };
    wrapAnsiFn =
      typeof wrapAnsiMod === "function" ? wrapAnsiMod : wrapAnsiMod.default;
  } catch {
    wrapAnsiFn = (input) => input;
  }

  const { Prompt } = require(corePath) as {
    Prompt: {
      prototype: {
        state: string;
        render: () => void;
        _prevFrame?: string;
      };
    };
  };

  function erasePrevPromptFrame(
    prevFrame: string | undefined,
    columns: number,
  ) {
    if (!prevFrame) return;
    const lines = wrapAnsiFn(prevFrame, Math.max(2, columns), {
      hard: true,
      trim: false,
    }).split("\n").length;
    if (lines > 1) process.stdout.write(`\x1b[${lines - 1}A`);
    process.stdout.write("\x1b[1G\x1b[J");
  }

  const originalRender = Prompt.prototype.render;
  Prompt.prototype.render = function (this: {
    state: string;
    _prevFrame?: string;
  }) {
    if (resizePending) {
      resizePending = false;
      if (resizeMayClearScreen) {
        const intro = lastIntro;
        process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
        if (intro) {
          lastIntro = intro;
          clack.intro(intro);
        }
      } else {
        erasePrevPromptFrame(this._prevFrame, resizePrevColumns);
      }
      this._prevFrame = "";
      if (this.state === "active" || this.state === "error") {
        this.state = "initial";
      }
      return originalRender.call(this);
    }
    return originalRender.call(this);
  };

  // Register before any prompt so this runs first on resize, then clack's render.
  process.stdout.on("resize", () => {
    resizePrevColumns = lastColumns;
    lastColumns = process.stdout.columns || 80;
    resizePending = true;
    setImmediate(() => {
      resizePending = false;
    });
  });
}

enableClackFullRedrawOnResize();

function hubIntro(title: string) {
  lastIntro = title;
  allowResizeScreenClear();
  clack.intro(pc.bold(pc.cyan(title)));
}

async function waitReturn() {
  protectScrollback();
  await clack.select({
    message: "Zadanie zakończone. Co chcesz zrobić?",
    options: [{ value: "back", label: "↩️  Powrót do menu głównego" }],
  });
}

/** Potwierdzenie PL: etykiety Tak/Nie; initialValue = domyślna odpowiedź (jak [T/n] vs [t/N]). */
async function confirmPl(
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

async function confirmDanger(
  message: string,
  initialValue = false,
): Promise<boolean> {
  return confirmPl(pc.yellow(message), initialValue);
}

function warnSideEffects(lines: string[]) {
  protectScrollback();
  clack.log.warn(pc.yellow(pc.bold("Skutki uboczne / wpływ:")));
  for (const line of lines) clack.log.message(` • ${pc.dim(line)}`);
}

function runCommand(
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

type CommandResult = { ok: boolean; output: string };

/** Like `runCommand`, but captures stdout/stderr for gate summaries (echoes after exit). */
function runCommandCaptured(
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

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function truncateHint(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

/** Known stderr from passing server/web tests — must not win over real turbo/vitest fails. */
function isNoiseFailureLine(line: string): boolean {
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
function failureHint(output: string, maxLen = 96): string | undefined {
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
function firstFailureHint(output: string, maxLen = 96): string | undefined {
  return failureHint(output, maxLen);
}

function hashFileContent(relPath: string): string | null {
  try {
    const abs = path.join(rootDir, relPath);
    const buf = fs.readFileSync(abs);
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

/** Dirty paths (vs HEAD + untracked) → content hash. Detects writes even when already dirty. */
function gitDirtyContentMap(): Map<string, string> {
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

function gitContentChangedPaths(
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

function formatChangedFilesDetail(paths: string[], verb = "zapisano"): string {
  if (paths.length === 0) return "bez zmian w git";
  const preview = paths.slice(0, 3).join(", ");
  const more = paths.length > 3 ? ` (+${paths.length - 3})` : "";
  return `${verb} ${paths.length}: ${preview}${more}`;
}

/** Sum final Vitest `Tests` lines across turbo packages. */
function parseVitestTestsDetail(output: string): string | undefined {
  const plain = stripAnsi(output);
  const byPkg = new Map<
    string,
    { passed: number; failed: number; skipped: number }
  >();
  const re =
    /(?:^|\n)(?:(@stagesync\/[\w-]+):.*?:\s*)?Tests\s+(\d+)\s+passed(?:\s*\|\s*(\d+)\s+failed)?(?:\s*\|\s*(\d+)\s+skipped)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(plain)) !== null) {
    byPkg.set(m[1] ?? "_", {
      passed: Number(m[2]),
      failed: m[3] ? Number(m[3]) : 0,
      skipped: m[4] ? Number(m[4]) : 0,
    });
  }
  if (byPkg.size === 0) return undefined;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const v of byPkg.values()) {
    passed += v.passed;
    failed += v.failed;
    skipped += v.skipped;
  }
  const parts = [`${passed} passed`];
  if (failed) parts.push(`${failed} failed`);
  if (skipped) parts.push(`${skipped} skipped`);
  if (byPkg.size > 1) parts.push(`${byPkg.size} pkg`);
  return parts.join(", ");
}

function parseCoverageStmtsDetail(output: string): string | undefined {
  const m = stripAnsi(output).match(
    /All files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/,
  );
  if (!m) return undefined;
  return `stmts ${m[1]}%`;
}

function parsePlaywrightDetail(output: string): string | undefined {
  const plain = stripAnsi(output);
  const passedMatches = [
    ...plain.matchAll(/^\s*(\d+)\s+passed(?:\s*\(([^)]+)\))?/gm),
  ];
  const last = passedMatches.at(-1);
  if (!last) return undefined;
  const failed = [...plain.matchAll(/^\s*(\d+)\s+failed/gm)].at(-1);
  let s = `${last[1]} passed`;
  if (last[2]) s += ` (${last[2]})`;
  if (failed && Number(failed[1]) > 0) s += `, ${failed[1]} failed`;
  return s;
}

function parseDocsLinksDetail(output: string, ok: boolean): string {
  const m = stripAnsi(output).match(/checked=(\d+)\s+broken=(\d+)/);
  if (!m) return ok ? "OK" : (firstFailureHint(output) ?? "błąd");
  return ok ? `${m[1]} checked` : `${m[2]} broken / ${m[1]} checked`;
}

/** Human `pnpm audit` summary for gate detail. */
function parsePnpmAuditDetail(output: string, ok: boolean): string {
  const plain = stripAnsi(output);
  if (/No known vulnerabilities found/i.test(plain)) {
    return "0 vulnerabilities";
  }
  const found = plain.match(/(\d+)\s+vulnerabilit(?:y|ies)\s+found/i);
  const severity = plain.match(/Severity:\s*(.+)/i);
  if (found && severity) {
    return `${found[1]} found (${severity[1].trim()})`;
  }
  if (found) return `${found[1]} found`;
  return ok ? "OK" : (firstFailureHint(output) ?? "błąd");
}

/** `sync-version --check` / dry-run summary. */
function parseSyncVersionDetail(output: string, ok: boolean): string {
  const plain = stripAnsi(output);
  if (/in sync/i.test(plain)) return "in sync";
  const drift = plain.match(/drift=(\d+)/i);
  if (drift) {
    const files = plain.match(/version drift in \d+ file\(s\):\s*(.+)/i)?.[1];
    return files ? `drift ${drift[1]}: ${files.trim()}` : `drift ${drift[1]}`;
  }
  return ok ? "OK" : (firstFailureHint(output) ?? "błąd");
}

const GITHUB_OWNER = "Negatywistczny";
const OWNER_TYPO = "Negatywistyczny";

/** Fail if the known GitHub owner typo appears outside intentional script/test mentions. */
function runOwnerTypoGate(): GateStep {
  const grepped = spawnSync(
    "git",
    [
      "grep",
      "-n",
      "-I",
      OWNER_TYPO,
      "--",
      ".",
      ":!.cursor/**",
      ":!scripts/release/cut-release.mjs",
      ":!scripts/release/cut-release.test.mjs",
      ":!scripts/dev-hub.ts",
    ],
    { cwd: rootDir, encoding: "utf8" },
  );
  // exit 0 = matches · 1 = none · other = error
  if (grepped.status === 0 && (grepped.stdout ?? "").trim()) {
    const hits = (grepped.stdout ?? "").trim().split(/\r?\n/).filter(Boolean);
    const preview = hits.slice(0, 3).join("; ");
    const more = hits.length > 3 ? ` (+${hits.length - 3})` : "";
    const output = `${grepped.stdout ?? ""}${grepped.stderr ?? ""}`;
    return {
      id: "owner-typo",
      label: "owner typo",
      ok: false,
      detail: `${hits.length}× ${OWNER_TYPO} → ${GITHUB_OWNER}: ${preview}${more}`,
      logBody: gateLogBody(output, false),
    };
  }
  if (grepped.status !== 0 && grepped.status !== 1) {
    const output = `${grepped.stdout ?? ""}${grepped.stderr ?? ""}`;
    return {
      id: "owner-typo",
      label: "owner typo",
      ok: false,
      detail: firstFailureHint(grepped.stderr ?? "") ?? "git grep failed",
      logBody: gateLogBody(output, false),
    };
  }
  return {
    id: "owner-typo",
    label: "owner typo",
    ok: true,
    detail: `brak „${OWNER_TYPO}”`,
  };
}

/** Load unset STAGESYNC_* keys from root `.env` (mirrors server dotenv for hub). */
function hydrateStagesyncEnvFromDotenv() {
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

hydrateStagesyncEnvFromDotenv();

type HubDataDirRule =
  | "STAGESYNC_DATA_DIR"
  | "STAGESYNC_REPO_DEV"
  | "Documents/StageSync"
  | "repo/data (fallback)";

/** Same priority as apps/server `defaultDataDir()` (ADR 0012). */
function resolveHubDataDir(): { dir: string; rule: HubDataDirRule } {
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

function readRootPackageVersion(): string | null {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
    ) as { version?: string };
    return typeof pkg.version === "string" && pkg.version ? pkg.version : null;
  } catch {
    return null;
  }
}

type GateStep = {
  id: string;
  label: string;
  ok: boolean;
  /** One-line summary (counts, mutations, fail hint). */
  detail?: string;
  /** Step wrote tracked files (git dirty delta). */
  mutated?: boolean;
  /** Full command output when step failed or mutated (plain text, no ANSI). */
  logBody?: string;
};

/** Headless `./dev verify|pr|all --save-log` or STAGESYNC_VERIFY_SAVE_LOG=1 */
let verifySaveLogRequested =
  process.env.STAGESYNC_VERIFY_SAVE_LOG === "1" ||
  process.env.STAGESYNC_VERIFY_SAVE_LOG === "true";

const VERIFY_LOG_SLUGS: Record<string, string> = {
  "Lustrzane CI": "ci-mirror",
  "Codzienny gate": "daily",
  "Kompletny audyt": "full-audit",
};

function initVerifySaveLogFromArgs(args: string[]): string[] {
  if (args.includes("--save-log")) verifySaveLogRequested = true;
  return args.filter((a) => a !== "--save-log");
}

function hasGateSignal(steps: GateStep[]): boolean {
  return steps.some((s) => !s.ok || s.mutated);
}

function gateLogBody(
  output: string,
  ok: boolean,
  mutated = false,
): string | undefined {
  if (ok && !mutated) return undefined;
  const plain = stripAnsi(output).trim();
  if (!plain) return undefined;
  return trimVerifyLogBody(plain);
}

const VERIFY_LOG_BODY_MAX_CHARS = 80_000;
const VERIFY_LOG_EXCERPT_CONTEXT = 30;

/** Keep turbo header, failure excerpts, and tail summary when output is huge. */
function trimVerifyLogBody(body: string): string {
  if (body.length <= VERIFY_LOG_BODY_MAX_CHARS) return body;
  const lines = body.split(/\r?\n/);
  const keep = new Set<number>();
  const anchor = (pred: (line: string) => boolean) => {
    for (let i = 0; i < lines.length; i++) {
      if (!pred(lines[i] ?? "")) continue;
      for (
        let j = Math.max(0, i - VERIFY_LOG_EXCERPT_CONTEXT);
        j <= Math.min(lines.length - 1, i + VERIFY_LOG_EXCERPT_CONTEXT);
        j++
      ) {
        keep.add(j);
      }
    }
  };
  for (let i = 0; i < Math.min(25, lines.length); i++) keep.add(i);
  for (let i = Math.max(0, lines.length - 20); i < lines.length; i++) {
    keep.add(i);
  }
  anchor((l) => /Failed:\s+@stagesync\//.test(l));
  anchor((l) => /\sFAIL\s+/.test(l) && !/Failed Tests/i.test(l));
  anchor((l) => /Test Files\s+\d+\s+failed/.test(l));
  anchor((l) => /^ ERROR  run failed/.test(l));
  anchor((l) => /\[ELIFECYCLE\].*failed/i.test(l));
  const ordered = [...keep].sort((a, b) => a - b);
  const parts: string[] = [
    `… output trimmed (${body.length} chars → excerpts below) …`,
    "",
  ];
  let prev = -2;
  for (const idx of ordered) {
    if (idx > prev + 1) parts.push("…");
    parts.push(lines[idx] ?? "");
    prev = idx;
  }
  parts.push("", `… end trimmed output (${body.length} chars total) …`);
  return parts.join("\n");
}

function parseTurboFailedPackages(output: string): string[] {
  const pkgs = new Set<string>();
  for (const m of stripAnsi(output).matchAll(
    /Failed:\s+(@stagesync\/[^\s]+)/g,
  )) {
    pkgs.add(m[1]!);
  }
  return [...pkgs];
}

function ensureSharedBuiltForGate(): void {
  const distEntry = path.join(rootDir, "packages/shared/dist/index.js");
  if (fs.existsSync(distEntry)) return;
  clack.log.warn(
    "Brak packages/shared/dist — buduję @stagesync/shared przed test…",
  );
  runCommand("pnpm", ["--filter", "@stagesync/shared", "build"]);
}

function readGitBranch(): string | undefined {
  try {
    const branch = execSync("git branch --show-current", {
      cwd: rootDir,
      encoding: "utf8",
    }).trim();
    return branch || undefined;
  } catch {
    return undefined;
  }
}

function formatVerifyLogTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function writeVerifyLog(
  title: string,
  slug: string,
  steps: GateStep[],
): string {
  const dir = path.join(rootDir, "tmp", "verify-logs");
  fs.mkdirSync(dir, { recursive: true });
  const now = new Date();
  const fileName = `verify-${formatVerifyLogTimestamp(now)}-${slug}.log`;
  const relPath = path.join("tmp", "verify-logs", fileName);
  const absPath = path.join(rootDir, relPath);
  const allOk = steps.every((s) => s.ok);
  const lines: string[] = [`# ${title}`, `time: ${now.toISOString()}`];
  const branch = readGitBranch();
  if (branch) lines.push(`branch: ${branch}`);
  const failedSteps = steps.filter((s) => !s.ok);
  const failedPackages = [
    ...new Set(
      failedSteps.flatMap((s) =>
        s.logBody ? parseTurboFailedPackages(s.logBody) : [],
      ),
    ),
  ];
  if (failedPackages.length > 0) {
    lines.push(`failed_packages: ${failedPackages.join(", ")}`);
  }
  lines.push(`result: ${allOk ? "OK" : "FAIL"}`, "", "## Steps");
  for (const step of steps) {
    const status = step.ok ? "OK" : "FAIL";
    const mut = step.mutated ? " [mutated]" : "";
    const detail = step.detail ? ` — ${step.detail}` : "";
    lines.push(`- [${status}${mut}] ${step.label} (${step.id})${detail}`);
  }
  const withBody = steps.filter((s) => s.logBody);
  if (withBody.length > 0) {
    lines.push("", "## Captured output");
    for (const step of withBody) {
      lines.push(
        "",
        `--- output: ${step.id} (${step.label}) ---`,
        step.logBody!,
      );
    }
  }
  fs.writeFileSync(absPath, `${lines.join("\n")}\n`, "utf8");
  return relPath.replace(/\\/g, "/");
}

async function offerSaveVerifyLog(
  title: string,
  steps: GateStep[],
): Promise<void> {
  const slug = VERIFY_LOG_SLUGS[title];
  if (!slug) return;
  const isTty = Boolean(process.stdout.isTTY);
  let shouldSave = false;
  if (isTty) {
    shouldSave = await confirmPl(
      "Zapisać log weryfikacji (błędy / zmiany)?",
      hasGateSignal(steps),
    );
  } else {
    shouldSave = verifySaveLogRequested;
  }
  if (!shouldSave) return;
  const relPath = writeVerifyLog(title, slug, steps);
  clack.log.success(`Zapisano log: ${relPath}`);
}

function summarizeGate(title: string, steps: GateStep[]): boolean {
  console.log();
  clack.log.info(pc.bold(`Podsumowanie — ${title}:`));
  for (const step of steps) {
    const suffix = step.detail ? pc.dim(` — ${step.detail}`) : "";
    if (step.ok)
      clack.log.success(` ${pc.green("✓")}  ${pc.green(step.label)}${suffix}`);
    else clack.log.error(` ${pc.red("✗")}  ${pc.red(step.label)}${suffix}`);
  }
  const mutated = steps.filter((s) => s.mutated);
  if (mutated.length > 0) {
    clack.log.warn(
      pc.yellow(
        `Zmienione pliki: ${mutated.map((s) => s.id).join(", ")}. Sprawdź git diff.`,
      ),
    );
  }
  const failed = steps.filter((s) => !s.ok);
  if (failed.length === 0) {
    clack.log.success(
      pc.bold(
        pc.green(
          `✅ ${title} — wszystkie kroki OK (${steps.length}/${steps.length}).`,
        ),
      ),
    );
    return true;
  }
  clack.log.error(
    pc.bold(
      pc.red(
        `❌ ${title} — nieudane (${failed.length}/${steps.length}): ${failed
          .map((s) => (s.detail ? `${s.label} (${s.detail})` : s.label))
          .join(", ")}`,
      ),
    ),
  );
  return false;
}

function gateStepFromCaptured(
  id: string,
  label: string,
  command: string,
  args: string[],
  detailFrom?: {
    ok?: (output: string) => string | undefined;
    fail?: (output: string) => string | undefined;
  },
): GateStep {
  const { ok, output } = runCommandCaptured(command, args);
  const detail = ok
    ? detailFrom?.ok?.(output)
    : (detailFrom?.fail?.(output) ?? firstFailureHint(output) ?? "błąd");
  return { id, label, ok, detail, logBody: gateLogBody(output, ok) };
}

function gateStepMutatingPnpm(
  id: string,
  label: string,
  args: string[],
): GateStep {
  const before = gitDirtyContentMap();
  const { ok, output } = runCommandCaptured("pnpm", args);
  const changed = gitContentChangedPaths(before, gitDirtyContentMap());
  const detail = ok
    ? formatChangedFilesDetail(changed)
    : (firstFailureHint(output) ?? formatChangedFilesDetail(changed));
  const mutated = changed.length > 0;
  return {
    id,
    label,
    ok,
    detail,
    mutated,
    logBody: gateLogBody(output, ok, mutated),
  };
}

function runCiLikeVerifySteps(): GateStep[] {
  ensureSharedBuiltForGate();
  return [
    gateStepFromCaptured("types", "check-types", "pnpm", ["check-types"]),
    gateStepFromCaptured("ss-css", "lint:ss-css", "pnpm", ["lint:ss-css"]),
    gateStepFromCaptured("lint", "lint", "pnpm", ["lint"]),
    gateStepFromCaptured("test", "test", "pnpm", ["test"], {
      ok: parseVitestTestsDetail,
    }),
  ];
}

async function runCiLikeVerify(): Promise<boolean> {
  clack.note(
    `Lustrzane CI: check-types → lint:ss-css → lint → test ${pc.dim("(bez formatu)")}…`,
    "CI-like",
  );
  const steps = runCiLikeVerifySteps();
  const ok = summarizeGate("Lustrzane CI", steps);
  await offerSaveVerifyLog("Lustrzane CI", steps);
  return ok;
}

/** Codzienny gate: format → CI-like → docs links → knip. */
async function runDailyGate(): Promise<boolean> {
  warnSideEffects([
    "Prettier zapisze zmiany w plikach (format) — sprawdź git diff po zakończeniu",
    "Reszta kroków tylko sprawdza (types / ss-css / lint / test / links / knip)",
  ]);
  clack.note(
    "Codzienny gate: format → check-types → lint:ss-css → lint → test → links → knip…",
    "Gate",
  );
  const steps: GateStep[] = [
    gateStepMutatingPnpm("format", "format (Prettier)", ["format"]),
    ...runCiLikeVerifySteps(),
    gateStepFromCaptured(
      "links",
      "docs links",
      "node",
      ["scripts/quality/check-docs-links.mjs"],
      {
        ok: (output) => parseDocsLinksDetail(output, true),
        fail: (output) => parseDocsLinksDetail(output, false),
      },
    ),
    gateStepFromCaptured("knip", "knip", "pnpm", ["lint:knip"]),
  ];
  const ok = summarizeGate("Codzienny gate", steps);
  await offerSaveVerifyLog("Codzienny gate", steps);
  return ok;
}

/** Parse check-unlinked.mjs stdout; returns null on tool failure. */
function scanUnlinkedCount(): { ok: boolean; total: number; output: string } {
  const result = spawnSync("node", ["scripts/quality/check-unlinked.mjs"], {
    cwd: rootDir,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0 && result.status !== null) {
    return { ok: false, total: -1, output };
  }
  const match = output.match(/TOTAL UNLINKED REFERENCES FOUND:\s*(\d+)/);
  const total = match ? Number(match[1]) : 0;
  return { ok: true, total, output };
}

const UNLINKED_STEP_LABEL = "unlinked";

/**
 * Unlinked docs gate. With `autoFix`, runs fix-unlinked-links once and rechecks.
 */
function runUnlinkedGate(options: { autoFix?: boolean } = {}): GateStep {
  const autoFix = options.autoFix === true;
  const label = UNLINKED_STEP_LABEL;
  clack.note(`Skan niepodlinkowanych odniesień ${pc.dim("(check-unlinked.mjs)")}…`, "Skan");
  const first = scanUnlinkedCount();
  if (first.output) {
    process.stdout.write(
      first.output.endsWith("\n") ? first.output : `${first.output}\n`,
    );
  }
  if (!first.ok) {
    return {
      id: "unlinked",
      label,
      ok: false,
      detail: firstFailureHint(first.output) ?? "błąd skanu",
      logBody: gateLogBody(first.output, false),
    };
  }
  if (first.total === 0) {
    return {
      id: "unlinked",
      label,
      ok: true,
      detail: "0 niepodlinkowanych",
    };
  }

  if (!autoFix) {
    clack.log.error(
      `Gate unlinked: znaleziono ${first.total} odniesień (napraw w Docs i quality).`,
    );
    return {
      id: "unlinked",
      label,
      ok: false,
      detail: `znaleziono ${first.total}`,
      logBody: gateLogBody(first.output, false),
    };
  }

  clack.log.warn(
    `Gate unlinked: ${first.total} odniesień — auto-fix (fix-unlinked-links.mjs)…`,
  );
  const before = gitDirtyContentMap();
  const fixed = runCommandCaptured("node", [
    "scripts/quality/fix-unlinked-links.mjs",
  ]);
  const changed = gitContentChangedPaths(before, gitDirtyContentMap());
  if (!fixed.ok) {
    return {
      id: "unlinked",
      label,
      ok: false,
      detail: firstFailureHint(fixed.output) ?? "auto-fix failed",
      mutated: changed.length > 0,
      logBody: gateLogBody(
        `${first.output}\n${fixed.output}`,
        false,
        changed.length > 0,
      ),
    };
  }

  clack.note("Ponowny skan po auto-fix…", "Skan");
  const second = scanUnlinkedCount();
  if (second.output) {
    process.stdout.write(
      second.output.endsWith("\n") ? second.output : `${second.output}\n`,
    );
  }
  if (!second.ok) {
    return {
      id: "unlinked",
      label,
      ok: false,
      detail: firstFailureHint(second.output) ?? "błąd skanu po fix",
      mutated: changed.length > 0,
      logBody: gateLogBody(
        `${first.output}\n${fixed.output}\n${second.output}`,
        false,
        changed.length > 0,
      ),
    };
  }
  if (second.total > 0) {
    clack.log.error(
      `Gate unlinked: po auto-fix nadal ${second.total} odniesień.`,
    );
    return {
      id: "unlinked",
      label,
      ok: false,
      detail: `po auto-fix nadal ${second.total}`,
      mutated: changed.length > 0,
      logBody: gateLogBody(
        `${first.output}\n${fixed.output}\n${second.output}`,
        false,
        changed.length > 0,
      ),
    };
  }
  clack.log.success("Gate unlinked: auto-fix usunął wszystkie odniesienia.");
  return {
    id: "unlinked",
    label,
    ok: true,
    detail: `auto-fix ${first.total} → 0 (${changed.length} plików)`,
    mutated: changed.length > 0,
    logBody: gateLogBody(
      `${first.output}\n${fixed.output}\n${second.output}`,
      true,
      changed.length > 0,
    ),
  };
}

function looksLikeMissingPlaywrightBrowser(output: string): boolean {
  return (
    output.includes("Executable doesn't exist") ||
    output.includes("Looks like Playwright was just installed") ||
    /Please run the following command to download new browsers/i.test(output)
  );
}

function looksLikeE2ePortConflict(output: string): boolean {
  return (
    /EADDRINUSE/i.test(output) ||
    /address already in use/i.test(output) ||
    /Port \d+ is already in use/i.test(output) ||
    /strictPort/i.test(output)
  );
}

function looksLikeMissingNodeModule(output: string): boolean {
  return (
    /ERR_MODULE_NOT_FOUND/i.test(output) ||
    /Cannot find module/i.test(output) ||
    /Cannot find package/i.test(output) ||
    /Cannot find dependency/i.test(output)
  );
}

function spawnWebE2e(): { status: number | null; output: string } {
  const result = spawnSync("pnpm", ["--filter", "@stagesync/web", "test:e2e"], {
    cwd: rootDir,
    encoding: "utf8",
    shell: true,
    env: {
      ...process.env,
      NODE_NO_WARNINGS: "1",
      // Force fresh Vite/API (no reuseExistingServer) — see playwright.config.ts
      STAGESYNC_E2E_FRESH: "1",
    },
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

/**
 * Web e2e with env auto-fix (no false reds from setup):
 * - build @stagesync/shared (server needs dist)
 * - free :3000/:4000
 * - fresh webServers (STAGESYNC_E2E_FRESH)
 * - on fail: Playwright browser install / port kill / pnpm install + one retry
 */
function runWebE2eWithBrowserBootstrap(): GateStep {
  const label = "web e2e";
  clack.note(
    `E2E bootstrap: shared build → wolne porty → Playwright ${pc.dim("(@stagesync/web)")}…`,
    "E2E",
  );
  if (!runCommand("pnpm", ["--filter", "@stagesync/shared", "build"])) {
    clack.log.error("E2E: nie udało się zbudować @stagesync/shared.");
    return {
      id: "e2e",
      label,
      ok: false,
      detail: "shared build failed",
    };
  }
  freeDevPortsForE2e();

  /** Side-effects that actually ran (omit from summary when empty). */
  const fixes: string[] = [];
  let lastOutput = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    clack.note(
      attempt === 1
        ? "Uruchamianie Playwright E2E…"
        : "Ponawianie Playwright E2E po auto-fix…",
      "E2E",
    );
    const { status, output } = spawnWebE2e();
    lastOutput = output;
    if (output) {
      process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
    }
    if (status === 0) {
      const counts = parsePlaywrightDetail(output);
      const parts = [
        counts,
        fixes.length > 0 ? fixes.join(", ") : undefined,
      ].filter(Boolean);
      return {
        id: "e2e",
        label,
        ok: true,
        detail: parts.length > 0 ? parts.join("; ") : undefined,
      };
    }
    if (attempt === 2) {
      const counts = parsePlaywrightDetail(output);
      const fixNote = fixes.length > 0 ? `po: ${fixes.join(", ")}` : undefined;
      return {
        id: "e2e",
        label,
        ok: false,
        detail:
          [counts ?? firstFailureHint(output) ?? "fail", fixNote]
            .filter(Boolean)
            .join("; ") || "fail",
        logBody: gateLogBody(output, false),
      };
    }

    if (looksLikeMissingPlaywrightBrowser(output)) {
      clack.log.warn(
        "Brak binarki Playwright — `playwright install`, potem retry…",
      );
      if (
        !runCommand("pnpm", [
          "--filter",
          "@stagesync/web",
          "exec",
          "playwright",
          "install",
        ])
      ) {
        return {
          id: "e2e",
          label,
          ok: false,
          detail: "playwright install failed",
        };
      }
      fixes.push("zainstalowano Playwright");
      continue;
    }

    if (looksLikeE2ePortConflict(output)) {
      clack.log.warn("Konflikt portów e2e — zwalniam :3000/:4000 i retry…");
      freeDevPortsForE2e();
      fixes.push("zwolniono porty");
      continue;
    }

    if (looksLikeMissingNodeModule(output)) {
      clack.log.warn("Brak modułu Node — `pnpm install`, potem retry e2e…");
      if (!runCommand("pnpm", ["install"])) {
        return {
          id: "e2e",
          label,
          ok: false,
          detail: "pnpm install failed",
        };
      }
      freeDevPortsForE2e();
      fixes.push("pnpm install");
      continue;
    }

    // Prawdziwy fail testu / inny błąd — bez retry (nie zamazywać wyniku)
    return {
      id: "e2e",
      label,
      ok: false,
      detail:
        parsePlaywrightDetail(output) ?? firstFailureHint(output) ?? "fail",
      logBody: gateLogBody(output, false),
    };
  }

  return {
    id: "e2e",
    label,
    ok: false,
    detail:
      parsePlaywrightDetail(lastOutput) ??
      firstFailureHint(lastOutput) ??
      "fail",
    logBody: gateLogBody(lastOutput, false),
  };
}

/**
 * Kompletny audyt: Codzienny gate + unlinked + map + coverage + e2e + build +
 * launcher sync/test + version drift + owner typo + pnpm audit.
 * Auto-fix: unlinked links; Playwright browser install+retry on missing binary.
 * Skips interactive Tauri build/installers and Smart Tempo benchmark.
 */
async function runFullAudit(): Promise<boolean> {
  warnSideEffects([
    "Prettier zapisze pliki (format)",
    "unlinked: może auto-naprawić linki w Markdown (mutacja docs)",
    "e2e: może zabić procesy na :3000/:4000 i doinstalować Playwright / pnpm install",
    "generate:map zapisuje docs/REPO_MAP.md tylko przy zmianie struktury; coverage → coverage/",
    "sync:launcher-ui może nadpisać apps/desktop/launcher/vendor/*.css",
    "Długi przebieg (często wiele minut)",
  ]);
  clack.note(
    "Kompletny audyt: format → CI → links → unlinked → knip → map → coverage → e2e → build → launcher → version → owner → pnpm audit…",
    "Audyt",
  );
  const steps: GateStep[] = [
    gateStepMutatingPnpm("format", "format (Prettier)", ["format"]),
    ...runCiLikeVerifySteps(),
    gateStepFromCaptured(
      "links",
      "docs links",
      "node",
      ["scripts/quality/check-docs-links.mjs"],
      {
        ok: (output) => parseDocsLinksDetail(output, true),
        fail: (output) => parseDocsLinksDetail(output, false),
      },
    ),
    runUnlinkedGate({ autoFix: true }),
    gateStepFromCaptured("knip", "knip", "pnpm", ["lint:knip"]),
    gateStepMutatingPnpm("map", "generate:map", ["generate:map"]),
    (() => {
      const { ok, output } = runCommandCaptured("pnpm", ["test:coverage"]);
      if (!ok) {
        return {
          id: "coverage",
          label: "test:coverage",
          ok: false,
          detail: firstFailureHint(output) ?? "błąd",
          logBody: gateLogBody(output, false),
        } satisfies GateStep;
      }
      const detail =
        [parseVitestTestsDetail(output), parseCoverageStmtsDetail(output)]
          .filter(Boolean)
          .join("; ") || undefined;
      return {
        id: "coverage",
        label: "test:coverage",
        ok: true,
        detail,
      } satisfies GateStep;
    })(),
    runWebE2eWithBrowserBootstrap(),
    gateStepFromCaptured("build", "build", "pnpm", ["build"]),
    gateStepMutatingPnpm("launcher-sync", "sync:launcher-ui", [
      "sync:launcher-ui",
    ]),
    gateStepFromCaptured("desktop-test", "desktop launcher tests", "pnpm", [
      "--filter",
      "@stagesync/desktop",
      "test",
    ]),
    gateStepFromCaptured(
      "version-sync",
      "sync-version --check",
      "node",
      ["scripts/release/sync-version.mjs", "--check"],
      {
        ok: (output) => parseSyncVersionDetail(output, true),
        fail: (output) => parseSyncVersionDetail(output, false),
      },
    ),
    runOwnerTypoGate(),
    gateStepFromCaptured("audit", "pnpm audit", "pnpm", ["audit"], {
      ok: (output) => parsePnpmAuditDetail(output, true),
      fail: (output) => parsePnpmAuditDetail(output, false),
    }),
  ];
  const ok = summarizeGate("Kompletny audyt", steps);
  await offerSaveVerifyLog("Kompletny audyt", steps);
  return ok;
}

function previewReleaseNotes(pkgVer: string) {
  clack.log.info(
    `👁  Podgląd informacji o wydaniu dla wersji ${pc.bold(pc.cyan(`v${pkgVer}`))} ${pc.dim("(Preview Mode)")}:`,
  );
  console.log(`\n${pc.dim("───")} ${pc.bold("TYTUŁ WYDANIA")} ${pc.dim("───")}`);
  runCommand("node", ["scripts/release/release-title.mjs", pkgVer]);
  console.log(`\n\n${pc.dim("───")} ${pc.bold("OPIS WYDANIA (RELEASE NOTES)")} ${pc.dim("───")}`);
  runCommand("node", ["scripts/release/build-release-notes.mjs", pkgVer]);
}

interface NICInfo {
  name: string;
  address: string;
}

function getNetworkInterfaces(): NICInfo[] {
  const interfaces = os.networkInterfaces();
  const list: NICInfo[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        list.push({ name, address: net.address });
      }
    }
  }

  return list;
}

async function showLANInfo() {
  const nics = getNetworkInterfaces();
  if (nics.length === 0) {
    clack.log.warn("Nie wykryto aktywnych połączeń w sieci lokalnej (LAN).");
    return;
  }

  let selectedIP = nics[0].address;

  if (nics.length > 1) {
    const choices = nics.map((nic) => ({
      value: nic.address,
      label: `${nic.name} — ${nic.address}`,
    }));

    const choice = await clack.select({
      message: "Wybierz kartę sieciową (NIC) do podglądu LAN:",
      options: choices,
    });

    if (!clack.isCancel(choice)) {
      selectedIP = choice as string;
    }
  }

  clack.log.info(pc.bold(pc.cyan("🌐 Dedykowane URLe w sieci lokalnej (LAN):")));
  console.log(`   ${pc.bold("Localhost Admin UI")}:    ${pc.underline(pc.cyan("http://localhost:3000/admin"))}`);
  console.log(`   ${pc.bold("Localhost Client UI")}:   ${pc.underline(pc.cyan("http://localhost:3000/client"))}`);
  console.log(`   ${pc.bold("Localhost Server API")}:  ${pc.underline(pc.cyan("http://localhost:4000/api/health"))}`);
  console.log();
  console.log(`   ${pc.bold("LAN Client (Performer)")}: ${pc.underline(pc.cyan(`http://${selectedIP}:3000/client`))}`);
  console.log(`   ${pc.bold("LAN Admin UI")}:           ${pc.underline(pc.cyan(`http://${selectedIP}:3000/admin`))}`);
  console.log(
    `   ${pc.bold("LAN Server API")}:         ${pc.underline(pc.cyan(`http://${selectedIP}:4000/api/health`))}`,
  );

  const clientURL = `http://${selectedIP}:3000/client`;
  console.log(`\n${pc.green(pc.bold("📱 Kod QR dla tabletów / telefonów (Performer Client):"))}`);
  console.log(`   ${pc.underline(pc.cyan(clientURL))}\n`);
  qrcode.generate(clientURL, { small: true });
}

interface ProcessInfo {
  pid: string;
  name: string;
  port: number;
}

function findListeningProcessesOnPort(port: number): ProcessInfo[] {
  const isWin = os.platform() === "win32";
  const list: ProcessInfo[] = [];

  try {
    if (isWin) {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      const lines = output.trim().split("\n");
      for (const line of lines) {
        if (line.includes("LISTENING")) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !list.some((p) => p.pid === pid)) {
            let name = "nieznany";
            try {
              const taskOut = execSync(
                `tasklist /FI "PID eq ${pid}" /FO CSV /NH`,
                { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] },
              );
              const match = taskOut.match(/^"([^"]+)"/);
              if (match) name = match[1];
            } catch {
              // ignore
            }
            list.push({ pid, name, port });
          }
        }
      }
    } else {
      const output = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      const pids = output.trim().split("\n").filter(Boolean);
      for (const pid of pids) {
        let name = "nieznany";
        try {
          name = execSync(`ps -p ${pid} -o comm=`, {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "ignore"],
          }).trim();
        } catch {
          // ignore
        }
        list.push({ pid, name, port });
      }
    }
  } catch {
    // Brak aktywnych procesów
  }

  return list;
}

function killProcessTree(p: ProcessInfo) {
  const isWin = os.platform() === "win32";
  try {
    clack.log.message(`Zamykanie ${pc.yellow(`PID ${p.pid}`)} ${pc.dim(`(${p.name})`)} na ${pc.cyan(`:${p.port}`)}…`);
    if (isWin) {
      execSync(
        `powershell -NoProfile -Command "Stop-Process -Id ${p.pid} -ErrorAction SilentlyContinue"`,
        { stdio: "inherit" },
      );
    } else {
      execSync(`kill -15 ${p.pid}`, { stdio: "inherit" });
    }
  } catch {
    // soft kill failed
  }
  const remaining = findListeningProcessesOnPort(p.port);
  if (remaining.some((r) => r.pid === p.pid)) {
    try {
      if (isWin) {
        execSync(`taskkill /F /PID ${p.pid}`, { stdio: "inherit" });
      } else {
        execSync(`kill -9 ${p.pid}`, { stdio: "inherit" });
      }
    } catch {
      // ignore
    }
  }
}

/** Non-interactive: free LISTEN on Vite/API ports (e2e auto-fix). */
function freeDevPortsForE2e(ports: number[] = [3000, 4000]): void {
  const all: ProcessInfo[] = [];
  for (const port of ports) {
    all.push(...findListeningProcessesOnPort(port));
  }
  if (all.length === 0) return;
  clack.log.warn(
    pc.yellow(`E2E: zwalniam zajęte porty ${ports.map((p) => pc.cyan(`:${p}`)).join(", ")} ${pc.dim("(może zabić lokalny pnpm dev / Vite / API)")}`),
  );
  all.forEach((p) => {
    clack.log.message(` • Port ${pc.cyan(`:${p.port}`)} — ${pc.yellow(`PID ${p.pid}`)} ${pc.dim(`(${p.name})`)}`);
  });
  for (const p of all) killProcessTree(p);
}

async function managePortsAndZombies() {
  clack.log.info(pc.bold(pc.cyan("🔌 Bezpieczny Port Guard & Kill-Zombies...")));

  const procs3000 = findListeningProcessesOnPort(3000);
  const procs4000 = findListeningProcessesOnPort(4000);
  const allProcs = [...procs3000, ...procs4000];

  if (allProcs.length === 0) {
    clack.log.success(pc.green("Porty :3000 oraz :4000 są wolne."));
  } else {
    clack.log.warn(pc.yellow(pc.bold("Wykryto procesy zajmujące porty:")));
    allProcs.forEach((p) => {
      clack.log.message(` • Port ${pc.cyan(`:${p.port}`)} — ${pc.yellow(`PID ${p.pid}`)} ${pc.dim(`(${p.name})`)}`);
    });

    const confirmKill = await confirmPl("Czy chcesz zamknąć te procesy?", true);

    if (confirmKill) {
      for (const p of allProcs) killProcessTree(p);
      clack.log.success(pc.green("Zakończono procedurę czyszczenia portów."));
    } else {
      clack.log.info("Pominięto zamykanie procesów.");
    }
  }

  clack.log.info(pc.dim("🧹 Czyszczenie zalegających procesów sidecarów Tauri..."));
  const zombieScript = path.join(
    rootDir,
    "apps",
    "desktop",
    "scripts",
    "kill-zombies.mjs",
  );
  if (fs.existsSync(zombieScript)) {
    runCommand("node", [zombieScript]);
  }
}

async function runDoctorScan() {
  clack.log.info(pc.bold(pc.cyan("🏥 Doctor / Preflight — Lekka Diagnostyka Środowiska:")));

  // 1. Node.js
  try {
    const nodeVer = execSync("node -v", { encoding: "utf8" }).trim();
    const isNodeOk = nodeVer.match(/^v(2[2-9]|[3-9]\d)/);
    if (isNodeOk) {
      clack.log.success(`${pc.bold("Node.js")}: ${pc.cyan(nodeVer)} ${pc.dim("(Zgodny ≥22)")}`);
    } else {
      clack.log.warn(`${pc.bold("Node.js")}: ${pc.yellow(nodeVer)} ${pc.dim("(Zalecany Node 22 LTS)")}`);
    }
  } catch {
    clack.log.error(`${pc.bold("Node.js")}: ${pc.red("Nie znaleziono w systemie!")}`);
  }

  // 2. pnpm
  try {
    const pnpmVer = execSync("pnpm -v", { encoding: "utf8" }).trim();
    clack.log.success(`${pc.bold("pnpm")}: ${pc.cyan(`v${pnpmVer}`)}`);
  } catch {
    clack.log.error(`${pc.bold("pnpm")}: ${pc.red("Nie znaleziono w systemie!")}`);
  }

  // 3. Rust / Cargo
  try {
    const rustVer = execSync("cargo -V", { encoding: "utf8" }).trim();
    clack.log.success(`${pc.bold("Rust / Cargo")}: ${pc.cyan(rustVer)}`);
  } catch {
    clack.log.warn(
      `${pc.bold("Rust / Cargo")}: Nie znaleziono ${pc.dim("(wymagany tylko dla Desktop/Tauri)")}`,
    );
  }

  // 4. Docker (opcjonalny)
  try {
    const dockerVer = execSync("docker -v", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    clack.log.success(`${pc.bold("Docker")}: ${pc.cyan(dockerVer)}`);
  } catch {
    clack.log.warn(`${pc.bold("Docker")}: Brak klienta Docker ${pc.dim("(opcjonalny dla kontenerów)")}`);
  }

  // 5. GitHub CLI (Release Hub)
  try {
    const ghVer = execSync("gh --version", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    })
      .trim()
      .split("\n")[0];
    const auth = spawnSync("gh", ["auth", "status"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    });
    if (auth.status === 0) {
      clack.log.success(`${pc.bold("GitHub CLI (gh)")}: ${pc.cyan(ghVer)} — ${pc.green("zalogowany")}`);
    } else {
      clack.log.warn(
        `${pc.bold("GitHub CLI (gh)")}: ${pc.cyan(ghVer)} — ${pc.yellow("brak auth")} ${pc.dim("(wymagane dla Release Hub)")}`,
      );
    }
  } catch {
    clack.log.warn(
      `${pc.bold("GitHub CLI (gh)")}: Nie znaleziono ${pc.dim("(opcjonalne; potrzebne dla Release Hub)")}`,
    );
  }

  // 6. WebView2 (Windows)
  if (os.platform() === "win32") {
    const wv2Key =
      "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
    const wv2User =
      "HKCU:\\Software\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
    try {
      const hasWv2 =
        execSync(`powershell -NoProfile -Command "Test-Path '${wv2Key}'"`, {
          encoding: "utf8",
        }).trim() === "True" ||
        execSync(`powershell -NoProfile -Command "Test-Path '${wv2User}'"`, {
          encoding: "utf8",
        }).trim() === "True";
      if (hasWv2) {
        clack.log.success(`${pc.bold("WebView2 Runtime")}: ${pc.green("Obecny")}`);
      } else {
        clack.log.warn(
          `${pc.bold("WebView2 Runtime")}: Brak ${pc.dim("(wymagany do uruchomienia Tauri na Windows)")}`,
        );
      }
    } catch {
      clack.log.warn(`${pc.bold("WebView2 Runtime")}: ${pc.dim("Nie można zweryfikować stanu rejestru")}`);
    }
  }

  // 7. Dostępność Portów
  const p3000 = findListeningProcessesOnPort(3000);
  const p4000 = findListeningProcessesOnPort(4000);
  if (p3000.length === 0) clack.log.success(`${pc.bold("Port")} ${pc.cyan(":3000")}: ${pc.green("Wolny")}`);
  else
    clack.log.warn(
      `${pc.bold("Port")} ${pc.cyan(":3000")}: Zajęty przez ${pc.yellow(`PID ${p3000[0].pid} (${p3000[0].name})`)}`,
    );

  if (p4000.length === 0) clack.log.success(`${pc.bold("Port")} ${pc.cyan(":4000")}: ${pc.green("Wolny")}`);
  else
    clack.log.warn(
      `${pc.bold("Port")} ${pc.cyan(":4000")}: Zajęty przez ${pc.yellow(`PID ${p4000[0].pid} (${p4000[0].name})`)}`,
    );

  // 8. Pliki .env
  const envExists = fs.existsSync(path.join(rootDir, ".env"));
  const envExampleExists = fs.existsSync(path.join(rootDir, ".env.example"));
  if (envExists) clack.log.success(`${pc.bold("Plik .env")}: Obecny w korzeniu`);
  else if (envExampleExists)
    clack.log.warn(`${pc.bold("Plik .env")}: Brak ${pc.dim("(dostępny .env.example)")}`);
  else clack.log.warn(`${pc.bold("Plik .env")}: Brak pliku konfiguracji`);

  // 9. Efektywny data dir (ADR 0012)
  const { dir: dataDir, rule } = resolveHubDataDir();
  clack.log.success(`${pc.bold("Efektywny data dir")}: ${pc.dim(dataDir)} ${pc.dim(`(reguła: ${rule})`)}`);
  if (process.env.STAGESYNC_REPO_DEV) {
    clack.log.info(`${pc.bold("STAGESYNC_REPO_DEV")}: ${pc.dim(process.env.STAGESYNC_REPO_DEV)}`);
  } else {
    clack.log.info(`${pc.bold("STAGESYNC_REPO_DEV")}: ${pc.dim("nieustawiona")}`);
  }
  if (process.env.STAGESYNC_DATA_DIR) {
    clack.log.info(`${pc.bold("STAGESYNC_DATA_DIR")}: ${pc.dim(process.env.STAGESYNC_DATA_DIR)}`);
  }
}

async function cleanCache(): Promise<boolean> {
  warnSideEffects([
    "Usunie dist, .vite, .turbo, coverage, node_modules/.cache w apps/ i packages/",
    "Usunie apps/desktop/src-tauri/target (długi rebuild Tauri przy następnym buildzie)",
    "Nie rusza node_modules (poza .cache) ani katalogu data/",
  ]);
  if (
    !(await confirmDanger(
      "Na pewno wyczyścić cache/artefakty buildów monorepo?",
      false,
    ))
  ) {
    clack.log.info("Pominięto czyszczenie cache.");
    return false;
  }

  const s = clack.spinner();
  s.start("Głębokie skanowanie i czyszczenie pamięci podręcznej monorepo...");

  // Automatyczne zbieranie wszystkich katalogów dist, .vite, .turbo, target, coverage, .cache z całego monorepo
  const targets: string[] = [
    path.join(rootDir, ".turbo"),
    path.join(rootDir, "coverage"),
    path.join(rootDir, "node_modules", ".cache"),
  ];

  const subDirs = ["apps", "packages"];
  for (const group of subDirs) {
    const groupPath = path.join(rootDir, group);
    if (fs.existsSync(groupPath)) {
      const items = fs.readdirSync(groupPath);
      for (const item of items) {
        const itemPath = path.join(groupPath, item);
        if (fs.statSync(itemPath).isDirectory()) {
          targets.push(path.join(itemPath, "dist"));
          targets.push(path.join(itemPath, ".vite"));
          targets.push(path.join(itemPath, ".turbo"));
          targets.push(path.join(itemPath, "coverage"));
          targets.push(path.join(itemPath, "node_modules", ".cache"));
          if (item === "desktop") {
            targets.push(path.join(itemPath, "src-tauri", "target"));
          }
        }
      }
    }
  }

  let cleanedCount = 0;
  let lockedCount = 0;
  const cleanedPaths: string[] = [];
  const lockedPaths: string[] = [];

  for (const p of targets) {
    if (fs.existsSync(p)) {
      try {
        fs.rmSync(p, { recursive: true, force: true });
        if (!fs.existsSync(p)) {
          cleanedCount++;
          cleanedPaths.push(path.relative(rootDir, p));
        } else {
          lockedCount++;
          lockedPaths.push(path.relative(rootDir, p));
        }
      } catch {
        lockedCount++;
        lockedPaths.push(path.relative(rootDir, p));
      }
    }
  }

  s.stop(
    `Zakończono czyszczenie: usunięto ${pc.bold(pc.green(String(cleanedCount)))} katalogów kompilacji/pamięci podręcznej.`,
  );

  if (cleanedPaths.length > 0) {
    clack.log.success(pc.green("Wyczyszczone katalogi:"));
    cleanedPaths.forEach((cp) => clack.log.message(` ${pc.green("•")} ${pc.dim(cp)}`));
  }

  if (lockedPaths.length > 0) {
    clack.log.warn(
      pc.yellow("Zablokowane katalogi (zamknij działające procesy Vite/Tauri/Node):"),
    );
    lockedPaths.forEach((lp) => clack.log.message(` ${pc.yellow("⚠️")} ${pc.yellow(lp)}`));
  }
  return true;
}

async function menuClean() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "Konserwacja & Cache:",
    options: [
      {
        value: "monorepo",
        label:
          "1. 🧹  Głębokie czyszczenie cache monorepo (.turbo, dist, .cache)",
      },
      {
        value: "android",
        label:
          "2. 🤖  Czyszczenie cache budowania Android (Gradle - pnpm clean:android)",
      },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "monorepo") {
    await cleanCache();
    await waitReturn();
  } else if (choice === "android") {
    clack.note(
      `Czyszczenie cache budowania Androida ${pc.dim("(pnpm clean:android)")}...`,
      "Czyszczenie",
    );
    runCommand("pnpm", ["clean:android"]);
    await waitReturn();
  }
}

function showGitStatus() {
  try {
    const branch = execSync("git branch --show-current", {
      encoding: "utf8",
    }).trim();
    const status = execSync("git status -s", { encoding: "utf8" }).trim();
    const log = execSync("git log -5 --oneline", { encoding: "utf8" }).trim();

    clack.log.info(`📍 Bieżąca gałąź Git: ${pc.bold(pc.cyan(branch))}`);
    console.log(`\n📜 ${pc.bold("Ostatnie 5 commitów:")}`);
    console.log(pc.dim(log));

    console.log();
    if (status) {
      clack.log.warn(
        pc.yellow(pc.bold("Niezatwierdzone / Zmodyfikowane pliki:")),
      );
      console.log(pc.yellow(status));
    } else {
      clack.log.success(
        pc.green("Katalog roboczy jest czysty (no pending changes)."),
      );
    }
  } catch {
    clack.log.error(pc.red("Błąd podczas pobierania statusu Git."));
  }
}

async function menuRunAndDev() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "Uruchomienie & Dev:",
    options: [
      {
        value: "web",
        label: "1. 🚀  Web UI + API (Vite UI :3000 + Server :4000)",
      },
      { value: "web-only", label: "2. 🌐  Web Only (Tylko frontend Vite)" },
      { value: "api-only", label: "3. ⚙️   API Only (Tylko serwer Node)" },
      { value: "desktop", label: "4. 💻  Desktop Shell (Tauri + Launcher)" },
      {
        value: "desktop-build",
        label: "5. 📦  Buduj instalator (Tauri Build) ⚠️ długo",
      },
      {
        value: "desktop-nsis-smoke",
        label: "6. 🧪  Pusty instalator NSIS (smoke, bez sidecara)",
      },
      {
        value: "docker",
        label: "7. 🐳  Stack produkcyjny (Docker Compose) ⚠️",
      },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "web") {
    clack.note(
      `Uruchamianie Web + API ${pc.dim("(Vite :3000 + Server :4000; bez Tauri)")}... Press Ctrl+C to stop.`,
      "Dev",
    );
    runCommand("pnpm", ["dev"]);
  } else if (choice === "web-only") {
    clack.note("Uruchamianie Web UI Only... Press Ctrl+C to stop.", "Dev");
    runCommand("pnpm", ["--filter", "@stagesync/web", "dev"]);
  } else if (choice === "api-only") {
    clack.note("Uruchamianie Server API Only... Press Ctrl+C to stop.", "Dev");
    runCommand("pnpm", ["--filter", "@stagesync/server", "dev"]);
  } else if (choice === "desktop") {
    clack.note(
      `Uruchamianie Tauri Desktop Shell ${pc.dim("(sync web/sidecar + tauri:dev)")}... Press Ctrl+C to stop.`,
      "Dev",
    );
    runCommand("pnpm", ["--filter", "@stagesync/desktop", "dev"]);
  } else if (choice === "desktop-build") {
    warnSideEffects([
      "Pełny tauri:build — długo, wymaga Rust/Cargo; zapisze artefakty instalatora",
    ]);
    if (
      !(await confirmDanger("Uruchomić pełny build instalatora Tauri?", false))
    ) {
      clack.log.info("Anulowano tauri:build.");
      return;
    }
    clack.note(`Budowanie instalatora Tauri ${pc.dim("(pnpm tauri:build)")}...`, "Build");
    runCommand("pnpm", ["--filter", "@stagesync/desktop", "tauri:build"]);
    await waitReturn();
  } else if (choice === "desktop-nsis-smoke") {
    clack.note(
      `Szybki pusty NSIS ${pc.dim("(bez sidecara / resources)")} — tylko test wyglądu instalatora…`,
      "Build",
    );
    runCommand("pnpm", [
      "--filter",
      "@stagesync/desktop",
      "tauri:build:nsis-smoke",
    ]);
    await waitReturn();
  } else if (choice === "docker") {
    warnSideEffects([
      "docker compose up --build buduje/uruchamia kontenery; Ctrl+C zatrzymuje foreground",
      "Może zająć porty i dużo miejsca na obrazy",
    ]);
    if (
      !(await confirmDanger("Uruchomić Docker Compose (up --build)?", false))
    ) {
      clack.log.info("Anulowano Docker Compose.");
      return;
    }
    clack.note(
      "Uruchamianie Docker Compose... Press Ctrl+C to stop.",
      "Docker",
    );
    runCommand("docker", ["compose", "up", "--build"]);
  }
}

async function menuNetwork() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "Sieć & Diagnostyka LAN:",
    options: [
      { value: "ip", label: "1. 📱  Podgląd LAN IP + Kod QR (z wyborem NIC)" },
      { value: "ports", label: "2. 🔌  Port Guard & Kill-Zombies" },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "ip") {
    await showLANInfo();
    await waitReturn();
  } else if (choice === "ports") {
    await managePortsAndZombies();
    await waitReturn();
  }
}

async function menuTestingVerify() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "Verify:",
    options: [
      {
        value: "ci-mirror",
        label: "1. ✅  Lustrzane CI (types + ss-css + lint + test, bez zapisu)",
      },
      {
        value: "daily",
        label: "2. 🚀  Codzienny gate (+ format + links + knip)",
      },
      {
        value: "full-audit",
        label:
          "3. 🧨  Kompletny audyt (+ unlinked, map, coverage, e2e, build, launcher, version, audit)",
      },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "ci-mirror") {
    await runCiLikeVerify();
    await waitReturn();
  } else if (choice === "daily") {
    if (
      !(await confirmDanger(
        "Codzienny gate zapisze pliki (Prettier). Uruchomić?",
        true,
      ))
    ) {
      clack.log.info("Anulowano Codzienny gate.");
      await waitReturn();
      return;
    }
    await runDailyGate();
    await waitReturn();
  } else if (choice === "full-audit") {
    if (
      !(await confirmDanger(
        "Kompletny audyt: format, auto-fix docs, e2e może zabić :3000/:4000, długo. Uruchomić?",
        false,
      ))
    ) {
      clack.log.info("Anulowano Kompletny audyt.");
      await waitReturn();
      return;
    }
    await runFullAudit();
    await waitReturn();
  }
}

/** Docs quality: scan bare backtick file refs, then optionally auto-link them. */
async function runUnlinkedScanAndMaybeFix() {
  clack.note(
    `Skanowanie niepodlinkowanych odniesień ${pc.dim("(check-unlinked.mjs)")}…`,
    "Skan",
  );
  const result = spawnSync("node", ["scripts/quality/check-unlinked.mjs"], {
    cwd: rootDir,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  const out = result.stdout ?? "";
  const err = result.stderr ?? "";
  if (out) process.stdout.write(out.endsWith("\n") ? out : `${out}\n`);
  if (err) process.stderr.write(err.endsWith("\n") ? err : `${err}\n`);

  if (result.status !== 0 && result.status !== null) {
    clack.log.error("Skan niepodlinkowanych odniesień zakończył się błędem.");
    await waitReturn();
    return;
  }

  const match = out.match(/TOTAL UNLINKED REFERENCES FOUND:\s*(\d+)/);
  const total = match ? Number(match[1]) : 0;

  if (total === 0) {
    clack.log.success("Brak niepodlinkowanych odniesień do naprawienia.");
    await waitReturn();
    return;
  }

  const doFix = await confirmPl(
    `Znaleziono ${total} niepodlinkowanych odniesień. Naprawić teraz?`,
    true,
  );

  if (!doFix) {
    clack.log.info("Pominięto naprawę.");
    await waitReturn();
    return;
  }

  clack.note(
    `Naprawianie niepodlinkowanych linków ${pc.dim("(fix-unlinked-links.mjs)")}…`,
    "Auto-fix",
  );
  runCommand("node", ["scripts/quality/fix-unlinked-links.mjs"]);
  await waitReturn();
}

async function menuTestingDocs() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "Docs i quality:",
    options: [
      { value: "map", label: "1. 🗺   Wygeneruj mapę kodu" },
      { value: "ss-css", label: "2. 🎨  CSS Token Guard (ss-css)" },
      { value: "knip", label: "3. 📦  Dead Code & Dependency Detector (knip)" },
      { value: "links", label: "4. 🔗  Weryfikacja linków w dokumentacji" },
      {
        value: "unlinked",
        label: "5. 🔍  Niepodlinkowane odniesienia (skan → naprawa)",
      },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "map") {
    clack.note(`Generowanie mapy repozytorium ${pc.dim("(pnpm generate:map)")}...`, "Map");
    runCommand("pnpm", ["generate:map"]);
    await waitReturn();
  } else if (choice === "ss-css") {
    clack.note(`Sprawdzanie tokenów CSS ${pc.dim("(pnpm lint:ss-css)")}...`, "CSS");
    runCommand("pnpm", ["lint:ss-css"]);
    await waitReturn();
  } else if (choice === "knip") {
    clack.note(
      `Skanowanie nieużywanego kodu i zależności ${pc.dim("(pnpm lint:knip)")}...`,
      "Knip",
    );
    runCommand("pnpm", ["lint:knip"]);
    await waitReturn();
  } else if (choice === "links") {
    clack.note(
      `Weryfikacja linków w dokumentacji ${pc.dim("(check-docs-links.mjs)")}...`,
      "Linki",
    );
    runCommand("node", ["scripts/quality/check-docs-links.mjs"]);
    await waitReturn();
  } else if (choice === "unlinked") {
    await runUnlinkedScanAndMaybeFix();
  }
}

async function menuTestingUnit() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "Unit i bench:",
    options: [
      { value: "shared", label: "1. ⚡  Testy PPQ/Ticks (@stagesync/shared)" },
      {
        value: "server",
        label: "2. 🎼  Testy serwera transportu (@stagesync/server)",
      },
      { value: "web", label: "3. 🎨  Testy UI Admin/Client (@stagesync/web)" },
      { value: "ui", label: "4. 🧩  Testy design system (@stagesync/ui)" },
      { value: "e2e", label: "5. 🎭  E2E Playwright (@stagesync/web)" },
      { value: "test-cov", label: "6. 📊  Testy z pokryciem (Coverage)" },
      { value: "benchmark", label: "7. 🎯  Smart Tempo DSP Benchmark" },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "shared") {
    runCommand("pnpm", ["--filter", "@stagesync/shared", "test"]);
    await waitReturn();
  } else if (choice === "server") {
    runCommand("pnpm", ["--filter", "@stagesync/server", "test"]);
    await waitReturn();
  } else if (choice === "web") {
    runCommand("pnpm", ["--filter", "@stagesync/web", "test"]);
    await waitReturn();
  } else if (choice === "ui") {
    runCommand("pnpm", ["--filter", "@stagesync/ui", "test"]);
    await waitReturn();
  } else if (choice === "e2e") {
    runWebE2eWithBrowserBootstrap();
    await waitReturn();
  } else if (choice === "test-cov") {
    clack.note(
      `Uruchamianie testów z pokryciem ${pc.dim("(turbo run test:coverage)")}...`,
      "Coverage",
    );
    runCommand("pnpm", ["test:coverage"]);
    await waitReturn();
  } else if (choice === "benchmark") {
    clack.note("Uruchamianie Smart Tempo DSP Benchmark...", "Benchmark");
    runCommand("pnpm", ["benchmark:record"], {
      env: { RUN_SMART_TEMPO_BENCHMARK: "1" },
    });
    await waitReturn();
  }
}

async function menuTestingBuild() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "Build:",
    options: [
      { value: "build", label: "1. 🏗   Pełny Build (Turbo)" },
      { value: "sync-ui", label: "2. 🔄  Sync Launcher UI" },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "build") {
    clack.note(`Uruchamianie pełnego buildu ${pc.dim("(turbo run build)")}...`, "Build");
    runCommand("pnpm", ["build"]);
    await waitReturn();
  } else if (choice === "sync-ui") {
    clack.note("Synchronizacja UI launchera...", "Sync");
    runCommand("pnpm", ["sync:launcher-ui"]);
    await waitReturn();
  }
}

async function menuTesting() {
  while (true) {
    clearTerminalScreen();
    const choice = await clack.select({
      message: "Testy & Jakość:",
      options: [
        { value: "verify", label: "1. ✅  Verify ›" },
        { value: "docs", label: "2. 📚  Docs i quality ›" },
        { value: "unit", label: "3. 🧪  Unit i bench ›" },
        { value: "build", label: "4. 🏗   Build ›" },
        { value: "back", label: "0. ↩️   Powrót" },
      ],
    });

    if (clack.isCancel(choice) || choice === "back") return;

    if (choice === "verify") await menuTestingVerify();
    else if (choice === "docs") await menuTestingDocs();
    else if (choice === "unit") await menuTestingUnit();
    else if (choice === "build") await menuTestingBuild();
  }
}

async function menuRelease() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "GitHub & Wydania / Release Hub:",
    options: [
      { value: "git", label: "1. 🔍  Status Git & Hygiene" },
      { value: "sync", label: "2. 🏷   Synchronizacja Wersji Monorepo" },
      { value: "checklist", label: "3. 📋  Pre-Release Checklist 2.0" },
      { value: "preview", label: "4. 👁   Podgląd Informacji o Wydaniu" },
      { value: "extract", label: "5. ✂️   Wyodrębnij sekcję Changeloga" },
      { value: "cut", label: "6. 🚀  Przygotowanie Taga" },
      { value: "exec", label: "7. ⚡  Release" },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "sync") {
    warnSideEffects([
      "Nadpisze numery wersji w package.json aplikacji, Tauri, Android, Docker itd.",
    ]);
    if (
      !(await confirmDanger(
        "Zsynchronizować wersję monorepo z root package.json?",
        false,
      ))
    ) {
      clack.log.info("Anulowano sync-version.");
      await waitReturn();
      return;
    }
    clack.note(
      `Synchronizowanie wersji w monorepo ${pc.dim("(node scripts/release/sync-version.mjs)")}...`,
      "Wersja",
    );
    runCommand("node", ["scripts/release/sync-version.mjs"]);
    await waitReturn();
  } else if (choice === "exec") {
    const confirmExec = await confirmDanger(
      "exec-release: publikacja / tag / monitor CI. Kontynuować? (wymaga gh auth)",
      false,
    );
    if (!confirmExec) {
      clack.log.info("Anulowano Release.");
      await waitReturn();
      return;
    }
    clack.note(
      `Wykonywanie właściwego release ${pc.dim("(node scripts/release/exec-release.mjs)")}...`,
      "Release",
    );
    runCommand("node", ["scripts/release/exec-release.mjs"]);
    await waitReturn();
  } else if (choice === "extract") {
    const defaultVer = readRootPackageVersion() ?? "";
    const version = await clack.text({
      message: "Wersja sekcji CHANGELOG do wyodrębnienia:",
      placeholder: "np. 5.4.11",
      initialValue: defaultVer,
      validate: (v) => (v?.trim() ? undefined : "Podaj wersję SemVer"),
    });
    if (clack.isCancel(version)) return;
    clack.note(
      `Wyodrębnianie sekcji Changeloga dla ${version}...`,
      "Changelog",
    );
    runCommand("node", [
      "scripts/release/extract-changelog-section.mjs",
      version.trim(),
    ]);
    await waitReturn();
  } else if (choice === "checklist") {
    clack.note(
      `Uruchamianie Pre-Release Checklist 2.0 ${pc.dim("(CI-like + preview)")}…`,
      "Checklist",
    );
    const ok = await runCiLikeVerify();
    if (ok) {
      const pkgVer = readRootPackageVersion();
      if (pkgVer) {
        previewReleaseNotes(pkgVer);
        clack.log.success("✅ Pre-Release Checklist 2.0 zakończona sukcesem!");
      } else {
        clack.log.error(
          "CI-like OK, ale nie udało się odczytać version z package.json — pominięto preview.",
        );
      }
    } else {
      clack.log.error("❌ Wykryto błędy w Checklist! Przejrzyj logi powyżej.");
    }
    await waitReturn();
  } else if (choice === "preview") {
    const pkgVer = readRootPackageVersion();
    if (!pkgVer) {
      clack.log.error("Nie udało się odczytać version z package.json.");
      await waitReturn();
      return;
    }
    previewReleaseNotes(pkgVer);
    await waitReturn();
  } else if (choice === "cut") {
    const bumpType = await clack.select({
      message: "Wybierz typ podbicia wersji SemVer:",
      options: [
        { value: "patch", label: "1. 🐛  Bugfix / Patch (np. 5.4.8 -> 5.4.9)" },
        {
          value: "minor",
          label: "2. ✨  Nowa Funkcjonalność / Minor (np. 5.4.8 -> 5.5.0)",
        },
        {
          value: "major",
          label: "3. 💥  Wydanie Główne / Major (np. 5.4.8 -> 6.0.0)",
        },
        {
          value: "alpha",
          label: "4. 🧪  Prerelease Alpha (np. 5.5.0-alpha.1)",
        },
        { value: "beta", label: "5. 🧪  Prerelease Beta (np. 5.5.0-beta.1)" },
        { value: "cancel", label: "0. ↩️   Anuluj" },
      ],
    });
    if (clack.isCancel(bumpType) || bumpType === "cancel") return;

    const confirmCut = await confirmDanger(
      `cut-release (${bumpType}): bump SemVer, CHANGELOG, commit/tag. Na pewno?`,
      false,
    );
    if (!confirmCut) {
      clack.log.info("Anulowano cut-release.");
      await waitReturn();
      return;
    }

    clack.note(
      `Wykonywanie procedury cut-release dla typu: ${bumpType}...`,
      "Cut",
    );
    runCommand("node", ["scripts/release/cut-release.mjs", bumpType as string]);
    await waitReturn();
  } else if (choice === "git") {
    showGitStatus();
    await waitReturn();
  }
}

async function menuData() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "Zarządzanie danymi & Logi:",
    options: [
      { value: "logs", label: "1. 📝  Podgląd ostatnich logów" },
      { value: "clear-data", label: "2. 🗑  Wyczyść katalog danych" },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  const { dir: dataDir, rule } = resolveHubDataDir();
  clack.log.info(`Efektywny data dir: ${dataDir} (reguła: ${rule})`);

  if (choice === "logs") {
    const logDir = path.join(dataDir, "logs");
    if (fs.existsSync(logDir)) {
      const entries = fs
        .readdirSync(logDir)
        .map((name) => {
          const full = path.join(logDir, name);
          try {
            const st = fs.statSync(full);
            if (!st.isFile()) return null;
            return { name, full, mtime: st.mtimeMs };
          } catch {
            return null;
          }
        })
        .filter((e): e is { name: string; full: string; mtime: number } => !!e)
        .sort((a, b) => b.mtime - a.mtime);

      if (entries.length > 0) {
        const latest = entries[0];
        clack.log.info(`Ostatni log: ${latest.name}`);
        console.log(fs.readFileSync(latest.full, "utf8").slice(-2000));
      } else {
        clack.log.warn("Brak plików logów.");
      }
    } else {
      clack.log.error(`Katalog logów nie istnieje: ${logDir}`);
    }
    await waitReturn();
  } else if (choice === "clear-data") {
    const repoData = path.join(rootDir, "data");
    const isRepoData = path.resolve(dataDir) === path.resolve(repoData);
    warnSideEffects([
      `Trwale usunie zawartość: ${dataDir}`,
      isRepoData
        ? "To katalog repo data/ (README.md zostanie zachowany)"
        : "To NIE jest repo data/ — możesz skasować lokalne projekty/logi użytkownika (np. Documents/StageSync)",
    ]);
    const confirm = await confirmDanger(
      `Wyczyścić katalog danych?\n${dataDir}`,
      false,
    );
    if (confirm) {
      if (!fs.existsSync(dataDir)) {
        clack.log.warn("Katalog danych nie istnieje — nic do wyczyszczenia.");
      } else {
        const protectReadme = isRepoData;
        for (const file of fs.readdirSync(dataDir)) {
          if (protectReadme && file === "README.md") continue;
          fs.rmSync(path.join(dataDir, file), {
            recursive: true,
            force: true,
          });
        }
        clack.log.success(`Katalog danych wyczyszczony: ${dataDir}`);
      }
    } else {
      clack.log.info("Pominięto czyszczenie danych.");
    }
    await waitReturn();
  }
}

async function menuDependencies() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "Zależności & Pakiety (pnpm):",
    options: [
      { value: "outdated", label: "1. 🔍  Sprawdź nieaktualne pakiety" },
      { value: "up", label: "2. 🆙  Interaktywna aktualizacja pakietów" },
      { value: "install", label: "3. 📥  Wymuś ponowną instalację" },
      { value: "audit", label: "4. 🛡️   Audyt bezpieczeństwa" },
      { value: "prune", label: "5. 🧹  Czyszczenie pnpm store" },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "outdated") {
    clack.note(
      `Sprawdzanie nieaktualnych pakietów w monorepo ${pc.dim("(pnpm outdated -r)")}...`,
      "Outdated",
    );
    runCommand("pnpm", ["outdated", "-r"]);
    await waitReturn();
  } else if (choice === "up") {
    warnSideEffects([
      "pnpm up -i -r --latest może podbić major zależności w całym monorepo",
      "Po wyborze pakietów zmieni package.json / lockfile — zrób commit świadomie",
    ]);
    if (
      !(await confirmDanger(
        "Uruchomić interaktywną aktualizację pakietów?",
        true,
      ))
    ) {
      clack.log.info("Anulowano aktualizację pakietów.");
      await waitReturn();
      return;
    }
    clack.note(
      `Uruchamianie interaktywnej aktualizacji pakietów ${pc.dim("(pnpm up -i -r --latest)")}...`,
      "Update",
    );
    runCommand("pnpm", ["up", "-i", "-r", "--latest"]);
    await waitReturn();
  } else if (choice === "install") {
    warnSideEffects([
      "pnpm install --force przebuduje node_modules (wolne, może zepsuć działające dev servery)",
    ]);
    if (
      !(await confirmDanger("Wymusić ponowną instalację zależności?", false))
    ) {
      clack.log.info("Anulowano install --force.");
      await waitReturn();
      return;
    }
    clack.note(
      `Wymuszanie ponownej instalacji zależności ${pc.dim("(pnpm install --force)")}...`,
      "Install",
    );
    runCommand("pnpm", ["install", "--force"]);
    await waitReturn();
  } else if (choice === "audit") {
    clack.note(
      `Uruchamianie audytu bezpieczeństwa zależności ${pc.dim("(pnpm audit)")}...`,
      "Audit",
    );
    runCommand("pnpm", ["audit"]);
    await waitReturn();
  } else if (choice === "prune") {
    warnSideEffects([
      "pnpm store prune usuwa nieużywane pakiety z globalnego store — kolejne install może pobierać je ponownie",
    ]);
    if (!(await confirmDanger("Wyczyścić pnpm store (prune)?", false))) {
      clack.log.info("Anulowano store prune.");
      await waitReturn();
      return;
    }
    clack.note(
      `Czyszczenie lokalnego pnpm store ${pc.dim("(pnpm store prune)")}...`,
      "Prune",
    );
    runCommand("pnpm", ["store", "prune"]);
    await waitReturn();
  }
}

async function main() {
  const args = initVerifySaveLogFromArgs(process.argv.slice(2));
  if (args.length > 0) {
    const flag = args[0].toLowerCase();
    if (flag === "doctor") {
      await runDoctorScan();
      return;
    }
    if (flag === "ports") {
      await managePortsAndZombies();
      return;
    }
    if (flag === "knip") {
      runCommand("pnpm", ["lint:knip"]);
      return;
    }
    if (flag === "ss-css" || flag === "css") {
      runCommand("pnpm", ["lint:ss-css"]);
      return;
    }
    if (flag === "links") {
      runCommand("node", ["scripts/quality/check-docs-links.mjs"]);
      return;
    }
    if (flag === "web" || flag === "dev") {
      runCommand("pnpm", ["dev"]);
      return;
    }
    if (flag === "desktop") {
      runCommand("pnpm", ["--filter", "@stagesync/desktop", "dev"]);
      return;
    }
    if (flag === "map") {
      runCommand("pnpm", ["generate:map"]);
      return;
    }
    if (flag === "types") {
      runCommand("pnpm", ["check-types"]);
      return;
    }
    if (flag === "verify" || flag === "ci") {
      const ok = await runCiLikeVerify();
      process.exit(ok ? 0 : 1);
    }
    if (
      flag === "pr" ||
      flag === "before-pr" ||
      flag === "daily" ||
      flag === "gate"
    ) {
      const ok = await runDailyGate();
      process.exit(ok ? 0 : 1);
    }
    if (
      flag === "all" ||
      flag === "full" ||
      flag === "everything" ||
      flag === "audit"
    ) {
      const ok = await runFullAudit();
      process.exit(ok ? 0 : 1);
    }
    if (flag === "release") {
      await menuRelease();
      return;
    }
    if (flag === "deps" || flag === "dependencies" || flag === "pnpm") {
      await menuDependencies();
      return;
    }
    if (flag === "outdated") {
      clack.note(
        `Sprawdzanie nieaktualnych pakietów w monorepo ${pc.dim("(pnpm outdated -r)")}...`,
        "Outdated",
      );
      runCommand("pnpm", ["outdated", "-r"]);
      return;
    }
    if (flag === "up" || flag === "update") {
      clack.note(
        `Uruchamianie interaktywnej aktualizacji pakietów ${pc.dim("(pnpm up -i -r --latest)")}...`,
        "Update",
      );
      runCommand("pnpm", ["up", "-i", "-r", "--latest"]);
      return;
    }
    if (flag === "security" || flag === "pnpm-audit") {
      clack.note(
        `Uruchamianie audytu bezpieczeństwa zależności ${pc.dim("(pnpm audit)")}...`,
        "Audit",
      );
      runCommand("pnpm", ["audit"]);
      return;
    }
    if (flag === "network" || flag === "ip") {
      await showLANInfo();
      return;
    }
    if (flag === "clean") {
      await cleanCache();
      return;
    }
    if (flag === "test") {
      await menuTesting();
      return;
    }
  }

  while (true) {
    clearTerminalScreen();
    hubIntro("🎛   StageSync — Developer Experience Suite (DX Hub)");

    const category = await clack.select({
      message: "Wybierz kategorię zadań:",
      options: [
        { value: "doctor", label: "1. 🏥  Szybka Diagnostyka" },
        { value: "dev", label: "2. 🚀  Uruchomienie & Dev ›" },
        { value: "network", label: "3. 🌐  Sieć & Diagnostyka LAN ›" },
        { value: "testing", label: "4. 🧪  Testy & Jakość ›" },
        { value: "release", label: "5. 🐙  GitHub & Wydania ›" },
        { value: "deps", label: "6. 📦  Zależności & Pakiety ›" },
        { value: "clean", label: "7. 🧹  Konserwacja & Cache ›" },
        { value: "data", label: "8. 💾  Zarządzanie danymi & Logi ›" },
        { value: "setup", label: "9. 🛠   Setup Środowiska ⚠️" },
        { value: "exit", label: "0. 🚪  Wyjście" },
      ],
    });

    if (clack.isCancel(category) || category === "exit") {
      clack.outro(pc.bold(pc.green("Do zobaczenia na scenie! 👋")));
      process.exit(0);
    }

    if (category === "doctor") {
      await runDoctorScan();
      await waitReturn();
    }
    if (category === "dev") await menuRunAndDev();
    if (category === "network") await menuNetwork();
    if (category === "testing") await menuTesting();
    if (category === "release") await menuRelease();
    if (category === "deps") await menuDependencies();
    if (category === "clean") await menuClean();
    if (category === "data") {
      await menuData();
    }
    if (category === "setup") {
      warnSideEffects([
        "Może instalować Node/pnpm/Rust/WebView2 i inne zależności systemowe",
        "Wymaga uprawnień / interakcji (winget, fnm, brew) — nie uruchamiaj „w tle” bez czytania promptów",
      ]);
      if (
        !(await confirmDanger(
          "Uruchomić natywny setup środowiska (setup.ps1 / setup.sh)?",
          false,
        ))
      ) {
        clack.log.info("Anulowano setup.");
        await waitReturn();
        continue;
      }
      const isWin = os.platform() === "win32";
      clack.note("Uruchamianie pełnej procedury setupu...", "Setup");
      if (isWin) {
        runCommand("powershell", [
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          ".\\scripts\\setup\\setup.ps1",
        ]);
      } else {
        runCommand("bash", ["./scripts/setup/setup.sh"]);
      }
      await waitReturn();
    }
  }
}

main().catch((err) => {
  console.error("Błąd w Dev Hub:", err);
  process.exit(1);
});
