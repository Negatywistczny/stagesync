#!/usr/bin/env node
/**
 * Ostatni etap wydania StageSync (Publish & CI Monitor)
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const GITHUB_REPO = "Negatywistczny/stagesync";

function run(cmd, args, { cwd = ROOT, stdio = "inherit" } = {}) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    throw new Error(`Błąd wykonywania: ${cmd} ${args.join(" ")} (exit code ${r.status})`);
  }
  return r;
}

/** Sync sleep without spawning `node -e` (PowerShell mangles `{}` in -e scripts). */
function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runCapture(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32" });
  return (r.stdout ?? "").trim();
}

function isGhCliAuthenticated() {
  const r = spawnSync("gh", ["auth", "status"], { encoding: "utf8", shell: process.platform === "win32" });
  return r.status === 0;
}

function monitorGitHubActions(tag) {
  console.log(`\n⏳ 4/4 Śledzenie stanu budowania w GitHub Actions (${tag})...`);

  if (!isGhCliAuthenticated()) {
    console.log("ℹ️ GitHub CLI (`gh`) nie jest zalogowane lub zainstalowane.");
    console.log(`🔗 Śledź status budowania bezpośrednio w przeglądarce:\n   https://github.com/${GITHUB_REPO}/actions\n`);
    return;
  }

  try {
    console.log("🤖 Łączenie z runnerem GitHub Actions...");
    sleepMs(3000); // krótki bufor na webhook

    // Prefer Release workflow for this tag (tag push), else latest in-progress run.
    const runId =
      runCapture("gh", [
        "run",
        "list",
        "--repo",
        GITHUB_REPO,
        "--branch",
        tag,
        "--workflow",
        "Release",
        "--limit",
        "1",
        "--json",
        "databaseId",
        "-q",
        ".[0].databaseId",
      ]) ||
      runCapture("gh", [
        "run",
        "list",
        "--repo",
        GITHUB_REPO,
        "--limit",
        "1",
        "--json",
        "databaseId",
        "-q",
        ".[0].databaseId",
      ]);

    if (!runId) {
      throw new Error("Brak runu do śledzenia");
    }

    console.log(`📡 Watch run ${runId}…`);
    run("gh", ["run", "watch", runId, "--repo", GITHUB_REPO, "--exit-status"]);

    const lastRunStatus = runCapture("gh", [
      "run",
      "view",
      runId,
      "--repo",
      GITHUB_REPO,
      "--json",
      "conclusion",
      "-q",
      ".conclusion",
    ]);

    if (lastRunStatus === "success") {
      console.log("\n==================================================");
      console.log(`🎉 SUKCES! Wydanie ${tag} zostało pomyślnie zbudowane!`);
      console.log(`🔗 Release: https://github.com/${GITHUB_REPO}/releases/tag/${tag}`);
      console.log("==================================================\n");
    } else {
      console.error("\n==================================================");
      console.error(`💥 BŁĄD CI/CD: Pipeline w chmurze zakończył się statusem: ${lastRunStatus}`);
      console.error(`🔗 Logi błędu: https://github.com/${GITHUB_REPO}/actions/runs/${runId}`);
      console.error("==================================================\n");
      process.exit(1);
    }
  } catch {
    console.warn("\n⚠️ Nie udało się odebrać statusu z GitHub CLI.");
    console.log(`🔗 Sprawdź wynik na żywo w przeglądarce: https://github.com/${GITHUB_REPO}/actions\n`);
  }
}

function main() {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
  const version = pkg.version;
  const expectedTag = `v${version}`;
  const monitorOnly = process.argv.includes("--monitor-only");

  if (monitorOnly) {
    monitorGitHubActions(expectedTag);
    return;
  }

  console.log("==================================================");
  console.log(`🚀 PUBLIKACJA WYDANIA StageSync ${expectedTag}`);
  console.log("==================================================\n");

  try {
    // 1. Sprawdzenie gałęzi
    const branch = runCapture("git", ["branch", "--show-current"]);
    if (branch !== "main") {
      throw new Error(`Wydanie produkcyjne można publikować wyłącznie z gałęzi 'main' (obecnie: '${branch}')!`);
    }

    // 2. Sprawdzenie czystości
    const status = runCapture("git", ["status", "--porcelain"]);
    if (status.length > 0) {
      throw new Error("Working tree nie jest czyste! Zacommituj lub schowaj zmiany przed publikacją.");
    }

    // 3. Weryfikacja taga
    const currentTag = runCapture("git", ["tag", "--points-at", "HEAD"]);
    if (!currentTag || currentTag !== expectedTag) {
      throw new Error(`HEAD nie wskazuje na tag ${expectedTag}! Najpierw uruchom \`node scripts/release/cut-release.mjs\`.`);
    }

    // 4. Local Sanity Gate
    console.log("🧹 1/4 Szybka weryfikacja jakości (check-types & lint:ss-css)...");
    run("pnpm", ["check-types"]);
    run("pnpm", ["lint:ss-css"]);

    // 5. Build
    console.log("\n📦 2/4 Weryfikacyjny build lokalny (pnpm build)...");
    run("pnpm", ["build"]);

    // 6. Push
    console.log("\n📤 3/4 Wypychanie commitu i taga na GitHub...");
    run("git", ["push", "origin", "main", "--follow-tags"]);
    console.log("✅ Zmiany i tagi zostały pomyślnie wypchnięte do repozytorium.");

    // 7. CI Monitoring
    monitorGitHubActions(expectedTag);

  } catch (error) {
    console.error(`\n❌ BŁĄD LOKALNY PUBLIKACJI: ${error.message}`);
    process.exit(1);
  }
}

main();