process.env.NODE_NO_WARNINGS = "1";

import * as clack from "@clack/prompts";
import { spawnSync, execSync } from "node:child_process";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import qrcode from "qrcode-terminal";

const rootDir = path.resolve(__dirname, "..");
const require = createRequire(__filename);

/** Last `clack.intro` title; cleared by `clearTerminalScreen` (submenus). */
let lastIntro: string | undefined;

function clearTerminalScreen() {
  lastIntro = undefined;
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
 * @clack/core already re-renders on stdout "resize", but its differential paint
 * leaves ghosts/duplicates on Windows Terminal (emoji + wrap width). Clearing
 * alone blanks the UI (frame unchanged → render no-ops). Force a full redraw:
 * clear screen, reset previous frame, re-run as initial paint.
 */
function enableClackFullRedrawOnResize() {
  if (!process.stdout.isTTY) return;

  let resizePending = false;

  const promptsPkg = path.dirname(
    require.resolve("@clack/prompts/package.json"),
  );
  const coreEntry = require.resolve("@clack/core", { paths: [promptsPkg] });
  // Wersja 1.x biblioteki może mieć inną strukturę plików niż 0.x
  const corePath = fs.existsSync(coreEntry)
    ? coreEntry
    : coreEntry.replace(/index\.mjs$/, "index.cjs");

  const { Prompt } = require(corePath) as {
    Prompt: {
      prototype: {
        state: string;
        render: () => void;
        _prevFrame?: string;
      };
    };
  };

  const originalRender = Prompt.prototype.render;
  Prompt.prototype.render = function (this: {
    state: string;
    _prevFrame?: string;
  }) {
    if (resizePending) {
      resizePending = false;
      // Keep intro across redraw (clearTerminalScreen would wipe lastIntro).
      const intro = lastIntro;
      process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
      if (intro) {
        lastIntro = intro;
        clack.intro(intro);
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
    resizePending = true;
    setImmediate(() => {
      resizePending = false;
    });
  });
}

enableClackFullRedrawOnResize();

function hubIntro(title: string) {
  lastIntro = title;
  clack.intro(title);
}

async function waitReturn() {
  await clack.select({
    message: "Zadanie zakończone. Co chcesz zrobić?",
    options: [{ value: "back", label: "↩️  Powrót do menu głównego" }],
  });
}

function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
) {
  console.log();
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NODE_NO_WARNINGS: "1", ...options.env },
  });
  return result.status === 0;
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

function runCiLikeVerify(): boolean {
  clack.note(
    "CI-like verify: check-types → lint:ss-css → lint → test…",
  );
  const typesOk = runCommand("pnpm", ["check-types"]);
  const cssOk = runCommand("pnpm", ["lint:ss-css"]);
  const lintOk = runCommand("pnpm", ["lint"]);
  const testOk = runCommand("pnpm", ["test"]);
  return typesOk && cssOk && lintOk && testOk;
}

function previewReleaseNotes(pkgVer: string) {
  clack.log.info(
    `👁  Podgląd informacji o wydaniu dla wersji v${pkgVer} (Preview Mode):`,
  );
  console.log("\n--- TYTUŁ WYDANIA ---");
  runCommand("node", ["scripts/release/release-title.mjs", pkgVer]);
  console.log("\n\n--- OPIS WYDANIA (RELEASE NOTES) ---");
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

  clack.log.info("🌐 Dedykowane URLe w sieci lokalnej (LAN):");
  console.log(`   Localhost Admin UI:    http://localhost:3000/admin`);
  console.log(`   Localhost Client UI:   http://localhost:3000/client`);
  console.log(`   Localhost Server API:  http://localhost:4000/api/health`);
  console.log();
  console.log(`   LAN Client (Performer): http://${selectedIP}:3000/client`);
  console.log(`   LAN Admin UI:           http://${selectedIP}:3000/admin`);
  console.log(
    `   LAN Server API:         http://${selectedIP}:4000/api/health`,
  );

  const clientURL = `http://${selectedIP}:3000/client`;
  console.log("\n📱 Kod QR dla tabletów / telefonów (Performer Client):");
  console.log(`   ${clientURL}\n`);
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

async function managePortsAndZombies() {
  clack.log.info("🔌 Bezpieczny Port Guard & Kill-Zombies...");

  const procs3000 = findListeningProcessesOnPort(3000);
  const procs4000 = findListeningProcessesOnPort(4000);
  const allProcs = [...procs3000, ...procs4000];

  if (allProcs.length === 0) {
    clack.log.success("Porty :3000 oraz :4000 są wolne.");
  } else {
    clack.log.warn("Wykryto procesy zajmujące porty:");
    allProcs.forEach((p) => {
      clack.log.message(` • Port :${p.port} — PID ${p.pid} (${p.name})`);
    });

    const confirmKill = await clack.confirm({
      message: "Czy chcesz zamknąć te procesy?",
      initialValue: true,
    });

    if (confirmKill && !clack.isCancel(confirmKill)) {
      const isWin = os.platform() === "win32";
      for (const p of allProcs) {
        try {
          clack.log.message(`Zamykanie PID ${p.pid} (${p.name})...`);
          if (isWin) {
            execSync(
              `powershell -NoProfile -Command "Stop-Process -Id ${p.pid} -ErrorAction SilentlyContinue"`,
              { stdio: "inherit" },
            );
          } else {
            execSync(`kill -15 ${p.pid}`, { stdio: "inherit" });
          }
        } catch {
          // Soft kill nie powiódł się — próba force kill
        }

        const remaining = findListeningProcessesOnPort(p.port);
        if (remaining.some((r) => r.pid === p.pid)) {
          clack.log.warn(
            `Proces PID ${p.pid} nie zareagował na soft kill — wymuszanie zamknięcia (force kill)...`,
          );
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
      clack.log.success("Zakończono procedurę czyszczenia portów.");
    } else {
      clack.log.info("Pominięto zamykanie procesów.");
    }
  }

  clack.log.info("🧹 Czyszczenie zalegających procesów sidecarów Tauri...");
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
  clack.log.info("🏥 Doctor / Preflight — Lekka Diagnostyka Środowiska:");

  // 1. Node.js
  try {
    const nodeVer = execSync("node -v", { encoding: "utf8" }).trim();
    const isNodeOk = nodeVer.match(/^v(2[2-9]|[3-9]\d)/);
    if (isNodeOk) {
      clack.log.success(`Node.js: ${nodeVer} (Zgodny ≥22)`);
    } else {
      clack.log.warn(`Node.js: ${nodeVer} (Zalecany Node 22 LTS)`);
    }
  } catch {
    clack.log.error("Node.js: Nie znaleziono w systemie!");
  }

  // 2. pnpm
  try {
    const pnpmVer = execSync("pnpm -v", { encoding: "utf8" }).trim();
    clack.log.success(`pnpm: v${pnpmVer}`);
  } catch {
    clack.log.error("pnpm: Nie znaleziono w systemie!");
  }

  // 3. Rust / Cargo
  try {
    const rustVer = execSync("cargo -V", { encoding: "utf8" }).trim();
    clack.log.success(`Rust / Cargo: ${rustVer}`);
  } catch {
    clack.log.warn(
      "Rust / Cargo: Nie znaleziono (wymagany tylko dla Desktop/Tauri)",
    );
  }

  // 4. Docker (opcjonalny)
  try {
    const dockerVer = execSync("docker -v", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    clack.log.success(`Docker: ${dockerVer}`);
  } catch {
    clack.log.warn("Docker: Brak klienta Docker (opcjonalny dla kontenerów)");
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
      clack.log.success(`GitHub CLI (gh): ${ghVer} — zalogowany`);
    } else {
      clack.log.warn(
        `GitHub CLI (gh): ${ghVer} — brak auth (wymagane dla Release Hub)`,
      );
    }
  } catch {
    clack.log.warn(
      "GitHub CLI (gh): Nie znaleziono (opcjonalne; potrzebne dla Release Hub)",
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
        clack.log.success("WebView2 Runtime: Obecny");
      } else {
        clack.log.warn(
          "WebView2 Runtime: Brak (wymagany do uruchomienia Tauri na Windows)",
        );
      }
    } catch {
      clack.log.warn("WebView2 Runtime: Nie można zweryfikować stanu rejestru");
    }
  }

  // 7. Dostępność Portów
  const p3000 = findListeningProcessesOnPort(3000);
  const p4000 = findListeningProcessesOnPort(4000);
  if (p3000.length === 0) clack.log.success("Port :3000: Wolny");
  else
    clack.log.warn(
      `Port :3000: Zajęty przez PID ${p3000[0].pid} (${p3000[0].name})`,
    );

  if (p4000.length === 0) clack.log.success("Port :4000: Wolny");
  else
    clack.log.warn(
      `Port :4000: Zajęty przez PID ${p4000[0].pid} (${p4000[0].name})`,
    );

  // 8. Pliki .env
  const envExists = fs.existsSync(path.join(rootDir, ".env"));
  const envExampleExists = fs.existsSync(path.join(rootDir, ".env.example"));
  if (envExists) clack.log.success("Plik .env: Obecny w korzeniu");
  else if (envExampleExists)
    clack.log.warn("Plik .env: Brak (dostępny .env.example)");
  else clack.log.warn("Plik .env: Brak pliku konfiguracji");

  // 9. Efektywny data dir (ADR 0012)
  const { dir: dataDir, rule } = resolveHubDataDir();
  clack.log.success(`Efektywny data dir: ${dataDir} (reguła: ${rule})`);
  if (process.env.STAGESYNC_REPO_DEV) {
    clack.log.info(
      `STAGESYNC_REPO_DEV: ${process.env.STAGESYNC_REPO_DEV}`,
    );
  } else {
    clack.log.info("STAGESYNC_REPO_DEV: nieustawiona");
  }
  if (process.env.STAGESYNC_DATA_DIR) {
    clack.log.info(`STAGESYNC_DATA_DIR: ${process.env.STAGESYNC_DATA_DIR}`);
  }
}

function cleanCache() {
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
    `Zakończono czyszczenie: usunięto ${cleanedCount} katalogów kompilacji/pamięci podręcznej.`,
  );

  if (cleanedPaths.length > 0) {
    clack.log.success("Wyczyszczone katalogi:");
    cleanedPaths.forEach((cp) => clack.log.message(` • ${cp}`));
  }

  if (lockedPaths.length > 0) {
    clack.log.warn(
      "Zablokowane katalogi (zamknij działające procesy Vite/Tauri/Node):",
    );
    lockedPaths.forEach((lp) => clack.log.message(` ⚠️ ${lp}`));
  }
}

function showGitStatus() {
  try {
    const branch = execSync("git branch --show-current", {
      encoding: "utf8",
    }).trim();
    const status = execSync("git status -s", { encoding: "utf8" }).trim();
    const log = execSync("git log -5 --oneline", { encoding: "utf8" }).trim();

    clack.log.info(`📍 Bieżąca gałąź Git: ${branch}`);
    console.log("\n📜 Ostatnie 5 commitów:");
    console.log(log);

    console.log();
    if (status) {
      clack.log.warn("Niezatwierdzone / Zmodyfikowane pliki:");
      console.log(status);
    } else {
      clack.log.success("Katalog roboczy jest czysty (no pending changes).");
    }
  } catch {
    clack.log.error("Błąd podczas pobierania statusu Git.");
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
        label: "5. 📦  Buduj instalator (Tauri Build)",
      },
      {
        value: "desktop-nsis-smoke",
        label: "6. 🧪  Pusty instalator NSIS (smoke, bez sidecara)",
      },
      { value: "docker", label: "7. 🐳  Stack produkcyjny (Docker Compose)" },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "web") {
    clack.note(
      "Uruchamianie Web + API (Vite :3000 + Server :4000; bez Tauri)... Press Ctrl+C to stop.",
    );
    runCommand("pnpm", ["dev"]);
  } else if (choice === "web-only") {
    clack.note("Uruchamianie Web UI Only... Press Ctrl+C to stop.");
    runCommand("pnpm", ["--filter", "@stagesync/web", "dev"]);
  } else if (choice === "api-only") {
    clack.note("Uruchamianie Server API Only... Press Ctrl+C to stop.");
    runCommand("pnpm", ["--filter", "@stagesync/server", "dev"]);
  } else if (choice === "desktop") {
    clack.note(
      "Uruchamianie Tauri Desktop Shell (sync web/sidecar + tauri:dev)... Press Ctrl+C to stop.",
    );
    runCommand("pnpm", ["--filter", "@stagesync/desktop", "dev"]);
  } else if (choice === "desktop-build") {
    clack.note("Budowanie instalatora Tauri (pnpm tauri:build)...");
    runCommand("pnpm", ["--filter", "@stagesync/desktop", "tauri:build"]);
    await waitReturn();
  } else if (choice === "desktop-nsis-smoke") {
    clack.note(
      "Szybki pusty NSIS (bez sidecara / resources) — tylko test wyglądu instalatora…",
    );
    runCommand("pnpm", [
      "--filter",
      "@stagesync/desktop",
      "tauri:build:nsis-smoke",
    ]);
    await waitReturn();
  } else if (choice === "docker") {
    clack.note("Uruchamianie Docker Compose... Press Ctrl+C to stop.");
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
      { value: "verify", label: "1. ✅  One-Click Full Verify (CI-like)" },
      {
        value: "fix",
        label: "2. 🧹  Format (Prettier) + Lint check",
      },
      { value: "test-cov", label: "3. 📊  Testy z pokryciem (Coverage)" },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "verify") {
    const ok = runCiLikeVerify();
    if (ok) {
      clack.log.success("✅ Pełna weryfikacja zakończona sukcesem!");
    } else {
      clack.log.error("❌ Wykryto błędy w weryfikacji! Przejrzyj logi powyżej.");
    }
    await waitReturn();
  } else if (choice === "fix") {
    clack.note("Formatowanie Prettier, potem lint check (bez auto-fix ESLint)…");
    runCommand("pnpm", ["format"]);
    runCommand("pnpm", ["lint"]);
    await waitReturn();
  } else if (choice === "test-cov") {
    clack.note("Uruchamianie testów z pokryciem (turbo run test:coverage)...");
    runCommand("pnpm", ["test:coverage"]);
    await waitReturn();
  }
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
      { value: "unlinked", label: "5. 🔍  Znajdź niepodlinkowane pliki" },
      { value: "fix-unlinked", label: "6. 🛠   Napraw niepodlinkowane linki" },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "map") {
    clack.note("Generowanie mapy repozytorium (pnpm generate:map)...");
    runCommand("pnpm", ["generate:map"]);
    await waitReturn();
  } else if (choice === "ss-css") {
    clack.note("Sprawdzanie tokenów CSS (pnpm lint:ss-css)...");
    runCommand("pnpm", ["lint:ss-css"]);
    await waitReturn();
  } else if (choice === "knip") {
    clack.note("Skanowanie nieużywanego kodu i zależności (pnpm lint:knip)...");
    runCommand("pnpm", ["lint:knip"]);
    await waitReturn();
  } else if (choice === "links") {
    clack.note("Weryfikacja linków w dokumentacji (check-docs-links.mjs)...");
    runCommand("node", ["scripts/quality/check-docs-links.mjs"]);
    await waitReturn();
  } else if (choice === "unlinked") {
    clack.note("Znajdowanie niepodlinkowanych plików...");
    runCommand("node", ["scripts/quality/check-unlinked.mjs"]);
    await waitReturn();
  } else if (choice === "fix-unlinked") {
    clack.note("Naprawianie niepodlinkowanych linków...");
    runCommand("node", ["scripts/quality/fix-unlinked-links.mjs"]);
    await waitReturn();
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
      { value: "benchmark", label: "6. 🎯  Smart Tempo DSP Benchmark" },
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
    clack.note("Uruchamianie Playwright E2E (@stagesync/web test:e2e)...");
    runCommand("pnpm", ["--filter", "@stagesync/web", "test:e2e"]);
    await waitReturn();
  } else if (choice === "benchmark") {
    clack.note("Uruchamianie Smart Tempo DSP Benchmark...");
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
    clack.note("Uruchamianie pełnego buildu (turbo run build)...");
    runCommand("pnpm", ["build"]);
    await waitReturn();
  } else if (choice === "sync-ui") {
    clack.note("Synchronizacja UI launchera...");
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
    clack.note(
      "Synchronizowanie wersji w monorepo (node scripts/release/sync-version.mjs)...",
    );
    runCommand("node", ["scripts/release/sync-version.mjs"]);
    await waitReturn();
  } else if (choice === "exec") {
    const confirmExec = await clack.confirm({
      message:
        "Czy na pewno uruchomić exec-release (publikacja / monitor CI)?",
      initialValue: false,
    });
    if (!confirmExec || clack.isCancel(confirmExec)) {
      clack.log.info("Anulowano Release.");
      await waitReturn();
      return;
    }
    clack.note(
      "Wykonywanie właściwego release (node scripts/release/exec-release.mjs)...",
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
    clack.note(`Wyodrębnianie sekcji Changeloga dla ${version}...`);
    runCommand("node", [
      "scripts/release/extract-changelog-section.mjs",
      version.trim(),
    ]);
    await waitReturn();
  } else if (choice === "checklist") {
    clack.note("Uruchamianie Pre-Release Checklist 2.0 (CI-like + preview)…");
    const ok = runCiLikeVerify();
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

    const confirmCut = await clack.confirm({
      message: `Czy na pewno uruchomić cut-release (${bumpType})?`,
      initialValue: false,
    });
    if (!confirmCut || clack.isCancel(confirmCut)) {
      clack.log.info("Anulowano cut-release.");
      await waitReturn();
      return;
    }

    clack.note(`Wykonywanie procedury cut-release dla typu: ${bumpType}...`);
    runCommand("node", [
      "scripts/release/cut-release.mjs",
      bumpType as string,
    ]);
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
    const confirm = await clack.confirm({
      message: `Czy na pewno wyczyścić katalog danych?\n${dataDir}`,
      initialValue: false,
    });
    if (confirm && !clack.isCancel(confirm)) {
      if (!fs.existsSync(dataDir)) {
        clack.log.warn("Katalog danych nie istnieje — nic do wyczyszczenia.");
      } else {
        const repoData = path.join(rootDir, "data");
        const protectReadme = path.resolve(dataDir) === path.resolve(repoData);
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
      "Sprawdzanie nieaktualnych pakietów w monorepo (pnpm outdated -r)...",
    );
    runCommand("pnpm", ["outdated", "-r"]);
    await waitReturn();
  } else if (choice === "up") {
    clack.note(
      "Uruchamianie interaktywnej aktualizacji pakietów (pnpm up -i -r --latest)...",
    );
    runCommand("pnpm", ["up", "-i", "-r", "--latest"]);
    await waitReturn();
  } else if (choice === "install") {
    clack.note(
      "Wymuszanie ponownej instalacji zależności (pnpm install --force)...",
    );
    runCommand("pnpm", ["install", "--force"]);
    await waitReturn();
  } else if (choice === "audit") {
    clack.note("Uruchamianie audytu bezpieczeństwa zależności (pnpm audit)...");
    runCommand("pnpm", ["audit"]);
    await waitReturn();
  } else if (choice === "prune") {
    clack.note("Czyszczenie lokalnego pnpm store (pnpm store prune)...");
    runCommand("pnpm", ["store", "prune"]);
    await waitReturn();
  }
}

async function main() {
  const args = process.argv.slice(2);
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
    if (flag === "verify") {
      const ok = runCiLikeVerify();
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
        "Sprawdzanie nieaktualnych pakietów w monorepo (pnpm outdated -r)...",
      );
      runCommand("pnpm", ["outdated", "-r"]);
      return;
    }
    if (flag === "up" || flag === "update") {
      clack.note(
        "Uruchamianie interaktywnej aktualizacji pakietów (pnpm up -i -r --latest)...",
      );
      runCommand("pnpm", ["up", "-i", "-r", "--latest"]);
      return;
    }
    if (flag === "audit") {
      clack.note(
        "Uruchamianie audytu bezpieczeństwa zależności (pnpm audit)...",
      );
      runCommand("pnpm", ["audit"]);
      return;
    }
    if (flag === "network" || flag === "ip") {
      await showLANInfo();
      return;
    }
    if (flag === "clean") {
      cleanCache();
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
        { value: "clean", label: "7. 🧹  Konserwacja & Cache" },
        { value: "data", label: "8. 💾  Zarządzanie danymi & Logi ›" },
        { value: "setup", label: "9. 🛠   Setup Środowiska" },
        { value: "exit", label: "0. 🚪  Wyjście" },
      ],
    });

    if (clack.isCancel(category) || category === "exit") {
      clack.outro("Do zobaczenia na scenie! 👋");
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
    if (category === "clean") {
      cleanCache();
      await waitReturn();
    }
    if (category === "data") {
      await menuData();
    }
    if (category === "setup") {
      const isWin = os.platform() === "win32";
      clack.note("Uruchamianie pełnej procedury setupu...");
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
