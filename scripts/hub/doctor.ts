/**
 * Doctor scan, port management, and process cleanup.
 */

import * as os from "node:os";
import {
  clack,
  pc,
  spawnSync,
  execSync,
  fs,
  path,
  rootDir,
  runCommand,
  confirmPl,
  resolveHubDataDir,
} from "./utils.js";

// ── Port & process management ───────────────────────────────────────────────

export interface ProcessInfo {
  pid: string;
  name: string;
  port: number;
}

export function findListeningProcessesOnPort(port: number): ProcessInfo[] {
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

export function killProcessTree(p: ProcessInfo) {
  const isWin = os.platform() === "win32";
  try {
    clack.log.message(
      `Zamykanie ${pc.yellow(`PID ${p.pid}`)} ${pc.dim(`(${p.name})`)} na ${pc.cyan(`:${p.port}`)}…`,
    );
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
export function freeDevPortsForE2e(ports: number[] = [3000, 4000]): void {
  const all: ProcessInfo[] = [];
  for (const port of ports) {
    all.push(...findListeningProcessesOnPort(port));
  }
  if (all.length === 0) return;
  clack.log.warn(
    pc.yellow(
      `E2E: zwalniam zajęte porty ${ports.map((p) => pc.cyan(`:${p}`)).join(", ")} ${pc.dim("(może zabić lokalny pnpm dev / Vite / API)")}`,
    ),
  );
  all.forEach((p) => {
    clack.log.message(
      ` • Port ${pc.cyan(`:${p.port}`)} — ${pc.yellow(`PID ${p.pid}`)} ${pc.dim(`(${p.name})`)}`,
    );
  });
  for (const p of all) killProcessTree(p);
}

export async function managePortsAndZombies() {
  clack.log.info(
    pc.bold(pc.cyan("🔌 Bezpieczny Port Guard & Kill-Zombies...")),
  );

  const procs3000 = findListeningProcessesOnPort(3000);
  const procs4000 = findListeningProcessesOnPort(4000);
  const allProcs = [...procs3000, ...procs4000];

  if (allProcs.length === 0) {
    clack.log.success(pc.green("Porty :3000 oraz :4000 są wolne."));
  } else {
    clack.log.warn(pc.yellow(pc.bold("Wykryto procesy zajmujące porty:")));
    allProcs.forEach((p) => {
      clack.log.message(
        ` • Port ${pc.cyan(`:${p.port}`)} — ${pc.yellow(`PID ${p.pid}`)} ${pc.dim(`(${p.name})`)}`,
      );
    });

    const confirmKill = await confirmPl("Czy chcesz zamknąć te procesy?", true);

    if (confirmKill) {
      for (const p of allProcs) killProcessTree(p);
      clack.log.success(pc.green("Zakończono procedurę czyszczenia portów."));
    } else {
      clack.log.info("Pominięto zamykanie procesów.");
    }
  }

  clack.log.info(
    pc.dim("🧹 Czyszczenie zalegających procesów sidecarów Tauri..."),
  );
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

// ── Doctor scan ─────────────────────────────────────────────────────────────

export async function runDoctorScan() {
  clack.log.info(
    pc.bold(pc.cyan("🏥 Doctor / Preflight — Lekka Diagnostyka Środowiska:")),
  );

  // 1. Node.js
  try {
    const nodeVer = execSync("node -v", { encoding: "utf8" }).trim();
    const isNodeOk = nodeVer.match(/^v(2[2-9]|[3-9]\d)/);
    if (isNodeOk) {
      clack.log.success(
        `${pc.bold("Node.js")}: ${pc.cyan(nodeVer)} ${pc.dim("(Zgodny ≥22)")}`,
      );
    } else {
      clack.log.warn(
        `${pc.bold("Node.js")}: ${pc.yellow(nodeVer)} ${pc.dim("(Zalecany Node 22 LTS)")}`,
      );
    }
  } catch {
    clack.log.error(
      `${pc.bold("Node.js")}: ${pc.red("Nie znaleziono w systemie!")}`,
    );
  }

  // 2. pnpm
  try {
    const pnpmVer = execSync("pnpm -v", { encoding: "utf8" }).trim();
    clack.log.success(`${pc.bold("pnpm")}: ${pc.cyan(`v${pnpmVer}`)}`);
  } catch {
    clack.log.error(
      `${pc.bold("pnpm")}: ${pc.red("Nie znaleziono w systemie!")}`,
    );
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
    clack.log.warn(
      `${pc.bold("Docker")}: Brak klienta Docker ${pc.dim("(opcjonalny dla kontenerów)")}`,
    );
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
      clack.log.success(
        `${pc.bold("GitHub CLI (gh)")}: ${pc.cyan(ghVer)} — ${pc.green("zalogowany")}`,
      );
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
        clack.log.success(
          `${pc.bold("WebView2 Runtime")}: ${pc.green("Obecny")}`,
        );
      } else {
        clack.log.warn(
          `${pc.bold("WebView2 Runtime")}: Brak ${pc.dim("(wymagany do uruchomienia Tauri na Windows)")}`,
        );
      }
    } catch {
      clack.log.warn(
        `${pc.bold("WebView2 Runtime")}: ${pc.dim("Nie można zweryfikować stanu rejestru")}`,
      );
    }
  }

  // 7. Dostępność Portów
  const p3000 = findListeningProcessesOnPort(3000);
  const p4000 = findListeningProcessesOnPort(4000);
  if (p3000.length === 0)
    clack.log.success(
      `${pc.bold("Port")} ${pc.cyan(":3000")}: ${pc.green("Wolny")}`,
    );
  else
    clack.log.warn(
      `${pc.bold("Port")} ${pc.cyan(":3000")}: Zajęty przez ${pc.yellow(`PID ${p3000[0].pid} (${p3000[0].name})`)}`,
    );

  if (p4000.length === 0)
    clack.log.success(
      `${pc.bold("Port")} ${pc.cyan(":4000")}: ${pc.green("Wolny")}`,
    );
  else
    clack.log.warn(
      `${pc.bold("Port")} ${pc.cyan(":4000")}: Zajęty przez ${pc.yellow(`PID ${p4000[0].pid} (${p4000[0].name})`)}`,
    );

  // 8. Pliki .env
  const envExists = fs.existsSync(path.join(rootDir, ".env"));
  const envExampleExists = fs.existsSync(path.join(rootDir, ".env.example"));
  if (envExists)
    clack.log.success(`${pc.bold("Plik .env")}: Obecny w korzeniu`);
  else if (envExampleExists)
    clack.log.warn(
      `${pc.bold("Plik .env")}: Brak ${pc.dim("(dostępny .env.example)")}`,
    );
  else clack.log.warn(`${pc.bold("Plik .env")}: Brak pliku konfiguracji`);

  // 9. Efektywny data dir (ADR 0012)
  const { dir: dataDir, rule } = resolveHubDataDir();
  clack.log.success(
    `${pc.bold("Efektywny data dir")}: ${pc.dim(dataDir)} ${pc.dim(`(reguła: ${rule})`)}`,
  );
  if (process.env.STAGESYNC_REPO_DEV) {
    clack.log.info(
      `${pc.bold("STAGESYNC_REPO_DEV")}: ${pc.dim(process.env.STAGESYNC_REPO_DEV)}`,
    );
  } else {
    clack.log.info(
      `${pc.bold("STAGESYNC_REPO_DEV")}: ${pc.dim("nieustawiona")}`,
    );
  }
  if (process.env.STAGESYNC_DATA_DIR) {
    clack.log.info(
      `${pc.bold("STAGESYNC_DATA_DIR")}: ${pc.dim(process.env.STAGESYNC_DATA_DIR)}`,
    );
  }
}
