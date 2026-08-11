import {
  clack,
  pc,
  fs,
  path,
  rootDir,
  confirmDanger,
  warnSideEffects,
  clearTerminalScreen,
  waitReturn,
  resolveHubDataDir,
} from "../utils.js";

export async function menuData() {
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
    const repoData = path.join(rootDir, "data");
    const isRepoData = path.resolve(dataDir) === path.resolve(repoData);
    warnSideEffects([
      `Trwale usunie zawartość: ${dataDir}`,
      isRepoData
        ? "To katalog repo data/ (README.md zostanie zachowany)"
        : "To NIE jest repo data/ — możesz skasować lokalne projekty/logi użytkownika (np. Documents/StageSync)",
    ]);
    const confirm = await confirmDanger(
      `Wyczyścić katalog danych?\n${dataDir}`,
      false,
    );
    if (confirm) {
      if (!fs.existsSync(dataDir)) {
        clack.log.warn("Katalog danych nie istnieje — nic do wyczyszczenia.");
      } else {
        const protectReadme = isRepoData;
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
