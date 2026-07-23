import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeJsonAtomic } from "./atomic-write.js";

describe("writeJsonAtomic", () => {
  it("creates parent dirs and leaves no .tmp siblings", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-atomic-"));
    try {
      const file = join(dir, "nested", "out.json");
      await writeJsonAtomic(file, { ok: true, n: 1 });
      expect(JSON.parse(await readFile(file, "utf8"))).toEqual({
        ok: true,
        n: 1,
      });
      const siblings = await readdir(join(dir, "nested"));
      expect(siblings).toEqual(["out.json"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
