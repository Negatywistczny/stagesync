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
- **Android:** sideload Performer i Console.

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
// One bullet per domain — semicolon-aggregated (5.1.3 style); labels not bold.
assert.match(
  ok.stdout,
  /\*\*Timeline \/ DAW\*\* — Menu narzędzi Timeline: zestaw live-show w stylu Logic; Mixer: cztery strefy Audio \| Busy \| Click \| Master\./,
);
assert.match(
  ok.stdout,
  /\*\*Desktop \/ Android\*\* — Launcher: ekran startowy przed Adminem; Android: sideload Performer i Console\./,
);
assert.match(
  ok.stdout,
  /\*\*Dokumentacja\*\* — Pomoc Timeline \(\?\): skróty i wyszukiwanie\./,
);
// Not one bullet per CHANGELOG item with bold labels.
assert.doesNotMatch(ok.stdout, /\*\*Menu narzędzi Timeline:\*\*/);
assert.doesNotMatch(
  ok.stdout,
  /\*\*Timeline \/ DAW\*\* — \*\*Menu narzędzi Timeline:\*\*/,
);
assert.match(ok.stdout, /Pełna historia zmian: \[CHANGELOG\.md\]/);
assert.match(
  ok.stdout,
  /blob\/v5\.1\.0\/CHANGELOG\.md#510---2026-07-24-launch-mix/,
);
assert.match(
  ok.stdout,
  /\| System operacyjny \| Plik instalacyjny \|/,
);
assert.match(
  ok.stdout,
  /\[macOS \(Apple Silicon\)\]\(https:\/\/github\.com\/Negatywistczny\/stagesync\/releases\/download\/v5\.1\.0\/StageSync_5\.1\.0_aarch64\.dmg\)/,
);
assert.match(
  ok.stdout,
  /\[Windows \(64-bit\)\]\(https:\/\/github\.com\/Negatywistczny\/stagesync\/releases\/download\/v5\.1\.0\/StageSync_5\.1\.0_x64-setup\.exe\)/,
);
assert.doesNotMatch(ok.stdout, /_x86_64-setup\.exe/);
assert.doesNotMatch(ok.stdout, /_pl-PL-setup\.exe/);
assert.doesNotMatch(ok.stdout, /StageSync 5\.1\.0 \(\.dmg\)/);
assert.doesNotMatch(ok.stdout, /\| System \/ aplikacja \| Plik \|/);
// APKs only from 5.2.0 — no dead Android links on 5.1.x.
assert.doesNotMatch(ok.stdout, /StageSync-Performer-v5\.1\.0\.apk/);
assert.doesNotMatch(ok.stdout, /StageSync-Console-v5\.1\.0\.apk/);
assert.doesNotMatch(ok.stdout, /\*\*Android\*\* \(Performer\)/);
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
// Dodano + Naprawiono merged into one domain bullet; issue links stripped.
assert.match(
  patch.stdout,
  /\*\*Audio \/ MIDI \/ Transport\*\* — Setlista: zmiana kolejności od razu aktualizuje podgląd „następny utwór” przez WebSocket; MIDI Host: clock OUT z ticków transportu; bezpieczny send przy odłączeniu USB; Mixer \/ Solo:/,
);
assert.match(
  patch.stdout,
  /\*\*Timeline \/ DAW\*\* — Etykiety AT: Dodaj ścieżkę i menu narzędzi mają czytelne nazwy dla czytników ekranu\./,
);
assert.doesNotMatch(patch.stdout, /#1/);
assert.doesNotMatch(patch.stdout, /\*\*Setlista:\*\*/);
assert.doesNotMatch(patch.stdout, /\*\*Android\*\* \(Performer\)/);

writeFileSync(
  path,
  `# Changelog

## [5.2.0](https://example.com) - 2026-07-25 — Pocket Stage

> **Pocket Stage:** PIN, Safety Net, Sampler.

### Dodano

#### 📦 Packaging & Desktop (Tauri / Docker)
- **Android:** sideload Performer i Console.
- **Launcher:** ekran startowy.

#### ⏱️ Timeline & DAW
- **Cues Sampler:** próbka audio na Cue.
- **Safety Net:** Przejmij na Spare.

### Naprawiono

#### ⏱️ Timeline & DAW
- **Ołówek:** wyrównanie podglądu przeciągania.

## [5.1.0](https://example.com) - 2026-07-24 — Launch & Mix

> older
`,
);

const cue = run("5.2.0");
assert.equal(cue.status, 0, cue.stderr || cue.stdout);
assert.match(cue.stdout, /### 🚀 Highlights — Pocket Stage \(5\.2\.0\)/);
assert.match(cue.stdout, /\| System operacyjny \| Plik instalacyjny \|/);
assert.match(
  cue.stdout,
  /\[macOS \(Apple Silicon\)\]\(https:\/\/github\.com\/Negatywistczny\/stagesync\/releases\/download\/v5\.2\.0\/StageSync_5\.2\.0_aarch64\.dmg\)/,
);
assert.match(
  cue.stdout,
  /\|\s*🤖 \*\*Android\*\* \(Performer\) \| \[Performer \(\.apk\)\]\(https:\/\/github\.com\/Negatywistczny\/stagesync\/releases\/download\/v5\.2\.0\/StageSync-Performer-v5\.2\.0\.apk\) \|/,
);
assert.match(
  cue.stdout,
  /\|\s*🤖 \*\*Android\*\* \(Console\) \| \[Console \(\.apk\)\]\(https:\/\/github\.com\/Negatywistczny\/stagesync\/releases\/download\/v5\.2\.0\/StageSync-Console-v5\.2\.0\.apk\) \|/,
);
assert.match(
  cue.stdout,
  /\*\*Desktop \/ Android\*\* — Android: sideload Performer i Console; Launcher: ekran startowy\./,
);
assert.match(
  cue.stdout,
  /\*\*Timeline \/ DAW\*\* — Cues Sampler: próbka audio na Cue; Safety Net: Przejmij na Spare; Ołówek: wyrównanie podglądu przeciągania\./,
);
assert.doesNotMatch(cue.stdout, /Cue & Guard/);
assert.doesNotMatch(cue.stdout, /bez atrap|auto-election|bez OAuth|bez kont OAuth/);
assert.doesNotMatch(cue.stdout, /StageSync 5\.2\.0 \(\.dmg\)/);
assert.match(cue.stdout, /sideload Performer i Console/);
assert.doesNotMatch(ok.stdout, /Pliki automatycznych aktualizacji/);
assert.doesNotMatch(ok.stdout, /SHA256SUMS\.txt/);
assert.doesNotMatch(cue.stdout, /<details>/);
assert.doesNotMatch(cue.stdout, /Pliki automatycznych aktualizacji/);

console.log("build-release-notes.test.mjs: ok");
