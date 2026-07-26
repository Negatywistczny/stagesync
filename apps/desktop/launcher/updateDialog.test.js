import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatReleaseNotes,
  shouldShowUpdateDialog,
} from "./updateDialog.js";

test("shouldShowUpdateDialog — requires available + version", () => {
  assert.equal(shouldShowUpdateDialog({ available: false }, null), false);
  assert.equal(shouldShowUpdateDialog({ available: true }, null), false);
  assert.equal(
    shouldShowUpdateDialog({ available: true, version: "5.2.3" }, null),
    true,
  );
});

test("shouldShowUpdateDialog — respects ignoredVersion unless force", () => {
  const info = { available: true, version: "5.2.3" };
  assert.equal(shouldShowUpdateDialog(info, "5.2.3"), false);
  assert.equal(shouldShowUpdateDialog(info, "5.2.3", { force: true }), true);
  assert.equal(shouldShowUpdateDialog(info, "5.2.2"), true);
});

test("formatReleaseNotes — bullets from markdown-ish notes", () => {
  const notes = `### Highlights
- **App Shell:** denser chrome
- Launcher: shared buttons
---
### Skip me`;
  const bullets = formatReleaseNotes(notes, 5);
  assert.deepEqual(bullets, [
    "App Shell: denser chrome",
    "Launcher: shared buttons",
  ]);
});
