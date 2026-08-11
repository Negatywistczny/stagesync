import {
  clack,
  pc,
  spawnSync,
  rootDir,
  runCommand,
  confirmPl,
  confirmDanger,
  clearTerminalScreen,
  waitReturn,
} from "../utils.js";
import {
  runCiLikeVerify,
  runDailyGate,
  runFullAudit,
  runWebE2eWithBrowserBootstrap,
} from "../gate.js";

export async function menuTestingVerify() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "Verify:",
    options: [
      {
        value: "ci-mirror",
        label: "1. ✅  Lustrzane CI (types + ss-css + lint + test, bez zapisu)",
      },
      {
        value: "daily",
        label: "2. 🚀  Codzienny gate (+ format + links + knip)",
      },
      {
        value: "full-audit",
        label:
          "3. 🧨  Kompletny audyt (+ unlinked, map, coverage, e2e, build, launcher, version, audit)",
      },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "ci-mirror") {
    await runCiLikeVerify();
    await waitReturn();
  } else if (choice === "daily") {
    if (
      !(await confirmDanger(
        "Codzienny gate zapisze pliki (Prettier). Uruchomić?",
        true,
      ))
    ) {
      clack.log.info("Anulowano Codzienny gate.");
      await waitReturn();
      return;
    }
    await runDailyGate();
    await waitReturn();
  } else if (choice === "full-audit") {
    if (
      !(await confirmDanger(
        "Kompletny audyt: format, auto-fix docs, e2e może zabić :3000/:4000, długo. Uruchomić?",
        false,
      ))
    ) {
      clack.log.info("Anulowano Kompletny audyt.");
      await waitReturn();
      return;
    }
    await runFullAudit();
    await waitReturn();
  }
}

/** Docs quality: scan bare backtick file refs, then optionally auto-link them. */
export async function runUnlinkedScanAndMaybeFix() {
  clack.note(
    `Skanowanie niepodlinkowanych odniesień ${pc.dim("(check-unlinked.mjs)")}…`,
    "Skan",
  );
  const result = spawnSync("node", ["scripts/quality/check-unlinked.mjs"], {
    cwd: rootDir,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  const out = result.stdout ?? "";
  const err = result.stderr ?? "";
  if (out) process.stdout.write(out.endsWith("\n") ? out : `${out}\n`);
  if (err) process.stderr.write(err.endsWith("\n") ? err : `${err}\n`);

  if (result.status !== 0 && result.status !== null) {
    clack.log.error("Skan niepodlinkowanych odniesień zakończył się błędem.");
    await waitReturn();
    return;
  }

  const match = out.match(/TOTAL UNLINKED REFERENCES FOUND:\s*(\d+)/);
  const total = match ? Number(match[1]) : 0;

  if (total === 0) {
    clack.log.success("Brak niepodlinkowanych odniesień do naprawienia.");
    await waitReturn();
    return;
  }

  const doFix = await confirmPl(
    `Znaleziono ${total} niepodlinkowanych odniesień. Naprawić teraz?`,
    true,
  );

  if (!doFix) {
    clack.log.info("Pominięto naprawę.");
    await waitReturn();
    return;
  }

  clack.note(
    `Naprawianie niepodlinkowanych linków ${pc.dim("(fix-unlinked-links.mjs)")}…`,
    "Auto-fix",
  );
  runCommand("node", ["scripts/quality/fix-unlinked-links.mjs"]);
  await waitReturn();
}

export async function menuTestingDocs() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "Docs i quality:",
    options: [
      { value: "map", label: "1. 🗺   Wygeneruj mapę kodu" },
      { value: "ss-css", label: "2. 🎨  CSS Token Guard (ss-css)" },
      { value: "knip", label: "3. 📦  Dead Code & Dependency Detector (knip)" },
      { value: "links", label: "4. 🔗  Weryfikacja linków w dokumentacji" },
      {
        value: "unlinked",
        label: "5. 🔍  Niepodlinkowane odniesienia (skan → naprawa)",
      },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "map") {
    clack.note(
      `Generowanie mapy repozytorium ${pc.dim("(pnpm generate:map)")}...`,
      "Map",
    );
    runCommand("pnpm", ["generate:map"]);
    await waitReturn();
  } else if (choice === "ss-css") {
    clack.note(
      `Sprawdzanie tokenów CSS ${pc.dim("(pnpm lint:ss-css)")}...`,
      "CSS",
    );
    runCommand("pnpm", ["lint:ss-css"]);
    await waitReturn();
  } else if (choice === "knip") {
    clack.note(
      `Skanowanie nieużywanego kodu i zależności ${pc.dim("(pnpm lint:knip)")}...`,
      "Knip",
    );
    runCommand("pnpm", ["lint:knip"]);
    await waitReturn();
  } else if (choice === "links") {
    clack.note(
      `Weryfikacja linków w dokumentacji ${pc.dim("(check-docs-links.mjs)")}...`,
      "Linki",
    );
    runCommand("node", ["scripts/quality/check-docs-links.mjs"]);
    await waitReturn();
  } else if (choice === "unlinked") {
    await runUnlinkedScanAndMaybeFix();
  }
}

export async function menuTestingUnit() {
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
      { value: "test-cov", label: "6. 📊  Testy z pokryciem (Coverage)" },
      { value: "benchmark", label: "7. 🎯  Smart Tempo DSP Benchmark" },
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
    runWebE2eWithBrowserBootstrap();
    await waitReturn();
  } else if (choice === "test-cov") {
    clack.note(
      `Uruchamianie testów z pokryciem ${pc.dim("(turbo run test:coverage)")}...`,
      "Coverage",
    );
    runCommand("pnpm", ["test:coverage"]);
    await waitReturn();
  } else if (choice === "benchmark") {
    clack.note("Uruchamianie Smart Tempo DSP Benchmark...", "Benchmark");
    runCommand("pnpm", ["benchmark:record"], {
      env: { RUN_SMART_TEMPO_BENCHMARK: "1" },
    });
    await waitReturn();
  }
}

export async function menuTestingBuild() {
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
    clack.note(
      `Uruchamianie pełnego buildu ${pc.dim("(turbo run build)")}...`,
      "Build",
    );
    runCommand("pnpm", ["build"]);
    await waitReturn();
  } else if (choice === "sync-ui") {
    clack.note("Synchronizacja UI launchera...", "Sync");
    runCommand("pnpm", ["sync:launcher-ui"]);
    await waitReturn();
  }
}

export async function menuTesting() {
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
