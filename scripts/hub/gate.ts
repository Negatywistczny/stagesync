/**
 * Gate infrastructure: step runners, summaries, parsers, verify logs.
 */

import {
  clack,
  pc,
  spawnSync,
  execSync,
  fs,
  path,
  rootDir,
  runCommand,
  runCommandCaptured,
  stripAnsi,
  truncateHint,
  isNoiseFailureLine,
  firstFailureHint,
  gitDirtyContentMap,
  gitContentChangedPaths,
  formatChangedFilesDetail,
  confirmPl,
  protectScrollback,
} from "./utils.js";

// ── Types ───────────────────────────────────────────────────────────────────

export type GateStep = {
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

// ── Verify log persistence ──────────────────────────────────────────────────

/** Headless `./dev verify|pr|all --save-log` or STAGESYNC_VERIFY_SAVE_LOG=1 */
let verifySaveLogRequested =
  process.env.STAGESYNC_VERIFY_SAVE_LOG === "1" ||
  process.env.STAGESYNC_VERIFY_SAVE_LOG === "true";

const VERIFY_LOG_SLUGS: Record<string, string> = {
  "Lustrzane CI": "ci-mirror",
  "Codzienny gate": "daily",
  "Kompletny audyt": "full-audit",
};

export function initVerifySaveLogFromArgs(args: string[]): string[] {
  if (args.includes("--save-log")) verifySaveLogRequested = true;
  return args.filter((a) => a !== "--save-log");
}

export function hasGateSignal(steps: GateStep[]): boolean {
  return steps.some((s) => !s.ok || s.mutated);
}

export function gateLogBody(
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

export function ensureSharedBuiltForGate(): void {
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

export async function offerSaveVerifyLog(
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

// ── Summaries ───────────────────────────────────────────────────────────────

export function summarizeGate(title: string, steps: GateStep[]): boolean {
  console.log();
  clack.log.info(pc.bold(`Podsumowanie — ${title}:`));
  for (const step of steps) {
    const suffix = step.detail ? pc.dim(` — ${step.detail}`) : "";
    if (step.ok) clack.log.success(` ${pc.green("✓")}  ${pc.green(step.label)}${suffix}`);
    else clack.log.error(` ${pc.red("✗")}  ${pc.red(step.label)}${suffix}`);
  }
  const mutated = steps.filter((s) => s.mutated);
  if (mutated.length > 0) {
    clack.log.warn(
      pc.yellow(`Zmienione pliki: ${mutated.map((s) => s.id).join(", ")}. Sprawdź git diff.`),
    );
  }
  const failed = steps.filter((s) => !s.ok);
  if (failed.length === 0) {
    clack.log.success(
      pc.bold(pc.green(`✅ ${title} — wszystkie kroki OK (${steps.length}/${steps.length}).`)),
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

// ── Step builders ───────────────────────────────────────────────────────────

export function gateStepFromCaptured(
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

export function gateStepMutatingPnpm(
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

// ── Parsers ─────────────────────────────────────────────────────────────────

/** Sum final Vitest `Tests` lines across turbo packages. */
export function parseVitestTestsDetail(output: string): string | undefined {
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

export function parseCoverageStmtsDetail(output: string): string | undefined {
  const m = stripAnsi(output).match(
    /All files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/,
  );
  if (!m) return undefined;
  return `stmts ${m[1]}%`;
}

export function parsePlaywrightDetail(output: string): string | undefined {
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

export function parseDocsLinksDetail(output: string, ok: boolean): string {
  const m = stripAnsi(output).match(/checked=(\d+)\s+broken=(\d+)/);
  if (!m) return ok ? "OK" : (firstFailureHint(output) ?? "błąd");
  return ok ? `${m[1]} checked` : `${m[2]} broken / ${m[1]} checked`;
}

/** Human `pnpm audit` summary for gate detail. */
export function parsePnpmAuditDetail(output: string, ok: boolean): string {
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
export function parseSyncVersionDetail(output: string, ok: boolean): string {
  const plain = stripAnsi(output);
  if (/in sync/i.test(plain)) return "in sync";
  const drift = plain.match(/drift=(\d+)/i);
  if (drift) {
    const files = plain.match(/version drift in \d+ file\(s\):\s*(.+)/i)?.[1];
    return files ? `drift ${drift[1]}: ${files.trim()}` : `drift ${drift[1]}`;
  }
  return ok ? "OK" : (firstFailureHint(output) ?? "błąd");
}

// ── Owner typo gate ─────────────────────────────────────────────────────────

const GITHUB_OWNER = "Negatywistczny";
const OWNER_TYPO = "Negatywistyczny";

/** Fail if the known GitHub owner typo appears outside intentional script/test mentions. */
export function runOwnerTypoGate(): GateStep {
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
    detail: `brak „${OWNER_TYPO}"`,
  };
}
