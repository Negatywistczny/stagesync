import {
  clack,
  pc,
  fs,
  path,
  rootDir,
  runCommand,
  confirmDanger,
  warnSideEffects,
  clearTerminalScreen,
  waitReturn,
} from "../utils.js";

export async function cleanCache(): Promise<boolean> {
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
    cleanedPaths.forEach((cp) =>
      clack.log.message(` ${pc.green("•")} ${pc.dim(cp)}`),
    );
  }

  if (lockedPaths.length > 0) {
    clack.log.warn(
      pc.yellow(
        "Zablokowane katalogi (zamknij działające procesy Vite/Tauri/Node):",
      ),
    );
    lockedPaths.forEach((lp) =>
      clack.log.message(` ${pc.yellow("⚠️")} ${pc.yellow(lp)}`),
    );
  }
  return true;
}

export async function menuClean() {
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
