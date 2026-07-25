import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const script = fileURLToPath(
  new URL("./build-release-notes.mjs", import.meta.url),
);

const dir = mkdtempSync(join(tmpdir(), "ss-release-notes-"));
const path = join(dir, "CHANGELOG.md");
writeFileSync(
  path,
  `# Changelog

## [5.1.0](https://example.com) - 2026-07-24 — Launch & Mix

> **Launch & Mix:** Launcher hosta, Mixer Timeline oraz zestaw narzędzi live-show.

### Dodano

#### ⏱️ Timeline & DAW
- **Menu narzędzi Timeline:** zestaw live-show w stylu Logic.
- **Mixer:** cztery strefy Audio | Busy | Click | Master.

#### 📦 Packaging & Desktop (Tauri / Docker)
- **Launcher:** ekran startowy przed Adminem.

### Zmieniono

#### 📚 Dokumentacja
- **Pomoc Timeline (?):** skróty i wyszukiwanie.

## [5.1.2](https://example.com) - 2026-07-25

### Dodano

#### 🎛️ Audio / MIDI / Transport
- **Setlista:** zmiana kolejności od razu aktualizuje podgląd „następny utwór” przez WebSocket ([#1](https://example.com/1)).

### Naprawiono

#### 🎛️ Audio / MIDI / Transport
- **MIDI Host:** clock OUT z ticków transportu; bezpieczny send przy odłączeniu USB.
- **Mixer / Solo:** gdy Solo ścieżki jest aktywne, Solo szyny nie wycisza już wyjścia.

#### ⏱️ Timeline & DAW
- **Etykiety AT:** Dodaj ścieżkę i menu narzędzi mają czytelne nazwy dla czytników ekranu.

## [5.0.0] - 2026-07-23 — Overture

> older
`,
);

function run(version) {
  return spawnSync(process.execPath, [script, version, path], {
    encoding: "utf8",
    env: { ...process.env, GITHUB_REPOSITORY: "Negatywistczny/stagesync" },
  });
}

const ok = run("5.1.0");
assert.equal(ok.status, 0, ok.stderr || ok.stdout);
assert.match(ok.stdout, /### 🚀 Highlights — Launch & Mix \(5\.1\.0\)/);
assert.match(
  ok.stdout,
  /^Launcher hosta, Mixer Timeline oraz zestaw narzędzi live-show\.$/m,
);
assert.doesNotMatch(ok.stdout, /\*\*Launch & Mix:\*\*/);
assert.match(
  ok.stdout,
  /\*\*Timeline \/ DAW\*\* — Menu narzędzi Timeline: zestaw live-show w stylu Logic; Mixer: cztery strefy Audio \| Busy \| Click \| Master\./,
);
assert.match(ok.stdout, /\*\*Desktop\*\* — Launcher: ekran startowy przed Adminem\./);
assert.match(
  ok.stdout,
  /\*\*Dokumentacja\*\* — Pomoc Timeline \(\?\): skróty i wyszukiwanie\./,
);
assert.match(ok.stdout, /Pełna historia zmian: \[CHANGELOG\.md\]/);
assert.match(
  ok.stdout,
  /blob\/v5\.1\.0\/CHANGELOG\.md#510---2026-07-24--launch--mix/,
);
assert.match(
  ok.stdout,
  /releases\/download\/v5\.1\.0\/StageSync_5\.1\.0_aarch64\.dmg/,
);
assert.doesNotMatch(ok.stdout, /### Dodano/);
assert.doesNotMatch(ok.stdout, /#### ⏱️/);
assert.doesNotMatch(ok.stdout, /Co nowego w tym wydaniu/);

const patch = run("5.1.2");
assert.equal(patch.status, 0, patch.stderr || patch.stdout);
assert.match(patch.stdout, /### 🚀 Highlights — 5\.1\.2/);
assert.match(
  patch.stdout,
  /^Zmiany w Audio \/ MIDI \/ Transport oraz Timeline \/ DAW\.$/m,
);
assert.doesNotMatch(patch.stdout, /^Wydanie 5\.1\.2\.$/m);
assert.match(
  patch.stdout,
  /\*\*Audio \/ MIDI \/ Transport\*\* — Setlista: zmiana kolejności od razu aktualizuje podgląd „następny utwór” przez WebSocket; MIDI Host:/,
);
assert.match(patch.stdout, /Mixer \/ Solo: gdy Solo ścieżki jest aktywne/);
assert.match(patch.stdout, /\*\*Timeline \/ DAW\*\* — Etykiety AT:/);
assert.doesNotMatch(patch.stdout, /#1/);
assert.doesNotMatch(
  patch.stdout,
  /\*\*Audio \/ MIDI \/ Transport\*\* — Setlista; MIDI Host/,
);

console.log("build-release-notes.test.mjs: ok");
