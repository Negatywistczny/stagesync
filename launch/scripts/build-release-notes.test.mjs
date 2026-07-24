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
- **Menu narzędzi Timeline:** zestaw live-show.
- **Mixer:** cztery strefy Audio | Busy | Click | Master.

#### 📦 Packaging & Desktop (Tauri / Docker)
- **Launcher:** ekran startowy przed Adminem.

### Zmieniono

#### 📚 Dokumentacja
- **Pomoc Timeline (?):** skróty i wyszukiwanie.

## [5.0.0] - 2026-07-23 — Overture

> older
`,
);

const ok = spawnSync(process.execPath, [script, "5.1.0", path], {
  encoding: "utf8",
  env: { ...process.env, GITHUB_REPOSITORY: "Negatywistyczny/stagesync" },
});
assert.equal(ok.status, 0, ok.stderr || ok.stdout);
assert.match(ok.stdout, /### 🚀 Highlights — Launch & Mix \(5\.1\.0\)/);
assert.match(
  ok.stdout,
  /^Launcher hosta, Mixer Timeline oraz zestaw narzędzi live-show\.$/m,
);
assert.doesNotMatch(ok.stdout, /\*\*Launch & Mix:\*\*/);
assert.match(ok.stdout, /\*\*Timeline \/ DAW\*\* — Menu narzędzi Timeline; Mixer/);
assert.match(ok.stdout, /\*\*Desktop\*\* — Launcher/);
assert.match(ok.stdout, /\*\*Dokumentacja\*\* — Pomoc Timeline/);
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
assert.doesNotMatch(ok.stdout, /zestaw live-show\./); // full changelog bullet body
assert.doesNotMatch(ok.stdout, /Co nowego w tym wydaniu/);

console.log("build-release-notes.test.mjs: ok");
