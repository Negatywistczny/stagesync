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

  it("overwrites existing JSON without leaving temps", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-atomic-ow-"));
    try {
      const file = join(dir, "library.json");
      await writeJsonAtomic(file, { v: 1 });
      await writeJsonAtomic(file, { v: 2, songs: [] });
      expect(JSON.parse(await readFile(file, "utf8"))).toEqual({
        v: 2,
        songs: [],
      });
      expect(await readdir(dir)).toEqual(["library.json"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("serializes nulls/arrays and ends with a newline", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-atomic-nl-"));
    try {
      const file = join(dir, "payload.json");
      await writeJsonAtomic(file, { items: [null, { id: "a" }], ok: null });
      const raw = await readFile(file, "utf8");
      expect(raw.endsWith("\n")).toBe(true);
      expect(JSON.parse(raw)).toEqual({
        items: [null, { id: "a" }],
        ok: null,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
