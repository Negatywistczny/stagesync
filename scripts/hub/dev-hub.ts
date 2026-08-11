process.env.NODE_NO_WARNINGS = "1";

import * as os from "node:os";
import {
  clack,
  pc,
  runCommand,
  confirmDanger,
  warnSideEffects,
  clearTerminalScreen,
  hubIntro,
  waitReturn,
} from "./utils.js";
import {
  initVerifySaveLogFromArgs,
  runCiLikeVerify,
  runDailyGate,
  runFullAudit,
} from "./gate.js";
import { runDoctorScan, managePortsAndZombies } from "./doctor.js";
import { showLANInfo } from "./network.js";
import { menuRunAndDev } from "./menus/menu-run.js";
import { menuTesting } from "./menus/menu-testing.js";
import { menuRelease } from "./menus/menu-release.js";
import { menuDependencies } from "./menus/menu-deps.js";
import { menuClean, cleanCache } from "./menus/menu-clean.js";
import { menuData } from "./menus/menu-data.js";

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
