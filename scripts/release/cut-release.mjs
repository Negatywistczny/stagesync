#!/usr/bin/env node
/**
 * Cut a SemVer release on trunk (main):
 *   Unreleased → ## [X.Y.Z] · bump package.json · sync-version · commit · tag [· push]
 *
 * Usage:
 *   node scripts/cut-release.mjs <patch|minor|major> [options]
 *
 * Options:
 *   --dry-run         Plan only (no writes, no git)
 *   --push            After commit+tag: push HEAD and tag to origin
 *   --no-commit       Write files only (no git commit/tag/push)
 *   --yes             Skip interactive confirmation
 *   --date YYYY-MM-DD Override release date (default: local today)
 *   --allow-branch    Allow cutting off main (default: require main)
 *   --skip-notes      Skip build-release-notes smoke after cut
 *
 * Exit codes:
 *   0 ok · 1 usage / validation · 2 git / subprocess failure
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const GITHUB_OWNER = "kacperczeczot";
const GITHUB_REPO = `${GITHUB_OWNER}/stagesync`;

/** Hero name for the first stable cut of a MAJOR.MINOR line (versioning.mdc). */
export const LINE_HEROES = Object.freeze({
  "5.0": "Overture",
  "5.1": "Launch & Mix",
  "5.2": "Pocket Stage",
  "5.3": "Colors & Channels",
  "5.4": "Syllables",
  "5.5": "Pitch & FX",
  "6.0": "Live Suite",
  "6.1": "Karaoke & Jukebox",
});

const BUMP_KINDS = new Set(["patch", "minor", "major"]);

export function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    kind: null,
    dryRun: false,
    push: false,
    noCommit: false,
    yes: false,
    date: null,
    allowBranch: false,
    skipNotes: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--push") opts.push = true;
    else if (a === "--no-commit") opts.noCommit = true;
    else if (a === "--yes" || a === "-y") opts.yes = true;
    else if (a === "--allow-branch") opts.allowBranch = true;
    else if (a === "--skip-notes") opts.skipNotes = true;
    else if (a === "--date") {
      const v = args[++i];
      if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        throw new Error("--date wymaga YYYY-MM-DD");
      }
      opts.date = v;
    } else if (a.startsWith("-")) {
      throw new Error(`Nieznana flaga: ${a}`);
    } else if (!opts.kind) {
      opts.kind = a.toLowerCase();
    } else {
      throw new Error(`Nieoczekiwany argument: ${a}`);
    }
  }

  if (opts.help) return opts;
  if (!opts.kind || !BUMP_KINDS.has(opts.kind)) {
    throw new Error("Wymagany bump: patch | minor | major");
  }
  if (opts.push && opts.noCommit) {
    throw new Error("Nie można łączyć --push z --no-commit");
  }
  return opts;
}

export function usage() {
  return `Usage: node scripts/cut-release.mjs <patch|minor|major> [options]

Options:
  --dry-run         Plan only (no writes, no git)
  --push            Push HEAD + tag to origin after commit
  --no-commit       Write CHANGELOG/version files only
  --yes             Skip confirmation prompt
  --date YYYY-MM-DD Override release date
  --allow-branch    Allow cutting off main
  --skip-notes      Skip release-notes smoke check
  -h, --help        Show this help`;
}

/** Stable SemVer X.Y.Z only (no pre-release). */
export function parseStableSemver(version) {
  const m = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) {
    throw new Error(
      `Oczekiwano stabilnego SemVer X.Y.Z, dostano "${version}" (pre-release nieobsługiwany przez cut-release)`,
    );
  }
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    raw: version,
  };
}

export function bumpSemver(version, kind) {
  const v = parseStableSemver(version);
  if (kind === "major") return `${v.major + 1}.0.0`;
  if (kind === "minor") return `${v.major}.${v.minor + 1}.0`;
  if (kind === "patch") return `${v.major}.${v.minor}.${v.patch + 1}`;
  throw new Error(`Nieznany bump: ${kind}`);
}

export function lineKey(version) {
  const v = parseStableSemver(version);
  return `${v.major}.${v.minor}`;
}

/** Hero only on first stable of a line (X.Y.0). */
export function heroForCut(nextVersion) {
  const v = parseStableSemver(nextVersion);
  if (v.patch !== 0) return null;
  const key = `${v.major}.${v.minor}`;
  const hero = LINE_HEROES[key];
  if (!hero) {
    throw new Error(
      `Brak hero-nazwy dla linii ${key} w LINE_HEROES — uzupełnij scripts/cut-release.mjs (versioning.mdc)`,
    );
  }
  return hero;
}

export function todayLocalISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Replace ## [Unreleased] (+ body) with ## [next] compare link; drop Unreleased entirely.
 */
export function cutChangelog(text, { prevVersion, nextVersion, date, hero, repo = GITHUB_REPO }) {
  const normalized = text.replace(/\r\n/g, "\n");

  const escapedNext = escapeRegExp(nextVersion);
  if (new RegExp(`^## \\[${escapedNext}\\]`, "m").test(normalized)) {
    throw new Error(`CHANGELOG już ma sekcję ## [${nextVersion}]`);
  }

  const unreleasedRe = /^## \[Unreleased\][^\n]*\n([\s\S]*?)(?=^## \[)/m;
  let match = unreleasedRe.exec(normalized);
  let after = "";
  if (match) {
    after = normalized.slice(match.index + match[0].length);
  } else {
    const endRe = /^## \[Unreleased\][^\n]*\n([\s\S]*)$/m;
    match = endRe.exec(normalized);
    if (!match) {
      throw new Error(
        'Brak sekcji "## [Unreleased]" — nie ma czego ciąć (najpierw wpisy w Unreleased)',
      );
    }
    after = "";
  }

  const body = match[1];
  if (!body.trim() || !/^- /m.test(body)) {
    throw new Error("Sekcja [Unreleased] jest pusta (brak bulletów) — nic do wydania");
  }

  const heroSuffix = hero ? ` — ${hero}` : "";
  const compare = `https://github.com/${repo}/compare/v${prevVersion}...v${nextVersion}`;
  const header = `## [${nextVersion}](${compare}) - ${date}${heroSuffix}\n\n`;
  const bodyTrimmed = body.replace(/^\n+/, "").replace(/\n+$/, "\n");

  const before = normalized.slice(0, match.index);
  let next = before + header + bodyTrimmed;
  if (!next.endsWith("\n")) next += "\n";
  if (after) {
    next = next.replace(/\n+$/, "\n") + "\n" + after.replace(/^\n+/, "");
  } else {
    next = next.replace(/\n+$/, "\n");
  }
  if (/^## \[Unreleased\]/m.test(next)) {
    throw new Error("Po cutcie nadal istnieje [Unreleased] — abort");
  }
  return next;
}

export function setPackageVersion(packageJsonText, version) {
  const pkg = JSON.parse(packageJsonText);
  pkg.version = version;
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function log(step, msg) {
  console.log(`[cut-release] ${step}${msg ? ` ${msg}` : ""}`);
}

function fail(code, msg) {
  console.error(`[cut-release] BŁĄD: ${msg}`);
  process.exit(code);
}

function run(cmd, args, { cwd = ROOT, stdio = "inherit", allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { cwd, stdio, encoding: "utf8", shell: false });
  if (r.error) {
    throw new Error(`Nie uruchomiono ${cmd}: ${r.error.message}`);
  }
  if (!allowFail && r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} → exit ${r.status}`);
  }
  return r;
}

function runCapture(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: false,
  });
  if (r.error) throw new Error(`Nie uruchomiono ${cmd}: ${r.error.message}`);
  return {
    status: r.status ?? 1,
    stdout: (r.stdout ?? "").trimEnd(),
    stderr: (r.stderr ?? "").trimEnd(),
  };
}

function git(args) {
  return runCapture("git", args);
}

function requireGitOk(label, result) {
  if (result.status !== 0) {
    throw new Error(`${label}: ${result.stderr || result.stdout || `exit ${result.status}`}`);
  }
  return result.stdout;
}

async function confirm(message, yes) {
  if (yes) return true;
  if (!input.isTTY) {
    throw new Error("Brak TTY — użyj --yes do potwierdzenia non-interactive");
  }
  const rl = createInterface({ input, output });
  try {
    // [t/N] = tylko t/y/tak → Tak; Enter/n → Nie (domyślnie nie — operacja destrukcyjna)
    const answer = (await rl.question(`${message} [t/N] `)).trim().toLowerCase();
    return answer === "t" || answer === "y" || answer === "tak" || answer === "yes";
  } finally {
    rl.close();
  }
}

function preflightGit({ allowBranch, dryRun, push }) {
  const inside = git(["rev-parse", "--is-inside-work-tree"]);
  if (inside.status !== 0 || inside.stdout !== "true") {
    throw new Error("Nie jesteś w repozytorium git");
  }

  const branch = requireGitOk("git branch", git(["branch", "--show-current"]));
  if (branch !== "main" && !allowBranch) {
    throw new Error(
      `Jesteś na gałęzi "${branch}" — cut tylko z main (albo --allow-branch)`,
    );
  }

  const porcelain = requireGitOk("git status", git(["status", "--porcelain"]));
  if (porcelain && !dryRun) {
    throw new Error(
      `Working tree nie jest czyste:\n${porcelain}\nZacommituj/schowaj zmiany przed cutem`,
    );
  }

  if (push) {
    const upstream = git(["rev-parse", "--abbrev-ref", "@{upstream}"]);
    if (upstream.status !== 0) {
      throw new Error("Brak upstream — ustaw tracking (git push -u) przed --push");
    }
    run("git", ["fetch", "origin"], { stdio: "inherit" });
    const behind = git(["rev-list", "--count", "HEAD..@{upstream}"]);
    requireGitOk("git rev-list", behind);
    if (Number(behind.stdout) > 0) {
      throw new Error(
        `Lokalny HEAD jest za upstream o ${behind.stdout} commit(ów) — najpierw git pull`,
      );
    }
  }
}


function releaseFileList() {
  return [
    "CHANGELOG.md",
    "package.json",
    "Dockerfile",
    "compose.yml",
    "apps/web/src/lib/client/appVersion.ts",
    "apps/server/src/app.ts",
    "apps/desktop/src-tauri/tauri.conf.json",
    "apps/desktop/src-tauri/Cargo.toml",
    "apps/console/android/app/build.gradle.kts",
    "apps/performer/android/app/build.gradle.kts",
  ];
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (e) {
    console.error(usage());
    fail(1, e.message);
  }

  if (opts.help) {
    console.log(usage());
    process.exit(0);
  }

  const pkgPath = resolve(ROOT, "package.json");
  const changelogPath = resolve(ROOT, "CHANGELOG.md");
  const prevVersion = JSON.parse(readFileSync(pkgPath, "utf8")).version;

  let nextVersion;
  let hero;
  let date;
  try {
    parseStableSemver(prevVersion);
    nextVersion = bumpSemver(prevVersion, opts.kind);
    hero = heroForCut(nextVersion);
    date = opts.date ?? todayLocalISO();
  } catch (e) {
    fail(1, e.message);
  }

  const tag = `v${nextVersion}`;

  log("1/8", `Plan: ${prevVersion} → ${nextVersion} (${opts.kind}) · tag ${tag}`);
  if (hero) log("…", `Hero linii ${lineKey(nextVersion)}: ${hero}`);
  log("…", `Data: ${date}`);
  if (opts.dryRun) log("…", "TRYB: --dry-run");
  if (opts.push) log("…", "Po cutcie: push HEAD + tag");
  if (opts.noCommit) log("…", "Bez commit/tag (--no-commit)");

  try {
    preflightGit({
      allowBranch: opts.allowBranch,
      dryRun: opts.dryRun,
      push: opts.push && !opts.dryRun,
    });
  } catch (e) {
    fail(2, e.message);
  }

  const tagLocal = git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`]);
  if (tagLocal.status === 0) {
    fail(1, `Tag ${tag} już istnieje lokalnie`);
  }


  let nextChangelog;
  try {
    const changelog = readFileSync(changelogPath, "utf8");
    nextChangelog = cutChangelog(changelog, {
      prevVersion,
      nextVersion,
      date,
      hero,
    });
  } catch (e) {
    fail(1, e.message);
  }

  log("2/8", "Preflight OK · Unreleased gotowe do cutu");

  const ok = await confirm(
    `Wykonać cut ${prevVersion} → ${nextVersion} (${tag})?`,
    opts.yes || opts.dryRun,
  ).catch((e) => {
    fail(1, e.message);
  });
  if (!ok) {
    log("…", "Anulowano");
    process.exit(0);
  }

  if (opts.dryRun) {
    log("3/8", "dry-run: pomijam zapis plików");
    const previewHeader = nextChangelog.split("\n").slice(0, 12).join("\n");
    console.log("\n--- podgląd nagłówka CHANGELOG ---\n");
    console.log(previewHeader);
    console.log("\n--- koniec podglądu ---\n");
    log("OK", `dry-run zakończony · byłby tag ${tag}`);
    process.exit(0);
  }

  log("3/8", "Zapis CHANGELOG.md + package.json");
  writeFileSync(changelogPath, nextChangelog, "utf8");
  writeFileSync(
    pkgPath,
    setPackageVersion(readFileSync(pkgPath, "utf8"), nextVersion),
    "utf8",
  );

  log("4/8", "sync-version.mjs");
  try {
    run(process.execPath, [resolve(ROOT, "scripts/release/sync-version.mjs")]);
  } catch (e) {
    fail(2, e.message);
  }

  if (!opts.skipNotes) {
    log("5/8", "Smoke: build-release-notes.mjs");
    try {
      const notes = runCapture(process.execPath, [
        resolve(ROOT, "scripts/release/build-release-notes.mjs"),
        nextVersion,
      ]);
      if (notes.status !== 0) {
        throw new Error(notes.stderr || `exit ${notes.status}`);
      }
      const title = runCapture(process.execPath, [
        resolve(ROOT, "scripts/release/release-title.mjs"),
        nextVersion,
      ]);
      if (title.status !== 0) {
        throw new Error(title.stderr || "release-title failed");
      }
      log("…", `Tytuł: ${title.stdout}`);
    } catch (e) {
      fail(2, `Release notes smoke failed: ${e.message}`);
    }
  } else {
    log("5/8", "Pominięto smoke notes (--skip-notes)");
  }


  if (opts.noCommit) {
    log("6/8", "Pominięto commit/tag (--no-commit)");
    log("OK", `Pliki zaktualizowane do ${nextVersion} — zacommituj ręcznie`);
    process.exit(0);
  }

  log("6/8", `git commit chore(release): ${tag}`);
  try {
    run("git", ["add", "--", ...releaseFileList()]);
    // Avoid shell heredoc issues on Windows: single -m is enough
    run("git", ["commit", "-m", `chore(release): ${tag}`]);
  } catch (e) {
    fail(2, `Commit nieudany: ${e.message}`);
  }

  log("7/8", `git tag -a ${tag}`);
  try {
    const tagged = git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`]);
    if (tagged.status === 0) {
      throw new Error(`Tag ${tag} pojawił się niespodziewanie przed tagowaniem`);
    }
    run("git", ["tag", "-a", tag, "-m", tag]);
  } catch (e) {
    fail(2, e.message);
  }

  if (opts.push) {
    log("8/8", "git push origin HEAD + tag");
    try {
      run("git", ["push", "origin", "HEAD"]);
      run("git", ["push", "origin", tag]);
    } catch (e) {
      fail(2, `Push nieudany (tag lokalny istnieje): ${e.message}`);
    }
    log("OK", `Wydano ${tag} · CI Release powinien wystartować na push taga`);
    console.log(
      `https://github.com/${GITHUB_REPO}/actions?query=workflow%3ARelease`,
    );
  } else {
    log("8/8", "Bez push (dodaj --push żeby wypchnąć)");
    log("OK", `Lokalnie: commit + tag ${tag}`);
    console.log(`  git push origin HEAD && git push origin ${tag}`);
  }
}

const isDirectRun =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main().catch((e) => {
    fail(2, e?.stack || String(e));
  });
}
