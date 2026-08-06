import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const script = fileURLToPath(
  new URL("./extract-changelog-section.mjs", import.meta.url),
);

const dir = mkdtempSync(join(tmpdir(), "ss-changelog-"));
const path = join(dir, "CHANGELOG.md");
writeFileSync(
  path,
  `# Changelog

## [5.0.0](https://example.com) - 2026-07-23 — Overture

> hero

### Dodano
- one

## [5.0.0-beta.2] - 2026-07-21

- beta
`,
);

const ok = spawnSync(process.execPath, [script, "5.0.0", path], {
  encoding: "utf8",
});
assert.equal(ok.status, 0, ok.stderr);
assert.match(ok.stdout, /> hero/);
assert.match(ok.stdout, /### Dodano/);
assert.match(ok.stdout, /- one/);
assert.doesNotMatch(ok.stdout, /beta/);
assert.doesNotMatch(ok.stdout, /^## \[/m);

const missing = spawnSync(process.execPath, [script, "9.9.9", path], {
  encoding: "utf8",
});
assert.notEqual(missing.status, 0);

console.log("extract-changelog-section.test.mjs: ok");
