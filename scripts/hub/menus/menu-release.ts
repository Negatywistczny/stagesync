import {
  clack,
  pc,
  runCommand,
  confirmDanger,
  warnSideEffects,
  clearTerminalScreen,
  waitReturn,
  readRootPackageVersion,
} from "../utils.js";
import { runCiLikeVerify } from "../gate.js";
import { showGitStatus } from "./menu-run.js";

export function previewReleaseNotes(pkgVer: string) {
  clack.log.info(
    `👁  Podgląd informacji o wydaniu dla wersji ${pc.bold(pc.cyan(`v${pkgVer}`))} ${pc.dim("(Preview Mode)")}:`,
  );
  console.log(
    `\n${pc.dim("───")} ${pc.bold("TYTUŁ WYDANIA")} ${pc.dim("───")}`,
  );
  runCommand("node", ["scripts/release/release-title.mjs", pkgVer]);
  console.log(
    `\n\n${pc.dim("───")} ${pc.bold("OPIS WYDANIA (RELEASE NOTES)")} ${pc.dim("───")}`,
  );
  runCommand("node", ["scripts/release/build-release-notes.mjs", pkgVer]);
}

export async function menuRelease() {
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
    warnSideEffects([
      "Nadpisze numery wersji w package.json aplikacji, Tauri, Android, Docker itd.",
    ]);
    if (
      !(await confirmDanger(
        "Zsynchronizować wersję monorepo z root package.json?",
        false,
      ))
    ) {
      clack.log.info("Anulowano sync-version.");
      await waitReturn();
      return;
    }
    clack.note(
      `Synchronizowanie wersji w monorepo ${pc.dim("(node scripts/release/sync-version.mjs)")}...`,
      "Wersja",
    );
    runCommand("node", ["scripts/release/sync-version.mjs"]);
    await waitReturn();
  } else if (choice === "exec") {
    const confirmExec = await confirmDanger(
      "exec-release: publikacja / tag / monitor CI. Kontynuować? (wymaga gh auth)",
      false,
    );
    if (!confirmExec) {
      clack.log.info("Anulowano Release.");
      await waitReturn();
      return;
    }
    clack.note(
      `Wykonywanie właściwego release ${pc.dim("(node scripts/release/exec-release.mjs)")}...`,
      "Release",
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
    clack.note(
      `Wyodrębnianie sekcji Changeloga dla ${version}...`,
      "Changelog",
    );
    runCommand("node", [
      "scripts/release/extract-changelog-section.mjs",
      version.trim(),
    ]);
    await waitReturn();
  } else if (choice === "checklist") {
    clack.note(
      `Uruchamianie Pre-Release Checklist 2.0 ${pc.dim("(CI-like + preview)")}…`,
      "Checklist",
    );
    const ok = await runCiLikeVerify();
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

    const confirmCut = await confirmDanger(
      `cut-release (${bumpType}): bump SemVer, CHANGELOG, commit/tag. Na pewno?`,
      false,
    );
    if (!confirmCut) {
      clack.log.info("Anulowano cut-release.");
      await waitReturn();
      return;
    }

    clack.note(
      `Wykonywanie procedury cut-release dla typu: ${bumpType}...`,
      "Cut",
    );
    runCommand("node", ["scripts/release/cut-release.mjs", bumpType as string]);
    await waitReturn();
  } else if (choice === "git") {
    showGitStatus();
    await waitReturn();
  }
}
