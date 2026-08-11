import {
  clack,
  pc,
  runCommand,
  confirmDanger,
  warnSideEffects,
  clearTerminalScreen,
  waitReturn,
} from "../utils.js";

export async function menuDependencies() {
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
