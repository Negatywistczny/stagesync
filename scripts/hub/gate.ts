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
  warnSideEffects,
  protectScrollback,
} from "./utils.js";
import { freeDevPortsForE2e } from "./doctor.js";

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


// ── High-level gate runners ──────────────────────────────────────────────────

export function runCiLikeVerifySteps(): GateStep[] {
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

export async function runCiLikeVerify(): Promise<boolean> {
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
export async function runDailyGate(): Promise<boolean> {
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
export function scanUnlinkedCount(): {
  ok: boolean;
  total: number;
  output: string;
} {
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
export function runUnlinkedGate(options: { autoFix?: boolean } = {}): GateStep {
  const autoFix = options.autoFix === true;
  const label = UNLINKED_STEP_LABEL;
  clack.note(
    `Skan niepodlinkowanych odniesień ${pc.dim("(check-unlinked.mjs)")}…`,
    "Skan",
  );
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

export function spawnWebE2e(): { status: number | null; output: string } {
  const result = spawnSync("pnpm", ["--filter", "@stagesync/web", "test:e2e"], {
    cwd: rootDir,
    encoding: "utf8",
    shell: true,
    env: {
      ...process.env,
      NODE_NO_WARNINGS: "1",
      STAGESYNC_E2E_FRESH: "1",
    },
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

export function runWebE2eWithBrowserBootstrap(): GateStep {
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

export async function runFullAudit(): Promise<boolean> {
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
    gateStepFromCaptured("audit", "pnpm audit", "pnpm", ["audit"], {
      ok: (output) => parsePnpmAuditDetail(output, true),
      fail: (output) => parsePnpmAuditDetail(output, false),
    }),
  ];
  const ok = summarizeGate("Kompletny audyt", steps);
  await offerSaveVerifyLog("Kompletny audyt", steps);
  return ok;
}
