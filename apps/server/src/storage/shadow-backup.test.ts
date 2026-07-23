import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { shadowBackup } from "./shadow-backup.js";

const accessHook = vi.hoisted(() => ({
  impl: null as null | ((path: string) => Promise<void>),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    access: async (
      path: Parameters<typeof actual.access>[0],
      mode?: Parameters<typeof actual.access>[1],
    ) => {
      if (accessHook.impl) return accessHook.impl(String(path));
      return actual.access(path, mode);
    },
  };
});

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

  it("rethrows non-ENOENT access errors", async () => {
    accessHook.impl = async () => {
      throw Object.assign(new Error("EACCES"), { code: "EACCES" });
    };
    await expect(shadowBackup("/tmp/x.json")).rejects.toMatchObject({
      code: "EACCES",
    });
    accessHook.impl = null;
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
