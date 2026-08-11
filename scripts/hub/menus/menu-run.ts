import {
  clack,
  pc,
  execSync,
  runCommand,
  confirmDanger,
  warnSideEffects,
  clearTerminalScreen,
  waitReturn,
} from "../utils.js";

export function showGitStatus() {
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

export async function menuRunAndDev() {
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
    clack.note(
      `Budowanie instalatora Tauri ${pc.dim("(pnpm tauri:build)")}...`,
      "Build",
    );
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
