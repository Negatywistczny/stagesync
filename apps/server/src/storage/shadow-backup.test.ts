import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { shadowBackup } from "./shadow-backup.js";

describe("shadowBackup", () => {
  it("returns null when source is missing (ENOENT)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-shadow-miss-"));
    try {
      const bak = await shadowBackup(join(dir, "missing.json"), "pre");
      expect(bak).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("copies to labeled .bak sibling", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-shadow-ok-"));
    try {
      const file = join(dir, "library.json");
      await writeFile(file, '{"v":1}\n');
      const bak = await shadowBackup(file, "pre-migrate");
      expect(bak).toBe(`${file}.pre-migrate.bak`);
      expect(await readFile(bak!, "utf8")).toBe('{"v":1}\n');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
